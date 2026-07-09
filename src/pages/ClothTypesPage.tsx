import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useClothTypesStore } from '../store/useClothTypesStore';
import type { ClothType, ClothTypeCategory, ClothTypeSubcategory } from '../api/clothTypesApi';
import { CATEGORY_LABELS } from '../constants/clothTypeCategories';
import { Plus, Search, X, Loader2, Package, Edit, Trash2, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUBCATEGORY_LABELS: Record<ClothTypeSubcategory, string> = {
  unisex: 'Unisex',
  men: 'Men',
  women: 'Women',
  kids: 'Kids',
  household: 'Household',
  delicate: 'Delicate',
  package: 'Package',
  plan: 'Plan',
  ironPass: 'Iron Pass',
  smartPass: 'Smart Pass',
  combo: 'Combo',
};

interface ClothTypeFormData {
  name: string;
  instantRate: number;
  scheduledRate: number;
  discountInstantRate?: number;
  discountScheduledRate?: number;
  description: string;
  category: ClothTypeCategory | '';
  subcategory: ClothTypeSubcategory | '';
  isActive: boolean;
  includesText: string;
  excludedItemsText: string;
  validityDays?: number;
}

const emptyFormData: ClothTypeFormData = {
  name: '',
  instantRate: 0,
  scheduledRate: 0,
  discountInstantRate: undefined,
  discountScheduledRate: undefined,
  description: '',
  category: '',
  subcategory: '',
  isActive: true,
  includesText: '',
  excludedItemsText: '',
  validityDays: undefined,
};

const splitCommaList = (value: string): string[] | undefined => {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

function RateCell({ label, rate, discountRate }: { label: string; rate: number; discountRate?: number }) {
  return (
    <div className="text-xs whitespace-nowrap">
      <span className="text-slate-400 font-semibold mr-1">{label}:</span>
      {discountRate != null ? (
        <>
          <span className="line-through text-slate-400 mr-1">₹{rate.toFixed(2)}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{discountRate.toFixed(2)}</span>
        </>
      ) : (
        <span className="font-bold text-slate-900 dark:text-white">₹{rate.toFixed(2)}</span>
      )}
    </div>
  );
}

export const ClothTypesPage: React.FC = () => {
  const { clothTypes, isLoading, error, fetchClothTypes, createClothType, updateClothType, deleteClothType } = useClothTypesStore();

  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedClothType, setSelectedClothType] = useState<ClothType | null>(null);

  const [formData, setFormData] = useState<ClothTypeFormData>(emptyFormData);
  const [showDiscount, setShowDiscount] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClothTypes();
  }, [fetchClothTypes]);

  const filteredClothTypes = clothTypes.filter(ct =>
    ct.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSmartPass = formData.category === 'membership' && formData.subcategory === 'smartPass';

  const isFormValid = () => {
    if (!formData.name.trim()) return false;
    if (!isSmartPass && (formData.instantRate <= 0 || formData.scheduledRate <= 0)) return false;
    if (formData.category && formData.category !== 'shoeCleaning' && !formData.subcategory) return false;
    if (showDiscount) {
      if (formData.discountInstantRate != null && formData.discountInstantRate >= formData.instantRate) return false;
      if (formData.discountScheduledRate != null && formData.discountScheduledRate >= formData.scheduledRate) return false;
    }
    return true;
  };

  const toDto = () => ({
    name: formData.name,
    instantRate: formData.instantRate,
    scheduledRate: formData.scheduledRate,
    discountInstantRate: showDiscount ? formData.discountInstantRate : undefined,
    discountScheduledRate: showDiscount ? formData.discountScheduledRate : undefined,
    description: formData.description,
    category: formData.category || undefined,
    subcategory: formData.category !== 'shoeCleaning' ? (formData.subcategory || undefined) : undefined,
    isActive: formData.isActive,
    includes: isSmartPass ? splitCommaList(formData.includesText) : undefined,
    excludedItems: isSmartPass ? splitCommaList(formData.excludedItemsText) : undefined,
    validityDays: isSmartPass ? formData.validityDays : undefined,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      await createClothType(toDto());
      closeModal();
    } catch (err) {
      // error shown via store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (clothType: ClothType) => {
    setSelectedClothType(clothType);
    setFormData({
      name: clothType.name,
      instantRate: clothType.instantRate,
      scheduledRate: clothType.scheduledRate,
      discountInstantRate: clothType.discountInstantRate,
      discountScheduledRate: clothType.discountScheduledRate,
      description: clothType.description || '',
      category: clothType.category || '',
      subcategory: clothType.subcategory || '',
      isActive: clothType.isActive,
      includesText: (clothType.includes || []).join(', '),
      excludedItemsText: (clothType.excludedItems || []).join(', '),
      validityDays: clothType.validityDays,
    });
    setShowDiscount(clothType.discountInstantRate != null || clothType.discountScheduledRate != null);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClothType || !isFormValid()) return;

    setIsSubmitting(true);
    try {
      await updateClothType(selectedClothType._id, toDto());
      closeModal();
    } catch (err) {
      // error shown via store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (clothType: ClothType) => {
    setSelectedClothType(clothType);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedClothType) return;

    setIsSubmitting(true);
    try {
      await deleteClothType(selectedClothType._id);
      setIsDeleteModalOpen(false);
      setSelectedClothType(null);
    } catch (err) {
      // error shown via store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (clothType: ClothType) => {
    try {
      await updateClothType(clothType._id, { isActive: !clothType.isActive });
    } catch (err) {
      // error shown via store
    }
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedClothType(null);
    setFormData(emptyFormData);
    setShowDiscount(false);
  };

  const discountInstantInvalid =
    showDiscount && formData.discountInstantRate != null && formData.discountInstantRate >= formData.instantRate;
  const discountScheduledInvalid =
    showDiscount && formData.discountScheduledRate != null && formData.discountScheduledRate >= formData.scheduledRate;

  const renderFormFields = (idSuffix: string) => (
    <>
      <div>
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Name *</label>
        <input
          type="text"
          required
          placeholder="e.g. Shirt"
          className="input-premium"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
          <select
            className="input-premium"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as ClothTypeCategory | '' })}
          >
            <option value="">Select category</option>
            {(Object.keys(CATEGORY_LABELS) as ClothTypeCategory[]).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        {formData.category !== 'shoeCleaning' && (
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subcategory</label>
            <select
              className="input-premium"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value as ClothTypeSubcategory | '' })}
            >
              <option value="">Select subcategory</option>
              {(Object.keys(SUBCATEGORY_LABELS) as ClothTypeSubcategory[]).map((sub) => (
                <option key={sub} value={sub}>{SUBCATEGORY_LABELS[sub]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Instant Rate (₹){!isSmartPass && ' *'}
          </label>
          <input
            type="number"
            required={!isSmartPass}
            min={isSmartPass ? '0' : '0.01'}
            step="0.01"
            placeholder={isSmartPass ? 'Not applicable' : 'e.g. 20.00'}
            className="input-premium"
            value={formData.instantRate}
            onChange={(e) => setFormData({ ...formData, instantRate: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Scheduled Rate (₹){!isSmartPass && ' *'}
          </label>
          <input
            type="number"
            required={!isSmartPass}
            min={isSmartPass ? '0' : '0.01'}
            step="0.01"
            placeholder={isSmartPass ? 'Not applicable' : 'e.g. 16.00'}
            className="input-premium"
            value={formData.scheduledRate}
            onChange={(e) => setFormData({ ...formData, scheduledRate: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      {isSmartPass && (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Smart Pass Details</label>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Includes (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Wash & Fold, Wash & Iron, Ironing"
              className="input-premium"
              value={formData.includesText}
              onChange={(e) => setFormData({ ...formData, includesText: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Excluded Items (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Blazer, Jacket, Saree"
              className="input-premium"
              value={formData.excludedItemsText}
              onChange={(e) => setFormData({ ...formData, excludedItemsText: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Validity (days)</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 30"
              className="input-premium"
              value={formData.validityDays ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                validityDays: e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 0,
              })}
            />
          </div>
        </div>
      )}

      {!showDiscount ? (
        <button
          type="button"
          onClick={() => setShowDiscount(true)}
          className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          + Add discount pricing
        </button>
      ) : (
        <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Discount Pricing</label>
            <button
              type="button"
              onClick={() => {
                setShowDiscount(false);
                setFormData({ ...formData, discountInstantRate: undefined, discountScheduledRate: undefined });
              }}
              className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Discount Instant (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                className="input-premium"
                value={formData.discountInstantRate ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  discountInstantRate: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0,
                })}
              />
              {discountInstantInvalid && (
                <p className="text-xs text-red-500 mt-1 font-semibold">Must be less than the instant rate</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Discount Scheduled (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                className="input-premium"
                value={formData.discountScheduledRate ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  discountScheduledRate: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0,
                })}
              />
              {discountScheduledInvalid && (
                <p className="text-xs text-red-500 mt-1 font-semibold">Must be less than the scheduled rate</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
        <textarea
          placeholder="Optional description..."
          className="input-premium h-20 resize-none"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id={`isActive-${idSuffix}`}
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor={`isActive-${idSuffix}`} className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Active (available for orders)
        </label>
      </div>
    </>
  );

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Cloth Types</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage cloth types and pricing for itemized orders</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              placeholder="Search cloth types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full md:w-64 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
            />
          </div>
          <button
            className="btn-premium whitespace-nowrap"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={20} />
            <span>Add Cloth Type</span>
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

      {/* Table */}
      <div className="premium-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Rates</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {isLoading && clothTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching Cloth Types...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredClothTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-full">
                        <Package size={48} className="text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">No cloth types found</h3>
                      <p className="text-slate-500 max-w-xs mx-auto">
                        {searchTerm ? 'No results match your search.' : 'Create cloth types to use in itemized orders.'}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="btn-ghost mt-2"
                        >
                          Create Cloth Type
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClothTypes.map((clothType) => (
                  <tr key={clothType._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{clothType.name}</p>
                        {clothType.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{clothType.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {clothType.category ? CATEGORY_LABELS[clothType.category] : '—'}
                      </p>
                      {clothType.subcategory && (
                        <p className="text-xs text-slate-400">{SUBCATEGORY_LABELS[clothType.subcategory]}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <RateCell label="Instant" rate={clothType.instantRate} discountRate={clothType.discountInstantRate} />
                      <RateCell label="Scheduled" rate={clothType.scheduledRate} discountRate={clothType.discountScheduledRate} />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          clothType.isActive
                            ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {clothType.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(clothType)}
                          className={`p-2 rounded-lg transition-colors ${
                            clothType.isActive
                              ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'
                          }`}
                          title={clothType.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(clothType)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(clothType)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create Cloth Type</h2>
                  <p className="text-slate-500 text-sm mt-1">Add a new cloth type for itemized orders</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                {renderFormFields('create')}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 btn-ghost"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-premium justify-center"
                    disabled={isSubmitting || !isFormValid()}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </span>
                    ) : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedClothType && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Edit Cloth Type</h2>
                  <p className="text-slate-500 text-sm mt-1">Update cloth type details</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                {renderFormFields('edit')}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 btn-ghost"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-premium justify-center"
                    disabled={isSubmitting || !isFormValid()}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Updating...
                      </span>
                    ) : 'Update'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && selectedClothType && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Delete Cloth Type</h2>
                  <p className="text-slate-500 text-sm mt-1">This action cannot be undone</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-slate-700 dark:text-slate-300">
                  Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{selectedClothType.name}</span>?
                </p>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 btn-ghost"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-2xl transition-colors justify-center flex items-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Deleting...
                      </span>
                    ) : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};
