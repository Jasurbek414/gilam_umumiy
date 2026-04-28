'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MdCampaign, MdAdd, MdEdit, MdDelete, MdPhone, MdCheckCircle,
  MdGroup, MdRefresh, MdDirectionsCar, MdAddCircleOutline, MdClose,
} from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { campaignsApi, usersApi, getUser } from '@/lib/api';

interface CampaignForm {
  name: string;
  phoneNumber: string;
  extraNumbers: string[];
  description: string;
  driverId: string;
  operatorIds: string[];
  status: string;
}

const empty: CampaignForm = {
  name: '', phoneNumber: '', extraNumbers: [],
  description: '', driverId: '', operatorIds: [], status: 'ACTIVE',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(empty);
  const [isSaving, setIsSaving] = useState(false);
  const [newNum, setNewNum] = useState('');

  const load = useCallback(async () => {
    const user = getUser();
    if (!user) return;
    setIsLoading(true);
    try {
      const [camps, users] = await Promise.all([
        campaignsApi.getAll(),
        usersApi.getByCompany(user.companyId || user.company?.id || ''),
      ]);
      setCampaigns(camps);
      setOperators((users as any[]).filter((u: any) => u.role === 'OPERATOR'));
      setDrivers((users as any[]).filter((u: any) => u.role === 'DRIVER'));
    } catch (e: any) { toast.error(e.message); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditId(null); setForm(empty); setIsOpen(true); };
  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      name: c.name, phoneNumber: c.phoneNumber,
      extraNumbers: c.extraNumbers || [],
      description: c.description || '',
      driverId: c.driver?.id || '',
      operatorIds: c.operators?.map((o: any) => o.id) || [],
      status: c.status,
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phoneNumber) { toast.error('Ism va raqam majburiy'); return; }
    setIsSaving(true);
    try {
      const payload = { ...form, driverId: form.driverId || undefined, status: form.status as any };
      if (editId) await campaignsApi.update(editId, payload);
      else await campaignsApi.create(payload);
      toast.success(editId ? 'Yangilandi!' : 'Yaratildi!');
      setIsOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try {
      await campaignsApi.remove(id);
      toast.success("O'chirildi");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const addExtraNum = () => {
    if (!newNum.trim()) return;
    setForm(f => ({ ...f, extraNumbers: [...f.extraNumbers, newNum.trim()] }));
    setNewNum('');
  };
  const removeExtraNum = (n: string) =>
    setForm(f => ({ ...f, extraNumbers: f.extraNumbers.filter(x => x !== n) }));
  const toggleOp = (id: string) =>
    setForm(f => ({ ...f, operatorIds: f.operatorIds.includes(id) ? f.operatorIds.filter(x => x !== id) : [...f.operatorIds, id] }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Kampaniyalar</h1>
          <p className="text-slate-500 text-sm mt-1">Har bir raqam → kampaniya → haydovchi zanjiri</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="p-2 text-slate-400 hover:text-indigo-600"><MdRefresh className="text-xl" /></button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-black rounded-2xl text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700">
            <MdAdd /> Yangi kampaniya
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Jami', v: campaigns.length, c: 'text-indigo-600' },
          { label: 'Faol', v: campaigns.filter(c => c.status === 'ACTIVE').length, c: 'text-emerald-600' },
          { label: 'Jami raqamlar', v: campaigns.reduce((s, c) => s + 1 + (c.extraNumbers?.length || 0), 0), c: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Kampaniyalar */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 flex flex-col items-center border-2 border-dashed border-slate-100">
          <MdCampaign className="text-5xl text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-800">Kampaniya yo'q</h3>
          <button onClick={openCreate} className="mt-5 px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl text-sm">
            Birinchi kampaniyani yaratish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns.map(c => (
            <motion.div key={c.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              {/* Yuqori qator */}
              <div className="flex items-start justify-between mb-4">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {c.status === 'ACTIVE' ? 'Faol' : 'Nofaol'}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><MdEdit className="text-sm" /></button>
                  <button onClick={() => handleDelete(c.id)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"><MdDelete className="text-sm" /></button>
                </div>
              </div>

              {/* Ism */}
              <h3 className="text-lg font-black text-slate-800 mb-2">{c.name}</h3>

              {/* Raqamlar */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <MdPhone className="text-sm shrink-0" />
                  <span className="text-sm font-bold font-mono">{c.phoneNumber}</span>
                  <span className="text-[9px] bg-indigo-50 px-1.5 py-0.5 rounded font-black text-indigo-400 uppercase">asosiy</span>
                </div>
                {c.extraNumbers?.map((n: string) => (
                  <div key={n} className="flex items-center gap-2 text-slate-500 pl-1">
                    <MdPhone className="text-xs shrink-0" />
                    <span className="text-xs font-mono">{n}</span>
                  </div>
                ))}
              </div>

              {/* Haydovchi */}
              {c.driver ? (
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl mb-3 border border-emerald-100">
                  <MdDirectionsCar className="text-emerald-600 text-sm shrink-0" />
                  <div>
                    <p className="text-xs font-black text-emerald-700">{c.driver.fullName}</p>
                    <p className="text-[9px] text-emerald-500 font-medium">{c.driver.phone}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-xl mb-3 border border-amber-100">
                  <MdDirectionsCar className="text-amber-400 text-sm" />
                  <p className="text-xs font-bold text-amber-600">Haydovchi biriktirilmagan</p>
                </div>
              )}

              {/* Operatorlar */}
              <div className="pt-3 border-t border-slate-50">
                <div className="flex items-center gap-2 mb-2">
                  <MdGroup className="text-slate-400 text-sm" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {c.operators?.length || 0} operator
                  </span>
                </div>
                {c.operators?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.operators.slice(0, 3).map((op: any) => (
                      <div key={op.id} className="flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg">
                        <div className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[7px] font-black">{op.fullName?.charAt(0)}</div>
                        <span className="text-[9px] font-bold text-indigo-700 truncate max-w-[60px]">{op.fullName}</span>
                      </div>
                    ))}
                    {c.operators.length > 3 && (
                      <div className="bg-slate-100 px-2 py-1 rounded-lg">
                        <span className="text-[9px] font-black text-slate-500">+{c.operators.length - 3}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editId ? 'Kampaniyani tahrirlash' : 'Yangi kampaniya'}>
        <div className="space-y-5">
          {/* Ism */}
          <div>
            <label className="label">Kampaniya nomi *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Masalan: Chilonzor viloyati, VIP mijozlar..."
              className="field" />
          </div>

          {/* Asosiy raqam */}
          <div>
            <label className="label">Asosiy DID raqam *</label>
            <div className="relative">
              <MdPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="+998711234567"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Zadarma yoki SIP trunk'dan olingan DID raqam</p>
          </div>

          {/* Qo'shimcha raqamlar */}
          <div>
            <label className="label">Qo'shimcha raqamlar (ixtiyoriy)</label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <MdPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input value={newNum} onChange={e => setNewNum(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addExtraNum()}
                  placeholder="+998712345678"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500" />
              </div>
              <button onClick={addExtraNum} className="px-3 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all">
                <MdAddCircleOutline className="text-lg" />
              </button>
            </div>
            {form.extraNumbers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.extraNumbers.map(n => (
                  <div key={n} className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                    <span className="text-xs font-mono font-bold text-indigo-700">{n}</span>
                    <button onClick={() => removeExtraNum(n)} className="text-indigo-400 hover:text-rose-500 ml-1"><MdClose className="text-sm" /></button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">Bir kampaniyaga bir nechta raqam ulash mumkin</p>
          </div>

          {/* Haydovchi */}
          <div>
            <label className="label">Kampaniyaning haydovchisi *</label>
            {drivers.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-xs font-bold text-amber-600">Kompaniyada haydovchi yo'q. Avval xodim qo'shing.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                {drivers.map(d => {
                  const sel = form.driverId === d.id;
                  return (
                    <button key={d.id} onClick={() => setForm(f => ({ ...f, driverId: f.driverId === d.id ? '' : d.id }))}
                      className={`flex items-center gap-3 p-3 rounded-2xl transition-all text-left border-2 ${sel ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${sel ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {sel ? <MdCheckCircle /> : d.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${sel ? 'text-emerald-700' : 'text-slate-700'}`}>{d.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{d.phone}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Holat */}
          {editId && (
            <div>
              <label className="label">Holat</label>
              <div className="flex gap-3">
                {['ACTIVE', 'INACTIVE'].map(st => (
                  <button key={st} onClick={() => setForm(f => ({ ...f, status: st }))}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest ${form.status === st ? (st === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white') : 'bg-slate-100 text-slate-500'}`}>
                    {st === 'ACTIVE' ? 'Faol' : 'Nofaol'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tavsif */}
          <div>
            <label className="label">Tavsif</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Kampaniya ko'rsatmalari..." rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-700 outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Operatorlar */}
          <div>
            <label className="label">Operatorlar (ixtiyoriy — bo'sh bo'lsa hammasi ko'radi)</label>
            {operators.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold">Kompaniyada operator yo'q</p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {operators.map(op => {
                  const sel = form.operatorIds.includes(op.id);
                  return (
                    <button key={op.id} onClick={() => toggleOp(op.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left border-2 ${sel ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${sel ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {sel ? <MdCheckCircle className="text-base" /> : op.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${sel ? 'text-indigo-700' : 'text-slate-700'}`}>{op.fullName}</p>
                        <p className="text-[9px] text-slate-400">{op.phone}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-2xl text-sm">Bekor</button>
            <button onClick={handleSave} disabled={isSaving}
              className="flex-[2] py-3 bg-indigo-600 text-white font-black rounded-2xl text-sm shadow-lg shadow-indigo-200 disabled:opacity-50">
              {isSaving ? 'Saqlanmoqda...' : editId ? 'Yangilash' : 'Yaratish'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
