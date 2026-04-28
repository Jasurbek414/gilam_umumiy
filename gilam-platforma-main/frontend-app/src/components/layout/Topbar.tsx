'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MdNotifications, MdSearch, MdPayment, MdSettings, MdSecurity, MdDoneAll, MdClose } from 'react-icons/md';
import { useRouter } from 'next/navigation';

import { notificationsApi, getUser } from '@/lib/api';
import { User, Notification } from '@/types';

export default function Topbar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const basePath = user?.role === 'SUPER_ADMIN' ? '/admin' : '/company';
      // Navigate to order page with the search query injected
      // Since NextJS state isn't perfectly persisted on global param changes, we can just push
      router.push(`${basePath}/orders`);
      
      // Using timeout to dispatch a global search event across components if needed,
      // or just trust the new page to pick it up later. For instant cross-page reactivity in current setup:
      setTimeout(() => {
        const fakeInput = document.createElement('input');
        fakeInput.value = searchTerm.trim();
        // Dispatc a custom event that `AdminOrdersPage` or `CompanyOrdersPage` can listen to if needed.
        window.dispatchEvent(new CustomEvent('global-search', { detail: searchTerm.trim() }));
      }, 500);
    }
  };

  const loadNotifications = useCallback(async (currentUser: User) => {
    try {
      let data: Notification[] = [];
      if (currentUser.role === 'SUPER_ADMIN') {
        data = await notificationsApi.getSuperadmin();
      } else if (currentUser.companyId) {
        data = await notificationsApi.getByCompany(currentUser.companyId);
      } else if (currentUser.id) {
        data = await notificationsApi.getByUser(currentUser.id);
      }
      setNotifications(data || []);
    } catch {
      // Sessiya tugagan yoki xato — tinch o'tkazib yuboramiz
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    if (currentUser) {
      loadNotifications(currentUser);
      const interval = setInterval(() => loadNotifications(currentUser), 15000);
      return () => clearInterval(interval);
    }
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = async () => {
    try {
      if (user?.role === 'SUPER_ADMIN') {
        await notificationsApi.markAllAsReadSuperAdmin();
      } else if (user?.companyId) {
        await notificationsApi.markAllAsReadCompany(user.companyId);
      }
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (e) { console.error(e); }
  };

  const markAsRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) { console.error(e); }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return <MdPayment className="text-emerald-500" />;
      case 'security': return <MdSecurity className="text-amber-500" />;
      default: return <MdSettings className="text-blue-500" />;
    }
  };

  return (
    <div className="flex items-center justify-between w-full h-[84px] bg-slate-50/80 backdrop-blur-md px-6 lg:px-8 border-b border-slate-200/60 sticky top-0 z-[10000] gap-3">
      {/* Global Search functionality */}
      <div className="hidden md:flex items-center bg-slate-50 hover:bg-slate-100 focus-within:bg-white focus-within:hover:bg-white rounded-2xl px-5 py-3.5 flex-1 max-w-lg border border-transparent focus-within:border-blue-500/50 focus-within:shadow-[0_8px_30px_-12px_rgba(59,130,246,0.25)] transition-all group">
        <MdSearch className="text-slate-400 group-focus-within:text-blue-500 text-xl flex-shrink-0 transition-colors" />
        <input
          type="text"
          placeholder="Buyurtma ID, mijoz telefoni orqali tezkor qidiruv..."
          className="bg-transparent border-none outline-none font-bold text-[13px] w-full ml-3 text-slate-800 placeholder-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleGlobalSearch}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 ml-2">
            <MdClose className="text-lg" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 lg:gap-6 ml-auto">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 lg:p-2.5 rounded-xl transition-all ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}`}
          >
            <MdNotifications className="text-xl lg:text-2xl" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-[400px] bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-300 origin-top-right z-[100] flex flex-col max-h-[85vh]">
              
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100/50 bg-slate-50/50 flex justify-between items-center z-10 shrink-0">
                <div>
                  <h3 className="font-black text-slate-800 text-[13px] uppercase tracking-[0.15em] relative">
                    BILDIRISHNOMALAR
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    {unreadCount > 0 ? `${unreadCount} ta yangi xabar` : "Hammasi o'qilgan"}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-blue-600 uppercase bg-white border border-blue-100 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-xl transition-all shadow-sm hover:shadow-lg"
                  >
                    <MdDoneAll className="text-lg" /> Barchasini O'qish
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="overflow-y-auto no-scrollbar z-10 flex-1 p-3">
                {notifications.length > 0 ? (
                  <div className="space-y-1.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id, n.isRead)}
                        className={`p-4 rounded-[1.25rem] flex items-start gap-4 cursor-pointer transition-all group ${
                          !n.isRead 
                            ? 'bg-white border border-indigo-100 shadow-[0_4px_20px_-8px_rgba(79,70,229,0.2)] hover:border-indigo-300 hover:shadow-[0_8px_30px_-10px_rgba(79,70,229,0.3)] hover:-translate-y-0.5' 
                            : 'bg-transparent border border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 shadow-inner mt-0.5 ${
                          !n.isRead 
                            ? 'bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {getIcon(n.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex justify-between items-start mb-1.5">
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md ${
                              !n.isRead ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {n.title || (n.type === 'payment' ? 'TO\'LOV' : n.type === 'security' ? 'XAVFSIZLIK' : 'TIZIM')}
                            </p>
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap mt-0.5">
                              {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          
                          <p className={`text-[13px] leading-snug break-words pr-2 ${
                            !n.isRead ? 'font-black text-slate-800' : 'font-semibold text-slate-500 group-hover:text-slate-700'
                          }`}>
                            {n.text || n.message}
                          </p>
                        </div>
                        
                        {!n.isRead && (
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] mt-3 shrink-0"></div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 px-6 text-center flex flex-col items-center justify-center h-full">
                    <div className="w-24 h-24 bg-slate-50 border border-slate-100 text-slate-300 rounded-[2rem] flex items-center justify-center text-4xl mb-5 shadow-inner">
                       <MdNotifications />
                    </div>
                    <p className="text-slate-800 font-black text-xl tracking-tight">Kontekst Toza</p>
                    <p className="text-slate-400 text-xs mt-2 font-medium leading-relaxed">Hozircha sizda hech qanday yangi yoki o'qilmagan xabarlar mavjud emas.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100/50 bg-slate-50/80 z-10 shrink-0">
                <button className="w-full py-4 text-center text-[10px] font-black tracking-[0.25em] text-slate-500 hover:bg-slate-900 transition-all uppercase rounded-xl hover:text-white shadow-sm hover:shadow-xl hover:shadow-slate-900/20 active:scale-95 outline-none border border-slate-200">
                  Barcha Tizim Xabarlariga O'tish
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        {user && (
          <div className="flex items-center gap-2 lg:gap-3 lg:border-l lg:border-slate-200 lg:pl-6 cursor-pointer group">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform text-sm">
              {user.fullName[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-black text-slate-800 leading-tight">{user.fullName}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : (user.company?.name || user.role)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
