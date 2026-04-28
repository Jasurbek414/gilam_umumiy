'use client';

import React, { useState, useEffect } from 'react';
import { 
  MdPeople, 
  MdSearch, 
  MdAdd, 
  MdEdit, 
  MdDelete, 
  MdPhone, 
  MdLocationOn,
  MdDownload
} from 'react-icons/md';
import Modal from '@/components/ui/Modal';
import { customersApi, getUser } from '@/lib/api';
import { User, Customer } from '@/types';
import toast from 'react-hot-toast';
import CustomerFormModal from '@/components/customers/CustomerFormModal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const currentUser = getUser();
    if (currentUser && currentUser.companyId) {
      setUser(currentUser);
      fetchCustomers(currentUser.companyId);
    }
  }, []);

  const fetchCustomers = async (companyId: string) => {
    setLoading(true);
    try {
      const data = await customersApi.getByCompany(companyId);
      setCustomers(data);
      setCurrentPage(1);
    } catch (err) {
      toast.error('Mijozlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    
    if (!user) return;
    
    if (q.length > 2) {
      try {
        const found = await customersApi.search(user.companyId, q);
        setCustomers(found);
        setCurrentPage(1);
      } catch (err) {
        console.error('Search error:', err);
      }
    } else if (q.length === 0) {
      fetchCustomers(user.companyId);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setSelectedCustomer(customer);
    } else {
      setSelectedCustomer(null);
    }
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer || !user) return;
    try {
      await customersApi.remove(selectedCustomer.id);
      toast.success('Mijoz o\'chirildi');
      setIsDeleteModalOpen(false);
      fetchCustomers(user.companyId);
    } catch (err) {
      toast.error('Mijozni o\'chirishda xatolik yuz berdi');
    }
  };

  const exportToCSV = () => {
    if (customers.length === 0) {
      toast.error('Export qilish uchun malummot topilmadi');
      return;
    }

    const headers = ['Ism/F.I.SH', 'Asosiy Telefon', 'Qo\'shimcha Telefon', 'Manzil', 'Kiritilgan Sana'];
    
    const csvRows = [headers.join(',')];
    
    customers.forEach(c => {
      const name = `"${(c.fullName || '').replace(/"/g, '""')}"`;
      const phone1 = `"${(c.phone1 || (c as any).phone || '').replace(/"/g, '""')}"`;
      const phone2 = `"${(c.phone2 || '').replace(/"/g, '""')}"`;
      const address = `"${(c.address || '').replace(/"/g, '""')}"`;
      const date = `"${new Date(c.createdAt).toLocaleDateString()}"`;
      
      csvRows.push([name, phone1, phone2, address, date].join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Mijozlar_Bazasi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Mijozlar muvaffaqiyatli saqlandi!');
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = customers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(customers.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
            <MdPeople />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Mijozlar Bazasi</h1>
            <p className="text-sm font-medium text-slate-500">Jami {customers.length} nafar mijoz</p>
          </div>
        </div>
        
        <div className="flex w-full lg:w-auto flex-wrap lg:flex-nowrap items-center gap-3">
          <div className="relative flex-1 w-full lg:w-80">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
            <input 
              type="text" 
              placeholder="Ism yoki telefon orqali izlang..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 hover:bg-white outline-none transition-all font-semibold text-sm text-slate-700 placeholder-slate-400 shadow-sm"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <button 
            onClick={exportToCSV}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 font-black rounded-xl hover:bg-emerald-500 hover:text-white transition-all text-xs uppercase tracking-[0.1em] border border-emerald-100 hover:border-emerald-500 shadow-sm outline-none"
            title="Excel/CSV formatda yuklab olish"
          >
            <MdDownload className="text-xl shrink-0" />
            Eksport
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-[0_8px_15px_-5px_rgba(79,70,229,0.4)] hover:shadow-[0_12px_20px_-8px_rgba(79,70,229,0.7)] hover:-translate-y-0.5 active:scale-95 transition-all text-xs uppercase tracking-[0.1em] outline-none"
          >
            <MdAdd className="text-xl shrink-0" />
            Qo'shish
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Yuklanmoqda...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  <th className="px-6 py-4">Mijoz / Telefon</th>
                  <th className="px-6 py-4">Mas'ul Operator</th>
                  <th className="px-6 py-4">Manzil / Mo'ljal</th>
                  <th className="px-6 py-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {currentCustomers.length > 0 ? (currentCustomers as any[]).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-tr from-indigo-50 to-blue-50 text-indigo-600 rounded-[1.25rem] flex items-center justify-center font-black text-sm shadow-sm border border-indigo-100/50">
                          {c.fullName[0]?.toUpperCase() || 'M'}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm tracking-tight">{c.fullName || 'Noma\'lum'}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-bold tracking-wide">
                            <MdPhone className="text-indigo-400" />
                            {c.phone1 || (c as any).phone || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-inner ${c.operator?.fullName ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50' : 'bg-slate-100 text-slate-400'}`}>
                          {c.operator?.fullName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className={`font-bold text-xs truncate max-w-[140px] ${c.operator?.fullName ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                          {c.operator?.fullName || 'Biriktirilmagan'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-2 text-slate-600 font-medium max-w-[220px]">
                        <MdLocationOn className="text-slate-400 shrink-0 mt-0.5 text-lg" />
                        <span className="text-xs leading-snug line-clamp-2">{c.address || 'Manzil berilmagan'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleOpenModal(c)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Tahrirlash"
                        >
                          <MdEdit className="text-xl" />
                        </button>
                        <button 
                          onClick={() => { setSelectedCustomer(c); setIsDeleteModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="O'chirish"
                        >
                          <MdDelete className="text-xl" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center space-y-3 opacity-30">
                        <MdPeople className="text-7xl" />
                        <p className="font-black text-lg">Mijozlar topilmadi</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, customers.length)} (Jami: {customers.length})
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-sm"
                  >
                    {'<'}
                  </button>
                  <button
                    className="px-4 h-8 rounded-xl flex items-center justify-center font-black text-[11px] transition-all bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  >
                    Sahifa {currentPage} / {totalPages}
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-sm"
                  >
                    {'>'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extracted Isolated Senior Component */}
      <CustomerFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedCustomer}
        onSuccess={() => {
          if (user?.companyId) fetchCustomers(user.companyId);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="Mijozni O'chirish"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 font-black">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <MdDelete className="text-2xl" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Mijozni o'chirib tashlamoqchimisiz?</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Bu amalni ortga qaytarib bo'lmaydi. Mijozning barcha ma'lumotlari tizimdan o'chiriladi.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all font-black"
            >
              Yo'q, qolsin
            </button>
            <button 
              onClick={confirmDelete}
              className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-700 hover:-translate-y-1 active:scale-95 transition-all font-black"
            >
              Ha, o'chirilsin
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
