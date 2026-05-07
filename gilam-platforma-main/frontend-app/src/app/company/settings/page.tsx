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
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="bg-white px-6 py-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Korxona Sozlamalari
          </h1>
          <p className="text-sm text-slate-500 mt-1">Platforma sozlamalari va tariflarni boshqarish</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Compact Sidebar */}
        <div className="w-full lg:w-64 flex flex-col gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="text-lg" />
                <span className="text-sm">{tab.name}</span>
              </button>
            )
          })}
        </div>

        {/* Content Container */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[400px]"
            >
              
              {/* Profile Settings */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xl font-bold border border-slate-200">
                      {formData.fullName.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Shaxsiy Ma'lumotlar</h2>
                      <p className="text-xs text-slate-500">Admin panelga kiruvchi xodim profili</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-5 max-w-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Ism va Familiya</label>
                        <input 
                          className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm font-medium text-slate-800 transition-colors"
                          value={formData.fullName}
                          placeholder="F.I.Sh"
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Telefon Raqam</label>
                        <input 
                          className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm font-medium text-slate-800 transition-colors"
                          value={formData.phone}
                          placeholder="+998..."
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="pt-2">
                      <button 
                        type="submit" 
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
                      >
                        <MdSave className="text-lg" />
                        Saqlash
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Services & Prices Settings */}
              {activeTab === 'services' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Xizmatlar va Narxlar</h2>
                      <p className="text-xs text-slate-500">Haydovchi va muassasa xodimlari tanlaydigan narxnoma</p>
                    </div>
                    <button 
                      onClick={handleSaveServices} 
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <MdSave className="text-lg" />
                      Tasdiqlash
                    </button>
                  </div>

                  <div className="space-y-2">
                    <AnimatePresence>
                      {servicesList.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm">
                          Hozircha xizmatlar mavjud emas
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-2 w-1/2">Xizmat nomi</th>
                                <th className="px-4 py-2 w-1/4">O'lchov</th>
                                <th className="px-4 py-2 w-1/4 text-right">Narxi</th>
                                <th className="px-2 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {servicesList.map(item => (
                                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                  <td className="px-4 py-2">
                                    <input
                                      type="text"
                                      className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-2 py-1.5 text-sm font-medium text-slate-800 outline-none transition-colors"
                                      value={item.name}
                                      placeholder="Xizmat nomi"
                                      onChange={(e) => handleUpdateServiceField(item.id, 'name', e.target.value)}
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <select 
                                      className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-2 py-1.5 text-sm font-medium text-slate-700 outline-none transition-colors cursor-pointer"
                                      value={item.measurementUnit}
                                      onChange={(e) => handleUpdateServiceField(item.id, 'measurementUnit', e.target.value)}
                                    >
                                      <option value="SQM">Kv.m</option>
                                      <option value="PIECE">Dona</option>
                                      <option value="KG">Kg</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-2 relative">
                                    <input 
                                      type="number" 
                                      className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded pl-2 pr-10 py-1.5 text-right text-sm font-medium text-slate-800 outline-none transition-colors"
                                      value={item.price}
                                      onChange={(e) => handleUpdateServiceField(item.id, 'price', e.target.value)}
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">so'm</span>
                                  </td>
                                  <td className="px-2 py-2 text-right">
                                    <button onClick={() => handleDeleteService(item.id)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="O'chirish">
                                      <MdDeleteOutline className="text-lg" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-600 mb-3 uppercase">Yangi Xizmat Qo'shish</h4>
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                      <div className="flex-1 w-full">
                        <input 
                          type="text" 
                          placeholder="Xizmat nomi (Masalan: Shohi gilam yuvish)"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm font-medium text-slate-800"
                          value={newService.name}
                          onChange={e => setNewService({...newService, name: e.target.value})}
                        />
                      </div>
                      <div className="w-full md:w-32">
                        <select 
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm font-medium text-slate-800 cursor-pointer"
                          value={newService.unit}
                          onChange={e => setNewService({...newService, unit: e.target.value})}
                        >
                          <option value="SQM">Kv.m</option>
                          <option value="PIECE">Dona</option>
                          <option value="KG">Kg</option>
                        </select>
                      </div>
                      <div className="w-full md:w-40 relative">
                        <input 
                          type="number" 
                          placeholder="Narxi"
                          className="w-full pl-3 pr-10 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm font-medium text-slate-800"
                          value={newService.price}
                          onChange={e => setNewService({...newService, price: e.target.value})}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">so'm</span>
                      </div>
                      <button 
                        onClick={handleAddService} 
                        className="h-[42px] px-5 w-full md:w-auto bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex justify-center items-center gap-1"
                      >
                         <MdAddCircle className="text-base" />
                         Qo'shish
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6 max-w-lg">
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-lg font-bold text-slate-800">Xavfsizlik va Kirish</h2>
                    <p className="text-xs text-slate-500">Parolni o'zgartirish va 2F autentifikatsiya sozlamalari</p>
                  </div>

                  <form className="space-y-5 bg-slate-50 p-5 rounded-xl border border-slate-200" onSubmit={handleSavePassword}>
                    <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2 border-b border-slate-200 pb-2 mb-4">
                      <MdLock className="text-slate-500" /> Parolni yangilash
                    </h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase">Joriy Parol (Ixtiyoriy)</label>
                      <input 
                        type="password"
                        placeholder="••••••••"
                        value={passwords.currentPassword}
                        onChange={e => setPasswords({...passwords, currentPassword: e.target.value})}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Yangi Parol</label>
                        <input 
                          required
                          type="password"
                          placeholder="••••••••"
                          value={passwords.newPassword}
                          onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-800"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase">Tasdiqlash</label>
                        <input 
                          required
                          type="password"
                          placeholder="••••••••"
                          value={passwords.confirmPassword}
                          onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-sm text-slate-800"
                        />
                      </div>
                    </div>
                    <div className="pt-2">
                      <button 
                        type="submit" 
                        className="bg-slate-900 text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Parolni Saqlash
                      </button>
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
                <div className="space-y-6 max-w-lg">
                  <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Bildirishnomalar</h2>
                      <p className="text-xs text-slate-500">Tizim xabarlari va ogohlantirishlar sozlamalari</p>
                    </div>
                    <button 
                      onClick={handleSavePreferences} 
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <MdSave className="text-lg" /> Saqlash
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'newOrders', title: "Yangi buyurtmalar", desc: "Sizga yangi buyurtma kelganda qo'ng'iroq va yozuv chiqadi" },
                      { key: 'payments', title: "Kirim To'lovlari", desc: "Mijoz xisobni yopganida darxol ma'lumot olish" },
                      { key: 'driverActivity', title: "Haydovchilar manzili", desc: "Haydovchi doimiy lokatsiyasini poylab turish" },
                      { key: 'systemVars', title: "Tizim xabarlari", desc: "Platforma yangilanishlari va ogohlantirishlar" },
                    ].map((notif, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors">
                        <div className="mr-4">
                          <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{notif.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={(notifications as any)[notif.key]} 
                            onChange={(e) => setNotifications({...notifications, [notif.key]: e.target.checked})} 
                          />
                          <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
