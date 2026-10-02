'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Plus,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import CreateTransactionModal from '../modals/CreateTransactionModal';

interface WalletData {
  id: string;
  name: string;
  balance: number;
  type?: 'cash' | 'bank' | 'ewallet';
  bankCode?: string | null;
  accountNumber?: string | null;
}

interface TransactionData {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  walletName: string;
  destinationWalletName?: string;
  date: string;
  notes: string;
  recordedByName: string;
}

interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
}

export default function DashboardTab() {
  const { currentStore, isOffline } = useStore();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [selectedWalletFilter, setSelectedWalletFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  // Default tab terbuka adalah 'today' (Hari Ini)
  const [dateRange, setDateRange] = useState<'today' | 'month' | 'range'>('today');

  // Custom date range inputs
  const todayISO = new Date().toISOString().split('T')[0];
  const [customStartDate, setCustomStartDate] = useState(todayISO);
  const [customEndDate, setCustomEndDate] = useState(todayISO);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const isViewer = currentStore?.role === 'viewer';
  const canMutate = !isViewer && !isOffline;

  const fetchData = useCallback(async () => {
    if (!currentStore) return;
    try {
      setIsLoading(true);

      const walletsRes = await fetch(`/api/stores/${currentStore.id}/wallets`);
      if (walletsRes.ok) {
        const wData = await walletsRes.json();
        setWallets(wData.wallets || []);
      }

      const now = new Date();
      let startDateStr = '';
      let endDateStr = '';

      if (dateRange === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        startDateStr = todayStr;
        endDateStr = todayStr;
      } else if (dateRange === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDateStr = firstDay.toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDateStr = lastDay.toISOString().split('T')[0];
      } else if (dateRange === 'range') {
        startDateStr = customStartDate;
        endDateStr = customEndDate;
      }

      const params = new URLSearchParams();
      if (startDateStr) params.set('startDate', startDateStr);
      if (endDateStr) params.set('endDate', endDateStr);
      if (selectedWalletFilter) params.set('walletId', selectedWalletFilter);
      if (selectedTypeFilter) params.set('type', selectedTypeFilter);

      const txRes = await fetch(`/api/stores/${currentStore.id}/transactions?${params.toString()}`);
      if (txRes.ok) {
        const tData = await txRes.json();
        setTransactions(tData.transactions || []);
        setSummary(tData.summary || { totalIncome: 0, totalExpense: 0, netCashFlow: 0 });
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore, dateRange, customStartDate, customEndDate, selectedWalletFilter, selectedTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-5">
      {/* Top Controls: Filter Rentang Waktu (Kiri) & Button Tambah Transaksi (Kanan) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setDateRange('today')}
              className={`px-3.5 py-2 rounded-xl transition ${
                dateRange === 'today'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3.5 py-2 rounded-xl transition ${
                dateRange === 'month'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setDateRange('range')}
              className={`px-3.5 py-2 rounded-xl transition ${
                dateRange === 'range'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rentang Waktu
            </button>
          </div>

          {/* Date Picker jika memilih Rentang Waktu */}
          {dateRange === 'range' && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none font-medium"
              />
              <span className="text-xs text-slate-400 font-bold">&ndash;</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs text-slate-700 bg-transparent focus:outline-none font-medium"
              />
            </div>
          )}
        </div>

        {/* Button Tambah Transaksi */}
        {canMutate && (
          <button
            onClick={() => setIsTxModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi</span>
          </button>
        )}
      </div>

      {/* Summary Cards: Pemasukan & Pengeluaran */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card Pemasukan */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-5 sm:p-6 shadow-lg shadow-emerald-700/20 relative overflow-hidden border border-emerald-500/30 flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-emerald-400/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                Pemasukan
              </span>
              <span className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-sm shadow-xs">
                <ArrowDownRight className="w-5 h-5" />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Rp {summary.totalIncome.toLocaleString('id-ID')}
            </p>
          </div>
          <p className="relative z-10 text-[11px] text-emerald-100/90 mt-4 font-medium">
            {dateRange === 'today'
              ? 'Hari ini'
              : dateRange === 'month'
              ? 'Bulan ini'
              : `Periode: ${customStartDate} s/d ${customEndDate}`}
          </p>
        </div>

        {/* Card Pengeluaran */}
        <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white rounded-3xl p-5 sm:p-6 shadow-lg shadow-rose-700/20 relative overflow-hidden border border-rose-500/30 flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-rose-400/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-100">
                Pengeluaran
              </span>
              <span className="p-2 rounded-xl bg-white/20 text-white backdrop-blur-sm shadow-xs">
                <ArrowUpRight className="w-5 h-5" />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Rp {summary.totalExpense.toLocaleString('id-ID')}
            </p>
          </div>
          <p className="relative z-10 text-[11px] text-rose-100/90 mt-4 font-medium">
            {dateRange === 'today'
              ? 'Hari ini'
              : dateRange === 'month'
              ? 'Bulan ini'
              : `Periode: ${customStartDate} s/d ${customEndDate}`}
          </p>
        </div>
      </div>

      {/* Riwayat Mutasi Kas */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Riwayat Mutasi Kas</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedWalletFilter}
              onChange={(e) => setSelectedWalletFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Semua Dompet</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Semua Jenis</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Memuat transaksi...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Tidak ada catatan transaksi.
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-1 rounded-xl transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-emerald-100 text-emerald-700'
                        : tx.type === 'expense'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : tx.type === 'expense' ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowRightLeft className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {tx.category}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {tx.type === 'transfer' ? (
                        <span>
                          {tx.walletName} &rarr; {tx.destinationWalletName || 'Dompet'}
                        </span>
                      ) : (
                        <span>{tx.walletName}</span>
                      )}
                      {tx.notes ? ` • ${tx.notes}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(tx.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      • Dicatat oleh {tx.recordedByName}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-black ${
                      tx.type === 'income'
                        ? 'text-emerald-700'
                        : tx.type === 'expense'
                        ? 'text-rose-600'
                        : 'text-blue-700'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''} Rp{' '}
                    {tx.amount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CreateTransactionModal
        isOpen={isTxModalOpen}
        wallets={wallets}
        defaultType="income"
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
