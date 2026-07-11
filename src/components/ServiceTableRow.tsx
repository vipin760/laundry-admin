import React from 'react';
import type { LaundryService } from '../api/servicesApi';
import { Badge } from './Badge';
import { Edit2, Trash2, RotateCcw, Clock, Star } from 'lucide-react';

interface ServiceTableRowProps {
  service: LaundryService;
  onEdit: (service: LaundryService) => void;
  onDeactivateClick: (service: LaundryService) => void;
  onReactivate: (service: LaundryService) => void;
  onTogglePopular: (service: LaundryService) => void;
  onSetPopularOrder: (service: LaundryService, order: number) => void;
}

export const ServiceTableRow: React.FC<ServiceTableRowProps> = ({ service, onEdit, onDeactivateClick, onReactivate, onTogglePopular, onSetPopularOrder }) => {
  const isAvailable = service.isAvailable !== false;
  const categoryVariant = (cat: string): 'blue' | 'orange' =>
    cat === 'instant' ? 'blue' : 'orange';

  const cats = service.categories ?? [];
  const durations = [
    cats.includes('instant') && (service.instantDuration || `${service.instantTurnaroundMinutes ?? 90}m delivery`),
    cats.includes('scheduled') && (service.scheduledDuration || `${service.turnaroundHours ?? 24}h delivery`),
  ].filter(Boolean) as string[];
  const durationText = durations.length > 0 ? durations.join(' · ') : '—';

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
          <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 transition-transform group-hover:scale-110 overflow-hidden ${getIconStyles(service.name)}`}>
             {service.imageUrl || service.icon ? (
               <img src={service.imageUrl || service.icon} alt="" className="h-full w-full object-cover" />
             ) : (
               <span className="text-xl font-black">{service.name.charAt(0)}</span>
             )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-bold text-slate-900 dark:text-white">{service.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-0.5">
              {service.instantDescription || service.scheduledDescription}
            </div>
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
          {durationText}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <Badge
          text={isAvailable ? 'Active' : 'Inactive'}
          variant={isAvailable ? 'green' : 'red'}
          dot
        />
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTogglePopular(service)}
            title={service.isPopular ? 'Remove from Popular row' : 'Show in Popular row (max 3)'}
            className={`p-2 rounded-xl transition-all border ${
              service.isPopular
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                : 'text-slate-300 border-transparent hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'
            }`}
          >
            <Star size={16} fill={service.isPopular ? 'currentColor' : 'none'} />
          </button>
          {service.isPopular && (
            <select
              value={service.popularOrder ?? 1}
              onChange={(e) => onSetPopularOrder(service, Number(e.target.value))}
              title="Card position on the home page"
              className="text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value={1}>1st</option>
              <option value={2}>2nd</option>
              <option value={3}>3rd</option>
            </select>
          )}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(service)}
            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
          >
            <Edit2 size={16} />
          </button>
          {isAvailable ? (
            <button
              onClick={() => onDeactivateClick(service)}
              title="Deactivate (hide from customer app)"
              className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
            >
              <Trash2 size={16} />
            </button>
          ) : (
            <button
              onClick={() => onReactivate(service)}
              title="Reactivate"
              className="p-2 text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-xl transition-all border border-transparent hover:border-green-100 dark:hover:border-green-500/20"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
