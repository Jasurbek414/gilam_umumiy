'use client';

import React, { useState, useEffect } from 'react';
import { MdSearch, MdFilterList, MdBusiness, MdShoppingCart, MdArrowBack, MdAnalytics, MdCheckCircle, MdAssignment, MdPendingActions, MdLocalShipping, MdKeyboardArrowRight, MdClose, MdLocalMall, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { ordersApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadOrders();
    
    // Listen to global search bar events
    const handleGlobalSearch = (e: any) => {
      setSearch(e.detail);
    };
    window.addEventListener('global-search', handleGlobalSearch);
    return () => window.removeEventListener('global-search', handleGlobalSearch);
  }, []);

  async function loadOrders() {
    try {
      const data = await ordersApi.getAll();
      setOrders(data);
    } catch (err) {
      console.error('Buyurtmalarni yuklashda xato:', err);
    } finally {
      setLoading(false);
    }
  }

  const statusLabels: Record<string, string> = {
    'NEW': 'Yangi',
    'DRIVER_ASSIGNED': 'Haydovchi biriktirilgan',
    'PICKED_UP': 'Olib ketilgan',
    'AT_FACILITY': 'Seshga kelgan',
    'WASHING': 'Yuvilmoqda',
    'DRYING': 'Quritilmoqda',
    'READY_FOR_DELIVERY': 'Yetkazishga tayyor',
    'OUT_FOR_DELIVERY': "Yo'lda",
    'DELIVERED': 'Yetkazildi',
    'CANCELLED': 'Bekor qilingan',
  };

  const statusColors: Record<string, string> = {
    'NEW': 'bg-blue-100 text-blue-700 border-blue-200',
    'DRIVER_ASSIGNED': 'bg-amber-100 text-amber-700 border-amber-200',
    'PICKED_UP': 'bg-orange-100 text-orange-700 border-orange-200',
    'AT_FACILITY': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'WASHING': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'DRYING': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'READY_FOR_DELIVERY': 'bg-purple-100 text-purple-700 border-purple-200',
    'OUT_FOR_DELIVERY': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'DELIVERED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'CANCELLED': 'bg-red-100 text-red-700 border-red-200',
  };

  const companiesMap = new Map();
  orders.forEach(o => {
    const cid = o.company?.id || 'unknown';
    const cname = o.company?.name || "Noma'lum Korxona";
    if (!companiesMap.has(cid)) {
      companiesMap.set(cid, {
        id: cid,
        name: cname,
        orders: [],
        totalSum: 0,
        activeCount: 0,
        deliveredCount: 0,
        cancelledCount: 0
      });
    }
    const c = companiesMap.get(cid);
    c.orders.push(o);
    c.totalSum += Number(o.totalAmount) || 0;
    
    if (o.status === 'DELIVERED') c.deliveredCount++;
    else if (o.status === 'CANCELLED') c.cancelledCount++;
    else c.activeCount++;
  });

  const companiesList = Array.from(companiesMap.values()).filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.totalSum - a.totalSum);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Individual company view
  if (selectedCompany) {
    const filteredOrders = selectedCompany.orders.filter((o: any) => 
      statusFilter === 'ALL' || o.status === statusFilter
    ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
        <button 
          onClick={() => setSelectedCompany(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold bg-white px-4 py-2 rounded-xl border border-slate-200 hover:border-indigo-200 w-max transition-all shadow-sm"
        >
          <MdArrowBack /> Umumiy ro'yxatga qaytish
        </button>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <MdBusiness className="text-indigo-500" /> {selectedCompany.name}
            </h1>
            <p className="text-slate-500 mt-1 font-medium">{selectedCompany.id !== 'unknown' ? `Tizim ID: ${selectedCompany.id}` : 'Korxonaga biriktirilmagan'}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100 text-center">
              <p className="text-[10px] uppercase font-black text-indigo-400 tracking-widest mb-1">Jami Tushum</p>
              <p className="text-xl font-black text-indigo-700">{selectedCompany.totalSum.toLocaleString()} so'm</p>
            </div>
            <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 text-center">
              <p className="text-[10px] uppercase font-black text-emerald-400 tracking-widest mb-1">Buyurtmalar</p>
              <p className="text-xl font-black text-emerald-700">{selectedCompany.orders.length} ta</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold text-sm text-slate-600 appearance-none cursor-pointer hover:bg-slate-100 w-full md:w-64"
            >
              <option value="ALL">Barcha Holatlar</option>
              {Object.keys(statusLabels).map(key => (
                <option key={key} value={key}>{statusLabels[key]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest">
                <th className="py-5 px-8">Sana & ID</th>
                <th className="py-5 px-6">Mijoz / Manzil</th>
                <th className="py-5 px-6">Buyumlar</th>
                <th className="py-5 px-6 text-center">Holati</th>
                <th className="py-5 px-8 text-right">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.length > 0 ? paginatedOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-8">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-sm">{new Date(order.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="text-slate-400 text-xs font-bold mt-1 uppercase">#{order.id.split('-')[0].substring(0, 6)}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{order.customer?.fullName || "Noma'lum"}</span>
                      <span className="text-xs font-bold text-indigo-500 mt-1">{order.customer?.phone1 || order.customer?.phone2 || ''}</span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-1.5">
                      <MdLocalMall className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{order.items?.length || 0} ta gilam</span>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <span className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black tracking-tighter uppercase border ${statusColors[order.status] || 'bg-slate-100'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-right font-black text-slate-800 text-sm">
                    {Number(order.totalAmount).toLocaleString()} so'm
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <span className="text-sm font-bold text-slate-500">
                Jami: <span className="text-indigo-600">{filteredOrders.length}</span> ta ({currentPage} / {totalPages} sahifa)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all shadow-sm"
                >
                  <MdChevronLeft className="text-xl" />
                </button>
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center ${
                            currentPage === pageNum 
                              ? 'bg-indigo-600 text-white border-indigo-600' 
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="w-10 h-10 flex items-center justify-center text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all shadow-sm"
                >
                  <MdChevronRight className="text-xl" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Dashboard / Companies list view
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <MdAnalytics className="text-indigo-600" /> Korxonalar Bo'yicha Statistika
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Barcha kompaniyalarning umumiy buyurtmalar portfeli va tushumlari tahlili</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
        <MdSearch className="text-slate-400 text-2xl ml-2" />
        <input 
          type="text" 
          placeholder="Korxona nomini qidirish..."
          className="w-full bg-transparent outline-none font-bold text-slate-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {companiesList.length > 0 ? companiesList.map(comp => (
          <motion.div 
            key={comp.id}
            whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
            onClick={() => { setSelectedCompany(comp); setCurrentPage(1); }}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm cursor-pointer group transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {comp.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{comp.name}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{comp.orders.length} ta operatsiya</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <MdKeyboardArrowRight className="text-2xl" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center border border-slate-100">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Umumiy Tushum</span>
                <span className="text-lg font-black text-slate-800">{comp.totalSum.toLocaleString()} so'm</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/50 flex flex-col items-center text-center">
                  <MdPendingActions className="text-blue-500 mb-1" />
                  <span className="text-lg font-black text-blue-700">{comp.activeCount}</span>
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Faol</span>
                </div>
                <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50 flex flex-col items-center text-center">
                  <MdCheckCircle className="text-emerald-500 mb-1" />
                  <span className="text-lg font-black text-emerald-700">{comp.deliveredCount}</span>
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Yetkazildi</span>
                </div>
                <div className="bg-red-50/50 rounded-xl p-3 border border-red-100/50 flex flex-col items-center text-center">
                  <MdClose className="text-red-500 mb-1" />
                  <span className="text-lg font-black text-red-700">{comp.cancelledCount}</span>
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter">Bekor</span>
                </div>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-16 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MdBusiness className="text-4xl text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-800">Korxonalar toplimadi</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">Bozorda hozircha faol kompaniyalar qayd etilmagan</p>
          </div>
        )}
      </div>
    </div>
  );
}
