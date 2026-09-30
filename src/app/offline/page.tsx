'use client';

import React from 'react';
import { WifiOff, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl border border-slate-100 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-100 shadow-xs">
          <WifiOff className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Offline Mode
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
            Koneksi Internet Terputus
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Ticco membatasi pencatatan kas saat offline demi mencegah perbedaan saldo mutasi riil antar pengelola toko.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Integritas Arus Kas Terjaga</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Halaman statis yang pernah dibuka tetap dapat dilihat melalui cache lokal. Begitu perangkat Anda online kembali, mutasi kas dapat dicatat normal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleReload}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang Halaman</span>
          </button>

          <Link
            href="/"
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
