'use client';

import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, AlertCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface WalletOption {
  id: string;
  name: string;
  balance: number;
}

interface CreateTransactionModalProps {
  isOpen: boolean;
  wallets: WalletOption[];
  defaultType?: 'income' | 'expense';
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_CATEGORIES = {
  income: ['Penjualan Harian', 'Pendapatan Jasa', 'Komisi', 'Lain-lain'],
  expense: [
    'Bahan Baku',
    'Listrik, Air & Gas',
    'Sewa Tempat',
    'Operasional Toko',
    'Perbaikan & Pemeliharaan',
    'Pemasaran & Iklan',
    'Konsumsi Karyawan',
    'Lain-lain',
  ],
};

export default function CreateTransactionModal({
  isOpen,
  wallets,
  defaultType = 'expense',
  onClose,
  onSuccess,
}: CreateTransactionModalProps) {
  const { currentStore } = useStore();
  const [type, setType] = useState<'income' | 'expense'>(defaultType);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[defaultType][0]);
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentStore) return null;

  const selectedWallet = wallets.find((w) => w.id === walletId) || wallets[0];
  const numericAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory(DEFAULT_CATEGORIES[newType][0]);
    setCustomCategory('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const activeWalletId = walletId || wallets[0]?.id;
    if (!activeWalletId) {
      setError('Dompet kas belum tersedia.');
      return;
    }

    if (numericAmount <= 0) {
      setError('Nominal transaksi harus lebih besar dari Rp 0.');
      return;
    }

    if (type === 'expense' && selectedWallet && numericAmount > selectedWallet.balance) {
      setError(`Saldo ${selectedWallet.name} tidak cukup (Saldo: Rp ${selectedWallet.balance.toLocaleString('id-ID')}).`);
      return;
    }

    const finalCategory = customCategory.trim() || category;
    if (!finalCategory) {
      setError('Kategori transaksi wajib ditentukan.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/stores/${currentStore.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category: finalCategory,
          amount: numericAmount,
          walletId: activeWalletId,
          date,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal menyimpan transaksi.');
        return;
      }

      setAmount('');
      setNotes('');
      setCustomCategory('');
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

        <h3 className="text-lg font-bold text-slate-900 mb-4">Catat Arus Kas</h3>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            Kas Masuk (Omzet)
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${
              type === 'expense'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Kas Keluar (Beban)
          </button>
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
              Nominal (Rp) <span className="text-red-500">*</span>
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
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Akun Dompet Kas
            </label>
            <select
              value={walletId || wallets[0]?.id}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
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
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
            >
              {DEFAULT_CATEGORIES[type].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="custom">+ Kategori Kustom...</option>
            </select>

            {category === 'custom' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Ketik nama kategori..."
                required
                className="w-full mt-2 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Catatan Keterangan
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="contoh: Pembelian 2 peti telur & minyak goreng"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
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
              className={`flex-1 py-2.5 px-4 text-white rounded-xl font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 ${
                type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              } disabled:bg-slate-300`}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
