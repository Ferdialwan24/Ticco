'use client';

import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Coins,
  Receipt,
  Settings,
  FileCheck,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'wallets' | 'capital' | 'payroll' | 'my-payslips' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  hasLinkedStaff?: boolean;
}

export default function Navigation({
  activeTab,
  setActiveTab,
  hasLinkedStaff = false,
}: NavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'wallets', label: 'Dompet', icon: Wallet },
    { id: 'capital', label: 'Modal', icon: Coins },
    { id: 'payroll', label: 'Gaji & Staf', icon: Receipt },
    ...(hasLinkedStaff
      ? [{ id: 'my-payslips', label: 'Slip Saya', icon: FileCheck }]
      : []),
    { id: 'settings', label: 'Toko', icon: Settings },
  ];

  return (
    <>
      <nav className="hidden sm:flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-xs border border-slate-100 max-w-2xl mx-auto mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition min-w-[56px] ${
                  isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition ${
                    isActive ? 'bg-emerald-100 text-emerald-800' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
