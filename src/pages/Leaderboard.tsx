import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, User as UserIcon, Calendar, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'all-time';

interface Player {
  uid: string;
  displayName: string;
  photoURL: string | null;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('all-time');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery).catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
        
        const usersMap = new Map<string, any>();
        if (usersSnapshot) {
          usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.isGuest) {
              usersMap.set(data.uid, data);
            }
          });
        }

        let playersData: Player[] = [];

        if (timeframe === 'all-time') {
          usersMap.forEach(data => {
            if (data.matchesPlayed > 0) {
              playersData.push({
                uid: data.uid,
                displayName: data.displayName || 'Unknown Player',
                photoURL: data.photoURL,
                elo: data.elo || 1200,
                matchesPlayed: data.matchesPlayed || 0,
                wins: data.wins || 0,
                losses: data.losses || 0,
              });
            }
          });
          playersData.sort((a, b) => b.elo - a.elo);
        } else {
          const now = new Date();
          let startDate = new Date();
          
          if (timeframe === 'daily') {
            startDate.setHours(0, 0, 0, 0);
          } else if (timeframe === 'weekly') {
            const day = startDate.getDay();
            const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
            startDate.setDate(diff);
            startDate.setHours(0, 0, 0, 0);
          } else if (timeframe === 'monthly') {
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
          }

          const matchesQuery = query(
            collection(db, 'matches'),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            where('status', '==', 'completed')
          );
          
          const matchesSnapshot = await getDocs(matchesQuery).catch(err => handleFirestoreError(err, OperationType.GET, 'matches'));
          
          const statsMap = new Map<string, { wins: number; losses: number; matchesPlayed: number }>();
          
          if (matchesSnapshot) {
            matchesSnapshot.forEach(doc => {
              const match = doc.data();
              const team1 = match.team1 || [];
              const team2 = match.team2 || [];
              const winner = match.winner;
              
              team1.forEach((uid: string) => {
                if (!statsMap.has(uid)) statsMap.set(uid, { wins: 0, losses: 0, matchesPlayed: 0 });
                const stats = statsMap.get(uid)!;
                stats.matchesPlayed++;
                if (winner === 1) stats.wins++;
                else stats.losses++;
              });
              
              team2.forEach((uid: string) => {
                if (!statsMap.has(uid)) statsMap.set(uid, { wins: 0, losses: 0, matchesPlayed: 0 });
                const stats = statsMap.get(uid)!;
                stats.matchesPlayed++;
                if (winner === 2) stats.wins++;
                else stats.losses++;
              });
            });
          }

          statsMap.forEach((stats, uid) => {
            const userData = usersMap.get(uid);
            if (userData) {
              playersData.push({
                uid,
                displayName: userData.displayName || 'Unknown Player',
                photoURL: userData.photoURL,
                elo: userData.elo || 1200,
                matchesPlayed: stats.matchesPlayed,
                wins: stats.wins,
                losses: stats.losses,
              });
            }
          });

          playersData.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            const aWinRate = a.matchesPlayed > 0 ? a.wins / a.matchesPlayed : 0;
            const bWinRate = b.matchesPlayed > 0 ? b.wins / b.matchesPlayed : 0;
            if (bWinRate !== aWinRate) return bWinRate - aWinRate;
            return b.matchesPlayed - a.matchesPlayed;
          });
        }

        setPlayers(playersData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Medal className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-zinc-300" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-zinc-500 font-mono font-medium w-5 text-center text-xs">{index + 1}</span>;
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 w-full pb-24">
      <div className="text-center mb-6">
        <div className="mx-auto w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-xl font-bold mb-1">{t('leaderboard.title')}</h1>
        <p className="text-zinc-500 text-[10px] max-w-xs mx-auto mb-3">
          {t('leaderboard.subtitle')}
        </p>

        <div className="flex justify-center relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-zinc-800 transition-colors"
          >
            <Calendar className="w-3 h-3 text-primary" />
            <span className="capitalize">{timeframe.replace('-', ' ')}</span>
            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 w-36 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {(['daily', 'weekly', 'monthly', 'all-time'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeframe(tf);
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-[10px] font-bold transition-colors ${
                      timeframe === tf ? 'bg-primary/10 text-primary' : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="capitalize">{tf.replace('-', ' ')}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-2">
        {players.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 bg-surface border border-zinc-800 rounded-2xl text-xs">
            {t('leaderboard.noPlayers')}
          </div>
        ) : (
          players.map((player, index) => {
            const winRate = player.matchesPlayed > 0 
              ? Math.round((player.wins / player.matchesPlayed) * 100) 
              : 0;
            
            return (
              <motion.div 
                key={player.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-surface border border-zinc-800 rounded-xl p-2.5 flex items-center gap-2.5 shadow-lg relative overflow-hidden"
              >
                {/* Rank Indicator */}
                <div className="flex-shrink-0 w-5 flex justify-center">
                  {getRankIcon(index)}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${player.uid}`} className="flex items-center gap-2 group">
                    {player.photoURL ? (
                      <img src={player.photoURL} alt={player.displayName} className="w-8 h-8 rounded-full border border-zinc-700 flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-zinc-400" />
                      </div>
                    )}
                    <div className="truncate flex-1">
                      <div className="font-bold text-white text-xs truncate group-hover:text-primary transition-colors leading-tight">
                        {player.displayName}
                      </div>
                      <div className="text-[9px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <span>{player.matchesPlayed} {t('profile.matches')}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-zinc-700"></span>
                        <span className="text-emerald-500">{winRate}% WR</span>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Rating */}
                <div className="flex-shrink-0 text-right pl-1">
                  <div className="font-mono text-sm font-black text-primary leading-none">
                    {timeframe === 'all-time' ? player.elo : player.wins}
                  </div>
                  <div className="text-[7px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">
                    {timeframe === 'all-time' ? t('leaderboard.rating') : 'Wins'}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
