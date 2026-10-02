'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface StoreItem {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'viewer';
  isOwner: boolean;
  walletCount: number;
  joinedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string | null;
  avatarUrl: string;
  hasUsername: boolean;
}

interface StoreContextType {
  user: UserProfile | null;
  stores: StoreItem[];
  currentStore: StoreItem | null;
  currentStoreId: string | null;
  setCurrentStoreId: (id: string) => void;
  isLoading: boolean;
  isOffline: boolean;
  refreshStores: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      const isLocalhost = Boolean(
        window.location.hostname === 'localhost' ||
        window.location.hostname === '[::1]' ||
        window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
      );

      if (process.env.NODE_ENV === 'production' && !isLocalhost) {
        navigator.serviceWorker
          .register('/sw.js')
          .then(() => console.log('Service Worker registered'))
          .catch((err) => console.warn('Service Worker registration failed:', err));
      } else {
        // Automatically cleanup any leftover service workers and CacheStorage on dev/localhost
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        if ('caches' in window) {
          caches.keys().then((keys) => {
            for (const key of keys) {
              caches.delete(key);
            }
          });
        }
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status === 401) {
        setUser(null);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores || []);

        const savedId = localStorage.getItem('ticco_current_store_id');
        const matched = data.stores?.find((s: StoreItem) => s.id === savedId);
        if (matched) {
          setCurrentStoreIdState(matched.id);
        } else if (data.stores?.length > 0) {
          setCurrentStoreIdState(data.stores[0].id);
          localStorage.setItem('ticco_current_store_id', data.stores[0].id);
        } else {
          setCurrentStoreIdState(null);
        }
      }
    } catch {
      // Offline fallback
    }
  }, []);

  const setCurrentStoreId = (id: string) => {
    setCurrentStoreIdState(id);
    localStorage.setItem('ticco_current_store_id', id);
  };

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await fetchUser();
      await fetchStores();
      setIsLoading(false);
    }
    init();
  }, [fetchUser, fetchStores]);

  const currentStore = stores.find((s) => s.id === currentStoreId) || null;

  return (
    <StoreContext.Provider
      value={{
        user,
        stores,
        currentStore,
        currentStoreId,
        setCurrentStoreId,
        isLoading,
        isOffline,
        refreshStores: fetchStores,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
