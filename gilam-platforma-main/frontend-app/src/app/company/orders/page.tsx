'use client';

import React, { useState, useEffect } from 'react';
import { MdAdd, MdSearch, MdFilterList, MdShoppingCart, MdPerson, MdPhone, MdClose, MdExpandMore, MdExpandLess, MdPrint, MdVisibility, MdLocationOn, MdNotes, MdAccessTime, MdDirectionsCar, MdLocalMall, MdSend, MdMyLocation, MdOpenInNew } from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import { ordersApi, customersApi, servicesApi, getUser } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const MEASUREMENT_UNITS = [
  { value: 'SQM', label: 'kv.m (Kvadrat metr)' },
  { value: 'KG', label: 'kg (Kilogramm)' },
  { value: 'METER', label: 'metr' },
  { value: 'PIECE', label: 'dona' },
  { value: 'SET', label: 'to\'plam' },
  { value: 'HOUR', label: 'soat' },
  { value: 'FIXED', label: 'belgilangan narx' },
];

export default function CompanyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [viewOrder, setViewOrder] = useState<any>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [formData, setFormData] = useState<any>({
    customerId: '',
    notes: '',
    items: [{ serviceId: '', width: '', length: '', quantity: 1, notes: '' }]
  });

  // Inline customer quick-add
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ fullName: '', phone1: '', phone2: '', address: '' });

  // Inline service quick-add
  const [showAddService, setShowAddService] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', measurementUnit: 'SQM', price: '' });

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || !currentUser.company) {
      setTimeout(() => router.push('/company/login'), 0);
      return;
    }
    setUser(currentUser);
    loadData(currentUser.company.id);

    const handleGlobalSearch = (e: any) => {
      setSearch(e.detail);
    };
    window.addEventListener('global-search', handleGlobalSearch);
    return () => window.removeEventListener('global-search', handleGlobalSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData(companyId: string) {
    try {
      const [ordData, custData, servData] = await Promise.all([
        ordersApi.getByCompany(companyId),
        customersApi.getByCompany(companyId),
        servicesApi.getByCompany(companyId)
      ]);
      setOrders(ordData);
      setCustomers(custData);
      setServices(servData);
    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = () => {
    setFormData({
      customerId: '',
      notes: '',
      items: [{ serviceId: '', width: '', length: '', quantity: 1, notes: '' }]
    });
    setShowAddCustomer(false);
    setShowAddService(false);
    setCustomerForm({ fullName: '', phone1: '', phone2: '', address: '' });
    setServiceForm({ name: '', measurementUnit: 'SQM', price: '' });
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { serviceId: '', width: '', length: '', quantity: 1, notes: '' }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.company?.id) return;
    setSavingCustomer(true);
    try {
      const newCustomer = await customersApi.create({ ...customerForm, companyId: user.company.id });
      toast.success('Mijoz qo\'shildi!');
      const updated = await customersApi.getByCompany(user.company.id);
      setCustomers(updated);
      setFormData({ ...formData, customerId: newCustomer.id });
      setCustomerForm({ fullName: '', phone1: '', phone2: '', address: '' });
      setShowAddCustomer(false);
    } catch (err: any) {
      toast.error('Mijoz qo\'shishda xatolik: ' + err.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleQuickAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.company?.id) return;
    if (!serviceForm.price || Number(serviceForm.price) <= 0) {
      toast.error('Narxni kiriting');
      return;
    }
    setSavingService(true);
    try {
      await servicesApi.create({
        name: serviceForm.name,
        measurementUnit: serviceForm.measurementUnit,
        price: Number(serviceForm.price),
        companyId: user.company.id,
      });
      toast.success('Xizmat turi qo\'shildi!');
      const updated = await servicesApi.getByCompany(user.company.id);
      setServices(updated);
      setServiceForm({ name: '', measurementUnit: 'SQM', price: '' });
      setShowAddService(false);
    } catch (err: any) {
      toast.error('Xizmat qo\'shishda xatolik: ' + err.message);
    } finally {
      setSavingService(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return toast.error('Mijozni tanlang!');

    const formattedItems = formData.items
      .filter((item: any) => item.serviceId)
      .map((item: any) => ({
        serviceId: item.serviceId,
        width: item.width ? Number(item.width) : undefined,
        length: item.length ? Number(item.length) : undefined,
        quantity: item.quantity ? Number(item.quantity) : 1,
        notes: item.notes || undefined,
      }));

    if (formattedItems.length === 0) return toast.error('Kamida bitta xizmatni tanlang!');

    setSaving(true);
    try {
      await ordersApi.create({
        customerId: formData.customerId,
        notes: formData.notes || undefined,
        items: formattedItems,
      });
      toast.success('Buyurtma muvaffaqiyatli saqlandi!');
      setIsModalOpen(false);
      await loadData(user.company.id);
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await ordersApi.updateStatus(orderId, { status: newStatus });
      await loadData(user.company.id);
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    }
  };

  /** Haydovchiga mijoz lokatsiyasini push notification orqali yuborish */
  const handleSendLocationToDriver = async (orderId: string) => {
    setSendingLocation(true);
    try {
      await ordersApi.sendLocationToDriver(orderId);
      toast.success('📍 Lokatsiya haydovchiga yuborildi!');
    } catch (err: any) {
      toast.error('Xatolik: ' + (err.message || 'Yuborib bo\'lmadi'));
    } finally {
      setSendingLocation(false);
    }
  };

  /** Operator mijoz profiliga lokatsiya (manzil yoki koordinata) saqlaydi */
  const handleSaveCustomerLocation = async (customerId: string, addressOrCoords: string) => {
    if (!addressOrCoords.trim()) { toast.error('Manzil yoki koordinata kiriting'); return; }
    try {
      // Koordinata formati: 41.311, 69.240 — JSON ob'ektga o'giramiz
      const parts = addressOrCoords.split(',');
      let updateData: any = { address: addressOrCoords };
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        updateData = {
          location: { lat: Number(parts[0].trim()), lng: Number(parts[1].trim()) },
          address: addressOrCoords,
        };
      }
      await customersApi.update(customerId, updateData);
      // Refresh orders
      if (user?.company?.id) await loadData(user.company.id);
      toast.success('📍 Mijoz lokatsiyasi saqlandi!');
      setLocationInput('');
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    }
  };

  const handlePrint = (order: any) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.service?.name || 'Xizmat'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.width || '-'} x ${item.length || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${Number(item.service?.price || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Kvitansiya #${order.id.split('-')[0].toUpperCase()}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; background: #f9f9f9; padding: 10px; border-bottom: 2px solid #eee; }
            .total { text-align: right; margin-top: 20px; font-size: 1.2em; font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; font-size: 0.9em; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin:0">${user?.company?.name || 'GILAM TOZALASH'}</h1>
            <p style="margin:5px 0">Professional Tozalash Xizmati</p>
          </div>
          <div class="info">
            <div>
              <p><b>Mijoz:</b> ${order.customer?.fullName}</p>
              <p><b>Tel:</b> ${order.customer?.phone1}</p>
              <p><b>Manzil:</b> ${order.customer?.address || '-'}</p>
            </div>
            <div style="text-align: right;">
              <p><b>Buyurtma #:</b> ${order.id.split('-')[0].toUpperCase()}</p>
              <p><b>Sana:</b> ${new Date(order.createdAt).toLocaleString()}</p>
              <p><b>Holat:</b> ${statusLabels[order.status]}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Xizmat</th>
                <th style="text-align: center;">O'lcham</th>
                <th style="text-align: center;">Soni</th>
                <th style="text-align: right;">Narxi</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">
            JAMI: ${Number(order.totalAmount).toLocaleString()} so'm
          </div>
          <div class="footer">
            <p>Xizmatimizdan foydalanganingiz uchun rahmat!</p>
            <p>Tel: +998 90 123 45 67</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const statusLabels: Record<string, string> = {
    'NEW': 'Yangi',
    'DRIVER_ASSIGNED': 'Haydovchi kutilyapti',
    'PICKED_UP': 'Olib ketildi',
    'AT_FACILITY': 'Korxonada',
    'WASHING': 'Yuvilmoqda',
    'DRYING': 'Quritilmoqda',
    'FINISHED': 'Tayyor (yetkazishga)',
    'OUT_FOR_DELIVERY': 'Yetkazilmoqda',
    'DELIVERED': 'Yetkazildi',
    'CANCELLED': 'Bekor qilingan',
  };

  const statusBadge: Record<string, string> = {
    'NEW': 'bg-slate-100 text-slate-700',
    'DRIVER_ASSIGNED': 'bg-amber-100 text-amber-700',
    'PICKED_UP': 'bg-orange-100 text-orange-700',
    'AT_FACILITY': 'bg-yellow-100 text-yellow-700',
    'WASHING': 'bg-blue-100 text-blue-700',
    'DRYING': 'bg-fuchsia-100 text-fuchsia-700',
    'FINISHED': 'bg-purple-100 text-purple-700',
    'OUT_FOR_DELIVERY': 'bg-indigo-100 text-indigo-700',
    'DELIVERED': 'bg-emerald-100 text-emerald-700',
    'CANCELLED': 'bg-red-100 text-red-700',
  };

  const filteredOrders = orders.filter(order => {
    const custName = order.customer?.fullName?.toLowerCase() || '';
    const custPhone = order.customer?.phone1 || '';
    const matchesSearch = custName.includes(search.toLowerCase()) || custPhone.includes(search) || order.id.includes(search);
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight border-b-2 border-blue-600 inline-block pb-1">
            Buyurtmalar Ro'yxati
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Barcha buyurtmalarni kuzatish va holatini yangilash</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-sm active:scale-95"
        >
          <MdAdd className="text-xl" />
          Yangi Buyurtma
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96">
          <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
          <input
            type="text"
            placeholder="Mijoz ismi, raqami yoki ID..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-sm text-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MdFilterList className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none" />
            <select
              className="pl-12 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-sm text-slate-600 appearance-none cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Barcha Holatlar</option>
              {Object.keys(statusLabels).map(k => (
                <option key={k} value={k}>{statusLabels[k]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest">
                <th className="py-5 px-6">Buyurtma ID & Sana</th>
                <th className="py-5 px-6">Mijoz / Telefon</th>
                <th className="py-5 px-6 text-center">Xizmatlar</th>
                <th className="py-5 px-6 text-center">Joriy Holat</th>
                <th className="py-5 px-6 text-right">Summa (so'm)</th>
                <th className="py-5 px-6 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 tracking-tight text-sm">
                        #{order.id.split('-')[0].substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-slate-400 mt-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-sm">
                        <MdPerson className="text-xl" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{order.customer?.fullName || 'Anonim'}</p>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <MdPhone className="text-slate-400 text-[10px]" /> {order.customer?.phone1}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <span className="font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg text-xs">
                      {order.items?.length || 0} ta
                    </span>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <select
                      className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase cursor-pointer outline-none appearance-none text-center ${statusBadge[order.status] || 'bg-slate-100 text-slate-700'}`}
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                    >
                      {Object.keys(statusLabels).map(k => (
                        <option key={k} value={k}>{statusLabels[k]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-5 px-6 text-right">
                    <span className="font-black text-slate-800 text-sm">
                      {Number(order.totalAmount).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-5 px-6 text-right whitespace-nowrap">
                    <button 
                      onClick={() => setViewOrder(order)}
                      className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm mr-2"
                      title="Batafsil ko'rish"
                    >
                      <MdVisibility className="text-xl" />
                    </button>
                    <button 
                      onClick={() => handlePrint(order)}
                      className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      title="Kvitansiya chiqarish"
                    >
                      <MdPrint className="text-xl" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-bold">
                    <MdShoppingCart className="text-6xl text-slate-200 mx-auto mb-3" />
                    Buyurtmalar ro'yxati bo'sh
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yangi Buyurtma Qo'shish">
        <form onSubmit={handleCreateOrder} className="space-y-5">

          {/* === MIJOZ TANLASH === */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Mijoz</label>
              <button
                type="button"
                onClick={() => { setShowAddCustomer(v => !v); setShowAddService(false); }}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all"
              >
                {showAddCustomer ? <MdExpandLess /> : <MdAdd />}
                {showAddCustomer ? 'Yopish' : 'Yangi mijoz qo\'shish'}
              </button>
            </div>

            <div className="relative">
              <MdPerson className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-xl pointer-events-none" />
              <select
                required={!showAddCustomer}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 appearance-none bg-slate-50 hover:bg-white transition-colors text-sm"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              >
                <option value="">— Mijozni tanlang —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.fullName} · {c.phone1}</option>
                ))}
              </select>
            </div>

            {/* Inline customer add form */}
            {showAddCustomer && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Yangi mijoz ma'lumotlari</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">To'liq ism *</label>
                    <input
                      required={showAddCustomer}
                      type="text"
                      placeholder="Aliyev Vali"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold bg-white"
                      value={customerForm.fullName}
                      onChange={e => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Telefon 1 *</label>
                    <input
                      required={showAddCustomer}
                      type="tel"
                      placeholder="+998901234567"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold bg-white"
                      value={customerForm.phone1}
                      onChange={e => setCustomerForm({ ...customerForm, phone1: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Telefon 2</label>
                    <input
                      type="tel"
                      placeholder="+998901234567"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold bg-white"
                      value={customerForm.phone2}
                      onChange={e => setCustomerForm({ ...customerForm, phone2: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Manzil</label>
                    <input
                      type="text"
                      placeholder="Chilonzor 9, 12-uy"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold bg-white"
                      value={customerForm.address}
                      onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickAddCustomer}
                  disabled={savingCustomer}
                  className="w-full py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {savingCustomer ? 'Saqlanmoqda...' : 'Mijozni saqlash va tanlash'}
                </button>
              </div>
            )}
          </div>

          {/* === XIZMATLAR === */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Xizmatlar ro'yxati</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddService(v => !v); setShowAddCustomer(false); }}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-all"
                >
                  {showAddService ? <MdExpandLess /> : <MdAdd />}
                  {showAddService ? 'Yopish' : 'Yangi xizmat turi'}
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all"
                >
                  <MdAdd /> Qator qo'shish
                </button>
              </div>
            </div>

            {/* Inline service add form */}
            {showAddService && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Yangi xizmat turi</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Xizmat nomi *</label>
                    <input
                      required={showAddService}
                      type="text"
                      placeholder="Gilam yuvish, Parma tozalash..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-bold bg-white"
                      value={serviceForm.name}
                      onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">O'lchov birligi *</label>
                    <select
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-bold bg-white"
                      value={serviceForm.measurementUnit}
                      onChange={e => setServiceForm({ ...serviceForm, measurementUnit: e.target.value })}
                    >
                      {MEASUREMENT_UNITS.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Narxi (so'm) *</label>
                    <input
                      required={showAddService}
                      type="number"
                      min="0"
                      placeholder="25000"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm font-bold bg-white"
                      value={serviceForm.price}
                      onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickAddService}
                  disabled={savingService}
                  className="w-full py-2.5 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {savingService ? 'Saqlanmoqda...' : 'Xizmat turini saqlash'}
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {formData.items.map((item: any, idx: number) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-wrap lg:flex-nowrap gap-3 items-end relative">
                  <div className="w-full lg:w-1/3 space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400">Xizmat *</label>
                    <select
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm font-bold bg-white focus:border-blue-500"
                      value={item.serviceId}
                      onChange={(e) => handleItemChange(idx, 'serviceId', e.target.value)}
                    >
                      <option value="">Tanlang...</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {Number(s.price).toLocaleString()} so'm/{s.measurementUnit === 'SQM' ? 'kv.m' : s.measurementUnit === 'PIECE' ? 'dona' : s.measurementUnit === 'KG' ? 'kg' : s.measurementUnit.toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/3 lg:w-20 space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400">Eni (m)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold"
                      value={item.width}
                      onChange={(e) => handleItemChange(idx, 'width', e.target.value)} />
                  </div>
                  <div className="w-1/3 lg:w-20 space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400">Bo'yi (m)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.0"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold"
                      value={item.length}
                      onChange={(e) => handleItemChange(idx, 'length', e.target.value)} />
                  </div>
                  <div className="w-1/3 lg:w-20 space-y-1.5">
                    <label className="text-[10px] uppercase font-black text-slate-400">Soni</label>
                    <input type="number" min="1" placeholder="1"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} />
                  </div>
                  {idx > 0 && (
                    <button type="button" onClick={() => handleRemoveItem(idx)}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-600 p-1 bg-white rounded-md shadow-sm border border-slate-100">
                      <MdClose />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* === IZOH === */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Qo'shimcha izoh</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium text-sm text-slate-700 bg-slate-50 hover:bg-white focus:bg-white transition-all resize-none min-h-[70px]"
              placeholder="Buyurtma uchun izohlar... (ixtiyoriy)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex items-center justify-end border-t border-slate-100">
            <button
              onClick={() => setIsModalOpen(false)}
              type="button"
              className="px-6 py-3 mr-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              disabled={saving}
              type="submit"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              {saving ? 'Saqlanmoqda...' : 'Tasdiqlash'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title="Buyurtma Ma'lumotlari">
        {viewOrder && (
           <div className="space-y-6 pb-6 text-slate-800">
             
              {/* Header Info */}
              <div className="flex justify-between items-start bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">Buyurtma #{viewOrder.id.substring(0,8)}</h3>
                    <p className="text-xs font-bold text-slate-500">
                      <MdAccessTime className="inline mr-1" />
                      Yaratilgan: {new Date(viewOrder.createdAt).toLocaleString()}
                    </p>
                 </div>
                 <span className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase ${statusBadge[viewOrder.status] || 'bg-slate-200 text-slate-700'}`}>
                    {statusLabels[viewOrder.status] || viewOrder.status}
                 </span>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mijoz Obyekti</h4>
                    <p className="font-bold text-sm text-slate-800 flex items-center mb-1">
                      <MdPerson className="text-blue-500 mr-2 text-lg"/> 
                      {viewOrder.customer?.fullName || 'Topilmadi'}
                    </p>
                    <p className="font-bold text-sm text-slate-600 flex items-center mb-1">
                      <MdPhone className="text-green-500 mr-2 text-lg"/> 
                      {viewOrder.customer?.phone1} {viewOrder.customer?.phone2 && `/ ${viewOrder.customer.phone2}`}
                    </p>
                    {viewOrder.customer?.address && (
                      <p className="font-semibold text-xs text-slate-500 flex items-start mt-2 leading-relaxed">
                        <MdLocationOn className="text-red-400 mr-2 text-lg shrink-0"/> 
                        {viewOrder.customer.address}
                      </p>
                    )}
                 </div>

                 <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tarkibiy Qismi</h4>
                        <p className="font-bold text-sm text-slate-800 flex items-center mb-1">
                          <MdLocalMall className="text-purple-500 mr-2 text-lg"/>
                          Jami: {viewOrder.items?.length || 0} xil tur
                        </p>
                        {viewOrder.driver && (
                          <p className="font-bold text-sm text-slate-800 flex items-center mt-2">
                             <MdDirectionsCar className="text-yellow-500 mr-2 text-lg"/>
                             Haydovchi: {viewOrder.driver.fullName}
                          </p>
                        )}
                    </div>
                    {viewOrder.deadlineDate && (
                      <div className="mt-4 bg-red-50 text-red-600 p-2 rounded-lg text-xs font-bold border border-red-100 flex items-center">
                         <MdAccessTime className="mr-2 text-base"/>
                         Qaytarish: {new Date(viewOrder.deadlineDate).toLocaleDateString()}
                      </div>
                    )}
                 </div>
              </div>

              {/* Special Note */}
              {viewOrder.notes && (
                 <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex items-start shadow-sm">
                    <MdNotes className="text-yellow-600 text-2xl mr-3 shrink-0 mt-0.5" />
                    <div>
                       <h4 className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1">Alohida Izoh</h4>
                       <p className="font-bold text-sm text-yellow-800 whitespace-pre-line leading-relaxed">{viewOrder.notes}</p>
                    </div>
                 </div>
              )}

              {/* Items List */}
              <div className="bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-inner">
                 <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                         <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Xizmat</th>
                         <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Miqdor</th>
                         <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewOrder.items?.map((it:any, idx:number) => {
                         const u = MEASUREMENT_UNITS.find(m => m.value === it.service?.measurementUnit)?.label || it.service?.measurementUnit;
                         return (
                           <tr key={idx} className="border-t border-slate-200 bg-white first:rounded-t-xl hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4">
                                 <p className="font-bold text-sm text-slate-800">{it.service?.name}</p>
                                 {(it.width && it.length) ? (
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">O'lcham: {it.width} x {it.length}</p>
                                 ) : null}
                              </td>
                              <td className="py-3 px-4 text-center">
                                 <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">{it.quantity} {u}</span>
                              </td>
                              <td className="py-3 px-4 text-right font-black text-sm text-slate-800">
                                 {Number(it.totalPrice).toLocaleString()}
                              </td>
                           </tr>
                         )
                      })}
                    </tbody>
                 </table>
                 <div className="p-5 flex justify-between items-center border-t border-slate-200 bg-white rounded-b-2xl">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Jami To'lov:</span>
                    <span className="text-xl font-black text-blue-600">{Number(viewOrder.totalAmount).toLocaleString()} so'm</span>
                 </div>
              </div>

              {/* ═══ OPERATOR AMALLAR ════════════════════════════════════ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">

                 {/* Haydovchiga lokatsiya yuborish */}
                 {viewOrder.driver && (
                   <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
                     <h4 className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                       <MdSend /> Haydovchiga Lokatsiya Yuborish
                     </h4>
                     <p className="text-xs text-slate-500 mb-3">
                       Haydovchi: <span className="font-bold text-slate-700">{viewOrder.driver.fullName}</span>
                     </p>
                     <button
                       onClick={() => handleSendLocationToDriver(viewOrder.id)}
                       disabled={sendingLocation}
                       className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                     >
                       <MdMyLocation className="text-base" />
                       {sendingLocation ? 'Yuborilmoqda...' : 'Push orqali yuborish'}
                     </button>
                   </div>
                 )}

                 {/* Mijoz lokatsiyasini saqlash */}
                 <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                   <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                     <MdLocationOn /> Mijoz Lokatsiyasini Saqlash
                   </h4>
                   <p className="text-xs text-slate-500 mb-2">
                     Hozirgi manzil: <span className="font-bold text-slate-700">{viewOrder.customer?.address || '—'}</span>
                   </p>
                   <div className="flex gap-2">
                     <input
                       type="text"
                       placeholder="41.311, 69.240 yoki matn manzil"
                       className="flex-1 px-3 py-2 text-xs border border-emerald-200 rounded-lg outline-none focus:border-emerald-500 bg-white"
                       value={locationInput}
                       onChange={e => setLocationInput(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleSaveCustomerLocation(viewOrder.customer.id, locationInput)}
                     />
                     <button
                       onClick={() => handleSaveCustomerLocation(viewOrder.customer.id, locationInput)}
                       className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all"
                     >
                       Saqlash
                     </button>
                   </div>
                   {viewOrder.customer?.address && (
                     <a
                       href={`https://maps.google.com/?q=${encodeURIComponent(viewOrder.customer.address)}`}
                       target="_blank"
                       rel="noreferrer"
                       className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2 hover:underline"
                     >
                       <MdOpenInNew /> Google Xaritada ko'rish
                     </a>
                   )}
                 </div>

              </div>

           </div>
        )}
      </Modal>
    </div>
  );
}
