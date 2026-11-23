import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { registerUser } from '../services/api';
import AuthShell, { GoogleButton, OrDivider } from '../components/AuthShell';
import { Button, Field, Input, PasswordInput } from '../components/ui';
import { useAuthFlow } from '../lib/useAuthFlow';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { finish, google, googleLoading } = useAuthFlow(setError);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !birthDate || !password) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não são iguais');
      return;
    }
    setIsLoading(true);
    try {
      const user = await registerUser({ name: name.trim(), email: email.trim().toLowerCase(), password, birth_date: birthDate });
      await finish(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="font-display text-[34px] font-semibold leading-tight text-ink sm:text-[40px]">Crie sua conta</h1>
      <p className="mt-2 text-[17px] leading-snug text-muted">Comece a guardar os momentos da sua família.</p>

      <div className="mt-7">
        <GoogleButton onClick={google} loading={googleLoading}>
          Cadastrar com Google
        </GoogleButton>
      </div>

      <div className="my-6">
        <OrDivider>ou preencha abaixo</OrDivider>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Nome completo" htmlFor="reg-name">
          <Input id="reg-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="E-mail" htmlFor="reg-email">
            <Input id="reg-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" />
          </Field>
          <Field label="Nascimento" htmlFor="reg-birth">
            <Input id="reg-birth" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha" htmlFor="reg-pass">
            <PasswordInput id="reg-pass" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mín. 6 caracteres" />
          </Field>
          <Field label="Confirmar senha" htmlFor="reg-pass2">
            <PasswordInput id="reg-pass2" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
          </Field>
        </div>

        {error && (
          <p role="alert" className="text-sm leading-snug text-terra-text">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={isLoading} loadingText="Criando conta…" className="mt-6!">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Já tem uma conta?{' '}
        <Link to="/login" className="font-bold text-terra-text hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
