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
import Logo from '@/components/Logo';

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
          <Logo imgClassName="w-10 h-10 rounded-xl object-contain border border-white/20 shadow-xs shrink-0 p-0.5 bg-white/10" />

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
