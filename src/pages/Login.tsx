import { useNavigate, Link } from 'react-router-dom';
import { FormEvent, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { loginUser, loginWithGoogle, claimAlbumShare } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const afterLogin = async (userId: string, tokenOverride?: string) => {
    const pendingToken = tokenOverride || sessionStorage.getItem('pending_album_token');
    if (pendingToken) {
      try {
        await claimAlbumShare(pendingToken, userId);
        sessionStorage.removeItem('pending_album_token');
        navigate(`/album/publico/${pendingToken}`);
        return;
      } catch (err) {
        console.error('Error claiming album:', err);
      }
    }
    navigate('/albums');
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha');
      return;
    }

    setIsLoading(true);

    try {
      const user = await loginUser({
        email: email.trim().toLowerCase(),
        password
      });

      if (!user) {
        setError('E-mail ou senha incorretos');
        setIsLoading(false);
        return;
      }

      login(user);
      setIsLoading(false);
      await afterLogin(user.id);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Tente novamente.');
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      setError('');
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        if (!userInfoRes.ok) throw new Error('Falha ao obter informações do Google');

        const googleUser = await userInfoRes.json();

        const user = await loginWithGoogle({
          googleId: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
        });

        login(user);
        await afterLogin(user.id);
      } catch (err: any) {
        setError(err.message || 'Erro ao entrar com Google. Tente novamente.');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Login com Google cancelado ou falhou. Tente novamente.');
    },
  });

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4">
      <div className="max-w-5xl w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-primary/20">
        {/* Left Side: Visual/Hero */}
        <div className="w-full md:w-1/2 relative min-h-[300px] md:min-h-[600px] flex flex-col justify-end p-8 md:p-12 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "linear-gradient(to top, rgba(34, 30, 16, 0.9), rgba(34, 30, 16, 0.2)), url('https://lh3.googleusercontent.com/aida-public/AB6AXuCJ7_lQt1rLCqGXwioUupqGGGLox-TolhWrSy9zfPiy6CYd5WxvRVNk4GUImgbrE0F94NIHi4NepvcnYUilPB2xWVUYbwIE6xdPeKvu1hQxqoX_1el_5meSF9TNjTOhjkSriCS7j3c9GNTKbmfeV4WZkYL7wkzX4xly3VTPsN6E2gX6JTb6pLRIQhj5WsypFd4JHZI9TbSpVYs9-lPwM0Z5jltpGfsNkZ371PZusZ975euwuWA9gqrTHqZtCWRJ1EUpM_1KANO5yRE')" }}
          ></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined text-4xl">auto_awesome</span>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">Álbum de Aniversário</h1>
            </div>
            <p className="text-slate-200 text-lg max-w-sm font-display italic">
              "As melhores memórias são aquelas que guardamos com brilho no olhar."
            </p>
            <div className="pt-4 flex gap-2">
              <div className="h-1 w-12 bg-primary rounded-full"></div>
              <div className="h-1 w-4 bg-primary/40 rounded-full"></div>
              <div className="h-1 w-4 bg-primary/40 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-16 flex flex-col justify-center bg-white dark:bg-slate-900">
          <div className="mb-10 text-center md:text-left">
            <h2 className="font-display text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">Bem-vindo</h2>
            <p className="text-slate-500 dark:text-slate-400">Acesse sua galeria exclusiva e reviva momentos mágicos.</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </p>
              </div>
            )}

            {/* Google Login */}
            <button
              className="w-full flex items-center justify-center gap-3 h-14 border-2 border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              type="button"
              onClick={() => googleLogin()}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <span className="material-symbols-outlined animate-spin text-slate-400">progress_activity</span>
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
              )}
              <span className="text-slate-700 dark:text-slate-200 font-bold">
                {isGoogleLoading ? 'Entrando...' : 'Continuar com Google'}
              </span>
            </button>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-sm uppercase tracking-widest">ou</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">E-mail</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                <input
                  className="w-full h-14 pl-12 pr-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-primary focus:border-primary transition-all duration-200 text-slate-900 dark:text-slate-100"
                  placeholder="exemplo@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Senha</label>
                <a className="text-xs font-bold text-primary hover:underline" href="#">Esqueceu a senha?</a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                <input
                  className="w-full h-14 pl-12 pr-12 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-primary focus:border-primary transition-all duration-200 text-slate-900 dark:text-slate-100"
                  placeholder="Sua senha secreta"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              className="w-full h-14 bg-primary hover:bg-primary/90 text-background-dark font-bold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              type="submit"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Álbum</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              Ainda não tem acesso?
              <Link to="/register" className="text-primary font-bold hover:underline ml-1">Venha fazer seu cadastro</Link>
            </p>
          </div>

          <div className="mt-auto pt-8 flex justify-center opacity-30">
            <div className="flex gap-4">
              <span className="material-symbols-outlined">celebration</span>
              <span className="material-symbols-outlined">cake</span>
              <span className="material-symbols-outlined">photo_camera</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
