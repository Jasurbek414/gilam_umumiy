'use client';

import React, { useState, useEffect } from 'react';
import { MdSettings, MdPerson, MdLock, MdNotifications, MdSave, MdAddCircle, MdDeleteOutline, MdOutlineSecurity } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import { servicesApi, usersApi, getUser } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: ''
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [newService, setNewService] = useState({ name: '', price: '', unit: 'SQM' });

  // Notifications State (Local Storage Simulation for "Real" functionality)
  const [notifications, setNotifications] = useState({
    newOrders: true,
    payments: true,
    driverActivity: false,
    systemVars: true
  });
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  useEffect(() => {
    const initData = async () => {
      const currentUser = getUser();
      if (!currentUser) return;
      setUser(currentUser);
      setFormData({
        fullName: currentUser.fullName || '',
        phone: currentUser.phone || ''
      });

      if (currentUser.companyId) {
        try {
          const s = await servicesApi.getByCompany(currentUser.companyId);
          setServicesList(s);
        } catch (err) {
          console.error(err);
        }
      }

      // Load local preferences
      const prefs = localStorage.getItem('companyPrefs');
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.twoFactorAuth !== undefined) setTwoFactorAuth(parsed.twoFactorAuth);
      }

      setLoading(false);
    };
    initData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.update(user.id, {
        fullName: formData.fullName,
        phone: formData.phone
      });
      toast.success('Profil muvaffaqiyatli saqlandi! ✅');
      
      const stored = localStorage.getItem('user');
      if (stored) {
        const p = JSON.parse(stored);
        p.fullName = formData.fullName;
        p.phone = formData.phone;
        localStorage.setItem('user', JSON.stringify(p));
      }
    } catch (err) {
      toast.error('Saqlashda xatolik yuz berdi');
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Yangi parollar mos tushmadi!');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Parol kamida 6ta belgi bo\'lishi kerak');
      return;
    }
    try {
      await usersApi.update(user.id, {
        password: passwords.newPassword
      });
      toast.success('Parol muvaffaqiyatli yangilandi! 🔐');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error('Parolni yangilashda xatolik qildi');
    }
  };

  const handleSaveServices = async () => {
    try {
      toast.loading('Saqlanmoqda...', { id: 'services' });
      const promises = servicesList.map(s => 
        servicesApi.update(s.id, { 
          name: s.name,
          price: parseInt(s.price) || 0,
          measurementUnit: s.measurementUnit
        })
      );
      await Promise.all(promises);
      toast.success('Xizmatlar va narxlar muvaffaqiyatli saqlandi! 💰', { id: 'services' });
    } catch (err) {
      toast.error('Saqlashda xatolik yuz berdi', { id: 'services' });
    }
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.price) {
      toast.error('Xizmat nomi va narxini kiritish majburiy');
      return;
    }
    try {
      const added = await servicesApi.create({
        name: newService.name,
        price: parseInt(newService.price) || 0,
        measurementUnit: newService.unit,
        companyId: user.companyId
      });
      setServicesList([...servicesList, added]);
      setNewService({ name: '', price: '', unit: 'SQM' });
      toast.success('Yangi xizmat qo\'shildi!');
    } catch (err) {
      toast.error('Qo\'shishda xatolik yuz berdi');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Ushbu xizmatni rostdan ham o\'chirmoqchimisiz?')) return;
    try {
      await servicesApi.remove(id);
      setServicesList(servicesList.filter(s => s.id !== id));
      toast.success('O\'chirildi!');
    } catch (err) {
      toast.error('Xatolik yuz berdi do\'stim');
    }
  };

  const handleUpdateServiceField = (serviceId: string, field: string, value: string | number) => {
    setServicesList(servicesList.map(s => 
      s.id === serviceId ? { ...s, [field]: value } : s
    ));
  };

  const handleSavePreferences = () => {
    localStorage.setItem('companyPrefs', JSON.stringify({
      notifications,
      twoFactorAuth
    }));
    toast.success('Sozlamalar omadli saqlandi! 🛡️');
  };

  const tabs = [
    { id: 'profile', name: 'Shaxsiy Profil', icon: MdPerson, color: 'from-blue-500 to-cyan-400' },
    { id: 'services', name: 'Xizmatlar / Narxlar', icon: MdSettings, color: 'from-fuchsia-500 to-pink-500' },
    { id: 'security', name: 'Xavfsizlik & Kirish', icon: MdLock, color: 'from-emerald-500 to-teal-400' },
    { id: 'notifications', name: 'Bildirishnomalar', icon: MdNotifications, color: 'from-orange-500 to-amber-400' },
  ];

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-white p-8 border border-slate-100 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl opacity-70 -translate-y-1/2 translate-x-1/2"></div>
        <h1 className="relative z-10 text-3xl font-black text-slate-800 tracking-tight">
          Korxona Sozlamalari
        </h1>
        <p className="relative z-10 text-slate-500 mt-2 font-medium">Platforma imkoniyatlarini va tariflarini o'zingizga moslashtiring</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Modern Tab Bar Sidebar */}
        <div className="w-full lg:w-72 flex flex-col gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-bold transition-colors ${
                  isActive ? 'text-white' : 'text-slate-500 hover:bg-white hover:shadow-sm'
                }`}
                whileHover={{ scale: isActive ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabBackground"
                    className={`absolute inset-0 bg-gradient-to-r ${tab.color} rounded-3xl shadow-lg`}
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <div className={`relative z-10 p-2 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                  <Icon className="text-xl" />
                </div>
                <span className="relative z-10 text-sm tracking-wide">{tab.name}</span>
              </motion.button>
            )
          })}
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 min-h-[500px]"
            >
              
              {/* Profile Settings */}
              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/30">
                      {formData.fullName.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Shaxsiy Ma'lumotlar</h2>
                      <p className="text-sm font-medium text-slate-400">Admin panelga kiruvchi xodim profili</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Ism va Familiya</label>
                        <input 
                          className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 transition-all focus:bg-white focus:shadow-lg focus:shadow-blue-500/10"
                          value={formData.fullName}
                          placeholder="F.I.Sh"
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Telefon Raqam</label>
                        <input 
                          className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 transition-all focus:bg-white focus:shadow-lg focus:shadow-blue-500/10"
                          value={formData.phone}
                          placeholder="+998..."
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="pt-4">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit" 
                        className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-slate-900/20 hover:bg-black transition-all"
                      >
                        <MdSave className="text-xl text-blue-400" />
                        O'zgarishlarni Saqlash
                      </motion.button>
                    </div>
                  </form>
                </div>
              )}

              {/* Services & Prices Settings */}
              {activeTab === 'services' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Xizmatlar va Narxlar</h2>
                      <p className="text-sm font-medium text-slate-400">Haydovchi va muassasa xodimlari tanlaydigan narxnoma</p>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveServices} 
                      className="flex items-center gap-2 bg-fuchsia-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-fuchsia-500/30"
                    >
                      Tasdiqlash
                    </motion.button>
                  </div>

                  <div className="space-y-3">
                    <AnimatePresence>
                      {servicesList.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-medium">
                          Hozircha xizmatlar mavjud emas
                        </div>
                      ) : servicesList.map(item => (
                        <motion.div 
                          key={item.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-fuchsia-200 hover:shadow-md transition-all group"
                        >
                          <div className="flex-1 w-full relative">
                            <input
                              type="text"
                              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-lg border border-transparent focus:border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none transition-all"
                              value={item.name}
                              placeholder="Xizmat nomi"
                              onChange={(e) => handleUpdateServiceField(item.id, 'name', e.target.value)}
                            />
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="w-28">
                              <select 
                                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-lg border border-transparent focus:border-slate-200 text-xs font-black text-slate-600 outline-none px-2 py-2.5 transition-all text-center"
                                value={item.measurementUnit}
                                onChange={(e) => handleUpdateServiceField(item.id, 'measurementUnit', e.target.value)}
                              >
                                <option value="SQM">Kv.m</option>
                                <option value="PIECE">Dona</option>
                                <option value="KG">Kg</option>
                              </select>
                            </div>

                            <div className="relative w-32">
                              <input 
                                type="number" 
                                className="w-full pl-3 pr-12 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white rounded-lg border border-transparent focus:border-slate-200 text-right font-black text-slate-800 outline-none focus:border-fuchsia-500 transition-all text-sm"
                                value={item.price}
                                onChange={(e) => handleUpdateServiceField(item.id, 'price', e.target.value)}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase pointer-events-none">so'm</span>
                            </div>

                            <button onClick={() => handleDeleteService(item.id)} className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-40 group-hover:opacity-100 shrink-0" title="O'chirish">
                              <MdDeleteOutline className="text-lg" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="mt-8 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-fuchsia-500"></div>
                    <h4 className="text-sm font-black text-slate-800 mb-5 ml-2 uppercase tracking-wide">Yangi Xizmat Qo'shish</h4>
                    <div className="flex flex-col md:flex-row gap-4 items-end ml-2">
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Xizmat nomi</label>
                        <input 
                          type="text" 
                          placeholder="Shohi gilam yuvish..."
                          className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-fuchsia-500 outline-none font-bold text-slate-800 transition-all bg-white"
                          value={newService.name}
                          onChange={e => setNewService({...newService, name: e.target.value})}
                        />
                      </div>
                      <div className="w-32 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">O'lchov formati</label>
                        <select 
                          className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-fuchsia-500 outline-none font-bold text-slate-800 transition-all bg-white"
                          value={newService.unit}
                          onChange={e => setNewService({...newService, unit: e.target.value})}
                        >
                          <option value="SQM">Kv.m</option>
                          <option value="PIECE">Dona</option>
                          <option value="KG">Kg</option>
                        </select>
                      </div>
                      <div className="w-40 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Narxi (so'm)</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-fuchsia-500 outline-none font-bold text-slate-800 transition-all bg-white"
                          value={newService.price}
                          onChange={e => setNewService({...newService, price: e.target.value})}
                        />
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddService} 
                        className="h-[56px] px-6 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center gap-2"
                      >
                         <MdAddCircle className="text-xl text-fuchsia-400" />
                         Qo'shish
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-8 max-w-2xl">
                  <div className="border-b border-slate-100 pb-6">
                    <h2 className="text-xl font-black text-slate-800">Xavfsizlik va Kirish</h2>
                    <p className="text-sm font-medium text-slate-400">Parolni o'zgartirish va 2F autentifikatsiya sozlamalari</p>
                  </div>

                  <form className="space-y-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-100" onSubmit={handleSavePassword}>
                    <div>
                      <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><MdLock className="text-teal-500 text-xl" /> Parolni yangilash</h4>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Joriy Parol (Ixtiyoriy)</label>
                      <input 
                        type="password"
                        placeholder="••••••••"
                        value={passwords.currentPassword}
                        onChange={e => setPasswords({...passwords, currentPassword: e.target.value})}
                        className="w-full px-5 py-4 bg-white rounded-2xl border border-slate-200 focus:border-teal-500 outline-none font-bold text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Yangi Parol</label>
                        <input 
                          required
                          type="password"
                          placeholder="••••••••"
                          value={passwords.newPassword}
                          onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                          className="w-full px-5 py-4 bg-white rounded-2xl border border-slate-200 focus:border-teal-500 outline-none font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Parolni Tasdiqlang</label>
                        <input 
                          required
                          type="password"
                          placeholder="••••••••"
                          value={passwords.confirmPassword}
                          onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                          className="w-full px-5 py-4 bg-white rounded-2xl border border-slate-200 focus:border-teal-500 outline-none font-bold text-slate-800"
                        />
                      </div>
                    </div>
                    <div className="pt-4">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit" 
                        className="bg-slate-900 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-slate-900/20"
                      >
                        Parolni Saqlash
                      </motion.button>
                    </div>
                  </form>

                  <div className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:border-teal-200 transition-colors">
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shadow-inner">
                           <MdOutlineSecurity className="text-3xl" />
                        </div>
                        <div>
                           <p className="text-base font-black text-slate-800">Ikki faktorli tasdiqlash (2FA)</p>
                           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hisob uchun qo'shimcha xavfsizlik</p>
                        </div>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer ml-4">
                       <input type="checkbox" className="sr-only peer" checked={twoFactorAuth} onChange={() => setTwoFactorAuth(!twoFactorAuth)} />
                       <div className="w-14 h-8 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-teal-500"></div>
                     </label>
                  </div>
                  
                  <div className="pt-2 text-right">
                     <button onClick={handleSavePreferences} className="text-teal-600 font-bold hover:underline">O'zgarishlarni bekor qilish uchun bosing</button>
                  </div>
                </div>
              )}

              {/* Notifications Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-8 max-w-2xl">
                  <div className="border-b border-slate-100 pb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Bildirishnomalar</h2>
                      <p className="text-sm font-medium text-slate-400">Tizim xabarlari va push-navbatlar qanday ishlashini sozlang</p>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSavePreferences} 
                      className="flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/30"
                    >
                      <MdSave className="text-lg" /> Saqlash
                    </motion.button>
                  </div>

                  <div className="grid gap-4">
                    {[
                      { key: 'newOrders', title: "Yangi buyurtmalar", desc: "Sizga yangi buyurtma kelganda qo'ng'iroq va yozuv chiqadi" },
                      { key: 'payments', title: "Kirim To'lovlari", desc: "Mijoz xisobni yopganida darxol ma'lumot olish" },
                      { key: 'driverActivity', title: "Haydovchilar manzili", desc: "Haydovchi doimiy lokatsiyasini poylab turish (Batareya va resurs olishi mumkin)" },
                      { key: 'systemVars', title: "Tizim xabarlari", desc: "Platforma yangilanishlari va ogohlantirishlar" },
                    ].map((notif, i) => (
                      <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:border-amber-100 hover:shadow-md transition-all group">
                        <div className="mr-4">
                          <p className="text-[15px] font-black text-slate-800">{notif.title}</p>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-relaxed">{notif.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={(notifications as any)[notif.key]} 
                            onChange={(e) => setNotifications({...notifications, [notif.key]: e.target.checked})} 
                          />
                          <div className="w-14 h-8 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:shadow-sm after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
