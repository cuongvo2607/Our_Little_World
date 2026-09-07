'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Heart, PlusCircle, KeyRound, Calendar, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OnboardingPage() {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [coupleName, setCoupleName] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user is logged in
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router, supabase]);

  // Helper to generate 6-char random alphanumeric code
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'LOVE';
    for (let i = 0; i < 2; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vui lòng đăng nhập lại');

      const code = generateRandomCode();

      // 1. Create Couple
      const { data: couple, error: coupleErr } = await supabase
        .from('couples')
        .insert({
          name: coupleName || 'Thế Giới Của Chúng Ta',
          start_date: startDate,
          invite_code: code,
          created_by: user.id,
        })
        .select()
        .single();

      if (coupleErr) throw coupleErr;

      // 2. Add creator to couple_members
      const { error: memberErr } = await supabase
        .from('couple_members')
        .insert({
          couple_id: couple.id,
          user_id: user.id,
        });

      if (memberErr) throw memberErr;

      setGeneratedInviteCode(code);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo không gian. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vui lòng đăng nhập lại');

      const trimmedCode = inviteCodeInput.trim().toUpperCase();

      // 1. Find couple by invite code
      const { data: couple, error: findErr } = await supabase
        .from('couples')
        .select('id, name')
        .eq('invite_code', trimmedCode)
        .single();

      if (findErr || !couple) {
        throw new Error('Mã mời không hợp lệ hoặc không tồn tại');
      }

      // 2. Join couple
      const { error: joinErr } = await supabase
        .from('couple_members')
        .insert({
          couple_id: couple.id,
          user_id: user.id,
        });

      if (joinErr) throw joinErr;

      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tham gia. Kiểm tra mã mời.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedInviteCode) {
      navigator.clipboard.writeText(generatedInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-6"
      >
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-500">
          <Heart className="w-8 h-8 fill-rose-400 stroke-none animate-pulse-soft" />
        </div>
        <h1 className="text-xl font-bold text-charcoal-800 dark:text-rose-100">
          Kết Nối Không Gian Yêu
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Tạo mới hoặc kết nối với nửa còn lại qua mã mời
        </p>
      </motion.div>

      {generatedInviteCode ? (
        <Card className="w-full text-center space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200/60">
            <p className="text-xs text-rose-600 dark:text-rose-300 font-medium">
              Không gian đã tạo thành công! 🎉
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Hãy gửi mã mời này cho người ấy để tham gia cùng nhé:
            </p>
            <div className="mt-3 py-3 px-4 bg-white dark:bg-charcoal-800 rounded-xl font-mono text-2xl font-bold text-rose-500 tracking-wider flex items-center justify-center gap-3">
              <span>{generatedInviteCode}</span>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <Button onClick={() => router.push('/')} className="w-full">
            Đến trang chủ của hai ta ✨
          </Button>
        </Card>
      ) : (
        <Card className="w-full">
          <div className="flex bg-rose-50 dark:bg-rose-950/40 p-1 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'create'
                  ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Tạo mới
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                mode === 'join'
                  ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <KeyRound className="w-4 h-4" /> Nhập mã mời
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 text-xs bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300 rounded-2xl border border-red-200/50">
              {errorMsg}
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreateCouple} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Tên không gian của hai bạn
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đậu & Gấu 🐻"
                  value={coupleName}
                  onChange={(e) => setCoupleName(e.target.value)}
                  className="w-full px-4 py-2.5 text-base bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Ngày chính thức yêu nhau
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-base bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={loading}>
                Tạo mã kết nối ✨
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoinCouple} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Mã mời từ người ấy
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="Nhập mã (VD: LOVE88)"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 text-center text-xl font-mono uppercase tracking-widest bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-rose-600 dark:text-rose-400"
                />
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={loading}>
                Tham gia ngay ❤️
              </Button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
