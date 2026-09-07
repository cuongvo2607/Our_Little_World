'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Heart, Lock, Mail, User, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          if (data.session) {
            // User logged in immediately (Confirm email is OFF)
            router.push('/onboarding');
          } else {
            // Confirmation email sent (Confirm email is ON)
            setErrorMsg(
              'Đăng ký thành công! Vui lòng kiểm tra hộp thư email để xác nhận tài khoản. (Mẹo: Nếu muốn đăng ký ngay không cần email, hãy vào Supabase Dashboard -> Authentication -> Providers -> Email -> tắt "Confirm email").'
            );
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push('/');
      }
    } catch (err: any) {
      console.error('Auth Error:', err);

      const errStr = err?.message || err?.toString() || '';

      if (errStr.toLowerCase().includes('rate limit') || errStr.toLowerCase().includes('email rate limit')) {
        setErrorMsg(
          '⚠️ Lỗi Email Rate Limit Exceeded: Supabase miễn phí giới hạn số lượng email gửi thử nghiệm mỗi giờ. HƯỚNG DẪN SỬA NGAY: Vào Supabase Dashboard -> Authentication -> Providers -> Email -> Tắt "Confirm email" -> Bấm Save. Sau đó bạn có thể Đăng ký ngay mà không bị giới hạn!'
        );
      } else if (errStr.includes('Failed to fetch')) {
        setErrorMsg(
          'Không thể kết nối đến máy chủ Supabase. Vui lòng kiểm tra lại NEXT_PUBLIC_SUPABASE_URL trên Vercel và bấm Redeploy lại dự án.'
        );
      } else {
        setErrorMsg(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-rose-300 via-rose-400 to-rose-500 flex items-center justify-center shadow-soft-lg shadow-rose-300/40 text-white animate-pulse-soft">
          <Heart className="w-10 h-10 fill-white stroke-none" />
        </div>
        <h1 className="text-2xl font-bold text-charcoal-800 dark:text-rose-100 flex items-center justify-center gap-2">
          Our Little World <Sparkles className="w-5 h-5 text-rose-400" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Không gian riêng tư ngọt ngào dành cho 2 người
        </p>
      </motion.div>

      <Card className="w-full">
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="flex bg-rose-50 dark:bg-rose-950/40 p-1 rounded-2xl mb-2">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                !isSignUp
                  ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                isSignUp
                  ? 'bg-white dark:bg-charcoal-800 text-rose-600 shadow-soft-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Đăng ký
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 text-xs bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300 rounded-2xl border border-red-200/50 leading-relaxed font-medium">
              {errorMsg}
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tên hiển thị
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bé Đậu / Anh Gấu"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-base bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                placeholder="email@cua-ban.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-base bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-base bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-4" isLoading={loading}>
            {isSignUp ? 'Tạo không gian yêu thương ❤️' : 'Vào thế giới của hai ta ✨'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
