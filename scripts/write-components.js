const fs = require('fs');
const path = require('path');

function writeFile(filePath, content) {
  const fullPath = path.join(__dirname, '..', filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`Wrote: ${filePath} (${fs.statSync(fullPath).size} bytes)`);
}

// 1. src/context/StoreContext.tsx
writeFile('src/context/StoreContext.tsx', `
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

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch((err) => console.warn('Service Worker registration failed:', err));
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
      // Offline
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
      // Offline
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
`);

// 2. src/components/OfflineBanner.tsx
writeFile('src/components/OfflineBanner.tsx', `
'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function OfflineBanner() {
  const { isOffline } = useStore();

  if (!isOffline) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-sm sticky top-0 z-50 animate-pulse">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        <strong>Mode Baca Saja (Offline):</strong> Koneksi internet terputus. Fitur pencatatan dan mutasi saldo dinonaktifkan untuk menjaga konsistensi data.
      </span>
    </div>
  );
}
`);

// 3. src/components/OnboardingModal.tsx
writeFile('src/components/OnboardingModal.tsx', `
'use client';

import React, { useState } from 'react';
import { UserCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function OnboardingModal() {
  const { user, refreshUser } = useStore();
  const [username, setUsername] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || user.hasUsername) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Username wajib diisi.');
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username harus 3-20 karakter, hanya huruf, angka, dan underscore (_).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          name: name.trim() || user.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal menyimpan username.');
        return;
      }

      await refreshUser();
    } catch {
      setError('Terjadi kendala jaringan. Coba lagi beberapa saat lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full mb-4 mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-center text-slate-800">
          Selamat Datang di Ticco!
        </h2>
        <p className="text-sm text-slate-600 text-center mt-1 mb-6">
          Untuk menghubungkan Anda dengan toko keluarga atau menerima undangan, silakan tentukan <strong>username unik</strong> Anda.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Anda"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Pilih Username <span className="text-emerald-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="contoh: budi_santoso"
                maxLength={20}
                required
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              3–20 karakter, huruf kecil, angka, dan tanda garis bawah.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium text-sm transition shadow-sm flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            {isSubmitting ? 'Menyimpan...' : 'Selesaikan Profil & Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
`);

// 4. src/components/Header.tsx
writeFile('src/components/Header.tsx', `
'use client';

import React, { useState } from 'react';
import {
  Store as StoreIcon,
  ChevronDown,
  Plus,
  LogOut,
  Shield,
  Eye,
  User,
  Check,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface HeaderProps {
  onOpenCreateStore: () => void;
}

export default function Header({ onOpenCreateStore }: HeaderProps) {
  const { user, stores, currentStore, setCurrentStoreId } = useStore();
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <Shield className="w-3 h-3" /> Owner
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Shield className="w-3 h-3" /> Admin
          </span>
        );
      case 'viewer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Eye className="w-3 h-3" /> Viewer
          </span>
        );
      default:
        return null;
    }
  };

  const handleLogout = async () => {
    window.location.href = '/api/auth/signout';
  };

  return (
    <header className="bg-emerald-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
            <span className="font-bold text-lg text-emerald-200">T</span>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setIsStoreDropdownOpen(!isStoreDropdownOpen);
                setIsProfileDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900/90 border border-emerald-700/50 text-left transition max-w-[220px] sm:max-w-xs"
            >
              <StoreIcon className="w-4 h-4 text-emerald-300 shrink-0" />
              <div className="truncate">
                <p className="text-xs text-emerald-200/80 font-medium leading-none">Unit Usaha</p>
                <p className="text-sm font-semibold truncate leading-tight">
                  {currentStore ? currentStore.name : 'Pilih Toko...'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-300 shrink-0 ml-1" />
            </button>

            {isStoreDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStoreDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 text-slate-800">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Daftar Toko Saya ({stores.length})
                    </p>
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {stores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => {
                          setCurrentStoreId(store.id);
                          setIsStoreDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition text-sm ${
                          store.id === currentStore?.id ? 'bg-emerald-50/60 text-emerald-900 font-semibold' : ''
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate">{store.name}</p>
                          <p className="text-xs text-slate-500">
                            {store.walletCount} dompet kas
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {getRoleBadge(store.role)}
                          {store.id === currentStore?.id && (
                            <Check className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                      </button>
                    ))}

                    {stores.length === 0 && (
                      <p className="px-4 py-3 text-xs text-slate-500 text-center">
                        Belum ada toko yang terdaftar.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1 px-2">
                    <button
                      onClick={() => {
                        setIsStoreDropdownOpen(false);
                        onOpenCreateStore();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-700 font-medium hover:bg-emerald-50 rounded-xl transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Toko Baru</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {currentStore && (
            <div className="hidden sm:block">
              {getRoleBadge(currentStore.role)}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => {
                setIsProfileDropdownOpen(!isProfileDropdownOpen);
                setIsStoreDropdownOpen(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/10 transition"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 border border-emerald-400/50 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                {user?.name ? user.name[0].toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="hidden md:block text-left text-xs">
                <p className="font-semibold text-white leading-none">{user?.name || 'Pengguna'}</p>
                <p className="text-emerald-300 font-mono text-[11px] leading-tight mt-0.5">
                  @{user?.username || 'user'}
                </p>
              </div>
            </button>

            {isProfileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 text-slate-800">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                    <p className="text-xs text-slate-500 font-mono">@{user?.username}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar Aplikasi</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
`);

// 5. src/components/Navigation.tsx
writeFile('src/components/Navigation.tsx', `
'use client';

import React from 'react';
import {
  LayoutDashboard,
  Coins,
  Receipt,
  Settings,
  FileCheck,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'capital' | 'payroll' | 'my-payslips' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  hasLinkedStaff?: boolean;
}

export default function Navigation({
  activeTab,
  setActiveTab,
  hasLinkedStaff = false,
}: NavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Arus Kas', icon: LayoutDashboard },
    { id: 'capital', label: 'Modal', icon: Coins },
    { id: 'payroll', label: 'Gaji & Staf', icon: Receipt },
    ...(hasLinkedStaff
      ? [{ id: 'my-payslips', label: 'Slip Saya', icon: FileCheck }]
      : []),
    { id: 'settings', label: 'Toko', icon: Settings },
  ];

  return (
    <>
      <nav className="hidden sm:flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-xs border border-slate-100 max-w-2xl mx-auto mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={\`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition \${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }\`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={\`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition min-w-[56px] \${
                  isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500 font-medium'
                }\`}
              >
                <div
                  className={\`p-1 rounded-xl transition \${
                    isActive ? 'bg-emerald-100 text-emerald-800' : ''
                  }\`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
`);

console.log('Context and common navigation components written!');
