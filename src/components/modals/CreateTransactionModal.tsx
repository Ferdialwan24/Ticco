'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export interface WalletOption {
  id: string;
  name: string;
  balance: number;
  type?: 'cash' | 'bank' | 'ewallet';
  bankCode?: string | null;
  accountNumber?: string | null;
}

export type TransactionModalType = 'income' | 'expense' | 'transfer';

interface CreateTransactionModalProps {
  isOpen: boolean;
  wallets: WalletOption[];
  defaultType?: TransactionModalType;
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

function formatWalletLabel(w: WalletOption) {
  let tag = 'KAS';
  if (w.type === 'bank') tag = w.bankCode?.toUpperCase() || 'BANK';
  else if (w.type === 'ewallet') tag = 'E-WALLET';
  const acct = w.accountNumber ? ` • ${w.accountNumber}` : '';
  return `[${tag}] ${w.name}${acct} (Saldo: Rp ${w.balance.toLocaleString('id-ID')})`;
}

export default function CreateTransactionModal({
  isOpen,
  wallets,
  defaultType = 'income',
  onClose,
  onSuccess,
}: CreateTransactionModalProps) {
  const { currentStore } = useStore();
  const [type, setType] = useState<TransactionModalType>(defaultType);
  const [category, setCategory] = useState(
    defaultType === 'income' ? DEFAULT_CATEGORIES.income[0] : DEFAULT_CATEGORIES.expense[0]
  );
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState(wallets[0]?.id || '');
  const [fromWalletId, setFromWalletId] = useState(wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(wallets[1]?.id || '');
  const [adminFeeType, setAdminFeeType] = useState<'bifast' | 'online' | 'free'>('free');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or defaultType changes
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      if (defaultType === 'income') {
        setCategory(DEFAULT_CATEGORIES.income[0]);
      } else if (defaultType === 'expense') {
        setCategory(DEFAULT_CATEGORIES.expense[0]);
      }
      setCustomCategory('');
      setAmount('');
      setNotes('');
      setError(null);

      const firstWallet = wallets[0]?.id || '';
      const secondWallet = wallets.length > 1 ? wallets[1]?.id : '';
      setWalletId(firstWallet);
      setFromWalletId(firstWallet);
      setToWalletId(secondWallet);
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, defaultType, wallets]);

  const numericAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;
  const selectedSingleWallet = wallets.find((w) => w.id === (walletId || wallets[0]?.id));
  const sourceWallet = wallets.find((w) => w.id === fromWalletId);
  const destWallet = wallets.find((w) => w.id === toWalletId);

  const isInterbank = Boolean(
    sourceWallet?.type === 'bank' &&
    destWallet?.type === 'bank' &&
    sourceWallet?.bankCode &&
    destWallet?.bankCode &&
    sourceWallet.bankCode.toLowerCase() !== destWallet.bankCode.toLowerCase()
  );

  // Auto-detect interbank when fromWallet or toWallet changes
  useEffect(() => {
    if (type === 'transfer' && sourceWallet && destWallet) {
      if (isInterbank) {
        setAdminFeeType('bifast');
      } else {
        setAdminFeeType('free');
      }
    }
  }, [type, fromWalletId, toWalletId, isInterbank]);

  if (!isOpen || !currentStore) return null;

  const adminFee = adminFeeType === 'bifast' ? 2500 : adminFeeType === 'online' ? 6500 : 0;
  const adminFeeMethod =
    adminFeeType === 'bifast'
      ? 'BI-FAST (Rp 2.500)'
      : adminFeeType === 'online'
      ? 'Online Switching (Rp 6.500)'
      : 'Bebas Biaya';
  const totalTransferDeduction = numericAmount + (type === 'transfer' ? adminFee : 0);

  const handleTypeChange = (newType: TransactionModalType) => {
    setType(newType);
    setError(null);
    if (newType === 'income') {
      setCategory(DEFAULT_CATEGORIES.income[0]);
      setCustomCategory('');
    } else if (newType === 'expense') {
      setCategory(DEFAULT_CATEGORIES.expense[0]);
      setCustomCategory('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numericAmount <= 0) {
      setError('Nominal transaksi harus lebih besar dari Rp 0.');
      return;
    }

    if (type === 'transfer') {
      // Transfer Validation
      if (wallets.length < 2) {
        setError('Dibutuhkan minimal 2 dompet aktif untuk melakukan transfer dana.');
        return;
      }

      if (!fromWalletId || !toWalletId) {
        setError('Dompet asal dan dompet tujuan wajib dipilih.');
        return;
      }

      if (fromWalletId === toWalletId) {
        setError('Dompet asal dan dompet tujuan tidak boleh sama.');
        return;
      }

      if (sourceWallet && totalTransferDeduction > sourceWallet.balance) {
        setError(
          `Saldo ${sourceWallet.name} tidak cukup untuk transfer Rp ${numericAmount.toLocaleString('id-ID')}${adminFee > 0 ? ` + biaya admin Rp ${adminFee.toLocaleString('id-ID')}` : ''} (Saldo saat ini: Rp ${sourceWallet.balance.toLocaleString('id-ID')}).`
        );
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
            adminFee,
            adminFeeMethod,
            date,
            notes: notes.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.message || 'Gagal melakukan transfer saldo.');
          return;
        }

        onSuccess();
        onClose();
      } catch {
        setError('Terjadi kendala jaringan saat memproses transfer.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Income or Expense Validation
      const activeWalletId = walletId || wallets[0]?.id;
      if (!activeWalletId) {
        setError('Dompet kas belum tersedia.');
        return;
      }

      if (type === 'expense' && selectedSingleWallet && numericAmount > selectedSingleWallet.balance) {
        setError(
          `Saldo ${selectedSingleWallet.name} tidak cukup (Saldo: Rp ${selectedSingleWallet.balance.toLocaleString('id-ID')}).`
        );
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

        onSuccess();
        onClose();
      } catch {
        setError('Terjadi kendala jaringan saat menyimpan transaksi.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl transition hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h3 className="text-xl font-bold text-slate-900">Tambah Transaksi</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih jenis transaksi yang ingin dicatat ke buku kas toko
          </p>
        </div>

        {/* 3-Way Segmented Control */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 shrink-0" />
            <span className="truncate">Pemasukan</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition ${
              type === 'expense'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 shrink-0" />
            <span className="truncate">Pengeluaran</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('transfer')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition ${
              type === 'transfer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">Transfer</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nominal Transaksi (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">Rp</span>
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setAmount(raw ? Number(raw).toLocaleString('id-ID') : '');
                }}
                placeholder="0"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Form specific for Transfer */}
          {type === 'transfer' ? (
            <div className="space-y-3.5 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Dari Dompet (Sumber Pengirim) <span className="text-red-500">*</span>
                </label>
                <select
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {formatWalletLabel(w)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ke Dompet (Tujuan Penerima) <span className="text-red-500">*</span>
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} disabled={w.id === fromWalletId}>
                      {formatWalletLabel(w)} {w.id === fromWalletId ? ' (Sama dengan asal)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Admin Fee Selector */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Biaya Admin Bank
                  </label>
                  {isInterbank && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      Beda Bank Terdeteksi
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* BI-FAST */}
                  <button
                    type="button"
                    onClick={() => setAdminFeeType('bifast')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      adminFeeType === 'bifast'
                        ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${adminFeeType === 'bifast' ? 'text-blue-900' : 'text-slate-800'}`}>
                        BI-FAST
                      </span>
                      <span className="text-[9px] font-black uppercase px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                        Hemat
                      </span>
                    </div>
                    <p className={`text-xs font-black mt-1 ${adminFeeType === 'bifast' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Rp 2.500
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate">
                      Realtime 24 Jam
                    </p>
                  </button>

                  {/* Online Switching */}
                  <button
                    type="button"
                    onClick={() => setAdminFeeType('online')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      adminFeeType === 'online'
                        ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${adminFeeType === 'online' ? 'text-blue-900' : 'text-slate-800'}`}>
                        Online
                      </span>
                      <span className="text-[9px] font-black uppercase px-1 py-0.5 rounded bg-slate-100 text-slate-600">
                        ATM
                      </span>
                    </div>
                    <p className={`text-xs font-black mt-1 ${adminFeeType === 'online' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Rp 6.500
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate">
                      Switching ATM Bersama
                    </p>
                  </button>

                  {/* Bebas Biaya */}
                  <button
                    type="button"
                    onClick={() => setAdminFeeType('free')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      adminFeeType === 'free'
                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${adminFeeType === 'free' ? 'text-emerald-900' : 'text-slate-800'}`}>
                        Bebas Biaya
                      </span>
                      <span className="text-[9px] font-black uppercase px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Gratis
                      </span>
                    </div>
                    <p className={`text-xs font-black mt-1 ${adminFeeType === 'free' ? 'text-emerald-700' : 'text-slate-700'}`}>
                      Rp 0
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate">
                      Sesama bank / promo
                    </p>
                  </button>
                </div>
              </div>

              {/* Rincian Pemotongan Saldo */}
              {numericAmount > 0 && sourceWallet && (
                <div className="p-3 bg-white rounded-xl border border-blue-200/80 space-y-1.5 text-xs shadow-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Nominal Transfer</span>
                    <span className="font-semibold text-slate-900">
                      Rp {numericAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Admin ({adminFeeMethod})</span>
                    <span className="font-semibold text-slate-900">
                      {adminFee > 0 ? `+ Rp ${adminFee.toLocaleString('id-ID')}` : 'Rp 0 (Gratis)'}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 flex justify-between font-bold">
                    <span className="text-slate-800">Total Terpotong dari {sourceWallet.name}</span>
                    <span
                      className={`text-sm ${
                        totalTransferDeduction > sourceWallet.balance ? 'text-rose-600' : 'text-blue-700'
                      }`}
                    >
                      Rp {totalTransferDeduction.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {totalTransferDeduction > sourceWallet.balance && (
                    <p className="text-[11px] text-rose-600 font-semibold pt-1">
                      ⚠️ Saldo {sourceWallet.name} tidak mencukupi (Tersedia: Rp{' '}
                      {sourceWallet.balance.toLocaleString('id-ID')}).
                    </p>
                  )}
                </div>
              )}

              <p className="text-[11px] text-blue-700 leading-relaxed">
                ℹ️ Mutasi transfer internal memindahkan kas antar-rekening tanpa memengaruhi laporan laba-rugi atau omzet toko.
                {adminFee > 0 && ' Biaya admin bank otomatis dicatat sebagai pengeluaran operasional bank.'}
              </p>
            </div>
          ) : (
            /* Form specific for Income / Expense */
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {type === 'income' ? 'Masuk ke Dompet Kas' : 'Keluar dari Dompet Kas'}
                </label>
                <select
                  value={walletId || wallets[0]?.id}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {formatWalletLabel(w)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
            </>
          )}

          {/* Tanggal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white"
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Keterangan
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                type === 'transfer'
                  ? 'contoh: Setor tunai omzet kasir ke rekening BCA'
                  : type === 'income'
                  ? 'contoh: Pelunasan pesanan grosir Toko Berkah'
                  : 'contoh: Pembelian 2 peti telur & minyak goreng'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs sm:text-sm transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                numericAmount <= 0 ||
                (type === 'transfer' && Boolean(sourceWallet && totalTransferDeduction > sourceWallet.balance))
              }
              className={`flex-1 py-3 px-4 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 ${
                type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
                  : type === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.99]'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>
                  {type === 'income'
                    ? 'Simpan Pemasukan'
                    : type === 'expense'
                    ? 'Simpan Pengeluaran'
                    : 'Kirim Transfer'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
