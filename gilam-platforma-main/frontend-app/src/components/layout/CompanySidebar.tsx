'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { getUser, removeToken } from '@/lib/api';
import {
  MdDashboard,
  MdShoppingCart,
  MdLocalShipping,
  MdPeople,
  MdLogout,
  MdStore,
  MdAssessment,
} from 'react-icons/md';

const companyLinks = [
  { name: 'Asosiy Oyna', href: '/company', icon: MdDashboard, exact: true },
  { name: 'Buyurtmalar', href: '/company/orders', icon: MdShoppingCart },
  { name: 'Mijozlar', href: '/company/customers', icon: MdPeople },
  { name: 'Xisobotlar', href: '/company/finance', icon: MdAssessment },
  { name: 'Haydovchilar liniyasi', href: '/company/logistics', icon: MdLocalShipping },
  { name: 'Xodimlar', href: '/company/staff', icon: MdPeople },
  { name: 'Mening Korxonam', href: '/company/settings', icon: MdStore, exact: true },
];

export default function CompanySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [companyName, setCompanyName] = useState('Korxona');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user?.company?.name) {
       setCompanyName(user.company.name);
    } else if (user?.fullName) {
       setCompanyName(user.fullName);
    }
  }, []);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    removeToken();
    router.push('/company/login');
  };

  return (
    <aside className="w-72 bg-indigo-950 border-r border-indigo-900 text-indigo-100 flex flex-col h-screen fixed left-0 top-0 shadow-2xl z-20">
      <div className="h-16 flex items-center px-6 border-b border-indigo-900/50 bg-indigo-950/50">
        <h1 className="text-base font-bold text-white flex items-center gap-2 truncate">
          <span className="text-xl shrink-0">✨</span>
          <span className="truncate">{companyName}</span>
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <p className="px-4 text-xs font-semibold text-indigo-400/60 uppercase tracking-widest mb-4">
          Boshqaruv
        </p>
        
        {companyLinks.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : (pathname === link.href || pathname.startsWith(`${link.href}/`));
          const Icon = link.icon;

          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-indigo-600/20 text-white font-semibold shadow-inner shadow-indigo-500/10'
                  : 'text-indigo-200/70 hover:bg-indigo-900/50 hover:text-white'
              )}
            >
              <Icon className={cn(
                'text-xl transition-transform duration-200 group-hover:scale-110',
                isActive ? 'text-indigo-400' : 'text-indigo-400/50 group-hover:text-indigo-300'
              )} />
              {link.name}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-indigo-900/50 bg-indigo-950/80 backdrop-blur-sm">
        <button 
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors group"
        >
          <MdLogout className="text-xl group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Tizimdan chiqish</span>
        </button>
      </div>

      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="Tizimdan chiqish">
        <div className="space-y-6">
          <p className="text-slate-600 font-medium">
            Siz haqiqatan ham tizimdan (akkauntdan) chiqmoqchimisiz?
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              Yo&apos;q, qolaman
            </button>
            <button 
              onClick={confirmLogout}
              className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all font-black hover:-translate-y-1"
            >
              Ha, chiqish
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
