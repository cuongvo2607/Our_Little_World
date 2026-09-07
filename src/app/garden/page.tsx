'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { calculateLoveDuration, formatDateVietnamese } from '@/lib/utils';
import { Couple, GardenItem } from '@/types';
import { Flower2, Sparkles, Heart, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface MilestoneRule {
  type: string;
  icon: string;
  name: string;
  condition: string;
  checkUnlocked: (totalDays: number, memoryCount: number, completedBucketCount: number) => boolean;
}

const MILESTONE_RULES: MilestoneRule[] = [
  {
    type: 'seed',
    icon: '🌱',
    name: 'Mầm cây tình yêu',
    condition: 'Bắt đầu hành trình yêu',
    checkUnlocked: () => true,
  },
  {
    type: 'flower',
    icon: '🌷',
    name: 'Hoa uất kim hương',
    condition: 'Bên nhau đủ 30 ngày',
    checkUnlocked: (days) => days >= 30,
  },
  {
    type: 'sakura',
    icon: '🌸',
    name: 'Cây hoa anh đào',
    condition: 'Bên nhau 100 ngày',
    checkUnlocked: (days) => days >= 100,
  },
  {
    type: 'love_tree',
    icon: '🌳',
    name: 'Cây đại thụ tình yêu',
    condition: 'Kỷ niệm 1 năm (365 ngày)',
    checkUnlocked: (days) => days >= 365,
  },
  {
    type: 'small_plant',
    icon: '🪴',
    name: 'Chậu cây kỷ niệm',
    condition: 'Tạo từ 10 kỷ niệm',
    checkUnlocked: (_, memories) => memories >= 10,
  },
  {
    type: 'bench',
    icon: '🪑',
    name: 'Ghế đá công viên',
    condition: 'Hoàn thành 1 mục tiêu Bucket List',
    checkUnlocked: (_, __, bucket) => bucket >= 1,
  },
  {
    type: 'cottage',
    icon: '🏡',
    name: 'Mái nhà nhỏ',
    condition: 'Bên nhau từ 1 năm trở lên',
    checkUnlocked: (days) => days >= 365,
  },
];

export default function GardenPage() {
  const [couple, setCouple] = useState<Couple | null>(null);
  const [unlockedItems, setUnlockedItems] = useState<GardenItem[]>([]);
  const [stats, setStats] = useState({ totalDays: 0, memoryCount: 0, completedBucketCount: 0 });
  const [selectedRule, setSelectedRule] = useState<MilestoneRule | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchGardenData();
  }, []);

  const fetchGardenData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: member } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return;

      const coupleId = member.couple_id;

      // 1. Fetch Couple details
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .eq('id', coupleId)
        .single();
      setCouple(coupleData);

      const duration = calculateLoveDuration(coupleData?.start_date);

      // 2. Fetch counts
      const { count: memoryCount } = await supabase
        .from('memories')
        .select('*', { count: 'exact', head: true })
        .eq('couple_id', coupleId);

      const { count: bucketCount } = await supabase
        .from('bucket_list')
        .select('*', { count: 'exact', head: true })
        .eq('couple_id', coupleId)
        .eq('is_completed', true);

      setStats({
        totalDays: duration.totalDays,
        memoryCount: memoryCount || 0,
        completedBucketCount: bucketCount || 0,
      });

      // 3. Fetch unlocked items
      const { data: items } = await supabase
        .from('garden_items')
        .select('*')
        .eq('couple_id', coupleId);

      setUnlockedItems(items || []);

      // Auto-unlock missing items based on rules
      for (const rule of MILESTONE_RULES) {
        const isEligible = rule.checkUnlocked(
          duration.totalDays,
          memoryCount || 0,
          bucketCount || 0
        );

        const alreadySaved = items?.some((i) => i.item_type === rule.type);

        if (isEligible && !alreadySaved) {
          await supabase.from('garden_items').insert({
            couple_id: coupleId,
            item_type: rule.type,
            unlocked_by_event: rule.condition,
          });
        }
      }
    } catch (err) {
      console.error('Garden fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-charcoal-800 dark:text-cream-50 flex items-center justify-center gap-2">
          Khu Vườn Tình Yêu <Flower2 className="w-5 h-5 text-rose-400" />
        </h1>
        <p className="text-xs text-gray-500">
          Nuôi dưỡng từng cột mốc đáng nhớ theo thời gian
        </p>
      </div>

      {/* Interactive Visual Garden Canvas */}
      <Card className="relative h-72 bg-gradient-to-b from-sky-100 via-rose-50 to-emerald-100 dark:from-sky-950 dark:via-charcoal-900 dark:to-emerald-950 overflow-hidden border-none shadow-soft-lg">
        {/* Sky Clouds Animation */}
        <motion.div
          animate={{ x: [0, 40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-4 left-6 text-white/80 dark:text-white/20 text-3xl select-none"
        >
          ☁️
        </motion.div>
        <motion.div
          animate={{ x: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-8 right-10 text-white/80 dark:text-white/20 text-2xl select-none"
        >
          ☁️
        </motion.div>

        {/* Floating Heart Effect */}
        <motion.div
          animate={{ y: [-10, -25, -10], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-12 left-1/2 -translate-x-1/2 text-rose-400 text-lg"
        >
          ❤️
        </motion.div>

        {/* Ground Hill SVG */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-emerald-200/70 dark:bg-emerald-900/40 rounded-t-[100%] border-t-2 border-emerald-300/50" />

        {/* Unlocked Plants Display Grid */}
        <div className="absolute bottom-4 left-0 right-0 z-10 px-6 flex items-end justify-center gap-4">
          {MILESTONE_RULES.map((rule) => {
            const isUnlocked = rule.checkUnlocked(
              stats.totalDays,
              stats.memoryCount,
              stats.completedBucketCount
            );

            return (
              <motion.button
                key={rule.type}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedRule(rule)}
                className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${
                  isUnlocked ? 'opacity-100 drop-shadow-md' : 'opacity-30 grayscale'
                }`}
              >
                <span className="text-3xl animate-sway">{rule.icon}</span>
                {isUnlocked && (
                  <Sparkles className="w-3 h-3 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
                )}
              </motion.button>
            );
          })}
        </div>
      </Card>

      {/* Milestone Unlocks List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-rose-400" /> Vật phẩm & Cột mốc
        </h3>

        <div className="space-y-2">
          {MILESTONE_RULES.map((rule) => {
            const isUnlocked = rule.checkUnlocked(
              stats.totalDays,
              stats.memoryCount,
              stats.completedBucketCount
            );

            return (
              <Card
                key={rule.type}
                onClick={() => setSelectedRule(rule)}
                className={`flex items-center justify-between p-3.5 cursor-pointer transition-all ${
                  isUnlocked
                    ? 'border-rose-200/80 dark:border-rose-900/40'
                    : 'opacity-60 bg-gray-50/50 dark:bg-charcoal-800/40 border-dashed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-xl">
                    {rule.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-charcoal-800 dark:text-cream-50">
                      {rule.name}
                    </h4>
                    <p className="text-[11px] text-gray-500">{rule.condition}</p>
                  </div>
                </div>

                <div>
                  {isUnlocked ? (
                    <span className="text-[11px] px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold rounded-full">
                      Đã mở khóa ✨
                    </span>
                  ) : (
                    <span className="text-[11px] px-2.5 py-1 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-medium rounded-full">
                      Chưa mở
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedRule && (
        <Modal
          isOpen={!!selectedRule}
          onClose={() => setSelectedRule(null)}
          title={selectedRule.name}
        >
          <div className="text-center space-y-3 py-2">
            <div className="text-6xl animate-bounce">{selectedRule.icon}</div>
            <div>
              <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
                Yêu cầu mở khóa
              </p>
              <p className="text-sm font-bold text-charcoal-800 dark:text-cream-50 mt-0.5">
                {selectedRule.condition}
              </p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed px-4">
              Vật phẩm tượng trưng cho từng bước phát triển ngọt ngào trong thế giới của hai bạn.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
