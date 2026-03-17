import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Plus, Users, MapPin, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';

interface Session {
  id: string;
  name: string;
  hostId: string;
  location: string | null;
  startTime: any;
  endTime: any;
  maxPlayers: number | null;
  courts: number | null;
  status: 'waiting' | 'active' | 'completed';
  players: string[];
}

export default function Sessions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      try {
        // Fetch sessions where user is host OR user is in players array
        // For simplicity in this prototype, we'll fetch all active/waiting sessions
        // and sort them client-side to show relevant ones first.
        const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.GET, 'sessions'));
        
        const sessionsData: Session[] = [];
        if (querySnapshot) {
          querySnapshot.forEach((doc) => {
            const data = doc.data() as Session;
            if (data.status !== 'completed') {
              sessionsData.push({ id: doc.id, ...data });
            }
          });
        }
        
        setSessions(sessionsData);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('sessions.title', 'Sessions')}</h1>
          <p className="text-zinc-500 text-xs mt-0.5">{t('sessions.subtitle', 'Join or manage your badminton groups')}</p>
        </div>
        <button
          onClick={() => navigate('/sessions/new')}
          className="bg-primary hover:bg-primary-hover text-white p-2.5 rounded-full transition-transform active:scale-95 shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 bg-surface border border-zinc-800 rounded-2xl text-sm">
            {t('sessions.noSessions', 'No active sessions found. Create one!')}
          </div>
        ) : (
          sessions.map((session, index) => {
            const date = session.startTime ? new Date(session.startTime.toMillis()) : null;
            const isHost = session.hostId === user?.uid;
            const isJoined = session.players.includes(user?.uid || '');

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link 
                  to={`/sessions/${session.id}`}
                  className="block bg-surface border border-zinc-800 rounded-xl p-3.5 hover:bg-zinc-800/50 transition-colors relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${
                        session.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                        session.status === 'completed' ? 'bg-zinc-800 text-zinc-400' :
                        'bg-primary/10 text-primary'
                      }`}>
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm group-hover:text-primary transition-colors leading-tight">{session.name}</h3>
                        {date && (
                          <div className="flex items-center gap-1 text-[9px] text-zinc-500 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                        session.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        session.status === 'completed' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
                        'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {session.status}
                      </span>
                      {isHost && (
                        <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded uppercase font-bold">Host</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-800/50 pt-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{session.players.length} {session.maxPlayers ? `/ ${session.maxPlayers}` : ''}</span>
                      </div>
                      {session.courts && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{session.courts} Courts</span>
                        </div>
                      )}
                      {session.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[70px]">{session.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {isJoined && !isHost && (
                      <span className="text-emerald-400 text-[9px] font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded">Joined</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
