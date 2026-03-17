import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Settings, 
  Edit2, 
  Mail, 
  Lock, 
  LogOut, 
  ChevronRight, 
  Shield, 
  Info, 
  Camera, 
  X, 
  Check, 
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, userData, logout, updateEmailAddress, updatePasswordValue } = useAuth();
  const navigate = useNavigate();
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [showRules, setShowRules] = useState(false);
  
  const [editName, setEditName] = useState(userData?.displayName || '');
  const [editPhoto, setEditPhoto] = useState<string | null>(userData?.photoURL || null);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  
  const [updating, setUpdating] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Please select an image under 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            setEditPhoto(compressedBase64);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: editName,
        photoURL: editPhoto
      });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: editName
        });
      }

      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === user?.email) return;
    setUpdatingEmail(true);
    try {
      await updateEmailAddress(newEmail);
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setUpdatingPassword(true);
    try {
      await updatePasswordValue(newPassword);
      setNewPassword('');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950">
      <div className="px-4 py-6 space-y-6">
        {/* User Summary */}
        <div className="bg-surface border border-zinc-800 rounded-[2.5rem] p-6 flex flex-col items-center text-center shadow-xl">
          <div className="relative mb-4">
            {userData?.photoURL ? (
              <img 
                src={userData.photoURL} 
                alt={userData.displayName || ''} 
                className="w-24 h-24 rounded-full object-cover border-4 border-zinc-800 shadow-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border-4 border-zinc-800 shadow-2xl">
                <UserIcon className="w-10 h-10 text-zinc-700" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-4 border-zinc-950">
              <Settings className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">{userData?.displayName || 'User'}</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{userData?.email}</p>
          
          <div className="mt-6 grid grid-cols-3 gap-8 w-full border-t border-zinc-800/50 pt-6">
            <div>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Elo</p>
              <p className="text-lg font-black text-white">{userData?.elo || 1200}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Wins</p>
              <p className="text-lg font-black text-emerald-400">{userData?.wins || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Losses</p>
              <p className="text-lg font-black text-red-400">{userData?.losses || 0}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-4 mb-2">General</p>
          
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="w-full flex items-center justify-between p-5 bg-surface/50 border border-zinc-800/50 rounded-3xl hover:bg-zinc-900/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                <Edit2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Edit Profile</p>
                <p className="text-[10px] text-zinc-500 font-medium">Name and avatar</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
          </button>

          <button 
            onClick={() => setIsEditingAccount(true)}
            className="w-full flex items-center justify-between p-5 bg-surface/50 border border-zinc-800/50 rounded-3xl hover:bg-zinc-900/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Account Security</p>
                <p className="text-[10px] text-zinc-500 font-medium">Email and password</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
          </button>

          <button 
            onClick={() => setShowRules(true)}
            className="w-full flex items-center justify-between p-5 bg-surface/50 border border-zinc-800/50 rounded-3xl hover:bg-zinc-900/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                <Info className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Rules & Scoring</p>
                <p className="text-[10px] text-zinc-500 font-medium">How Elo is calculated</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
          </button>

          <div className="pt-4">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-5 bg-red-500/5 border border-red-500/10 rounded-3xl hover:bg-red-500/10 transition-all group"
            >
              <div className="w-10 h-10 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-red-400">Log Out</p>
                <p className="text-[10px] text-red-500/50 font-medium">Sign out of your account</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
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
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Edit Profile</h2>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    {editPhoto ? (
                      <img src={editPhoto} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-zinc-800" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center border-4 border-zinc-800">
                        <UserIcon className="w-10 h-10 text-zinc-600" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-primary-hover transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Change Photo</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save Changes</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Security Modal */}
      <AnimatePresence>
        {isEditingAccount && (
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
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Security</h2>
                <button onClick={() => setIsEditingAccount(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                <form onSubmit={handleUpdateEmail} className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="New email address"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updatingEmail || newEmail === user?.email}
                    className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    {updatingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Email"}
                  </button>
                </form>

                <div className="h-px bg-zinc-800" />

                <form onSubmit={handleUpdatePassword} className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updatingPassword || !newPassword}
                    className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    {updatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
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
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Rules & Scoring</h2>
                <button onClick={() => setShowRules(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 text-sm text-zinc-400">
                <section className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-widest text-[10px]">Elo System</h3>
                  <p>Rival uses the Elo rating system to calculate player skill levels. Every player starts with 1200 points.</p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-widest text-[10px]">Winning & Losing</h3>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Win against a higher-rated opponent: Large Elo gain.</li>
                    <li>Win against a lower-rated opponent: Small Elo gain.</li>
                    <li>Lose to a higher-rated opponent: Small Elo loss.</li>
                    <li>Lose to a lower-rated opponent: Large Elo loss.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-white font-bold uppercase tracking-widest text-[10px]">Fair Play</h3>
                  <p>Matches must be recorded accurately. Intentional misreporting of scores may result in leaderboard disqualification.</p>
                </section>

                <button
                  onClick={() => setShowRules(false)}
                  className="w-full mt-4 py-4 bg-zinc-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
