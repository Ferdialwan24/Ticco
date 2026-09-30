'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Coins, Plus, PieChart, Clock, ShieldCheck } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import CreateCapitalModal from '../modals/CreateCapitalModal';

interface EquityEntry {
  contributorName: string;
  totalAmount: number;
  percentage: number;
  contributionCount: number;
  lastDate: string;
}

interface ContributionItem {
  id: string;
  contributorName: string;
  amount: number;
  walletName: string;
  date: string;
  notes: string;
  recordedByName: string;
}

interface WalletOption {
  id: string;
  name: string;
  balance: number;
}

export default function CapitalTab() {
  const { currentStore, isOffline } = useStore();
  const [totalCapital, setTotalCapital] = useState(0);
  const [equityBreakdown, setEquityBreakdown] = useState<EquityEntry[]>([]);
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);

  const isViewer = currentStore?.role === 'viewer';
  const canMutate = !isViewer && !isOffline;

  const fetchCapitalData = useCallback(async () => {
    if (!currentStore) return;
    try {
      setIsLoading(true);

      const [capRes, wRes] = await Promise.all([
        fetch(`/api/stores/${currentStore.id}/capital`),
        fetch(`/api/stores/${currentStore.id}/wallets`),
      ]);

      if (capRes.ok) {
        const cData = await capRes.json();
        setTotalCapital(cData.totalCapital || 0);
        setEquityBreakdown(cData.equityBreakdown || []);
        setContributions(cData.contributions || []);
      }

      if (wRes.ok) {
        const wData = await wRes.json();
        setWallets(wData.wallets || []);
      }
    } catch (err) {
      console.error('Fetch capital error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore]);

  useEffect(() => {
    fetchCapitalData();
  }, [fetchCapitalData]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">
                <Coins className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Struktur Permodalan & Ekuitas
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black tracking-tight">
              Rp {totalCapital.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-lg">
              Total ekuitas modal yang disetorkan untuk unit <strong>{currentStore?.name}</strong>. Terisolasi mutlak dari omzet harian operasional.
            </p>
          </div>

          {canMutate && (
            <button
              onClick={() => setIsCapitalModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm shadow-md transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Setor Modal Baru</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Rasio Kepemilikan Saham / Modal
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {equityBreakdown.length} Pemegang Modal
          </span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Memuat pembagian modal...
          </div>
        ) : equityBreakdown.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Belum ada setoran modal yang dicatat.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {equityBreakdown.map((item) => (
              <div
                key={item.contributorName}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-indigo-200 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {item.contributorName[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{item.contributorName}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.contributionCount}x setoran modal
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-indigo-600">
                      {item.percentage}%
                    </p>
                    <p className="text-xs font-semibold text-slate-700">
                      Rp {item.totalAmount.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-1">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Audit Trail Permodalan</h3>
              <p className="text-xs text-slate-500">
                Log riwayat penyetoran modal secara transparan untuk seluruh anggota.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Memuat log permodalan...
            </div>
          ) : contributions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              Belum ada riwayat setoran modal.
            </div>
          ) : (
            contributions.map((c) => (
              <div
                key={c.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-1 rounded-xl transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {c.contributorName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Disetor ke: <strong>{c.walletName}</strong> {c.notes ? `• ${c.notes}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(c.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}{' '}
                      • Dicatat oleh {c.recordedByName}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full block mb-1">
                    Setoran Modal
                  </span>
                  <p className="text-sm font-black text-slate-900">
                    + Rp {c.amount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CreateCapitalModal
        isOpen={isCapitalModalOpen}
        wallets={wallets}
        onClose={() => setIsCapitalModalOpen(false)}
        onSuccess={fetchCapitalData}
      />
    </div>
  );
}
