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
    <div className="max-w-md mx-auto px-6 py-8 w-full pb-32">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 glass-card rounded-[2.5rem] p-4 shadow-2xl soft-glow"
      >
        <div className="flex items-center gap-4">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.displayName} className="w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white shadow-lg" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-16 h-16 rounded-[1.5rem] bg-zinc-100 flex items-center justify-center border-4 border-white shadow-lg">
              <UserIcon className="w-8 h-8 text-zinc-300" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black text-zinc-900 mb-1 tracking-tight">{profile.displayName}</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                <Trophy className="w-3 h-3 text-primary" />
                <span className="font-black text-primary text-[10px]">{profile.elo}</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest">Rating</span>
            </div>
          </div>
        </div>
        
        {user?.uid === id && (
          <Link 
            to="/settings"
            className="p-3 bg-zinc-100 hover:bg-zinc-200 rounded-2xl transition-all active:scale-90 group"
          >
            <Settings className="w-5 h-5 text-zinc-800 group-hover:text-zinc-900" />
          </Link>
        )}
      </motion.div>

      {/* Statistics Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-[2.5rem] p-6 mb-8 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-black text-zinc-900 tracking-tight">Statistics</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-50/50 p-3 rounded-[1.5rem] border border-zinc-100 flex flex-col items-center justify-center text-center">
            <div className="text-[9px] text-zinc-800 uppercase font-black tracking-widest mb-1">Matches</div>
            <div className="text-xl font-black text-zinc-900 tracking-tighter">{profile.matchesPlayed}</div>
          </div>
          <div className="bg-zinc-50/50 p-3 rounded-[1.5rem] border border-zinc-100 flex flex-col items-center justify-center text-center">
            <div className="text-[9px] text-zinc-800 uppercase font-black tracking-widest mb-1">Win Rate</div>
            <div className="text-xl font-black text-zinc-900 tracking-tighter flex items-center gap-1">
              {winRate}%
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            </div>
          </div>
          <div className="bg-zinc-50/50 p-3 rounded-[1.5rem] border border-zinc-100 flex flex-col items-center justify-center text-center">
            <div className="text-[9px] text-zinc-800 uppercase font-black tracking-widest mb-1">Elo</div>
            <div className="text-xl font-black text-zinc-900 tracking-tighter">{profile.elo}</div>
          </div>
        </div>
      </motion.div>

      {/* Match History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="glass-card rounded-[2.5rem] p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Swords className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-black text-zinc-900 tracking-tight">{t('profile.recentMatches')}</h2>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-zinc-100 rounded-[2rem]">
              <p className="text-[10px] text-zinc-800 font-black uppercase tracking-widest">{t('profile.noMatches')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.slice(0, 5).map((match) => {
                const isTeam1 = match.team1.includes(id!);
                const isWinner = (isTeam1 && match.winner === 1) || (!isTeam1 && match.winner === 2);
                const date = match.createdAt ? new Date(match.createdAt.toMillis()).toLocaleDateString() : 'Unknown';
                const eloChange = isTeam1 ? match.eloChange1 : match.eloChange2;

                return (
                  <div key={match.id} className="bg-zinc-50/50 border border-zinc-100 rounded-[1.5rem] p-4 hover:bg-white hover:shadow-lg transition-all active:scale-[0.98]">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${isWinner ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                          {isWinner ? t('profile.victory') : t('profile.defeat')}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-zinc-800 text-[10px] font-bold">
                            <Calendar className="w-3 h-3" />
                            {date}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {eloChange !== undefined && (
                          <div className={`flex flex-col items-end`}>
                            <span className="text-[8px] text-zinc-800 uppercase font-black tracking-widest leading-none mb-1">Rating</span>
                            <div className={`flex items-center gap-1 font-black text-sm ${eloChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {eloChange >= 0 ? '+' : ''}{eloChange}
                              <Trophy className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {matches.length > 5 && (
                <button
                  onClick={() => setShowAllMatches(true)}
                  className="w-full py-4 mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-800 hover:text-zinc-900 bg-zinc-50/50 hover:bg-white border border-zinc-100 rounded-[1.5rem] transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>View more</span>
                  <ChevronRight className="w-3.5 h-3.5" />
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col soft-glow"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl">
                    <History className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Match History</h2>
                </div>
                <button onClick={() => setShowAllMatches(false)} className="p-2.5 hover:bg-zinc-100 rounded-2xl text-zinc-800 transition-all active:scale-90">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {matches.map((match) => {
                  const isTeam1 = match.team1.includes(id!);
                  const isWinner = (isTeam1 && match.winner === 1) || (!isTeam1 && match.winner === 2);
                  const date = match.createdAt ? new Date(match.createdAt.toMillis()).toLocaleDateString() : 'Unknown';
                  const eloChange = isTeam1 ? match.eloChange1 : match.eloChange2;

                  return (
                    <div key={match.id} className="bg-zinc-50/50 border border-zinc-100 rounded-[2rem] p-5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${isWinner ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {isWinner ? t('profile.victory') : t('profile.defeat')}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-800 text-[10px] font-bold flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {date}
                            </span>
                          </div>
                        </div>

                        {eloChange !== undefined && (
                          <div className={`flex items-center gap-1 font-black text-sm ${eloChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {eloChange >= 0 ? '+' : ''}{eloChange}
                            <Trophy className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      
                      {/* Team Details */}
                      <div className="pt-4 border-t border-zinc-100 grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[9px] text-zinc-800 uppercase font-black tracking-widest mb-2 px-1">Team 1</p>
                          <div className="space-y-1.5">
                            {match.team1.map(uid => (
                              <div key={uid} className={`text-xs truncate font-bold ${uid === id ? 'text-primary' : 'text-zinc-800'}`}>
                                {usersMap[uid]?.displayName || 'Unknown'}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-zinc-800 uppercase font-black tracking-widest mb-2 px-1">Team 2</p>
                          <div className="space-y-1.5">
                            {match.team2.map(uid => (
                              <div key={uid} className={`text-xs truncate font-bold ${uid === id ? 'text-primary' : 'text-zinc-800'}`}>
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

