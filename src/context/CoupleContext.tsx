'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Couple, Profile, Mood } from '@/types';
import { useRouter } from 'next/navigation';

interface CoupleContextType {
  user: any | null;
  userProfile: Profile | null;
  partnerProfile: Profile | null;
  couple: Couple | null;
  partnerMood: Mood | null;
  myMood: Mood | null;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const CoupleContext = createContext<CoupleContextType>({
  user: null,
  userProfile: null,
  partnerProfile: null,
  couple: null,
  partnerMood: null,
  myMood: null,
  loading: true,
  refreshData: async () => {},
});

export function CoupleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partnerMood, setPartnerMood] = useState<Mood | null>(null);
  const [myMood, setMyMood] = useState<Mood | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const router = useRouter();

  const fetchContextData = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      // Fetch user member row
      const { data: member } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!member) {
        setLoading(false);
        return;
      }

      const coupleId = member.couple_id;

      // Fetch Couple
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .eq('id', coupleId)
        .single();
      setCouple(coupleData);

      // Fetch Couple Members & Profiles
      const { data: members } = await supabase
        .from('couple_members')
        .select('user_id, profiles(*)')
        .eq('couple_id', coupleId);

      if (members) {
        members.forEach((m: any) => {
          if (m.user_id === currentUser.id) {
            setUserProfile(m.profiles);
          } else {
            setPartnerProfile(m.profiles);
          }
        });
      }

      // Fetch Moods for today
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: moodsData } = await supabase
        .from('moods')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('mood_date', todayStr);

      if (moodsData) {
        moodsData.forEach((m: Mood) => {
          if (m.user_id === currentUser.id) setMyMood(m);
          else setPartnerMood(m);
        });
      }
    } catch (err) {
      console.error('Error in CoupleProvider fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchContextData();
  }, [fetchContextData]);

  // Subscribe to Realtime Postgres Changes for profiles, couples, and moods
  useEffect(() => {
    if (!couple?.id) return;

    const channel = supabase
      .channel(`couple-realtime-${couple.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchContextData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${couple.id}` },
        () => fetchContextData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moods', filter: `couple_id=eq.${couple.id}` },
        () => fetchContextData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id, supabase, fetchContextData]);

  return (
    <CoupleContext.Provider
      value={{
        user,
        userProfile,
        partnerProfile,
        couple,
        partnerMood,
        myMood,
        loading,
        refreshData: fetchContextData,
      }}
    >
      {children}
    </CoupleContext.Provider>
  );
}

export function useCouple() {
  return useContext(CoupleContext);
}
