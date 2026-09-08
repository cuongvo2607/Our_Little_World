'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCouple } from '@/context/CoupleContext';
import { Button } from '@/components/ui/Button';
import { triggerHeartConfetti } from '@/lib/utils';
import { LoveMessage } from '@/types';
import { Send, Plus, Smile, ArrowDown, Heart, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerUserActivity } from '@/lib/activity';

const EMOJI_PRESETS = ['❤️', '🥰', '🫶', '🫂', '😘', '🌸', '✨', '🥺'];

export default function MessagesPage() {
  const { user, userProfile, partnerProfile, couple } = useCouple();
  const [messages, setMessages] = useState<LoveMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollAfterFetchRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);
  const quickTargetName = partnerProfile?.display_name?.trim() || 'người ấy';
  const missQuickLabel = `Nhớ ${quickTargetName}`;
  const loveQuickLabel = `Iu ${quickTargetName}`;

  // Scroll to bottom helper using requestAnimationFrame for zero-lag layout response
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
      setShowScrollBottomBtn(false);
    });
  }, []);

  // Check scroll position for floating "New Messages" pill
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottomBtn(isFarFromBottom);
  };

  // Fetch the 50 newest messages, then restore chat display order: oldest -> newest.
  const fetchMessages = useCallback(async () => {
    if (!couple?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('love_messages')
        .select('*')
        .eq('couple_id', couple.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      shouldScrollAfterFetchRef.current = true;
      setMessages([...(data || [])].reverse());
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
    }
  }, [couple?.id, supabase, scrollToBottom]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (loading || !shouldScrollAfterFetchRef.current) return;

    shouldScrollAfterFetchRef.current = false;
    scrollToBottom(false);
  }, [loading, messages.length, scrollToBottom]);

  // Subscribe to Realtime postgres_changes for love_messages (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!couple?.id) return;

    const channelName = `chat:${couple.id}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Realtime Chat] Initiating channel: ${channelName}`);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'love_messages',
          filter: `couple_id=eq.${couple.id}`,
        },
        (payload) => {
          const newMsg = payload.new as LoveMessage;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Realtime Chat] INSERT event:', newMsg);
          }

          setMessages((prev) => {
            // 1. Exact ID deduplication check
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev;
            }

            // 2. Deduplicate optimistic message matching temp ID & message content
            const tempIndex = prev.findIndex(
              (m) =>
                m.id.startsWith('temp-') &&
                m.sender_id === newMsg.sender_id &&
                m.message === newMsg.message
            );

            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = newMsg;
              return updated;
            }

            return [...prev, newMsg];
          });

          // Check if user is near bottom -> auto scroll down
          if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight <= 150;
            if (isNearBottom || newMsg.sender_id === user?.id) {
              scrollToBottom(true);
            } else {
              setShowScrollBottomBtn(true);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'love_messages',
          filter: `couple_id=eq.${couple.id}`,
        },
        (payload) => {
          const updatedMsg = payload.new as LoveMessage;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Realtime Chat] UPDATE event:', updatedMsg);
          }
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'love_messages',
          filter: `couple_id=eq.${couple.id}`,
        },
        (payload) => {
          const deletedId = payload.old.id;
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Realtime Chat] DELETE event:', deletedId);
          }
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe((status, err) => {
        if (process.env.NODE_ENV !== 'production') {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime Chat] SUBSCRIBED to ${channelName}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Realtime Chat] CHANNEL_ERROR on ${channelName}:`, err);
          } else if (status === 'TIMED_OUT') {
            console.warn(`[Realtime Chat] TIMED_OUT on ${channelName}`);
          } else if (status === 'CLOSED') {
            console.log(`[Realtime Chat] CLOSED channel ${channelName}`);
          }
        }
      });

    return () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Realtime Chat] Cleaning up channel ${channelName}`);
      }
      supabase.removeChannel(channel);
    };
  }, [couple?.id, supabase, user?.id, scrollToBottom]);

  // Send message
  const handleSendMessage = async (
    type: 'miss_you' | 'love_you' | 'hug' | 'custom' = 'custom',
    textOverride?: string
  ) => {
    const textToSend = textOverride || inputMsg;
    if (!textToSend.trim() || !couple?.id || !user?.id) return;

    setSending(true);
    setInputMsg('');
    setShowEmojiPicker(false);
    setShowQuickMenu(false);

    if (type !== 'custom') {
      triggerHeartConfetti();
    }

    // Temporary Optimistic Message ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: LoveMessage = {
      id: tempId,
      couple_id: couple.id,
      sender_id: user.id,
      type,
      message: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      const { data, error } = await supabase
        .from('love_messages')
        .insert({
          couple_id: couple.id,
          sender_id: user.id,
          type,
          message: textToSend,
        })
        .select()
        .single();

      if (error) throw error;

      // Register Sunflower Daily Activity
      registerUserActivity(type === 'custom' ? 'message' : 'quick_message');

      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data : m))
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col relative overflow-hidden bg-cream-50/60 dark:bg-charcoal-900/60">
      {/* 1. CHAT HEADER */}
      <div className="shrink-0 z-20 px-3.5 py-2.5 bg-white/90 dark:bg-charcoal-800/90 backdrop-blur-md border-b border-rose-100 dark:border-rose-900/30 shadow-soft-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-full bg-lavender-200 overflow-hidden border border-rose-200 shrink-0">
            {partnerProfile?.avatar_url ? (
              <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center h-full font-bold text-xs text-purple-600">
                {(partnerProfile?.display_name?.[0] || 'P').toUpperCase()}
              </span>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white dark:border-charcoal-800" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-charcoal-800 dark:text-cream-50">
              {partnerProfile?.display_name || 'Người ấy'}
            </h2>
            <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Đang trực tuyến
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSendMessage('miss_you', `${missQuickLabel} 🫶`)}
            className="px-3 py-1.5 text-xs font-semibold bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 rounded-full hover:bg-rose-200 transition-colors shadow-soft-sm"
          >
            🫶 {missQuickLabel}
          </motion.button>
        </div>
      </div>

      {/* 2. MESSAGE LIST (MAIN SCROLL CONTAINER & ANCHORED TO BOTTOM WHEN FEW) */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-3 scroll-smooth relative"
      >
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xs text-gray-400">Đang tải cuộc trò chuyện...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2 text-center py-12">
            <Heart className="w-10 h-10 text-rose-300 animate-bounce fill-rose-100" />
            <p className="text-xs text-gray-400">
              Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
            </p>
          </div>
        ) : (
          /* Inner Message Container anchored to bottom using justify-end */
          <div className="flex flex-col justify-end min-h-full space-y-3">
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Partner Avatar on Left */}
                  {!isMine && (
                    <div className="w-7 h-7 rounded-full bg-lavender-200 overflow-hidden shrink-0 border border-rose-100 mb-1">
                      {partnerProfile?.avatar_url ? (
                        <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-[10px] font-bold text-purple-600">
                          {(partnerProfile?.display_name?.[0] || 'P').toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs space-y-0.5 shadow-soft-sm ${
                      isMine
                        ? 'bg-gradient-to-r from-rose-400 to-[#E86D91] text-white rounded-br-xs'
                        : 'bg-white dark:bg-charcoal-800 text-charcoal-800 dark:text-cream-50 border border-rose-100 dark:border-rose-900/30 rounded-bl-xs'
                    }`}
                  >
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                      {msg.message || (msg.type === 'miss_you' ? `Nhớ ${isMine ? quickTargetName : (userProfile?.display_name?.trim() || 'bạn')} 🫶` : `Iu ${isMine ? quickTargetName : (userProfile?.display_name?.trim() || 'bạn')} ❤️`)}
                    </p>

                    <div
                      className={`text-[9px] flex items-center justify-end gap-1 ${
                        isMine ? 'text-rose-100' : 'text-gray-400'
                      }`}
                    >
                      <span>{timeStr}</span>
                      {isMine && <span>✓</span>}
                    </div>
                  </div>

                  {/* User Avatar on Right */}
                  {isMine && (
                    <div className="w-7 h-7 rounded-full bg-rose-200 overflow-hidden shrink-0 border border-rose-100 mb-1">
                      {userProfile?.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center h-full text-[10px] font-bold text-rose-600">
                          {(userProfile?.display_name?.[0] || 'U').toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating "New Message" Scroll Pill */}
      <AnimatePresence>
        {showScrollBottomBtn && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 bg-[#E86D91] text-white text-xs font-semibold rounded-full shadow-soft-lg flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <ArrowDown className="w-3.5 h-3.5" /> Tin nhắn mới ↓
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quick Action Popup Menu */}
      <AnimatePresence>
        {showQuickMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-24 left-3 z-40 p-2 glass-card rounded-2xl shadow-soft-lg flex items-center gap-2 border border-rose-200"
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSendMessage('miss_you', `${missQuickLabel} 🫶`)}
              className="px-3 py-1.5 text-xs bg-rose-100 text-rose-600 font-semibold rounded-xl"
            >
              🫶 {missQuickLabel}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSendMessage('love_you', `${loveQuickLabel} ❤️`)}
              className="px-3 py-1.5 text-xs bg-rose-100 text-rose-600 font-semibold rounded-xl"
            >
              ❤️ {loveQuickLabel}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSendMessage('hug', 'Ôm một cái 🫂')}
              className="px-3 py-1.5 text-xs bg-rose-100 text-rose-600 font-semibold rounded-xl"
            >
              🫂 Ôm một cái
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker Popup */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-24 right-12 z-40 p-2.5 glass-card rounded-2xl shadow-soft-lg grid grid-cols-4 gap-2 border border-rose-200"
          >
            {EMOJI_PRESETS.map((emoji) => (
              <motion.button
                key={emoji}
                type="button"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setInputMsg((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-xl p-1.5 hover:bg-rose-100 rounded-xl transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. MESSAGE COMPOSER INPUT BAR (RIGHT ABOVE BOTTOM NAV WITH 8-12PX SPACING) */}
      <div className="shrink-0 pt-2 px-2 z-30 bg-cream-50/95 dark:bg-charcoal-900/95 backdrop-blur-md border-t border-rose-100/60 dark:border-rose-950/30 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,12px)+8px)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage('custom');
          }}
          className="flex items-center gap-2"
        >
          {/* Quick Action Toggle Button [ + ] */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => {
              setShowQuickMenu(!showQuickMenu);
              setShowEmojiPicker(false);
            }}
            className={`p-2.5 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              showQuickMenu
                ? 'bg-[#E86D91] text-white'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'
            }`}
          >
            {showQuickMenu ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </motion.button>

          {/* Text Message Input */}
          <input
            type="text"
            placeholder="Viết lời nhắn ngọt ngào..."
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            className="flex-1 px-4 py-2.5 text-base bg-white dark:bg-charcoal-800 border border-rose-100 dark:border-rose-900/30 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50 shadow-soft-sm"
          />

          {/* Emoji Picker Launcher [ 😊 ] */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowQuickMenu(false);
            }}
            className="p-2.5 text-gray-400 hover:text-[#E86D91] rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Smile className="w-5 h-5" />
          </motion.button>

          {/* Submit Send Button [ ➤ ] */}
          <Button
            type="submit"
            disabled={!inputMsg.trim() || sending}
            className="p-2.5 rounded-full min-h-[44px] min-w-[44px] bg-[#E86D91] hover:bg-rose-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
