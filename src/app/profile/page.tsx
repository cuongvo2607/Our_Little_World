'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCouple } from '@/context/CoupleContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { validateImageFile, compressImage } from '@/lib/image';
import { getDaysTogether, formatDateVietnamese } from '@/lib/utils';
import {
  User,
  Heart,
  Moon,
  Sun,
  LogOut,
  Smartphone,
  Copy,
  Check,
  Lock,
  Camera,
  Calendar,
  Sparkles,
  ChevronRight,
  Clock,
  ListTodo,
  ImageIcon,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, userProfile, partnerProfile, couple, refreshData } = useCouple();

  const [darkMode, setDarkMode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Avatar Upload States
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit Start Date Modal States
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState(couple?.start_date || '');
  const [updatingDate, setUpdatingDate] = useState(false);

  // Change Password Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleDarkMode = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleCopyInviteCode = () => {
    if (couple?.invite_code) {
      navigator.clipboard.writeText(couple.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Avatar Upload Handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Ảnh không hợp lệ');
      return;
    }

    setUploadingAvatar(true);
    showToast('Đang cập nhật ảnh...');

    try {
      // 1. Compress image client-side
      const compressedBlob = await compressImage(file, 600, 0.85);
      const fileExt = file.name.split('.').pop() || 'webp';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 2. Upload to Supabase Storage bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 4. Update profiles table for current user only
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      // Refresh couple context real-time
      await refreshData();
      showToast('Đã cập nhật ảnh đại diện ❤️');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      showToast(err.message || 'Lỗi khi cập nhật ảnh đại diện');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Update Relationship Start Date Handler
  const handleUpdateStartDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couple?.id || !newStartDate) return;

    const formattedTargetDate = formatDateVietnamese(newStartDate);
    if (
      !confirm(
        `Bạn có chắc chắn muốn thay đổi ngày bắt đầu của hai người thành ${formattedTargetDate}?`
      )
    ) {
      return;
    }

    setUpdatingDate(true);
    try {
      const { error } = await supabase
        .from('couples')
        .update({ start_date: newStartDate })
        .eq('id', couple.id);

      if (error) throw error;

      await refreshData();
      setIsDateModalOpen(false);
      showToast('Đã cập nhật ngày bắt đầu yêu! ❤️');
    } catch (err: any) {
      showToast(err.message || 'Không thể cập nhật ngày bắt đầu');
    } finally {
      setUpdatingDate(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast('Đã đổi mật khẩu thành công!');
      setIsPasswordModalOpen(false);
      setNewPassword('');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setChangingPass(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
    await supabase.auth.signOut();
    router.push('/login');
  };

  const daysTogether = getDaysTogether(couple?.start_date);

  return (
    <div className="space-y-5 py-2">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-charcoal-800 text-white text-xs font-medium rounded-full shadow-soft-lg flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Profile Card */}
      <Card className="text-center py-6 bg-gradient-to-b from-rose-100/70 to-cream-50 dark:from-rose-950/40 dark:to-charcoal-900 border-rose-200/60 shadow-soft-md">
        <div className="flex justify-center -space-x-4 mb-3">
          {/* User's Avatar with Upload Overlay Button */}
          <div className="relative group">
            <div className="w-16 h-16 rounded-full border-2 border-white dark:border-charcoal-800 bg-rose-200 overflow-hidden flex items-center justify-center font-bold text-xl text-rose-600 shadow-soft-sm">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Me" className="w-full h-full object-cover" />
              ) : (
                (userProfile?.display_name?.[0] || 'U').toUpperCase()
              )}
            </div>

            {/* Avatar Picker Button */}
            <label className="absolute bottom-0 right-0 p-1.5 bg-rose-500 text-white rounded-full cursor-pointer shadow-soft-sm hover:scale-110 active:scale-95 transition-transform min-h-[32px] min-w-[32px] flex items-center justify-center">
              <Camera className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          {/* Partner Avatar */}
          <div className="w-16 h-16 rounded-full border-2 border-white dark:border-charcoal-800 bg-lavender-200 overflow-hidden flex items-center justify-center font-bold text-xl text-purple-600 shadow-soft-sm">
            {partnerProfile?.avatar_url ? (
              <img src={partnerProfile.avatar_url} alt="Partner" className="w-full h-full object-cover" />
            ) : (
              (partnerProfile?.display_name?.[0] || 'P').toUpperCase()
            )}
          </div>
        </div>

        <h2 className="text-lg font-bold text-charcoal-800 dark:text-cream-50">
          {couple?.name || 'Thế Giới Của Hai Ta'}
        </h2>
        <p className="text-xs text-rose-500 font-medium mt-0.5">
          {userProfile?.display_name} ❤️ {partnerProfile?.display_name || 'Người ấy'}
        </p>

        {/* Start Date & Edit Action */}
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="text-[11px] text-gray-400">
            Từ ngày {formatDateVietnamese(couple?.start_date)}
          </span>
          <button
            onClick={() => {
              setNewStartDate(couple?.start_date || '');
              setIsDateModalOpen(true);
            }}
            className="text-[11px] font-semibold text-rose-500 hover:underline px-1.5 py-0.5 rounded-md hover:bg-rose-50"
          >
            ✏️ Sửa
          </button>
        </div>

        {/* Invite Code display */}
        <div className="mt-4 pt-3 border-t border-rose-200/50 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500">Mã kết nối:</span>
          <span className="font-mono font-bold text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200">
            {couple?.invite_code}
          </span>
          <button
            onClick={handleCopyInviteCode}
            className="p-1 text-gray-400 hover:text-rose-500 min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            {copiedCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </Card>

      {/* Relationship Summary Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 text-center space-y-1">
          <Heart className="w-5 h-5 mx-auto text-rose-400 fill-rose-300" />
          <div className="text-lg font-extrabold text-charcoal-800 dark:text-cream-50">
            {daysTogether} ngày
          </div>
          <p className="text-[10px] text-gray-400">Thời gian bên nhau</p>
        </Card>

        <Card className="p-3 text-center space-y-1">
          <ImageIcon className="w-5 h-5 mx-auto text-rose-400" />
          <div className="text-lg font-extrabold text-charcoal-800 dark:text-cream-50">
            Album
          </div>
          <p className="text-[10px] text-gray-400">Khoảnh khắc kỷ niệm</p>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="p-2 divide-y divide-rose-100 dark:divide-rose-900/30">
        <Link
          href="/timeline"
          className="flex items-center justify-between p-3 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-2xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">
              Hành trình yêu (Timeline)
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Link
          href="/bucket-list"
          className="flex items-center justify-between p-3 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-2xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <ListTodo className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">
              Danh sách mơ ước (Bucket List)
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <Link
          href="/time-capsule"
          className="flex items-center justify-between p-3 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-2xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">
              Hòm thư tương lai (Time Capsule)
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>
      </Card>

      {/* App Settings Menu */}
      <Card className="p-2 divide-y divide-rose-100 dark:divide-rose-900/30">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-between p-3 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-2xl transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-3">
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-purple-500" />
            )}
            <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">
              Giao diện tối (Dark Mode)
            </span>
          </div>
          <span className="text-xs text-gray-400">{darkMode ? 'Bật' : 'Tắt'}</span>
        </button>

        <Link
          href="/install"
          className="flex items-center justify-between p-3 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-2xl transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">
              Hướng dẫn cài ứng dụng PWA
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </Link>

        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className="w-full flex items-center justify-between p-3 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-2xl transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-charcoal-800 dark:text-cream-50">
              Đổi mật khẩu
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-3 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-2xl transition-colors min-h-[44px] text-red-500"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold">Đăng xuất khỏi ứng dụng</span>
          </div>
        </button>
      </Card>

      {/* Edit Start Date Modal */}
      <Modal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        title="Cập Nhật Ngày Bắt Đầu Yêu ❤️"
      >
        <form onSubmit={handleUpdateStartDate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Chọn ngày chính thức bên nhau
            </label>
            <input
              type="date"
              required
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="w-full px-4 py-2.5 text-base bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={updatingDate}>
            Lưu ngày mới ❤️
          </Button>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Đổi Mật Khẩu 🔒"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Mật khẩu mới
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-base bg-white/70 dark:bg-charcoal-800/70 border border-rose-100 dark:border-rose-900/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 text-charcoal-800 dark:text-cream-50"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={changingPass}>
            Cập nhật mật khẩu
          </Button>
        </form>
      </Modal>
    </div>
  );
}
