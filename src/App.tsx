import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, logout } from './lib/firebase';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import AnamnesisForm from './components/AnamnesisForm';
import { UserProfile } from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAnamnesisComplete = async (newProfile: UserProfile) => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      setProfile(newProfile);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <Loader2 className="w-8 h-8 animate-spin text-accent-app" />
      </div>
    );
  }

  if (!firebaseUser) {
    return <LandingPage />;
  }

  if (!profile) {
    return <AnamnesisForm user={firebaseUser} onComplete={handleAnamnesisComplete} />;
  }

  return <Dashboard profile={profile} logout={logout} />;
}
