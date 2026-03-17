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
    <div className="max-w-md mx-auto px-4 py-6 w-full pb-24">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-zinc-400 hover:text-white mb-4 transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Session</h1>
        <p className="text-zinc-500 text-xs mt-0.5">Set up a new badminton group</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-surface border border-zinc-800 rounded-3xl p-5 space-y-4">
          
          {/* Name (Mandatory) */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Session Name <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Type className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-white placeholder-zinc-600"
                placeholder="e.g. Sunday Morning Smash"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Location <span className="text-zinc-700">(Optional)</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-white placeholder-zinc-600"
                placeholder="e.g. Central Badminton Court"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Date <span className="text-zinc-700">(Optional)</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <CalendarIcon className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-white"
              />
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Start Time</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Clock className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">End Time</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Clock className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Max Players</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Users className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="number"
                  min="4"
                  max="100"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Courts</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={courts}
                  onChange={(e) => setCourts(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm text-white"
                />
              </div>
            </div>
          </div>

        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-zinc-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Create Session'
          )}
        </motion.button>
      </form>
    </div>
  );
}
