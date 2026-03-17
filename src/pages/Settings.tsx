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

  const winRate = userData?.matchesPlayed ? Math.round((userData.wins / userData.matchesPlayed) * 100) : 0;

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
    <div className="flex-1 flex flex-col bg-zinc-50/50">
      <div className="px-6 py-8 space-y-8">
        {/* User Summary */}
        <div className="glass-card rounded-[3rem] p-8 flex flex-col items-center text-center shadow-2xl soft-glow">
          <div className="relative mb-6">
            {userData?.photoURL ? (
              <img 
                src={userData.photoURL} 
                alt={userData.displayName || ''} 
                className="w-28 h-28 rounded-[2rem] object-cover border-4 border-white shadow-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-28 h-28 rounded-[2rem] bg-zinc-100 flex items-center justify-center border-4 border-white shadow-2xl">
                <UserIcon className="w-12 h-12 text-zinc-300" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 mb-1 tracking-tight">{userData?.displayName || 'User'}</h1>
          <p className="text-zinc-800 text-[10px] font-black uppercase tracking-[0.2em]">{userData?.email}</p>
          
          <div className="mt-8 grid grid-cols-3 gap-4 w-full border-t border-zinc-100 pt-8">
            <div>
              <p className="text-[10px] text-zinc-800 font-black uppercase tracking-widest mb-1.5">Elo</p>
              <p className="text-xl font-black text-zinc-900 tracking-tighter">{userData?.elo || 1200}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-800 font-black uppercase tracking-widest mb-1.5">Matches</p>
              <p className="text-xl font-black text-zinc-900 tracking-tighter">{userData?.matchesPlayed || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-800 font-black uppercase tracking-widest mb-1.5">Win Rate</p>
              <p className="text-xl font-black text-emerald-500 tracking-tighter">{winRate}%</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.3em] ml-6 mb-4">General Settings</p>
          
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="w-full flex items-center justify-between p-6 bg-white border border-zinc-100 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                <Edit2 className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="text-base font-black text-zinc-900 tracking-tight">Edit Profile</p>
                <p className="text-[10px] text-zinc-800 font-bold uppercase tracking-wider">Name and avatar</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-800 transition-colors" />
          </button>

          <button 
            onClick={() => setIsEditingAccount(true)}
            className="w-full flex items-center justify-between p-6 bg-white border border-zinc-100 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100">
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-left">
                <p className="text-base font-black text-zinc-900 tracking-tight">Account Security</p>
                <p className="text-[10px] text-zinc-800 font-bold uppercase tracking-wider">Email and password</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-800 transition-colors" />
          </button>

          <button 
            onClick={() => setShowRules(true)}
            className="w-full flex items-center justify-between p-6 bg-white border border-zinc-100 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                <Info className="w-6 h-6 text-amber-500" />
              </div>
              <div className="text-left">
                <p className="text-base font-black text-zinc-900 tracking-tight">Rules & Scoring</p>
                <p className="text-[10px] text-zinc-800 font-bold uppercase tracking-wider">How Elo is calculated</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-800 transition-colors" />
          </button>

          <div className="pt-6">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-5 p-6 bg-red-50 border border-red-100 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center border border-red-200">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-left">
                <p className="text-base font-black text-red-500 tracking-tight">Log Out</p>
                <p className="text-[10px] text-red-700 font-bold uppercase tracking-wider">Sign out of your account</p>
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl soft-glow"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Edit Profile</h2>
                <button onClick={() => setIsEditingProfile(false)} className="p-2.5 hover:bg-zinc-100 rounded-2xl text-zinc-800 transition-all active:scale-90">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    {editPhoto ? (
                      <img src={editPhoto} alt="Preview" className="w-28 h-28 rounded-[2rem] object-cover border-4 border-zinc-100 shadow-xl" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-28 h-28 rounded-[2rem] bg-zinc-50 flex items-center justify-center border-4 border-zinc-100 shadow-xl">
                        <UserIcon className="w-12 h-12 text-zinc-200" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-3 bg-primary text-white rounded-2xl shadow-lg hover:brightness-110 transition-all active:scale-90"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-800 uppercase font-black tracking-[0.2em]">Change Avatar</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-800 uppercase font-black tracking-widest ml-4">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.5rem] px-6 py-4 text-sm text-zinc-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-5 bg-primary hover:brightness-110 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-primary/30 active:scale-95"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Save Changes</>}
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl soft-glow"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Security</h2>
                <button onClick={() => setIsEditingAccount(false)} className="p-2.5 hover:bg-zinc-100 rounded-2xl text-zinc-800 transition-all active:scale-90">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                <form onSubmit={handleUpdateEmail} className="space-y-4">
                  <label className="text-[10px] text-zinc-800 uppercase font-black tracking-widest ml-4">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="New email address"
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.5rem] pl-14 pr-6 py-4 text-sm text-zinc-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updatingEmail || newEmail === user?.email}
                    className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-800 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    {updatingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Email"}
                  </button>
                </form>

                <div className="h-px bg-zinc-100" />

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <label className="text-[10px] text-zinc-800 uppercase font-black tracking-widest ml-4">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-800" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.5rem] pl-14 pr-6 py-4 text-sm text-zinc-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updatingPassword || !newPassword}
                    className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-800 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    {updatingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl max-h-[80vh] overflow-y-auto soft-glow"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Rules & Scoring</h2>
                <button onClick={() => setShowRules(false)} className="p-2.5 hover:bg-zinc-100 rounded-2xl text-zinc-800 transition-all active:scale-90">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8 text-sm text-zinc-800">
                <section className="space-y-3">
                  <h3 className="text-zinc-900 font-black uppercase tracking-[0.2em] text-[10px]">Elo System</h3>
                  <p className="leading-relaxed font-medium">Rival uses the Elo rating system to calculate player skill levels. Every player starts with 1200 points.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-zinc-900 font-black uppercase tracking-[0.2em] text-[10px]">Winning & Losing</h3>
                  <ul className="space-y-3 font-medium">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Win against a higher-rated opponent: Large Elo gain.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Win against a lower-rated opponent: Small Elo gain.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Lose to a higher-rated opponent: Small Elo loss.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      <span>Lose to a lower-rated opponent: Large Elo loss.</span>
                    </li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-zinc-900 font-black uppercase tracking-[0.2em] text-[10px]">Fair Play</h3>
                  <p className="leading-relaxed font-medium">Matches must be recorded accurately. Intentional misreporting of scores may result in leaderboard disqualification.</p>
                </section>

                <button
                  onClick={() => setShowRules(false)}
                  className="w-full mt-4 py-5 bg-zinc-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-zinc-900/20"
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
