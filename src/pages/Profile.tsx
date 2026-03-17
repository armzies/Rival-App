import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Trophy, Swords, Calendar, ChevronRight, BarChart2, Star, History, Settings, X } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  createdAt: any;
}

interface MatchRecord {
  id: string;
  team1: string[];
  team2: string[];
  team1Score: number;
  team2Score: number;
  winner: 1 | 2;
  createdAt: any;
  eloChange1?: number;
  eloChange2?: number;
}

export default function Profile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, { displayName: string, photoURL: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [showAllMatches, setShowAllMatches] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Listen to profile changes
    const unsubscribeProfile = onSnapshot(doc(db, 'users', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const fetchMatchesData = async () => {
      try {
        // Fetch matches where user is in team1 or team2
        const q1 = query(collection(db, 'matches'), where('team1', 'array-contains', id));
        const q2 = query(collection(db, 'matches'), where('team2', 'array-contains', id));

        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const allMatchesMap = new Map<string, MatchRecord>();
        snap1.forEach(doc => allMatchesMap.set(doc.id, { id: doc.id, ...doc.data() } as MatchRecord));
        snap2.forEach(doc => allMatchesMap.set(doc.id, { id: doc.id, ...doc.data() } as MatchRecord));

        const allMatches = Array.from(allMatchesMap.values());
        allMatches.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA; // Descending order
        });

        setMatches(allMatches); // Store all fetched matches

        // Fetch all users to map names
        const usersSnap = await getDocs(collection(db, 'users'));
        const uMap: Record<string, { displayName: string, photoURL: string | null }> = {};
        usersSnap.forEach(doc => {
          const data = doc.data();
          uMap[doc.id] = {
            displayName: data.displayName || 'Unknown',
            photoURL: data.photoURL || null
          };
        });
        setUsersMap(uMap);

      } catch (error) {
        console.error("Error fetching match data:", error);
      }
    };

    fetchMatchesData();

    return () => unsubscribeProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full text-center">
        <h1 className="text-3xl font-bold mb-4">{t('profile.notFound')}</h1>
      </div>
    );
  }

  const winRate = profile.matchesPlayed > 0 
    ? Math.round((profile.wins / profile.matchesPlayed) * 100) 
    : 0;

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 w-full pb-32">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 bg-surface border border-zinc-800 rounded-3xl p-3.5 shadow-lg"
      >
        <div className="flex items-center gap-3">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.displayName} className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-700">
              <UserIcon className="w-6 h-6 text-zinc-400" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-white mb-0.5">{profile.displayName}</h1>
            <div className="flex items-center gap-1 text-zinc-400 text-xs">
              <Trophy className="w-3 h-3 text-primary" />
              <span className="font-bold text-white text-xs">{profile.elo}</span>
              <span className="text-[10px] ml-0.5">Rating</span>
            </div>
          </div>
        </div>
        
        {user?.uid === id && (
          <Link 
            to="/settings"
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-[10px] font-black transition-all text-white uppercase tracking-widest active:scale-95"
          >
            <Settings className="w-3 h-3" />
            <span>Settings</span>
          </Link>
        )}
      </motion.div>

      {/* Statistics Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface border border-zinc-800 rounded-3xl p-4 mb-5 shadow-lg"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
            <BarChart2 className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-sm font-bold text-white">Statistics</h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-zinc-900/40 p-2.5 rounded-2xl border border-zinc-800/50">
            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-0.5">Matches</div>
            <div className="text-lg font-black text-white">{profile.matchesPlayed}</div>
          </div>
          <div className="bg-zinc-900/40 p-2.5 rounded-2xl border border-zinc-800/50">
            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-0.5">Win Rate</div>
            <div className="text-lg font-black text-white flex items-center gap-1">
              {winRate}%
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            </div>
          </div>
          <div className="bg-zinc-900/40 p-2.5 rounded-2xl border border-zinc-800/50">
            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-0.5">Elo Rating</div>
            <div className="text-lg font-black text-white">{profile.elo}</div>
          </div>
          <div className="bg-zinc-900/40 p-2.5 rounded-2xl border border-zinc-800/50">
            <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-0.5">W / L</div>
            <div className="text-lg font-black text-white">{profile.wins} / {profile.losses}</div>
          </div>
        </div>
      </motion.div>

      {/* Match History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-surface border border-zinc-800 rounded-3xl p-4 shadow-lg">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Swords className="w-3.5 h-3.5 text-primary" />
            {t('profile.recentMatches')}
          </h2>

          {matches.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl text-xs">
              {t('profile.noMatches')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {matches.slice(0, 5).map((match) => {
                const isTeam1 = match.team1.includes(id!);
                const isWinner = (isTeam1 && match.winner === 1) || (!isTeam1 && match.winner === 2);
                const date = match.createdAt ? new Date(match.createdAt.toMillis()).toLocaleDateString() : 'Unknown';
                const eloChange = isTeam1 ? match.eloChange1 : match.eloChange2;

                return (
                  <div key={match.id} className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-3 hover:bg-zinc-800/30 transition-colors">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${isWinner ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {isWinner ? t('profile.victory') : t('profile.defeat')}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1 text-zinc-500 text-[9px]">
                            <Calendar className="w-2.5 h-2.5" />
                            {date}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {eloChange !== undefined && (
                          <div className={`flex flex-col items-end`}>
                            <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-0.5">Rating</span>
                            <div className={`flex items-center gap-0.5 font-black text-xs ${eloChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {eloChange >= 0 ? '+' : ''}{eloChange}
                              <Trophy className="w-2.5 h-2.5" />
                            </div>
                          </div>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {matches.length > 5 && (
                <button
                  onClick={() => setShowAllMatches(true)}
                  className="w-full py-3 mt-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <span>View more</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* All Matches Modal */}
      <AnimatePresence>
        {showAllMatches && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Match History
                </h2>
                <button onClick={() => setShowAllMatches(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {matches.map((match) => {
                  const isTeam1 = match.team1.includes(id!);
                  const isWinner = (isTeam1 && match.winner === 1) || (!isTeam1 && match.winner === 2);
                  const date = match.createdAt ? new Date(match.createdAt.toMillis()).toLocaleDateString() : 'Unknown';
                  const eloChange = isTeam1 ? match.eloChange1 : match.eloChange2;

                  return (
                    <div key={match.id} className="bg-zinc-800/40 border border-zinc-800/50 rounded-2xl p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${isWinner ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {isWinner ? t('profile.victory') : t('profile.defeat')}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {date}
                            </span>
                          </div>
                        </div>

                        {eloChange !== undefined && (
                          <div className={`flex items-center gap-1 font-black text-sm ${eloChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {eloChange >= 0 ? '+' : ''}{eloChange}
                            <Trophy className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      
                      {/* Team Details (Optional but nice for full history) */}
                      <div className="mt-3 pt-3 border-t border-zinc-800/50 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Team 1</p>
                          <div className="space-y-1">
                            {match.team1.map(uid => (
                              <div key={uid} className={`text-[10px] truncate ${uid === id ? 'text-white font-bold' : 'text-zinc-400'}`}>
                                {usersMap[uid]?.displayName || 'Unknown'}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1.5">Team 2</p>
                          <div className="space-y-1">
                            {match.team2.map(uid => (
                              <div key={uid} className={`text-[10px] truncate ${uid === id ? 'text-white font-bold' : 'text-zinc-400'}`}>
                                {usersMap[uid]?.displayName || 'Unknown'}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

