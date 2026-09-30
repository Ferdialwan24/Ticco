'use client';

import React, { useState } from 'react';
import { X, Store, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateStoreModal({ isOpen, onClose }: CreateStoreModalProps) {
  const { refreshStores, setCurrentStoreId } = useStore();
  const [name, setName] = useState('');
  const [initialWalletName, setInitialWalletName] = useState('Kas Tunai Toko');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const storeName = name.trim();
    if (!storeName || storeName.length < 2) {
      setError('Nama unit toko wajib minimal 2 karakter.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          initialWalletName: initialWalletName.trim() || 'Kas Tunai Toko',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal membuat toko.');
        return;
      }

      await refreshStores();
      setCurrentStoreId(data.store.id);
      setName('');
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
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Buka Unit Toko Baru</h3>
            <p className="text-xs text-slate-500">
              Setiap toko terisolasi secara finansial dan memiliki hak akses terpisah.
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
              Nama Toko / Cabang <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: Kedai Kopi Sukses - Cabang Barat"
              required
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nama Dompet Kas Awal
            </label>
            <input
              type="text"
              value={initialWalletName}
              onChange={(e) => setInitialWalletName(e.target.value)}
              placeholder="contoh: Kas Tunai Toko"
              maxLength={50}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            <p className="text-xs text-slate-500 mt-1">
              Dompet awal otomatis dibuat dengan saldo Rp 0. Anda dapat menambah dompet bank/QRIS nanti.
            </p>
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
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting ? 'Membuat...' : 'Buat Toko'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
