'use client';
import React from 'react';
import { MdTrendingUp, MdTrendingDown, MdEdit, MdDelete, MdHistory } from 'react-icons/md';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// ── Stat Card ──
export function StatCard({ title, value, icon: Icon, color, trend, up }: any) {
  const colors: any = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`bg-white p-5 rounded-2xl shadow-sm border ${c.border} group hover:shadow-lg transition-all duration-300`}>
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl ${c.bg} ${c.text}`}><Icon className="text-2xl" /></div>
        <span className={`flex items-center text-[10px] font-black ${up ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-1 rounded-full`}>
          {up ? <MdTrendingUp className="mr-1" /> : <MdTrendingDown className="mr-1" />}{trend}
        </span>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-black text-slate-800">{Number(value).toLocaleString()} so'm</h3>
        <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
      </div>
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
      <h3 className="text-base font-bold text-slate-800 mb-4">📈 Haftalik Tushum va Xarajat</h3>
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
          <Area type="monotone" dataKey="tushum" stroke="#10b981" fill="url(#gTushum)" strokeWidth={2} />
          <Area type="monotone" dataKey="xarajat" stroke="#f43f5e" fill="url(#gXarajat)" strokeWidth={2} />
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
  if (data.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 className="text-base font-bold text-slate-800 mb-4">🍩 Kategoriya bo'yicha</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent*100).toFixed(0)}%`}>
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
      <td className="px-3 py-3.5 text-right">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 justify-end">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><MdEdit size={16}/></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><MdDelete size={16}/></button>
        </div>
      </td>
    </tr>
  );
}

// ── Audit Log Row ──
export function AuditRow({ log }: { log: any }) {
  const actionLabels: any = { CREATE: '🟢 Yaratildi', UPDATE: '🟡 Tahrirlandi', DELETE: '🔴 O\'chirildi' };
  
  const formatData = (data: any) => {
    if (!data) return null;
    return (
      <div className="flex flex-col gap-1">
        <span className="font-bold text-sm">{data.title || 'Nomsiz'} {data.type === 'INCOME' ? '(Kirim)' : data.type === 'EXPENSE' ? '(Xarajat)' : ''}</span>
        <span className="font-black">{Number(data.amount || 0).toLocaleString()} so'm</span>
        {data.comment && <span className="italic text-[10px] opacity-80">{data.comment}</span>}
      </div>
    );
  };

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-5 py-3">
        <span className={`px-2 py-1 rounded-full text-[10px] font-black ${log.action==='DELETE'?'bg-rose-100 text-rose-700':log.action==='UPDATE'?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>
          {actionLabels[log.action] || log.action}
        </span>
      </td>
      <td className="px-5 py-3 text-sm text-slate-700 font-medium">{log.entityType === 'EXPENSE' ? 'Moliya' : log.entityType}</td>
      <td className="px-5 py-3 text-xs text-slate-500 max-w-xs">
        {log.action === 'UPDATE' && (
          <div className="flex items-center gap-4">
             <div className="p-2 bg-rose-50 text-rose-600 rounded-lg line-through opacity-70 w-full">{formatData(log.oldData)}</div>
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-full">{formatData(log.newData)}</div>
          </div>
        )}
        {log.action === 'CREATE' && <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg inline-block min-w-[150px]">{formatData(log.newData)}</div>}
        {log.action === 'DELETE' && <div className="p-2 bg-rose-50 text-rose-600 rounded-lg inline-block min-w-[150px]">{formatData(log.oldData)}</div>}
      </td>
      <td className="px-5 py-3 text-xs text-slate-500 font-semibold">{log.user?.fullName || 'Tizim'}</td>
      <td className="px-5 py-3 text-xs text-slate-400 font-medium">{new Date(log.createdAt).toLocaleString('uz')}</td>
    </tr>
  );
}
