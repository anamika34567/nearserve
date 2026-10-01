import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from '../node_modules/@firebase/auth/dist/esm2017/index.js';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeProfile();
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      unsubscribeProfile = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (profileSnapshot) => {
          setUserProfile(profileSnapshot.exists()
            ? { id: profileSnapshot.id, ...profileSnapshot.data() }
            : null);
          setLoading(false);
        },
        (error) => {
          console.log('Profile listener error:', error);
          setUserProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  const logout = async () => {
    try {
      const { logoutUser } = require('../services/authService');
      await logoutUser();
    } catch (e) {
      console.log('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, setUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
