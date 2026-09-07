'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCouple } from '@/context/CoupleContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { triggerHeartConfetti } from '@/lib/utils';
import { LoveMessage } from '@/types';
import { Send, Plus, Smile, ArrowDown, Heart, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const supabase = createClient();

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
    setShowScrollBottomBtn(false);
  }, []);

  // Check scroll position for floating "New Messages" pill
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottomBtn(isFarFromBottom);
  };

  // Fetch initial messages (ASC order: Oldest -> Newest)
  const fetchMessages = useCallback(async () => {
    if (!couple?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('love_messages')
        .select('*')
        .eq('couple_id', couple.id)
        .order('created_at', { ascending: true }); // ASC: Oldest -> Newest

      if (error) throw error;
      setMessages(data || []);
      setTimeout(() => scrollToBottom(false), 100);
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
    }
  }, [couple?.id, supabase, scrollToBottom]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to Realtime postgres_changes for love_messages
  useEffect(() => {
    if (!couple?.id) return;

    const channel = supabase
      .channel(`love-messages-chat-${couple.id}`)
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
          setMessages((prev) => {
            // Prevent duplicate message if already added via optimistic UI
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });

          // Check if user is near bottom -> auto scroll down
          if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight <= 150;
            if (isNearBottom || newMsg.sender_id === user?.id) {
              setTimeout(() => scrollToBottom(true), 100);
            } else {
              setShowScrollBottomBtn(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
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
    setTimeout(() => scrollToBottom(true), 50);

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

      // Replace temp optimistic message with real DB message
      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data : m))
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message if error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] lg:h-[calc(100vh-3rem)] max-w-full relative">
      {/* Chat Room Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/80 dark:bg-charcoal-800/80 backdrop-blur-md rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-soft-sm mb-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-lavender-200 overflow-hidden border border-rose-200 shrink-0 ring-2 ring-emerald-400 ring-offset-1">
            {partnerProfile?.avatar_url ? (
              <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center h-full font-bold text-xs text-purple-600">
                {partnerProfile?.display_name?.charAt(0).toUpperCase() || 'P'}
              </span>
            )}
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
            onClick={() => handleSendMessage('miss_you', 'Tớ nhớ cậu 🫶')}
            className="px-3 py-1.5 text-xs font-semibold bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 rounded-full hover:bg-rose-200 transition-colors shadow-soft-sm"
          >
            🫶 Nhớ cậu
          </motion.button>
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-1 py-3 space-y-3 scroll-smooth"
      >
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xs text-gray-400">Đang tải cuộc trò chuyện...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Heart className="w-10 h-10 mx-auto text-rose-300 animate-bounce fill-rose-100" />
            <p className="text-xs text-gray-400">
              Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
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
                        {partnerProfile?.display_name?.charAt(0).toUpperCase() || 'P'}
                      </span>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs space-y-0.5 shadow-soft-sm ${
                    isMine
                      ? 'bg-gradient-to-r from-rose-400 to-rose-500 text-white rounded-br-xs'
                      : 'bg-white dark:bg-charcoal-800 text-charcoal-800 dark:text-cream-50 border border-rose-100 dark:border-rose-900/30 rounded-bl-xs'
                  }`}
                >
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {msg.message || (msg.type === 'miss_you' ? 'Tớ nhớ cậu 🫶' : 'Yêu cậu ❤️')}
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
                        {userProfile?.display_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating "New Message" Scroll Pill */}
      <AnimatePresence>
        {showScrollBottomBtn && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 bg-rose-500 text-white text-xs font-semibold rounded-full shadow-soft-lg flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <ArrowDown className="w-3.5 h-3.5" /> Tin nhắn mới
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
            className="absolute bottom-16 left-3 z-30 p-2 glass-card rounded-2xl shadow-soft-lg flex items-center gap-2 border border-rose-200"
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSendMessage('miss_you', 'Tớ nhớ cậu 🫶')}
              className="px-3 py-1.5 text-xs bg-rose-100 text-rose-600 font-semibold rounded-xl"
            >
              🫶 Nhớ cậu
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSendMessage('love_you', 'Yêu cậu ❤️')}
              className="px-3 py-1.5 text-xs bg-rose-100 text-rose-600 font-semibold rounded-xl"
            >
              ❤️ Yêu cậu
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
            className="absolute bottom-16 right-12 z-30 p-2.5 glass-card rounded-2xl shadow-soft-lg grid grid-cols-4 gap-2 border border-rose-200"
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

      {/* Chat Input Bar fixed at bottom */}
      <div className="shrink-0 pt-2 pb-safe bg-cream-50/90 dark:bg-charcoal-900/90 backdrop-blur-md border-t border-rose-100 dark:border-rose-950/30">
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
                ? 'bg-rose-500 text-white'
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
            className="p-2.5 text-gray-400 hover:text-rose-500 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Smile className="w-5 h-5" />
          </motion.button>

          {/* Submit Send Button [ ➤ ] */}
          <Button
            type="submit"
            disabled={!inputMsg.trim() || sending}
            className="p-2.5 rounded-full min-h-[44px] min-w-[44px]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
