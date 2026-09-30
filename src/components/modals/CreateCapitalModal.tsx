'use client';

import React, { useState } from 'react';
import { X, Coins, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface WalletOption {
  id: string;
  name: string;
  balance: number;
}

interface CreateCapitalModalProps {
  isOpen: boolean;
  wallets: WalletOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCapitalModal({
  isOpen,
  wallets,
  onClose,
  onSuccess,
}: CreateCapitalModalProps) {
  const { currentStore } = useStore();
  const [contributorName, setContributorName] = useState('');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentStore) return null;

  const numericAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const activeWalletId = walletId || wallets[0]?.id;
    if (!activeWalletId) {
      setError('Dompet penerima modal belum dipilih.');
      return;
    }

    if (!contributorName.trim()) {
      setError('Nama penyetor modal wajib diisi.');
      return;
    }

    if (numericAmount <= 0) {
      setError('Nominal setoran modal minimal Rp 1.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/stores/${currentStore.id}/capital`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorName: contributorName.trim(),
          amount: numericAmount,
          walletId: activeWalletId,
          date,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal mencatat setoran modal.');
        return;
      }

      setContributorName('');
      setAmount('');
      setNotes('');
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
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Setor Modal Usaha</h3>
            <p className="text-xs text-slate-500">
              Dicatat sebagai Ekuitas Modal (Terpisah mutlak dari omzet toko).
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nama Pemodal / Penyetor <span className="text-indigo-600">*</span>
            </label>
            <input
              type="text"
              value={contributorName}
              onChange={(e) => setContributorName(e.target.value)}
              placeholder="contoh: Hendra, Lina, Investor A"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nominal Setoran (Rp) <span className="text-indigo-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-sm">Rp</span>
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setAmount(raw ? Number(raw).toLocaleString('id-ID') : '');
                }}
                placeholder="0"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Masuk ke Dompet Kas Penerima
            </label>
            <select
              value={walletId || wallets[0]?.id}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Saldo: Rp {w.balance.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Saldo dompet penerima otomatis bertambah sebesar nominal setoran ini.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tanggal Setoran
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Keterangan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="contoh: Penambahan modal renovasi dapur"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
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
              disabled={isSubmitting || numericAmount <= 0 || !contributorName.trim()}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : 'Catat Modal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
