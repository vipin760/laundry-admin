import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, ImagePlus, Loader2, Trash2, X, ZoomIn,
  AlertTriangle, Scale, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { Order, OrderPhoto, OrderPhotoType } from '../api/ordersApi';
import { ordersApi } from '../api/ordersApi';

/*
 * OrderPhotoManager
 * - "Findings / Damage" photos: evidence taken at pickup (note per photo)
 * - "Weighing / Bill" photos: scale reading proof uploaded with the bill
 * Thumbnails are lazy-loaded; uploads run in a single multipart request.
 */

interface StagedFile {
  file: File;
  preview: string; // object URL
  note: string;
}

interface LightboxState {
  photos: OrderPhoto[];
  index: number;
  title: string;
}

export const OrderPhotoManager: React.FC<{
  order: Order;
  editable: boolean;
  onOrderChange: (o: Order) => void;
}> = ({ order, editable, onOrderChange }) => {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const damage   = order.damagePhotos   ?? [];
  const weighing = order.weighingPhotos ?? [];

  if (!editable && damage.length === 0 && weighing.length === 0) return null;

  return (
    <div className="space-y-4">
      <PhotoSection
        type="damage"
        title="Findings / Damage Evidence"
        subtitle="Photos of damaged/worn items taken at pickup - protects against complaints."
        icon={<AlertTriangle size={13} />}
        accent="rose"
        photos={damage}
        order={order}
        editable={editable}
        withNotes
        onOrderChange={onOrderChange}
        onOpen={(i) => setLightbox({ photos: damage, index: i, title: 'Damage Evidence' })}
      />

      <PhotoSection
        type="weighing"
        title="Weighing / Bill Proof"
        subtitle="Scale reading photo uploaded with the bill so the customer can verify the kg."
        icon={<Scale size={13} />}
        accent="sky"
        photos={weighing}
        order={order}
        editable={editable}
        onOrderChange={onOrderChange}
        onOpen={(i) => setLightbox({ photos: weighing, index: i, title: 'Weighing Proof' })}
      />

      {lightbox && (
        <Lightbox
          state={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((s) => (s ? { ...s, index } : s))}
        />
      )}
    </div>
  );
};

/* Section */

const ACCENTS = {
  rose: {
    box: 'bg-rose-50/60 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20',
    title: 'text-rose-700 dark:text-rose-400',
    add: 'border-rose-200 text-rose-400 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50',
    btn: 'bg-rose-600 hover:bg-rose-700',
  },
  sky: {
    box: 'bg-sky-50/60 dark:bg-sky-500/5 border-sky-100 dark:border-sky-500/20',
    title: 'text-sky-700 dark:text-sky-400',
    add: 'border-sky-200 text-sky-400 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50',
    btn: 'bg-sky-600 hover:bg-sky-700',
  },
} as const;

const PhotoSection: React.FC<{
  type: OrderPhotoType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: keyof typeof ACCENTS;
  photos: OrderPhoto[];
  order: Order;
  editable: boolean;
  withNotes?: boolean;
  onOrderChange: (o: Order) => void;
  onOpen: (index: number) => void;
}> = ({ type, title, subtitle, icon, accent, photos, order, editable, withNotes, onOrderChange, onOpen }) => {
  const a = ACCENTS[accent];
  const inputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged]     = useState<StagedFile[]>([]);
  const [busy, setBusy]         = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [err, setErr]           = useState<string | null>(null);

  // Revoke object URLs on unmount / when staged changes away
  useEffect(() => () => staged.forEach((s) => URL.revokeObjectURL(s.preview)), [staged]);

  const pickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setErr(null);
    const files = Array.from(list)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 6);
    const oversize = files.find((f) => f.size > 8 * 1024 * 1024);
    if (oversize) { setErr(`"${oversize.name}" exceeds the 8 MB limit.`); return; }
    const next = files.map((file) => ({ file, preview: URL.createObjectURL(file), note: '' }));

    if (withNotes) {
      setStaged((s) => [...s, ...next].slice(0, 6)); // stage so admin can add notes first
    } else {
      void upload(next); // weighing uploads immediately
    }
  };

  const upload = async (items: StagedFile[]) => {
    if (!items.length) return;
    setBusy(true); setErr(null);
    try {
      const updated = await ordersApi.uploadOrderPhotos(
        order._id,
        type,
        items.map((s) => s.file),
        withNotes ? items.map((s) => s.note) : undefined,
      );
      items.forEach((s) => URL.revokeObjectURL(s.preview));
      setStaged([]);
      onOrderChange(updated);
    } catch (e: any) {
      setErr(e.message ?? 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (photoId: string) => {
    setDeleting(photoId); setErr(null);
    try {
      const updated = await ordersApi.deleteOrderPhoto(order._id, photoId, type);
      onOrderChange(updated);
    } catch (e: any) {
      setErr(e.message ?? 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const removeStaged = (i: number) =>
    setStaged((s) => {
      URL.revokeObjectURL(s[i].preview);
      return s.filter((_, idx) => idx !== i);
    });

  if (!editable && photos.length === 0) return null;

  return (
    <div className={`rounded-xl border p-4 ${a.box}`}>
      <p className={`text-xs font-bold mb-0.5 uppercase tracking-wide flex items-center gap-1.5 ${a.title}`}>
        {icon} {title}
        {photos.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-white/10 text-[10px]">
            {photos.length}
          </span>
        )}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">{subtitle}</p>

      {/* Uploaded thumbnails */}
      <div className="grid grid-cols-4 gap-2">
        {photos.map((p, i) => (
          <div key={p._id} className="relative group aspect-square rounded-lg overflow-hidden border border-white/60 dark:border-white/10 bg-slate-100 dark:bg-white/5">
            <img
              src={p.url}
              alt={p.note ?? title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover cursor-zoom-in transition-transform duration-200 group-hover:scale-105"
              onClick={() => onOpen(i)}
            />
            <button
              onClick={() => onOpen(i)}
              className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/25 text-white"
              aria-label="View photo">
              <ZoomIn size={16} />
            </button>
            {p.note && (
              <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] px-1.5 py-0.5 truncate pointer-events-none">
                {p.note}
              </span>
            )}
            {editable && (
              <button
                onClick={(e) => { e.stopPropagation(); void remove(p._id); }}
                disabled={deleting === p._id}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white hidden group-hover:flex items-center justify-center hover:bg-red-700 disabled:opacity-60"
                aria-label="Delete photo">
                {deleting === p._id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
              </button>
            )}
          </div>
        ))}

        {/* Add tile */}
        {editable && photos.length + staged.length < 12 && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 ${a.add}`}>
            {busy && !withNotes ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            <span className="text-[9px] font-bold">Add</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Staged damage photos - note per photo before upload */}
      {withNotes && staged.length > 0 && (
        <div className="mt-3 space-y-2">
          {staged.map((s, i) => (
            <div key={s.preview} className="flex items-center gap-2 bg-white/80 dark:bg-white/5 rounded-lg p-2 border border-white dark:border-white/10">
              <img src={s.preview} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
              <input
                value={s.note}
                onChange={(e) =>
                  setStaged((arr) => arr.map((x, idx) => (idx === i ? { ...x, note: e.target.value } : x)))
                }
                placeholder="Note - e.g. tear on left sleeve"
                maxLength={300}
                className="flex-1 text-xs px-2 py-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-1 focus:ring-rose-400 focus:outline-none"
              />
              <button onClick={() => removeStaged(i)} className="text-slate-400 hover:text-red-500 p-1" aria-label="Remove">
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => void upload(staged)}
            disabled={busy}
            className={`w-full py-2 rounded-lg text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 ${a.btn}`}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            {busy ? 'Uploading...' : `Upload ${staged.length} photo${staged.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {err && <p className="mt-2 text-[11px] text-red-600 font-semibold">{err}</p>}
    </div>
  );
};

/* Lightbox */

const Lightbox: React.FC<{
  state: LightboxState;
  onClose: () => void;
  onNavigate: (index: number) => void;
}> = ({ state, onClose, onNavigate }) => {
  const { photos, index, title } = state;
  const photo = photos[index];

  const prev = useCallback(
    () => onNavigate((index - 1 + photos.length) % photos.length),
    [index, photos.length, onNavigate],
  );
  const next = useCallback(
    () => onNavigate((index + 1) % photos.length),
    [index, photos.length, onNavigate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="absolute top-4 inset-x-4 flex items-center justify-between text-white/90">
        <p className="text-sm font-bold">
          {title} <span className="text-white/50 font-normal">- {index + 1} / {photos.length}</span>
        </p>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <img
        src={photo.url}
        alt={photo.note ?? title}
        className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="mt-3 text-center" onClick={(e) => e.stopPropagation()}>
        {photo.note && <p className="text-white text-sm font-semibold">{photo.note}</p>}
        <p className="text-white/50 text-xs mt-0.5">
          {new Date(photo.uploadedAt).toLocaleString('en-IN')}
        </p>
      </div>

      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
};
