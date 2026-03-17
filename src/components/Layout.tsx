import { Outlet, Link, useLocation } from 'react-router-dom';
import { Swords, Trophy, User, PlusCircle, Calendar, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const { user, userData, logout } = useAuth();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'th' ? 'en' : 'th';
    i18n.changeLanguage(newLang);
  };

  const profilePhoto = userData?.photoURL || user?.photoURL;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Top Header (Minimal) */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-1.5">
              <div className="bg-primary/10 p-1 rounded-lg">
                <Swords className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-base tracking-tight">Rival</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <span className="text-[10px] font-black">{i18n.language === 'th' ? 'EN' : 'TH'}</span>
              </button>
              <Link
                to="/settings"
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                  location.pathname === '/settings' ? 'border-primary' : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {profilePhoto ? (
                  <img 
                    src={profilePhoto} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <User className="w-4 h-4 text-zinc-400" />
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-md mx-auto w-full pb-16">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/50 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-8 py-2 flex justify-between items-center">
          <Link
            to="/sessions"
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              location.pathname === '/sessions' ? 'text-primary scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-5 h-5" />
          </Link>

          <Link
            to="/leaderboard"
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              location.pathname === '/leaderboard' ? 'text-primary scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Trophy className="w-5 h-5" />
          </Link>

          <Link
            to={`/profile/${user?.uid}`}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              location.pathname.startsWith('/profile') ? 'text-primary scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {profilePhoto ? (
              <img 
                src={profilePhoto} 
                alt="Profile" 
                className={`w-6 h-6 rounded-full border-2 ${location.pathname.startsWith('/profile') ? 'border-primary' : 'border-transparent'}`}
                referrerPolicy="no-referrer" 
              />
            ) : (
              <User className="w-5 h-5" />
            )}
          </Link>
        </div>
      </nav>
    </div>
  );
}
