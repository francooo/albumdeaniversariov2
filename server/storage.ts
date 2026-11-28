import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpError } from './errors.js';

/**
 * Arquivos no Cloudflare R2 (API compatível com S3).
 * O navegador envia direto ao R2 com URL assinada; o servidor só assina, confere e apaga.
 */
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

function config(): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    publicUrl: R2_PUBLIC_URL.replace(/\/+$/, ''),
  };
}

function required(): R2Config {
  const c = config();
  if (!c) throw new HttpError(500, 'storage_not_configured', 'O armazenamento de fotos ainda não foi configurado.');
  return c;
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    const c = required();
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${c.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
      // Sem checksum automático: o PUT feito pelo navegador não manda esse cabeçalho
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
}

/** URL assinada (5 min) para o navegador enviar exatamente este arquivo, com este tipo e tamanho. */
export async function presignPut(key: string, contentType: string, size: number): Promise<string> {
  const c = required();
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: c.bucket, Key: key, ContentType: contentType, ContentLength: size }), {
    expiresIn: 300,
  });
}

export async function headObject(key: string): Promise<{ size: number; contentType?: string } | null> {
  const c = required();
  try {
    const r = await s3().send(new HeadObjectCommand({ Bucket: c.bucket, Key: key }));
    return { size: Number(r.ContentLength) || 0, contentType: r.ContentType };
  } catch {
    return null;
  }
}

/** Grava um arquivo pelo servidor (usado só pelo script de migração dos dados antigos). */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const c = required();
  await s3().send(new PutObjectCommand({ Bucket: c.bucket, Key: key, Body: body, ContentType: contentType }));
}

export function publicUrl(key: string): string {
  return `${required().publicUrl}/${key}`;
}

/** Chave do R2 a partir da URL pública; null para URLs que não são nossas (ex.: foto do Google). */
export function keyFromUrl(url: unknown): string | null {
  const c = config();
  if (!c || typeof url !== 'string' || !url.startsWith(c.publicUrl + '/')) return null;
  return url.slice(c.publicUrl.length + 1);
}

/** Apaga arquivos do R2. Falhas só geram aviso: o registro no banco já foi removido. */
export async function deleteKeys(keys: string[]): Promise<void> {
  const c = config();
  if (!c || !keys.length) return;
  const results = await Promise.allSettled(keys.map(Key => s3().send(new DeleteObjectCommand({ Bucket: c.bucket, Key }))));
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed) console.warn(`R2: ${failed} arquivo(s) não foram apagados`);
}
