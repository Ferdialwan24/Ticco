'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  HandCoins,
  Receipt,
  Plus,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import CreateStaffModal from '../modals/CreateStaffModal';
import CreateAdvanceModal from '../modals/CreateAdvanceModal';
import PayslipDetailModal from '../modals/PayslipDetailModal';

interface StaffItem {
  id: string;
  name: string;
  baseSalary: number;
  allowances: number;
  status: 'active' | 'inactive';
  linkedUser?: {
    id: string;
    name: string;
    username: string;
  } | null;
}

interface AdvanceItem {
  id: string;
  staffName: string;
  amount: number;
  walletName: string;
  date: string;
  status: 'unsettled' | 'settled';
  settledAtPeriod?: string;
  notes: string;
}

interface PayslipSummary {
  id: string;
  staffName: string;
  period: string;
  baseSalarySnapshot: number;
  allowanceSnapshot: number;
  bonus: number;
  advanceDeduction: number;
  netPayout: number;
  paymentWalletName: string;
  paidAt: string;
}

interface WalletItem {
  id: string;
  name: string;
  balance: number;
}

interface PayrollPreview {
  staffId: string;
  staffName: string;
  period: string;
  baseSalary: number;
  allowances: number;
  bonus: number;
  advanceDeduction: number;
  netPayout: number;
  unsettledAdvances: Array<{
    id: string;
    amount: number;
    date: string;
    notes: string;
  }>;
}

export default function PayrollTab() {
  const { currentStore, isOffline } = useStore();
  const [subTab, setSubTab] = useState<'payroll' | 'advances' | 'payslips' | 'staff'>('payroll');

  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [advances, setAdvances] = useState<AdvanceItem[]>([]);
  const [payslips, setPayslips] = useState<PayslipSummary[]>([]);
  const [wallets, setWallets] = useState<WalletItem[]>([]);

  const currentMonthPeriod = new Date().toISOString().slice(0, 7);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonthPeriod);
  const [bonusInput, setBonusInput] = useState('');
  const [paymentWalletId, setPaymentWalletId] = useState('');
  const [payrollPreview, setPayrollPreview] = useState<PayrollPreview | null>(null);
  const [isAlreadyPaid, setIsAlreadyPaid] = useState(false);
  const [existingPaidSlip, setExistingPaidSlip] = useState<any>(null);
  const [isSubmittingPayroll, setIsSubmittingPayroll] = useState(false);
  const [payrollFeedback, setPayrollFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [viewPayslipId, setViewPayslipId] = useState<string | null>(null);

  const isViewer = currentStore?.role === 'viewer';
  const canMutate = !isViewer && !isOffline;

  const refreshAllData = useCallback(async () => {
    if (!currentStore) return;
    try {
      const [sRes, aRes, pRes, wRes] = await Promise.all([
        fetch(`/api/stores/${currentStore.id}/staff`),
        fetch(`/api/stores/${currentStore.id}/advances`),
        fetch(`/api/stores/${currentStore.id}/payslips`),
        fetch(`/api/stores/${currentStore.id}/wallets`),
      ]);

      if (sRes.ok) {
        const sData = await sRes.json();
        setStaffList(sData.staff || []);
        if (sData.staff?.length > 0 && !selectedStaffId) {
          setSelectedStaffId(sData.staff[0].id);
        }
      }

      if (aRes.ok) {
        const aData = await aRes.json();
        setAdvances(aData.advances || []);
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        setPayslips(pData.payslips || []);
      }

      if (wRes.ok) {
        const wData = await wRes.json();
        setWallets(wData.wallets || []);
        if (wData.wallets?.length > 0 && !paymentWalletId) {
          setPaymentWalletId(wData.wallets[0].id);
        }
      }
    } catch (err) {
      console.error('Refresh error:', err);
    }
  }, [currentStore, selectedStaffId, paymentWalletId]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const fetchPreview = useCallback(async () => {
    if (!currentStore || !selectedStaffId || !selectedPeriod) return;

    try {
      setPayrollFeedback(null);
      const bonusNum = parseFloat(bonusInput.replace(/[^0-9]/g, '')) || 0;
      const res = await fetch(
        `/api/stores/${currentStore.id}/payroll?staffId=${selectedStaffId}&period=${selectedPeriod}&bonus=${bonusNum}`
      );
      const data = await res.json();

      if (data.isAlreadyPaid) {
        setIsAlreadyPaid(true);
        setExistingPaidSlip(data.payslip);
        setPayrollPreview(null);
      } else {
        setIsAlreadyPaid(false);
        setExistingPaidSlip(null);
        setPayrollPreview(data.preview);
      }
    } catch (err) {
      console.error('Payroll preview error:', err);
    }
  }, [currentStore, selectedStaffId, selectedPeriod, bonusInput]);

  useEffect(() => {
    if (subTab === 'payroll') {
      fetchPreview();
    }
  }, [subTab, fetchPreview]);

  const handleApprovePayroll = async () => {
    if (!currentStore || !selectedStaffId || !selectedPeriod || !paymentWalletId) return;

    try {
      setIsSubmittingPayroll(true);
      setPayrollFeedback(null);

      const bonusNum = parseFloat(bonusInput.replace(/[^0-9]/g, '')) || 0;
      const res = await fetch(`/api/stores/${currentStore.id}/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaffId,
          period: selectedPeriod,
          bonus: bonusNum,
          paymentWalletId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPayrollFeedback({ type: 'error', message: data.message || 'Gagal menyelesaikan gaji.' });
        return;
      }

      setPayrollFeedback({
        type: 'success',
        message: 'Gaji berhasil diselesaikan! Snapshot slip gaji terkunci permanen.',
      });

      await refreshAllData();
      await fetchPreview();
    } catch {
      setPayrollFeedback({ type: 'error', message: 'Terjadi kendala jaringan.' });
    } finally {
      setIsSubmittingPayroll(false);
    }
  };

  const selectedWallet = wallets.find((w) => w.id === paymentWalletId);

  return (
    <div className="space-y-5">
      <div className="flex bg-slate-200/80 p-1 rounded-2xl overflow-x-auto gap-1">
        <button
          onClick={() => setSubTab('payroll')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'payroll'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          Hitung & Selesaikan Gaji
        </button>
        <button
          onClick={() => setSubTab('advances')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'advances'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HandCoins className="w-3.5 h-3.5" />
          Kasbon ({advances.filter((a) => a.status === 'unsettled').length} Berjalan)
        </button>
        <button
          onClick={() => setSubTab('payslips')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'payslips'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Arsip Slip Gaji ({payslips.length})
        </button>
        <button
          onClick={() => setSubTab('staff')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'staff'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Master Karyawan ({staffList.length})
        </button>
      </div>

      {subTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Kalkulator & Eksekusi Payroll Bulanan
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Sistem akan otomatis menghitung pemotongan seluruh kasbon yang belum terselesaikan (unsettled) dan mengunci rincian gaji (Freeze Snapshot Pattern).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Pilih Staf
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status === 'active' ? 'Aktif' : 'Non-aktif'})
                    </option>
                  ))}
                  {staffList.length === 0 && <option value="">Belum ada data staf</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Periode Bulan
                </label>
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Bonus / Insentif (Rp)
                </label>
                <input
                  type="text"
                  value={bonusInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setBonusInput(raw ? Number(raw).toLocaleString('id-ID') : '');
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm"
                />
              </div>
            </div>

            {payrollFeedback && (
              <div
                className={`mb-4 p-3.5 rounded-2xl text-xs sm:text-sm flex items-start gap-2 ${
                  payrollFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {payrollFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>{payrollFeedback.message}</span>
              </div>
            )}

            {isAlreadyPaid && existingPaidSlip && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Gaji Periode Ini Sudah Pernah Diselesaikan
                  </span>
                  <button
                    onClick={() => setViewPayslipId(existingPaidSlip.id)}
                    className="text-xs font-bold text-emerald-700 underline"
                  >
                    Buka Slip Gaji
                  </button>
                </div>
                <p className="text-xs text-amber-800">
                  Pelunasan gaji bersih sebesar <strong>Rp {existingPaidSlip.netPayout.toLocaleString('id-ID')}</strong> telah dibayarkan melalui {existingPaidSlip.paymentWalletName}. Data terkunci aman di arsip payslip.
                </p>
              </div>
            )}

            {!isAlreadyPaid && payrollPreview && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Gaji Pokok Acuan</span>
                    <span className="font-semibold text-slate-800">
                      Rp {payrollPreview.baseSalary.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Tunjangan Operasional</span>
                    <span className="font-semibold text-slate-800">
                      Rp {payrollPreview.allowances.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {payrollPreview.bonus > 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Bonus Tambahan</span>
                      <span className="font-semibold text-emerald-600">
                        + Rp {payrollPreview.bonus.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  <div className="py-1">
                    <div className="flex justify-between text-rose-700 font-semibold mb-1">
                      <span>Potongan Kasbon Berjalan ({payrollPreview.unsettledAdvances.length} transaksi)</span>
                      <span>- Rp {payrollPreview.advanceDeduction.toLocaleString('id-ID')}</span>
                    </div>
                    {payrollPreview.unsettledAdvances.length > 0 && (
                      <div className="bg-rose-50/60 p-2.5 rounded-xl space-y-1 text-xs text-slate-600 border border-rose-100">
                        {payrollPreview.unsettledAdvances.map((adv) => (
                          <div key={adv.id} className="flex justify-between">
                            <span>
                              • {new Date(adv.date).toLocaleDateString('id-ID')} ({adv.notes || 'Kasbon'})
                            </span>
                            <span className="font-medium text-rose-700">
                              - Rp {adv.amount.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t-2 border-slate-300 font-black text-base sm:text-lg">
                    <span className="text-slate-900">Sisa Transfer Riil (Take Home Pay)</span>
                    <span className="text-emerald-700">
                      Rp {payrollPreview.netPayout.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1">
                      Sumber Dompet Pembayaran Transfer Gaji
                    </label>
                    <select
                      value={paymentWalletId}
                      onChange={(e) => setPaymentWalletId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-slate-800 text-sm bg-white"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} (Saldo saat ini: Rp {w.balance.toLocaleString('id-ID')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedWallet && payrollPreview.netPayout > selectedWallet.balance && (
                    <p className="text-xs text-rose-600 font-medium">
                      Peringatan: Saldo {selectedWallet.name} tidak cukup untuk membayar gaji bersih Rp {payrollPreview.netPayout.toLocaleString('id-ID')}.
                    </p>
                  )}

                  <button
                    onClick={handleApprovePayroll}
                    disabled={
                      !canMutate ||
                      isSubmittingPayroll ||
                      (selectedWallet && payrollPreview.netPayout > selectedWallet.balance)
                    }
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {isSubmittingPayroll ? 'Menyelesaikan Gaji...' : 'Approve & Selesaikan Gaji'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Daftar Kasbon Staf ({advances.length})
            </h3>
            {canMutate && (
              <button
                onClick={() => setIsAdvanceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Kasbon Baru</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 divide-y divide-slate-100">
            {advances.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Belum ada catatan kasbon staf.
              </div>
            ) : (
              advances.map((adv) => (
                <div key={adv.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">{adv.staffName}</p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          adv.status === 'unsettled'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {adv.status === 'unsettled' ? 'Belum Dipotong (Berjalan)' : `Lunas (${adv.settledAtPeriod})`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sumber: {adv.walletName} {adv.notes ? `• ${adv.notes}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(adv.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-700 text-sm">
                      Rp {adv.amount.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {subTab === 'payslips' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Arsip Riwayat Slip Gaji ({payslips.length})
          </h3>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 divide-y divide-slate-100">
            {payslips.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Belum ada slip gaji yang diselesaikan.
              </div>
            ) : (
              payslips.map((ps) => (
                <div
                  key={ps.id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">{ps.staffName}</p>
                      <span className="text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg">
                        {ps.period}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gaji Kotor: Rp {(ps.baseSalarySnapshot + ps.allowanceSnapshot + ps.bonus).toLocaleString('id-ID')} • Potongan Kasbon: Rp {ps.advanceDeduction.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Dibayar via {ps.paymentWalletName} pada {new Date(ps.paidAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Take Home Pay</p>
                      <p className="text-sm font-black text-emerald-700">
                        Rp {ps.netPayout.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <button
                      onClick={() => setViewPayslipId(ps.id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      title="Lihat / Cetak Slip Gaji"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {subTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Master Data Karyawan ({staffList.length})
            </h3>
            {canMutate && (
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Karyawan</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {staffList.map((staff) => (
              <div
                key={staff.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-slate-900 text-base">{staff.name}</p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        staff.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {staff.status === 'active' ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Gaji Pokok: <strong>Rp {staff.baseSalary.toLocaleString('id-ID')}</strong></p>
                    <p>Tunjangan: <strong>Rp {staff.allowances.toLocaleString('id-ID')}</strong></p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    {staff.linkedUser ? `@${staff.linkedUser.username}` : 'Belum ditautkan akun'}
                  </span>
                </div>
              </div>
            ))}

            {staffList.length === 0 && (
              <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
                Belum ada data staf terdaftar.
              </div>
            )}
          </div>
        </div>
      )}

      <CreateStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSuccess={refreshAllData}
      />
      <CreateAdvanceModal
        isOpen={isAdvanceModalOpen}
        staffList={staffList}
        wallets={wallets}
        onClose={() => setIsAdvanceModalOpen(false)}
        onSuccess={refreshAllData}
      />
      <PayslipDetailModal
        isOpen={Boolean(viewPayslipId)}
        payslipId={viewPayslipId}
        onClose={() => setViewPayslipId(null)}
      />
    </div>
  );
}
