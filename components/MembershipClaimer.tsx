'use client';

import { useEffect } from 'react';
import { claimMyMemberships } from '@/lib/claim-memberships';
import { createClient } from '@/lib/supabase/client';

export default function MembershipClaimer() {
  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await claimMyMemberships();
      }
    };
    run();
  }, []);

  return null;
}