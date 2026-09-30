'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  Building2,
  Calendar,
  DollarSign,
  Printer,
  AlertCircle,
  RefreshCw,
  Wallet,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import PayslipDetailModal from '@/components/modals/PayslipDetailModal';

interface MyPayslipItem {
  id: string;
  storeId: string;
  storeName: string;
  staffName: string;
  period: string;
  baseSalarySnapshot: number;
  allowanceSnapshot: number;
  bonus: number;
  advanceDeduction: number;
  netPayout: number;
  paidAt: string;
}

export default function MyPayslipsTab() {
  const { user } = useStore();
  const [payslips, setPayslips] = useState<MyPayslipItem[]>([]);
  const [hasLinkedStaff, setHasLinkedStaff] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchPayslips = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/staff/my-payslips');
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Gagal memuat slip gaji saya.');
        return;
      }

      setHasLinkedStaff(Boolean(data.hasLinkedStaff));
      setPayslips(data.payslips || []);
    } catch {
      setError('Terjadi kendala jaringan saat memuat data slip gaji.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPeriod = (periodStr: string) => {
    if (!periodStr) return '';
    const [year, month] = periodStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const handleOpenDetail = (payslipId: string, storeId: string) => {
    setSelectedPayslipId(payslipId);
    setSelectedStoreId(storeId);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Staff Self-Service</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Slip Gaji Saya
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Arsip digital slip gaji resmi dari seluruh unit usaha yang terhubung dengan akun @{user?.username || 'anda'}.
          </p>
        </div>

        <button
          onClick={fetchPayslips}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-8 bg-slate-100 rounded w-2/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Not Linked State */}
      {!isLoading && !hasLinkedStaff && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-8 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-amber-950 mb-1">
            Belum Tertaut Sebagai Staf
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed mb-4">
            Akun Anda dengan username <strong className="font-mono">@{user?.username}</strong> belum ditautkan ke data staf di toko manapun.
          </p>
          <p className="text-xs text-amber-700/80 bg-white/80 p-3 rounded-xl border border-amber-200/50">
            Mintalah Owner atau Admin toko Anda untuk mendaftarkan akun Anda di menu <strong>Gaji & Staf &gt; Tambah Staf Baru</strong> menggunakan username Anda.
          </p>
        </div>
      )}

      {/* Has Linked Staff but 0 Payslips */}
      {!isLoading && hasLinkedStaff && payslips.length === 0 && (
        <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-200 max-w-lg mx-auto">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            Belum Ada Slip Gaji Terbit
          </h3>
          <p className="text-xs text-slate-500">
            Slip gaji bulanan Anda akan otomatis muncul di sini begitu diselesaikan oleh Admin toko.
          </p>
        </div>
      )}

      {/* Payslips Grid */}
      {!isLoading && payslips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {payslips.map((p) => {
            const gross = p.baseSalarySnapshot + p.allowanceSnapshot + p.bonus;

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top: Store & Period */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm">
                        <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{p.storeName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Periode: {formatPeriod(p.period)}</span>
                      </div>
                    </div>

                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Lunas
                    </span>
                  </div>

                  {/* Net Payout Callout */}
                  <div className="bg-emerald-50/60 rounded-2xl p-3.5 mb-3.5 border border-emerald-100/80">
                    <span className="text-[11px] font-semibold text-emerald-800 block mb-0.5">
                      Take Home Pay (Gaji Bersih)
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                      {formatIDR(p.netPayout)}
                    </span>
                  </div>

                  {/* Breakdown details */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">Total Kotor</span>
                      <span className="font-bold text-slate-800">{formatIDR(gross)}</span>
                    </div>

                    <div className="bg-red-50/60 p-2.5 rounded-xl border border-red-100">
                      <span className="text-[10px] text-red-500 block">Potongan Kasbon</span>
                      <span className="font-bold text-red-700">
                        {p.advanceDeduction > 0 ? `- ${formatIDR(p.advanceDeduction)}` : 'Rp 0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2">
                  <button
                    onClick={() => handleOpenDetail(p.id, p.storeId)}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Lihat Rincian & Cetak PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <PayslipDetailModal
        isOpen={isDetailOpen}
        payslipId={selectedPayslipId}
        storeId={selectedStoreId}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedPayslipId(null);
          setSelectedStoreId(null);
        }}
      />
    </div>
  );
}
