import React from 'react';

type BadgeVariant = 'pink' | 'blue' | 'orange' | 'purple' | 'green' | 'red';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'blue', dot = false }) => {
  const variants = {
    pink: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    green: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  };

  const dotColors = {
    pink: 'bg-pink-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-tight ${variants[variant]}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${dotColors[variant]}`}></span>
      )}
      {text}
    </span>
  );
};
