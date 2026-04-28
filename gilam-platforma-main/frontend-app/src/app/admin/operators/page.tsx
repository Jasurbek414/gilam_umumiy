'use client';

import React, { useState, useEffect } from 'react';
import {
  MdAdd, MdSearch, MdSupportAgent, MdPhone,
  MdLock, MdEdit, MdDeleteOutline, MdPerson, MdBusiness
} from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import { usersApi, companiesApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function OperatorsPage() {
  const [operators, setOperators] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<any>(null);
  const [opToDelete, setOpToDelete] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    password: '',
    companyId: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ops, comps] = await Promise.all([
        usersApi.getOperators(),
        companiesApi.getAll(),
      ]);
      setOperators(ops);
      setCompanies(comps);
    } catch {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }

  const openAdd = () => {
    setEditingOp(null);
    setFormData({ fullName: '', phone: '', password: '', companyId: '', status: 'ACTIVE' });
    setIsModalOpen(true);
  };

  const openEdit = (op: any) => {
    setEditingOp(op);
    setFormData({ fullName: op.fullName, phone: op.phone, password: '', companyId: op.companyId || '', status: op.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingOp) {
        const updateData: any = { ...formData };
        if (!updateData.password) delete updateData.password;
        if (!updateData.companyId) updateData.companyId = null;
        await usersApi.update(editingOp.id, updateData);
        toast.success("Operator ma'lumotlari yangilandi ✅");
      } else {
        // companyId is now optional for global operators
        const submitData = { ...formData, role: 'OPERATOR' };
        if (!submitData.companyId) {
          delete (submitData as any).companyId; // Let backend make it null
        }
        await usersApi.create(submitData as any);
        toast.success("Yangi operator qo'shildi ✅");
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!opToDelete) return;
    try {
      await usersApi.remove(opToDelete.id);
      toast.success("Operator o'chirildi");
      setIsDeleteModalOpen(false);
      setOpToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    }
  };

  const toggleStatus = async (op: any) => {
    const newStatus = op.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await usersApi.update(op.id, { status: newStatus });
      toast.success(newStatus === 'ACTIVE' ? 'Operator faollashtirildi' : "Operator to'xtatildi");
      await loadData();
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    }
  };

  const filtered = operators.filter(op => {
    const matchSearch = (op.fullName || '').toLowerCase().includes(search.toLowerCase()) || (op.phone || '').includes(search);
    const matchCompany = filterCompany ? op.companyId === filterCompany : true;
    return matchSearch && matchCompany;
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
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black border-b-[3px] border-indigo-600 inline-block pb-1 text-slate-800 tracking-tight">
            Operatorlar Boshqaruvi
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Barcha operatorlar va ularning korxonalari</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
        >
          <MdAdd className="text-lg" />
          Yangi Operator
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Jami</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{operators.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Faol</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{operators.filter(o => o.status === 'ACTIVE').length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">To'xtatilgan</p>
          <p className="text-3xl font-black text-rose-600 mt-1">{operators.filter(o => o.status !== 'ACTIVE').length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Korxonalar</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{new Set(operators.map(o => o.companyId).filter(Boolean)).size}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
          <input
            type="text"
            placeholder="Ism yoki telefon..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-600"
          value={filterCompany}
          onChange={e => setFilterCompany(e.target.value)}
        >
          <option value="">Barcha korxonalar</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-widest">
                <th className="py-4 px-6 font-semibold">Operator</th>
                <th className="py-4 px-6 font-semibold">Telefon</th>
                <th className="py-4 px-6 font-semibold">Korxona</th>
                <th className="py-4 px-6 font-semibold text-center">Holati</th>
                <th className="py-4 px-6 font-semibold text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(op => (
                <tr key={op.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <MdSupportAgent className="text-indigo-500 text-lg" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{op.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Operator</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-600 text-sm font-medium">{op.phone}</td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      {op.company?.name || 'Tizim / Barcha korxonalar'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => toggleStatus(op)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all hover:scale-105 ${
                        op.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}
                      title={op.status === 'ACTIVE' ? "To'xtatish" : "Faollashtirish"}
                    >
                      {op.status === 'ACTIVE' ? 'Faol' : "To'xtatilgan"}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(op)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                        title="Tahrirlash"
                      >
                        <MdEdit className="text-lg" />
                      </button>
                      <button
                        onClick={() => { setOpToDelete(op); setIsDeleteModalOpen(true); }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                        title="O'chirish"
                      >
                        <MdDeleteOutline className="text-lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    Operatorlar topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingOp ? "Operatorni Tahrirlash" : "Yangi Operator Qo'shish"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <MdPerson className="text-indigo-400" /> To'liq ismi
            </label>
            <input
              required
              placeholder="Sardor Rahimov"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <MdPhone className="text-indigo-400" /> Telefon raqami
            </label>
            <input
              required
              type="tel"
              placeholder="+998901234567"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <MdLock className="text-indigo-400" /> {editingOp ? "Yangi parol (ixtiyoriy)" : "Kirish paroli"}
            </label>
            <input
              required={!editingOp}
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <MdBusiness className="text-indigo-400" /> Biriktirilgan Korxona
            </label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold bg-white text-slate-700"
              value={formData.companyId}
              onChange={e => setFormData({ ...formData, companyId: e.target.value })}
            >
              <option value="">Alohida korxonaga bog'lanmagan (Umumiy Tizim)</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Holati</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFormData({ ...formData, status: 'ACTIVE' })}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${formData.status === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}>
                Faol
              </button>
              <button type="button" onClick={() => setFormData({ ...formData, status: 'INACTIVE' })}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${formData.status === 'INACTIVE' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}>
                To'xtatilgan
              </button>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 hover:-translate-y-0.5">
            {saving ? 'Saqlanmoqda...' : editingOp ? "O'zgarishlarni Saqlash" : "Operatorni Qo'shish"}
          </button>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Operatorni o'chirish">
        <div className="space-y-6">
          <p className="text-slate-600 font-medium">
            <span className="font-black text-slate-800">{opToDelete?.fullName}</span> operatorini tizimdan o'chirmoqchimisiz?
            <br />
            <span className="text-xs text-rose-500 mt-2 block">Bu amalni qaytarib bo'lmaydi.</span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">
              Bekor qilish
            </button>
            <button onClick={handleDelete}
              className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-lg hover:bg-rose-700 transition-all">
              Ha, o'chirilsin
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
