'use client';

import React, { useState } from 'react';
import { X, UserPlus, Shield, Eye, AlertCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  onSuccess,
}: InviteMemberModalProps) {
  const { currentStore } = useStore();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentStore) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Username anggota wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/stores/${currentStore.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal mengundang anggota.');
        return;
      }

      setUsername('');
      onSuccess();
      onClose();
    } catch {
      setError('Terjadi kendala jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Undang Anggota Toko</h3>
            <p className="text-xs text-slate-500">
              Unit: <strong>{currentStore.name}</strong> (Store-Scoped Isolation)
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Username Tujuan <span className="text-emerald-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username_anggota"
                required
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pengguna yang diundang harus sudah memiliki akun dan username di Ticco.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Hak Akses / Peran
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('viewer')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  role === 'viewer'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  Viewer (Pengamat)
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Hanya melihat saldo, mutasi kas, dan porsi modal. Tanpa izin input.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                  role === 'admin'
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  Admin Toko
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Bisa input transaksi, modal, staf, kasbon, dan slip gaji.
                </p>
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !username.trim()}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? 'Mengundang...' : 'Kirim Undangan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
