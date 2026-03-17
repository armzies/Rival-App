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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-surface border-b border-line">
        <div className="max-w-md mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-sm">
                <Swords className="w-5 h-5 text-primary" />
              </div>
              <span className="font-mono font-bold text-xl tracking-tighter text-white uppercase">Rival</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleLanguage}
                className="flex items-center justify-center w-9 h-9 rounded-sm bg-surface border border-line text-zinc-400 hover:text-primary transition-all active:scale-90"
              >
                <span className="text-[10px] font-mono font-bold">{i18n.language === 'th' ? 'EN' : 'TH'}</span>
              </button>
              <Link
                to="/settings"
                className={`flex items-center justify-center w-10 h-10 rounded-sm border transition-all active:scale-90 ${
                  location.pathname === '/settings' ? 'border-primary' : 'border-line bg-surface'
                }`}
              >
                {profilePhoto ? (
                  <img 
                    src={profilePhoto} 
                    alt="Profile" 
                    className="w-full h-full rounded-sm object-cover"
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <User className="w-5 h-5 text-zinc-400" />
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-md mx-auto w-full pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-line">
        <div className="max-w-md mx-auto px-8 py-3 flex justify-between items-center">
          <Link
            to="/sessions"
            className={`flex flex-col items-center gap-1 p-2 transition-all active:scale-90 ${
              location.pathname === '/sessions' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-[8px] font-mono uppercase tracking-widest">Sessions</span>
          </Link>

          <Link
            to="/leaderboard"
            className={`flex flex-col items-center gap-1 p-2 transition-all active:scale-90 ${
              location.pathname === '/leaderboard' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Trophy className="w-6 h-6" />
            <span className="text-[8px] font-mono uppercase tracking-widest">Rank</span>
          </Link>

          <Link
            to={`/profile/${user?.uid}`}
            className={`flex flex-col items-center gap-1 p-2 transition-all active:scale-90 ${
              location.pathname.startsWith('/profile') ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-[8px] font-mono uppercase tracking-widest">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
