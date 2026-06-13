import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
} from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import {
  supportApi,
  supportSocketUrl,
} from '../api/supportApi';
import type {
  SendMessageResult,
  SupportConversation,
  SupportMessage,
} from '../api/supportApi';

export const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item._id === selectedId) ?? null,
    [conversations, selectedId],
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return;
    }

    const socket = io(supportSocketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => {
      setIsConnected(false);
      setIsUserTyping(false);
    });
    socket.on('connect_error', () => {
      setIsConnected(false);
      setIsUserTyping(false);
    });
    socket.on('support:new_message', (result: SendMessageResult) => {
      upsertConversation(result.conversation);
      if (selectedIdRef.current === result.conversation._id) {
        appendMessage(result.message);
        setIsUserTyping(false);
        void supportApi.markRead(result.conversation._id).then(upsertConversation);
      }
    });
    socket.on(
      'support:typing',
      (payload: { conversationId?: string; senderRole?: string; isTyping?: boolean }) => {
        if (!payload || payload.senderRole !== 'user') {
          return;
        }
        if (payload.conversationId !== selectedIdRef.current) {
          return;
        }
        setIsUserTyping(Boolean(payload.isTyping));
      },
    );
    socket.on('support:conversation_updated', upsertConversation);
    socket.on('support:messages_read', upsertConversation);
    socket.on('support:error', (payload: { message?: string }) => {
      setError(payload.message ?? 'Socket connection failed');
    });

    return () => {
      emitTyping(false);
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedId]);

  async function loadConversations() {
    setIsLoadingInbox(true);
    setError(null);
    try {
      const items = await supportApi.getConversations();
      setConversations(items);
      if (!selectedId && items.length > 0) {
        await loadMessages(items[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load messages');
    } finally {
      setIsLoadingInbox(false);
    }
  }

  async function loadMessages(conversationId: string) {
    emitTyping(false);
    isTypingRef.current = false;
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsUserTyping(false);
    setSelectedId(conversationId);
    setIsLoadingMessages(true);
    setError(null);
    try {
      const [items, updatedConversation] = await Promise.all([
        supportApi.getMessages(conversationId),
        supportApi.markRead(conversationId),
      ]);
      setMessages(items);
      upsertConversation(updatedConversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load chat');
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId || isSending) {
      return;
    }

    setIsSending(true);
    setDraft('');
    try {
      emitTyping(false);
      isTypingRef.current = false;
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      const result = await supportApi.sendMessage(selectedId, body);
      upsertConversation(result.conversation);
      appendMessage(result.message);
    } catch (err) {
      setDraft(body);
      setError(err instanceof Error ? err.message : 'Unable to send message');
    } finally {
      setIsSending(false);
    }
  }

  function emitTyping(isTyping: boolean) {
    const socket = socketRef.current;
    const conversationId = selectedIdRef.current;
    if (!socket?.connected || !conversationId) {
      return;
    }

    socket.emit('support:typing', { conversationId, isTyping });
  }

  function handleDraftChange(value: string) {
    setDraft(value);

    if (!selectedIdRef.current) {
      return;
    }

    const hasText = value.trim().length > 0;
    if (!hasText) {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (isTypingRef.current) {
        emitTyping(false);
        isTypingRef.current = false;
      }
      return;
    }

    if (!isTypingRef.current) {
      emitTyping(true);
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      emitTyping(false);
      isTypingRef.current = false;
      typingTimeoutRef.current = null;
    }, 1200);
  }

  function upsertConversation(conversation: SupportConversation) {
    setConversations((current) => {
      const existing = current.find((item) => item._id === conversation._id);
      const merged = {
        ...existing,
        ...conversation,
        user: conversation.user ?? existing?.user ?? null,
      };
      const next = current.filter((item) => item._id !== conversation._id);
      return [merged, ...next].sort((a, b) => {
        const aTime = new Date(a.lastMessageAt ?? a.createdAt ?? 0).getTime();
        const bTime = new Date(b.lastMessageAt ?? b.createdAt ?? 0).getTime();
        return bTime - aTime;
      });
    });
  }

  function appendMessage(message: SupportMessage) {
    setMessages((current) => {
      if (current.some((item) => item._id === message._id)) {
        return current;
      }
      return [...current, message];
    });
  }

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Support Messages
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Reply to customer app issues in real time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border ${
              isConnected
                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                : 'text-amber-600 bg-amber-50 border-amber-100'
            }`}
          >
            <CheckCircle2 size={14} />
            {isConnected ? 'Live' : 'Reconnecting'}
          </span>
          <button
            onClick={loadConversations}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-200"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-semibold">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 min-h-[680px]">
        <section className="premium-card !p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-white/5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Conversations
            </p>
          </div>
          <div className="max-h-[620px] overflow-y-auto">
            {isLoadingInbox ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-brand animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-3">
                <MessageCircle size={34} className="opacity-40" />
                <p className="text-sm font-semibold">No support chats yet</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => loadMessages(conversation._id)}
                  className={`w-full text-left p-4 border-b border-slate-100 dark:border-white/5 transition-colors ${
                    selectedId === conversation._id
                      ? 'bg-brand/10'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-black">
                      {(conversation.user?.name ?? conversation.user?.email ?? 'U')
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {conversation.user?.name || 'Customer'}
                        </p>
                        {conversation.unreadForAdmin > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-black">
                            {conversation.unreadForAdmin}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {conversation.user?.email || conversation.userId}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 truncate mt-2">
                        {conversation.lastMessagePreview || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="premium-card !p-0 overflow-hidden flex flex-col min-h-[680px]">
          {selectedConversation ? (
            <>
              <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedConversation.user?.name || 'Customer'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedConversation.user?.email || selectedConversation.userId}
                  </p>
                  {isUserTyping && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      Customer is typing...
                    </p>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black uppercase">
                  {selectedConversation.status}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60 dark:bg-black/10">
                {isLoadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-brand animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-semibold">
                    Select a conversation or wait for a customer message
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isAdmin = message.senderRole === 'admin';
                      return (
                        <div
                          key={message._id}
                          className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                              isAdmin
                                ? 'bg-brand text-white rounded-br-md'
                                : 'bg-white dark:bg-white/5 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-white/5 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {message.body}
                            </p>
                            <p
                              className={`text-[10px] mt-2 ${
                                isAdmin ? 'text-white/70' : 'text-slate-400'
                              }`}
                            >
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form onSubmit={sendMessage} className="p-5 border-t border-slate-100 dark:border-white/5">
                <div className="flex gap-3">
                  <input
                    value={draft}
                    onChange={(event) => handleDraftChange(event.target.value)}
                    maxLength={2000}
                    placeholder="Type a reply..."
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 focus:ring-1 focus:ring-brand focus:outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || isSending}
                    className="btn-brand disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <MessageCircle size={42} className="opacity-40" />
              <p className="font-semibold">Choose a conversation</p>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

function formatTime(value?: string) {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
