/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { runColumnMigrations } from './services/api/shares';
import Login from './pages/Login';
import Register from './pages/Register';
import Cover from './pages/Cover';
import Viewer from './pages/Viewer';
import PublicAlbumViewer from './pages/PublicAlbumViewer';
import Dashboard from './pages/Dashboard';
import AlbumsList from './pages/AlbumsList';
import Overview from './pages/Overview';
import Uploads from './pages/Uploads';
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

export default function App() {
  useEffect(() => {
    runColumnMigrations();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <SpaRedirectHandler />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cover" element={<Cover />} />
          <Route path="/viewer/:albumId" element={<Viewer />} />
          <Route path="/album/publico/:token" element={<PublicAlbumViewer />} />
          <Route path="/albums" element={<ProtectedRoute><AlbumsList /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/:albumId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          <Route path="/uploads" element={<ProtectedRoute><Uploads /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
