import { motion, AnimatePresence } from 'motion/react';
import { Swords, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import React, { useEffect, useState } from 'react';

type AuthMode = 'login' | 'signup' | 'forgot';

export default function Login() {
  const { 
    loginWithGoogle, 
    signUpWithEmail, 
    loginWithEmail, 
    resetPassword, 
    user 
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/leaderboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setMode('login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,0,0.05),transparent_70%)] pointer-events-none"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-8 bg-surface border border-line p-10 rounded-sm relative z-10"
      >
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="mx-auto w-16 h-16 bg-primary/10 border border-primary/20 rounded-sm flex items-center justify-center mb-6"
          >
            <Swords className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-3xl font-mono font-bold text-white tracking-tighter uppercase mb-2">
            {mode === 'login' ? 'System Access' : mode === 'signup' ? 'New Identity' : 'Recovery'}
          </h2>
          <p className="mono-label">
            {mode === 'login' ? 'Initialize session' : mode === 'signup' ? 'Create profile' : 'Reset credentials'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                key="signup-name"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-2"
              >
                <label className="mono-label ml-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="OPERATOR_01"
                    className="w-full bg-background border border-line rounded-sm py-3 pl-12 pr-6 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="mono-label ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@network.net"
                className="w-full bg-background border border-line rounded-sm py-3 pl-12 pr-6 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="mono-label">Password</label>
                {mode === 'login' && (
                  <button 
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-line rounded-sm py-3 pl-12 pr-6 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              mode === 'login' ? 'Execute Login' : mode === 'signup' ? 'Initialize' : 'Reset'
            )}
          </button>
        </form>

        {mode !== 'forgot' && (
          <>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-mono font-bold tracking-widest">
                <span className="bg-surface px-4 text-zinc-500">External Auth</span>
              </div>
            </div>

            <button
              onClick={loginWithGoogle}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 bg-surface border border-line rounded-sm text-xs font-mono font-bold text-white hover:bg-surface-hover transition-all active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google_Auth
            </button>
          </>
        )}

        <div className="text-center pt-2">
          {mode === 'forgot' ? (
            <button 
              onClick={() => setMode('login')}
              className="inline-flex items-center gap-2 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Return
            </button>
          ) : (
            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
              {mode === 'login' ? "Unauthorized? " : "Authorized? "}
              <button 
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-primary hover:underline ml-1"
              >
                {mode === 'login' ? 'Sign_Up' : 'Sign_In'}
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

