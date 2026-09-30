'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Plus,
  Coins,
  HandCoins,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import CreateTransactionModal from '../modals/CreateTransactionModal';
import CreateWalletModal from '../modals/CreateWalletModal';
import TransferWalletModal from '../modals/TransferWalletModal';
import CreateCapitalModal from '../modals/CreateCapitalModal';
import CreateAdvanceModal from '../modals/CreateAdvanceModal';

interface WalletData {
  id: string;
  name: string;
  balance: number;
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

interface StaffData {
  id: string;
  name: string;
  baseSalary: number;
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
  const [staffList, setStaffList] = useState<StaffData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedWalletFilter, setSelectedWalletFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'month' | 'all'>('month');

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'income' | 'expense'>('expense');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

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
      if (dateRange === 'today') {
        startDateStr = now.toISOString().split('T')[0];
      } else if (dateRange === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDateStr = firstDay.toISOString().split('T')[0];
      }

      const params = new URLSearchParams();
      if (startDateStr) params.set('startDate', startDateStr);
      if (selectedWalletFilter) params.set('walletId', selectedWalletFilter);
      if (selectedTypeFilter) params.set('type', selectedTypeFilter);

      const txRes = await fetch(`/api/stores/${currentStore.id}/transactions?${params.toString()}`);
      if (txRes.ok) {
        const tData = await txRes.json();
        setTransactions(tData.transactions || []);
        setSummary(tData.summary || { totalIncome: 0, totalExpense: 0, netCashFlow: 0 });
      }

      const staffRes = await fetch(`/api/stores/${currentStore.id}/staff`);
      if (staffRes.ok) {
        const sData = await staffRes.json();
        setStaffList(sData.staff || []);
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentStore, dateRange, selectedWalletFilter, selectedTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] w-28 h-28 bg-emerald-600/20 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Total Saldo Dompet
            </span>
            <WalletIcon className="w-4 h-4 text-emerald-300" />
          </div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight">
            Rp {totalWalletBalance.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-emerald-200/80 mt-1">
            Tersebar di {wallets.length} rekening / dompet aktif
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Kas Masuk (Omzet)</span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700">
            + Rp {summary.totalIncome.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {dateRange === 'month' ? 'Bulan Ini' : dateRange === 'today' ? 'Hari Ini' : 'Semua Riwayat'}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Arus Kas Bersih</span>
            <span
              className={`p-1.5 rounded-xl ${
                summary.netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {summary.netCashFlow >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </span>
          </div>
          <p
            className={`text-xl sm:text-2xl font-bold ${
              summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {summary.netCashFlow >= 0 ? '+' : ''} Rp {summary.netCashFlow.toLocaleString('id-ID')}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Beban: Rp {summary.totalExpense.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
          Aksi Cepat Finansial
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => {
              setTxModalType('income');
              setIsTxModalOpen(true);
            }}
            disabled={!canMutate}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 font-semibold text-xs transition disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="leading-tight">Kas Masuk</p>
              <p className="text-[10px] font-normal text-emerald-600">Omzet Harian</p>
            </div>
          </button>

          <button
            onClick={() => {
              setTxModalType('expense');
              setIsTxModalOpen(true);
            }}
            disabled={!canMutate}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 text-rose-800 font-semibold text-xs transition disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="leading-tight">Kas Keluar</p>
              <p className="text-[10px] font-normal text-rose-600">Beban / Belanja</p>
            </div>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            disabled={!canMutate || wallets.length < 2}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 text-blue-800 font-semibold text-xs transition disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="leading-tight">Transfer Dompet</p>
              <p className="text-[10px] font-normal text-blue-600">Pindah Kas Internal</p>
            </div>
          </button>

          <button
            onClick={() => setIsCapitalModalOpen(true)}
            disabled={!canMutate}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-800 font-semibold text-xs transition disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="leading-tight">Setor Modal</p>
              <p className="text-[10px] font-normal text-indigo-600">Ekuitas Modal</p>
            </div>
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <WalletIcon className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Dompet & Rekening Kas ({wallets.length})
            </h3>
          </div>
          {canMutate && (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Dompet</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-xs text-slate-500 font-medium">{wallet.name}</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  Rp {wallet.balance.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                <WalletIcon className="w-4 h-4" />
              </div>
            </div>
          ))}

          {wallets.length === 0 && (
            <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
              Belum ada dompet kas terdaftar. Silakan tambahkan dompet kas pertama Anda.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Riwayat Mutasi Kas</h3>
            <p className="text-xs text-slate-500">
              Menampilkan {transactions.length} mutasi terbaru
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setDateRange('today')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  dateRange === 'today' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setDateRange('month')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  dateRange === 'month' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  dateRange === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Semua
              </button>
            </div>

            <select
              value={selectedWalletFilter}
              onChange={(e) => setSelectedWalletFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white"
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
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white"
            >
              <option value="">Semua Jenis</option>
              <option value="income">Kas Masuk</option>
              <option value="expense">Kas Keluar</option>
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
              Tidak ada catatan transaksi pada filter ini.
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
        defaultType={txModalType}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={fetchData}
      />
      <CreateWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSuccess={fetchData}
      />
      <TransferWalletModal
        isOpen={isTransferModalOpen}
        wallets={wallets}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={fetchData}
      />
      <CreateCapitalModal
        isOpen={isCapitalModalOpen}
        wallets={wallets}
        onClose={() => setIsCapitalModalOpen(false)}
        onSuccess={fetchData}
      />
      <CreateAdvanceModal
        isOpen={isAdvanceModalOpen}
        staffList={staffList}
        wallets={wallets}
        onClose={() => setIsAdvanceModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
