import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useServicesStore } from '../store/useServicesStore';
import { useDebounce } from '../hooks/useDebounce';
import { ServiceTableRow } from '../components/ServiceTableRow';
import { Pagination } from '../components/Pagination';
import type { LaundryService } from '../api/servicesApi';

export const ServicesPage: React.FC = () => {
  const { services, total, isLoading, error, fetchServices, addService } = useServicesStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const [page, setPage] = useState(1);
  const limit = 6;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: 100, description: '', category: '', duration: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use debounced search term to avoid calling endpoint on every keystroke
  useEffect(() => {
    fetchServices({ search: debouncedSearchTerm, page, limit });
  }, [debouncedSearchTerm, page, limit, fetchServices]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to page 1 on new search
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addService({ ...newService, price: Number(newService.price) });
      setIsAddModalOpen(false);
      setNewService({ name: '', price: 100, description: '', category: '', duration: '' });
      setPage(1); // Reset to page 1 to see new service
    } catch (err) {
      alert('Failed to add service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const handleEdit = (service: LaundryService) => {
    // Placeholder for edit functionality
    console.log('Edit service', service);
  };

  const handleDelete = (id: string) => {
    // Placeholder for delete functionality
    console.log('Delete service', id);
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 mt-1">Manage all your laundry services</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search here..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
            />
          </div>
          <button className="btn-primary flex items-center gap-2 shadow-md shadow-blue-500/20" onClick={() => setIsAddModalOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            Add New Service
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading && services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading services...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                     <div className="flex flex-col items-center justify-center">
                       <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                       </svg>
                       <h3 className="text-lg font-medium text-gray-900">No services found</h3>
                       <p className="text-gray-500 mt-1">Get started by creating a new service.</p>
                       <button 
                         onClick={() => setIsAddModalOpen(true)}
                         className="mt-4 px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium hover:bg-blue-50"
                       >
                         Add Service
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

      {/* Pagination component handles whether to show itself based on totalItems */}
      {!isLoading && services.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={setPage}
        />
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Service</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wash & Fold"
                  className="input-field"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Price</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="input-field pl-7"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Ironing"
                    className="input-field"
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 24 - 48 hrs"
                  className="input-field"
                  value={newService.duration}
                  onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  required
                  placeholder="Describe the service..."
                  className="input-field"
                  rows={2}
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                ></textarea>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-md shadow-blue-500/30 transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSubmitting ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
