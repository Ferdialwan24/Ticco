'use client';

import React from 'react';
import { StoreProvider } from '@/context/StoreContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}

export default Providers;
