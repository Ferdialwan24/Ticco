'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Wallet as WalletIcon,
  Plus,
  AlertCircle,
  Loader2,
  Edit2,
  Archive,
  Check,
  X,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import CreateWalletModal from '../modals/CreateWalletModal';
import WalletBadge, { getBankInfo } from '../WalletBadge';

interface WalletData {
  id: string;
  name: string;
  balance: number;
  type?: 'cash' | 'bank' | 'ewallet';
  bankCode?: string | null;
  accountNumber?: string | null;
  isArchived?: boolean;
}

export default function WalletsTab() {
  const { currentStore, isOffline } = useStore();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Edit inline state
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isViewer = currentStore?.role === 'viewer';
  const canMutate = !isViewer && !isOffline;

  const fetchWallets = useCallback(async () => {
    if (!currentStore) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/stores/${currentStore.id}/wallets`);
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets || []);
      }
    } catch (err) {
      console.error('Fetch wallets error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  const handleStartEdit = (w: WalletData) => {
    setEditingWalletId(w.id);
    setEditName(w.name);
    setActionError(null);
  };

  const handleCancelEdit = () => {
    setEditingWalletId(null);
    setEditName('');
    setActionError(null);
  };

  const handleSaveEdit = async (walletId: string) => {
    if (!editName.trim() || editName.trim().length < 2) {
      setActionError('Nama dompet minimal 2 karakter.');
      return;
    }
    if (!currentStore) return;

    try {
      setIsSavingEdit(true);
      setActionError(null);
      const res = await fetch(`/api/stores/${currentStore.id}/wallets/${walletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message || 'Gagal mengubah nama dompet.');
        return;
      }

      setEditingWalletId(null);
      fetchWallets();
    } catch {
      setActionError('Terjadi kendala jaringan.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleArchiveWallet = async (wallet: WalletData) => {
    if (!currentStore) return;

    if (wallet.balance > 0) {
      const confirmMsg = `Dompet "${wallet.name}" masih memiliki saldo Rp ${wallet.balance.toLocaleString('id-ID')}. Pindahkan sisa saldo terlebih dahulu sebelum mengarsipkan dompet.`;
      alert(confirmMsg);
      return;
    }

    const isConfirmed = window.confirm(`Yakin ingin mengarsipkan dompet "${wallet.name}"?`);
    if (!isConfirmed) return;

    try {
      setActionError(null);
      const res = await fetch(`/api/stores/${currentStore.id}/wallets/${wallet.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setActionError(data.message || 'Gagal mengarsipkan dompet.');
        return;
      }

      fetchWallets();
    } catch {
      setActionError('Terjadi kendala saat mengarsipkan dompet.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header: TOTAL SALDO */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300">
              <WalletIcon className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              TOTAL SALDO
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-black tracking-tight">
            Rp {totalBalance.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Wallets List Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Daftar Kas dan Rekening Bank</h3>
          </div>
          {canMutate && (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Dompet</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Memuat data dompet...</span>
          </div>
        ) : wallets.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <WalletIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Belum Ada Dompet Kas</h4>
            <p className="text-xs text-slate-500">
              Setiap toko membutuhkan minimal satu akun kas untuk mencatat penjualan, belanja operasional, dan gaji staf.
            </p>
            {canMutate && (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Dompet Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((wallet) => {
              const isEditing = editingWalletId === wallet.id;

              return (
                <div
                  key={wallet.id}
                  className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-5 border border-slate-200/70 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <WalletBadge type={wallet.type || 'cash'} bankCode={wallet.bankCode} size="md" />
                        <div className="min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="px-2 py-1 text-xs border border-emerald-500 rounded-lg focus:outline-none bg-white font-bold"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(wallet.id)}
                                disabled={isSavingEdit}
                                className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {wallet.name}
                              </h4>
                              <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                                {wallet.type === 'bank'
                                  ? (getBankInfo(wallet.bankCode || undefined)?.name || 'Bank') +
                                    (wallet.accountNumber ? ` • ${wallet.accountNumber}` : '')
                                  : wallet.type === 'ewallet'
                                  ? 'E-Wallet' + (wallet.accountNumber ? ` • ${wallet.accountNumber}` : '')
                                  : 'Uang Tunai / Kas'}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {canMutate && !isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(wallet)}
                            title="Ubah Nama Dompet"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchiveWallet(wallet)}
                            title="Arsipkan Dompet"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                        Saldo Kas Aktif
                      </p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">
                        Rp {wallet.balance.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSuccess={fetchWallets}
      />
    </div>
  );
}
