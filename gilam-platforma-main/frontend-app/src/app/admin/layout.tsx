'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { getUser } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
      setTimeout(() => router.replace('/'), 0);
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-72 flex flex-col">
        <Topbar />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
