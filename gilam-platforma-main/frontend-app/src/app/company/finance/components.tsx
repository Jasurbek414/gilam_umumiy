'use client';
import React, { useState } from 'react';
import { MdTrendingUp, MdTrendingDown, MdEdit, MdDelete, MdHistory, MdOpenInNew } from 'react-icons/md';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

// ── Stat Card (Clickable) ──
export function StatCard({ title, value, icon: Icon, color, trend, up, onClick }: any) {
  const colors: any = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', gradient: 'from-emerald-500 to-teal-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', gradient: 'from-blue-500 to-indigo-500' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', gradient: 'from-rose-500 to-pink-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', gradient: 'from-amber-500 to-orange-500' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div
      onClick={onClick}
      className={`relative bg-white p-5 rounded-2xl shadow-sm border ${c.border} group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} overflow-hidden`}
    >
      {/* Decorative gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.gradient}`} />
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl ${c.bg} ${c.text}`}><Icon className="text-2xl" /></div>
        <span className={`flex items-center text-[10px] font-black ${up ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2.5 py-1 rounded-full`}>
          {up ? <MdTrendingUp className="mr-1" /> : <MdTrendingDown className="mr-1" />}{trend}
        </span>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-black text-slate-800">{Number(value).toLocaleString()} <span className="text-sm font-bold text-slate-400">so'm</span></h3>
        <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
      </div>
      {onClick && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
          <div className={`p-1.5 rounded-lg ${c.bg}`}><MdOpenInNew className={`text-sm ${c.text}`} /></div>
        </div>
      )}
    </div>
  );
}

// ── Revenue Chart ──
export function RevenueChart({ orders, expenses }: { orders: any[]; expenses: any[] }) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const label = `${d.getDate()}.${d.getMonth() + 1}`;
    const dayIncome = orders.filter(o => o.createdAt?.startsWith(key) && ['DELIVERED','COMPLETED'].includes(o.status)).reduce((s: number, o: any) => s + Number(o.totalAmount || 0), 0)
      + expenses.filter(e => e.date === key && e.type === 'INCOME').reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const dayExpense = expenses.filter(e => e.date === key && e.type !== 'INCOME').reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    return { name: label, tushum: dayIncome, xarajat: dayExpense };
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-lg">📈</span>
        Haftalik Tushum va Xarajat
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={last7}>
          <defs>
            <linearGradient id="gTushum" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
            <linearGradient id="gXarajat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
          <Tooltip formatter={(v: number) => `${Number(v).toLocaleString()} so'm`} />
          <Area type="monotone" dataKey="tushum" stroke="#10b981" fill="url(#gTushum)" strokeWidth={2.5} />
          <Area type="monotone" dataKey="xarajat" stroke="#f43f5e" fill="url(#gXarajat)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Category Pie Chart ──
const PIE_COLORS = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#f43f5e','#64748b'];
export function CategoryChart({ expenses }: { expenses: any[] }) {
  const cats: Record<string,number> = {};
  expenses.filter(e => e.type !== 'INCOME').forEach(e => { cats[e.category] = (cats[e.category]||0) + Number(e.amount||0); });
  const data = Object.entries(cats).map(([name, value]) => ({ name, value }));
  if (data.length === 0) return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center justify-center h-[280px]">
      <div className="text-4xl mb-3">🍩</div>
      <p className="text-sm font-bold text-slate-400">Xarajat kategoriyasi mavjud emas</p>
    </div>
  );
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-lg">🍩</span>
        Kategoriya bo'yicha
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent*100).toFixed(0)}%`}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => `${Number(v).toLocaleString()} so'm`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Expense Row ──
export function ExpenseRow({ exp, onEdit, onDelete }: { exp: any; onEdit: () => void; onDelete: () => void }) {
  const isIncome = exp.type === 'INCOME';
  return (
    <tr className="hover:bg-slate-50/80 transition-colors group">
      <td className="px-5 py-3.5">
        <p className="text-sm font-bold text-slate-800">{exp.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{exp.date}</p>
      </td>
      <td className="px-5 py-3.5">
        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-black ${isIncome ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{exp.category}</span>
      </td>
      <td className="px-5 py-3.5 text-sm text-slate-500 italic max-w-[200px] truncate">{exp.comment || '—'}</td>
      <td className={`px-5 py-3.5 text-right font-bold text-base ${isIncome ? 'text-blue-600' : 'text-rose-600'}`}>
        {isIncome ? '+' : '-'}{Number(exp.amount).toLocaleString()}
      </td>
      <td className="px-3 py-3.5">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><MdEdit className="text-lg" /></button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"><MdDelete className="text-lg" /></button>
        </div>
      </td>
    </tr>
  );
}

// ── Audit Row ──
export function AuditRow({ log }: { log: any }) {
  const actionMap: any = { 'UPDATE': '✏️ Tahrirlash', 'DELETE': '🗑️ O\'chirish', 'CREATE': '➕ Yaratish' };
  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${log.action==='DELETE'?'bg-rose-100 text-rose-700':'bg-blue-100 text-blue-700'}`}>{actionMap[log.action]||log.action}</span></td>
      <td className="px-5 py-3.5 text-sm text-slate-600 font-medium">{log.entityType}</td>
      <td className="px-5 py-3.5 text-xs text-slate-500 font-mono max-w-[250px] truncate">{log.changes ? JSON.stringify(log.changes).substring(0,80) : '—'}</td>
      <td className="px-5 py-3.5 text-sm text-slate-600 font-medium">{log.user?.fullName || '—'}</td>
      <td className="px-5 py-3.5 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
    </tr>
  );
}

// ── Detail Modal Component ──
export function DetailDrawer({ isOpen, onClose, title, icon, color, children }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className={`px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r ${color || 'from-blue-500 to-indigo-500'}`}>
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="ml-auto p-2 hover:bg-white/20 rounded-full text-white transition-colors">✕</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Staff Profile Modal (State-based) ──
export function StaffProfileModal({ isOpen, onClose, member, attendances, startDate, endDate, onSaveAttendance, onUpdateUser }: any) {
  const [ws, setWs] = useState(member?.workSchedule || 'MONTHLY');
  const [sal, setSal] = useState(Number(member?.salary || 0));
  const [lunch, setLunch] = useState(Number(member?.lunchBreakMinutes || 60));
  const [editDay, setEditDay] = useState<string | null>(null);
  const [dayStatus, setDayStatus] = useState('PRESENT');
  const [dayStart, setDayStart] = useState('09:00');
  const [dayEnd, setDayEnd] = useState('18:00');
  const [daySal, setDaySal] = useState(0);

  // Sync state when member changes
  React.useEffect(() => {
    if (member) {
      setWs(member.workSchedule || 'MONTHLY');
      setSal(Number(member.salary || 0));
      setLunch(Number(member.lunchBreakMinutes || 60));
      setEditDay(null);
    }
  }, [member?.id]);

  if (!isOpen || !member) return null;

  const userAtts = attendances.filter((a: any) => a.userId === member.id);
  const totalDays = userAtts.filter((a: any) => ['PRESENT', 'HOURLY'].includes(a.status)).length;
  const halfDays = userAtts.filter((a: any) => a.status === 'HALF_DAY').length;
  const absentDays = userAtts.filter((a: any) => a.status === 'ABSENT').length;
  const totalSalary = userAtts.reduce((s: number, a: any) => s + Number(a.calculatedSalary || 0), 0);
  const roleLabels: any = { DRIVER:'Haydovchi', MANAGER:'Menejer', WORKER:'Ishchi', OPERATOR:'Operator', COMPANY_ADMIN:'Admin' };

  // Generate full month calendar
  const now = startDate ? new Date(startDate) : new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday=0
  const monthNames = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

  const calDays: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calDays.push(ds);
  }

  const schedules = [
    { key: 'HOURLY', icon: '⏰', label: 'Soatlik', color: 'orange' },
    { key: 'DAILY', icon: '📋', label: 'Kunlik', color: 'blue' },
    { key: 'WEEKLY', icon: '📆', label: 'Haftalik', color: 'purple' },
    { key: 'MONTHLY', icon: '📅', label: 'Oylik', color: 'emerald' },
  ];
  const salaryLabel: any = { HOURLY:'Soatlik stavka', DAILY:'Kunlik stavka', WEEKLY:'Haftalik maosh', MONTHLY:'Oylik maosh' };

  const calcDaySalary = (dateStr: string | null, status: string, hours: number, schedule: string, salary: number) => {
    if (status === 'ABSENT') return 0;
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const currentDaysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    
    let baseDaySal = 0;
    if (schedule === 'MONTHLY') baseDaySal = salary / currentDaysInMonth;
    else if (schedule === 'WEEKLY') baseDaySal = salary / 6; // 6 ish kuni deb faraz qilinadi
    else if (schedule === 'DAILY') baseDaySal = salary;
    
    if (schedule === 'HOURLY') return Math.round(salary * hours);
    return status === 'HALF_DAY' ? Math.round(baseDaySal / 2) : Math.round(baseDaySal);
  };

  const handleScheduleSelect = (key: string) => {
    setWs(key);
  };

  const handleSave = () => {
    if (onUpdateUser) onUpdateUser(member.id, { workSchedule: ws, salary: sal, lunchBreakMinutes: lunch });
  };

  const openDay = (day: string) => {
    const att = userAtts.find((a: any) => a.date?.startsWith(day));
    setEditDay(day);
    setDayStatus(att?.status || 'PRESENT');
    setDayStart(att?.startTime || '09:00');
    setDayEnd(att?.endTime || '18:00');
    const hrs = att?.workedHours || 0;
    setDaySal(att?.calculatedSalary ?? calcDaySalary(day, att?.status || 'PRESENT', hrs, ws, sal));
  };

  const recalcDay = (status: string, s: string, e: string) => {
    let hours = 0;
    if (s && e) {
      const [sh, sm] = s.split(':').map(Number);
      const [eh, em] = e.split(':').map(Number);
      hours = Math.max(0, (eh + em / 60) - (sh + sm / 60) - (lunch / 60));
    }
    setDaySal(calcDaySalary(editDay, status, hours, ws, sal));
  };

  const saveDay = () => {
    if (!editDay) return;
    let hours = 0;
    if (dayStart && dayEnd) {
      const [sh, sm] = dayStart.split(':').map(Number);
      const [eh, em] = dayEnd.split(':').map(Number);
      hours = Math.max(0, (eh + em / 60) - (sh + sm / 60) - (lunch / 60));
    }
    onSaveAttendance(member.id, editDay, dayStatus, daySal, '', dayStart, dayEnd);
    setEditDay(null);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const weekDays = ['Du','Se','Ch','Pa','Ju','Sh','Ya'];
  const statusColors: any = { PRESENT:'bg-emerald-500', HALF_DAY:'bg-amber-400', HOURLY:'bg-blue-500', ABSENT:'bg-rose-400' };
  const statusLabels: any = { PRESENT:'✅ Keldi', HALF_DAY:'⏱ Yarim kun', HOURLY:'⏰ Soatlik', ABSENT:'❌ Kelmadi' };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[800px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden" style={{animation:'modalSlide .3s ease'}}>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 bg-blue-500/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white text-xl font-black border border-white/10">{member.fullName?.[0]?.toUpperCase()}</div>
          <div className="flex-1 min-w-0 relative">
            <h3 className="text-lg font-black text-white truncate">{member.fullName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 bg-white/15 rounded-md text-[10px] font-black text-white/80">{roleLabels[member.role] || member.role}</span>
              <span className="text-[11px] text-white/40">{member.phone}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/50 hover:text-white text-lg transition-all relative">✕</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 border-b border-slate-100">
          {[
            { v: totalDays, l:'Kelgan', c:'text-emerald-600', bg:'bg-emerald-50' },
            { v: halfDays, l:'Yarim', c:'text-amber-600', bg:'bg-amber-50' },
            { v: absentDays, l:'Kelmagan', c:'text-rose-600', bg:'bg-rose-50' },
            { v: totalSalary.toLocaleString(), l:'Jami maosh', c:'text-blue-600', bg:'bg-blue-50' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} px-3 py-3 text-center border-r border-white last:border-0`}>
              <p className={`text-lg font-black ${s.c}`}>{s.v}</p>
              <p className={`text-[8px] font-bold ${s.c} uppercase tracking-widest`}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions for Salary */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-600 shadow-sm transition-all">
                 <span className="text-blue-500 text-lg">💸</span> Avans berish
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-600 shadow-sm transition-all">
                 <span className="text-emerald-500 text-lg">💰</span> Oylik to'lash
              </button>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase">Qoldiq haqdorlik</p>
              <p className="text-base font-black text-slate-800">{totalSalary.toLocaleString()} <span className="text-xs text-slate-500">so'm</span></p>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Full Month Calendar */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">📅 {monthNames[month]} {year} · Kunni bosib davomat yozing</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {weekDays.map(d => <div key={d} className="text-center py-2 text-[10px] font-black text-slate-400 uppercase">{d}</div>)}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {calDays.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} className="border-b border-r border-slate-100 h-[72px] bg-slate-50/30" />;
                  const att = userAtts.find((a: any) => a.date?.startsWith(day));
                  const dayNum = Number(day.split('-')[2]);
                  const isToday = day === todayStr;
                  const isSun = new Date(day).getDay() === 0;
                  const status = att?.status;
                  const daySalary = att?.calculatedSalary || 0;

                  return (
                    <div key={day} onClick={() => openDay(day)} className={`border-b border-r border-slate-100 h-[72px] p-1.5 cursor-pointer transition-all hover:bg-blue-50/60 group relative ${isToday ? 'bg-blue-50/40' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : isSun ? 'text-rose-400' : 'text-slate-600'}`}>{dayNum}</span>
                        {status && <span className={`w-2 h-2 rounded-full ${statusColors[status] || 'bg-slate-300'}`} />}
                      </div>
                      {status && <p className="text-[8px] font-bold text-slate-400 mt-1 truncate">{statusLabels[status]?.slice(2) || status}</p>}
                      {daySalary > 0 && <p className="text-[9px] font-black text-blue-600 mt-0.5">{(daySalary / 1000).toFixed(0)}k</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Day Edit Popup */}
        {editDay && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="absolute inset-0 bg-black/30" onClick={() => setEditDay(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-[360px] overflow-hidden" style={{animation:'modalSlide .2s ease'}}>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 flex items-center justify-between">
                <p className="text-sm font-black text-white">📅 {editDay} — {['Yak','Dush','Sesh','Chor','Pay','Jum','Shan'][new Date(editDay).getDay()]}</p>
                <button onClick={() => setEditDay(null)} className="text-white/60 hover:text-white text-lg">✕</button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Holat</label>
                  <select value={dayStatus} onChange={e => { setDayStatus(e.target.value); recalcDay(e.target.value, dayStart, dayEnd); }} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                    <option value="PRESENT">✅ Keldi</option><option value="HALF_DAY">⏱ Yarim kun</option><option value="HOURLY">⏰ Soatlik</option><option value="ABSENT">❌ Kelmadi</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Keldi</label><input type="time" value={dayStart} onChange={e => { setDayStart(e.target.value); recalcDay(dayStatus, e.target.value, dayEnd); }} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" /></div>
                  <div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Ketdi</label><input type="time" value={dayEnd} onChange={e => { setDayEnd(e.target.value); recalcDay(dayStatus, dayStart, e.target.value); }} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" /></div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Maosh (so'm)</label>
                  <input type="number" value={daySal} onChange={e => setDaySal(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setEditDay(null)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Bekor</button>
                  <button onClick={saveDay} className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-colors">✓ Saqlash</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes modalSlide{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}

