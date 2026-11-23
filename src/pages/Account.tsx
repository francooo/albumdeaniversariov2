import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Avatar, Badge, Button, Card, Field, Input, PageLoader, PasswordInput } from '../components/ui';
import { changePassword, getAlbumQuota, getUserById, updateUserPlan, updateUserProfile } from '../services/api';
import type { User } from '../services/api/users';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { PLANS, normalizePlan, type PlanId } from '../lib/plans';
import { formatLongDate, toInputDate } from '../lib/format';
import { ACCEPT_ATTR, compressSingle, validateImageFile } from '../lib/imageCompress';

export default function Account() {
  const { user: authUser, updateUser } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const avatarInput = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<(User & { password_hash?: string | null; google_id?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [albumCount, setAlbumCount] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [planBusy, setPlanBusy] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    (async () => {
      try {
        const [u, quota] = await Promise.all([getUserById(authUser.id), getAlbumQuota(authUser.id)]);
        const data = (u ?? authUser) as typeof user & object;
        setUser(data);
        setAlbumCount(quota.used);
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setBirthDate(toInputDate(data.birth_date));
      } catch (err) {
        console.error('Error loading account:', err);
        setUser(authUser);
        setName(authUser.name || '');
        setEmail(authUser.email || '');
      } finally {
        setLoading(false);
      }
    })();
  }, [authUser]);

  // /conta#planos rola até os planos
  useEffect(() => {
    if (!loading && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading, location.hash]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !email.trim()) {
      setProfileError('Nome e e-mail são obrigatórios');
      return;
    }
    setSavingProfile(true);
    setProfileError(null);
    try {
      const updated = await updateUserProfile(user.id, { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), birth_date: birthDate || undefined });
      setUser(u => ({ ...u!, ...updated }));
      updateUser({ name: updated.name, email: updated.email, phone: updated.phone, birth_date: updated.birth_date });
      toast.success('Dados salvos');
    } catch (err) {
      setProfileError(err instanceof Error && /unique|duplicate/i.test(err.message) ? 'Este e-mail já está em uso.' : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changeAvatar = async (file?: File) => {
    if (!file || !user) return;
    const err = validateImageFile(file);
    if (err) return toast.error(err);
    setAvatarBusy(true);
    try {
      const dataUrl = await compressSingle(file, 256);
      const updated = await updateUserProfile(user.id, { avatar_url: dataUrl });
      setUser(u => ({ ...u!, avatar_url: updated.avatar_url }));
      updateUser({ avatar_url: updated.avatar_url });
      toast.success('Foto atualizada');
    } catch {
      toast.error('Não foi possível trocar a foto.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPasswordError(null);
    if (newPassword.length < 6) return setPasswordError('A nova senha precisa ter pelo menos 6 caracteres');
    if (newPassword !== confirmPassword) return setPasswordError('As senhas não são iguais');
    setSavingPassword(true);
    try {
      const ok = await changePassword(user.id, currentPassword, newPassword);
      if (!ok) {
        setPasswordError('A senha atual está incorreta');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha alterada');
    } catch {
      setPasswordError('Não foi possível alterar a senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const changePlan = async (plan: PlanId) => {
    if (!user) return;
    setPlanBusy(true);
    try {
      const updated = await updateUserPlan(user.id, plan);
      setUser(u => ({ ...u!, ...updated }));
      updateUser({ plan_type: plan, storage_limit: updated.storage_limit });
      toast.success(plan === 'premium' ? 'Bem-vindo ao Premium' : 'Você voltou para o plano Básico');
    } catch {
      toast.error('Não foi possível mudar o plano.');
    } finally {
      setPlanBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <AppLayout>
        <PageLoader />
      </AppLayout>
    );
  }

  const current = normalizePlan(user.plan_type);
  const googleOnly = !!user.google_id && !user.password_hash;

  return (
    <AppLayout>
      <h1 className="font-display text-[30px] font-semibold text-ink sm:text-[32px]">Conta e planos</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[560px_1fr] lg:gap-10">
        {/* Perfil + senha */}
        <div className="space-y-5">
          <Card tone="sand" className="p-6 sm:p-7">
            <div className="flex items-center gap-5">
              <Avatar name={user.name} src={user.avatar_url} size={84} tone="terra" />
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-semibold text-ink">{user.name}</p>
                {user.created_at && <p className="text-sm text-muted">Membro desde {formatLongDate(user.created_at)}</p>}
                <button type="button" onClick={() => avatarInput.current?.click()} disabled={avatarBusy} className="mt-1 text-sm font-bold text-terra-text hover:underline disabled:opacity-50">
                  {avatarBusy ? 'Enviando…' : 'Trocar foto'}
                </button>
                <input ref={avatarInput} type="file" accept={ACCEPT_ATTR} hidden onChange={e => changeAvatar(e.target.files?.[0])} />
              </div>
            </div>

            <form onSubmit={saveProfile} className="mt-6 space-y-4" noValidate>
              <Field label="Nome completo" htmlFor="acc-name">
                <Input id="acc-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="h-11" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <Field label="E-mail" htmlFor="acc-email">
                  <Input id="acc-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11" />
                </Field>
                <Field label="Telefone" htmlFor="acc-phone">
                  <Input id="acc-phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="h-11" />
                </Field>
              </div>
              <Field label="Data de nascimento" htmlFor="acc-birth" className="sm:max-w-[200px]">
                <Input id="acc-birth" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="h-11" />
              </Field>
              {profileError && (
                <p role="alert" className="text-sm text-terra-text">
                  {profileError}
                </p>
              )}
              <Button type="submit" loading={savingProfile}>
                Salvar alterações
              </Button>
            </form>
          </Card>

          <Card tone="outline" className="rounded-[24px] p-6">
            <h2 className="font-sans text-base font-bold text-ink">Senha</h2>
            {googleOnly ? (
              <p className="mt-2 text-sm text-muted">Você entra com o Google, então não há senha para alterar aqui.</p>
            ) : (
              <form onSubmit={savePassword} className="mt-3" noValidate>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Senha atual" htmlFor="pw-cur">
                    <PasswordInput id="pw-cur" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="h-11 bg-cream pr-20" />
                  </Field>
                  <Field label="Nova senha" htmlFor="pw-new">
                    <PasswordInput id="pw-new" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-11 bg-cream pr-20" />
                  </Field>
                  <Field label="Confirmar senha" htmlFor="pw-conf">
                    <PasswordInput id="pw-conf" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="h-11 bg-cream pr-20" />
                  </Field>
                </div>
                {passwordError && (
                  <p role="alert" className="mt-3 text-sm text-terra-text">
                    {passwordError}
                  </p>
                )}
                <Button type="submit" variant="outline" size="sm" className="mt-4" loading={savingPassword} disabled={!currentPassword || !newPassword}>
                  Alterar senha
                </Button>
              </form>
            )}
          </Card>
        </div>

        {/* Planos */}
        <section id="planos" aria-labelledby="planos-title" className="scroll-mt-24">
          <h2 id="planos-title" className="font-display text-[26px] font-semibold text-ink">
            Seu plano
          </h2>
          <p className="mt-1 text-sm text-muted">
            Você está no plano {PLANS[current].name}
            {current === 'basic' ? ` · ${albumCount} de ${PLANS.basic.albumLimit} álbuns usados` : ''}.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(['basic', 'premium'] as PlanId[]).map(id => {
              const p = PLANS[id];
              const isCurrent = id === current;
              const highlight = id === 'premium';
              return (
                <div key={id} className={`flex flex-col rounded-[26px] p-5 ${highlight ? 'bg-sand' : 'border border-divider bg-paper'}`}>
                  <div>
                    {isCurrent ? <Badge tone={highlight ? 'terra' : 'neutral'}>Plano atual</Badge> : highlight ? <Badge tone="terra">Completo</Badge> : <Badge tone="neutral">Gratuito</Badge>}
                  </div>
                  <p className="mt-3 font-display text-[22px] font-semibold text-ink">{p.name}</p>
                  <p className="text-sm text-muted">{p.priceLabel}</p>
                  <ul className="mt-5 space-y-3">
                    {p.benefits.map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-ink">
                        <Check className={`mt-0.5 size-4 shrink-0 ${highlight ? 'text-sage-text' : 'text-sage'}`} aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-8">
                    {isCurrent ? (
                      <div className="flex h-[42px] items-center justify-center rounded-full bg-divider text-sm text-ink">Plano atual</div>
                    ) : highlight ? (
                      <Button fullWidth onClick={() => changePlan('premium')} loading={planBusy}>
                        Fazer upgrade
                      </Button>
                    ) : (
                      <Button fullWidth variant="outline" onClick={() => changePlan('basic')} loading={planBusy}>
                        Voltar para o Básico
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted">Você pode mudar de plano quando quiser.</p>
          {current === 'premium' && albumCount > PLANS.basic.albumLimit && (
            <p className="mt-2 text-sm text-terra-text">
              No Básico você mantém seus {albumCount} álbuns, mas não consegue criar novos acima de {PLANS.basic.albumLimit}.
            </p>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
