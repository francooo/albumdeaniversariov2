import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Download, ShieldCheck } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import ConfirmationModal from '../components/ConfirmationModal';
import { Button, Card, PageLoader, Toggle } from '../components/ui';
import { getUserById, getUserStats, updatePrivacySettings, requestDataExport, requestAccountDeletion, logAuditEvent, AuditActions } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { plural } from '../lib/format';

type Visibility = 'private' | 'link' | 'public';

interface Settings {
  is_public_profile: boolean;
  albums_public: boolean;
  show_email: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
  default_album_visibility: Visibility;
}

const TOGGLES: { key: Exclude<keyof Settings, 'default_album_visibility'>; title: string; text: string; audit: (v: boolean) => string }[] = [
  { key: 'is_public_profile', title: 'Perfil público', text: 'Seu nome e foto aparecem para outras pessoas.', audit: () => AuditActions.PROFILE_VISIBILITY_CHANGED },
  { key: 'albums_public', title: 'Álbuns públicos', text: 'Qualquer pessoa com o link pode abrir seus álbuns.', audit: () => AuditActions.ALBUMS_VISIBILITY_CHANGED },
  { key: 'show_email', title: 'Mostrar e-mail', text: 'Exibe seu e-mail no seu perfil.', audit: () => AuditActions.EMAIL_VISIBILITY_CHANGED },
  { key: 'email_notifications', title: 'Notificações por e-mail', text: 'Avisamos quando alguém comenta ou compartilha.', audit: () => AuditActions.EMAIL_NOTIFICATIONS_CHANGED },
  {
    key: 'marketing_emails',
    title: 'E-mails de marketing',
    text: 'Novidades e dicas do Memórias, de vez em quando.',
    audit: v => (v ? AuditActions.MARKETING_EMAILS_OPT_IN : AuditActions.MARKETING_EMAILS_OPT_OUT),
  },
];

const VISIBILITY: { value: Visibility; title: string; text: string }[] = [
  { value: 'private', title: 'Só eu', text: 'Ninguém além de você vê os álbuns.' },
  { value: 'link', title: 'Quem tem o link', text: 'Só quem recebe o link consegue abrir.' },
  { value: 'public', title: 'Público', text: 'Qualquer pessoa pode encontrar seus álbuns.' },
];

const SUMMARY: Record<Visibility, string> = {
  private: 'Seus álbuns novos começam privados. Você escolhe quando compartilhar.',
  link: 'Seus álbuns são privados. Só quem recebe o link consegue ver.',
  public: 'Seus álbuns novos começam públicos. Você pode fechar cada um depois.',
};

export default function Privacy() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [original, setOriginal] = useState<Settings | null>(null);
  const [counts, setCounts] = useState({ albums: 0, photos: 0, videos: 0 });
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [u, stats] = await Promise.all([getUserById(user.id), getUserStats(user.id)]);
        const src = u ?? user;
        const s: Settings = {
          is_public_profile: src.is_public_profile ?? false,
          albums_public: src.albums_public ?? false,
          show_email: src.show_email ?? false,
          email_notifications: src.email_notifications ?? true,
          marketing_emails: src.marketing_emails ?? false,
          default_album_visibility: (src.default_album_visibility as Visibility) || 'link',
        };
        setSettings(s);
        setOriginal(s);
        setCounts({ albums: stats.totalAlbums, photos: stats.totalPhotos, videos: stats.totalVideos });
      } catch (err) {
        console.error('Error loading privacy settings:', err);
        toast.error('Não foi possível carregar suas preferências.');
      }
    })();
  }, [user, toast]);

  const dirty = !!settings && !!original && JSON.stringify(settings) !== JSON.stringify(original);

  const save = async () => {
    if (!user || !settings || !original) return;
    setSaving(true);
    try {
      await updatePrivacySettings(user.id, settings);
      for (const t of TOGGLES) {
        if (settings[t.key] !== original[t.key]) {
          await logAuditEvent(user.id, t.audit(settings[t.key]), { new_value: settings[t.key] }).catch(() => {});
        }
      }
      setOriginal(settings);
      toast.success('Configurações salvas');
    } catch {
      toast.error('Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const result = await requestDataExport(user.id);
      await logAuditEvent(user.id, AuditActions.DATA_EXPORT_REQUESTED, { request_id: result.requestId }).catch(() => {});
      setExportOpen(false);
      toast.success(result.message);
    } catch {
      toast.error('Não foi possível pedir a cópia dos dados.');
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await requestAccountDeletion(user.id, 'text');
      await logAuditEvent(user.id, AuditActions.ACCOUNT_DELETION_REQUESTED, { confirmation_method: 'text', grace_period_days: 30 }).catch(() => {});
      logout();
      navigate('/login');
    } catch {
      toast.error('Não foi possível excluir a conta.');
      setDeleting(false);
    }
  };

  if (!settings) {
    return (
      <AppLayout activeOverride="/conta">
        <PageLoader />
      </AppLayout>
    );
  }

  return (
    <AppLayout activeOverride="/conta">
      <h1 className="font-display text-[30px] font-semibold text-ink sm:text-[32px]">Privacidade</h1>
      <p className="mt-1 text-sm text-muted">Você decide quem vê cada memória.</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[600px_1fr] lg:gap-10">
        <div className="space-y-5">
          <Card tone="sand" className="rounded-[26px] px-6 py-2">
            <ul className="divide-y divide-divider/70">
              {TOGGLES.map(t => (
                <li key={t.key} className="flex items-center justify-between gap-6 py-4">
                  <div>
                    <p id={`lbl-${t.key}`} className="font-bold text-ink">
                      {t.title}
                    </p>
                    <p className="text-sm text-muted">{t.text}</p>
                  </div>
                  <Toggle checked={settings[t.key]} onChange={v => setSettings(s => ({ ...s!, [t.key]: v }))} label={t.title} />
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex items-center gap-3 rounded-[20px] border border-divider bg-paper px-5 py-4">
            <ShieldCheck className="size-[22px] shrink-0 text-sage-text" aria-hidden />
            <p className="text-sm text-ink">{SUMMARY[settings.default_album_visibility]}</p>
          </div>

          <div className="flex items-center gap-4">
            <Button size="lg" onClick={save} loading={saving} disabled={!dirty}>
              Salvar configurações
            </Button>
            {dirty && <span className="text-sm text-muted">Alterações não salvas</span>}
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Quem pode ver</h2>
          <p className="text-sm text-muted">Padrão aplicado a novos álbuns.</p>
          <div role="radiogroup" aria-label="Quem pode ver os novos álbuns" className="mt-3 space-y-2">
            {VISIBILITY.map(v => {
              const selected = settings.default_album_visibility === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSettings(s => ({ ...s!, default_album_visibility: v.value }))}
                  className={`flex min-h-[54px] w-full items-center justify-between gap-4 rounded-[18px] px-5 py-2 text-left transition-colors ${
                    selected ? 'border-2 border-terra bg-sand' : 'border border-divider bg-paper hover:bg-sand/40'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold text-ink">{v.title}</span>
                    <span className="text-sm text-muted">{v.text}</span>
                  </span>
                  {selected && <Check className="size-5 shrink-0 text-terra-text" aria-hidden />}
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-muted">Dados da conta</p>
          <div className="mt-2 space-y-2">
            <button type="button" onClick={() => setExportOpen(true)} className="flex w-full items-center justify-between gap-4 rounded-[18px] border border-divider bg-paper px-5 py-3 text-left hover:bg-sand/40">
              <span>
                <span className="block text-sm font-bold text-ink">Baixar meus dados</span>
                <span className="text-sm text-muted">Solicitar uma cópia dos seus dados</span>
              </span>
              <Download className="size-5 shrink-0 text-muted" aria-hidden />
            </button>
            <button type="button" onClick={() => setDeleteOpen(true)} className="w-full rounded-[18px] bg-terra-soft px-5 py-3 text-left hover:bg-[#EFD3BC]">
              <span className="block text-sm font-bold text-terra-text">Excluir minha conta</span>
              <span className="text-sm text-terra-text">Remover permanentemente sua conta e dados</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={exportData}
        isLoading={exporting}
        confirmType="none"
        danger={false}
        title="Baixar meus dados?"
        confirmLabel="Solicitar cópia"
        message="Vamos preparar uma cópia dos seus dados e enviar para o seu e-mail em até 24 horas."
      />
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteAccount}
        isLoading={deleting}
        confirmType="text"
        confirmValue="EXCLUIR"
        title="Excluir minha conta?"
        confirmLabel="Excluir conta"
        message={`Seus ${plural(counts.albums, 'álbum', 'álbuns')}, ${plural(counts.photos, 'foto')} e ${plural(counts.videos, 'vídeo')} serão removidos para sempre. A exclusão é concluída em até 30 dias.`}
      />
    </AppLayout>
  );
}
