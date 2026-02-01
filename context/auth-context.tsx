import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AUTH_PHONE_STORAGE_KEY = 'tripplanner:auth:phone';

interface AuthContextValue {
  phoneNumber: string | null;
  isLoading: boolean;
  signIn: (phoneNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizePhoneNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasLeadingPlus ? `+${digits}` : digits;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_PHONE_STORAGE_KEY);
        if (cancelled) return;
        setPhoneNumber(stored ? stored : null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const signIn: AuthContextValue['signIn'] = async (rawPhone) => {
      const normalized = normalizePhoneNumber(rawPhone);
      await AsyncStorage.setItem(AUTH_PHONE_STORAGE_KEY, normalized);
      setPhoneNumber(normalized);
    };

    const signOut: AuthContextValue['signOut'] = async () => {
      await AsyncStorage.removeItem(AUTH_PHONE_STORAGE_KEY);
      setPhoneNumber(null);
    };

    return {
      phoneNumber,
      isLoading,
      signIn,
      signOut,
    };
  }, [isLoading, phoneNumber]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
