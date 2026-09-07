'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Couple, Profile, Mood } from '@/types';
import { User } from '@supabase/supabase-js';

interface CoupleContextType {
  user: User | null;
  userProfile: Profile | null;
  partnerProfile: Profile | null;
  couple: Couple | null;
  partnerMood: Mood | null;
  myMood: Mood | null;
  loading: boolean;
  hasPartner: boolean;
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
  hasPartner: false,
  refreshData: async () => {},
});

export function CoupleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partnerMood, setPartnerMood] = useState<Mood | null>(null);
  const [myMood, setMyMood] = useState<Mood | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const isFetchingRef = useRef(false);

  const fetchContextData = useCallback(
    async (overrideUser?: User | null) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);

      try {
        // 1. Identify current authenticated user
        let currentUser = overrideUser;
        if (currentUser === undefined) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          currentUser = authUser;
        }

        if (!currentUser) {
          setUser(null);
          setUserProfile(null);
          setPartnerProfile(null);
          setCouple(null);
          setPartnerMood(null);
          setMyMood(null);
          return;
        }

        setUser(currentUser);

        // 2. Fetch couple membership row for this user
        const { data: member, error: memberErr } = await supabase
          .from('couple_members')
          .select('couple_id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (memberErr || !member?.couple_id) {
          setUserProfile(null);
          setPartnerProfile(null);
          setCouple(null);
          setPartnerMood(null);
          setMyMood(null);
          return;
        }

        const coupleId = member.couple_id;

        // 3. Fetch Couple details, Couple Members + Profiles, and Today's Moods in parallel
        const todayStr = new Date().toISOString().split('T')[0];

        const [coupleRes, memberRowsRes, moodsRes] = await Promise.all([
          supabase.from('couples').select('*').eq('id', coupleId).single(),
          supabase.from('couple_members').select('user_id').eq('couple_id', coupleId),
          supabase.from('moods').select('*').eq('couple_id', coupleId).eq('mood_date', todayStr).order('created_at', { ascending: false }),
        ]);

        if (coupleRes.data) {
          setCouple(coupleRes.data);
        }

        if (memberRowsRes.data && memberRowsRes.data.length > 0) {
          const memberUserIds = memberRowsRes.data.map((m: any) => m.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', memberUserIds);

          let foundUserProf: Profile | null = null;
          let foundPartnerProf: Profile | null = null;

          (profilesData || []).forEach((p: Profile) => {
            if (p.id === currentUser.id) {
              foundUserProf = p;
            } else {
              foundPartnerProf = p;
            }
          });

          setUserProfile(foundUserProf);
          setPartnerProfile(foundPartnerProf);
        }

        if (moodsRes.data) {
          let foundMyMood: Mood | null = null;
          let foundPartnerMood: Mood | null = null;

          moodsRes.data.forEach((m: Mood) => {
            if (m.user_id === currentUser.id) {
              foundMyMood = m;
            } else {
              foundPartnerMood = m;
            }
          });

          setMyMood(foundMyMood);
          setPartnerMood(foundPartnerMood);
        }
      } catch (err) {
        console.error('[CoupleContext] Error fetching context data:', err);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [supabase]
  );

  // Initial load & Auth State Listener (handles rehydration on refresh & initial load)
  useEffect(() => {
    // Run initial fetch
    fetchContextData();

    // Listen to Supabase Auth State changes (SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION, SIGNED_OUT)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[CoupleContext] Auth state changed:', event, session?.user?.email);
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setPartnerProfile(null);
        setCouple(null);
        setPartnerMood(null);
        setMyMood(null);
        setLoading(false);
      } else if (session?.user) {
        fetchContextData(session.user);
      } else if (event === 'INITIAL_SESSION' && !session) {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchContextData]);

  // Subscribe to Realtime changes for profiles, couples, and moods when couple.id is available
  useEffect(() => {
    if (!couple?.id) return;

    const channelName = `couple-context-realtime-${couple.id}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
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

  const hasPartner = !!partnerProfile;

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
        hasPartner,
        refreshData: async () => {
          isFetchingRef.current = false;
          await fetchContextData();
        },
      }}
    >
      {children}
    </CoupleContext.Provider>
  );
}

export function useCouple() {
  return useContext(CoupleContext);
}
