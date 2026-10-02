'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Store,
  Users,
  Wallet,
  Shield,
  Trash2,
  Edit2,
  Plus,
  LogOut,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  Archive,
  ArchiveRestore,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useStore } from '@/context/StoreContext';
import InviteMemberModal from '@/components/modals/InviteMemberModal';
import CreateWalletModal from '@/components/modals/CreateWalletModal';

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'viewer';
  joinedAt: string;
}

interface WalletItem {
  id: string;
  name: string;
  balance: number;
  isArchived: boolean;
}

export default function SettingsTab() {
  const { currentStore, user, isOffline, refreshStores } = useStore();

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingWallets, setIsLoadingWallets] = useState(false);

  // Store Rename state
  const [isEditingStoreName, setIsEditingStoreName] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [isSavingStoreName, setIsSavingStoreName] = useState(false);
  const [storeNameMsg, setStoreNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Store Delete state
  const [isConfirmingDeleteStore, setIsConfirmingDeleteStore] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingStore, setIsDeletingStore] = useState(false);

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const isOwner = currentStore?.role === 'owner';
  const isAdminOrOwner = currentStore?.role === 'owner' || currentStore?.role === 'admin';

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const fetchMembers = useCallback(async () => {
    if (!currentStore) return;
    try {
      setIsLoadingMembers(true);
      const res = await fetch(`/api/stores/${currentStore.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // offline
    } finally {
      setIsLoadingMembers(false);
    }
  }, [currentStore]);

  const fetchWallets = useCallback(async () => {
    if (!currentStore) return;
    try {
      setIsLoadingWallets(true);
      const res = await fetch(`/api/stores/${currentStore.id}/wallets?includeArchived=true`);
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets || []);
      }
    } catch {
      // offline
    } finally {
      setIsLoadingWallets(false);
    }
  }, [currentStore]);

  useEffect(() => {
    if (currentStore) {
      setNewStoreName(currentStore.name);
      fetchMembers();
      fetchWallets();
    }
  }, [currentStore, fetchMembers, fetchWallets]);

  // Rename store handler
  const handleUpdateStoreName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !isOwner) return;

    const trimmed = newStoreName.trim();
    if (!trimmed || trimmed.length < 2) {
      setStoreNameMsg({ type: 'error', text: 'Nama toko minimal 2 karakter.' });
      return;
    }

    try {
      setIsSavingStoreName(true);
      setStoreNameMsg(null);
      const res = await fetch(`/api/stores/${currentStore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStoreNameMsg({ type: 'error', text: data.message || 'Gagal mengubah nama toko.' });
        return;
      }

      setStoreNameMsg({ type: 'success', text: 'Nama unit bisnis berhasil diperbarui.' });
      setIsEditingStoreName(false);
      await refreshStores();
    } catch {
      setStoreNameMsg({ type: 'error', text: 'Terjadi kendala jaringan.' });
    } finally {
      setIsSavingStoreName(false);
    }
  };

  // Delete store handler
  const handleDeleteStore = async () => {
    if (!currentStore || !isOwner) return;
    if (deleteConfirmText.trim() !== currentStore.name) {
      alert(`Ketik "${currentStore.name}" secara persis untuk konfirmasi.`);
      return;
    }

    try {
      setIsDeletingStore(true);
      const res = await fetch(`/api/stores/${currentStore.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        localStorage.removeItem('ticco_current_store_id');
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.message || 'Gagal menghapus toko.');
      }
    } catch {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsDeletingStore(false);
    }
  };

  // Remove member handler
  const handleRemoveMember = async (memberId: string, memberUsername: string) => {
    if (!currentStore || !isOwner) return;
    if (!confirm(`Hapus akses @${memberUsername} dari unit bisnis ini?`)) return;

    try {
      const res = await fetch(`/api/stores/${currentStore.id}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMembers();
      } else {
        const data = await res.json();
        alert(data.message || 'Gagal menghapus anggota.');
      }
    } catch {
      alert('Terjadi kesalahan jaringan.');
    }
  };

  // Toggle archive wallet
  const handleToggleArchiveWallet = async (walletId: string, currentArchived: boolean) => {
    if (!currentStore || !isAdminOrOwner) return;
    try {
      const res = await fetch(`/api/stores/${currentStore.id}/wallets/${walletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !currentArchived }),
      });
      if (res.ok) {
        fetchWallets();
      }
    } catch {
      alert('Gagal mengubah status dompet.');
    }
  };

  if (!currentStore) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 max-w-md mx-auto">
        <Store className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Pilih atau buat unit bisnis terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Pengaturan & Akses Unit Bisnis</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Pengaturan & Akses Toko
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola identitas unit bisnis, hak akses anggota tim, dan konfigurasi dompet kas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Shield className="w-3.5 h-3.5" />
            Peran Anda: {currentStore.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Store Profile & User Profile */}
        <div className="space-y-6">
          {/* Store Profile Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Profil Unit Bisnis</h3>
              </div>
              {isOwner && !isEditingStoreName && (
                <button
                  onClick={() => setIsEditingStoreName(true)}
                  disabled={isOffline}
                  className="text-slate-400 hover:text-emerald-600 p-1 rounded-lg transition disabled:opacity-50"
                  title="Ubah Nama Toko"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {storeNameMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  storeNameMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {storeNameMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{storeNameMsg.text}</span>
              </div>
            )}

            {isEditingStoreName ? (
              <form onSubmit={handleUpdateStoreName} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nama Unit Toko
                  </label>
                  <input
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSavingStoreName}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {isSavingStoreName ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingStoreName(false);
                      setNewStoreName(currentStore.name);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Nama Resmi Toko
                </span>
                <p className="text-base font-black text-slate-900">{currentStore.name}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  ID: <span className="font-mono text-[10px]">{currentStore.id}</span>
                </p>
              </div>
            )}

            {/* Owner Store Danger Zone */}
            {isOwner && (
              <div className="pt-4 border-t border-red-100">
                {!isConfirmingDeleteStore ? (
                  <button
                    onClick={() => setIsConfirmingDeleteStore(true)}
                    disabled={isOffline}
                    className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Unit Bisnis Ini</span>
                  </button>
                ) : (
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-200 space-y-3">
                    <div className="flex items-start gap-2 text-red-800 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                      <span>
                        Tindakan ini permanen. Seluruh data transaksi, mutasi dompet, dan rekaman gaji toko ini akan dihapus.
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] text-red-700 mb-1">
                        Ketik <strong>{currentStore.name}</strong> untuk konfirmasi:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={currentStore.name}
                        className="w-full px-3 py-2 bg-white border border-red-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDeleteStore}
                        disabled={isDeletingStore || deleteConfirmText.trim() !== currentStore.name}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-40"
                      >
                        {isDeletingStore ? 'Menghapus...' : 'Konfirmasi Hapus'}
                      </button>
                      <button
                        onClick={() => {
                          setIsConfirmingDeleteStore(false);
                          setDeleteConfirmText('');
                        }}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile & Account Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Akun Terautentikasi</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Nama Lengkap</span>
                <span className="font-bold text-slate-800 text-sm">{user?.name || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Username Ticco</span>
                <span className="font-mono font-bold text-emerald-700">@{user?.username || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Google</span>
                <span className="text-slate-600">{user?.email || '-'}</span>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Keluar dari Akun (Sign Out)</span>
            </button>
          </div>

          {/* Architecture / Offline Banner Info */}
          <div className="bg-slate-900 text-slate-300 p-5 rounded-3xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Info className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Keamanan & Akses Jaringan
              </h4>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Ticco mengamankan pencatatan finansial secara real-time demi menjaga konsistensi saldo kas bisnis.
            </p>
            <div className="text-[11px] bg-slate-800/80 p-3 rounded-2xl border border-slate-700/50 space-y-1">
              <div className="flex items-center justify-between">
                <span>Status Jaringan:</span>
                <span className={`font-bold ${isOffline ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isOffline ? 'Offline' : 'Online'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mode Proteksi Mutasi:</span>
                <span className="font-bold text-white">Proteksi Saldo Otomatis</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Members Management & Wallets Management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Members Management Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Hak Akses Anggota Toko</h3>
                  <p className="text-[11px] text-slate-400">
                    Store-scoped isolation: Anggota hanya dapat melihat data toko ini.
                  </p>
                </div>
              </div>

              {isOwner && (
                <button
                  onClick={() => setIsInviteOpen(true)}
                  disabled={isOffline}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Undang Anggota</span>
                </button>
              )}
            </div>

            {isLoadingMembers ? (
              <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                Memuat data anggota toko...
              </div>
            ) : members.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Belum ada anggota terdaftar di toko ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((m) => {
                  const roleBadgeColor =
                    m.role === 'owner'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : m.role === 'admin'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

                  const roleLabel =
                    m.role === 'owner'
                      ? 'Owner Toko'
                      : m.role === 'admin'
                      ? 'Admin Toko'
                      : 'Viewer (Read-Only)';

                  return (
                    <div
                      key={m.id}
                      className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                          {m.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{m.name}</span>
                            <span className="font-mono text-[10px] text-emerald-700 font-semibold">
                              @{m.username}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{m.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${roleBadgeColor}`}
                        >
                          {roleLabel}
                        </span>

                        {isOwner && m.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(m.id, m.username)}
                            disabled={isOffline}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Hapus Hak Akses"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wallets Management Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Daftar Dompet Kas</h3>
                  <p className="text-[11px] text-slate-400">
                    Akun kas & bank untuk mutasi dan operasional toko.
                  </p>
                </div>
              </div>

              {isAdminOrOwner && (
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  disabled={isOffline}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Dompet</span>
                </button>
              )}
            </div>

            {isLoadingWallets ? (
              <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                Memuat data dompet...
              </div>
            ) : wallets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Belum ada dompet kas yang terdaftar.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wallets.map((w) => (
                  <div
                    key={w.id}
                    className={`p-4 rounded-2xl border transition ${
                      w.isArchived
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-100 shadow-xs hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-xs text-slate-800 truncate">{w.name}</span>
                      {w.isArchived ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                          Diarsipkan
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Aktif
                        </span>
                      )}
                    </div>

                    <div className="text-base font-black text-slate-900 mb-2">
                      {formatIDR(w.balance)}
                    </div>

                    {isAdminOrOwner && (
                      <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleToggleArchiveWallet(w.id, w.isArchived)}
                          disabled={isOffline}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition disabled:opacity-50"
                        >
                          {w.isArchived ? (
                            <>
                              <ArchiveRestore className="w-3.5 h-3.5" />
                              <span>Pulihkan Dompet</span>
                            </>
                          ) : (
                            <>
                              <Archive className="w-3.5 h-3.5" />
                              <span>Arsipkan</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={() => {
          fetchMembers();
        }}
      />

      {/* Create Wallet Modal */}
      <CreateWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSuccess={() => {
          fetchWallets();
          refreshStores();
        }}
      />
    </div>
  );
}
