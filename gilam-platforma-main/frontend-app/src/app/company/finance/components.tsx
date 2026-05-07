'use client';
import React from 'react';
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

// ── Staff Profile Modal ──
export function StaffProfileModal({ isOpen, onClose, member, attendances, startDate, endDate, onSaveAttendance }: any) {
  if (!isOpen || !member) return null;
  
  const userAtts = attendances.filter((a: any) => a.userId === member.id);
  const totalDays = userAtts.filter((a: any) => a.status === 'PRESENT' || a.status === 'HOURLY').length;
  const halfDays = userAtts.filter((a: any) => a.status === 'HALF_DAY').length;
  const absentDays = userAtts.filter((a: any) => a.status === 'ABSENT').length;
  const totalSalary = userAtts.reduce((sum: number, a: any) => sum + Number(a.calculatedSalary || 0), 0);
  const totalHours = userAtts.reduce((sum: number, a: any) => sum + Number(a.workedHours || 0), 0);
  
  const schedule = member.workSchedule || 'MONTHLY';
  const scheduleLabels: any = { MONTHLY: '📅 Oylik', WEEKLY: '📆 Haftalik', DAILY: '📋 Kunlik', HOURLY: '⏰ Soatlik' };
  const roleColors: any = {
    DRIVER: 'bg-blue-100 text-blue-700', MANAGER: 'bg-purple-100 text-purple-700',
    WORKER: 'bg-emerald-100 text-emerald-700', OPERATOR: 'bg-amber-100 text-amber-700',
    COMPANY_ADMIN: 'bg-slate-200 text-slate-700',
  };

  // Generate calendar days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().split('T')[0]);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white text-xl font-black border border-white/20">
              {member.fullName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{member.fullName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${roleColors[member.role] || 'bg-slate-100 text-slate-600'}`}>{member.role}</span>
                <span className="text-xs text-slate-300">📱 {member.phone}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors text-xl">✕</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-2xl font-black text-emerald-600">{totalDays}</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Kelgan kun</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
              <p className="text-2xl font-black text-amber-600">{halfDays}</p>
              <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Yarim kun</p>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
              <p className="text-2xl font-black text-rose-600">{absentDays}</p>
              <p className="text-[10px] font-bold text-rose-600 uppercase mt-1">Kelmagan</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <p className="text-2xl font-black text-blue-600">{totalSalary.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">Jami maosh</p>
            </div>
          </div>

          {/* Info Row */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              <span className="text-slate-400 font-bold">Ish rejimi:</span> <span className="font-black text-slate-700">{scheduleLabels[schedule]}</span>
            </div>
            <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              <span className="text-slate-400 font-bold">Oylik:</span> <span className="font-black text-slate-700">{Number(member.salary || 0).toLocaleString()} so'm</span>
            </div>
            {schedule === 'HOURLY' && (
              <>
                <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 font-bold">Jami soat:</span> <span className="font-black text-slate-700">{totalHours.toFixed(1)} soat</span>
                </div>
                <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 font-bold">Abet:</span> <span className="font-black text-slate-700">{member.lunchBreakMinutes || 60} daqiqa</span>
                </div>
              </>
            )}
          </div>

          {/* Calendar */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Davomat Kalendari</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                    <th className="px-3 py-2 text-left">Sana</th>
                    <th className="px-3 py-2 text-left">Holat</th>
                    {schedule === 'HOURLY' && <>
                      <th className="px-3 py-2">Boshlash</th>
                      <th className="px-3 py-2">Tugash</th>
                      <th className="px-3 py-2">Soat</th>
                    </>}
                    <th className="px-3 py-2 text-right">Maosh</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {days.map(day => {
                    const att = userAtts.find((a: any) => a.date?.startsWith(day));
                    const dayOfWeek = new Date(day).toLocaleDateString('uz-UZ', { weekday: 'short' });
                    const isToday = day === new Date().toISOString().split('T')[0];

                    return (
                      <tr key={day} className={`transition-colors ${isToday ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{day}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">{dayOfWeek}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            id={`att-status-${member.id}-${day}`}
                            defaultValue={att?.status || 'PRESENT'}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
                          >
                            <option value="PRESENT">✅ Keldi</option>
                            <option value="HALF_DAY">⏱ Yarim kun</option>
                            <option value="HOURLY">⏰ Soatlik</option>
                            <option value="ABSENT">❌ Kelmadi</option>
                          </select>
                        </td>
                        {schedule === 'HOURLY' && <>
                          <td className="px-3 py-2.5 text-center">
                            <input id={`att-start-${member.id}-${day}`} type="time" defaultValue={att?.startTime || '09:00'} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none w-24 text-center" />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input id={`att-end-${member.id}-${day}`} type="time" defaultValue={att?.endTime || '18:00'} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none w-24 text-center" />
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs font-black text-slate-600">{att?.workedHours || '—'}</td>
                        </>}
                        <td className="px-3 py-2.5 text-right">
                          <input
                            id={`att-salary-${member.id}-${day}`}
                            type="number"
                            defaultValue={att?.calculatedSalary ?? 0}
                            className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none text-right focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => {
                              const st = (document.getElementById(`att-status-${member.id}-${day}`) as HTMLSelectElement)?.value;
                              const sal = Number((document.getElementById(`att-salary-${member.id}-${day}`) as HTMLInputElement)?.value || 0);
                              const startT = (document.getElementById(`att-start-${member.id}-${day}`) as HTMLInputElement)?.value;
                              const endT = (document.getElementById(`att-end-${member.id}-${day}`) as HTMLInputElement)?.value;
                              onSaveAttendance(member.id, day, st, sal, '', startT, endT);
                            }}
                            className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-black transition-all"
                          >
                            💾
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
