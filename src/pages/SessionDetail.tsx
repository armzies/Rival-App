import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { toast } from 'sonner';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, addDoc, serverTimestamp, runTransaction, setDoc, deleteDoc } from 'firebase/firestore';
import { MapPin, Clock, Users, Share2, Play, Shuffle, Check, X, UserPlus, Loader2, User, Trophy, Trash2, MoreVertical, Settings, AlertCircle, LayoutGrid, History, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SessionData {
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

interface PlayerData {
  uid: string;
  displayName: string;
  photoURL: string | null;
  elo?: number;
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
  isGuest?: boolean;
}

interface MatchData {
  id: string;
  sessionId: string;
  team1: string[];
  team2: string[];
  status: 'pending' | 'completed';
  winner: number;
  createdAt: any;
  courtNumber?: number;
}

export default function SessionDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerData>>({});
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [guestNames, setGuestNames] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editMaxPlayers, setEditMaxPlayers] = useState('');
  const [editCourts, setEditCourts] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showShuffleError, setShowShuffleError] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'players' | 'courts' | 'history'>('players');
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{
    uid: string;
    wins: number;
    matches: number;
  }[]>([]);
  const [swappingPlayer, setSwappingPlayer] = useState<{
    matchId: string;
    team: 1 | 2;
    index: number;
    currentUid: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    // Listen to session changes
    const unsubscribeSession = onSnapshot(doc(db, 'sessions', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as SessionData;
        setSession(data);
      } else {
        navigate('/sessions');
      }
      setLoading(false);
    });

    // Listen to matches in this session
    const qMatches = query(collection(db, 'matches'), where('sessionId', '==', id));
    const unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
      const matchData: MatchData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as MatchData;
        matchData.push({ id: doc.id, ...data });
      });
      
      // Sort by createdAt desc
      matchData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setMatches(matchData);
    });

    return () => {
      unsubscribeSession();
      unsubscribeMatches();
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!session) return;

    const fetchAllPlayers = async () => {
      const matchPlayerUids = new Set<string>();
      matches.forEach(match => {
        match.team1.forEach(uid => matchPlayerUids.add(uid));
        match.team2.forEach(uid => matchPlayerUids.add(uid));
      });

      const allUidsToFetch = Array.from(new Set([...session.players, ...Array.from(matchPlayerUids)]));
      
      if (allUidsToFetch.length === 0) return;

      try {
        const playersData: Record<string, PlayerData> = {};
        await Promise.all(allUidsToFetch.map(async (uid) => {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            playersData[uid] = userDoc.data() as PlayerData;
          }
        }));
        setPlayers(playersData);
      } catch (error) {
        console.error("Error fetching players:", error);
      }
    };

    fetchAllPlayers();
  }, [session?.players, matches]);

  useEffect(() => {
    if (session) {
      setEditName(session.name);
      setEditLocation(session.location || '');
      setEditMaxPlayers(String(session.maxPlayers || 12));
      setEditCourts(String(session.courts || 2));
    }
  }, [session]);

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !user) return;
    
    setUpdating(true);
    try {
      const sessionRef = doc(db, 'sessions', session.id);
      await updateDoc(sessionRef, {
        name: editName,
        location: editLocation,
        maxPlayers: Number(editMaxPlayers),
        courts: Number(editCourts)
      });
      setShowEditModal(false);
      toast.success("Session updated successfully!");
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("Failed to update session.");
    } finally {
      setUpdating(false);
    }
  };
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${session?.name || 'my Badminton Session'}`,
          text: `Join us for badminton!`,
          url: url,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleJoin = async () => {
    if (!user || !session) return;
    try {
      const sessionRef = doc(db, 'sessions', session.id);
      await updateDoc(sessionRef, {
        players: [...session.players, user.uid]
      });
    } catch (error) {
      console.error("Error joining session:", error);
    }
  };

  const handleRemovePlayer = async (uidToRemove: string) => {
    if (!user || !session || user.uid !== session.hostId) return;
    try {
      const newPlayers = session.players.filter(uid => uid !== uidToRemove);
      await updateDoc(doc(db, 'sessions', session.id), {
        players: newPlayers
      });
    } catch (error) {
      console.error("Error removing player:", error);
    }
  };

  const handleAddGuests = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = guestNames.split('\n').map(n => n.trim()).filter(n => n);
    if (!user || !session || !names.length) return;

    setAddingGuest(true);
    try {
      const newUids: string[] = [];
      const promises = names.map(async (name, index) => {
        const guestUid = `guest_${user.uid}_${Date.now()}_${index}`;
        newUids.push(guestUid);
        const guestData = {
          uid: guestUid,
          displayName: name + ' (Guest)',
          email: null,
          photoURL: null,
          elo: 1200,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          createdAt: serverTimestamp(),
          isGuest: true,
          hostId: user.uid
        };
        await setDoc(doc(db, 'users', guestUid), guestData);
      });

      await Promise.all(promises);
      
      await updateDoc(doc(db, 'sessions', session.id), {
        players: [...session.players, ...newUids]
      });
      
      setGuestNames('');
      setShowAddGuest(false);
    } catch (error) {
      console.error("Error adding guests:", error);
    } finally {
      setAddingGuest(false);
    }
  };

  const onStartClick = () => {
    if (!session) return;
    const now = new Date();
    if (session.startTime && session.startTime.toDate() > now) {
      setShowStartConfirm(true);
    } else {
      handleStartSession();
    }
  };

  const handleStartSession = async () => {
    if (!session || !user) return;
    try {
      await updateDoc(doc(db, 'sessions', session.id), {
        status: 'active'
      });
      setShowStartConfirm(false);
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const handleEndSession = async () => {
    if (!session || !user) return;
    try {
      // 1. Calculate session summary before removing guests or changing status
      const sessionWins: Record<string, number> = {};
      const sessionMatches: Record<string, number> = {};
      
      session.players.forEach(uid => {
        sessionWins[uid] = 0;
        sessionMatches[uid] = 0;
      });

      matches.forEach(match => {
        if (match.status === 'completed') {
          const winners = match.winner === 1 ? match.team1 : match.team2;
          const allPlayers = [...match.team1, ...match.team2];
          
          allPlayers.forEach(uid => {
            if (sessionMatches[uid] !== undefined) sessionMatches[uid]++;
          });
          
          winners.forEach(uid => {
            if (sessionWins[uid] !== undefined) sessionWins[uid]++;
          });
        }
      });

      const summary = session.players
        .map(uid => ({
          uid,
          wins: sessionWins[uid] || 0,
          matches: sessionMatches[uid] || 0
        }))
        .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.matches - a.matches; // More matches played as tie-breaker? Or fewer? Usually more wins is better.
        })
        .slice(0, 5); // Get top 5 just in case, but we'll show top 3

      setSessionSummary(summary);
      setShowSummary(true);

      // 2. Update session status
      await updateDoc(doc(db, 'sessions', session.id), {
        status: 'completed'
      });

      // 3. Remove guest players from the session's player list as requested previously
      const remainingPlayers = session.players.filter(uid => !players[uid]?.isGuest);
      await updateDoc(doc(db, 'sessions', session.id), {
        players: remainingPlayers
      });
      
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const handleSwapPlayer = async (newUid: string) => {
    if (!swappingPlayer || !session) return;

    try {
      const matchRef = doc(db, 'matches', swappingPlayer.matchId);
      const match = matches.find(m => m.id === swappingPlayer.matchId);
      if (!match) return;

      const newTeam1 = [...match.team1];
      const newTeam2 = [...match.team2];

      if (swappingPlayer.team === 1) {
        newTeam1[swappingPlayer.index] = newUid;
      } else {
        newTeam2[swappingPlayer.index] = newUid;
      }

      await updateDoc(matchRef, {
        team1: newTeam1,
        team2: newTeam2
      });

      setSwappingPlayer(null);
      toast.success("Player swapped successfully!");
    } catch (error) {
      console.error("Error swapping player:", error);
      toast.error("Failed to swap player.");
    }
  };

  const handleShuffleForCourt = async (courtNum: number) => {
    if (!session || !user || session.players.length < 4) {
      setShowShuffleError(true);
      return;
    }

    setShuffling(true);
    try {
      // 1. Identify players currently playing in other courts
      const currentlyPlayingUids = new Set<string>();
      matches.filter(m => m.status === 'pending' && m.courtNumber !== courtNum).forEach(m => {
        m.team1.forEach(uid => currentlyPlayingUids.add(uid));
        m.team2.forEach(uid => currentlyPlayingUids.add(uid));
      });

      // 2. Filter available players
      const availablePlayers = session.players.filter(uid => !currentlyPlayingUids.has(uid));

      if (availablePlayers.length < 4) {
        toast.error("Not enough available players for this court!");
        return;
      }

      // 3. Calculate play counts and opponent history for available players
      const playCounts: Record<string, number> = {};
      const opponentHistory: Record<string, Record<string, number>> = {};
      
      availablePlayers.forEach(uid => {
        playCounts[uid] = 0;
        opponentHistory[uid] = {};
        availablePlayers.forEach(otherUid => {
          if (uid !== otherUid) opponentHistory[uid][otherUid] = 0;
        });
      });

      matches.forEach(match => {
        if (match.status === 'completed') {
          const allMatchPlayers = [...match.team1, ...match.team2];
          allMatchPlayers.forEach(uid => {
            if (playCounts[uid] !== undefined) {
              playCounts[uid]++;
            }
          });

          match.team1.forEach(p1 => {
            match.team2.forEach(p2 => {
              if (opponentHistory[p1] && opponentHistory[p1][p2] !== undefined) {
                opponentHistory[p1][p2]++;
                opponentHistory[p2][p1]++;
              }
            });
          });
        }
      });

      // 4. Sort available players by play count
      const sortedPlayers = [...availablePlayers].sort((a, b) => {
        const diff = playCounts[a] - playCounts[b];
        if (diff === 0) return Math.random() - 0.5;
        return diff;
      });

      // 5. Select top 4 candidates
      const candidates = sortedPlayers.slice(0, 4);

      // 6. Find best pairing among candidates
      let bestPermutation = [...candidates];
      let minScore = Infinity;

      for (let attempt = 0; attempt < 50; attempt++) {
        const currentPerm = [...candidates].sort(() => Math.random() - 0.5);
        const p1 = currentPerm[0];
        const p2 = currentPerm[1];
        const p3 = currentPerm[2];
        const p4 = currentPerm[3];

        const currentScore = opponentHistory[p1][p3] + opponentHistory[p1][p4] + 
                           opponentHistory[p2][p3] + opponentHistory[p2][p4];

        if (currentScore < minScore) {
          minScore = currentScore;
          bestPermutation = currentPerm;
        }
        if (minScore === 0) break;
      }

      // 7. Create the match
      await addDoc(collection(db, 'matches'), {
        sessionId: session.id,
        team1: [bestPermutation[0], bestPermutation[1]],
        team2: [bestPermutation[2], bestPermutation[3]],
        team1Score: 0,
        team2Score: 0,
        winner: 0,
        status: 'pending',
        loggedBy: user.uid,
        createdAt: serverTimestamp(),
        courtNumber: courtNum
      });
      
    } catch (error) {
      console.error("Error shuffling match:", error);
      toast.error("Failed to shuffle match.");
    } finally {
      setShuffling(false);
    }
  };

  const handleResolveMatch = async (matchId: string, winner: number) => {
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      // Basic Elo calculation
      const team1Elos = match.team1.map(uid => players[uid]?.elo || 1200);
      const team2Elos = match.team2.map(uid => players[uid]?.elo || 1200);
      
      const team1AvgElo = team1Elos.reduce((a, b) => a + b, 0) / (team1Elos.length || 1);
      const team2AvgElo = team2Elos.reduce((a, b) => a + b, 0) / (team2Elos.length || 1);

      const kFactor = 32;
      const expectedScore1 = 1 / (1 + Math.pow(10, (team2AvgElo - team1AvgElo) / 400));
      const expectedScore2 = 1 / (1 + Math.pow(10, (team1AvgElo - team2AvgElo) / 400));

      const actualScore1 = winner === 1 ? 1 : 0;
      const actualScore2 = winner === 2 ? 1 : 0;

      const eloChange1 = Math.round(kFactor * (actualScore1 - expectedScore1));
      const eloChange2 = Math.round(kFactor * (actualScore2 - expectedScore2));

      // Update match status
      await updateDoc(doc(db, 'matches', matchId), {
        status: 'completed',
        winner,
        eloChange1,
        eloChange2
      });

      // Update players
      const updatePromises = [];
      
      match.team1.forEach(uid => {
        const p = players[uid];
        if (p && !p.isGuest) {
          updatePromises.push(updateDoc(doc(db, 'users', uid), {
            elo: (p.elo || 1200) + eloChange1,
            matchesPlayed: (p.matchesPlayed || 0) + 1,
            wins: (p.wins || 0) + (winner === 1 ? 1 : 0),
            losses: (p.losses || 0) + (winner === 1 ? 0 : 1)
          }));
        }
      });

      match.team2.forEach(uid => {
        const p = players[uid];
        if (p && !p.isGuest) {
          updatePromises.push(updateDoc(doc(db, 'users', uid), {
            elo: (p.elo || 1200) + eloChange2,
            matchesPlayed: (p.matchesPlayed || 0) + 1,
            wins: (p.wins || 0) + (winner === 2 ? 1 : 0),
            losses: (p.losses || 0) + (winner === 2 ? 0 : 1)
          }));
        }
      });

      await Promise.all(updatePromises);
      
    } catch (error) {
      console.error("Error resolving match:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return null;

  const isHost = user?.uid === session.hostId;
  const isJoined = session.players.includes(user?.uid || '');
  const date = session.startTime ? new Date(session.startTime.toMillis()) : new Date();

  // Calculate play counts for each player in this session
  const playCounts = (() => {
    const counts: Record<string, number> = {};
    session.players.forEach(uid => counts[uid] = 0);
    matches.forEach(match => {
      // Count both pending and completed matches as "participated"
      [...match.team1, ...match.team2].forEach(uid => {
        if (counts[uid] !== undefined) counts[uid]++;
      });
    });
    return counts;
  })();

  return (
    <div className="max-w-md mx-auto px-4 py-6 w-full pb-32">
      {/* Header */}
      <div className="bg-surface border border-zinc-800 rounded-3xl p-5 mb-5 relative">
        <div className="absolute top-2 right-2 z-[60]">
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="p-2 bg-zinc-800/80 rounded-full text-zinc-300 hover:text-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[60]" 
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[70] overflow-hidden"
                  >
                    <button 
                      onClick={() => {
                        handleShare();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Session</span>
                    </button>

                    {isHost && session.status !== 'completed' && (
                      <button 
                        onClick={() => {
                          setShowEditModal(true);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left border-t border-zinc-800"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Edit Session</span>
                      </button>
                    )}
                    
                    {isHost && session.status !== 'completed' && (
                      <button 
                        onClick={() => {
                          setShowEndConfirm(true);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors text-left border-t border-zinc-800"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>End Session</span>
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mb-3 pr-8">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{session.name}</h1>
            <span className={`inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
              session.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
              session.status === 'completed' ? 'bg-zinc-800 text-zinc-400' :
              'bg-primary/20 text-primary'
            }`}>
              {session.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-400 mt-5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="truncate">{date.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="truncate">{session.players.length} / {session.maxPlayers} Players</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="truncate">{session.location || 'No location'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="truncate">{session.courts || 1} Courts</span>
          </div>
        </div>

        {!isJoined && session.status === 'waiting' && (
          <button 
            onClick={handleJoin}
            className="w-full mt-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm transition-colors"
          >
            Join Session
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl mb-6">
        <button
          onClick={() => setActiveTab('players')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'players' 
              ? 'bg-zinc-800 text-white shadow-lg' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Players</span>
        </button>
        <button
          onClick={() => setActiveTab('courts')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'courts' 
              ? 'bg-zinc-800 text-white shadow-lg' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Courts</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history' 
              ? 'bg-zinc-800 text-white shadow-lg' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </div>

      {/* Players List */}
      {activeTab === 'players' && (
        <>
          <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Players</h2>
          {isHost && session.status !== 'completed' && (
            <button 
              onClick={() => setShowAddGuest(!showAddGuest)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Guest</span>
            </button>
          )}
        </div>

        {/* Add Guest Form */}
        <AnimatePresence>
          {showAddGuest && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddGuests}
              className="mb-3 overflow-hidden"
            >
              <div className="flex gap-2">
                <textarea
                  placeholder="Guest Names (one per line)"
                  value={guestNames}
                  onChange={(e) => setGuestNames(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none h-16"
                />
                <button 
                  type="submit"
                  disabled={addingGuest || !guestNames.trim()}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {addingGuest ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-2">
          {session.players.map(uid => {
            const p = players[uid];
            if (!p) return null;
            return (
              <div key={uid} className="flex items-center gap-2.5 bg-surface border border-zinc-800/50 rounded-xl p-2.5">
                {p.photoURL ? (
                  <img src={p.photoURL} alt={p.displayName} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{p.displayName}</p>
                  <div className="flex items-center gap-2">
                    {!p.isGuest && <p className="text-[10px] text-zinc-500">Elo: {Math.round(p.elo || 1200)}</p>}
                    <div className="flex items-center gap-1 bg-zinc-800/50 px-1.5 py-0.5 rounded-md border border-zinc-700/30">
                      <Play className="w-2 h-2 text-primary" />
                      <span className="text-[9px] font-bold text-zinc-400">{playCounts[uid] || 0} Games</span>
                    </div>
                  </div>
                </div>
                {isHost && uid !== session.hostId && (
                  <button
                    onClick={() => {
                      if (p.isGuest) {
                        handleRemovePlayer(uid);
                      } else {
                        setPlayerToRemove(uid);
                      }
                    }}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>


        </>
      )}

      {/* Start Confirm Modal */}
      <AnimatePresence>
        {showStartConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm"
            >
              <h3 className="text-xl font-bold mb-2">Start Early?</h3>
              <p className="text-zinc-400 mb-6">It's not time yet according to the schedule. Are you sure you want to start the session now?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowStartConfirm(false)} 
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleStartSession} 
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors"
                >
                  Start Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Session Modal */}
      <AnimatePresence>
        {showEditModal && (
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
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-6">Edit Session</h2>
              <form onSubmit={handleUpdateSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Session Name</label>
                  <input 
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Location</label>
                  <input 
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Max Players</label>
                    <input 
                      type="number"
                      min="4"
                      value={editMaxPlayers}
                      onChange={(e) => setEditMaxPlayers(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Courts</label>
                    <input 
                      type="number"
                      min="1"
                      max="20"
                      value={editCourts}
                      onChange={(e) => setEditCourts(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={updating}
                    className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shuffle Error Modal */}
      <AnimatePresence>
        {showShuffleError && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">Not Enough Players</h2>
              <p className="text-zinc-400 mb-8">You need at least 4 players to shuffle and create matches. Currently you have {session.players.length} players.</p>
              
              <button 
                onClick={() => setShowShuffleError(false)}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove Player Confirm Modal */}
      <AnimatePresence>
        {playerToRemove && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm"
            >
              <h3 className="text-xl font-bold mb-2">Remove Player?</h3>
              <p className="text-zinc-400 mb-6">Are you sure you want to remove {players[playerToRemove]?.displayName} from the session?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setPlayerToRemove(null)} 
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleRemovePlayer(playerToRemove);
                    setPlayerToRemove(null);
                  }} 
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Session Confirm Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm"
            >
              <h3 className="text-xl font-bold mb-2">End Session?</h3>
              <p className="text-zinc-400 mb-6">Are you sure you want to end this session? This will complete the session and remove all guest players.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEndConfirm(false)} 
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleEndSession();
                    setShowEndConfirm(false);
                  }} 
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
                >
                  End Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matches Section */}
      {session.status !== 'waiting' && (
        <div className="space-y-8">
          {/* Live Courts */}
          {activeTab === 'courts' && (
            <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <h2 className="text-lg font-bold">Live Courts</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {Array.from({ length: session.courts || 1 }).map((_, index) => {
                  const courtNum = index + 1;
                  const match = matches.find(m => m.status === 'pending' && m.courtNumber === courtNum);
                  
                  return (
                    <motion.div 
                      key={courtNum}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                        match 
                          ? 'bg-surface border border-zinc-800 shadow-xl' 
                          : 'bg-zinc-900/30 border border-zinc-800/50 border-dashed'
                      }`}
                    >
                      {/* Court Header */}
                      <div className={`px-4 py-2.5 flex justify-between items-center border-b ${
                        match ? 'bg-zinc-800/40 border-zinc-800' : 'bg-transparent border-zinc-800/30'
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${match ? 'bg-primary animate-pulse' : 'bg-zinc-700'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${match ? 'text-primary' : 'text-zinc-600'}`}>
                            Court {courtNum}
                          </span>
                        </div>
                        
                        {isHost && !match && session.status === 'active' && (
                          <button 
                            onClick={() => handleShuffleForCourt(courtNum)}
                            disabled={shuffling || session.players.length < 4}
                            className="flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
                          >
                            {shuffling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Shuffle className="w-3 h-3" />
                            )}
                            <span>Shuffle</span>
                          </button>
                        )}

                        {match && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500/80">
                            In Progress
                          </span>
                        )}
                      </div>

                      {match ? (
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-4 relative">
                            {/* VS Divider Overlay */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                              <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg">
                                <span className="text-[8px] font-black italic text-zinc-500">VS</span>
                              </div>
                            </div>

                            {/* Team 1 */}
                            <div className="space-y-2">
                              <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">Team A</p>
                              <div className="space-y-1.5">
                                {match.team1.map((uid, idx) => (
                                  <button 
                                    key={uid} 
                                    disabled={!isHost}
                                    onClick={() => setSwappingPlayer({ matchId: match.id, team: 1, index: idx, currentUid: uid })}
                                    className={`w-full flex items-center gap-2 bg-zinc-800/30 p-1.5 rounded-xl border border-zinc-800/50 group transition-all text-left ${isHost ? 'hover:bg-zinc-800/60 hover:border-primary/30 cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shadow-inner shrink-0">
                                      {players[uid]?.photoURL ? (
                                        <img src={players[uid].photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <User className="w-3.5 h-3.5 text-zinc-600" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex items-center gap-1">
                                      <p className="text-[10px] font-bold text-white truncate">{players[uid]?.displayName || 'Unknown'}</p>
                                      {isHost && (
                                        <div className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 transition-all ml-auto">
                                          <Shuffle className="w-2.5 h-2.5" />
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Team 2 */}
                            <div className="space-y-2 text-right">
                              <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">Team B</p>
                              <div className="space-y-1.5">
                                {match.team2.map((uid, idx) => (
                                  <button 
                                    key={uid} 
                                    disabled={!isHost}
                                    onClick={() => setSwappingPlayer({ matchId: match.id, team: 2, index: idx, currentUid: uid })}
                                    className={`w-full flex items-center gap-2 flex-row-reverse bg-zinc-800/30 p-1.5 rounded-xl border border-zinc-800/50 group transition-all text-left ${isHost ? 'hover:bg-zinc-800/60 hover:border-primary/30 cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shadow-inner shrink-0">
                                      {players[uid]?.photoURL ? (
                                        <img src={players[uid].photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <User className="w-3.5 h-3.5 text-zinc-600" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex items-center justify-end gap-1">
                                      {isHost && (
                                        <div className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 transition-all mr-auto">
                                          <Shuffle className="w-2.5 h-2.5" />
                                        </div>
                                      )}
                                      <p className="text-[10px] font-bold text-white truncate">{players[uid]?.displayName || 'Unknown'}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Resolution Controls for Host */}
                          {isHost && (
                            <div className="flex gap-2.5 mt-5 pt-4 border-t border-zinc-800/50">
                              <button 
                                onClick={() => handleResolveMatch(match.id, 1)}
                                className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 border border-emerald-500/20"
                              >
                                Team A Won
                              </button>
                              <button 
                                onClick={() => handleResolveMatch(match.id, 2)}
                                className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 border border-emerald-500/20"
                              >
                                Team B Won
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 flex flex-col items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-zinc-800/30 flex items-center justify-center mb-2 border border-zinc-800/50">
                            <Shuffle className="w-4 h-4 text-zinc-700" />
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700">Waiting for shuffle</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

          {/* Match History */}
          {activeTab === 'history' && (
            <div className="pt-2">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Match History</span>
            </h2>
            <div className="space-y-2.5">
              {matches.filter(m => m.status === 'completed').length === 0 ? (
                <div className="text-center py-6 text-zinc-600 text-xs italic">
                  No completed matches yet.
                </div>
              ) : (
                matches
                  .filter(m => m.status === 'completed')
                  .map(match => (
                    <div key={match.id} className="bg-surface/50 border border-zinc-800/50 rounded-2xl p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex -space-x-1.5">
                          {match.team1.map(uid => (
                            <div key={uid} className={`w-7 h-7 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center overflow-hidden ${match.winner === 1 ? 'ring-2 ring-emerald-500/50' : ''}`}>
                              {players[uid]?.photoURL ? (
                                <img src={players[uid].photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-zinc-600" />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="text-[8px] font-black text-zinc-600 italic">VS</div>
                        <div className="flex -space-x-1.5">
                          {match.team2.map(uid => (
                            <div key={uid} className={`w-7 h-7 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center overflow-hidden ${match.winner === 2 ? 'ring-2 ring-emerald-500/50' : ''}`}>
                              {players[uid]?.photoURL ? (
                                <img src={players[uid].photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-zinc-600" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {match.winner === 1 ? 'Team A' : 'Team B'} Won
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
        </div>
      )}

      {activeTab === 'courts' && session.status === 'waiting' && (
        <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-3xl">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-bold text-zinc-400">Session Not Started</h3>
          <p className="text-zinc-500 text-sm mt-2">Live courts will appear here once the session starts.</p>
        </div>
      )}

      {activeTab === 'history' && session.status === 'waiting' && (
        <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-3xl">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-bold text-zinc-400">No History Yet</h3>
          <p className="text-zinc-500 text-sm mt-2">Match results will be recorded here.</p>
        </div>
      )}

      {/* Sticky Start Session Button */}
      {isHost && session.status === 'waiting' && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40 flex justify-center pointer-events-none">
          <div className="max-w-md w-full pointer-events-auto">
            <button 
              onClick={onStartClick}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Session</span>
            </button>
          </div>
        </div>
      )}
      {/* Swap Player Modal */}
      <AnimatePresence>
        {swappingPlayer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Swap Player</h3>
                <button onClick={() => setSwappingPlayer(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              
              <p className="text-xs text-zinc-500 mb-4 uppercase font-black tracking-widest">Select replacement for {players[swappingPlayer.currentUid]?.displayName}</p>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {(() => {
                  const currentlyPlayingUids = new Set<string>();
                  matches.filter(m => m.status === 'pending').forEach(m => {
                    m.team1.forEach(uid => currentlyPlayingUids.add(uid));
                    m.team2.forEach(uid => currentlyPlayingUids.add(uid));
                  });

                  const availablePlayers = session.players.filter(uid => !currentlyPlayingUids.has(uid));

                  if (availablePlayers.length === 0) {
                    return (
                      <div className="py-8 text-center">
                        <Users className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                        <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">No players available</p>
                      </div>
                    );
                  }

                  return availablePlayers.map(uid => (
                    <button
                      key={uid}
                      onClick={() => handleSwapPlayer(uid)}
                      className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-2xl transition-all text-left group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shadow-inner shrink-0">
                        {players[uid]?.photoURL ? (
                          <img src={players[uid].photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-4 h-4 text-zinc-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{players[uid]?.displayName}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{playCounts[uid] || 0} Games played</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                    </button>
                  ));
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 40, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 w-full max-w-sm relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              {/* Decorative Background Elements */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12 shadow-xl border border-primary/30">
                  <Trophy className="w-10 h-10 text-primary -rotate-12" />
                </div>
                
                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Session Ended!</h2>
                <p className="text-zinc-500 text-sm font-medium mb-10 uppercase tracking-[0.2em]">Top Performers</p>
                
                <div className="space-y-4 mb-10">
                  {sessionSummary.slice(0, 3).map((item, index) => (
                    <motion.div 
                      key={item.uid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className={`flex items-center gap-4 p-4 rounded-3xl border transition-all ${
                        index === 0 
                          ? 'bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]' 
                          : 'bg-zinc-800/30 border-zinc-800/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                        index === 0 ? 'bg-primary text-white shadow-lg' : 
                        index === 1 ? 'bg-zinc-700 text-zinc-300' : 
                        'bg-zinc-800 text-zinc-500'
                      }`}>
                        {index + 1}
                      </div>
                      
                      <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shrink-0">
                        {players[item.uid]?.photoURL ? (
                          <img src={players[item.uid].photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-white truncate">{players[item.uid]?.displayName || 'Unknown'}</p>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.wins} Wins • {item.matches} Matches</p>
                      </div>
                      
                      {index === 0 && (
                        <div className="text-primary">
                          <Trophy className="w-5 h-5" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setShowSummary(false)}
                  className="w-full py-5 bg-white text-black hover:bg-zinc-200 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl"
                >
                  Close Summary
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
