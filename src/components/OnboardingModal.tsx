'use client';

import React, { useState } from 'react';
import { UserCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function OnboardingModal() {
  const { user, refreshUser } = useStore();
  const [username, setUsername] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || user.hasUsername) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Username wajib diisi.');
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username harus 3-20 karakter, hanya huruf, angka, dan underscore (_).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          name: name.trim() || user.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal menyimpan username.');
        return;
      }

      await refreshUser();
    } catch {
      setError('Terjadi kendala jaringan. Coba lagi beberapa saat lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full mb-4 mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-center text-slate-800">
          Selamat Datang di Ticco!
        </h2>
        <p className="text-sm text-slate-600 text-center mt-1 mb-6">
          Untuk menghubungkan Anda dengan unit bisnis atau menerima undangan, silakan tentukan <strong>username unik</strong> Anda.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs sm:text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Anda"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Pilih Username <span className="text-emerald-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="contoh: budi_santoso"
                maxLength={20}
                required
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              3–20 karakter, huruf kecil, angka, dan tanda garis bawah.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim()}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium text-sm transition shadow-sm flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            {isSubmitting ? 'Menyimpan...' : 'Selesaikan Profil & Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
