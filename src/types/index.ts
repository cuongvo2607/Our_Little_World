export type MoodEmoji = '😭' | '😔' | '😐' | '😊' | '🥰' | '🥳';

export type LoveMessageType = 'miss_you' | 'love_you' | 'hug' | 'custom';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  birthday: string | null;
  created_at: string;
}

export interface Couple {
  id: string;
  name: string;
  start_date: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface CoupleMember {
  id: string;
  couple_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface Memory {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string | null;
  memory_date: string;
  image_url: string | null;
  location?: string | null;
  created_at: string;
  signed_url?: string;
  media?: MemoryMedia[];
  memory_media?: MemoryMedia[];
  memory_views?: MemoryView[];
}

export type MemoryMediaType = 'image' | 'video';

export interface MemoryMedia {
  id: string;
  memory_id: string;
  couple_id: string;
  storage_path: string;
  media_type: MemoryMediaType;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  sort_order: number;
  created_at: string;
  signed_url?: string;
}

export interface MemoryView {
  id: string;
  memory_id: string;
  couple_id: string;
  viewer_id: string;
  viewed_at: string;
}

export interface Mood {
  id: string;
  couple_id: string;
  user_id: string;
  mood: MoodEmoji;
  note: string | null;
  mood_date: string;
  created_at: string;
  updated_at?: string;
}

export interface LoveMessage {
  id: string;
  couple_id: string;
  sender_id: string;
  type: LoveMessageType;
  message: string | null;
  created_at: string;
  sender_profile?: Profile;
}

export interface BucketItem {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string;
  event_date: string;
  image_url: string | null;
  created_at: string;
}

export interface TimeCapsule {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  message?: string; // Optional if locked
  unlock_at: string;
  opened_at: string | null;
  created_at: string;
  is_locked?: boolean;
}

export interface GardenItem {
  id: string;
  couple_id: string;
  item_type: string;
  unlocked_by_event: string;
  unlocked_at: string;
  metadata?: Record<string, unknown>;
}

export type ActivityType = 'message' | 'mood' | 'memory' | 'quick_message';

export type NotificationType =
  | 'quick_love'
  | 'message'
  | 'memory_created'
  | 'memory_viewed'
  | 'sunflower_watered'
  | 'streak_completed'
  | 'song_added'
  | 'time_capsule_ready';

export interface AppNotification {
  id: string;
  couple_id: string;
  sender_id: string;
  recipient_id: string;
  type: NotificationType;
  action_type: string | null;
  reference_id: string | null;
  title: string | null;
  body: string | null;
  url: string;
  is_read: boolean;
  push_sent_at: string | null;
  created_at: string;
}

export interface DailyActivity {
  id: string;
  couple_id: string;
  user_id: string;
  activity_date: string; // YYYY-MM-DD (Asia/Ho_Chi_Minh timezone)
  activity_type: ActivityType;
  created_at: string;
}

export interface CoupleStreak {
  id: string;
  couple_id: string;
  current_streak: number;
  max_streak: number;
  water_tokens: number;
  last_calculated_date: string | null;
  created_at: string;
  updated_at: string;
}

export type SunflowerStageLevel =
  | 'start' // 0 days 🌱 Mới bắt đầu
  | 'sprout' // 1-2 days 🌱 Nảy mầm
  | 'growing' // 3-6 days 🌿 Lớn dần
  | 'blooming' // 7-13 days 🌻 Nở hoa
  | 'radiant' // 14-29 days 🌻✨ Rực rỡ
  | 'multi_flowers' // 30-99 days 🌻🌻 Nhiều hoa hơn
  | 'garden'; // 100+ days 🌻🌻👑 Vườn hướng dương
