'use client';

import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface WalletOption {
  id: string;
  name: string;
  balance: number;
}

interface TransferWalletModalProps {
  isOpen: boolean;
  wallets: WalletOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferWalletModal({
  isOpen,
  wallets,
  onClose,
  onSuccess,
}: TransferWalletModalProps) {
  const { currentStore } = useStore();
  const [fromWalletId, setFromWalletId] = useState(wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentStore) return null;

  const sourceWallet = wallets.find((w) => w.id === fromWalletId);
  const numericAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fromWalletId || !toWalletId) {
      setError('Dompet asal dan tujuan wajib dipilih.');
      return;
    }

    if (fromWalletId === toWalletId) {
      setError('Dompet asal dan dompet tujuan tidak boleh sama.');
      return;
    }

    if (numericAmount <= 0) {
      setError('Nominal transfer harus lebih besar dari Rp 0.');
      return;
    }

    if (sourceWallet && numericAmount > sourceWallet.balance) {
      setError(`Saldo ${sourceWallet.name} tidak mencukupi (Saldo: Rp ${sourceWallet.balance.toLocaleString('id-ID')}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/stores/${currentStore.id}/wallets/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWalletId,
          toWalletId,
          amount: numericAmount,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal melakukan transfer dana.');
        return;
      }

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
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Transfer Antar-Dompet</h3>
            <p className="text-xs text-slate-500">
              Pindah dana internal tanpa mempengaruhi laba rugi atau omzet.
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
              Dari Dompet (Sumber)
            </label>
            <select
              value={fromWalletId}
              onChange={(e) => setFromWalletId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Saldo: Rp {w.balance.toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Ke Dompet (Tujuan)
            </label>
            <select
              value={toWalletId}
              onChange={(e) => setToWalletId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id} disabled={w.id === fromWalletId}>
                  {w.name} {w.id === fromWalletId ? '(Sama dengan asal)' : `(Saldo: Rp ${w.balance.toLocaleString('id-ID')})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nominal Transfer (Rp) <span className="text-blue-600">*</span>
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
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Catatan / Referensi (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="contoh: Setor tunai harian ke rekening BCA"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
              disabled={isSubmitting || numericAmount <= 0}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-medium text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Memproses...' : 'Kirim Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
