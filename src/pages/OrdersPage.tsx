import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  OrderStatus,
  ordersApi,
  type Order,
} from '../api/ordersApi';

const statusBadgeStyles: Record<OrderStatus, string> = {
  [OrderStatus.ORDER_PLACED]: 'bg-blue-50 text-blue-700 border-blue-100',
  [OrderStatus.PICKUP_ASSIGNED]:
    'bg-indigo-50 text-indigo-700 border-indigo-100',
  [OrderStatus.PROCESSING]: 'bg-amber-50 text-amber-700 border-amber-100',
  [OrderStatus.OUT_FOR_DELIVERY]:
    'bg-purple-50 text-purple-700 border-purple-100',
  [OrderStatus.COMPLETED]: 'bg-green-50 text-green-700 border-green-100',
  [OrderStatus.CANCELLED]: 'bg-red-50 text-red-700 border-red-100',
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const totals = useMemo(() => {
    return orders.reduce(
      (summary, order) => {
        summary.revenue += order.totalAmount;
        summary[order.status] += 1;
        return summary;
      },
      {
        revenue: 0,
        [OrderStatus.ORDER_PLACED]: 0,
        [OrderStatus.PICKUP_ASSIGNED]: 0,
        [OrderStatus.PROCESSING]: 0,
        [OrderStatus.OUT_FOR_DELIVERY]: 0,
        [OrderStatus.COMPLETED]: 0,
        [OrderStatus.CANCELLED]: 0,
      },
    );
  }, [orders]);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await ordersApi.getOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    const currentOrder = orders.find((order) => order._id === orderId);

    if (!currentOrder || currentOrder.status === status) {
      return;
    }

    setUpdatingOrderId(orderId);
    setError(null);

    try {
      const updatedOrder = await ordersApi.updateOrderStatus(orderId, status);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order._id === orderId ? updatedOrder : order,
        ),
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-500 mt-1">
              Review orders and move them through fulfillment
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 shadow-sm disabled:opacity-60"
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-500">Total orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {orders.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-500">Active orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {totals[OrderStatus.ORDER_PLACED] +
                totals[OrderStatus.PICKUP_ASSIGNED] +
                totals[OrderStatus.PROCESSING] +
                totals[OrderStatus.OUT_FOR_DELIVERY]}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {totals[OrderStatus.COMPLETED]}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-500">Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              INR {totals.revenue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Update
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const isUpdating = updatingOrderId === order._id;

                    return (
                      <tr
                        key={order._id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">
                            #{order._id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(order.createdAt)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700 font-medium">
                            {order.userId}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700">
                            {order.items.length} item
                            {order.items.length === 1 ? '' : 's'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            INR {order.totalAmount.toLocaleString('en-IN')}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${statusBadgeStyles[order.status]}`}
                          >
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(event) =>
                              handleStatusChange(
                                order._id,
                                event.target.value as OrderStatus,
                              )
                            }
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                            disabled={isUpdating}
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {isUpdating && status === order.status
                                  ? 'Updating...'
                                  : ORDER_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
