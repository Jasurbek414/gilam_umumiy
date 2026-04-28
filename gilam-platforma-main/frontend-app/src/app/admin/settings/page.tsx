'use client';

import React, { useState } from 'react';
import { MdSettings, MdPerson, MdLock, MdNotifications, MdLanguage, MdSave, MdSecurity, MdEdit, MdVpnKey, MdFingerprint, MdCheckCircle, MdArrowForwardIos } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [is2FAEnabled, setIs2FAEnabled] = useState(typeof window !== 'undefined' ? localStorage.getItem('is2FAEnabled') === 'true' : false);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: 'Azizbek Rahimov',
    email: typeof window !== 'undefined' ? localStorage.getItem('adminEmail') || 'azizbek@example.uz' : 'azizbek@example.uz',
    phone: '+998 90 111 22 33'
  });

  const handleToggle2FA = () => {
    setIs2FALoading(true);
    setTimeout(() => {
      const newState = !is2FAEnabled;
      setIs2FAEnabled(newState);
      localStorage.setItem('is2FAEnabled', newState.toString());
      setIs2FALoading(false);
    }, 1000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'profile') {
      localStorage.setItem('adminEmail', formData.email);
    }
    setSavedStatus('success');
    setTimeout(() => setSavedStatus(null), 3000);
  };

  const tabs = [
    { id: 'profile', name: 'Shaxsiy Profil', icon: MdPerson, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'security', name: 'Xavfsizlik', icon: MdLock, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'notifications', name: 'Bildirishnomalar', icon: MdNotifications, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'system', name: 'Tizim Boshqaruvi', icon: MdLanguage, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Header section with gradient and glow */}
      <div className="relative overflow-hidden bg-white px-8 py-10 pt-12 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between z-10">
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Tizim Sozlamalari</h1>
          <p className="text-slate-500 text-sm font-bold flex items-center gap-2">
            <MdSettings className="animate-spin-slow" /> Administrator profili va operatsion parametrlarni moslashtiring
          </p>
        </div>
        
        {/* Abstract shapes for pure aesthetic */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-70"></div>
        <div className="absolute right-32 bottom-0 w-32 h-32 bg-gradient-to-tr from-emerald-50 to-teal-50 rounded-full blur-2xl translate-y-1/3 opacity-50"></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Dynamic Interactive Sidebar */}
        <div className="w-full lg:w-[320px] shrink-0 sticky top-[120px]">
          <div className="bg-white rounded-[2rem] p-3 shadow-sm border border-slate-100/60 overflow-hidden flex flex-col gap-1.5 relative z-10">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 relative group overflow-hidden ${
                    isActive ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  {/* Subtle hover background highlight */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-slate-100/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0"></div>
                  )}
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isActive ? 'bg-white/10 text-white' : `${tab.bg} ${tab.color} group-hover:scale-110 shadow-inner duration-300`
                    }`}>
                      <Icon className="text-[22px]" />
                    </div>
                    <span className={`font-black text-[15px] ${isActive ? 'text-white' : 'text-slate-700'}`}>
                      {tab.name}
                    </span>
                  </div>
                  
                  <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'translate-x-0 opacity-100 text-white/50' : '-translate-x-4 opacity-0 text-slate-300 group-hover:translate-x-0 group-hover:opacity-100'}`}>
                    <MdArrowForwardIos className="text-xs font-black" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content Area with Smooth Animations */}
        <div className="flex-1 w-full min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.99 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden"
            >
              
              {/* === PROFILE TAB === */}
              {activeTab === 'profile' && (
                <div className="p-8 lg:p-12">
                  <div className="mb-10 flex items-center gap-6">
                    <div className="relative group cursor-pointer">
                      <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-5xl font-black text-white shadow-xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300">
                        {formData.fullName.charAt(0)}
                      </div>
                      <div className="absolute inset-0 bg-slate-900/30 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <MdEdit className="text-white text-3xl drop-shadow-md" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-white shadow-sm flex items-center justify-center text-white">
                        <MdCheckCircle className="text-sm" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">Assalomu alaykum, {formData.fullName.split(' ')[0]}!</h3>
                      <p className="text-sm font-bold text-slate-500 mt-1">Super Administrator • Maxsus huquqlarga ega</p>
                    </div>
                  </div>

                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 group">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 transition-colors group-focus-within:text-blue-600">To'liq ism-sharif</label>
                        <input 
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500/30 outline-none font-black text-slate-800 transition-all focus:shadow-[0_8px_30px_-12px_rgba(59,130,246,0.3)] hover:bg-slate-100 focus:hover:bg-white"
                          value={formData.fullName}
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2 group">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 transition-colors group-focus-within:text-blue-600">Telefon Raqam</label>
                        <input 
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500/30 outline-none font-black text-slate-800 transition-all focus:shadow-[0_8px_30px_-12px_rgba(59,130,246,0.3)] hover:bg-slate-100 focus:hover:bg-white"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 group">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 transition-colors group-focus-within:text-blue-600">Elektron Pochta</label>
                      <input 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500/30 outline-none font-black text-slate-800 transition-all focus:shadow-[0_8px_30px_-12px_rgba(59,130,246,0.3)] hover:bg-slate-100 focus:hover:bg-white"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>

                    <div className="pt-8 flex items-center justify-end border-t border-slate-100/60 mt-10">
                      <AnimatePresence>
                        {savedStatus === 'success' && (
                          <motion.span 
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                            className="text-emerald-500 font-bold text-sm mr-4 flex items-center gap-1.5"
                          >
                            <MdCheckCircle className="text-lg" /> Muvaffaqiyatli saqlandi
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <button type="submit" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        <MdSave className="text-xl opacity-80" />
                        O'zgarishlarni Saqlash
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* === SECURITY TAB === */}
              {activeTab === 'security' && (
                <div className="p-8 lg:p-12 space-y-12">
                  
                  {/* Two-Factor Auth Box */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 lg:p-10 text-white shadow-2xl shadow-slate-900/20">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                      <MdFingerprint className="text-[180px] -translate-y-12 translate-x-12" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="max-w-md">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${is2FAEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'}`}>
                            <MdSecurity className="text-2xl" />
                          </div>
                          <h3 className="text-2xl font-black">Ikki Bosqichli Tasdiqlash (2FA)</h3>
                        </div>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                          Tizimga kirishda paroldan tashqari maxsus xavfsizlik kodidan foydalanib, hisobingiz xavfsizligini 100% himoya qiling.
                        </p>
                      </div>
                      
                      <div className="shrink-0 shrink-0 bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-md">
                        <button 
                          onClick={handleToggle2FA}
                          disabled={is2FALoading}
                          className={`relative flex items-center w-[140px] h-14 rounded-full transition-all duration-500 overflow-hidden ${
                            is2FAEnabled ? 'bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          {/* Inner slider */}
                          <div className={`absolute top-1 bottom-1 w-12 bg-white rounded-full flex items-center justify-center shadow-lg transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                            is2FAEnabled ? 'translate-x-[84px]' : 'translate-x-1'
                          }`}>
                            {is2FALoading ? (
                               <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                            ) : (
                               is2FAEnabled ? <MdLock className="text-emerald-500 text-lg" /> : <MdSecurity className="text-slate-400 text-lg" />
                            )}
                          </div>
                          <span className={`w-full text-center text-[11px] font-black tracking-widest uppercase transition-all duration-300 pr-4 pl-4 ${
                            is2FAEnabled ? 'text-white' : 'text-slate-300'
                          }`}>
                            {is2FAEnabled ? 'Himoyalangan' : 'Yoqilmagan'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Reset */}
                  <div>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-inner">
                         <MdVpnKey className="text-xl" />
                       </div>
                       <h3 className="text-2xl font-black text-slate-800">Parolni Yangilash</h3>
                    </div>
                    
                    <form onSubmit={(e) => { e.preventDefault(); setSavedStatus('pwd_success'); setTimeout(() => setSavedStatus(null), 3000); }} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      <div className="space-y-2 group md:col-span-2 max-w-md">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Joriy Parol</label>
                        <input 
                          type="password"
                          placeholder="••••••••"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500/30 outline-none font-black text-slate-800 transition-all focus:shadow-[0_8px_30px_-12px_rgba(99,102,241,0.2)]"
                        />
                      </div>
                      <div className="space-y-2 group">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Yangi Parol</label>
                        <input 
                          type="password"
                          placeholder="••••••••"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500/30 outline-none font-black text-slate-800 transition-all focus:shadow-[0_8px_30px_-12px_rgba(99,102,241,0.2)]"
                        />
                      </div>
                      <div className="space-y-2 group">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Yangi Parolni Tasdiqlang</label>
                        <input 
                          type="password"
                          placeholder="••••••••"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-500/30 outline-none font-black text-slate-800 transition-all focus:shadow-[0_8px_30px_-12px_rgba(99,102,241,0.2)]"
                        />
                      </div>
                      
                      <div className="md:col-span-2 pt-6 flex items-center justify-start">
                        <button type="submit" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-slate-900/20 hover:-translate-y-1 transition-all">
                          Xavfsizlikni Saqlash
                        </button>
                        <AnimatePresence>
                          {savedStatus === 'pwd_success' && (
                            <motion.span 
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                              className="text-emerald-500 font-bold text-sm ml-6 flex items-center gap-1.5"
                            >
                              <MdCheckCircle className="text-lg" /> Parol yangilandi
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* === NOTIFICATIONS TAB === */}
              {activeTab === 'notifications' && (
                <div className="p-8 lg:p-12">
                  <div className="mb-10 max-w-2xl">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-2">
                       Bildirishnomalar <span className="text-sm px-3 py-1 bg-amber-100 text-amber-600 rounded-full font-black uppercase tracking-widest mt-1">Beta</span>
                    </h3>
                    <p className="text-slate-500 font-medium">Turli kanallar orqali platforma hodisalari va muhim hisobotlarni olishni sozlang.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Switch card 1 */}
                    <label className="flex items-center justify-between p-6 rounded-[2rem] border-2 border-transparent bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer group transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1rem] bg-orange-50 text-orange-500 flex items-center justify-center text-xl font-black group-hover:scale-110 transition-transform">@</div>
                        <div>
                          <p className="font-black text-slate-800 text-lg">Email Xabarlar</p>
                          <p className="text-xs font-bold text-slate-400 mt-0.5">Hisobotlar va Tahlillar</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
                      </div>
                    </label>

                    {/* Switch card 2 */}
                    <label className="flex items-center justify-between p-6 rounded-[2rem] border-2 border-transparent bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer group transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1rem] bg-green-50 text-green-500 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                           <span className="text-[10px] tracking-widest text-center leading-none mt-0.5">SMS<br/>Buzzer</span>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-lg">SMS Tarqatma</p>
                          <p className="text-xs font-bold text-slate-400 mt-0.5">Tezkor ogohlantirishlar</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                      </div>
                    </label>
                    
                    {/* Switch card 3 */}
                    <label className="flex items-center justify-between p-6 rounded-[2rem] border-2 border-transparent bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer group transition-all md:col-span-2">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1rem] bg-indigo-50 text-indigo-500 flex items-center justify-center text-xl font-black group-hover:scale-110 transition-transform">
                           <MdNotifications />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-lg">Tizim Bildirishnomalari (In-App)</p>
                          <p className="text-xs font-bold text-slate-400 mt-0.5">Brauzer ichidagi popup xabarlarni doimiy ishlatish</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-500 shadow-inner"></div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* === SYSTEM TAB === */}
              {activeTab === 'system' && (
                <div className="p-8 lg:p-12">
                   <div className="mb-10 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                       <MdLanguage className="text-2xl" />
                     </div>
                     <h3 className="text-3xl font-black text-slate-800 tracking-tight">Tizim Konfiguratsiyasi</h3>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                       <div className="space-y-2 group">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Interfeys Tili</label>
                          <select className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-300 outline-none font-black text-slate-800 transition-all appearance-none shadow-sm cursor-pointer hover:bg-slate-100">
                            <option value="uz">🇺🇿 O'zbekcha (Kril/Lotin aralash)</option>
                            <option value="ru">🇷🇺 Русский (Rus tili)</option>
                            <option value="en">🇬🇧 English (US)</option>
                          </select>
                       </div>
                       <div className="space-y-2 group">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Valyuta Standarti</label>
                          <select className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-300 outline-none font-black text-slate-800 transition-all appearance-none shadow-sm cursor-pointer hover:bg-slate-100">
                            <option value="uzs">UZS - O'zbekiston So'mi</option>
                            <option value="usd">USD - AQSh Dollari</option>
                          </select>
                       </div>
                     </div>
                     
                     <div>
                       {/* Danger Zone */}
                       <div className="bg-red-50/50 border-2 border-red-100/60 p-6 rounded-[2rem] h-full flex flex-col justify-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 -mr-4 -mt-4 text-red-100 rotate-12 z-0">
                            <MdLock className="text-[120px]" />
                          </div>
                          
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-black text-red-600 text-lg">Texnik Xizmat Rejimi</h4>
                              <label className="relative inline-flex items-center cursor-pointer shadow-sm rounded-full">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-12 h-6 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:shadow-sm after:transition-all peer-checked:bg-red-600"></div>
                              </label>
                            </div>
                            <p className="text-xs font-bold text-red-400 leading-relaxed uppercase tracking-widest mt-2">
                              Tizimga faqat adminlar kirishi kafolatlanadi. Mijozlar va xodimlar bloklanadi.
                            </p>
                          </div>
                       </div>
                     </div>
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
