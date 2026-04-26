import React from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Users', value: '1,234', icon: '👥' },
    { label: 'Active Services', value: '42', icon: '⚡' },
    { label: 'Revenue', value: '$12,450', icon: '💰' },
    { label: 'Growth', value: '+23%', icon: '📈' },
  ];

  return (
    <AdminLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.email.split('@')[0]}! 👋
        </h1>
        <p className="text-gray-600">Here's what's happening with your business today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className="text-4xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Trend</h2>
          <div className="h-64 flex items-end justify-around gap-2">
            {[30, 45, 60, 40, 70, 85, 65].map((height, i) => (
              <div
                key={i}
                className="w-8 bg-blue-500 rounded-t"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full btn-secondary text-left">
              ✏️ Create New Service
            </button>
            <button className="w-full btn-secondary text-left">
              👤 Add New User
            </button>
            <button className="w-full btn-secondary text-left">
              📊 Generate Report
            </button>
            <button className="w-full btn-secondary text-left">
              ⚙️ System Settings
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { activity: 'New user registered', time: '2 hours ago' },
            { activity: 'Service deployed successfully', time: '5 hours ago' },
            { activity: 'System backup completed', time: '1 day ago' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-200">
              <p className="text-gray-700">{item.activity}</p>
              <span className="text-sm text-gray-500">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
