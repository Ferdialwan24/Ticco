'use client';

import React, { useState } from 'react';
import { X, Wallet, AlertCircle, Banknote, Building2, Smartphone, Loader2 } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import WalletBadge, { SUPPORTED_BANKS, CashStackIcon } from '@/components/WalletBadge';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export type WalletType = 'cash' | 'bank' | 'ewallet';

export default function CreateWalletModal({ isOpen, onClose, onSuccess }: CreateWalletModalProps) {
  const { currentStore } = useStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('cash');
  const [bankCode, setBankCode] = useState('bca');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentStore) return null;

  const handleTypeChange = (newType: WalletType) => {
    setType(newType);
    setError(null);
    // Autofill name hint if empty or default
    if (newType === 'cash' && (!name || name.includes('BCA') || name.includes('E-Wallet'))) {
      setName('Kas Tunai Laci');
    } else if (newType === 'bank' && (!name || name === 'Kas Tunai Laci' || name === 'E-Wallet Toko')) {
      setName('BCA Operasional');
    } else if (newType === 'ewallet' && (!name || name === 'Kas Tunai Laci' || name.includes('Operasional'))) {
      setName('E-Wallet Toko');
    }
  };

  const handleBankChange = (code: string) => {
    setBankCode(code);
    const bank = SUPPORTED_BANKS.find((b) => b.code === code);
    if (bank && (!name || SUPPORTED_BANKS.some((b) => name.toLowerCase().includes(b.shortName.toLowerCase())))) {
      setName(`${bank.shortName} Operasional`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const walletName = name.trim();
    if (!walletName || walletName.length < 2) {
      setError('Nama dompet kas minimal 2 karakter.');
      return;
    }

    const balanceNum = parseFloat(initialBalance.replace(/[^0-9]/g, '')) || 0;
    const finalBankCode = type === 'bank' ? bankCode : type === 'ewallet' ? 'ewallet' : null;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/stores/${currentStore.id}/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: walletName,
          type,
          bankCode: finalBankCode,
          accountNumber: accountNumber.trim(),
          initialBalance: balanceNum,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal membuat dompet kas.');
        return;
      }

      setName('');
      setInitialBalance('0');
      setAccountNumber('');
      setType('cash');
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
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl transition hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Tambah Akun Dompet Kas</h3>
            <p className="text-xs text-slate-500">
              Unit Bisnis: <strong>{currentStore.name}</strong>
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
          {/* 1. Tipe Dompet */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Jenis Akun <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('cash')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center ${
                  type === 'cash'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center">
                  <CashStackIcon size="sm" />
                </div>
                <span className="text-xs">Kas Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('bank')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center ${
                  type === 'bank'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-xs">Rekening Bank</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('ewallet')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition text-center ${
                  type === 'ewallet'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-xs">E-Wallet</span>
              </button>
            </div>
          </div>

          {/* 2. Jika Memilih Bank: Selector 6 Bank Resmi dengan Logo */}
          {type === 'bank' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pilih Bank Rekening <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {SUPPORTED_BANKS.map((bank) => {
                    const isSelected = bankCode === bank.code;
                    return (
                      <button
                        key={bank.code}
                        type="button"
                        onClick={() => handleBankChange(bank.code)}
                        className={`h-14 p-2 rounded-2xl border flex items-center justify-center transition ${
                          isSelected
                            ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/30 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                        title={bank.name}
                      >
                        <WalletBadge type="bank" bankCode={bank.code} size="md" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Nomor Rekening (Opsional)
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="contoh: 8820192819"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* 3. Jika Memilih E-Wallet: Tanpa Pilihan Sub-provider */}
          {type === 'ewallet' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2.5">
                <WalletBadge type="ewallet" size="sm" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Akun Dompet Digital (E-Wallet)</p>
                  <p className="text-[11px] text-slate-500">Mendukung GoPay, OVO, DANA, ShopeePay, QRIS, dll.</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Nomor Akun / Handphone / ID Merchant (Opsional)
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="contoh: 081234567890"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* 4. Nama Dompet */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nama Dompet / Rekening <span className="text-emerald-600">*</span>
            </label>
            <div className="flex items-center gap-2.5">
              <WalletBadge
                type={type}
                bankCode={type === 'bank' ? bankCode : null}
                size="md"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Kas Laci Toko, BCA Rekening Utama, DANA Bisnis"
                required
                maxLength={50}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* 5. Saldo Awal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Saldo Awal (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">Rp</span>
              <input
                type="text"
                value={initialBalance}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setInitialBalance(raw ? Number(raw).toLocaleString('id-ID') : '');
                }}
                placeholder="0"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Masukkan saldo riil fisik di kasir atau saldo mutasi rekening bank saat ini.
            </p>
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
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Akun Dompet</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
