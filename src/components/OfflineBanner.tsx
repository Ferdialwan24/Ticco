'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function OfflineBanner() {
  const { isOffline } = useStore();

  if (!isOffline) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-sm sticky top-0 z-50 animate-pulse">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        <strong>Mode Baca Saja (Offline):</strong> Koneksi internet terputus. Fitur pencatatan dan mutasi saldo dinonaktifkan untuk menjaga konsistensi data.
      </span>
    </div>
  );
}
