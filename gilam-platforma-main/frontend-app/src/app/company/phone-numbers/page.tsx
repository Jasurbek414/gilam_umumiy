'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MdPhone, MdAdd, MdDelete, MdCampaign, MdEdit,
  MdCheckCircle, MdBlock, MdRefresh, MdArrowForward,
} from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { campaignsApi, getUser } from '@/lib/api';

// Barcha kampaniyalardan raqamlarni yassi ro'yxatga chiqaramiz
interface PhoneEntry {
  number: string;
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  isPrimary: boolean;
}

function buildPhoneList(campaigns: any[]): PhoneEntry[] {
  const list: PhoneEntry[] = [];
  for (const c of campaigns) {
    if (c.phoneNumber) {
      list.push({
        number: c.phoneNumber,
        campaignId: c.id,
        campaignName: c.name,
        campaignStatus: c.status,
        isPrimary: true,
      });
    }
    for (const n of c.extraNumbers || []) {
      list.push({
        number: n,
        campaignId: c.id,
        campaignName: c.name,
        campaignStatus: c.status,
        isPrimary: false,
      });
    }
  }
  return list;
}

// ─── RAQAM QO'SHISH / TAHRIRLASH MODALI ──────────────────────────────────────
function NumberModal({
  campaigns,
  initial,
  onSave,
  onClose,
}: {
  campaigns: any[];
  initial?: { number: string; campaignId: string; isPrimary: boolean } | null;
  onSave: (number: string, campaignId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [number, setNumber] = useState(initial?.number || '');
  const [campaignId, setCampaignId] = useState(initial?.campaignId || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!number.trim() || !campaignId) {
      toast.error('Raqam va kampaniyani tanlang');
      return;
    }
    setSaving(true);
    try {
      await onSave(number.trim(), campaignId);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        <h2 className="text-lg font-black text-slate-800 mb-6">
          {initial ? 'Raqamni tahrirlash' : 'Yangi raqam qo\'shish'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="label">Telefon raqam (DID)</label>
            <input
              type="text"
              value={number}
              onChange={e => setNumber(e.target.value)}
              placeholder="+998712345678"
              disabled={!!initial}
              className="field disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Zadarma / SIP provayderdan olingan raqam
            </p>
          </div>

          <div>
            <label className="label">Kampaniya</label>
            <select
              value={campaignId}
              onChange={e => setCampaignId(e.target.value)}
              className="field"
            >
              <option value="">Kampaniya tanlang...</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status === 'ACTIVE' ? '✓' : '(nofaol)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tanlangan kampaniya haqida ma'lumot */}
        {campaignId && (() => {
          const c = campaigns.find(x => x.id === campaignId);
          if (!c) return null;
          return (
            <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">Kampaniya ma'lumotlari</p>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">{c.name}</p>
                {c.phoneNumber && (
                  <p className="text-xs text-slate-500 font-mono">Asosiy: {c.phoneNumber}</p>
                )}
                {c.extraNumbers?.length > 0 && (
                  <p className="text-xs text-slate-400">
                    Qo'shimcha: {c.extraNumbers.join(', ')}
                  </p>
                )}
                {c.driver && (
                  <p className="text-xs text-emerald-600 font-bold">
                    Haydovchi: {c.driver.fullName}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-2xl text-sm"
          >
            Bekor
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] py-3 bg-indigo-600 text-white font-black rounded-2xl text-sm shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── ASOSIY SAHIFA ────────────────────────────────────────────────────────────
export default function PhoneNumbersPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [phoneList, setPhoneList] = useState<PhoneEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<PhoneEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCampaign, setFilterCampaign] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = getUser();
      const companyId = user?.companyId || user?.company?.id || '';
      const camps = await campaignsApi.getAll();
      setCampaigns(camps);
      setPhoneList(buildPhoneList(camps));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Raqam qo'shish: kampaniyaning extraNumbers ga qo'shamiz
  const handleAdd = async (number: string, campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) throw new Error('Kampaniya topilmadi');

    // Raqam allaqachon boshqa kampaniyada bormi?
    const existing = phoneList.find(p => p.number === number);
    if (existing && existing.campaignId !== campaignId) {
      throw new Error(`Bu raqam allaqachon "${existing.campaignName}" kampaniyasida mavjud`);
    }

    // Asosiy raqam yo'q bo'lsa — asosiy qilib qo'yamiz
    if (!campaign.phoneNumber) {
      await campaignsApi.update(campaignId, { phoneNumber: number });
    } else {
      const newExtras = [...(campaign.extraNumbers || [])];
      if (!newExtras.includes(number)) newExtras.push(number);
      await campaignsApi.update(campaignId, { extraNumbers: newExtras });
    }
    toast.success('Raqam qo\'shildi');
    await load();
  };

  // Raqamni boshqa kampaniyaga ko'chirish
  const handleMove = async (entry: PhoneEntry, newCampaignId: string) => {
    if (newCampaignId === entry.campaignId) return;
    // Eski kampaniyadan olib tashlash
    await handleDelete(entry, false);
    // Yangi kampaniyaga qo'shish
    await handleAdd(entry.number, newCampaignId);
    toast.success('Raqam ko\'chirildi');
    await load();
  };

  // Raqamni o'chirish
  const handleDelete = async (entry: PhoneEntry, reload = true) => {
    const campaign = campaigns.find(c => c.id === entry.campaignId);
    if (!campaign) return;

    if (entry.isPrimary) {
      // Asosiy raqamni o'chirsak, birinchi extraNumbers ni asosiy qilamiz
      const newExtras = [...(campaign.extraNumbers || [])];
      const newPrimary = newExtras.shift() || '';
      await campaignsApi.update(entry.campaignId, {
        phoneNumber: newPrimary,
        extraNumbers: newExtras,
      });
    } else {
      const newExtras = (campaign.extraNumbers || []).filter((n: string) => n !== entry.number);
      await campaignsApi.update(entry.campaignId, { extraNumbers: newExtras });
    }
    if (reload) {
      toast.success('Raqam o\'chirildi');
      await load();
    }
  };

  const filtered = filterCampaign
    ? phoneList.filter(p => p.campaignId === filterCampaign)
    : phoneList;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showModal && (
          <NumberModal
            campaigns={campaigns}
            initial={editEntry}
            onSave={handleAdd}
            onClose={() => { setShowModal(false); setEditEntry(null); }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Telefon Raqamlar</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Qaysi raqam qaysi kampaniyaga bog'langan — boshqarish
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
            <MdRefresh className="text-xl" />
          </button>
          <button
            onClick={() => { setEditEntry(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 text-sm hover:bg-indigo-700 transition-all"
          >
            <MdAdd className="text-lg" /> Raqam qo'shish
          </button>
        </div>
      </div>

      {/* Statistika kartochkalari */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Jami raqamlar', value: phoneList.length, color: 'text-indigo-600' },
          { label: 'Faol kampaniyalar', value: campaigns.filter(c => c.status === 'ACTIVE').length, color: 'text-emerald-600' },
          { label: 'Asosiy raqamlar', value: phoneList.filter(p => p.isPrimary).length, color: 'text-blue-600' },
          { label: 'Qo\'shimcha raqamlar', value: phoneList.filter(p => !p.isPrimary).length, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCampaign('')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            filterCampaign === '' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Hammasi ({phoneList.length})
        </button>
        {campaigns.map(c => (
          <button
            key={c.id}
            onClick={() => setFilterCampaign(filterCampaign === c.id ? '' : c.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              filterCampaign === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <MdCampaign className="text-sm" />
            {c.name}
            <span className="bg-white/20 px-1.5 py-0.5 rounded-md">
              {phoneList.filter(p => p.campaignId === c.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Raqamlar jadvali */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <MdPhone className="text-5xl text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-400">Raqam yo'q</h3>
            <p className="text-slate-400 text-sm mt-2">
              "Raqam qo'shish" tugmasi orqali raqam qo'shing
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl text-sm shadow-lg shadow-indigo-200"
            >
              Birinchi raqamni qo'shish
            </button>
          </div>
        ) : (
          <div>
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
              <div className="grid grid-cols-12 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="col-span-3">Telefon raqam</div>
                <div className="col-span-2">Turi</div>
                <div className="col-span-3">Kampaniya</div>
                <div className="col-span-2">Haydovchi</div>
                <div className="col-span-2">Amallar</div>
              </div>
            </div>

            <div className="divide-y divide-slate-50">
              {filtered.map((entry, i) => {
                const campaign = campaigns.find(c => c.id === entry.campaignId);
                return (
                  <motion.div
                    key={`${entry.campaignId}-${entry.number}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-6 py-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="grid grid-cols-12 items-center gap-4">
                      {/* Raqam */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            entry.campaignStatus === 'ACTIVE' ? 'bg-emerald-50' : 'bg-slate-100'
                          }`}>
                            <MdPhone className={`text-lg ${
                              entry.campaignStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-slate-400'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 font-mono">{entry.number}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                entry.campaignStatus === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                              }`} />
                              <span className={`text-[10px] font-bold ${
                                entry.campaignStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-slate-400'
                              }`}>
                                {entry.campaignStatus === 'ACTIVE' ? 'Faol' : 'Nofaol'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Turi */}
                      <div className="col-span-2">
                        {entry.isPrimary ? (
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide">
                            <MdCheckCircle className="text-xs" /> Asosiy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide">
                            Qo'shimcha
                          </span>
                        )}
                      </div>

                      {/* Kampaniya */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <MdCampaign className="text-indigo-400 text-base shrink-0" />
                          <p className="text-sm font-bold text-slate-700">{entry.campaignName}</p>
                        </div>
                      </div>

                      {/* Haydovchi */}
                      <div className="col-span-2">
                        {campaign?.driver ? (
                          <p className="text-xs font-bold text-emerald-600">{campaign.driver.fullName}</p>
                        ) : (
                          <p className="text-xs text-slate-400">—</p>
                        )}
                      </div>

                      {/* Amallar */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-1">
                          {/* Kampaniyaga ko'chirish */}
                          {campaigns.length > 1 && (
                            <select
                              onChange={e => { if (e.target.value) handleMove(entry, e.target.value); e.target.value = ''; }}
                              className="text-[10px] bg-slate-100 text-slate-600 font-bold rounded-xl px-2 py-2 outline-none hover:bg-slate-200 transition-colors cursor-pointer"
                              title="Boshqa kampaniyaga ko'chirish"
                            >
                              <option value="">Ko'chirish...</option>
                              {campaigns
                                .filter(c => c.id !== entry.campaignId)
                                .map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`"${entry.number}" raqamini o'chirasizmi?`)) {
                                handleDelete(entry);
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"
                            title="O'chirish"
                          >
                            <MdDelete className="text-base" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Qo'llanma */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100">
        <h3 className="text-sm font-black text-indigo-800 mb-3 flex items-center gap-2">
          <MdPhone className="text-lg" /> Qo'llanma — Raqamlarni qanday ulash kerak
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: 'Zadarma / SIP dan raqam oling',
              desc: 'Provayderdan virtual raqam (DID) xarid qiling yoki mavjud raqamni port qiling',
            },
            {
              step: '2',
              title: 'Bu yerda kampaniyaga bog\'lang',
              desc: '"Raqam qo\'shish" tugmasini bosing, raqamni kiriting va kampaniyani tanlang',
            },
            {
              step: '3',
              title: 'Webhook ulang',
              desc: `Zadarma panelida Webhook URL: ${typeof window !== 'undefined' ? window.location.origin.replace('3001', '3000') : 'http://...'}/api/calls/webhook/zadarma`,
            },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-black shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-xs font-black text-indigo-800">{s.title}</p>
                <p className="text-[11px] text-indigo-600 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
