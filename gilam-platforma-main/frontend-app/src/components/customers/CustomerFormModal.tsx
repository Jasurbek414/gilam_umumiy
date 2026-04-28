'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MdPerson, 
  MdPhone, 
  MdLocationOn, 
  MdCheckCircle,
  MdClose,
  MdInfoOutline
} from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import { Customer } from '@/types';
import { customersApi, getUser } from '@/lib/api';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), { 
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full bg-slate-50 flex flex-col items-center justify-center rounded-2xl border border-slate-100 shadow-inner">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Xarita yuklanmoqda...</p>
    </div>
  )
});

// Utility to format phone as +998 (XX) XXX-XX-XX
const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '');
  let res = '+998';
  if (digits.length > 3) {
    res += ` (${digits.substring(3, 5)}`;
  }
  if (digits.length > 5) {
    res += `) ${digits.substring(5, 8)}`;
  }
  if (digits.length > 8) {
    res += `-${digits.substring(8, 10)}`;
  }
  if (digits.length > 10) {
    res += `-${digits.substring(10, 12)}`;
  }
  return res;
};

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Customer | null;
}

export default function CustomerFormModal({ isOpen, onClose, onSuccess, initialData }: CustomerFormModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '+998',
    address: '',
    location: null as { lat: number, lng: number } | null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Sync form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          fullName: initialData.fullName || '',
          phone: initialData.phone1 || '+998',
          address: initialData.address || '',
          location: null // We don't fetch exact lat/lng from backend list usually, but can be scaled later
        });
      } else {
        setFormData({ fullName: '', phone: '+998', address: '', location: null });
      }
      setErrors({});
      setIsMapOpen(false);
    }
  }, [isOpen, initialData]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Don't allow user to delete +998 easily unless they clear entirely
    if (!val.startsWith('+998') && val.length > 0) {
      return; 
    }
    setFormData({ ...formData, phone: formatPhoneNumber(val) });
    if (errors.phone) setErrors({ ...errors, phone: '' });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'F.I.SH kamida 3 ta harfdan iborat bo\'lishi kerak.';
    }
    const digits = formData.phone.replace(/\D/g, '');
    if (digits.length !== 12) {
      newErrors.phone = 'Telefon raqam noto\'g\'ri formatda. To\'liq kiriting.';
    }
    if (formData.address.trim().length < 5) {
      newErrors.address = 'Manzilni to\'liqroq kiriting (kamida 5 ta belgi).';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Iltimos, barcha maydonlarni to\'g\'ri to\'ldiring');
      // Shake animation could be triggered here
      return;
    }

    const currentUser = getUser();
    if (!currentUser?.companyId) {
      toast.error('Avtorizatsiya xatosi. Tizimga qayta kiring.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a clean payload mapping to the backend DTO precisely to prevent 400 Bad Request
      const payload = {
        fullName: formData.fullName,
        phone1: formData.phone.replace(/[\s\-\(\)]/g, ''), // e.g. +998901234567
        address: formData.address,
        location: formData.location ? `${formData.location.lat},${formData.location.lng}` : undefined,
        companyId: currentUser.companyId,
        operatorId: currentUser.id
      };

      if (initialData) {
        await customersApi.update(initialData.id, payload);
        toast.success("Mijoz ma'lumotlari muvaffaqiyatli yangilandi", {
          icon: '🔄',
          style: { borderRadius: '12px', background: '#334155', color: '#fff' }
        });
      } else {
        await customersApi.create(payload);
        toast.success("Yangi mijoz muvaffaqiyatli saqlandi", {
          icon: '✅',
          style: { borderRadius: '12px', background: '#334155', color: '#fff' }
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Saqlashda noma'lum xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Mijozni Tahrirlash" : "Yangi Mijoz Qo'shish"}
      // We can pass a custom width if backend UI supports it, default is typically max-w-md or lg
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-2 w-full">
        {/* Form Fields Stack */}
        <div className="space-y-4">
          
          {/* Full Name Input */}
          <div className="group">
            <label className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              F.I.SH (To'liq ism)
              {errors.fullName && <span className="text-rose-500 normal-case tracking-normal">{errors.fullName}</span>}
            </label>
            <div className="relative">
              <MdPerson className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl transition-colors ${errors.fullName ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
              <input 
                type="text" 
                className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-700
                  ${errors.fullName 
                    ? 'border-rose-200 bg-rose-50 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10' 
                    : 'border-transparent focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                  }`}
                placeholder="Masalan: Sardor To'rayev"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({...formData, fullName: e.target.value});
                  if (errors.fullName) setErrors({...errors, fullName: ''});
                }}
              />
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="group">
            <label className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Telefon raqami
              {errors.phone && <span className="text-rose-500 normal-case tracking-normal">{errors.phone}</span>}
            </label>
            <div className="relative">
              <MdPhone className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl transition-colors ${errors.phone ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
              <input 
                type="text" 
                className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-700
                  ${errors.phone 
                    ? 'border-rose-200 bg-rose-50 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10' 
                    : 'border-transparent focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                  }`}
                placeholder="+998 (__) ___-__-__"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={19} // "+998 (90) 123-45-67".length
              />
            </div>
          </div>

          {/* Address Input & Map Toggle */}
          <div className="group">
            <label className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
              Manzil
              {errors.address && <span className="text-rose-500 normal-case tracking-normal">{errors.address}</span>}
            </label>
            <div className="relative flex items-center">
              <MdLocationOn className={`absolute z-10 left-4 top-1/2 -translate-y-1/2 text-xl transition-colors ${errors.address ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
              <input 
                type="text" 
                className={`w-full pl-12 pr-14 py-3.5 bg-slate-50 border-2 rounded-2xl outline-none transition-all font-bold text-slate-700
                  ${errors.address 
                    ? 'border-rose-200 bg-rose-50 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10' 
                    : 'border-transparent focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10'
                  }`}
                placeholder="Shahar, tuman, mahalla, ko'cha, uy bino..."
                value={formData.address}
                onChange={(e) => {
                  setFormData({...formData, address: e.target.value});
                  if (errors.address) setErrors({...errors, address: ''});
                }}
              />
              <button 
                type="button"
                onClick={() => setIsMapOpen(!isMapOpen)}
                className={`absolute right-2 p-2 rounded-xl transition-all shadow-sm ${isMapOpen ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200'}`}
                title={isMapOpen ? "Xaritani yopish" : "Xaritani ochish"}
              >
                {isMapOpen ? <MdClose className="text-lg" /> : <MdLocationOn className="text-lg" />}
              </button>
            </div>
            
            {/* Smooth Collapsible Map Container */}
            <AnimatePresence>
              {isMapOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden mt-3"
                >
                  <div className="p-1">
                    <MapPicker 
                      initialLocation={formData.location || undefined}
                      initialSearchQuery={formData.address} // Enables smart sync
                      onLocationSelect={(lat, lng, address) => {
                        // Secretly update coords. Only auto-fill address if the user hasn't typed anything.
                        setFormData(prev => ({ 
                          ...prev, 
                          address: prev.address.trim().length < 2 ? address : prev.address, 
                          location: { lat, lng } 
                        }));
                        if (errors.address) setErrors(prev => ({...prev, address: ''}));
                      }} 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 mt-2">
          <MdInfoOutline className="text-indigo-500 text-lg shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
            Iltimos, manzilni va mijoz telefonini aniq kiriting. Xarita orqali oynani ochib <b>hududni belgilash</b> yetkazib berish logistikasini sezilarli darajada osonlashtiradi.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[11px] uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 relative overflow-hidden group"
          >
            <div className="flex items-center justify-center gap-2 relative z-10">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <MdCheckCircle className="text-lg" />
                  {initialData ? 'O\'zgarishlarni Saqlash' : 'Mijozni Qayd Etish'}
                </>
              )}
            </div>
            {/* Button Shine Effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
          </button>
        </div>
      </form>
    </Modal>
  );
}
