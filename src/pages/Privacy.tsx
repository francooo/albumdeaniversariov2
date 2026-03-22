import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components';
import { 
  getUserById,
  updatePrivacySettings, 
  requestDataExport, 
  requestAccountDeletion,
  logAuditEvent,
  AuditActions
} from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';

interface PrivacySettings {
  is_public_profile: boolean;
  albums_public: boolean;
  show_email: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
}

export default function Privacy() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PrivacySettings>({
    is_public_profile: true,
    albums_public: false,
    show_email: false,
    email_notifications: true,
    marketing_emails: false
  });
  const [originalSettings, setOriginalSettings] = useState<PrivacySettings>(settings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!authUser) {
      setIsLoading(false);
      return;
    }
    try {
      const user = await getUserById(authUser.id);
      const resolvedUser = user || authUser;
      
      setUserId(resolvedUser.id);
      const loadedSettings = {
        is_public_profile: resolvedUser.is_public_profile ?? true,
        albums_public: resolvedUser.albums_public ?? false,
        show_email: resolvedUser.show_email ?? false,
        email_notifications: resolvedUser.email_notifications ?? true,
        marketing_emails: resolvedUser.marketing_emails ?? false
      };
      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings, using cached user:', error);
      setUserId(authUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof PrivacySettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!userId) return;

    setIsSaving(true);
    setMessage(null);

    try {
      // Find changed settings for audit logging
      const changedSettings: Partial<PrivacySettings> = {};
      (Object.keys(settings) as Array<keyof PrivacySettings>).forEach(key => {
        if (settings[key] !== originalSettings[key]) {
          changedSettings[key] = settings[key];
        }
      });

      await updatePrivacySettings(userId, settings);
      
      // Log audit events for changed settings
      if (changedSettings.is_public_profile !== undefined) {
        await logAuditEvent(userId, AuditActions.PROFILE_VISIBILITY_CHANGED, {
          new_value: changedSettings.is_public_profile
        });
      }
      if (changedSettings.albums_public !== undefined) {
        await logAuditEvent(userId, AuditActions.ALBUMS_VISIBILITY_CHANGED, {
          new_value: changedSettings.albums_public
        });
      }
      if (changedSettings.show_email !== undefined) {
        await logAuditEvent(userId, AuditActions.EMAIL_VISIBILITY_CHANGED, {
          new_value: changedSettings.show_email
        });
      }
      if (changedSettings.email_notifications !== undefined) {
        await logAuditEvent(userId, AuditActions.EMAIL_NOTIFICATIONS_CHANGED, {
          new_value: changedSettings.email_notifications
        });
      }
      if (changedSettings.marketing_emails !== undefined) {
        await logAuditEvent(userId, 
          changedSettings.marketing_emails ? AuditActions.MARKETING_EMAILS_OPT_IN : AuditActions.MARKETING_EMAILS_OPT_OUT,
          { timestamp: new Date().toISOString() }
        );
      }

      setOriginalSettings(settings);
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar configurações' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataExport = async () => {
    if (!userId) return;
    setIsExporting(true);
    
    try {
      const result = await requestDataExport(userId);
      await logAuditEvent(userId, AuditActions.DATA_EXPORT_REQUESTED, {
        request_id: result.requestId
      });
      setShowExportModal(false);
      setMessage({ type: 'success', text: result.message });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao solicitar exportação de dados' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (confirmationValue: string) => {
    if (!userId) return;
    setIsDeleting(true);
    
    try {
      await requestAccountDeletion(userId, 'text');
      await logAuditEvent(userId, AuditActions.ACCOUNT_DELETION_REQUESTED, {
        confirmation_method: 'text',
        grace_period_days: 30
      });
      
      logout();
      navigate('/login');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao solicitar exclusão da conta' });
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout maxWidth="max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            <span className="text-lg text-slate-600 dark:text-slate-400">Carregando...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout maxWidth="max-w-4xl">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Privacidade</h1>
        <p className="text-sm text-slate-500 mt-1">Controle suas configurações de privacidade</p>
      </div>

      <div>
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <p className={`text-sm flex items-center gap-2 ${
              message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="material-symbols-outlined text-lg">
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              {message.text}
            </p>
          </div>
        )}

        {/* Privacy Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">shield</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configurações de Privacidade</h2>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Profile Public */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Perfil Público</p>
                <p className="text-sm text-slate-500">Permitir que outros usuários vejam seu perfil</p>
              </div>
              <button
                onClick={() => handleToggle('is_public_profile')}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.is_public_profile ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.is_public_profile ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Albums Public */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Álbuns Públicos</p>
                <p className="text-sm text-slate-500">Permitir que seus álbuns sejam descobertos por outros</p>
              </div>
              <button
                onClick={() => handleToggle('albums_public')}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.albums_public ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.albums_public ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Show Email */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Mostrar E-mail</p>
                <p className="text-sm text-slate-500">Exibir seu e-mail no perfil público</p>
              </div>
              <button
                onClick={() => handleToggle('show_email')}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.show_email ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.show_email ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">notifications</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notificações</h2>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Email Notifications */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Notificações por E-mail</p>
                <p className="text-sm text-slate-500">Receber atualizações importantes por e-mail</p>
              </div>
              <button
                onClick={() => handleToggle('email_notifications')}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.email_notifications ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.email_notifications ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Marketing Emails */}
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">E-mails de Marketing</p>
                <p className="text-sm text-slate-500">Receber novidades, dicas e promoções</p>
              </div>
              <button
                onClick={() => handleToggle('marketing_emails')}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  settings.marketing_emails ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.marketing_emails ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Data & Security */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">security</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dados e Segurança</h2>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <button 
              onClick={() => setShowExportModal(true)}
              className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-500">download</span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Baixar Meus Dados</p>
                  <p className="text-sm text-slate-500">Solicitar uma cópia dos seus dados</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>

            <button 
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500">delete_forever</span>
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">Excluir Minha Conta</p>
                  <p className="text-sm text-slate-500">Remover permanentemente sua conta e dados</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-background-dark font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Salvando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data Export Confirmation Modal */}
      <ConfirmationModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDataExport}
        title="Baixar Meus Dados"
        message="Você está solicitando uma cópia de todos os seus dados. Este processo pode levar até 24 horas. Os dados serão enviados para seu e-mail cadastrado."
        confirmType="text"
        confirmValue="CONFIRMAR"
        confirmLabel="Solicitar Dados"
        isLoading={isExporting}
        danger={false}
      />

      {/* Account Deletion Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Excluir Minha Conta"
        message="ATENÇÃO: Esta ação é irreversível! Sua conta será desativada imediatamente e todos os dados serão permanentemente excluídos após 30 dias. Durante este período, você pode cancelar a exclusão fazendo login novamente."
        confirmType="text"
        confirmValue="EXCLUIR"
        confirmLabel="Excluir Conta"
        isLoading={isDeleting}
        danger={true}
      />
    </AppLayout>
  );
}
