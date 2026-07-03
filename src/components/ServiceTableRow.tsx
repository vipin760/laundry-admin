import React from 'react';
import type { LaundryService } from '../api/servicesApi';
import { Badge } from './Badge';
import { Edit2, Trash2, Clock } from 'lucide-react';

interface ServiceTableRowProps {
  service: LaundryService;
  onEdit: (service: LaundryService) => void;
  onDelete: (id: string) => void;
}

export const ServiceTableRow: React.FC<ServiceTableRowProps> = ({ service, onEdit, onDelete }) => {
  const categoryVariant = (cat: string): 'blue' | 'orange' =>
    cat === 'instant' ? 'blue' : 'orange';

  const getIconStyles = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('iron')) return 'bg-pink-50 dark:bg-pink-500/10 text-pink-500 dark:text-pink-400';
    if (lowerName.includes('dry')) return 'bg-purple-50 dark:bg-purple-500/10 text-purple-500 dark:text-purple-400';
    if (lowerName.includes('shoe')) return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400';
    return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400';
  };

  return (
    <tr className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex items-center">
          <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 transition-transform group-hover:scale-110 ${getIconStyles(service.name)}`}>
             {service.icon ? (
               <img src={service.icon} alt="" className="h-8 w-8 object-contain" />
             ) : (
               <span className="text-xl font-black">{service.name.charAt(0)}</span>
             )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-bold text-slate-900 dark:text-white">{service.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-0.5">{service.description}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-wrap gap-1.5">
          {service.categories && service.categories.length > 0 ? (
            service.categories.map((cat) => (
              <Badge
                key={cat}
                text={cat === 'instant' ? '⚡ Instant' : '🕐 Scheduled'}
                variant={categoryVariant(cat)}
              />
            ))
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">₹{service.price}</div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Clock size={14} className="text-slate-400" />
          {service.duration || '24 - 48 hrs'}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <Badge 
          text={service.isAvailable !== false ? 'Active' : 'Inactive'} 
          variant={service.isAvailable !== false ? 'green' : 'red'} 
          dot 
        />
      </td>
      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
        <div className="flex gap-2">
          <button 
            onClick={() => onEdit(service)}
            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => onDelete(service._id)}
            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};
