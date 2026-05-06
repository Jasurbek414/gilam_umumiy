'use client';

import React, { useState, useEffect } from 'react';
import { MdAttachMoney, MdTrendingUp, MdTrendingDown, MdLibraryBooks, MdAdd, MdFilterList, MdHistory } from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { getUser, ordersApi, expensesApi, auditApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { StatCard, RevenueChart, CategoryChart, ExpenseRow, AuditRow } from './components';

type Tab = 'dashboard' | 'expenses' | 'history';

export default function CompanyFinancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [period, setPeriod] = useState<'daily'|'weekly'|'monthly'>('daily');
  const getLocalDateString = (d: Date = new Date()) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());

  const [expenses, setExpenses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedExp, setSelectedExp] = useState<any>(null);

  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('ALL');

  const [form, setForm] = useState({ title: '', amount: '', category: 'Logistika', comment: '' });

  useEffect(() => {
    const u = getUser();
    if (!u?.company) { setTimeout(() => router.push('/'), 0); return; }
    setUser(u);
  }, []);

  useEffect(() => { if (user?.company?.id) loadData(); }, [startDate, endDate, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [o, e] = await Promise.all([
        ordersApi.getByCompany(user.company.id),
        expensesApi.getByCompany(user.company.id, startDate, endDate),
      ]);
      setOrders(o); setExpenses(e);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadAudit = async () => {
    try {
      const logs = await auditApi.getByCompany(user.company.id, 'EXPENSE', 100);
      setAuditLogs(logs.filter((l: any) => l.action !== 'CREATE'));
    } catch(err) { console.error(err); }
  };

  useEffect(() => { if (activeTab === 'history' && user?.company?.id) loadAudit(); }, [activeTab]);

  const handlePeriodChange = (p: 'daily'|'weekly'|'monthly') => {
    setPeriod(p);
    setEndDate(getLocalDateString());
    if (p === 'daily') setStartDate(getLocalDateString());
    else if (p === 'weekly') { const d = new Date(); d.setDate(d.getDate()-7); setStartDate(getLocalDateString(d)); }
    else { const d = new Date(); d.setMonth(d.getMonth()-1); setStartDate(getLocalDateString(d)); }
  };

  // CRUD handlers
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await expensesApi.create({ companyId: user.company.id, title: form.title, amount: Number(form.amount), category: form.category, comment: form.comment, date: new Date().toISOString().split('T')[0] });
      toast.success('Xarajat qo\'shildi ✅'); setIsAddOpen(false); setForm({ title:'', amount:'', category:'Logistika', comment:'' }); loadData();
    } catch(err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedExp) return; setSaving(true);
    try {
      await expensesApi.update(selectedExp.id, { title: form.title, amount: Number(form.amount), category: form.category, comment: form.comment });
      toast.success('Tahrirlandi ✅'); setIsEditOpen(false); setSelectedExp(null); loadData();
    } catch(err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedExp) return; setSaving(true);
    try {
      await expensesApi.remove(selectedExp.id);
      toast.success('O\'chirildi ✅'); setIsDeleteOpen(false); setSelectedExp(null); loadData();
    } catch(err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const openEdit = (exp: any) => { setSelectedExp(exp); setForm({ title: exp.title, amount: String(exp.amount), category: exp.category, comment: exp.comment||'' }); setIsEditOpen(true); };
  const openDelete = (exp: any) => { setSelectedExp(exp); setIsDeleteOpen(true); };

  // Calculations
  const pStart = new Date(startDate); const pEnd = new Date(endDate); pEnd.setHours(23,59,59,999);
  const filteredOrders = orders.filter(o => { const c = new Date(o.createdAt); return c >= pStart && c <= pEnd; });
  const totalIncomes = expenses.filter(e => e.type==='INCOME').reduce((a,e) => a+Number(e.amount||0), 0);
  const totalExpenses = expenses.filter(e => e.type!=='INCOME').reduce((a,e) => a+Number(e.amount||0), 0);
  const totalRevenue = filteredOrders.filter(o => ['DELIVERED','COMPLETED'].includes(o.status)).reduce((a,o) => a+Number(o.totalAmount||0), 0) + totalIncomes;
  const expectedRevenue = filteredOrders.filter(o => !['DELIVERED','COMPLETED','CANCELLED'].includes(o.status)).reduce((a,o) => a+Number(o.totalAmount||0), 0);

  const filteredExp = expenses.filter(exp =>
    (expenseCategory==='ALL' || exp.category===expenseCategory) &&
    (exp.title.toLowerCase().includes(expenseSearch.toLowerCase()) || (exp.comment||'').toLowerCase().includes(expenseSearch.toLowerCase()))
  );

  const tabs = [
    { key: 'dashboard' as Tab, label: '📊 Dashboard', icon: MdTrendingUp },
    { key: 'expenses' as Tab, label: '📋 Xarajatlar', icon: MdLibraryBooks },
    { key: 'history' as Tab, label: '📜 Tarix', icon: MdHistory },
  ];

  const stats = [
    { title:'Tushum', value: totalRevenue, icon: MdAttachMoney, color:'emerald', up:true, trend:'Tasdiqlangan' },
    { title:'Kutilayotgan', value: expectedRevenue, icon: MdTrendingUp, color:'blue', up:true, trend:'Jarayonda' },
    { title:'Xarajatlar', value: totalExpenses, icon: MdTrendingDown, color:'rose', up:false, trend:'Chiqim' },
    { title:'Sof Foyda', value: totalRevenue-totalExpenses, icon: MdLibraryBooks, color:'amber', up: totalRevenue-totalExpenses>=0, trend: totalRevenue-totalExpenses>=0?'Foyda':'Zarar' },
  ];

  const categories = ['Logistika','Ish haqi','Ijara','Kommunal','Mijozga pul qaytarish','Boshqa'];

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Xarajat Nomi</label>
        <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800" placeholder="Masalan: Yoqilg'i" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Summa</label>
          <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800" placeholder="Summa..." value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Kategoriya</label>
          <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 bg-white" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Izoh</label>
        <textarea rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 resize-none" placeholder="Qo'shimcha..." value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Moliyaviy Xisobotlar 📈</h1>
          <p className="text-slate-500 mt-1 font-medium">Tushum, xarajat va tarixni to'liq nazorat qiling.</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
          {/* Period */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['daily','weekly','monthly'] as const).map(p => (
              <button key={p} onClick={() => handlePeriodChange(p)} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${period===p?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                {p==='daily'?'KUNLIK':p==='weekly'?'HAFTALIK':'OYLIK'}
              </button>
            ))}
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Dan</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none" />
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Gacha</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none" />
            </div>
          </div>
          <button onClick={() => { setForm({title:'',amount:'',category:'Logistika',comment:''}); setIsAddOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all">
            <MdAdd className="text-xl" /> Yangi Xarajat
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab===t.key?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((s,i) => <StatCard key={i} {...s} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RevenueChart orders={filteredOrders} expenses={expenses} />
            <CategoryChart expenses={expenses} />
          </div>
        </>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MdLibraryBooks className="text-blue-500" /> Xarajatlar Ro'yxati</h2>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <MdFilterList className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Qidirish..." value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10" />
              </div>
              <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-pointer">
                <option value="ALL">Barcha</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3">Sana / Nomi</th><th className="px-5 py-3">Kategoriya</th><th className="px-5 py-3">Izoh</th><th className="px-5 py-3 text-right">Summa</th><th className="px-3 py-3 w-20"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExp.map(exp => <ExpenseRow key={exp.id} exp={exp} onEdit={() => openEdit(exp)} onDelete={() => openDelete(exp)} />)}
                {filteredExp.length===0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">Ma'lumotlar mavjud emas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MdHistory className="text-amber-500" /> O'zgarishlar Tarixi</h2>
            <p className="text-xs text-slate-500 mt-1">Barcha tahrirlash va o'chirish amallari shu yerda saqlanadi.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3">Amal</th><th className="px-5 py-3">Turi</th><th className="px-5 py-3">Tafsilot</th><th className="px-5 py-3">Kim</th><th className="px-5 py-3">Vaqt</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => <AuditRow key={log.id} log={log} />)}
                {auditLogs.length===0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Tarix mavjud emas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Yangi Xarajat Qo'shish">
        <form onSubmit={handleAdd} className="space-y-4">
          {formFields}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200">Bekor</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50">{saving?'Saqlanmoqda...':'Saqlash'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Xarajatni Tahrirlash">
        <form onSubmit={handleEdit} className="space-y-4">
          {formFields}
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200">Bekor</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 text-sm font-bold text-white bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50">{saving?'Saqlanmoqda...':'Yangilash'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="O'chirishni Tasdiqlash">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4"><MdTrendingDown className="text-3xl text-rose-600" /></div>
          <p className="text-slate-700 font-medium">"{selectedExp?.title}" xarajatini o'chirmoqchimisiz?</p>
          <p className="text-sm text-slate-500 mt-2">Bu amal tarixda saqlanadi va qaytarib bo'ladi.</p>
          <div className="pt-6 flex gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200">Bekor</button>
            <button onClick={handleDelete} disabled={saving} className="flex-1 py-3 text-sm font-bold text-white bg-rose-600 rounded-xl shadow-lg shadow-rose-500/20 disabled:opacity-50">{saving?'O\'chirilmoqda...':'O\'chirish'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
