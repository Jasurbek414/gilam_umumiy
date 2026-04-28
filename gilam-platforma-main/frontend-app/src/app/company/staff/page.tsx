'use client';

import React, { useState, useEffect } from 'react';
import { MdAdd, MdSearch, MdPeople, MdLocalShipping, MdPerson, MdPhone, MdMoreVert, MdEdit, MdBlock, MdDeleteOutline, MdCheckCircle } from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import { usersApi, getUser } from '@/lib/api';
import toast from 'react-hot-toast';

export default function StaffPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [formData, setFormData] = useState({ fullName: '', phone: '', role: 'DRIVER', password: '' });
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

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
    setFormData({ fullName: '', phone: '', role: 'DRIVER', password: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: any) => {
    setEditingMember(member);
    setFormData({ fullName: member.fullName, phone: member.phone, role: member.role, password: '' });
    setIsModalOpen(true);
    setShowMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getUser();
    try {
      if (editingMember) {
        const updateData: any = { ...formData };
        if (!updateData.password) delete updateData.password;
        await usersApi.update(editingMember.id, updateData);
        toast.success('Xodim ma\'lumotlari yangilandi! ✨');
      } else {
        await usersApi.create({ ...formData, companyId: user?.company?.id, status: 'ACTIVE' } as any);
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

  const toggleStatus = async (member: any) => {
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

  const roleIcons: Record<string, any> = {
    'DRIVER': MdLocalShipping,
    'WASHER': MdPeople,
    'FINISHER': MdPerson,
    'OPERATOR': MdPhone,
    'COMPANY_ADMIN': MdPeople,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
        <div className="flex-1 w-full md:max-w-md relative group">
          <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-indigo-600 transition-colors" />
          <input 
            type="text"
            placeholder="Xodimlarni qidirish..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-95 text-nowrap"
        >
          <MdAdd className="text-xl" />
          Yangi Xodim Qo'shish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff
          .filter(s => !['COMPANY_ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(s.role))
          .filter(s => (s.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()))
          .map(member => {
            const Icon = roleIcons[member.role] || MdPerson;
            return (
              <div key={member.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative">
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => setShowMenuId(showMenuId === member.id ? null : member.id)}
                    className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    <MdMoreVert className="text-xl" />
                  </button>
                  
                  {showMenuId === member.id && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                      <button 
                        onClick={() => handleOpenEdit(member)}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-2"
                      >
                        <MdEdit className="text-lg" /> Tahrirlash
                      </button>
                      <button 
                        onClick={() => toggleStatus(member)}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold ${member.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'} rounded-xl transition-all flex items-center gap-2`}
                      >
                        {member.status === 'ACTIVE' ? <><MdBlock className="text-lg" /> To'xtatish</> : <><MdCheckCircle className="text-lg" /> Faollashtirish</>}
                      </button>
                      <div className="h-px bg-slate-100 my-1 mx-2"></div>
                      <button 
                        onClick={() => { setMemberToDelete(member); setIsDeleteModalOpen(true); setShowMenuId(null); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2"
                      >
                        <MdDeleteOutline className="text-lg" /> O'chirish
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${
                    member.status === 'ACTIVE' 
                      ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' 
                      : 'bg-slate-50 text-slate-400'
                  }`}>
                    <Icon />
                  </div>
                  <div>
                    <h3 className={`font-black tracking-tight ${member.status === 'ACTIVE' ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{member.fullName}</h3>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{member.role}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50 p-3 rounded-xl">
                    <MdPhone className="text-indigo-400" />
                    {member.phone}
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-400">Holati:</span>
                    <span className={`text-[10px] font-black px-2 py-1 rounded tracking-widest ${
                      member.status === 'ACTIVE' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'
                    }`}>
                      {member.status === 'ACTIVE' ? 'FAOL' : 'OFFLINE'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMember ? "Xodim Ma'lumotlarini Tahrirlash" : "Yangi Xodim Qo'shish"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Xodim Ismi (F.I.O)</label>
            <input 
              required
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800"
              placeholder="Sardor Rahimov"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Telefon raqami</label>
            <input 
              required
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800"
              placeholder="+998"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Tizimga kirish paroli</label>
            <input 
              required={!editingMember}
              type="password"
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800"
              placeholder={editingMember ? "Yangi parol (yoki bo'sh qoldiring)" : "••••••••"}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Vazifasi (Roli)</label>
            <select
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800 bg-white"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="DRIVER">Haydovchi</option>
              <option value="WASHER">Yuvuvchi</option>
              <option value="FINISHER">Pardozchi (Qadoqlovchi)</option>
            </select>
          </div>
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl mt-4 shadow-xl shadow-indigo-500/30 active:scale-95 transition-all">
            {editingMember ? 'O\'ZGARIŞLARNI SAQLASH' : 'XODIMNI QO\'SHISH'}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xodimni o'chirish">
        <div className="space-y-6">
          <p className="text-slate-600 font-medium">
            Siz haqiqatan ham <span className="font-black text-slate-800">{memberToDelete?.fullName}</span>ni tizimdan o'chirmoqchimisiz?
            <br />
            <span className="text-xs text-rose-500 mt-2 block">Ushbu amalni ortga qaytarib bo'lmaydi.</span>
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              Yo'q, qolsin
            </button>
            <button 
              onClick={handleDelete}
              className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all"
            >
              Ha, o'chirilsin
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
