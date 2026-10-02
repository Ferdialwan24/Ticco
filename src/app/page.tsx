'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import Header from '@/components/Header';
import Navigation, { ActiveTab } from '@/components/Navigation';
import OfflineBanner from '@/components/OfflineBanner';
import OnboardingModal from '@/components/OnboardingModal';
import CreateStoreModal from '@/components/modals/CreateStoreModal';
import DashboardTab from '@/components/tabs/DashboardTab';
import WalletsTab from '@/components/tabs/WalletsTab';
import CapitalTab from '@/components/tabs/CapitalTab';
import PayrollTab from '@/components/tabs/PayrollTab';
import MyPayslipsTab from '@/components/tabs/MyPayslipsTab';
import SettingsTab from '@/components/tabs/SettingsTab';
import { Store, Plus, Sparkles, Shield, User, Copy, Check } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, stores, currentStore, isLoading } = useStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [hasLinkedStaff, setHasLinkedStaff] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);

  // Check if current user is linked to any staff record for self-service payslip tab
  useEffect(() => {
    if (user) {
      fetch('/api/staff/my-payslips')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.hasLinkedStaff) {
            setHasLinkedStaff(true);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Auth redirect
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // Loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-emerald-600/30 animate-pulse mb-4">
          T
        </div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">Memuat Ticco...</p>
        <p className="text-xs text-slate-400 mt-1">Menyiapkan buku kas & pembukuan operasional</p>
      </div>
    );
  }

  const handleCopyUsername = () => {
    if (user?.username) {
      navigator.clipboard.writeText(user.username);
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Offline Alert Bar */}
      <OfflineBanner />

      {/* Mandatory Onboarding Modal if no username set */}
      <OnboardingModal />

      {/* Main App Layout */}
      {stores.length > 0 ? (
        <>
          <Header onOpenCreateStore={() => setIsCreateStoreOpen(true)} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Navigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              hasLinkedStaff={hasLinkedStaff}
            />

            {/* Tab Views */}
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'wallets' && <WalletsTab />}
            {activeTab === 'capital' && <CapitalTab />}
            {activeTab === 'payroll' && <PayrollTab />}
            {activeTab === 'my-payslips' && <MyPayslipsTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </main>
        </>
      ) : (
        /* Empty State: No Stores Yet */
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-xl border border-slate-100 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
              <Store className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Selamat Datang di Ticco</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Mulai Pembukuan Unit Bisnis Anda
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Anda belum memiliki atau tergabung dalam unit bisnis manapun. Buat toko pertama Anda atau bagikan username Anda ke pemilik unit bisnis.
              </p>
            </div>

            {/* Shareable Username Card */}
            {user.username && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Username Anda untuk Menerima Undangan Toko:
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-black text-emerald-700">
                    @{user.username}
                  </span>
                  <button
                    onClick={handleCopyUsername}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
                  >
                    {copiedUsername ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setIsCreateStoreOpen(true)}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.99]"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Unit Toko Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Store Modal */}
      <CreateStoreModal
        isOpen={isCreateStoreOpen}
        onClose={() => setIsCreateStoreOpen(false)}
      />
    </div>
  );
}
