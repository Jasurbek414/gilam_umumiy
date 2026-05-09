'use client';

import React, { useState, useEffect } from 'react';
import { MdAttachMoney, MdTrendingUp, MdTrendingDown, MdLibraryBooks, MdAdd, MdFilterList, MdHistory } from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { getUser, ordersApi, expensesApi, auditApi, attendanceApi, usersApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { StatCard, RevenueChart, CategoryChart, ExpenseRow, AuditRow, StaffProfileModal, DetailDrawer } from './components';

type Tab = 'dashboard' | 'expenses' | 'history' | 'attendance';

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
  const [staff, setStaff] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedExp, setSelectedExp] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [detailType, setDetailType] = useState<string|null>(null);

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
      const [o, e, s, a] = await Promise.all([
        ordersApi.getByCompany(user.company.id),
        expensesApi.getByCompany(user.company.id, startDate, endDate),
        usersApi.getByCompany(user.company.id),
        attendanceApi.getByCompany(startDate, endDate)
      ]);
      setOrders(o); setExpenses(e); setStaff(s); setAttendances(a);
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

  const handleAttendanceChange = async (userId: string, date: string, status: string, calculatedSalary: number, comment: string = '', startTime?: string, endTime?: string) => {
    try {
      let workedHours = 0;
      if (startTime && endTime) {
        const [sh,sm] = startTime.split(':').map(Number);
        const [eh,em] = endTime.split(':').map(Number);
        const member = staff.find((s:any) => s.id === userId);
        const lunch = (member?.lunchBreakMinutes || 60) / 60;
        workedHours = Math.max(0, (eh + em/60) - (sh + sm/60) - lunch);
        workedHours = Math.round(workedHours * 100) / 100;
      }
      await attendanceApi.createOrUpdate({ userId, date, status, calculatedSalary, comment, startTime, endTime, workedHours });
      toast.success("Davomat saqlandi ✅");
      const a = await attendanceApi.getByCompany(startDate, endDate);
      setAttendances(a);
    } catch(err: any) { toast.error(err.message); }
  };

  const handleUpdateUser = async (userId: string, data: any) => {
    try {
      await usersApi.update(userId, data);
      toast.success('Xodim profili saqlandi ✅');
      await loadData();
    } catch(err: any) { toast.error(err.message); }
  };

  // Calculations
  const pStart = new Date(startDate); const pEnd = new Date(endDate); pEnd.setHours(23,59,59,999);
  const filteredOrders = orders.filter(o => { const c = new Date(o.createdAt); return c >= pStart && c <= pEnd; });
  const totalIncomes = expenses.filter(e => e.type==='INCOME').reduce((a,e) => a+Number(e.amount||0), 0);
  const totalExpenses = expenses.filter(e => e.type!=='INCOME').reduce((a,e) => a+Number(e.amount||0), 0) + attendances.reduce((a,att) => a+Number(att.calculatedSalary||0), 0);
  const totalRevenue = filteredOrders.filter(o => ['DELIVERED','COMPLETED'].includes(o.status)).reduce((a,o) => a+Number(o.totalAmount||0), 0) + totalIncomes;
  const expectedRevenue = filteredOrders.filter(o => !['DELIVERED','COMPLETED','CANCELLED'].includes(o.status)).reduce((a,o) => a+Number(o.totalAmount||0), 0);

  const filteredExp = expenses.filter(exp =>
    (expenseCategory==='ALL' || exp.category===expenseCategory) &&
    (exp.title.toLowerCase().includes(expenseSearch.toLowerCase()) || (exp.comment||'').toLowerCase().includes(expenseSearch.toLowerCase()))
  );

  const tabs = [
    { key: 'dashboard' as Tab, label: '📊 Dashboard', icon: MdTrendingUp },
    { key: 'expenses' as Tab, label: '📋 Xarajatlar', icon: MdLibraryBooks },
    { key: 'attendance' as Tab, label: '👥 Xodimlar Oyligi', icon: MdTrendingUp },
    { key: 'history' as Tab, label: '📜 Tarix', icon: MdHistory },
  ];

  const stats = [
    { title:'Tushum', value: totalRevenue, icon: MdAttachMoney, color:'emerald', up:true, trend:'Tasdiqlangan', detail:'revenue' },
    { title:'Kutilayotgan', value: expectedRevenue, icon: MdTrendingUp, color:'blue', up:true, trend:'Jarayonda', detail:'expected' },
    { title:'Xarajatlar', value: totalExpenses, icon: MdTrendingDown, color:'rose', up:false, trend:'Chiqim', detail:'expenses' },
    { title:'Sof Foyda', value: totalRevenue-totalExpenses, icon: MdLibraryBooks, color:'amber', up: totalRevenue-totalExpenses>=0, trend: totalRevenue-totalExpenses>=0?'Foyda':'Zarar', detail:'profit' },
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
            {stats.map((s,i) => <StatCard key={i} {...s} onClick={() => setDetailType(s.detail)} />)}
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

      {/* Attendance & Salary Tab — Animated Staff Cards */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">👥 Xodimlar va Ish Haqi</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Xodim ustiga bosib profilni oching</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jami Ish Haqi</p>
                <p className="text-2xl font-black text-emerald-400">{attendances.reduce((a: number, att: any) => a + Number(att.calculatedSalary || 0), 0).toLocaleString()} <span className="text-sm text-emerald-400/60">so'm</span></p>
              </div>
            </div>
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.filter((m: any) => m.status === 'ACTIVE').map((member: any, idx: number) => {
              const userAtts = attendances.filter((a: any) => a.userId === member.id);
              const totalSal = userAtts.reduce((sum: number, a: any) => sum + Number(a.calculatedSalary || 0), 0);
              const presentDays = userAtts.filter((a: any) => ['PRESENT', 'HOURLY'].includes(a.status)).length;
              const absentDays = userAtts.filter((a: any) => a.status === 'ABSENT').length;
              const scheduleIcons: any = { MONTHLY: '📅', WEEKLY: '📆', DAILY: '📋', HOURLY: '⏰' };
              const scheduleLabels: any = { MONTHLY: 'Oylik', WEEKLY: 'Haftalik', DAILY: 'Kunlik', HOURLY: 'Soatlik' };
              const roleGradients: any = {
                DRIVER: 'from-blue-500 to-cyan-500', MANAGER: 'from-purple-500 to-fuchsia-500',
                WORKER: 'from-emerald-500 to-teal-500', OPERATOR: 'from-amber-500 to-orange-500',
                COMPANY_ADMIN: 'from-slate-600 to-slate-800',
              };
              const roleLabels: any = { DRIVER: 'Haydovchi', MANAGER: 'Menejer', WORKER: 'Ishchi', OPERATOR: 'Operator', COMPANY_ADMIN: 'Admin' };

              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                  style={{ animationDelay: `${idx * 60}ms`, animation: 'fadeSlideUp 0.4s ease-out both' }}
                >
                  {/* Gradient top bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${roleGradients[member.role] || 'from-slate-400 to-slate-600'}`} />

                  <div className="p-4">
                    {/* Name & Avatar */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${roleGradients[member.role] || 'from-slate-500 to-slate-700'} flex items-center justify-center text-white text-base font-black shadow-lg`}>
                        {member.fullName?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate group-hover:text-blue-600 transition-colors">{member.fullName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">{roleLabels[member.role] || member.role}</span>
                          <span className="text-[10px] text-slate-300">·</span>
                          <span className="text-[10px] font-bold text-slate-400">{member.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Schedule badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-600">
                        {scheduleIcons[member.workSchedule]} {scheduleLabels[member.workSchedule] || 'Oylik'}
                      </span>
                      <span className="px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-black text-blue-600">
                        {Number(member.salary || 0).toLocaleString()} so'm
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 rounded-lg px-2 py-2 text-center">
                        <p className="text-base font-black text-emerald-600">{presentDays}</p>
                        <p className="text-[8px] font-bold text-emerald-500 uppercase">Kelgan</p>
                      </div>
                      <div className="bg-rose-50 rounded-lg px-2 py-2 text-center">
                        <p className="text-base font-black text-rose-500">{absentDays}</p>
                        <p className="text-[8px] font-bold text-rose-400 uppercase">Kelmagan</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg px-2 py-2 text-center">
                        <p className="text-base font-black text-blue-600">{totalSal > 0 ? `${(totalSal / 1000).toFixed(0)}k` : '0'}</p>
                        <p className="text-[8px] font-bold text-blue-400 uppercase">Maosh</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Animation keyframes */}
          <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
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

      {/* Staff Profile Modal */}
      <StaffProfileModal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
        attendances={attendances}
        startDate={startDate}
        endDate={endDate}
        onSaveAttendance={handleAttendanceChange}
        onUpdateUser={handleUpdateUser}
      />

      {/* Detail Drawer for stat cards */}
      <DetailDrawer isOpen={detailType === 'revenue'} onClose={() => setDetailType(null)} title="Tushum Tahlili" icon="💰" color="from-emerald-500 to-teal-500">
        <div className="space-y-3">
          {filteredOrders.filter(o => ['DELIVERED','COMPLETED'].includes(o.status)).map((o: any) => (
            <div key={o.id} className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <div><p className="text-sm font-bold text-slate-800">#{o.id?.substring(0,8)}</p><p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p></div>
              <span className="text-sm font-black text-emerald-600">{Number(o.totalAmount || 0).toLocaleString()} so'm</span>
            </div>
          ))}
          {filteredOrders.filter(o => ['DELIVERED','COMPLETED'].includes(o.status)).length === 0 && <p className="text-center text-slate-400 py-8">Hozircha tushum yo'q</p>}
        </div>
      </DetailDrawer>

      <DetailDrawer isOpen={detailType === 'expenses'} onClose={() => setDetailType(null)} title="Xarajatlar Tahlili" icon="📊" color="from-rose-500 to-pink-500">
        <div className="space-y-3">
          {expenses.filter(e => e.type !== 'INCOME').map((e: any) => (
            <div key={e.id} className="flex justify-between items-center p-3 bg-rose-50 rounded-xl border border-rose-100">
              <div><p className="text-sm font-bold text-slate-800">{e.title}</p><p className="text-xs text-slate-400">{e.category} · {e.date}</p></div>
              <span className="text-sm font-black text-rose-600">-{Number(e.amount).toLocaleString()} so'm</span>
            </div>
          ))}
        </div>
      </DetailDrawer>

      <DetailDrawer isOpen={detailType === 'profit'} onClose={() => setDetailType(null)} title="Sof Foyda Tahlili" icon="📈" color="from-amber-500 to-orange-500">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center"><p className="text-xl font-black text-emerald-600">{totalRevenue.toLocaleString()}</p><p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Jami Tushum</p></div>
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-center"><p className="text-xl font-black text-rose-600">{totalExpenses.toLocaleString()}</p><p className="text-[10px] font-bold text-rose-600 uppercase mt-1">Jami Xarajat</p></div>
          </div>
          <div className={`p-4 rounded-xl border text-center ${totalRevenue - totalExpenses >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <p className={`text-2xl font-black ${totalRevenue - totalExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(totalRevenue - totalExpenses).toLocaleString()} so'm</p>
            <p className="text-xs font-bold text-slate-500 mt-1">{totalRevenue - totalExpenses >= 0 ? '✅ Foyda' : '⚠️ Zarar'}</p>
          </div>
        </div>
      </DetailDrawer>
    </div>
  );
}
