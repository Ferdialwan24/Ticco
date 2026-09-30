'use client';

import React, { useState } from 'react';
import { X, Users, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateStaffModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateStaffModalProps) {
  const { currentStore } = useStore();
  const [name, setName] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [allowances, setAllowances] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentStore) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const staffName = name.trim();
    if (!staffName || staffName.length < 2) {
      setError('Nama staf wajib diisi minimal 2 karakter.');
      return;
    }

    const salaryNum = parseFloat(baseSalary.replace(/[^0-9]/g, '')) || 0;
    const allowanceNum = parseFloat(allowances.replace(/[^0-9]/g, '')) || 0;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/stores/${currentStore.id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: staffName,
          baseSalary: salaryNum,
          allowances: allowanceNum,
          username: username.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal menambahkan staf.');
        return;
      }

      setName('');
      setBaseSalary('');
      setAllowances('');
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
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Tambah Data Karyawan</h3>
            <p className="text-xs text-slate-500">
              Master acuan gaji pokok dan tunjangan bulanan.
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
              Nama Lengkap Karyawan <span className="text-emerald-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: Agus Pratama"
              required
              maxLength={60}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Gaji Pokok Acuan Bulanan (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-sm">Rp</span>
              <input
                type="text"
                value={baseSalary}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setBaseSalary(raw ? Number(raw).toLocaleString('id-ID') : '');
                }}
                placeholder="0"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tunjangan Tetap Bulanan (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-sm">Rp</span>
              <input
                type="text"
                value={allowances}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setAllowances(raw ? Number(raw).toLocaleString('id-ID') : '');
                }}
                placeholder="0"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tautkan Akun Aplikasi (Opsional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username_staf"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Jika diisi, staf dapat login mandiri untuk melihat & mengunduh slip gaji pribadi.
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Karyawan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
