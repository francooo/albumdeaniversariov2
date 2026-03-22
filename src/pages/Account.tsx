import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserById, updateUserProfile, changePassword, updateUserPlan } from '../services/api';
import type { User } from '../services/api/users';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components';

export default function Account() {
  const navigate = useNavigate();
  const { user: authUser, updateUser: updateAuthUser, logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Plan
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    if (!authUser) {
      setIsLoading(false);
      return;
    }
    try {
      const userData = await getUserById(authUser.id);
      if (userData) {
        setUser(userData);
        setName(userData.name || '');
        setEmail(userData.email || '');
        setPhone(userData.phone || '');
        setBirthDate(userData.birth_date ? userData.birth_date.split('T')[0] : '');
      } else {
        // Fallback to context user data if DB returns nothing
        setUser(authUser);
        setName(authUser.name || '');
        setEmail(authUser.email || '');
      }
    } catch (error) {
      console.error('Error loading user from DB, using cached session data:', error);
      // Fallback to context user — do NOT redirect to login
      setUser(authUser);
      setName(authUser.name || '');
      setEmail(authUser.email || '');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const updatedUser = await updateUserProfile(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        birth_date: birthDate
      });
      
      setUser(updatedUser);
      updateAuthUser({ name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone, birth_date: updatedUser.birth_date });
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' });
      return;
    }

    setIsChangingPassword(true);
    setMessage(null);

    try {
      const success = await changePassword(user.id, currentPassword, newPassword);
      
      if (success) {
        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: 'Senha atual incorreta' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao alterar senha' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangePlan = async (planType: 'basic' | 'premium') => {
    if (!user || user.plan_type === planType) return;
    setIsUpdatingPlan(true);
    setMessage(null);
    try {
      const updatedUser = await updateUserPlan(user.id, planType);
      setUser(updatedUser);
      updateAuthUser({ plan_type: planType });
      setMessage({ type: 'success', text: `Plano alterado para ${planType === 'premium' ? 'Premium' : 'Básico'} com sucesso!` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao alterar plano' });
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
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
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Minha Conta</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie suas informações pessoais</p>
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

        {/* Profile Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Informações Pessoais</h2>
          </div>
          
          <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-primary">person</span>
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-sm text-slate-500">Membro desde {formatDate(user?.created_at)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
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
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Password Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Alterar Senha</h2>
          </div>
          
          <form onSubmit={handleChangePassword} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Alterando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">lock</span>
                    Alterar Senha
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Plan Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Plano da Conta</h2>
            <p className="text-sm text-slate-500 mt-0.5">Escolha o plano ideal para você</p>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Basic Plan */}
            <div className={`relative rounded-xl border-2 p-6 transition-all ${
              (user?.plan_type === 'basic' || user?.plan_type === 'free' || !user?.plan_type)
                ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/50'
                : 'border-slate-200 dark:border-slate-700'
            }`}>
              {(user?.plan_type === 'basic' || user?.plan_type === 'free' || !user?.plan_type) && (
                <span className="absolute -top-3 left-4 px-3 py-1 bg-slate-600 text-white text-xs font-bold rounded-full">
                  Plano Atual
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">star</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-lg">Básico</p>
                  <p className="text-sm text-slate-500">Gratuito</p>
                </div>
              </div>
              <ul className="space-y-2 mb-6 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                  Até 3 álbuns
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                  5 GB de armazenamento
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                  Temas básicos
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-base">cancel</span>
                  <span className="text-slate-400">Álbuns ilimitados</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-300 text-base">cancel</span>
                  <span className="text-slate-400">Temas exclusivos</span>
                </li>
              </ul>
              <button
                onClick={() => handleChangePlan('basic')}
                disabled={isUpdatingPlan || user?.plan_type === 'basic' || user?.plan_type === 'free' || !user?.plan_type}
                className="w-full py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(user?.plan_type === 'basic' || user?.plan_type === 'free') ? 'Plano Atual' : 'Fazer Downgrade'}
              </button>
            </div>

            {/* Premium Plan */}
            <div className={`relative rounded-xl border-2 p-6 transition-all ${
              user?.plan_type === 'premium'
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
            }`}>
              {user?.plan_type === 'premium' && (
                <span className="absolute -top-3 left-4 px-3 py-1 bg-primary text-background-dark text-xs font-bold rounded-full">
                  Plano Atual
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">diamond</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-lg">Premium</p>
                  <p className="text-sm text-primary font-medium">Completo</p>
                </div>
              </div>
              <ul className="space-y-2 mb-6 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                  Álbuns ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                  20 GB de armazenamento
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                  Todos os temas exclusivos
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                  Suporte prioritário
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                  Fundos premium ilimitados
                </li>
              </ul>
              <button
                onClick={() => handleChangePlan('premium')}
                disabled={isUpdatingPlan || user?.plan_type === 'premium'}
                className="w-full py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {isUpdatingPlan
                  ? 'Atualizando...'
                  : user?.plan_type === 'premium'
                    ? 'Plano Atual'
                    : 'Fazer Upgrade'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
