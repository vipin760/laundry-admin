import React from 'react';
import type { LaundryService } from '../api/servicesApi';
import { Badge } from './Badge';

interface ServiceTableRowProps {
  service: LaundryService;
  onEdit: (service: LaundryService) => void;
  onDelete: (id: string) => void;
}

export const ServiceTableRow: React.FC<ServiceTableRowProps> = ({ service, onEdit, onDelete }) => {
  // Determine badge color based on category text (mock logic to match image)
  const getCategoryColor = (category?: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('iron')) return 'pink';
    if (cat.includes('dry')) return 'purple';
    if (cat.includes('shoe')) return 'green';
    if (cat.includes('home') || cat.includes('blanket')) return 'pink';
    if (cat.includes('wash & iron')) return 'orange';
    return 'blue';
  };

  // Mock icon logic based on name to match image
  const getIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('iron')) return 'bg-pink-50 text-pink-500';
    if (lowerName.includes('dry')) return 'bg-purple-50 text-purple-500';
    if (lowerName.includes('shoe')) return 'bg-green-50 text-green-500';
    return 'bg-blue-50 text-blue-500';
  };

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center shadow-sm border border-gray-100 ${getIcon(service.name)}`}>
             {/* Using a placeholder SVG or just first letter if icon is empty */}
             {service.icon ? (
               <img src={service.icon} alt="" className="h-8 w-8 object-contain" />
             ) : (
               <span className="text-xl font-bold">{service.name.charAt(0)}</span>
             )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-semibold text-gray-900">{service.name}</div>
            <div className="text-sm text-gray-500 truncate max-w-[200px]">{service.description}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge text={service.category || 'Wash & Fold'} variant={getCategoryColor(service.category)} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-blue-600">₹{service.price}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {service.duration || '24 - 48 hrs'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge text={service.isActive !== false ? 'Active' : 'Inactive'} variant={service.isActive !== false ? 'green' : 'red'} dot />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex gap-2">
          <button 
            onClick={() => onEdit(service)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
          </button>
          <button 
            onClick={() => onDelete(service._id)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  );
};
