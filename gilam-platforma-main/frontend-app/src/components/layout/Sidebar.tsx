'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { removeToken } from '@/lib/api';
import {
  MdDashboard,
  MdBusiness,
  MdPeople,
  MdShoppingCart,
  MdSettings,
  MdLogout,
  MdLocalShipping,
  MdSupportAgent,
} from 'react-icons/md';

const superAdminLinks = [
  { name: 'Boshqaruv Paneli', href: '/admin', icon: MdDashboard },
  { name: 'Korxonalar', href: '/admin/companies', icon: MdBusiness },
  { name: 'Operatorlar', href: '/admin/operators', icon: MdSupportAgent },
  { name: 'Foydalanuvchilar', href: '/admin/users', icon: MdPeople },
  { name: 'Buyurtmalar (Kuzatish)', href: '/admin/orders', icon: MdShoppingCart },
  { name: 'Sozlamalar', href: '/admin/settings', icon: MdSettings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    removeToken();
    router.push('/');
  };

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
          <span>💧</span> Gilam SaaS
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Super Admin
        </p>
        
        {superAdminLinks.map((link) => {
          const isBasePath = link.href === '/admin';
          const isActive = isBasePath 
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
                  ? 'bg-blue-600/10 text-blue-400 font-medium' 
                  : 'hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className={cn("text-xl transition-transform group-hover:scale-110", isActive ? 'text-blue-500' : 'text-slate-500')} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <MdLogout className="text-xl" />
          <span>Tizimdan chiqish</span>
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
              Yo'q, qolaman
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
