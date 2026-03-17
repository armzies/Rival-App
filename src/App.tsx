import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Sessions from './pages/Sessions';
import CreateSession from './pages/CreateSession';
import SessionDetail from './pages/SessionDetail';
import Settings from './pages/Settings';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-center" expand={false} richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<Navigate to="/sessions" replace />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="sessions/new" element={<CreateSession />} />
              <Route path="sessions/:id" element={<SessionDetail />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="profile/:id" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}


