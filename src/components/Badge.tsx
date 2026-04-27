import React from 'react';

type BadgeVariant = 'pink' | 'blue' | 'orange' | 'purple' | 'green' | 'red';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ text, variant = 'blue', dot = false }) => {
  const variants = {
    pink: 'bg-pink-100 text-pink-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${variant === 'green' ? 'bg-green-500' : 'bg-red-500'}`}></span>
      )}
      {text}
    </span>
  );
};
