'use client';
import React from 'react';
import { MdAccountBalanceWallet, MdCalculate, MdPayment, MdAssessment, MdAdd, MdCancel, MdCheck, MdPaid } from 'react-icons/md';

const statusColors: any = {
  PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
  CALCULATING: 'bg-blue-50 text-blue-600 border-blue-100',
  REVIEW: 'bg-amber-50 text-amber-600 border-amber-100',
  APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  PAID: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-rose-50 text-rose-600 border-rose-100',
};
const statusLabels: any = {
  PENDING: 'Kutilmoqda', CALCULATING: 'Hisoblanmoqda', REVIEW: 'Tekshiruvda',
  APPROVED: 'Tasdiqlangan', PAID: "To'langan", CANCELLED: 'Bekor qilingan',
};

// ==================== AVANSLAR TAB ====================
export function AdvancesTab({ advances, staff, onAdd, onCancel, totalAdvances }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-white to-amber-50/30">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <MdAccountBalanceWallet className="text-amber-500" /> Avanslar
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Xodimlarga berilgan avanslar ro'yxati</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-center">
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Jami Avans</p>
            <p className="text-lg font-black text-amber-600">{(totalAdvances || 0).toLocaleString()} <span className="text-xs">so'm</span></p>
          </div>
          <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-bold rounded-xl shadow-lg hover:bg-amber-700 transition-all text-sm">
            <MdAdd className="text-lg" /> Avans berish
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-100">
            <th className="px-5 py-3">Sana</th><th className="px-4 py-3">Xodim</th><th className="px-4 py-3">Summa</th>
            <th className="px-4 py-3">Turi</th><th className="px-4 py-3">Bergan</th><th className="px-4 py-3">Izoh</th><th className="px-4 py-3">Holat</th><th className="px-3 py-3 w-16"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {advances.map((adv: any) => (
              <tr key={adv.id} className={`hover:bg-amber-50/30 transition-all ${adv.isCancelled ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3 text-xs font-bold text-slate-600">{adv.date}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-black">{adv.employee?.fullName?.[0]}</div>
                    <span className="text-sm font-bold text-slate-800">{adv.employee?.fullName || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-black text-amber-600">{Number(adv.amount).toLocaleString()} <span className="text-[10px] text-slate-400">so'm</span></td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">{adv.paymentType === 'CASH' ? 'Naqd' : adv.paymentType === 'CARD' ? 'Karta' : 'Boshqa'}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{adv.givenByUser?.fullName || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{adv.comment || '—'}</td>
                <td className="px-4 py-3">
                  {adv.isCancelled
                    ? <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100">Bekor</span>
                    : <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">Faol</span>}
                </td>
                <td className="px-3 py-3">
                  {!adv.isCancelled && (
                    <button onClick={() => onCancel(adv.id)} className="text-rose-400 hover:text-rose-600 transition-colors" title="Bekor qilish">
                      <MdCancel className="text-lg" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {advances.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Avanslar mavjud emas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== OYLIK HISOBLASH TAB ====================
export function PayrollTab({ periods, selectedPeriod, onSelect, year, month, onYearChange, onMonthChange, onCalculate, onApprove, onMarkPaid, isCalculating, monthNames }: any) {
  return (
    <div className="space-y-5">
      {/* Hisoblash paneli */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4"><MdCalculate className="text-blue-500" /> Oylik Hisoblash</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yil</label>
            <select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className="block mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Oy</label>
            <select value={month} onChange={(e) => onMonthChange(Number(e.target.value))} className="block mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">
              {monthNames.map((m: string, i: number) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <button onClick={onCalculate} disabled={isCalculating} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2">
            <MdCalculate className={isCalculating ? 'animate-spin' : ''} /> {isCalculating ? 'Hisoblanmoqda...' : 'Hisoblash'}
          </button>
        </div>
      </div>

      {/* Periodlar ro'yxati */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-700">Oylik Davrlari</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-100">
              <th className="px-5 py-3">Davr</th><th className="px-4 py-3">Jami summa</th><th className="px-4 py-3">Holat</th><th className="px-4 py-3">Tasdiqlangan</th><th className="px-4 py-3">Amallar</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {periods.map((p: any) => (
                <tr key={p.id} onClick={() => onSelect(p)} className="hover:bg-blue-50/30 cursor-pointer transition-all">
                  <td className="px-5 py-3 text-sm font-bold text-slate-800">{monthNames[p.month-1]} {p.year}</td>
                  <td className="px-4 py-3 text-sm font-black text-blue-600">{Number(p.totalAmount||0).toLocaleString()} <span className="text-[10px] text-slate-400">so'm</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md border text-[10px] font-bold ${statusColors[p.status]||''}`}>{statusLabels[p.status]||p.status}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.approvedByUser?.fullName || '—'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    {p.status === 'REVIEW' && <button onClick={(e) => { e.stopPropagation(); onApprove(p.id); }} className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1"><MdCheck /> Tasdiqlash</button>}
                    {p.status === 'APPROVED' && <button onClick={(e) => { e.stopPropagation(); onMarkPaid(p.id); }} className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 flex items-center gap-1"><MdPaid /> To'landi</button>}
                  </td>
                </tr>
              ))}
              {periods.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Hali oylik hisoblanmagan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tanlangan period tafsiloti */}
      {selectedPeriod?.items && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-white flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800">{monthNames[(selectedPeriod.month||1)-1]} {selectedPeriod.year} — Xodimlar</h3>
            <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${statusColors[selectedPeriod.status]||''}`}>{statusLabels[selectedPeriod.status]}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-100">
                <th className="px-5 py-3">Xodim</th><th className="px-3 py-3">Turi</th><th className="px-3 py-3">Asosiy</th><th className="px-3 py-3">Kun</th><th className="px-3 py-3">Soat</th>
                <th className="px-3 py-3">Kelmagan</th><th className="px-3 py-3">Avans</th><th className="px-3 py-3">Ushlab qolish</th><th className="px-3 py-3 text-right">Yakuniy</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {selectedPeriod.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-blue-50/20">
                    <td className="px-5 py-3 text-sm font-bold text-slate-800">{item.employee?.fullName || '—'}</td>
                    <td className="px-3 py-3"><span className="text-[10px] font-bold text-slate-500">{item.salaryType}</span></td>
                    <td className="px-3 py-3 text-xs font-bold text-slate-700">{Number(item.baseSalary).toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs font-bold text-emerald-600">{item.workedDays}</td>
                    <td className="px-3 py-3 text-xs font-bold text-blue-600">{Number(item.workedHours).toFixed(1)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-rose-500">{item.absentDays}</td>
                    <td className="px-3 py-3 text-xs font-bold text-amber-600">{Number(item.totalAdvances).toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs font-bold text-rose-500">{Number(item.deductions).toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-blue-700">{Number(item.netPay).toLocaleString()} <span className="text-[10px] text-slate-400">so'm</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== TO'LOVLAR TAB ====================
export function PaymentsTab({ payments, onAdd, totalPayments }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-white to-green-50/30">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><MdPayment className="text-green-600" /> To'lovlar</h2>
          <p className="text-xs text-slate-400 mt-0.5">Xodimlarga to'langan pullar</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2 text-center">
            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Jami To'lov</p>
            <p className="text-lg font-black text-green-600">{(totalPayments || 0).toLocaleString()} <span className="text-xs">so'm</span></p>
          </div>
          <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all text-sm">
            <MdAdd className="text-lg" /> To'lov kiritish
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/80 border-b border-slate-100">
            <th className="px-5 py-3">Sana</th><th className="px-4 py-3">Xodim</th><th className="px-4 py-3">Summa</th>
            <th className="px-4 py-3">Turi</th><th className="px-4 py-3">Kim to'ladi</th><th className="px-4 py-3">Izoh</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {payments.map((p: any) => (
              <tr key={p.id} className="hover:bg-green-50/30 transition-all">
                <td className="px-5 py-3 text-xs font-bold text-slate-600">{p.date}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-800">{p.employee?.fullName || '—'}</td>
                <td className="px-4 py-3 text-sm font-black text-green-600">{Number(p.amount).toLocaleString()} <span className="text-[10px] text-slate-400">so'm</span></td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold">{p.paymentType === 'CASH' ? 'Naqd' : p.paymentType === 'CARD' ? 'Karta' : 'Boshqa'}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.paidByUser?.fullName || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{p.comment || '—'}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">To'lovlar mavjud emas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== HISOBOTLAR TAB ====================
export function ReportsTab({ staff, advances, periods, payments, attendances, startDate, endDate, monthNames, globalRestDay }: any) {
  const activeStaff = staff.filter((s: any) => s.status === 'ACTIVE');
  const totalAdvances = advances.filter((a: any) => !a.isCancelled).reduce((s: number, a: any) => s + Number(a.amount || 0), 0);
  const totalPayments = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const latestPeriod = periods[0];
  const totalPayroll = latestPeriod ? Number(latestPeriod.totalAmount || 0) : 0;

  const scheduleGroups: any = {};
  activeStaff.forEach((s: any) => {
    const key = s.workSchedule || 'MONTHLY';
    if (!scheduleGroups[key]) scheduleGroups[key] = [];
    scheduleGroups[key].push(s);
  });

  const scheduleLabel: any = { MONTHLY: 'Oylik', WEEKLY: 'Haftalik', DAILY: 'Kunlik', HOURLY: 'Soatlik' };

  return (
    <div className="space-y-5">
      {/* Summary kartalar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jami Xodimlar</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{activeStaff.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Faol xodimlar</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Jami Avanslar</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{totalAdvances.toLocaleString()} <span className="text-sm">so'm</span></p>
          <p className="text-xs text-slate-400 mt-0.5">{advances.filter((a: any) => !a.isCancelled).length} ta avans</p>
        </div>
        <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Oxirgi Oylik</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{totalPayroll.toLocaleString()} <span className="text-sm">so'm</span></p>
          <p className="text-xs text-slate-400 mt-0.5">{latestPeriod ? `${monthNames[(latestPeriod.month||1)-1]} ${latestPeriod.year}` : '—'}</p>
        </div>
        <div className="bg-white rounded-2xl border border-green-100 p-5 shadow-sm">
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Jami To'lovlar</p>
          <p className="text-2xl font-black text-green-600 mt-1">{totalPayments.toLocaleString()} <span className="text-sm">so'm</span></p>
          <p className="text-xs text-slate-400 mt-0.5">{payments.length} ta to'lov</p>
        </div>
      </div>

      {/* Maosh turi bo'yicha hisobot */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><MdAssessment className="text-indigo-500" /> Maosh turi bo'yicha xodimlar</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(scheduleGroups).map(([key, members]: any) => (
            <div key={key} className="bg-slate-50 rounded-xl border border-slate-100 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-slate-700">{scheduleLabel[key] || key}</span>
                <span className="text-lg font-black text-indigo-600">{members.length}</span>
              </div>
              <div className="space-y-1.5">
                {members.slice(0, 5).map((m: any) => (
                  <div key={m.id} className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-600 truncate max-w-[120px]">{m.fullName}</span>
                    <span className="font-bold text-slate-800">{Number(m.salary || 0).toLocaleString()}</span>
                  </div>
                ))}
                {members.length > 5 && <p className="text-[10px] text-slate-400">+{members.length - 5} ta xodim</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avanslar hisoboti */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-800">Xodimlar bo'yicha avanslar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-[10px] font-black text-slate-400 uppercase bg-slate-50/80 border-b border-slate-100">
              <th className="px-5 py-3">Xodim</th><th className="px-4 py-3">Jami avans</th><th className="px-4 py-3">Soni</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {activeStaff.map((member: any) => {
                const empAdvances = advances.filter((a: any) => a.employeeId === member.id && !a.isCancelled);
                const total = empAdvances.reduce((s: number, a: any) => s + Number(a.amount || 0), 0);
                if (total === 0) return null;
                return (
                  <tr key={member.id} className="hover:bg-amber-50/20">
                    <td className="px-5 py-3 text-sm font-bold text-slate-800">{member.fullName}</td>
                    <td className="px-4 py-3 text-sm font-black text-amber-600">{total.toLocaleString()} so'm</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">{empAdvances.length} ta</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
