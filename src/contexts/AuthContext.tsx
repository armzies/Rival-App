import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { toast } from 'sonner';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateEmailAddress: (newEmail: string) => Promise<void>;
  updatePasswordValue: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        
        // Ensure document exists
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            elo: 1200,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            createdAt: serverTimestamp()
          });
        }

        // Listen to real-time updates
        unsubscribeFirestore = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          }
        });
      } else {
        setUserData(null);
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Welcome back!");
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      toast.error(error.message || "Failed to sign in. Please try again.");
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      
      // Create user document immediately to avoid race conditions
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        uid: userCredential.user.uid,
        email: email,
        displayName: displayName,
        photoURL: null,
        elo: 1200,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        createdAt: serverTimestamp()
      });

      toast.success("Account created successfully!");
    } catch (error: any) {
      console.error("Error signing up with email", error);
      toast.error(error.message || "Failed to create account.");
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back!");
    } catch (error: any) {
      console.error("Error signing in with email", error);
      if (error.code === 'auth/invalid-credential') {
        toast.error("Invalid email or password. If you haven't created an account yet, please click 'Sign Up' below.");
      } else if (error.code === 'auth/user-not-found') {
        toast.error("No account found with this email. Please Sign Up first.");
      } else if (error.code === 'auth/wrong-password') {
        toast.error("Incorrect password. Please try again or reset your password.");
      } else {
        toast.error(error.message || "Invalid email or password.");
      }
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      console.error("Error sending reset email", error);
      toast.error(error.message || "Failed to send reset email.");
    }
  };

  const updateEmailAddress = async (newEmail: string) => {
    if (!auth.currentUser) return;
    try {
      await updateEmail(auth.currentUser, newEmail);
      // Update Firestore too
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { email: newEmail });
      toast.success("Email updated successfully!");
    } catch (error: any) {
      console.error("Error updating email", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Please log out and log back in to update your email.");
      } else {
        toast.error(error.message || "Failed to update email.");
      }
    }
  };

  const updatePasswordValue = async (newPassword: string) => {
    if (!auth.currentUser) return;
    try {
      await updatePassword(auth.currentUser, newPassword);
      toast.success("Password updated successfully!");
    } catch (error: any) {
      console.error("Error updating password", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Please log out and log back in to update your password.");
      } else {
        toast.error(error.message || "Failed to update password.");
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Error signing out", error);
      toast.error("Failed to log out.");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      loginWithGoogle, 
      signUpWithEmail,
      loginWithEmail,
      resetPassword,
      updateEmailAddress,
      updatePasswordValue,
      logout 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

