import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useServicesStore } from '../store/useServicesStore';
import { useDebounce } from '../hooks/useDebounce';
import { ServiceTableRow } from '../components/ServiceTableRow';
import { Pagination } from '../components/Pagination';
import type { LaundryService } from '../api/servicesApi';
import { servicesApi } from '../api/servicesApi';
import { Plus, Search, X, Loader2, PackageOpen, ImagePlus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ServicesPage: React.FC = () => {
  const { services, total, isLoading, error, fetchServices, addService, updateService } = useServicesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [page, setPage] = useState(1);
  const limit = 6;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name: '', price: 100, description: '', duration: '' });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchServices({ search: debouncedSearchTerm, page, limit });
  }, [debouncedSearchTerm, page, limit, fetchServices]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUploadError(null);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setImageUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingId(null);
    setExistingImageUrl(null);
    setNewService({ name: '', price: 100, description: '', duration: '' });
    setSelectedCategories([]);
    handleRemoveImage();
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setImageUploadError(null);

    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        setIsUploadingImage(true);
        try {
          const result = await servicesApi.uploadImage(imageFile);
          imageUrl = result.url;
        } catch (err: any) {
          setImageUploadError(err.message || 'Image upload failed');
          setIsSubmitting(false);
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      if (editingId) {
        // Edit mode: PATCH the existing service.
        // New upload wins; otherwise keep (or clear, if removed) the old image.
        await updateService(editingId, {
          ...newService,
          price: Number(newService.price),
          imageUrl: imageUrl ?? existingImageUrl ?? '',
          categories: selectedCategories,
        });
      } else {
        await addService({ ...newService, price: Number(newService.price), imageUrl, categories: selectedCategories });
        setPage(1);
      }
      handleCloseModal();
    } catch (err) {
      // error shown via store
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const handleEdit = (service: LaundryService) => {
    setEditingId(service._id);
    setNewService({
      name: service.name,
      price: service.price,
      description: service.description,
      duration: service.duration || '',
    });
    setSelectedCategories(service.categories ?? []);
    setExistingImageUrl(service.imageUrl || null);
    setImagePreview(service.imageUrl || null);
    setImageFile(null);
    setImageUploadError(null);
    setIsAddModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('Delete service', id);
  };

  // ── Popular row controls (home page top-3 cards) ──
  const handleTogglePopular = async (service: LaundryService) => {
    const makingPopular = !service.isPopular;
    if (makingPopular && services.filter(s => s.isPopular).length >= 3) {
      // Backend enforces this too; fail fast with a friendly message
      useServicesStore.setState({ error: 'Only 3 services can be popular. Remove one first.' });
      return;
    }
    try {
      await updateService(service._id, {
        isPopular: makingPopular,
        ...(makingPopular
          ? { popularOrder: Math.min(3, services.filter(s => s.isPopular).length + 1) }
          : {}),
      });
    } catch {
      // error shown via store
    }
  };

  const handleSetPopularOrder = async (service: LaundryService, order: number) => {
    try {
      // If another popular service holds this position, swap positions
      const other = services.find(
        s => s.isPopular && s._id !== service._id && (s.popularOrder ?? 1) === order,
      );
      await updateService(service._id, { popularOrder: order });
      if (other) {
        await updateService(other._id, { popularOrder: service.popularOrder ?? 1 });
      }
    } catch {
      // error shown via store
    }
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
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Popular</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {isLoading && services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching Services...</p>
                    </div>
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
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
                    onTogglePopular={handleTogglePopular}
                    onSetPopularOrder={handleSetPopularOrder}
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
              onClick={handleCloseModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {editingId ? 'Edit Service' : 'Create New Service'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    {editingId ? 'Update the details of this laundry service' : 'Define the details for your new laundry service'}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddService} className="space-y-6">
                <div className="space-y-4">

                  {/* ── Service Image Upload ── */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      Service Image <span className="text-slate-300 normal-case font-medium">(optional)</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />

                    {imagePreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                        <img
                          src={imagePreview}
                          alt="Service preview"
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 bg-white/90 rounded-xl text-slate-700 hover:bg-white transition-colors"
                            title="Change image"
                          >
                            <ImagePlus size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="p-2 bg-red-500/90 rounded-xl text-white hover:bg-red-500 transition-colors"
                            title="Remove image"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors group"
                      >
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                          <ImagePlus size={22} />
                        </div>
                        <span className="text-sm font-semibold">Click to upload image</span>
                        <span className="text-xs">PNG, JPG, WEBP up to 10MB</span>
                      </button>
                    )}

                    {imageUploadError && (
                      <p className="mt-2 text-xs text-red-500 font-semibold flex items-center gap-1">
                        <X size={12} /> {imageUploadError}
                      </p>
                    )}
                  </div>

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

                  {/* ── Category checkboxes ── */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                      Category <span className="text-slate-300 normal-case font-medium">(select one or both)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['instant', 'scheduled'] as const).map((cat) => {
                        const checked = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                              checked
                                ? cat === 'instant'
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                  : 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              checked
                                ? cat === 'instant'
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-orange-500 bg-orange-500'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {checked && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-bold capitalize ${
                                checked
                                  ? cat === 'instant' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {cat === 'instant' ? '⚡ Instant' : '🕐 Scheduled'}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {cat === 'instant' ? 'Same-day pickup & delivery' : 'Book a time slot in advance'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
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
                    onClick={handleCloseModal}
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
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isUploadingImage ? 'Uploading image…' : editingId ? 'Saving…' : 'Creating…'}
                      </span>
                    ) : editingId ? 'Save Changes' : 'Create Service'}
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
