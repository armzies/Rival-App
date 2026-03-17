import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, Clock, Users, Calendar as CalendarIcon, ArrowLeft, Loader2, Type } from 'lucide-react';
import { motion } from 'motion/react';

export default function CreateSession() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('16');
  const [courts, setCourts] = useState('2');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name) return;

    setLoading(true);
    try {
      // Combine date and time if provided
      let startDateTime = null;
      let endDateTime = null;
      if (date && startTime) {
        startDateTime = new Date(`${date}T${startTime}`);
      }
      if (date && endTime) {
        endDateTime = new Date(`${date}T${endTime}`);
      }

      const sessionData = {
        name,
        hostId: user.uid,
        location: location || null,
        startTime: startDateTime,
        endTime: endDateTime,
        maxPlayers: maxPlayers ? Number(maxPlayers) : null,
        courts: courts ? Number(courts) : null,
        status: 'waiting',
        players: [user.uid], // Host automatically joins
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'sessions'), sessionData);
      toast.success("Session created successfully!");
      navigate(`/sessions/${docRef.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-8 w-full pb-32">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-800 hover:text-zinc-900 mb-8 transition-all active:scale-95 group"
      >
        <div className="p-2 rounded-xl bg-zinc-100 group-hover:bg-zinc-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm font-black uppercase tracking-widest">Back</span>
      </button>

      <div className="mb-10">
        <h1 className="text-4xl font-black text-zinc-900 tracking-tighter">Create Session</h1>
        <p className="text-zinc-800 font-bold text-sm mt-2">Set up a new badminton group</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="glass-card rounded-[2.5rem] p-8 space-y-6 shadow-2xl soft-glow">
          
          {/* Name (Mandatory) */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800 mb-3 ml-1">Session Name <span className="text-primary">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Type className="h-5 w-5 text-zinc-800" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-bold text-zinc-900 placeholder-zinc-500"
                placeholder="e.g. Sunday Morning Smash"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800 mb-3 ml-1">Location <span className="text-zinc-600">(Optional)</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-zinc-800" />
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-bold text-zinc-900 placeholder-zinc-500"
                placeholder="e.g. Central Badminton Court"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800 mb-3 ml-1">Date <span className="text-zinc-600">(Optional)</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-zinc-800" />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-bold text-zinc-900"
              />
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800 mb-3 ml-1">Start Time</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-zinc-800" />
                </div>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-bold text-zinc-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800 mb-3 ml-1">End Time</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-zinc-800" />
                </div>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-bold text-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800 mb-3 ml-1">Max Players</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-zinc-800" />
                </div>
                <input
                  type="number"
                  min="4"
                  max="100"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-bold text-zinc-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-800 mb-3 ml-1">Courts</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-zinc-800" />
                </div>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={courts}
                  onChange={(e) => setCourts(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm font-bold text-zinc-900"
                />
              </div>
            </div>
          </div>

        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center py-5 px-6 rounded-[2rem] shadow-2xl shadow-primary/30 text-sm font-black uppercase tracking-[0.2em] text-white bg-primary hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            'Create Session'
          )}
        </motion.button>
      </form>
    </div>
  );
}
