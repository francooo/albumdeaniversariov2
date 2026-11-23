import { Link } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { loginUser } from '../services/api';
import AuthShell, { GoogleButton, OrDivider } from '../components/AuthShell';
import { Button, Field, Input, PasswordInput } from '../components/ui';
import { useAuthFlow } from '../lib/useAuthFlow';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotNotice, setForgotNotice] = useState(false);
  const { finish, google, googleLoading } = useAuthFlow(setError);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Preencha seu e-mail e sua senha');
      return;
    }
    setIsLoading(true);
    try {
      const user = await loginUser({ email: email.trim().toLowerCase(), password });
      if (!user) {
        setError('Confira seu e-mail e sua senha e tente novamente');
        setIsLoading(false);
        return;
      }
      await finish(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="font-display text-[34px] font-semibold leading-tight text-ink sm:text-[40px]">Que bom ter você aqui</h1>
      <p className="mt-2 text-[17px] leading-snug text-muted">Entre para reencontrar os momentos que você guardou.</p>

      <div className="mt-7">
        <GoogleButton onClick={google} loading={googleLoading}>
          Continuar com Google
        </GoogleButton>
      </div>

      <div className="my-6">
        <OrDivider>ou com e-mail</OrDivider>
      </div>

      <form onSubmit={handleLogin} noValidate className="space-y-4">
        <Field label="E-mail" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="voce@email.com"
            invalid={!!error}
          />
        </Field>

        <Field
          label="Senha"
          htmlFor="login-password"
          aside={
            <button type="button" onClick={() => setForgotNotice(true)} className="text-sm font-semibold text-terra-text hover:underline">
              Esqueceu a senha?
            </button>
          }
          hint={forgotNotice ? 'A recuperação de senha chega em breve. Por enquanto, entre com o Google ou fale com o suporte.' : undefined}
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Sua senha"
            invalid={!!error}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm leading-snug text-terra-text">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={isLoading} loadingText="Entrando…" className="mt-6!">
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Ainda não tem acesso?{' '}
        <Link to="/register" className="font-bold text-terra-text hover:underline">
          Venha fazer seu cadastro
        </Link>
      </p>
    </AuthShell>
  );
}
