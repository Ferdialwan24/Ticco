'use client';

import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Smartphone } from 'lucide-react';

export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
  bgHex: string;
  textHex: string;
  accentHex?: string;
}

// 6 Bank Resmi: BCA, BNI, MANDIRI, BRI, JAGO, BSI
export const SUPPORTED_BANKS: BankInfo[] = [
  {
    code: 'bca',
    name: 'BCA (Bank Central Asia)',
    shortName: 'BCA',
    bgHex: '#005baa',
    textHex: '#ffffff',
  },
  {
    code: 'bni',
    name: 'BNI (Bank Negara Indonesia)',
    shortName: 'BNI',
    bgHex: '#005e6a',
    textHex: '#ffffff',
    accentHex: '#f15a24',
  },
  {
    code: 'mandiri',
    name: 'Bank Mandiri',
    shortName: 'Mandiri',
    bgHex: '#003d79',
    textHex: '#ffffff',
    accentHex: '#fdb813',
  },
  {
    code: 'bri',
    name: 'BRI (Bank Rakyat Indonesia)',
    shortName: 'BRI',
    bgHex: '#00529c',
    textHex: '#ffffff',
    accentHex: '#ff6200',
  },
  {
    code: 'jago',
    name: 'Bank Jago',
    shortName: 'Jago',
    bgHex: '#56358c',
    textHex: '#fdb813',
  },
  {
    code: 'bsi',
    name: 'BSI (Bank Syariah Indonesia)',
    shortName: 'BSI',
    bgHex: '#00a39d',
    textHex: '#ffffff',
    accentHex: '#e5a823',
  },
];

export function getBankInfo(code?: string): BankInfo | undefined {
  if (!code) return undefined;
  return SUPPORTED_BANKS.find((b) => b.code.toLowerCase() === code.toLowerCase());
}

// Icon SVG Uang Segepok (Bundle of Cash Banknotes)
export function CashStackIcon({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = {
    sm: 'w-7 h-5',
    md: 'w-9 h-6',
    lg: 'w-12 h-8',
  };

  return (
    <svg
      viewBox="0 0 36 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${dimensions[size]} shrink-0 drop-shadow-xs`}
    >
      <title>Uang Tunai (Segepok)</title>
      {/* Lembar Uang Paling Belakang (Ketiga) */}
      <rect
        x="6"
        y="1"
        width="28"
        height="15"
        rx="2"
        fill="#047857"
        stroke="#065f46"
        strokeWidth="1"
      />
      {/* Lembar Uang Tengah (Kedua) */}
      <rect
        x="3.5"
        y="5"
        width="28"
        height="15"
        rx="2"
        fill="#059669"
        stroke="#047857"
        strokeWidth="1"
      />
      {/* Lembar Uang Depan (Pertama) */}
      <rect
        x="1"
        y="9"
        width="28"
        height="16"
        rx="2.5"
        fill="#10b981"
        stroke="#059669"
        strokeWidth="1.2"
      />
      {/* Garis Border Dalam Uang Depan */}
      <rect
        x="2.8"
        y="10.8"
        width="24.4"
        height="12.4"
        rx="1.5"
        stroke="#6ee7b7"
        strokeWidth="0.75"
        strokeDasharray="2 1.5"
      />
      {/* Lingkaran Lambang Nilai Uang */}
      <circle cx="15" cy="17" r="3.2" fill="#047857" />
      <circle cx="15" cy="17" r="2.2" fill="#34d399" />
      {/* Ornamen sudut uang */}
      <circle cx="5" cy="13" r="0.8" fill="#a7f3d0" />
      <circle cx="25" cy="13" r="0.8" fill="#a7f3d0" />
      <circle cx="5" cy="21" r="0.8" fill="#a7f3d0" />
      <circle cx="25" cy="21" r="0.8" fill="#a7f3d0" />
      {/* Pita Pengikat Uang Segepok (Currency Band) */}
      <rect
        x="12"
        y="1"
        width="6"
        height="24"
        rx="1"
        fill="#fef08a"
        stroke="#ca8a04"
        strokeWidth="0.9"
      />
      <line x1="12" y1="9" x2="18" y2="9" stroke="#b45309" strokeWidth="0.6" />
      <line x1="12" y1="17" x2="18" y2="17" stroke="#b45309" strokeWidth="0.6" />
    </svg>
  );
}

// Mendukung berbagai format file gambar
const CANDIDATE_EXTENSIONS = ['png', 'svg', 'jpg', 'jpeg', 'webp', 'png.png'];

interface WalletBadgeProps {
  type?: 'cash' | 'bank' | 'ewallet';
  bankCode?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export default function WalletBadge({
  type = 'cash',
  bankCode,
  size = 'md',
  className = '',
  showLabel = false,
}: WalletBadgeProps) {
  const [extIndex, setExtIndex] = useState(0);
  const [allExtFailed, setAllExtFailed] = useState(false);

  useEffect(() => {
    setExtIndex(0);
    setAllExtFailed(false);
  }, [type, bankCode]);

  const handleImageError = () => {
    if (extIndex < CANDIDATE_EXTENSIONS.length - 1) {
      setExtIndex((prev) => prev + 1);
    } else {
      setAllExtFailed(true);
    }
  };

  // Ukuran Tanpa Bingkai (Frameless & Besar): Logo dapat bernapas dan proporsional
  const imageSizeClasses = {
    sm: 'h-6 sm:h-7 w-auto min-w-[36px] max-w-[76px]',
    md: 'h-8 sm:h-9 w-auto min-w-[48px] max-w-[104px]',
    lg: 'h-11 sm:h-12 w-auto min-w-[64px] max-w-[140px]',
  };

  // Ukuran Cadangan (Jika gambar belum ada)
  const fallbackSizeClasses = {
    sm: 'w-14 h-7 text-[10px]',
    md: 'w-16 h-9 text-xs',
    lg: 'w-24 h-13 text-sm',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // 1. KAS TUNAI (Menggunakan Logo Uang Segepok Tanpa Tulisan "Tunai")
  if (type === 'cash') {
    const currentSrc = `/images/banks/cash.${CANDIDATE_EXTENSIONS[extIndex]}`;

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {!allExtFailed ? (
          <div
            className={`${imageSizeClasses[size]} flex items-center justify-center shrink-0 overflow-hidden`}
            title="Kas Tunai"
          >
            <img
              src={currentSrc}
              alt="Kas Tunai"
              className="h-full w-auto max-w-full object-contain"
              onError={handleImageError}
            />
          </div>
        ) : (
          <CashStackIcon size={size} />
        )}
        {showLabel && <span className="font-bold text-xs text-slate-800">Kas Tunai</span>}
      </div>
    );
  }

  // 2. BANK (BCA, BNI, MANDIRI, BRI, JAGO, BSI) - Tanpa Bingkai, Logo Lebih Besar
  if (type === 'bank') {
    const cleanCode = (bankCode || 'bca').toLowerCase();
    const bank = getBankInfo(cleanCode) || {
      code: cleanCode,
      name: cleanCode.toUpperCase(),
      shortName: cleanCode.toUpperCase(),
      bgHex: '#1e293b',
      textHex: '#ffffff',
    };

    const currentSrc = `/images/banks/${cleanCode}.${CANDIDATE_EXTENSIONS[extIndex]}`;

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {!allExtFailed ? (
          <div
            className={`${imageSizeClasses[size]} flex items-center justify-center shrink-0 overflow-hidden`}
            title={bank.name}
          >
            <img
              src={currentSrc}
              alt={bank.shortName}
              className="h-full w-auto max-w-full object-contain"
              onError={handleImageError}
            />
          </div>
        ) : (
          <div
            style={{ backgroundColor: bank.bgHex, color: bank.textHex }}
            className={`${fallbackSizeClasses[size]} flex items-center justify-center font-black tracking-wider shadow-xs shrink-0 select-none rounded-lg relative overflow-hidden`}
            title={bank.name}
          >
            <span className="leading-none text-center font-black uppercase px-1">
              {bank.shortName}
            </span>
            {bank.accentHex && (
              <div
                style={{ backgroundColor: bank.accentHex }}
                className="absolute bottom-0 inset-x-0 h-0.5"
              />
            )}
          </div>
        )}
        {showLabel && <span className="font-bold text-xs text-slate-800">{bank.name}</span>}
      </div>
    );
  }

  // 3. E-WALLET - Tanpa Bingkai
  if (type === 'ewallet') {
    const currentSrc = `/images/banks/ewallet.${CANDIDATE_EXTENSIONS[extIndex]}`;

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {!allExtFailed ? (
          <div
            className={`${imageSizeClasses[size]} flex items-center justify-center shrink-0 overflow-hidden`}
            title="E-Wallet"
          >
            <img
              src={currentSrc}
              alt="E-Wallet"
              className="h-full w-auto max-w-full object-contain"
              onError={handleImageError}
            />
          </div>
        ) : (
          <div
            className={`${fallbackSizeClasses[size]} bg-sky-600 text-white flex items-center justify-center gap-1 font-black shadow-xs shrink-0 rounded-lg select-none`}
            title="E-Wallet"
          >
            <Smartphone className={iconSizes[size]} />
            <span className="leading-none text-[9px] font-black uppercase tracking-wider">E-WLT</span>
          </div>
        )}
        {showLabel && <span className="font-bold text-xs text-slate-800">E-Wallet</span>}
      </div>
    );
  }

  return (
    <div className="h-8 w-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0">
      <WalletIcon className="w-4 h-4" />
    </div>
  );
}
