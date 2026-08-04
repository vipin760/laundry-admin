import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Siren, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supportSocketUrl } from '../api/supportApi';

const SIREN_SRC = '/notification-sound.mp3';
const SIREN_DURATION_MS = 30_000;

interface PendingOrder {
  orderNumber: string;
}

interface OrderSirenContextType {
  pendingOrders: PendingOrder[];
  isSirenPlaying: boolean;
  stopSiren: () => void;
  // Bumped on every order:new/order:updated event so pages can refresh
  // their own data without owning a socket connection themselves.
  lastEventAt: number;
}

const OrderSirenContext = createContext<OrderSirenContextType | undefined>(undefined);

export const OrderSirenProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [lastEventAt, setLastEventAt] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(SIREN_SRC);
    audioRef.current.loop = true;
    audioRef.current.preload = 'auto';
  }, []);

  const stopSiren = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSirenPlaying(false);
    setPendingOrders([]);
  }, []);

  // Persistent socket connection — lives above <Routes> so the siren keeps
  // playing and pending orders keep tracking regardless of which page the
  // admin navigates to.
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const socket = io(supportSocketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['polling', 'websocket'],
    });

    socket.on('order:new', (order: { orderNumber: string; pickupType?: string }) => {
      setLastEventAt(Date.now());

      // Drop-at-shop orders are walk-ins the admin already knows about — the
      // regular notification-bell chime is enough, no need for a siren.
      if (order.pickupType === 'drop_at_shop') return;

      setPendingOrders((prev) => [...prev, { orderNumber: order.orderNumber }]);
      setIsSirenPlaying(true);

      audioRef.current?.play().catch(() => {
        // Autoplay may be blocked until the admin interacts with the page —
        // the banner still shows as a silent fallback.
      });

      // Runs the full 30s regardless of whether the admin has the Orders
      // page open — only an explicit click on the banner/notification (or
      // this timeout) stops it early.
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(stopSiren, SIREN_DURATION_MS);

      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        const notification = new Notification('New order received! 🛒', {
          body: `Order #${order.orderNumber} has just been placed.`,
          icon: '/favicon.ico',
        });
        notification.onclick = () => {
          window.focus();
          stopSiren();
          navigate('/orders');
        };
      }
    });

    socket.on('order:updated', () => {
      setLastEventAt(Date.now());
    });

    return () => { socket.disconnect(); };
  }, [isAuthenticated, navigate, stopSiren]);

  const handleBannerClick = () => {
    stopSiren();
    navigate('/orders');
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopSiren();
  };

  return (
    <OrderSirenContext.Provider value={{ pendingOrders, isSirenPlaying, stopSiren, lastEventAt }}>
      {children}
      <AnimatePresence>
        {isSirenPlaying && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.2 }}
            onClick={handleBannerClick}
            className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-3 bg-red-600 text-white px-4 py-3 cursor-pointer shadow-lg"
          >
            <Siren size={18} className="animate-pulse flex-shrink-0" />
            <span className="text-sm font-bold">
              {pendingOrders.length > 1
                ? `${pendingOrders.length} new orders received — click to view`
                : `New order${pendingOrders[0] ? ` #${pendingOrders[0].orderNumber}` : ''} received — click to view`}
            </span>
            <button
              onClick={handleDismiss}
              title="Dismiss"
              className="ml-2 p-1 rounded-full hover:bg-white/20 flex-shrink-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </OrderSirenContext.Provider>
  );
};

export const useOrderSiren = () => {
  const context = useContext(OrderSirenContext);
  if (context === undefined) {
    throw new Error('useOrderSiren must be used within an OrderSirenProvider');
  }
  return context;
};
