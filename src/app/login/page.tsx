'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Wallet,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Receipt,
  Users,
  Coins,
} from 'lucide-react';

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoName, setDemoName] = useState('');
  const [showDemoForm, setShowDemoForm] = useState(false);

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    signIn('google', { callbackUrl: '/' });
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoEmail) return;
    setIsSubmitting(true);
    await signIn('demo-login', {
      email: demoEmail.trim().toLowerCase(),
      name: demoName.trim() || demoEmail.split('@')[0],
      callbackUrl: '/',
    });
  };

  const handleQuickDemo = async (email: string, name: string) => {
    setIsSubmitting(true);
    await signIn('demo-login', {
      email,
      name,
      callbackUrl: '/',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Brand */}
      <div className="relative z-10 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/30">
            T
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-none">
              Ticco
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Cash Flow Tracker
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Multi-Store Scoped RBAC</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-6xl mx-auto w-full my-auto py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Value Props */}
        <div className="lg:col-span-7 space-y-6 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>PWA Pencatatan Kas & Finansial Bisnis</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Pemisahan Tegas Antara <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Modal, Omzet & Gaji Staf.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            Hentikan kerancuan laba-rugi semu. Pantau ekuitas modal dan porsi kepemilikan, kontrol mutasi multi-dompet dengan query atomik, dan kelola kasbon staf dengan proteksi snapshot freeze.
          </p>

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-800/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
              <Coins className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xs font-bold text-white mb-1">Equity Tracker</h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Rasio modal terisolasi dari kas harian.
              </p>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
              <TrendingUp className="w-5 h-5 text-teal-400 mb-2" />
              <h4 className="text-xs font-bold text-white mb-1">Atomic Balance</h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Cegah saldo minus dengan validasi atomik.
              </p>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50">
              <Receipt className="w-5 h-5 text-cyan-400 mb-2" />
              <h4 className="text-xs font-bold text-white mb-1">Snapshot Payroll</h4>
              <p className="text-[11px] text-slate-400 leading-tight">
                Potong kasbon otomatis & kunci slip gaji.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="text-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Masuk ke Ticco</h3>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan akun Google resmi atau mode demo instan
              </p>
            </div>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-800 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-3 shadow-xs active:scale-[0.98] disabled:opacity-50 mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400">
                  atau coba mode demo lokal
                </span>
              </div>
            </div>

            {/* Quick Demo Buttons */}
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => handleQuickDemo('owner@ticco.local', 'Bapak Hadi (Owner)')}
                disabled={isSubmitting}
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-between"
              >
                <span>Demo Akun Owner (Bapak Hadi)</span>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin@ticco.local', 'Rian (Admin Operasional)')}
                disabled={isSubmitting}
                className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center justify-between"
              >
                <span>Demo Akun Admin (Rian)</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('viewer@ticco.local', 'Ibu Linda (Viewer)')}
                disabled={isSubmitting}
                className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-between"
              >
                <span>Demo Viewer (Ibu Linda)</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Custom Demo form toggle */}
            {!showDemoForm ? (
              <button
                type="button"
                onClick={() => setShowDemoForm(true)}
                className="w-full text-center text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition"
              >
                + Masuk dengan email demo kustom
              </button>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Email Pengguna
                  </label>
                  <input
                    type="email"
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    required
                    placeholder="nama@ticco.local"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nama Tampilan
                  </label>
                  <input
                    type="text"
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  {isSubmitting ? 'Memproses...' : 'Masuk Sekarang'}
                </button>
              </form>
            )}

            <p className="text-[10px] text-center text-slate-400 mt-5 leading-normal">
              Dengan masuk, data Anda diisolasi per-toko sesuai peran yang ditentukan oleh pemilik unit usaha.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-xs text-slate-500 py-3">
        Ticco PWA &copy; {new Date().getFullYear()} &bull; Arus Kas & Ekuitas Operasional Bisnis
      </div>
    </div>
  );
}
