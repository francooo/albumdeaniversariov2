import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { claimAlbumShare, loginWithGoogle, type UserProfile } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

/** Fluxo comum de Login e Cadastro: Google, álbum pendente de link compartilhado e redirecionamento. */
export function useAuthFlow(setError: (msg: string) => void) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  const finish = async (user: UserProfile) => {
    login(user);
    const pendingToken = sessionStorage.getItem('pending_album_token');
    if (pendingToken) {
      try {
        await claimAlbumShare(pendingToken, user.id);
        sessionStorage.removeItem('pending_album_token');
        navigate(`/album/publico/${pendingToken}`);
        return;
      } catch (err) {
        console.error('Error claiming album:', err);
      }
    }
    navigate('/inicio');
  };

  const startGoogle = useGoogleLogin({
    onSuccess: async tokenResponse => {
      setGoogleLoading(true);
      setError('');
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!res.ok) throw new Error('Não conseguimos falar com o Google. Tente de novo.');
        const g = await res.json();
        const user = await loginWithGoogle({ googleId: g.sub, email: g.email, name: g.name, avatarUrl: g.picture });
        await finish(user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível entrar com o Google.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setError('O login com Google foi cancelado. Tente de novo.'),
  });

  const google = () => {
    if (!GOOGLE_CONFIGURED) {
      setError('O login com Google ainda não está configurado.');
      return;
    }
    setError('');
    startGoogle();
  };

  return { finish, google, googleLoading };
}
