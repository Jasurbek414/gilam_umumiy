'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MdAdd, MdSearch, MdPeople, MdLocalShipping, MdPerson, MdPhone, 
  MdMoreVert, MdEdit, MdBlock, MdDeleteOutline, MdCheckCircle, 
  MdSupervisorAccount, MdWork, MdCalendarMonth, MdAttachMoney,
  MdLocationOn, MdPhotoCamera, MdOutlineAccessTime
} from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import { usersApi, getUser } from '@/lib/api';
import toast from 'react-hot-toast';
import { User, UserRole } from '@/types';

type TabType = 'MANAGER' | 'DRIVER' | 'WORKER';

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<TabType>('DRIVER');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staff, setStaff] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    fullName: '', phone: '', role: 'DRIVER', password: '',
    birthDate: '', birthPlace: '', salary: '', workSchedule: 'MONTHLY',
    photoUrl: ''
  });
  
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    try {
      const user = getUser();
      if (!user?.company?.id) return;
      const data = await usersApi.getByCompany(user.company.id);
      setStaff(data);
    } catch (e) {
      toast.error("Xodimlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData({ 
      fullName: '', phone: '', role: activeTab, password: '', 
      birthDate: '', birthPlace: '', salary: '', workSchedule: 'MONTHLY', photoUrl: '' 
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: User) => {
    setEditingMember(member);
    setFormData({
      fullName: member.fullName || '',
      phone: member.phone || '',
      role: member.role || 'DRIVER',
      password: '',
      birthDate: member.birthDate ? member.birthDate.split('T')[0] : '',
      birthPlace: member.birthPlace || '',
      salary: member.salary ? String(member.salary) : '',
      workSchedule: member.workSchedule || 'MONTHLY',
      photoUrl: member.photoUrl || ''
    });
    setIsModalOpen(true);
    setShowMenuId(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    const loadingToast = toast.loading('Rasm yuklanmoqda...');
    
    try {
      const { url } = await usersApi.uploadPhoto(file);
      setFormData(prev => ({ ...prev, photoUrl: url }));
      toast.success('Rasm yuklandi', { id: loadingToast });
    } catch (error) {
      toast.error('Rasm yuklashda xatolik', { id: loadingToast });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getUser();
    try {
      const submitData: any = {
        fullName: formData.fullName,
        phone: formData.phone,
        role: formData.role as UserRole,
        birthDate: formData.birthDate || null,
        birthPlace: formData.birthPlace || null,
        salary: formData.salary ? Number(formData.salary) : 0,
        workSchedule: formData.workSchedule,
        photoUrl: formData.photoUrl || null
      };

      if (formData.role !== 'WORKER' && formData.password) {
        submitData.password = formData.password;
      }

      if (editingMember) {
        if (!submitData.password) delete submitData.password;
        await usersApi.update(editingMember.id, submitData);
        toast.success('Xodim ma\'lumotlari yangilandi! ✨');
      } else {
        if (formData.role !== 'WORKER' && !formData.password) {
          toast.error('Parol kiritish shart!');
          return;
        }
        await usersApi.create({ ...submitData, companyId: user?.company?.id, status: 'ACTIVE' } as any);
        toast.success('Yangi xodim muvaffaqiyatli qo\'shildi! ✅');
      }
      setIsModalOpen(false);
      await loadStaff();
    } catch (e: any) {
      toast.error('Xatolik: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (memberToDelete) {
      try {
        await usersApi.remove(memberToDelete.id);
        toast.success('Xodim tizimdan o\'chirildi! 🗑️');
        setIsDeleteModalOpen(false);
        setMemberToDelete(null);
        await loadStaff();
      } catch (e: any) {
        toast.error('Xatolik: ' + e.message);
      }
    }
  };

  const toggleStatus = async (member: User) => {
    try {
      const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await usersApi.update(member.id, { status: newStatus });
      toast.success('Holati yangilandi');
      await loadStaff();
    } catch (e: any) {
      toast.error('Xatolik: ' + e.message);
    }
    setShowMenuId(null);
  };

  const tabs = [
    { key: 'DRIVER' as TabType, label: 'Haydovchilar', icon: MdLocalShipping },
    { key: 'MANAGER' as TabType, label: 'Menejerlar', icon: MdSupervisorAccount },
    { key: 'WORKER' as TabType, label: 'Ishchilar', icon: MdWork },
  ];

  const roleLabels: Record<string, string> = {
    'DRIVER': 'Haydovchi',
    'MANAGER': 'Menejer',
    'WORKER': 'Oddiy Ishchi',
  };
  
  const scheduleLabels: Record<string, string> = {
    'MONTHLY': 'Oylik (Stavka)',
    'WEEKLY': 'Haftalik',
    'DAILY': 'Kunlik',
    'HOURLY': 'Soatlik'
  };

  const filteredStaff = staff
    .filter(s => s.role === activeTab)
    .filter(s => (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()));

  const formatSalary = (val: any) => {
    if (!val || val == 0) return '—';
    return Number(val).toLocaleString('uz-UZ') + ' so\'m';
  };

  const formatDate = (val: any) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };
  
  const getPhotoUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${process.env.NEXT_PUBLIC_API_URL || '/api'}${url}`;
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-100">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = staff.filter(s => s.role === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 transform scale-[1.02]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon className="text-xl" />
              {tab.label}
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ml-1 ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Add */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-100">
        <div className="flex-1 w-full md:max-w-md relative group">
          <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Xodimlarni ismidan qidirish..."
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none font-semibold text-slate-800 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 transition-all active:scale-95 text-nowrap"
        >
          <MdAdd className="text-xl" />
          Yangi {roleLabels[activeTab]} Qo'shish
        </button>
      </div>

      {/* Staff Grid/Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin shadow-lg" />
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-xl rounded-3xl border border-slate-200 border-dashed p-16 text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
             <MdPeople className="text-5xl text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-700 mb-2">Hali xodimlar yo'q</h3>
          <p className="text-slate-500 font-medium">Bu bo'limda hozircha {roleLabels[activeTab]} ro'yxatdan o'tmagan.</p>
        </div>
      ) : activeTab === 'WORKER' ? (
        /* WORKER — Jadval ko'rinishi */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-wider">
                  <th className="py-4 px-6">Xodim</th>
                  <th className="py-4 px-6">Telefon & Manzil</th>
                  <th className="py-4 px-6">Maosh & Rejim</th>
                  <th className="py-4 px-6 text-center">Holati</th>
                  <th className="py-4 px-6 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        {member.photoUrl ? (
                          <img src={getPhotoUrl(member.photoUrl)!} alt={member.fullName} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 font-black flex items-center justify-center text-lg shadow-sm border border-slate-200">
                            {member.fullName?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <div>
                           <span className="font-bold text-slate-800 block text-sm">{member.fullName}</span>
                           <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-0.5"><MdCalendarMonth/> {formatDate(member.birthDate)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                       <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><MdPhone className="text-slate-400"/> {member.phone}</div>
                       <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-1"><MdLocationOn className="text-slate-400"/> {member.birthPlace || 'Kiritilmagan'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-black text-emerald-600">{formatSalary(member.salary)}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded-md">{scheduleLabels[member.workSchedule || 'MONTHLY']}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg tracking-widest ${
                        member.status === 'ACTIVE' ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-slate-500 bg-slate-100 border border-slate-200'
                      }`}>
                        {member.status === 'ACTIVE' ? 'FAOL' : 'NOFAOL'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(member)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                          title="Tahrirlash"><MdEdit className="text-lg" /></button>
                        <button onClick={() => { setMemberToDelete(member); setIsDeleteModalOpen(true); }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                          title="O'chirish"><MdDeleteOutline className="text-lg" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-widest text-center">
            Jami: {filteredStaff.length} ta xodim topildi
          </div>
        </div>
      ) : (
        /* DRIVER / MANAGER — Kartochka ko'rinishi */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map(member => {
            const Icon = activeTab === 'DRIVER' ? MdLocalShipping : MdSupervisorAccount;
            return (
              <div key={member.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group relative overflow-hidden flex flex-col">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                
                <div className="p-6 flex-1">
                   <div className="absolute top-4 right-4 z-10">
                     <button
                       onClick={() => setShowMenuId(showMenuId === member.id ? null : member.id)}
                       className="p-2 text-slate-400 hover:text-slate-800 bg-white/80 backdrop-blur rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                     >
                       <MdMoreVert className="text-xl" />
                     </button>
   
                     {showMenuId === member.id && (
                       <div className="absolute top-full right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 z-50 p-2 transform origin-top-right animate-in fade-in zoom-in-95 duration-100">
                         <button
                           onClick={() => handleOpenEdit(member)}
                           className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all flex items-center gap-3"
                         >
                           <MdEdit className="text-lg" /> Tahrirlash
                         </button>
                         <button
                           onClick={() => toggleStatus(member)}
                           className={`w-full text-left px-4 py-2.5 text-xs font-bold mt-1 ${member.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'} rounded-xl transition-all flex items-center gap-3`}
                         >
                           {member.status === 'ACTIVE' ? <><MdBlock className="text-lg" /> To'xtatish</> : <><MdCheckCircle className="text-lg" /> Faollashtirish</>}
                         </button>
                         <div className="h-px bg-slate-100 my-2 mx-2"></div>
                         <button
                           onClick={() => { setMemberToDelete(member); setIsDeleteModalOpen(true); setShowMenuId(null); }}
                           className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-3"
                         >
                           <MdDeleteOutline className="text-lg" /> O'chirish
                         </button>
                       </div>
                     )}
                   </div>
   
                   <div className="flex flex-col items-center text-center mt-2 mb-6 relative">
                     <div className="relative mb-4">
                        {member.photoUrl ? (
                           <img src={getPhotoUrl(member.photoUrl)!} alt={member.fullName} className={`w-24 h-24 rounded-full object-cover shadow-lg border-4 ${member.status === 'ACTIVE' ? 'border-white' : 'border-slate-100'} transition-all duration-300`} />
                        ) : (
                           <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black shadow-lg border-4 ${member.status === 'ACTIVE' ? 'bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-600 border-white' : 'bg-slate-100 text-slate-400 border-slate-50'} transition-all duration-300`}>
                             {member.fullName?.charAt(0)?.toUpperCase()}
                           </div>
                        )}
                        <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                           {member.status === 'ACTIVE' ? <MdCheckCircle className="text-white text-xs"/> : <MdBlock className="text-white text-xs"/>}
                        </div>
                     </div>
                     <h3 className={`text-lg font-black tracking-tight ${member.status === 'ACTIVE' ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{member.fullName}</h3>
                     <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 bg-blue-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                        <Icon /> {roleLabels[member.role] || member.role}
                     </p>
                   </div>
   
                   <div className="space-y-3 pt-4 border-t border-slate-100">
                     <div className="flex items-center gap-3 text-sm text-slate-600 font-semibold p-3 bg-slate-50/80 rounded-2xl hover:bg-blue-50/50 transition-colors">
                       <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm"><MdPhone /></div>
                       {member.phone}
                     </div>
                     <div className="flex items-center gap-3 text-sm text-slate-600 font-semibold p-3 bg-slate-50/80 rounded-2xl hover:bg-emerald-50/50 transition-colors">
                       <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm"><MdAttachMoney /></div>
                       <div className="flex flex-col leading-tight">
                          <span>{formatSalary(member.salary)}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{scheduleLabels[member.workSchedule || 'MONTHLY']}</span>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modern Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? "Xodim Ma'lumotlarini Tahrirlash" : `Yangi ${roleLabels[formData.role] || 'Xodim'} Qo'shish`}
      >
        <form onSubmit={handleSubmit} className="space-y-6 pb-2">
          
          {/* Photo Upload Area */}
          <div className="flex justify-center mb-2">
             <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/jpeg, image/png, image/webp" 
                  className="hidden" 
                />
                <div className={`w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-50 flex items-center justify-center relative ${uploadingPhoto ? 'opacity-50' : ''}`}>
                   {formData.photoUrl ? (
                      <img src={getPhotoUrl(formData.photoUrl)!} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                      <MdPerson className="text-6xl text-slate-300" />
                   )}
                   <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <MdPhotoCamera className="text-white text-2xl" />
                      <span className="text-white text-[10px] font-bold uppercase mt-1">Rasm yuklash</span>
                   </div>
                </div>
                {uploadingPhoto && (
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                   </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Xodim Ismi (F.I.O)</label>
               <input
                 required
                 className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 transition-all"
                 placeholder="Ism Familiya"
                 value={formData.fullName}
                 onChange={(e) => setFormData({...formData, fullName: e.target.value})}
               />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Telefon raqami</label>
               <input
                 required
                 className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 transition-all"
                 placeholder="+998"
                 value={formData.phone}
                 onChange={(e) => setFormData({...formData, phone: e.target.value})}
               />
             </div>

             <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Tug'ilgan sanasi</label>
               <input
                 type="date"
                 required
                 className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 transition-all"
                 value={formData.birthDate}
                 onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
               />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Tug'ilgan joyi</label>
               <input
                 className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 transition-all"
                 placeholder="Viloyat, Tuman"
                 value={formData.birthPlace}
                 onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
               />
             </div>

             {/* Rol tanlash — faqat yangi qo'shishda ko'rinadi (yoki admin ruxsati bilan) */}
             {!editingMember && (
               <div className="space-y-2 md:col-span-2">
                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Vazifasi (Roli)</label>
                 <select
                   className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 transition-all cursor-pointer"
                   value={formData.role}
                   onChange={(e) => setFormData({...formData, role: e.target.value})}
                 >
                   <option value="DRIVER">Haydovchi</option>
                   <option value="MANAGER">Menejer</option>
                   <option value="WORKER">Oddiy Ishchi</option>
                 </select>
               </div>
             )}

             <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1"><MdOutlineAccessTime/> Ish rejimi</label>
               <select
                 className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 transition-all cursor-pointer"
                 value={formData.workSchedule}
                 onChange={(e) => setFormData({...formData, workSchedule: e.target.value})}
               >
                 <option value="MONTHLY">Oylik (Stavka)</option>
                 <option value="WEEKLY">Haftalik</option>
                 <option value="DAILY">Kunlik</option>
                 <option value="HOURLY">Soatlik</option>
               </select>
             </div>
             
             <div className="space-y-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Belgilangan Maosh</label>
               <div className="relative">
                  <input
                    type="number"
                    className="w-full pl-5 pr-14 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 transition-all"
                    placeholder="Masalan: 3000000"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">UZS</span>
               </div>
             </div>

             {/* Parol — faqat DRIVER va MANAGER uchun */}
             {formData.role !== 'WORKER' && (
               <div className="space-y-2 md:col-span-2">
                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Tizimga kirish paroli</label>
                 <input
                   required={!editingMember}
                   type="password"
                   className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-800 transition-all"
                   placeholder={editingMember ? "Parolni o'zgartirish uchun yozing (yo'qsa bo'sh)" : "Kamida 6 xona"}
                   value={formData.password}
                   onChange={(e) => setFormData({...formData, password: e.target.value})}
                 />
               </div>
             )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors">
              Bekor qilish
            </button>
            <button type="submit" disabled={uploadingPhoto} className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50">
              {editingMember ? 'SAQLASH' : 'XODIMNI QO\'SHISH'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xodimni o'chirish">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <MdDeleteOutline className="text-3xl text-rose-500" />
          </div>
          <p className="text-slate-600 font-medium text-center">
            Siz haqiqatan ham <span className="font-black text-slate-800">{memberToDelete?.fullName}</span> tizimdan butunlay o'chirmoqchimisiz?
            <br />
            <span className="text-xs font-bold text-rose-500 mt-3 block bg-rose-50 p-2 rounded-lg border border-rose-100">DIQQAT: Ushbu amalni ortga qaytarib bo'lmaydi.</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Yo'q, qolsin
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-3.5 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all active:scale-95"
            >
              Ha, o'chirilsin
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
