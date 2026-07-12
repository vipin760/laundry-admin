import React, { useEffect, useRef, useState, useMemo } from 'react';

import { io } from 'socket.io-client';

import { AdminLayout } from '../layouts/AdminLayout';

import { useOrdersStore } from '../store/useOrdersStore';

import { supportSocketUrl } from '../api/supportApi';

import {

  Search, Loader2, PackageX, ChevronLeft, ChevronRight,

  X, Truck, Package, CheckCircle2, Clock, AlertCircle,

  Phone, User, Scale, Receipt, ShieldCheck, Filter,

  ArrowUpDown, ArrowUp, ArrowDown, CreditCard, KeyRound, Printer,

} from 'lucide-react';

import { printOrder } from '../utils/printOrder';

import type { Order, OrderStatus, DeliveryType, SortField, SortDir, UpdateStatusPayload } from '../api/ordersApi';

import type { ClothType } from '../api/clothTypesApi';

import { CATEGORY_LABELS, CATEGORY_ORDER } from '../constants/clothTypeCategories';

import { STATUS_LABELS, getNextStatus, ordersApi } from '../api/ordersApi';

import { usersApi, type User as AppUser } from '../api/usersApi';

import { OrderPhotoManager } from '../components/OrderPhotoManager';



// ── Status badge ──────────────────────────────────────────────────────────────



const STATUS_STYLE: Record<OrderStatus, string> = {

  ORDER_PLACED:     'bg-blue-50  text-blue-700  border-blue-200',

  PICKUP_ASSIGNED:  'bg-violet-50 text-violet-700 border-violet-200',

  ITEMIZED:         'bg-amber-50 text-amber-700  border-amber-200',

  PROCESSING:       'bg-cyan-50  text-cyan-700   border-cyan-200',

  OUT_FOR_DELIVERY: 'bg-orange-50 text-orange-700 border-orange-200',

  READY_FOR_PICKUP: 'bg-orange-50 text-orange-700 border-orange-200',

  COMPLETED:        'bg-green-50 text-green-700  border-green-200',

  CANCELLED:        'bg-red-50   text-red-600    border-red-200',

};



const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (

  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_STYLE[status] ?? ''}`}>

    {STATUS_LABELS[status] ?? status}

  </span>

);



// ── Tracking stepper ──────────────────────────────────────────────────────────



const STEPS: { key: OrderStatus; label: string }[] = [

  { key: 'ORDER_PLACED',     label: 'Confirmed' },

  { key: 'PICKUP_ASSIGNED',  label: 'Pickup'    },

  { key: 'ITEMIZED',         label: 'Itemized'  },

  { key: 'PROCESSING',       label: 'Brewing'   },

  { key: 'OUT_FOR_DELIVERY', label: 'Delivering'},

  { key: 'COMPLETED',        label: 'Delivered' },

];



// Self-pickup orders never reach OUT_FOR_DELIVERY — step 5 becomes "Ready
// for Pickup" and the final label reads "Picked Up" instead of "Delivered".
const SELF_PICKUP_STEPS: { key: OrderStatus; label: string }[] = [

  { key: 'ORDER_PLACED',     label: 'Confirmed' },

  { key: 'PICKUP_ASSIGNED',  label: 'Pickup'    },

  { key: 'ITEMIZED',         label: 'Itemized'  },

  { key: 'PROCESSING',       label: 'Brewing'   },

  { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },

  { key: 'COMPLETED',        label: 'Picked Up' },

];



const STEP_INDEX: Partial<Record<OrderStatus, number>> = {

  ORDER_PLACED: 0, PICKUP_ASSIGNED: 1, ITEMIZED: 2,

  PROCESSING: 3, OUT_FOR_DELIVERY: 4, READY_FOR_PICKUP: 4, COMPLETED: 5,

};



const TrackingStepper: React.FC<{ status: OrderStatus; deliveryType?: DeliveryType }> = ({ status, deliveryType }) => {

  const current = STEP_INDEX[status] ?? 0;

  const steps = deliveryType === 'SELF_PICKUP' ? SELF_PICKUP_STEPS : STEPS;

  return (

    <div className="flex items-center gap-0 w-full mb-6">

      {steps.map((step, i) => {

        const done   = i < current;

        const active = i === current;

        return (

          <React.Fragment key={step.key}>

            <div className="flex flex-col items-center gap-1 flex-shrink-0">

              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all

                ${done   ? 'bg-blue-600 border-blue-600 text-white' :

                  active ? 'bg-white border-blue-600 text-blue-600' :

                           'bg-white border-slate-200 text-slate-400'}`}>

                {done ? <CheckCircle2 size={16} /> : i + 1}

              </div>

              <span className={`text-[9px] font-semibold whitespace-nowrap

                ${active ? 'text-blue-600' : done ? 'text-blue-500' : 'text-slate-400'}`}>

                {step.label}

              </span>

            </div>

            {i < steps.length - 1 && (

              <div className={`flex-1 h-0.5 mx-0.5 mb-5 ${i < current ? 'bg-blue-600' : 'bg-slate-200'}`} />

            )}

          </React.Fragment>

        );

      })}

    </div>

  );

};



// ── Detail panel ──────────────────────────────────────────────────────────────



interface UpdateForm {

  driverName:  string;

  driverPhone: string;

  weightKg:    string;

  itemCount:   string;

  billAmount:  string;

  overrideAmount: boolean;

  pickupTime:  string;

  deliveryPartnerId: string;

  otp:         string;

  clothTypeBreakdown: {
    clothTypeId: string;
    quantity: string;
    serviceType: 'instant' | 'scheduled' | '';
  }[];

}



const OrderDetailPanel: React.FC<{

  order: Order;

  onClose: () => void;

  onUpdated: () => void;

  onOrderChange: (o: Order) => void;

}> = ({ order, onClose, onUpdated, onOrderChange }) => {

  const { updateStatus } = useOrdersStore();

  const nextStatus = getNextStatus(order);

  // Which service type(s) this order was actually placed under. The cart
  // enforces one type per order, but older/seeded orders can carry mixed
  // categories, so we surface all of them and only auto-fill when unambiguous.
  const orderCategories = useMemo(() => {
    const set = new Set((order.items ?? []).map((i) => i.category ?? 'instant'));
    return Array.from(set) as ('instant' | 'scheduled')[];
  }, [order.items]);
  const defaultServiceType: 'instant' | 'scheduled' | '' =
    orderCategories.length === 1 ? orderCategories[0] : '';

  const [form, setForm] = useState<UpdateForm>({

    driverName:  order.driverName  ?? '',

    driverPhone: order.driverPhone ?? '',

    weightKg:    order.weightKg    != null ? String(order.weightKg)  : '',

    itemCount:   order.itemCount   != null ? String(order.itemCount) : '',

    billAmount:  order.billAmount  != null ? String(order.billAmount): '',

    overrideAmount: false,

    pickupTime:  order.pickupTime  ?? '',

    deliveryPartnerId: order.deliveryPartnerId ?? '',

    otp:         '',

    clothTypeBreakdown: order.clothTypeBreakdown?.map(item => ({

      clothTypeId: item.clothTypeId,

      quantity: String(item.quantity),

      serviceType: item.serviceType ?? defaultServiceType,

    })) || [],

  });

  const [saving, setSaving] = useState(false);

  const [err, setErr]       = useState<string | null>(null);



  // Delivery partners — loaded only when the dispatch step needs them

  const [partners, setPartners] = useState<AppUser[]>([]);

  const [partnersLoading, setPartnersLoading] = useState(false);

  useEffect(() => {

    if (nextStatus !== 'OUT_FOR_DELIVERY') return;

    setPartnersLoading(true);

    usersApi.getUsers()

      .then((users) => setPartners(users.filter((u) => u.role === 'delivery_partner' && u.isActive)))

      .catch(() => setPartners([]))

      .finally(() => setPartnersLoading(false));

  }, [nextStatus]);



  // Cloth types — loaded only when ITEMIZED step needs them

  const [clothTypes, setClothTypes] = useState<ClothType[]>([]);

  useEffect(() => {

    if (nextStatus !== 'ITEMIZED') return;

    ordersApi.getClothTypes()

      .then(types => setClothTypes(types.filter(t => t.isActive)))

      .catch(() => setClothTypes([]));

  }, [nextStatus]);

  // Group cloth types by service category so identically-named items from
  // different services (e.g. "Shirt" under Ironing vs Wash & Fold) are
  // distinguishable when itemizing an order.
  const clothTypesByCategory = useMemo(() => {
    const groups = new Map<string, ClothType[]>();
    for (const category of CATEGORY_ORDER) groups.set(category, []);
    const uncategorized: ClothType[] = [];
    for (const c of clothTypes) {
      if (c.category) groups.get(c.category)?.push(c);
      else uncategorized.push(c);
    }
    if (uncategorized.length > 0) groups.set('uncategorized', uncategorized);
    return groups;
  }, [clothTypes]);

  const clothTypeLabel = (c: ClothType) =>
    c.category ? `${c.name} — ${CATEGORY_LABELS[c.category]}` : c.name;

  const set = (k: keyof UpdateForm, v: string) =>

    setForm((f) => ({ ...f, [k]: v }));



  // Rate this cloth type bills at for the given service type, preferring a
  // discount rate when one is set. Mirrors orders.service.ts on the backend.
  const getEffectiveRate = (clothType: ClothType | undefined, serviceType: 'instant' | 'scheduled' | ''): number => {
    if (!clothType || !serviceType) return 0;
    if (serviceType === 'scheduled') return clothType.discountScheduledRate ?? clothType.scheduledRate;
    return clothType.discountInstantRate ?? clothType.instantRate;
  };

  const hasBreakdown = form.clothTypeBreakdown.length > 0;

  const calculatedTotal = useMemo(
    () => form.clothTypeBreakdown.reduce((sum, item) => {
      const clothType = clothTypes.find(c => c._id === item.clothTypeId);
      return sum + (parseFloat(item.quantity || '0') * getEffectiveRate(clothType, item.serviceType));
    }, 0),
    [form.clothTypeBreakdown, clothTypes],
  );

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateForm = (): string | null => {

    if (nextStatus === 'ITEMIZED') {

      if (hasBreakdown) {
        for (const item of form.clothTypeBreakdown) {
          if (!item.clothTypeId) return 'Please select a cloth type for all items.';
          if (!item.quantity || parseFloat(item.quantity) < 1) return 'Quantity must be at least 1.';
          if (!item.serviceType) return 'Please choose Instant or Scheduled for every cloth item.';
        }
        if (form.overrideAmount && (!form.billAmount || parseFloat(form.billAmount) <= 0))
          return 'Override amount must be greater than 0.';
      } else {
        if (!form.billAmount || parseFloat(form.billAmount) <= 0)

          return 'Bill amount is required and must be greater than 0.';
      }

    }

    if (nextStatus === 'OUT_FOR_DELIVERY') {

      if (!form.deliveryPartnerId)

        return 'Please assign a delivery partner before dispatching.';

    }

    if (nextStatus === 'COMPLETED') {

      if (!form.otp.trim()) return 'Please enter the 4-digit OTP to confirm delivery.';

      if (form.otp.trim().length !== 4) return 'OTP must be exactly 4 digits.';

    }

    return null;

  };



  const handleAdvance = async () => {

    if (!nextStatus) return;

    const validationErr = validateForm();

    if (validationErr) { setErr(validationErr); return; }



    setSaving(true); setErr(null);

    try {

      const payload: UpdateStatusPayload = { status: nextStatus };

      if (nextStatus === 'PICKUP_ASSIGNED') {

        payload.driverName  = form.driverName;

        payload.driverPhone = form.driverPhone;

      }

      if (nextStatus === 'ITEMIZED') {

        if (hasBreakdown) {
          payload.clothTypeBreakdown = form.clothTypeBreakdown.map(item => ({
            clothTypeId: item.clothTypeId,
            quantity: parseInt(item.quantity) || 0,
          }));
          // Send a manual bill only when overriding; otherwise the backend
          // uses the calculated amount from the breakdown.
          if (form.overrideAmount && form.billAmount)
            payload.billAmount = parseFloat(form.billAmount);
        } else {
          payload.billAmount = parseFloat(form.billAmount);
        }

        if (form.pickupTime || order.pickupTime)
          payload.pickupTime = form.pickupTime || order.pickupTime;

        if (form.weightKg)  payload.weightKg  = parseFloat(form.weightKg);

        if (form.itemCount) payload.itemCount  = parseInt(form.itemCount);

        if (form.clothTypeBreakdown.length > 0) {
          payload.clothTypeBreakdown = form.clothTypeBreakdown.map(item => ({
            clothTypeId: item.clothTypeId,
            quantity: parseInt(item.quantity) || 0,
            serviceType: item.serviceType || undefined,
          }));
        }

      }

      if (nextStatus === 'OUT_FOR_DELIVERY') {

        const partner = partners.find((p) => p._id === form.deliveryPartnerId);

        payload.deliveryPartnerId   = form.deliveryPartnerId;

        payload.deliveryPartnerName = partner?.name;

      }

      if (nextStatus === 'COMPLETED') {

        payload.otp = form.otp.trim();

      }

      await updateStatus(order._id, payload);

      onUpdated();

    } catch (e: any) {

      setErr(e.message ?? 'Something went wrong');

    } finally {

      setSaving(false);

    }

  };



  const pickupDateStr = order.pickupDate

    ? new Date(order.pickupDate).toLocaleDateString('en-IN', {

        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',

      })

    : '—';



  const paymentPending = order.paymentStatus !== 'COMPLETED';



  return (

    <div className="fixed inset-0 z-50 flex">

      {/* Backdrop */}

      <div className="flex-1 bg-black/30" onClick={onClose} />



      {/* Panel */}

      <div className="w-full max-w-md bg-white dark:bg-[#141414] h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}

        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5">

          <div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Order Details</p>

            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">

              #{order.orderNumber ?? order._id.slice(-6).toUpperCase()}

            </p>

          </div>

          <div className="flex items-center gap-2">

            <button onClick={() => printOrder(order)}
              title="Print / download order"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 transition-colors">
              <Printer size={15} className="text-blue-600" />
            </button>

            <button onClick={onClose}

              className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 transition-colors">

              <X size={16} className="text-slate-600 dark:text-slate-300" />

            </button>

          </div>

        </div>



        <div className="flex-1 px-6 py-5 space-y-5">

          {/* Stepper */}

          <TrackingStepper status={order.status} deliveryType={order.deliveryType} />



          {/* Status + payment badges */}

          <div className="flex items-center gap-2 flex-wrap">

            <StatusBadge status={order.status} />

            {paymentPending

              ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-red-50 text-red-600 border-red-200">

                  <CreditCard size={11}/> Payment Pending

                </span>

              : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">

                  <CreditCard size={11}/> Paid

                </span>

            }

            <span className="text-xs text-slate-400">{new Date(order.updatedAt).toLocaleString('en-IN')}</span>

          </div>



          {/* Order info */}

          <div className="rounded-xl border border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">

            {order.customerName && (

              <Row icon={<User size={14} />} label="Customer">

                <span className="text-xs">{order.customerName}</span>

                {order.customerPhone && (

                  <span className="ml-2 text-xs text-slate-400">· {order.customerPhone}</span>

                )}

              </Row>

            )}

            <Row icon={<Package size={14} />} label="Items">

              {order.items.map((i, idx) => (

                <div key={idx} className="flex items-center gap-2 mt-0.5">

                  <span className="text-xs text-slate-600 dark:text-slate-300">

                    {i.serviceName ?? i.name} × {i.quantity}

                  </span>

                  {i.category === 'instant'

                    ? <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-700">⚡ Instant</span>

                    : <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700">🕐 Scheduled</span>

                  }

                </div>

              ))}

            </Row>

            <Row icon={<Receipt size={14} />} label="Amount">

              {order.billAmount

                ? <>

                    <span className="font-black text-green-700">₹{order.billAmount}</span>

                    {order.billAmount !== order.totalAmount && (

                      <span className="ml-2 text-xs text-slate-400 line-through">₹{order.totalAmount}</span>

                    )}

                  </>

                : <span className="text-slate-400 text-xs italic">Pending itemization</span>

              }

            </Row>

            {order.address && (

              <Row icon={<Truck size={14} />} label="Address">

                <span className="text-xs">{order.address}</span>

              </Row>

            )}

            <Row icon={<Package size={14} />} label="Return">

              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                order.deliveryType === 'SELF_PICKUP'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-orange-50 text-orange-700 border-orange-200'
              }`}>
                {order.deliveryType === 'SELF_PICKUP' ? 'Self Pickup' : 'Home Delivery'}
              </span>

              {order.deliveryType !== 'SELF_PICKUP' && order.deliveryAddress && (
                <span className="ml-2 text-xs text-slate-500">
                  {[
                    order.deliveryAddress.houseNo,
                    order.deliveryAddress.buildingName,
                    order.deliveryAddress.street,
                    order.deliveryAddress.area,
                    order.deliveryAddress.city,
                    order.deliveryAddress.pincode,
                  ].filter(Boolean).join(', ')}
                </span>
              )}

            </Row>

            {(order.pickupDate || order.pickupTime) && (

              <Row icon={<Clock size={14} />} label="Pickup">

                {pickupDateStr}

                {(order.pickupSlot || order.pickupTime) && (

                  <span className="ml-2 text-xs text-slate-400">· {order.pickupTime ?? order.pickupSlot}</span>

                )}

              </Row>

            )}

          </div>



          {/* Driver details */}

          {(order.driverName || order.driverPhone) && (

            <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 p-4">

              <p className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-2 uppercase tracking-wide">Driver</p>

              {order.driverName  && <p className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2"><User size={13}/>{order.driverName}</p>}

              {order.driverPhone && <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-1"><Phone size={13}/>{order.driverPhone}</p>}

            </div>

          )}



          {/* Assigned delivery partner */}

          {order.deliveryPartnerName && (

            <div className="rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 p-4">

              <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2 uppercase tracking-wide">Delivery Partner</p>

              <p className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">

                <Truck size={13}/>{order.deliveryPartnerName}

              </p>

            </div>

          )}



          {/* Itemization */}

          {(order.weightKg != null || order.itemCount != null || order.billAmount != null) && (

            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-4">

              <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">Itemization</p>

              <div className="flex gap-6 flex-wrap">

                {order.weightKg  != null && <Stat icon={<Scale size={13}/>}   label="Weight"  value={`${order.weightKg} kg`} />}

                {order.itemCount != null && <Stat icon={<Package size={13}/>}  label="Items"   value={String(order.itemCount)} />}

                {order.billAmount != null && <Stat icon={<Receipt size={13}/>} label="Bill"    value={`₹${order.billAmount}`} color="text-green-700" />}

                {order.pickupTime && <Stat icon={<Clock size={13}/>}           label="Pickup"  value={order.pickupTime} />}

              </div>

            </div>

          )}



          {/* Order photos — findings (damage evidence) + weighing (bill proof) */}

          <OrderPhotoManager

            order={order}

            editable={['PICKUP_ASSIGNED', 'ITEMIZED', 'PROCESSING'].includes(order.status)}

            onOrderChange={onOrderChange}

          />



          {/* Delivery OTP — visible to admin */}

          {order.deliveryOtp && (

            <div className="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4">

              <p className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wide flex items-center gap-2">

                <ShieldCheck size={13}/> Delivery OTP

              </p>

              <div className="flex gap-3 mb-2">

                {order.deliveryOtp.split('').map((d, i) => (

                  <div key={i}

                    className="w-12 h-14 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border-2 border-green-300 text-2xl font-black text-green-700 shadow-sm">

                    {d}

                  </div>

                ))}

              </div>

              <p className="text-xs text-green-600">Share this OTP with the customer to confirm delivery.</p>

            </div>

          )}



          {/* ── Advance status form ─────────────────────────────────────── */}

          {nextStatus && order.status !== 'CANCELLED' && (

            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-4">

              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">

                Advance to: <span className="text-blue-600">{STATUS_LABELS[nextStatus]}</span>

              </p>



              {/* Driver fields */}

              {nextStatus === 'PICKUP_ASSIGNED' && (

                <div className="space-y-3">

                  <Field label="Driver Name" icon={<User size={14}/>}

                    value={form.driverName} onChange={(v) => set('driverName', v)}

                    placeholder="e.g. Rohit Kumar" />

                  <Field label="Driver Phone" icon={<Phone size={14}/>}

                    value={form.driverPhone} onChange={(v) => set('driverPhone', v)}

                    placeholder="+91 98765 43210" />

                </div>

              )}



              {/* Itemization fields — bill + pickup time are REQUIRED */}

              {nextStatus === 'ITEMIZED' && (

                <div className="space-y-3">

                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">

                    ⚠️ Bill amount is mandatory before the user can pay. Pickup time is optional.

                  </p>

                  <div className="grid grid-cols-2 gap-3">

                    <Field label="Weight (kg)" icon={<Scale size={14}/>}

                      value={form.weightKg} onChange={(v) => set('weightKg', v)}

                      placeholder="e.g. 3.2" type="number" />

                    <Field label="Item Count" icon={<Package size={14}/>}

                      value={form.itemCount} onChange={(v) => set('itemCount', v)}

                      placeholder="e.g. 12" type="number" />

                  </div>

                  {/* Cloth Types Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Package size={14}/>Cloth Types
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          clothTypeBreakdown: [...f.clothTypeBreakdown, { clothTypeId: '', quantity: '', serviceType: defaultServiceType }]
                        }))}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        + Add Cloth
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      This order was placed as{' '}
                      <span className="font-semibold">
                        {orderCategories.map(c => (c === 'instant' ? 'Instant' : 'Scheduled')).join(' + ')}
                      </span>
                      {orderCategories.length > 1 && ' — choose the right pricing per cloth item below.'}
                    </p>

                    {form.clothTypeBreakdown.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <select
                          value={item.clothTypeId}
                          onChange={(e) => {
                            setForm(f => {
                              const newBreakdown = [...f.clothTypeBreakdown];
                              newBreakdown[idx] = { ...newBreakdown[idx], clothTypeId: e.target.value };
                              return { ...f, clothTypeBreakdown: newBreakdown };
                            });
                          }}
                          className="flex-1 px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
                        >
                          <option value="">Select cloth type</option>
                          {[...clothTypesByCategory.entries()].map(([category, items]) => {
                            if (items.length === 0) return null;
                            const label = category === 'uncategorized'
                              ? 'Uncategorized'
                              : CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS];
                            return (
                              <optgroup key={category} label={label}>
                                {items.map(c => (
                                  <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>

                        <select
                          value={item.serviceType}
                          onChange={(e) => {
                            setForm(f => {
                              const newBreakdown = [...f.clothTypeBreakdown];
                              newBreakdown[idx] = { ...newBreakdown[idx], serviceType: e.target.value as 'instant' | 'scheduled' | '' };
                              return { ...f, clothTypeBreakdown: newBreakdown };
                            });
                          }}
                          className="w-24 px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
                        >
                          <option value="">Type</option>
                          <option value="instant">Instant</option>
                          <option value="scheduled">Scheduled</option>
                        </select>

                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            setForm(f => {
                              const newBreakdown = [...f.clothTypeBreakdown];
                              newBreakdown[idx] = { ...newBreakdown[idx], quantity: e.target.value };
                              return { ...f, clothTypeBreakdown: newBreakdown };
                            });
                          }}
                          placeholder="Qty"
                          className="w-16 px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setForm(f => ({
                              ...f,
                              clothTypeBreakdown: f.clothTypeBreakdown.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <X size={14}/>
                        </button>
                      </div>
                    ))}

                    {/* Display calculated amounts (frontend calculation for display) */}
                    {form.clothTypeBreakdown.length > 0 && (
                      <div className="text-xs space-y-1 bg-slate-50 dark:bg-white/5 p-2 rounded">
                        {form.clothTypeBreakdown.map((item, idx) => {
                          const clothType = clothTypes.find(c => c._id === item.clothTypeId);
                          const rate = getEffectiveRate(clothType, item.serviceType);
                          const amount = parseFloat(item.quantity || '0') * rate;
                          return (
                            <div key={idx} className="flex justify-between">
                              <span>{clothType ? clothTypeLabel(clothType) : '—'} ({item.serviceType || '—'}): {item.quantity || 0} × ₹{rate}</span>
                              <span className="font-semibold">₹{amount.toFixed(2)}</span>
                            </div>
                          );
                        })}
                        <div className="border-t border-slate-200 dark:border-white/10 pt-1 mt-1 flex justify-between font-bold">
                          <span>Calculated Amount:</span>
                          <span>₹{calculatedTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Override the calculated amount with a manual bill */}
                    {hasBreakdown && (
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.overrideAmount}
                          onChange={(e) =>
                            setForm(f => ({
                              ...f,
                              overrideAmount: e.target.checked,
                              // Prefill the input with the calculated amount when turning override on
                              billAmount: e.target.checked
                                ? (f.billAmount || calculatedTotal.toFixed(2))
                                : f.billAmount,
                            }))
                          }
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Override calculated amount
                      </label>
                    )}

                    {hasBreakdown && !form.overrideAmount && (
                      <p className="text-[11px] text-slate-500">
                        The customer will be charged the calculated amount of{' '}
                        <b className="text-green-700">₹{calculatedTotal.toFixed(2)}</b>.
                      </p>
                    )}
                  </div>

                  {/* Manual bill: required when there's no breakdown, or when overriding */}
                  {(!hasBreakdown || form.overrideAmount) && (
                    <Field label={hasBreakdown ? 'Override Bill Amount (₹) *' : 'Bill Amount (₹) *'} icon={<Receipt size={14}/>}

                      value={form.billAmount} onChange={(v) => set('billAmount', v)}

                      placeholder="e.g. 350" type="number" required />
                  )}

                  <Field label="Pickup Time (optional)" icon={<Clock size={14}/>}

                    value={form.pickupTime} onChange={(v) => set('pickupTime', v)}

                    placeholder={order.pickupTime ?? 'e.g. 10:00 AM – 12:00 PM'} />

                  <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2">

                    📸 Use the photo sections above to attach <b>damage findings</b> (evidence) and the <b>weighing scale</b> photo (bill proof) — the customer sees both in their app.

                  </p>

                </div>

              )}



              {/* PROCESSING → OUT_FOR_DELIVERY: payment must be done + partner assigned */}

              {nextStatus === 'OUT_FOR_DELIVERY' && (

                paymentPending

                  ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 font-semibold">

                      ⚠️ Cannot dispatch — user has not completed payment yet.

                    </div>

                  : <div className="space-y-3">

                      <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-semibold flex items-center gap-1.5">

                        <ShieldCheck size={13}/> Payment confirmed. Delivery OTP is ready.

                      </div>

                      <div>

                        <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">

                          <Truck size={14}/>Delivery Partner<span className="text-red-500">*</span>

                        </label>

                        <select

                          value={form.deliveryPartnerId}

                          onChange={(e) => set('deliveryPartnerId', e.target.value)}

                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-1 focus:ring-blue-500 focus:outline-none"

                        >

                          <option value="">

                            {partnersLoading ? 'Loading partners…' : 'Select a delivery partner'}

                          </option>

                          {partners.map((p) => (

                            <option key={p._id} value={p._id}>

                              {p.name}{p.mobileNumber ? ` · ${p.mobileNumber}` : ''}

                            </option>

                          ))}

                        </select>

                        {!partnersLoading && partners.length === 0 && (

                          <p className="text-[11px] text-amber-600 mt-1">

                            No delivery partners found. Assign the "delivery_partner" role to a user first.

                          </p>

                        )}

                        <p className="text-[11px] text-slate-500 mt-1">

                          The assigned partner sees this order in their app and enters the customer's OTP on handover.

                        </p>

                      </div>

                    </div>

              )}



              {/* PROCESSING → READY_FOR_PICKUP: self-pickup orders — payment must be
                  done, no driver/partner assignment needed. */}

              {nextStatus === 'READY_FOR_PICKUP' && (

                paymentPending

                  ? <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600 font-semibold">

                      ⚠️ Cannot mark ready — user has not completed payment yet.

                    </div>

                  : <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 font-semibold flex items-center gap-1.5">

                      <ShieldCheck size={13}/> Payment confirmed. Delivery OTP is ready — the customer will show it at the counter.

                    </div>

              )}



              {/* OUT_FOR_DELIVERY/READY_FOR_PICKUP → COMPLETED: admin must enter OTP */}

              {nextStatus === 'COMPLETED' && (

                <div className="space-y-2">

                  <p className="text-xs text-slate-500 flex items-center gap-1.5">

                    <KeyRound size={13} className="text-blue-500"/>

                    {order.deliveryType === 'SELF_PICKUP'
                      ? 'Enter the 4-digit OTP the customer shows you at the counter.'
                      : 'Enter the 4-digit OTP from the customer to confirm delivery.'}

                  </p>

                  <Field label="Delivery OTP *" icon={<ShieldCheck size={14}/>}

                    value={form.otp} onChange={(v) => set('otp', v.replace(/\D/g, '').slice(0, 4))}

                    placeholder="e.g. 5823" type="text" required />

                </div>

              )}



              {err && (

                <p className="text-xs text-red-600 flex items-center gap-1.5">

                  <AlertCircle size={13}/>{err}

                </p>

              )}



              {/* Disable OUT_FOR_DELIVERY/READY_FOR_PICKUP advance if payment pending */}

              {!((nextStatus === 'OUT_FOR_DELIVERY' || nextStatus === 'READY_FOR_PICKUP') && paymentPending) && (

                <button onClick={handleAdvance} disabled={saving}

                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">

                  {saving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}

                  {saving ? 'Updating…' : `Mark as ${STATUS_LABELS[nextStatus]}`}

                </button>

              )}

            </div>

          )}



          {order.status === 'COMPLETED' && (

            <div className="rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 p-4 text-center">

              <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2"/>

              <p className="font-bold text-green-700">Order Delivered</p>

              <p className="text-xs text-green-600 mt-1">OTP verified and delivery confirmed.</p>

            </div>

          )}



          {order.status === 'CANCELLED' && (

            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">

              <X size={24} className="text-red-500 mx-auto mb-2"/>

              <p className="font-bold text-red-600">Order Cancelled</p>

            </div>

          )}

        </div>

      </div>

    </div>

  );

};



// ── Small helpers ──────────────────────────────────────────────────────────────



const Row: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (

  <div className="flex items-start gap-3 px-4 py-3">

    <span className="text-slate-400 mt-0.5">{icon}</span>

    <div className="flex-1">

      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>

      <div className="text-sm font-semibold text-slate-800 dark:text-white">{children}</div>

    </div>

  </div>

);



const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; color?: string }> = ({ icon, label, value, color }) => (

  <div className="flex flex-col items-center gap-1">

    <span className="text-amber-600">{icon}</span>

    <p className="text-xs text-slate-500">{label}</p>

    <p className={`text-sm font-black ${color ?? 'text-slate-800 dark:text-white'}`}>{value}</p>

  </div>

);



const Field: React.FC<{

  label: string; icon: React.ReactNode;

  value: string; onChange: (v: string) => void;

  placeholder?: string; type?: string; required?: boolean;

}> = ({ label, icon, value, onChange, placeholder, type = 'text', required }) => (

  <div>

    <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">

      {icon}{label}{required && <span className="text-red-500">*</span>}

    </label>

    <input

      type={type} value={value} onChange={(e) => onChange(e.target.value)}

      placeholder={placeholder}

      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-1 focus:ring-blue-500 focus:outline-none"

    />

  </div>

);



// ── Sort header ───────────────────────────────────────────────────────────────



const SortHeader: React.FC<{

  label: string;

  field: SortField;

  currentField: SortField | undefined;

  currentDir: SortDir;

  onSort: (f: SortField) => void;

}> = ({ label, field, currentField, currentDir, onSort }) => {

  const active = currentField === field;

  return (

    <th

      className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 select-none"

      onClick={() => onSort(field)}

    >

      <span className="flex items-center gap-1">

        {label}

        {active

          ? currentDir === 'asc' ? <ArrowUp size={12} className="text-blue-500"/> : <ArrowDown size={12} className="text-blue-500"/>

          : <ArrowUpDown size={12} className="opacity-40"/>}

      </span>

    </th>

  );

};



// ── MAIN PAGE ─────────────────────────────────────────────────────────────────



const ALL_STATUSES: Array<{ value: OrderStatus | ''; label: string }> = [

  { value: '',                label: 'All Statuses'    },

  { value: 'ORDER_PLACED',    label: 'Confirmed'        },

  { value: 'PICKUP_ASSIGNED', label: 'Pickup'           },

  { value: 'ITEMIZED',        label: 'Itemized'         },

  { value: 'PROCESSING',      label: 'Brewing'          },

  { value: 'OUT_FOR_DELIVERY',label: 'Out for Delivery' },

  { value: 'READY_FOR_PICKUP',label: 'Ready for Pickup' },

  { value: 'COMPLETED',       label: 'Delivered'        },

  { value: 'CANCELLED',       label: 'Cancelled'        },

];



const PAGE_SIZES = [10, 20, 50];



export const OrdersPage: React.FC = () => {

  const { orders, total, isLoading, error, fetchOrders } = useOrdersStore();



  const [search,      setSearch]      = useState('');

  const [page,        setPage]        = useState(1);

  const [limit,       setLimit]       = useState(10);

  const [statusFilter,setStatusFilter]= useState<OrderStatus | ''>('');

  const [sortField,   setSortField]   = useState<SortField | undefined>(undefined);

  const [sortDir,     setSortDir]     = useState<SortDir>('desc');

  const [selected,    setSelected]    = useState<Order | null>(null);

  const loadRef = useRef<() => void>(() => {});



  const load = () =>

    fetchOrders({ page, limit, status: statusFilter || undefined, sortField, sortDir });



  // Keep loadRef current so the socket handler always calls the latest load()

  loadRef.current = load;



  useEffect(() => { load(); }, [page, limit, statusFilter, sortField, sortDir]);



  // ── WebSocket: new-order browser notifications for admins ─────────────────

  useEffect(() => {

    const token = localStorage.getItem('authToken');

    if (!token) return;



    // Request browser notification permission on first render

    if ('Notification' in window && Notification.permission === 'default') {

      Notification.requestPermission();

    }



    const socket = io(supportSocketUrl, {

      auth: { token },

      withCredentials: true,

      transports: ['websocket', 'polling'],

    });



    socket.on('order:new', (order: { orderNumber: string }) => {

      // Refresh the orders list

      loadRef.current();

      // Browser notification when tab is not focused

      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {

        new Notification('New order received! 🛒', {

          body: `Order #${order.orderNumber} has just been placed.`,

          icon: '/favicon.ico',

        });

      }

    });



    socket.on('order:updated', () => {

      // Silently refresh to keep the list in sync after any status change

      loadRef.current();

    });



    return () => { socket.disconnect(); };

  }, []);



  // Reset to page 1 when filters change

  const applyFilter = (s: OrderStatus | '') => { setStatusFilter(s); setPage(1); };

  const applySort   = (f: SortField) => {

    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

    else { setSortField(f); setSortDir('desc'); }

    setPage(1);

  };



  const filtered = useMemo(

    () => orders.filter((o) => {

      if (!search) return true;

      const q = search.toLowerCase();

      return (o.orderNumber ?? o._id).toLowerCase().includes(q) ||

             o.userId.toLowerCase().includes(q);

    }),

    [orders, search],

  );



  const totalPages = Math.ceil(total / limit);



  return (

    <AdminLayout>

      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">

        <div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Orders</h1>

          <p className="text-slate-500 text-sm mt-1">

            {total} order{total !== 1 ? 's' : ''} total

          </p>

        </div>



        {/* Search */}

        <div className="relative group">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />

          <input

            value={search} onChange={(e) => setSearch(e.target.value)}

            placeholder="Search by order # or user…"

            className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/5 rounded-xl w-64 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm shadow-sm"

          />

        </div>

      </div>



      {/* Filter bar */}

      <div className="flex flex-wrap items-center gap-3 mb-5">

        <Filter size={15} className="text-slate-400"/>

        <div className="flex flex-wrap gap-2">

          {ALL_STATUSES.map((s) => (

            <button

              key={s.value}

              onClick={() => applyFilter(s.value)}

              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${

                statusFilter === s.value

                  ? 'bg-blue-600 text-white border-blue-600'

                  : 'bg-white dark:bg-[#1A1A1A] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-blue-300'

              }`}

            >

              {s.label}

            </button>

          ))}

        </div>



        <div className="ml-auto flex items-center gap-2">

          <span className="text-xs text-slate-400">Rows:</span>

          <select

            value={limit}

            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}

            className="text-xs px-2 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#1A1A1A] text-slate-700 dark:text-slate-200 focus:outline-none"

          >

            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}

          </select>

        </div>

      </div>



      {error && (

        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-semibold">

          {error}

        </div>

      )}



      {/* Table */}

      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">

        {isLoading ? (

          <div className="flex items-center justify-center py-24">

            <Loader2 className="animate-spin text-blue-600" size={32}/>

          </div>

        ) : filtered.length === 0 ? (

          <div className="flex flex-col items-center justify-center py-24 text-slate-400">

            <PackageX size={40} className="mb-3 opacity-40"/>

            <p className="font-semibold">No orders found</p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="border-b border-slate-100 dark:border-white/5">

                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Order #</th>

                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>

                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile</th>

                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Items</th>

                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>

                  <SortHeader label="Amount"  field="billAmount"  currentField={sortField} currentDir={sortDir} onSort={applySort} />

                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Pickup</th>

                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Payment</th>

                  <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>

                  <SortHeader label="Updated" field="updatedAt"   currentField={sortField} currentDir={sortDir} onSort={applySort} />

                  <th className="px-5 py-3.5"/>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-50 dark:divide-white/5">

                {filtered.map((order) => {

                  const cats        = Array.from(new Set(order.items.map((i) => i.category ?? 'instant')));

                  const hasInstant  = cats.includes('instant');

                  const hasScheduled= cats.includes('scheduled');

                  const isPaid      = order.paymentStatus === 'COMPLETED';

                  return (

                    <tr key={order._id}

                      className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"

                      onClick={() => setSelected(order)}>

                      <td className="px-5 py-4 font-mono font-bold text-slate-800 dark:text-white text-xs">

                        #{order.orderNumber ?? order._id.slice(-6).toUpperCase()}

                      </td>

                      <td className="px-5 py-4 max-w-[140px]">

                        {order.customerName
                          ? <span className="font-semibold text-slate-800 dark:text-white truncate block">{order.customerName}</span>
                          : <span className="text-slate-400 text-xs italic">Unknown</span>}

                      </td>

                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">

                        {order.customerPhone ?? '—'}

                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300 max-w-[160px] truncate">

                        {order.items.map((i) => i.serviceName ?? i.name).join(', ')}

                      </td>

                      <td className="px-5 py-4">

                        <div className="flex flex-col gap-1">

                          {hasInstant   && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 w-fit">⚡ Instant</span>}

                          {hasScheduled && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 w-fit">🕐 Scheduled</span>}

                        </div>

                      </td>

                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-white">

                        {order.billAmount

                          ? <span className="text-green-700">₹{order.billAmount}</span>

                          : <span className="text-slate-400 text-xs italic">Pending</span>}

                      </td>

                      <td className="px-5 py-4 text-slate-500 text-xs">

                        {order.pickupDate

                          ? new Date(order.pickupDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

                          : '—'}

                        {order.pickupTime && <div className="text-slate-400">{order.pickupTime}</div>}

                      </td>

                      <td className="px-5 py-4">

                        {isPaid

                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 border border-green-200">✓ Paid</span>

                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-200">Unpaid</span>}

                      </td>

                      <td className="px-5 py-4"><StatusBadge status={order.status}/></td>

                      <td className="px-5 py-4 text-slate-400 text-xs">

                        {new Date(order.updatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}

                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <button
                            onClick={(e) => { e.stopPropagation(); printOrder(order); }}
                            title="Print / download order"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                            <Printer size={15} />
                          </button>

                          <button className="text-xs font-bold text-blue-600 hover:underline">Details →</button>

                        </div>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}



        {/* Pagination */}

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-white/5">

          <p className="text-xs text-slate-400">

            Page {page} of {totalPages || 1} · {total} total

          </p>

          <div className="flex items-center gap-1">

            <button onClick={() => setPage(1)} disabled={page === 1}

              className="px-2 py-1.5 text-xs rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors font-semibold">

              «

            </button>

            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}

              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">

              <ChevronLeft size={16}/>

            </button>

            {/* Page numbers */}

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {

              const start = Math.max(1, Math.min(page - 2, totalPages - 4));

              const p = start + i;

              if (p > totalPages) return null;

              return (

                <button key={p} onClick={() => setPage(p)}

                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${

                    p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'

                  }`}>

                  {p}

                </button>

              );

            })}

            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}

              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">

              <ChevronRight size={16}/>

            </button>

            <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}

              className="px-2 py-1.5 text-xs rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors font-semibold">

              »

            </button>

          </div>

        </div>

      </div>



      {/* Detail panel */}

      {selected && (

        <OrderDetailPanel

          order={selected}

          onClose={() => setSelected(null)}

          onUpdated={() => {

            const updated = useOrdersStore.getState().orders.find((o) => o._id === selected._id);

            if (updated) setSelected({ ...updated });

            load();

          }}

          onOrderChange={(o) => { setSelected(o); load(); }}

        />

      )}

    </AdminLayout>

  );

};

