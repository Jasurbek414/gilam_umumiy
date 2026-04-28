'use client';

import React, { useState, useEffect } from 'react';
import { MdTrendingUp, MdBusiness, MdPeople, MdAttachMoney, MdShoppingCart } from 'react-icons/md';
import { motion } from 'framer-motion';
import { companiesApi, usersApi } from '@/lib/api';

export default function AdminDashboard() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [comps, usrs] = await Promise.all([
          companiesApi.getAll(),
          usersApi.getAll(),
        ]);
        setCompanies(comps);
        setUsers(usrs);
      } catch (err) {
        console.error('Dashboard ma\'lumotlarini yuklashda xato:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = [
    {
      label: 'Jami Korxonalar',
      value: companies.length,
      icon: MdBusiness,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    {
      label: 'Faol Xodimlar',
      value: users.length,
      icon: MdPeople,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Faol Kompaniyalar',
      value: companies.filter(c => c.status === 'ACTIVE').length,
      icon: MdTrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      label: 'Rollar bo\'yicha',
      value: new Set(users.map(u => u.role)).size,
      icon: MdAttachMoney,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Ma&apos;lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight border-b-2 border-blue-600 inline-block pb-1">
            Super Admin Panel
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Real vaqtdagi ma&apos;lumotlar bazadan olinmoqda</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
                  </div>
                  <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="text-2xl" />
                  </div>
                </div>
              </div>
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.bg} opacity-5 rounded-full`}></div>
            </motion.div>
          );
        })}
      </div>

      {/* Companies & Users Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kompaniyalar ro'yxati */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MdBusiness className="text-indigo-500" /> Korxonalar
          </h3>
          <div className="space-y-3">
            {companies.length > 0 ? companies.map((company) => (
              <div key={company.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{company.name}</p>
                    <p className="text-xs text-slate-500">{company.phoneNumber || 'Tel. ko\'rsatilmagan'}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                  company.status === 'ACTIVE' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {company.status === 'ACTIVE' ? 'Faol' : 'Nofaol'}
                </span>
              </div>
            )) : (
              <p className="text-slate-400 text-center py-8 font-bold">Kompaniyalar topilmadi</p>
            )}
          </div>
        </div>

        {/* Xodimlar ro'yxati */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MdPeople className="text-blue-500" /> Xodimlar
          </h3>
          <div className="space-y-3">
            {users.length > 0 ? users.map((user) => {
              const roleColors: Record<string, string> = {
                SUPER_ADMIN: 'bg-purple-100 text-purple-700',
                COMPANY_ADMIN: 'bg-indigo-100 text-indigo-700',
                OPERATOR: 'bg-blue-100 text-blue-700',
                DRIVER: 'bg-amber-100 text-amber-700',
                WASHER: 'bg-cyan-100 text-cyan-700',
                FINISHER: 'bg-emerald-100 text-emerald-700',
                CUSTOMER: 'bg-slate-100 text-slate-700',
              };
              const roleLabels: Record<string, string> = {
                SUPER_ADMIN: 'Super Admin',
                COMPANY_ADMIN: 'Korxona Boshlig\'i',
                OPERATOR: 'Operator',
                DRIVER: 'Haydovchi',
                WASHER: 'Yuvuvchi',
                FINISHER: 'Dazmolchi',
                CUSTOMER: 'Mijoz',
              };
              return (
                <div key={user.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">
                      {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{user.fullName}</p>
                      <p className="text-xs text-slate-500">{user.phone} {user.company ? `• ${user.company.name}` : ''}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider ${roleColors[user.role] || 'bg-slate-100 text-slate-700'}`}>
                    {roleLabels[user.role] || user.role}
                  </span>
                </div>
              );
            }) : (
              <p className="text-slate-400 text-center py-8 font-bold">Xodimlar topilmadi</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
