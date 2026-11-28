import { HttpError } from './errors.js';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

const fail = () => new HttpError(401, 'google_invalid', 'Não conseguimos confirmar sua conta Google. Tente de novo.');

/**
 * Confere no Google que o access_token foi emitido para o NOSSO Client ID
 * (impede que um token de outro app seja usado aqui) e só então lê o perfil.
 */
export async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new HttpError(500, 'google_not_configured', 'O login com Google não está configurado.');
  if (!accessToken || typeof accessToken !== 'string') throw fail();

  const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  if (!infoRes.ok) throw fail();
  const info = (await infoRes.json()) as { aud?: string; azp?: string; sub?: string };
  if (info.aud !== clientId && info.azp !== clientId) throw fail();

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw fail();
  const g = (await userRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
  if (!g.sub || !g.email || g.sub !== info.sub) throw fail();
  if (g.email_verified === false) {
    throw new HttpError(401, 'google_unverified', 'Seu e-mail do Google não está verificado.');
  }
  return { googleId: g.sub, email: g.email.toLowerCase(), name: g.name || g.email.split('@')[0], avatarUrl: g.picture };
}
