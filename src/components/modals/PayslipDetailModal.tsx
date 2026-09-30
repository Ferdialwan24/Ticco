'use client';

import React, { useEffect, useState } from 'react';
import { X, Printer, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface AdvanceItem {
  id: string;
  amount: number;
  date: string;
  notes: string;
}

interface PayslipData {
  id: string;
  storeName: string;
  staffName: string;
  period: string;
  baseSalarySnapshot: number;
  allowanceSnapshot: number;
  bonus: number;
  grossEarnings: number;
  advanceDeduction: number;
  netPayout: number;
  paymentWalletName: string;
  paidAt: string;
  advances: AdvanceItem[];
}

interface PayslipDetailModalProps {
  isOpen: boolean;
  payslipId: string | null;
  storeId?: string | null;
  onClose: () => void;
}

export default function PayslipDetailModal({
  isOpen,
  payslipId,
  storeId,
  onClose,
}: PayslipDetailModalProps) {
  const { currentStore } = useStore();
  const targetStoreId = storeId || currentStore?.id;
  const [data, setData] = useState<PayslipData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !payslipId || !targetStoreId) return;

    async function fetchDetail() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/stores/${targetStoreId}/payslips/${payslipId}`);
        const resData = await res.json();
        if (!res.ok) {
          setError(resData.message || 'Gagal memuat rincian slip gaji.');
          return;
        }
        setData(resData.payslip);
      } catch {
        setError('Terjadi kendala jaringan.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetail();
  }, [isOpen, payslipId, targetStoreId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatPeriod = (p?: string) => {
    if (!p) return '';
    const [year, month] = p.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden my-auto">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Slip Gaji Digital</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!data}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              <Printer className="w-4 h-4" />
              Cetak / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading && (
            <div className="py-12 text-center text-slate-400 text-sm">
              Memuat data slip gaji...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <div className="space-y-6 printable-payslip">
              <div className="text-center pb-5 border-b border-dashed border-slate-200">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                  {data.storeName}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">SLIP GAJI KARYAWAN</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Periode: {formatPeriod(data.period)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Nama Karyawan</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{data.staffName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Tanggal Pelunasan</p>
                  <p className="font-medium text-slate-700 text-xs mt-0.5">
                    {new Date(data.paidAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Metode / Sumber Dana</p>
                  <p className="font-medium text-slate-700 text-xs mt-0.5">{data.paymentWalletName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase">Status Pembayaran</p>
                  <p className="font-bold text-emerald-600 flex items-center gap-1 text-xs mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Lunas & Tuntas
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Rincian Penghasilan
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Gaji Pokok</span>
                    <span className="font-semibold text-slate-800">
                      Rp {data.baseSalarySnapshot.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Tunjangan Operasional</span>
                    <span className="font-semibold text-slate-800">
                      Rp {data.allowanceSnapshot.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {data.bonus > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Bonus / Insentif</span>
                      <span className="font-semibold text-emerald-600">
                        + Rp {data.bonus.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 font-bold bg-slate-50/80 px-2 rounded-lg">
                    <span className="text-slate-700">Total Penghasilan Kotor</span>
                    <span className="text-slate-900">
                      Rp {data.grossEarnings.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Rincian Potongan Kasbon
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {data.advances.length} transaksi kasbon
                  </span>
                </div>

                {data.advances.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">Tidak ada potongan kasbon periode ini.</p>
                ) : (
                  <div className="space-y-1.5 text-xs bg-rose-50/40 p-3 rounded-2xl border border-rose-100">
                    {data.advances.map((adv) => (
                      <div key={adv.id} className="flex justify-between items-center py-0.5">
                        <span className="text-slate-600 truncate max-w-[200px]">
                          {adv.notes || 'Kasbon'} (
                          {new Date(adv.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          )
                        </span>
                        <span className="font-medium text-rose-700 shrink-0">
                          - Rp {adv.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1.5 mt-1 border-t border-rose-200/60 font-bold text-rose-900 text-sm">
                      <span>Total Potongan Kasbon</span>
                      <span>- Rp {data.advanceDeduction.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-emerald-900 text-white rounded-2xl flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-xs text-emerald-200/90 font-medium">Sisa Transfer Bersih (Take Home Pay)</p>
                  <p className="text-2xl font-black tracking-tight mt-0.5">
                    Rp {data.netPayout.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                </div>
              </div>

              <div className="text-center pt-2 text-[11px] text-slate-400">
                <p>Dokumen ini dibuat otomatis oleh sistem <strong>Ticco: Cash Flow Tracker</strong>.</p>
                <p>Data nominal terkunci permanen melalui Freeze Snapshot Engine.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
