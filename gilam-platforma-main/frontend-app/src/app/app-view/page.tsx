'use client';

import React, { useState, useEffect } from 'react';
import { MdTrendingFlat, MdOutlineTimer, MdCheckCircle, MdLocalShipping, MdPhone } from 'react-icons/md';
import { ordersApi, getUser } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function MobileTaskView() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'DRIVER') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    loadTasks(currentUser.id);
  }, [router]);

  async function loadTasks(driverId: string) {
    try {
      const data = await ordersApi.getDriverOrders(driverId);
      setTasks(data);
    } catch (err) {
      console.error('Vazifalarni yuklashda xato:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateTaskStatus = async (orderId: string, currentStatus: string) => {
    try {
      let nextStatus = '';
      if (currentStatus === 'DRIVER_ASSIGNED') nextStatus = 'PICKED_UP';
      else if (currentStatus === 'PICKED_UP') nextStatus = 'AT_FACILITY'; // Normally facility scans it, but for demo driver can drop it off
      else if (currentStatus === 'OUT_FOR_DELIVERY') nextStatus = 'DELIVERED';
      else return;

      await ordersApi.updateStatus(orderId, { status: nextStatus });
      alert('Vazifa holati yangilandi! ✅');
      if (user) loadTasks(user.id);
    } catch (err: any) {
      alert('Xato: ' + err.message);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const pendingPickups = tasks.filter(t => t.status === 'DRIVER_ASSIGNED');
  const pendingDeliveries = tasks.filter(t => t.status === 'OUT_FOR_DELIVERY');
  const enRouteToFacility = tasks.filter(t => t.status === 'PICKED_UP');

  return (
    <div className="p-4 space-y-4 relative pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top action card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/30">
        <h2 className="text-sm font-medium opacity-90 mb-1 flex items-center justify-between">
          <span>{user.fullName}</span>
          <MdLocalShipping className="text-xl opacity-80" />
        </h2>
        <div className="flex items-end justify-between mt-4">
          <div>
            <p className="text-4xl font-black">{tasks.length} ta</p>
          </div>
          <p className="text-sm font-medium opacity-90 flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-xl border border-white/10">
            <MdOutlineTimer className="text-lg" />
            Faol vazifa
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 mt-6 mb-2">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">Vazifalar Ro'yxati</h3>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
         <div className="shrink-0 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-200">
           Barchasi ({tasks.length})
         </div>
         <div className="shrink-0 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-amber-200">
           Olib ketish ({pendingPickups.length})
         </div>
         <div className="shrink-0 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-200">
           Yetkazish ({pendingDeliveries.length})
         </div>
      </div>

      {/* Task Cards */}
      <div className="space-y-4 px-1">
        {tasks.map((task) => {
          const isDelivery = task.status === 'OUT_FOR_DELIVERY';
          const isEnroute = task.status === 'PICKED_UP';
          const isPickup = task.status === 'DRIVER_ASSIGNED';

          const statusColor = isDelivery ? 'emerald' : isEnroute ? 'indigo' : 'amber';
          const statusText = isDelivery ? 'YETKAZIB BERISH 🚚' : isEnroute ? 'SEXGA OLIB BORISH 🏢' : 'MIJOZDAN OLISH 📥';

          return (
            <div key={task.id} className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex flex-col gap-4 active:scale-[0.98] transition-transform">
              
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg border bg-${statusColor}-50 text-${statusColor}-700 border-${statusColor}-200 tracking-wider`}>
                  {statusText}
                </span>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">ID: {task.id.split('-')[0].substring(0,8).toUpperCase()}</span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">{task.customer?.fullName || 'Noma\'lum mijoz'}</h4>
                <p className="text-sm text-slate-500 font-medium break-words leading-tight mt-1">{task.customer?.address || 'Manzil ko\'rsatilmagan'}</p>
                <div className="flex items-center gap-1.5 mt-2 text-indigo-600 font-bold text-sm bg-indigo-50 w-max px-2 py-1 rounded-lg">
                  <MdPhone />
                  <a href={`tel:${task.customer?.phone1}`}>{task.customer?.phone1}</a>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Buyurtma tarkibi:</p>
                <p className="text-sm text-slate-700 font-bold">
                  {task.items?.length ? `${task.items.length} ta xizmat qatori` : 'Izoh: ' + (task.notes || 'Yo\'q')}
                </p>
                {isDelivery && (
                  <p className="text-emerald-600 font-black mt-2 text-sm">To'lov: {Number(task.totalAmount).toLocaleString()} so'm</p>
                )}
              </div>

              <div className="flex gap-3 pt-1 border-t border-slate-50 mt-1">
                {isEnroute ? (
                   <button 
                    onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-white transition-all shadow-xl bg-indigo-600 active:bg-indigo-700 shadow-indigo-500/30"
                   >
                     Sexga topshirish <MdCheckCircle className="text-xl" />
                   </button>
                ) : (
                  <>
                    <a href={`tel:${task.customer?.phone1}`} className="flex-1 bg-slate-100 text-slate-600 flex items-center justify-center py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest active:bg-slate-200 transition-colors border border-slate-200">
                      Qo'ng'iroq
                    </a>
                    <button 
                      onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                      className={`flex-[1.5] flex items-center justify-center gap-1.5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white transition-all shadow-xl ${
                        isDelivery ? 'bg-emerald-500 active:bg-emerald-600 shadow-emerald-500/30' : 'bg-blue-600 active:bg-blue-700 shadow-blue-500/30'
                      }`}
                    >
                      {isDelivery ? 'Topshirildi' : 'Olib ketildi'}
                      <MdTrendingFlat className="text-lg" />
                    </button>
                  </>
                )}
              </div>
              
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="mt-12 text-center opacity-50 space-y-3">
          <MdCheckCircle className="text-6xl mx-auto text-emerald-400" />
          <p className="text-lg font-black text-slate-500 tracking-tight">Vazifalar yo'q</p>
          <p className="text-xs font-medium text-slate-400">Yangi vazifa tushsa shu yerda ko'rinadi</p>
        </div>
      )}

    </div>
  );
}
