import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { Loader2, ArrowLeft } from 'lucide-react';
import {
  couponApi,
  type CouponDiscountType,
  type CouponStatus,
} from '../api/couponApi';

interface FormState {
  couponCode: string;
  couponName: string;
  discountType: CouponDiscountType;
  discountValue: string;
  minimumOrderAmount: string;
  maximumDiscount: string;
  usagePerUser: string;
  totalUsageLimit: string;
  startDate: string;
  expiryDate: string;
  status: CouponStatus;
  description: string;
}

const EMPTY_FORM: FormState = {
  couponCode: '',
  couponName: '',
  discountType: 'fixed',
  discountValue: '',
  minimumOrderAmount: '',
  maximumDiscount: '',
  usagePerUser: '1',
  totalUsageLimit: '',
  startDate: '',
  expiryDate: '',
  status: 'active',
  description: '',
};

/** Converts an ISO date string to a yyyy-mm-dd value for <input type="date">. */
const toDateInput = (iso?: string): string => (iso ? iso.slice(0, 10) : '');

export const CouponFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    couponApi
      .getById(id)
      .then((c) =>
        setForm({
          couponCode: c.couponCode,
          couponName: c.couponName,
          discountType: c.discountType,
          discountValue: String(c.discountValue),
          minimumOrderAmount: c.minimumOrderAmount != null ? String(c.minimumOrderAmount) : '',
          maximumDiscount: c.maximumDiscount != null ? String(c.maximumDiscount) : '',
          usagePerUser: String(c.usagePerUser ?? 1),
          totalUsageLimit: c.totalUsageLimit != null ? String(c.totalUsageLimit) : '',
          startDate: toDateInput(c.startDate),
          expiryDate: toDateInput(c.expiryDate),
          status: c.status,
          description: c.description ?? '',
        }),
      )
      .catch((e) => setLoadError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    // Editing any field invalidates the last submit attempt's result —
    // otherwise a stale "code already exists" error keeps showing even
    // after the user has changed the code to something else.
    setApiError(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  /** Client-side validation mirroring the backend's CreateCouponDto / business rules. */
  const validationError = useMemo(() => {
    if (!isEdit) {
      if (!form.couponCode.trim() || form.couponCode.trim().length < 3) {
        return 'Coupon code must be at least 3 characters';
      }
      if (!/^[A-Za-z0-9_-]+$/.test(form.couponCode.trim())) {
        return 'Coupon code may only contain letters, numbers, hyphens and underscores';
      }
    }
    if (!form.couponName.trim() || form.couponName.trim().length < 2) {
      return 'Coupon name must be at least 2 characters';
    }
    const discountValue = Number(form.discountValue);
    if (!form.discountValue || Number.isNaN(discountValue) || discountValue <= 0) {
      return 'Discount value must be greater than 0';
    }
    if (form.discountType === 'percentage' && discountValue > 100) {
      return 'Percentage discount cannot exceed 100';
    }
    if (form.minimumOrderAmount && Number(form.minimumOrderAmount) < 0) {
      return 'Minimum order amount cannot be negative';
    }
    if (form.maximumDiscount && Number(form.maximumDiscount) < 0) {
      return 'Maximum discount cannot be negative';
    }
    if (form.usagePerUser && (!Number.isInteger(Number(form.usagePerUser)) || Number(form.usagePerUser) < 1)) {
      return 'Usage per user must be a whole number of at least 1';
    }
    if (
      form.totalUsageLimit &&
      (!Number.isInteger(Number(form.totalUsageLimit)) || Number(form.totalUsageLimit) < 1)
    ) {
      return 'Total usage limit must be a whole number of at least 1';
    }
    if (!form.startDate) return 'Start date is required';
    if (!form.expiryDate) return 'Expiry date is required';
    if (new Date(form.expiryDate) <= new Date(form.startDate)) {
      return 'Expiry date must be after the start date';
    }
    return null;
  }, [form, isEdit]);

  const save = async () => {
    if (validationError) return;
    setSaving(true);
    setApiError(null);
    try {
      const startDateIso = new Date(form.startDate).toISOString();
      const expiryDateIso = new Date(form.expiryDate).toISOString();

      if (isEdit && id) {
        await couponApi.update(id, {
          couponName: form.couponName.trim(),
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minimumOrderAmount: form.minimumOrderAmount ? Number(form.minimumOrderAmount) : undefined,
          maximumDiscount:
            form.discountType === 'percentage' && form.maximumDiscount
              ? Number(form.maximumDiscount)
              : undefined,
          usagePerUser: form.usagePerUser ? Number(form.usagePerUser) : undefined,
          totalUsageLimit: form.totalUsageLimit ? Number(form.totalUsageLimit) : undefined,
          startDate: startDateIso,
          expiryDate: expiryDateIso,
          status: form.status,
          description: form.description || undefined,
        });
        navigate(`/coupons/${id}`);
      } else {
        const created = await couponApi.create({
          couponCode: form.couponCode.trim(),
          couponName: form.couponName.trim(),
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minimumOrderAmount: form.minimumOrderAmount ? Number(form.minimumOrderAmount) : undefined,
          maximumDiscount:
            form.discountType === 'percentage' && form.maximumDiscount
              ? Number(form.maximumDiscount)
              : undefined,
          usagePerUser: form.usagePerUser ? Number(form.usagePerUser) : undefined,
          totalUsageLimit: form.totalUsageLimit ? Number(form.totalUsageLimit) : undefined,
          startDate: startDateIso,
          expiryDate: expiryDateIso,
          status: form.status,
          description: form.description || undefined,
        });
        navigate(`/coupons/${created.id}`);
      }
    } catch (e) {
      setApiError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/coupons')}
            className="p-2 rounded-lg border text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Coupon' : 'New Coupon'}</h1>
        </div>

        <div className="bg-white rounded-xl border p-6">
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : loadError ? (
            <p className="text-sm text-red-600">Failed to load coupon: {loadError}</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs text-gray-600">Coupon Code</span>
                  <input
                    value={form.couponCode}
                    disabled={isEdit}
                    onChange={(e) => set('couponCode', e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME50"
                    className="w-full border rounded px-3 py-2 text-sm mt-1 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  {isEdit && (
                    <span className="text-[11px] text-gray-400">Coupon code cannot be changed after creation</span>
                  )}
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">Coupon Name</span>
                  <input
                    value={form.couponName}
                    onChange={(e) => set('couponName', e.target.value)}
                    placeholder="e.g. Missed Cashback Compensation"
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label className="block">
                  <span className="text-xs text-gray-600">Discount Type</span>
                  <select
                    value={form.discountType}
                    onChange={(e) => set('discountType', e.target.value as CouponDiscountType)}
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  >
                    <option value="fixed">Fixed amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">
                    Discount Value {form.discountType === 'percentage' ? '(%)' : '(₹)'}
                  </span>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={form.discountValue}
                    onChange={(e) => set('discountValue', e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  />
                </label>
                {form.discountType === 'percentage' && (
                  <label className="block">
                    <span className="text-xs text-gray-600">Maximum Discount (₹)</span>
                    <input
                      type="number"
                      min={0}
                      value={form.maximumDiscount}
                      onChange={(e) => set('maximumDiscount', e.target.value)}
                      placeholder="No cap"
                      className="w-full border rounded px-3 py-2 text-sm mt-1"
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label className="block">
                  <span className="text-xs text-gray-600">Minimum Order Amount (₹)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.minimumOrderAmount}
                    onChange={(e) => set('minimumOrderAmount', e.target.value)}
                    placeholder="0"
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">Usage Per User</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.usagePerUser}
                    onChange={(e) => set('usagePerUser', e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">Total Usage Limit</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.totalUsageLimit}
                    onChange={(e) => set('totalUsageLimit', e.target.value)}
                    placeholder="Unlimited"
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <label className="block">
                  <span className="text-xs text-gray-600">Start Date</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set('startDate', e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">Expiry Date</span>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => set('expiryDate', e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">Status</span>
                  <select
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as CouponStatus)}
                    className="w-full border rounded px-3 py-2 text-sm mt-1"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-gray-600">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Internal note about why this coupon exists (optional)"
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                />
              </label>

              {(validationError || apiError) && (
                <p className="text-sm text-red-600">{apiError || validationError}</p>
              )}
            </div>
          )}
        </div>

        {!loading && !loadError && (
          <div className="flex justify-end gap-2">
            <button onClick={() => navigate('/coupons')} className="px-4 py-2 border rounded-lg text-sm">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || Boolean(validationError)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
