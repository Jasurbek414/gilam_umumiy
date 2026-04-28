'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MdAdd, MdSearch, MdFilterList, MdPerson, MdBadge, MdBusiness, MdLock, MdPhone, MdEdit, MdDeleteOutline } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import { usersApi, companiesApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  // Custom Tab State for grouping
  const [activeTab, setActiveTab] = useState<string>('SYSTEM');

  const [formData, setFormData] = useState({ 
    fullName: '', 
    phone: '', 
    password: '',
    role: 'OPERATOR', 
    status: 'ACTIVE',
    companyId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersData, companiesData] = await Promise.all([
        usersApi.getAll(),
        companiesApi.getAll()
      ]);
      setUsers(usersData);
      setCompanies(companiesData);
    } catch (err) {
      console.error('Ma\'lumotlarni yuklashda xato:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName,
        phone: user.phone || '',
        password: '',
        role: user.role,
        status: user.status,
        companyId: user.companyId || ''
      });
    } else {
      setEditingUser(null);
      setFormData({ 
        fullName: '', 
        phone: '', 
        password: '', 
        role: 'OPERATOR', 
        status: 'ACTIVE',
        // Auto-select company if we are in a company tab
        companyId: activeTab !== 'SYSTEM' ? activeTab : ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const updateData: any = { ...formData };
        if (!updateData.password) delete updateData.password;
        if (!updateData.companyId) updateData.companyId = null;
        await usersApi.update(editingUser.id, updateData as any);
        toast.success('Foydalanuvchi ma\'lumotlari yangilandi! ✅');
      } else {
        const submitData: any = { ...formData };
        if (!submitData.companyId) submitData.companyId = null;
        await usersApi.create(submitData as any);
        toast.success('Yangi foydalanuvchi muvaffaqiyatli qo\'shildi! ✅');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await usersApi.remove(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      await loadData();
      toast.success('Foydalanuvchi o\'chirildi');
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message) 
        ? err.response.data.message[0] 
        : (err.message || 'O\'chirishda xato');
      toast.error('Xatolik: ' + msg);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await usersApi.update(user.id, { status: newStatus });
      await loadData();
      toast.success(newStatus === 'ACTIVE' ? 'Xodim faollashtirildi' : 'Xodim to\'xtatildi');
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    }
  };

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    COMPANY_ADMIN: 'Korxona Boshlig\'i',
    OPERATOR: 'Operator',
    DRIVER: 'Haydovchi',
    WASHER: 'Yuvuvchi',
    FINISHER: 'Dazmolchi',
    CUSTOMER: 'Mijoz',
  };

  // Build Tabs dynamically
  const userTabs = useMemo(() => {
    const tabs = [{ id: 'SYSTEM', name: 'Tizim Xodimlari' }];
    companies.forEach(comp => {
      tabs.push({ id: comp.id, name: comp.name });
    });
    return tabs;
  }, [companies]);

  // Filter Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // 1. Search Query
      const matchesSearch = (user.fullName || '').toLowerCase().includes(search.toLowerCase()) || (user.phone || '').includes(search);
      if (!matchesSearch) return false;

      // 2. Tab filtering logic
      if (activeTab === 'SYSTEM') {
        return !user.companyId || user.role === 'SUPER_ADMIN' || user.role === 'OPERATOR';
      } else {
        return user.companyId === activeTab;
      }
    });
  }, [users, search, activeTab]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="relative overflow-hidden rounded-[2rem] bg-indigo-900 p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight">
            Foydalanuvchilar Boshqaruvi
          </h1>
          <p className="text-indigo-200 mt-2 text-sm font-medium">Barcha xodimlarni korxonalar kesimida ajratilgan holda ko'rish va boshqarish</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="relative z-10 flex items-center gap-2 bg-white text-indigo-900 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:shadow-2xl hover:scale-105 transition-all outline-none"
        >
          <MdAdd className="text-xl text-indigo-600" />
          Yangi Foydalanuvchi
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-4">
        {/* Top Controls Container */}
        <div className="flex flex-col xl:flex-row gap-6 mb-6">
           
           {/* Custom Scrollable Tabs */}
           <div className="flex-1 overflow-x-auto pb-2 -mb-2 no-scrollbar">
              <div className="flex gap-2 min-w-max p-1 bg-slate-50 border border-slate-100 rounded-2xl">
                 {userTabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const count = users.filter(u => tab.id === 'SYSTEM' ? (!u.companyId || u.role === 'SUPER_ADMIN' || u.role === 'OPERATOR') : u.companyId === tab.id).length;
                    
                    return (
                       <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`relative px-5 py-3 rounded-xl font-bold text-sm transition-colors ${
                             isActive ? 'text-white' : 'text-slate-500 hover:bg-white hover:text-slate-800'
                          }`}
                       >
                          {isActive && (
                             <motion.div 
                                layoutId="pillActiveTab"
                                className={`absolute inset-0 bg-indigo-600 rounded-xl shadow-lg`}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                             />
                          )}
                          <div className="relative z-10 flex items-center gap-2">
                             {tab.name}
                             <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {count}
                             </span>
                          </div>
                       </button>
                    );
                 })}
              </div>
           </div>

           {/* Search & Filter */}
           <div className="flex items-center gap-3">
              <div className="relative w-full xl:w-72">
                <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
                <input 
                  type="text" 
                  placeholder="Ism yoki telefon qidiruvi..."
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
           </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-widest font-black">
                <th className="py-5 px-6 rounded-tl-2xl">Ism-sharif</th>
                <th className="py-5 px-6">Telefon</th>
                <th className="py-5 px-6">Roli</th>
                <th className="py-5 px-6 text-center">Holati</th>
                <th className="py-5 px-6 text-right rounded-tr-2xl">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map(user => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={user.id} 
                    className="hover:bg-indigo-50/30 transition-colors group"
                  >
                    <td className="py-4 px-6">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-inner ${user.role === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                             {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'N'}
                          </div>
                          <div>
                             <p className="font-black text-slate-800">{user.fullName || 'Noma\'lum'}</p>
                             <p className="text-[10px] font-bold text-slate-400 mt-0.5">{user.company?.name || 'Platforma tizimi'}</p>
                          </div>
                       </div>
                    </td>
                    <td className="py-4 px-6">
                       <span className="font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 text-sm">
                          {user.phone}
                       </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg tracking-widest uppercase border ${
                          user.role === 'SUPER_ADMIN' 
                           ? 'bg-amber-50 text-amber-600 border-amber-200' 
                           : user.role === 'COMPANY_ADMIN'
                           ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200'
                           : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all hover:scale-105 active:scale-95 ${
                          user.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                        title={user.status === 'ACTIVE' ? "Bloklash tugmasi" : "Faollashtirish tugmasi"}
                      >
                        {user.status === 'ACTIVE' ? 'Hozir Faol' : 'To\'xtatilgan'}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={() => handleOpenModal(user)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all hover:-translate-y-0.5"
                          title="Tahrirlash"
                        >
                          <MdEdit className="text-lg" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all hover:-translate-y-0.5"
                          title="O'chirish"
                        >
                          <MdDeleteOutline className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-3xl mb-4">
                 <MdPerson />
              </div>
              <p className="text-slate-500 font-bold">Ushbu bo'limda foydalanuvchilar topilmadi</p>
              <p className="text-slate-400 text-sm mt-1">Yangi foydalanuvchilarni qo'shishingiz yoki qidiruvni o'zgartirishingiz mumkin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? "Foydalanuvchini Tahrirlash" : "Yangi Foydalanuvchi"}>
        <form onSubmit={handleCreateOrUpdateUser} className="space-y-5">
          {/* Status buttons */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 pl-1">Tizimga kirish huquqi</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({...formData, status: 'ACTIVE'})}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  formData.status === 'ACTIVE' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Faol Xodim
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, status: 'INACTIVE'})}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  formData.status === 'INACTIVE' 
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Huquqi Cheklangan
              </button>
            </div>
          </div>

          <div className="space-y-4">
             <div className="space-y-1.5">
               <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-widest pl-1">
                 <MdPerson className="text-indigo-500 text-sm" /> To'liq ism
               </label>
               <input 
                 required
                 className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:shadow-indigo-500/10 outline-none font-bold text-slate-800 transition-all"
                 value={formData.fullName}
                 placeholder="Masalan: Sardor Karimov"
                 onChange={(e) => setFormData({...formData, fullName: e.target.value})}
               />
             </div>

             <div className="space-y-1.5">
               <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-widest pl-1">
                 <MdPhone className="text-indigo-500 text-sm" /> Telefon Raqam (Foydalanuvchi logini)
               </label>
               <input 
                 required
                 type="tel"
                 className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:shadow-indigo-500/10 outline-none font-bold text-slate-800 transition-all"
                 value={formData.phone}
                 placeholder="+998..."
                 onChange={(e) => setFormData({...formData, phone: e.target.value})}
               />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-widest pl-1">
                   <MdBadge className="text-indigo-500 text-sm" /> Tizimdagi Rol
                 </label>
                 <select 
                   className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-800 transition-all appearance-none cursor-pointer"
                   value={formData.role}
                   onChange={(e) => setFormData({...formData, role: e.target.value})}
                 >
                   <option value="OPERATOR">Operator (Tizim)</option>
                   <option value="SUPER_ADMIN">Super Admin (Tizim)</option>
                   <option value="COMPANY_ADMIN">Ko'rxona Boshlig'i</option>
                   <option value="DRIVER">Haydovchi</option>
                   <option value="WASHER">Yuvuvchi</option>
                   <option value="FINISHER">Dazmolchi</option>
                 </select>
               </div>

                 <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-widest pl-1">
                     <MdBusiness className="text-indigo-500 text-sm" /> Biriktirilgan Korxona
                   </label>
                   <select 
                     className={`w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none font-bold text-slate-800 transition-all appearance-none ${formData.role === 'OPERATOR' || formData.role === 'SUPER_ADMIN' ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'bg-slate-50 focus:bg-white focus:border-indigo-500 cursor-pointer'}`}
                     value={formData.role === 'OPERATOR' || formData.role === 'SUPER_ADMIN' ? '' : (formData.companyId || '')}
                     onChange={(e) => setFormData({...formData, companyId: e.target.value})}
                     disabled={formData.role === 'OPERATOR' || formData.role === 'SUPER_ADMIN'}
                   >
                     <option value="">Umumiy (Faqat Tizim Xodimi)</option>
                     {companies.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                   </select>
                 </div>
             </div>

             <div className="space-y-1.5">
               <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-widest pl-1">
                 <MdLock className="text-indigo-500 text-sm" /> {editingUser ? "Yangi parol o'rnatish (Ixtiyoriy)" : "Xavfsizlik Paroli"}
               </label>
               <input 
                 required={!editingUser}
                 type="password"
                 placeholder="••••••••"
                 className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:shadow-indigo-500/10 outline-none font-bold text-slate-800 transition-all"
                 value={formData.password}
                 onChange={(e) => setFormData({...formData, password: e.target.value})}
               />
             </div>
          </div>

          <div className="pt-4">
             <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                type="submit" 
                disabled={saving} 
                className="w-full py-4.5 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all disabled:opacity-50"
             >
               {saving ? 'Saqlanmoqda...' : editingUser ? "O'zgarishlarni Saqlash" : "Foydalanuvchini qo'shish"}
             </motion.button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Ogohlantirish">
        <div className="space-y-6 pt-2">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <MdDeleteOutline className="text-3xl" />
          </div>
          <p className="text-slate-600 font-medium text-center px-4">
            Siz haqiqatan ham <span className="font-black text-slate-900 border-b border-rose-200">{userToDelete?.fullName}</span> profili va unga tegishli huquqlarni butunlay o'chirmoqchimisiz?
            <br />
            <span className="text-xs text-rose-500 mt-4 block bg-rose-50 p-3 rounded-xl border border-rose-100">
               ⚠️ Ushbu amalni ortga qaytarib bo'lmaydi va tizimda ushbu xodim nomi bilan bog'liq zanjir uzilishi mumkin.
            </span>
          </p>
          <div className="flex gap-4 mt-8">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-4.5 bg-slate-100 text-slate-600 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
            >
              Bekor qilish
            </button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={confirmDeleteUser}
              className="flex-1 py-4.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-500/30 transition-all"
            >
              Ha, o'chirilsin
            </motion.button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
