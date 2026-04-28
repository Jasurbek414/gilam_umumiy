'use client';

import React, { useState, useEffect } from 'react';
import { 
  MdTrendingUp, 
  MdTrendingDown, 
  MdPeople, 
  MdShoppingCart, 
  MdPhoneInTalk, 
  MdAdd, 
  MdLocationOn, 
  MdClose
} from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import { ordersApi, usersApi, getUser, customersApi, servicesApi } from '@/lib/api';
import { User, Order, Service, Customer } from '@/types';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const YandexMapPicker = dynamic(() => import('@/components/ui/YandexMapPicker'), { 
  ssr: false,
  loading: () => <div className="h-[350px] bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase text-xs tracking-widest">Yandex Xarita yuklanmoqda...</div>
});

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily'); 
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companyStats, setCompanyStats] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    phone: '',
    customerName: '',
    items: [{ serviceId: '', quantity: '1' }],
    address: '',
    location: null as { lat: number, lng: number } | null
  });
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEW' | 'IN_PROGRESS' | 'EMPLOYEES' | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || !currentUser.companyId) {
      setTimeout(() => router.push('/company/login'), 0);
      return;
    }
    setUser(currentUser);
    loadData(currentUser.companyId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData(companyId: string) {
    try {
      const [ordersData, statsData, usersData, servicesData] = await Promise.all([
        ordersApi.getByCompany(companyId),
        ordersApi.getCompanyStats(companyId),
        usersApi.getByCompany(companyId),
        servicesApi.getByCompany(companyId)
      ]);
      setOrders(ordersData);
      setCompanyStats(statsData);
      setUsers(usersData);
      setServices(servicesData);
      if (servicesData.length > 0 && formData.items[0].serviceId === '') {
        setFormData(prev => ({ 
          ...prev, 
          items: [{ serviceId: servicesData[0].id, quantity: '1' }] 
        }));
      }
    } catch (err) {
      console.error('Ma\'lumotlarni yuklashda xato:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.phone || formData.items.length === 0) {
      toast.error('Telefon va kamida bitta xizmatni kiriting');
      return;
    }

    setSubmitting(true);
    try {
      let customerId = selectedCustomer?.id;

      if (!customerId) {
        const newCustomer = await customersApi.create({
          fullName: formData.customerName || 'Ismsiz Mijoz',
          phone1: formData.phone,
          address: formData.address || 'Kiritilmagan',
          companyId: user.companyId,
          operatorId: user.id
        });
        customerId = newCustomer.id;
      }

      await ordersApi.create({
        customerId,
        companyId: user.companyId,
        operatorId: user.id,
        items: formData.items.map(item => ({
          serviceId: item.serviceId,
          quantity: Number(item.quantity) || 1,
          width: 0,
          length: 0
        }))
      });

      toast.success('Buyurtma muvaffaqiyatli yaratildi!');
      setIsModalOpen(false);
      resetFormData();
      loadData(user.companyId);
    } catch (err: any) {
      toast.error(err.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormData = () => {
    setFormData({ 
       phone: '', 
       customerName: '', 
       items: [{ serviceId: services[0]?.id || '', quantity: '1' }], 
       address: '',
       location: null
    });
    setSelectedCustomer(null);
    setIsMapOpen(false);
  };

  const addOrderItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { serviceId: services[0]?.id || '', quantity: '1' }]
    }));
  };

  const removeOrderItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const updateOrderItem = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const calculateTotal = () => {
    return formData.items.reduce((acc, item) => {
      const s = services.find(x => x.id === item.serviceId);
      return acc + (Number(s?.price || 0) * Number(item.quantity || 0));
    }, 0);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate Bugungi (1 kunlik) holat (Today's stats)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filterByDate = (dateString: string) => {
    if (period === 'daily') return new Date(dateString) >= today;
    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return new Date(dateString) >= weekAgo;
    }
    if (period === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 1);
      return new Date(dateString) >= monthAgo;
    }
    return true;
  };

  const periodOrders = orders.filter(o => filterByDate(o.createdAt));
  const newOrdersList = periodOrders.filter(o => o.status === 'NEW');
  const inProgressList = periodOrders.filter(o => !['NEW', 'DELIVERED', 'CANCELLED'].includes(o.status));

  const stats = [
    { 
      id: 'ALL',
      title: period === 'daily' ? "Jami (Bugun)" : period === 'weekly' ? "Jami (Shu Hafta)" : "Jami (Shu Oy)", 
      value: periodOrders.length.toString(), 
      trend: "Umumiy Tushum", up: true, icon: MdShoppingCart, color: "blue" 
    },
    { 
      id: 'NEW',
      title: "Yangi Kutayotgan", 
      value: newOrdersList.length.toString(), 
      trend: "Kutish Holatida", up: false, icon: MdPhoneInTalk, color: "rose" 
    },
    { 
      id: 'IN_PROGRESS',
      title: "Jarayonda", 
      value: inProgressList.length.toString(), 
      trend: "Faol Jamoada", up: true, icon: MdTrendingUp, color: "emerald" 
    },
    { 
      id: 'EMPLOYEES',
      title: "Xodimlar (Faol)", 
      value: `${users.filter(u => u.status === 'ACTIVE').length} ta`, 
      trend: "Barcha Xodim", up: true, icon: MdPeople, color: "indigo" 
    },
  ];

  const statusLabels: Record<string, string> = {
    'NEW': 'Yangi',
    'DRIVER_ASSIGNED': 'Haydovchi kutilyapti',
    'PICKED_UP': 'Olib ketildi',
    'AT_FACILITY': 'Korxonada',
    'WASHING': 'Yuvilmoqda',
    'DRYING': 'Quritilmoqda',
    'READY_FOR_DELIVERY': 'Tayyor',
    'OUT_FOR_DELIVERY': 'Yetkazilmoqda',
    'DELIVERED': 'Tayyor/Yopilgan',
    'CANCELLED': 'Bekor qilingan',
  };

  const statusColors: Record<string, string> = {
    'NEW': 'slate',
    'WASHING': 'blue',
    'READY_FOR_DELIVERY': 'emerald',
    'OUT_FOR_DELIVERY': 'indigo',
    'DRIVER_ASSIGNED': 'amber',
  };

  let displayedOrders = orders;
  if (activeFilter === 'ALL') displayedOrders = periodOrders;
  if (activeFilter === 'NEW') displayedOrders = newOrdersList;
  if (activeFilter === 'IN_PROGRESS') displayedOrders = inProgressList;
  
  const recentOrders = displayedOrders.slice(0, activeFilter ? 20 : 8);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Xush kelibsiz, {user.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">
            Tashkilot: <span className="text-blue-600 font-bold">{user.company?.name || 'Noma&apos;lum'}</span> boshqaruv panelidasiz.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl hidden md:flex">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setActiveFilter(null); }}
                className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-black transition-all ${
                  period === p 
                    ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p === 'daily' ? 'Kunlik (Bugun)' : p === 'weekly' ? 'Haftalik' : 'Oylik'}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all"
          >
            <MdAdd className="text-xl" />
            Vaqtincha Buyurtma
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <button 
            key={i} 
            onClick={() => setActiveFilter(activeFilter === stat.id ? null : stat.id as any)}
            className={`text-left relative bg-white p-6 rounded-2xl shadow-sm border transition-all outline-none overflow-hidden group ${
              activeFilter === stat.id 
                ? `border-${stat.color}-400 ring-4 ring-${stat.color}-500/10 shadow-lg scale-[1.02] -translate-y-1` 
                : 'border-slate-100 opacity-90 hover:opacity-100 hover:shadow-md hover:border-slate-300 focus:ring-4 focus:ring-slate-100'
            }`}
          >
            {activeFilter === stat.id && (
               <div className={`absolute -right-6 -top-6 w-32 h-32 bg-${stat.color}-100 rounded-full blur-3xl opacity-50`}></div>
            )}
            <div className="flex justify-between items-start relative z-10 gap-2">
              <div className={`p-3 rounded-xl shadow-inner bg-${stat.color}-50 text-${stat.color}-600 ${activeFilter === stat.id ? `bg-${stat.color}-100` : 'group-hover:bg-slate-100'} transition-colors shrink-0`}>
                <stat.icon className="text-2xl" />
              </div>
              <span className={`inline-flex items-center text-[8px] sm:text-[9px] uppercase tracking-[0.10em] font-black ${stat.up ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-1.5 rounded-lg border border-white/50 max-w-[70%] truncate flex-1`}>
                {stat.up ? <MdTrendingUp className="mr-1 shrink-0" /> : <MdTrendingDown className="mr-1 shrink-0" />}
                <span className="truncate">{stat.trend}</span>
              </span>
            </div>
            <div className="mt-5 relative z-10">
              <h3 className={`text-4xl lg:text-5xl font-black tracking-tighter ${activeFilter === stat.id ? `text-${stat.color}-600 drop-shadow-sm` : 'text-slate-800'}`}>
                {stat.value}
              </h3>
              <p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-[0.15em]">{stat.title}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">
              {activeFilter === 'EMPLOYEES' ? 'Barcha Xodimlar Liniyasi' : activeFilter ? 'Filtrlangan Buyurtmalar' : 'So\'nggi Buyurtmalar'}
            </h2>
            <button className="text-sm font-medium text-blue-600 hover:underline" onClick={() => router.push('/company/orders')}>Barchasini ko'rish</button>
          </div>
          <div className="p-0 overflow-x-auto text-nowrap">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4">ID / Mijoz</th>
                  <th className="px-6 py-4">Holati</th>
                  <th className="px-6 py-4">Operator/Haydovchi</th>
                  <th className="px-6 py-4 text-right">Summa (so&apos;m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.length > 0 ? recentOrders.map((order) => {
                  const color = statusColors[order.status] || 'slate';
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">#{order.id.split('-')[0].substring(0,6).toUpperCase()}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{order.customer?.fullName || 'Noma&apos;lum'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-tighter bg-${color}-100 text-${color}-700 border border-${color}-200`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {order.operator ? `Op: ${order.operator.fullName.split(' ')[0]}` : ''}
                        {order.driver ? <br/> : ''}
                        {order.driver ? `Haydovchi: ${order.driver.fullName.split(' ')[0]}` : ''}
                        {!order.operator && !order.driver ? '-' : ''}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-slate-800">{Number(order.totalAmount).toLocaleString()}</p>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">Hozircha buyurtmalar yo&apos;q</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">Xodimlar Jamoasi ({users.length})</h2>
          </div>
          <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[400px]">
            {users.length > 0 ? users.map((u) => {
               const roleColor = 
                  u.role === 'DRIVER' ? 'amber' : 
                  u.role === 'OPERATOR' ? 'indigo' : 
                  u.role === 'WASHER' ? 'emerald' : 'slate';
               const displayRole = u.role.replace('_', ' ');

               return (
                <div key={u.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-colors">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full bg-${roleColor}-100 text-${roleColor}-700 flex items-center justify-center font-bold`}>
                      {u.fullName[0].toUpperCase()}
                    </div>
                    {u.status === 'ACTIVE' && (
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full bg-emerald-500`}></span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{u.fullName}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{displayRole}</p>
                  </div>
                </div>
               );
            }) : (
              <p className="text-slate-500 text-center text-sm font-medium">Boshqa xodimlar topilmadi.</p>
            )}
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Tezkor Buyurtma Yaratish"
      >
        <form onSubmit={handleCreateOrder} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 gap-6">
            
            {/* Mijoz Section */}
            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Mijoz</h3>
                </div>
                {selectedCustomer && (
                  <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse">BAZADA MAVJUD</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Telefon</label>
                  <input
                    type="text"
                    required
                    placeholder="+998"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                    value={formData.phone}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setFormData({...formData, phone: val});
                      if (val.length >= 7) {
                        const found = await customersApi.search(user.companyId, val);
                        if (found && found.length > 0) {
                          setSelectedCustomer(found[0]);
                          setFormData(prev => ({...prev, customerName: found[0].fullName, address: found[0].address || ''}));
                        } else {
                          setSelectedCustomer(null);
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Ism / F.I.SH</label>
                  <input
                    type="text"
                    placeholder="Ismni kiriting"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 ml-1">Manzil</label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Ko&apos;cha, uy, mo&apos;ljal..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm pr-12"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setIsMapOpen(!isMapOpen)}
                    className={`absolute right-2 top-1.5 p-2 rounded-lg transition-all ${isMapOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                    title="Xaritadan tanlash"
                  >
                    <MdLocationOn className="text-xl" />
                  </button>
                </div>
                
                {isMapOpen && (
                  <div className="mt-4 animate-in slide-in-from-top-4 duration-300">
                    <YandexMapPicker 
                      searchQuery={formData.address}
                      onLocationSelect={(lat, lng, addr) => {
                        setFormData(prev => ({ ...prev, address: addr, location: { lat, lng } }));
                      }} 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Xizmatlar Section */}
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Xizmatlar ro&apos;yxati</h3>
                </div>
                <button 
                  type="button"
                  onClick={addOrderItem}
                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <MdAdd className="text-xl" />
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end group animate-in slide-in-from-left-2 duration-300">
                    <div className="col-span-12 md:col-span-7">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-tighter">Xizmat turi</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm appearance-none cursor-pointer"
                        value={item.serviceId}
                        onChange={(e) => updateOrderItem(index, 'serviceId', e.target.value)}
                      >
                        {services.map(s => (
                          <option key={s.id} value={s.id}>{s.name} — {Number(s.price).toLocaleString()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-tighter">Kvadrat (m²)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-2 flex justify-end pb-1">
                      <button 
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        className="w-10 h-10 flex items-center justify-center text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <MdClose /> 
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Umumiy Summa</span>
                <div className="text-xl font-black text-slate-800 tracking-tighter flex items-baseline gap-1">
                  {calculateTotal().toLocaleString()}
                  <span className="text-[10px] text-slate-400 uppercase">so&apos;m</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
             <button 
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-4 text-xs font-black text-slate-400 hover:text-slate-500 transition-colors uppercase tracking-widest"
            >
              Yopish
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className={`flex-1 py-4.5 bg-slate-900 text-white text-[10px] font-black rounded-2xl shadow-xl shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-1 active:scale-95 transition-all uppercase tracking-[0.25em] flex items-center justify-center gap-3 ${submitting ? 'opacity-80' : ''}`}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>SAQLASH VA YOPIQ QILISH</>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
