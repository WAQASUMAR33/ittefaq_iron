'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SaleReturnsPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem('openSaleReturnCreate', '1');
    } catch (e) {
      // ignore storage errors
    }
    router.replace('/dashboard/sales');
  }, [router]);

  return null;
}


