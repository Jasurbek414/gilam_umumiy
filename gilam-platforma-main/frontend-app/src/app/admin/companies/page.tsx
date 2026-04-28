'use client';

import React, { useState, useEffect } from 'react';
import { MdAdd, MdPhone, MdBusiness, MdEdit, MdDeleteOutline, MdLock, MdPerson } from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import { companiesApi, usersApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function CompaniesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [companyToDelete, setCompanyToDelete] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Korxona yaratish/tahrirlash formasi
  const [formData, setFormData] = useState({ name: '', phoneNumber: '', status: 'ACTIVE' });

  // Parol o'zgartirish
  const [pwCompany, setPwCompany] = useState<any>(null);
  const [pwUsers, setPwUsers] = useState<any[]>([]);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwForm, setPwForm] = useState<Record<string, string>>({});
  const [pwSaving, setPwSaving] = useState<string | null>(null);

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    try {
      const data = await companiesApi.getAll();
      setCompanies(data);
    } catch {
      toast.error('Korxonalarni yuklashda xato');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (company: any = null) => {
    if (company) {
      setEditingCompany(company);
      setFormData({ name: company.name, phoneNumber: company.phoneNumber || '', status: company.status });
    } else {
      setEditingCompany(null);
      setFormData({ name: '', phoneNumber: '', status: 'ACTIVE' });
    }
    setIsModalOpen(true);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCompany) {
        await companiesApi.update(editingCompany.id, formData as any);
        toast.success('Korxona yangilandi');
      } else {
        await companiesApi.create(formData as any);
        toast.success('Yangi korxona qo\'shildi');
      }
      await loadCompanies();
      setIsModalOpen(false);
      setEditingCompany(null);
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (company: any) => {
    const newStatus = company.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await companiesApi.update(company.id, { status: newStatus } as any);
      await loadCompanies();
      toast.success('Holati o\'zgartirildi');
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    }
  };

  // Parol o'zgartirish modal ochish
  const handleOpenPasswordModal = async (company: any) => {
    setPwCompany(company);
    setPwUsers([]);
    setPwForm({});
    setPwLoading(true);
    setIsPasswordModalOpen(true);
    try {
      const users = await usersApi.getByCompany(company.id);
      setPwUsers(users);
      const initial: Record<string, string> = {};
      users.forEach((u: any) => { initial[u.id] = ''; });
      setPwForm(initial);
    } catch {
      toast.error('Xodimlarni yuklashda xato');
    } finally {
      setPwLoading(false);
    }
  };

  const handleChangePassword = async (userId: string, userName: string) => {
    const newPw = pwForm[userId];
    if (!newPw || newPw.length < 6) {
      toast.error('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }
    setPwSaving(userId);
    try {
      await usersApi.update(userId, { password: newPw });
      toast.success(`${userName} paroli o'zgartirildi`);
      setPwForm(prev => ({ ...prev, [userId]: '' }));
    } catch (err: any) {
      toast.error('Xatolik: ' + err.message);
    } finally {
      setPwSaving(null);
    }
  };

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    COMPANY_ADMIN: 'Korxona Admin',
    OPERATOR: 'Operator',
    DRIVER: 'Haydovchi',
    WASHER: 'Yuvuvchi',
    CUSTOMER: 'Mijoz',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight border-b-2 border-indigo-600 inline-block pb-1">
            Korxonalar Ro&apos;yxati
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Bazadan {companies.length} ta korxona topildi</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-95"
        >
          <MdAdd className="text-xl" /> Yangi Korxona
        </button>
      </div>

      {/* Korxona yaratish/tahrirlash modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCompany ? 'Korxonani Tahrirlash' : 'Yangi Korxona Qo\'shish'}
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">Holati</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFormData({ ...formData, status: 'ACTIVE' })}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.status === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white text-slate-500 border border-slate-200'}`}>
                ✅ Faol
              </button>
              <button type="button" onClick={() => setFormData({ ...formData, status: 'INACTIVE' })}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.status === 'INACTIVE' ? 'bg-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-white text-slate-500 border border-slate-200'}`}>
                🛑 Bloklangan
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Korxona Nomi</label>
            <div className="relative">
              <MdBusiness className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 text-xl" />
              <input required
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800"
                placeholder="Masalan: Pokiza MChJ"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Telefon</label>
            <div className="relative">
              <MdPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 text-xl" />
              <input
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800"
                placeholder="+998 90 000 00 00"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl">
              BEKOR QILISH
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-50">
              {saving ? 'SAQLANMOQDA...' : editingCompany ? 'YANGILASH' : 'SAQLASH'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Parol o'zgartirish modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Parollar — ${pwCompany?.name}`}
      >
        <div className="space-y-4">
          {pwLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : pwUsers.length === 0 ? (
            <p className="text-center text-slate-400 font-medium py-6">Bu korxonada xodimlar yo'q</p>
          ) : (
            pwUsers.map((u: any) => (
              <div key={u.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <MdPerson className="text-lg" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{u.fullName}</p>
                    <p className="text-xs text-slate-400 font-medium">{u.phone} · {roleLabel[u.role] || u.role}</p>
                  </div>
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleChangePassword(u.id, u.fullName); }}
                  className="flex gap-2"
                >
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Yangi parol (min. 6 belgi)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-medium text-slate-700 bg-white"
                    value={pwForm[u.id] || ''}
                    onChange={(e) => setPwForm(prev => ({ ...prev, [u.id]: e.target.value }))}
                  />
                  <button
                    type="submit"
                    disabled={pwSaving === u.id || !pwForm[u.id]}
                    className="px-4 py-2.5 bg-indigo-600 text-white font-black rounded-xl text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:translate-y-0 flex items-center gap-1.5"
                  >
                    <MdLock className="text-base" />
                    {pwSaving === u.id ? '...' : 'Saqlash'}
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest">
                <th className="py-5 px-8">Korxona</th>
                <th className="py-5 px-6">Shaxsiy Linki</th>
                <th className="py-5 px-6">Telefon</th>
                <th className="py-5 px-6 text-center">Holati</th>
                <th className="py-5 px-8 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">{company.name}</span>
                        <p className="text-[10px] text-slate-400 font-bold">ID: {company.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-indigo-600 font-mono">
                        /company/login
                      </span>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/company/login`;
                          navigator.clipboard.writeText(url);
                          toast.success('Link nusxalandi!');
                        }}
                        className="text-[10px] text-slate-400 font-bold uppercase hover:text-indigo-600 transition-colors text-left"
                      >
                        📋 Nusxalash
                      </button>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-slate-600 text-sm font-bold">
                        <MdPhone className="text-slate-400" /> {company.phoneNumber || '—'}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{company.users?.length || 0} ta xodim</span>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-center">
                    <button onClick={() => handleToggleStatus(company)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-tighter border transition-all active:scale-95 ${company.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                      {company.status === 'ACTIVE' ? 'Faol' : 'Bloklangan'}
                    </button>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex justify-end gap-2">
                      {/* Parol o'zgartirish */}
                      <button onClick={() => handleOpenPasswordModal(company)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-0.5 transition-all group relative"
                        title="Parol o'zgartirish">
                        <MdLock className="text-xl" />
                        <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap">Parol</span>
                      </button>
                      {/* Tahrirlash */}
                      <button onClick={() => handleOpenModal(company)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all group relative">
                        <MdEdit className="text-xl" />
                        <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl pointer-events-none">Tahrirlash</span>
                      </button>
                      {/* O'chirish */}
                      <button onClick={() => { setCompanyToDelete(company); setIsDeleteModalOpen(true); }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:shadow-lg hover:shadow-rose-500/20 hover:-translate-y-0.5 transition-all group relative">
                        <MdDeleteOutline className="text-xl" />
                        <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl pointer-events-none">O'chirish</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 text-sm text-slate-500 font-bold">
          Jami: {companies.length} ta korxona
        </div>
      </div>

      {/* O'chirish tasdiqlash modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Korxonani o'chirish">
        <div className="space-y-6">
          <p className="text-slate-600 font-medium">
            Siz haqiqatan ham <span className="font-black text-slate-800">"{companyToDelete?.name}"</span> korxonasini o'chirmoqchimisiz?
            <br />
            <span className="text-xs text-rose-500 mt-2 block">Diqqat! Bu amal barcha buyurtmalar, xodimlar va mijozlarni butunlay o'chirib yuboradi.</span>
          </p>
          <div className="flex gap-3">
            <button onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">
              Yo'q, bekor qilish
            </button>
            <button onClick={async () => {
              if (!companyToDelete) return;
              try {
                await companiesApi.remove(companyToDelete.id);
                setIsDeleteModalOpen(false);
                setCompanyToDelete(null);
                await loadCompanies();
                toast.success('Korxona o\'chirildi');
              } catch (err: any) { toast.error('Xatolik: ' + err.message); }
            }}
              className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all hover:-translate-y-1">
              Ha, o'chirilsin
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
