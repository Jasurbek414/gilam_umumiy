'use client';

import React, { useState, useEffect } from 'react';
import { MdAdd, MdSearch, MdPeople, MdLocalShipping, MdPerson, MdPhone, MdMoreVert, MdEdit, MdBlock, MdDeleteOutline, MdCheckCircle, MdSupervisorAccount, MdWork, MdCalendarMonth, MdAttachMoney } from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import { usersApi, getUser } from '@/lib/api';
import toast from 'react-hot-toast';

type TabType = 'MANAGER' | 'DRIVER' | 'WORKER';

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<TabType>('DRIVER');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    fullName: '', phone: '', role: 'DRIVER', password: '',
    birthDate: '', salary: ''
  });
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    setFormData({ fullName: '', phone: '', role: activeTab, password: '', birthDate: '', salary: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: any) => {
    setEditingMember(member);
    setFormData({
      fullName: member.fullName,
      phone: member.phone,
      role: member.role,
      password: '',
      birthDate: member.birthDate ? member.birthDate.split('T')[0] : '',
      salary: member.salary ? String(member.salary) : ''
    });
    setIsModalOpen(true);
    setShowMenuId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getUser();
    try {
      const submitData: any = {
        fullName: formData.fullName,
        phone: formData.phone,
        role: formData.role,
      };

      // WORKER uchun parol kerak emas
      if (formData.role !== 'WORKER' && formData.password) {
        submitData.password = formData.password;
      }
      if (formData.role === 'WORKER' || formData.birthDate) {
        submitData.birthDate = formData.birthDate || null;
      }
      if (formData.role === 'WORKER' || formData.salary) {
        submitData.salary = formData.salary ? Number(formData.salary) : 0;
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

  const tabs = [
    { key: 'DRIVER' as TabType, label: 'Haydovchilar', icon: MdLocalShipping, color: 'indigo' },
    { key: 'MANAGER' as TabType, label: 'Menejerlar', icon: MdSupervisorAccount, color: 'violet' },
    { key: 'WORKER' as TabType, label: 'Ishchilar', icon: MdWork, color: 'emerald' },
  ];

  const roleLabels: Record<string, string> = {
    'DRIVER': 'Haydovchi',
    'MANAGER': 'Menejer',
    'WORKER': 'Oddiy Ishchi',
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

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-2 bg-white rounded-2xl shadow-sm border border-slate-100">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = staff.filter(s => s.role === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon className="text-xl" />
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Add */}
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
          {activeTab === 'WORKER' ? 'Yangi Ishchi' : activeTab === 'MANAGER' ? 'Yangi Menejer' : 'Yangi Haydovchi'} Qo'shish
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
          <MdPeople className="text-6xl text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Bu kategoriyada hali xodimlar yo'q</p>
        </div>
      ) : activeTab === 'WORKER' ? (
        /* WORKER — Jadval ko'rinishi */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest">
                  <th className="py-5 px-6">#</th>
                  <th className="py-5 px-6">F.I.O</th>
                  <th className="py-5 px-6">Telefon</th>
                  <th className="py-5 px-6">Tug'ilgan sana</th>
                  <th className="py-5 px-6">Oylik</th>
                  <th className="py-5 px-6 text-center">Holati</th>
                  <th className="py-5 px-6 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((member, idx) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-slate-400 font-bold text-sm">{idx + 1}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm">
                          {member.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800">{member.fullName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-600">{member.phone}</td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-600">{formatDate(member.birthDate)}</td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-black text-emerald-600">{formatSalary(member.salary)}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg tracking-widest ${
                        member.status === 'ACTIVE' ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-slate-400 bg-slate-100 border border-slate-200'
                      }`}>
                        {member.status === 'ACTIVE' ? 'FAOL' : 'NOFAOL'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenEdit(member)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                          title="Tahrirlash"><MdEdit className="text-lg" /></button>
                        <button onClick={() => { setMemberToDelete(member); setIsDeleteModalOpen(true); }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                          title="O'chirish"><MdDeleteOutline className="text-lg" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 text-sm text-slate-500 font-bold">
            Jami: {filteredStaff.length} ta ishchi
          </div>
        </div>
      ) : (
        /* DRIVER / MANAGER — Kartochka ko'rinishi */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map(member => {
            const Icon = activeTab === 'DRIVER' ? MdLocalShipping : MdSupervisorAccount;
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
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2">
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
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{roleLabels[member.role] || member.role}</p>
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
                      {member.status === 'ACTIVE' ? 'FAOL' : 'NOFAOL'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? "Xodim Ma'lumotlarini Tahrirlash" : `Yangi ${roleLabels[formData.role] || 'Xodim'} Qo'shish`}
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

          {/* Parol — faqat DRIVER va MANAGER uchun */}
          {formData.role !== 'WORKER' && (
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
          )}

          {/* Tug'ilgan sana — barcha rollar uchun, lekin ayniqsa WORKER */}
          {formData.role === 'WORKER' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Tug'ilgan sanasi</label>
                <input
                  type="date"
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Oylik (so'm)</label>
                <input
                  type="number"
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800"
                  placeholder="3 000 000"
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: e.target.value})}
                />
              </div>
            </>
          )}

          {/* Rol tanlash — faqat yangi qo'shishda */}
          {!editingMember && (
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Vazifasi (Roli)</label>
              <select
                className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800 bg-white"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="DRIVER">Haydovchi</option>
                <option value="MANAGER">Menejer</option>
                <option value="WORKER">Oddiy Ishchi</option>
              </select>
            </div>
          )}

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
