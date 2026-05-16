import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useServicesStore } from '../store/useServicesStore';
import { useDebounce } from '../hooks/useDebounce';
import { ServiceTableRow } from '../components/ServiceTableRow';
import { Pagination } from '../components/Pagination';
import type { LaundryService } from '../api/servicesApi';
import { Plus, Search, X, Loader2, PackageOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ServicesPage: React.FC = () => {
  const { services, total, isLoading, error, fetchServices, addService } = useServicesStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const [page, setPage] = useState(1);
  const limit = 6;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: 100, description: '', category: '', duration: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchServices({ search: debouncedSearchTerm, page, limit });
  }, [debouncedSearchTerm, page, limit, fetchServices]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addService({ ...newService, price: Number(newService.price) });
      setIsAddModalOpen(false);
      setNewService({ name: '', price: 100, description: '', category: '', duration: '' });
      setPage(1);
    } catch (err) {
      // Show error in UI
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const handleEdit = (service: LaundryService) => {
    console.log('Edit service', service);
  };

  const handleDelete = (id: string) => {
    console.log('Delete service', id);
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Services</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Configure and manage laundry offerings</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full md:w-64 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            className="btn-premium whitespace-nowrap" 
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={20} />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-100 dark:border-red-500/20 rounded-2xl font-semibold flex items-center gap-3"
        >
          <X size={20} />
          {error}
        </motion.div>
      )}

      {/* Services Content */}
      <div className="premium-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Service Details</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Base Price</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {isLoading && services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching Services...</p>
                    </div>
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-full">
                        <PackageOpen size={48} className="text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">No services found</h3>
                      <p className="text-slate-500 max-w-xs mx-auto">It seems you haven't added any services yet. Create your first offering to get started.</p>
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-ghost mt-2"
                      >
                        Create Service
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <ServiceTableRow 
                    key={service._id} 
                    service={service} 
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && services.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-xl shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create New Service</h2>
                  <p className="text-slate-500 text-sm mt-1">Define the details for your new laundry service</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddService} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Service Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Premium Silk Wash"
                      className="input-premium"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Base Price (₹)</label>
                      <input
                        type="number"
                        required
                        className="input-premium"
                        value={newService.price}
                        onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                      <input
                        type="text"
                        placeholder="e.g. Ironing"
                        className="input-premium"
                        value={newService.category}
                        onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Estimated Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 24 - 48 hrs"
                      className="input-premium"
                      value={newService.duration}
                      onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Service Description</label>
                    <textarea
                      required
                      placeholder="Briefly describe what this service includes..."
                      className="input-premium h-24 resize-none"
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 btn-ghost"
                    disabled={isSubmitting}
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-premium justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Service'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};
