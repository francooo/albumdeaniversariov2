/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import { runColumnMigrations } from './services/api/shares';
import Login from './pages/Login';
import Register from './pages/Register';
import Viewer from './pages/Viewer';
import PublicAlbumViewer from './pages/PublicAlbumViewer';
import AlbumsList from './pages/AlbumsList';
import AlbumEdit from './pages/AlbumEdit';
import AlbumCustomize from './pages/AlbumCustomize';
import Overview from './pages/Overview';
import Account from './pages/Account';
import Privacy from './pages/Privacy';
import NotFound from './pages/NotFound';

function SpaRedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('spa_redirect');
    if (redirectPath && redirectPath !== '/') {
      sessionStorage.removeItem('spa_redirect');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);
  return null;
}

/** Login/cadastro: quem já está logado vai direto para o Início. */
function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user && !sessionStorage.getItem('pending_album_token')) return <Navigate to="/inicio" replace />;
  return <>{children}</>;
}

/** Redireciona rotas antigas com parâmetro (ex.: /dashboard/:id → /albums/:id). */
function RedirectWithId({ to }: { to: (id: string) => string }) {
  const { albumId } = useParams();
  return <Navigate to={albumId ? to(albumId) : '/albums'} replace />;
}

const guard = (el: ReactNode) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function App() {
  useEffect(() => {
    runColumnMigrations();
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <SpaRedirectHandler />
          <Routes>
            <Route path="/" element={<Navigate to="/inicio" replace />} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

            <Route path="/inicio" element={guard(<Overview />)} />
            <Route path="/albums" element={guard(<AlbumsList />)} />
            <Route path="/albums/:albumId" element={guard(<AlbumEdit />)} />
            <Route path="/albums/:albumId/personalizar" element={guard(<AlbumCustomize />)} />
            <Route path="/livro/:albumId" element={guard(<Viewer />)} />
            <Route path="/conta" element={guard(<Account />)} />
            <Route path="/privacidade" element={guard(<Privacy />)} />
            <Route path="/album/publico/:token" element={<PublicAlbumViewer />} />

            {/* Rotas antigas */}
            <Route path="/overview" element={<Navigate to="/inicio" replace />} />
            <Route path="/account" element={<Navigate to="/conta" replace />} />
            <Route path="/privacy" element={<Navigate to="/privacidade" replace />} />
            <Route path="/uploads" element={<Navigate to="/albums" replace />} />
            <Route path="/cover" element={<Navigate to="/albums" replace />} />
            <Route path="/dashboard" element={<Navigate to="/albums" replace />} />
            <Route path="/dashboard/:albumId" element={<RedirectWithId to={id => `/albums/${id}`} />} />
            <Route path="/viewer/:albumId" element={<RedirectWithId to={id => `/livro/${id}`} />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
