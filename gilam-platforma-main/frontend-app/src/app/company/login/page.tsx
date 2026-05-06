'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /company/login endi ishlatilmaydi.
 * Barcha kompaniya loginlari asosiy sahifaga (/) yo'naltiriladi.
 */
export default function CompanyLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
