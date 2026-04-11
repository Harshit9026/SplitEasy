import { createClient } from './supabase/client';

export async function claimMyMemberships() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !user.email) return;

  const { data: unclaimedRows } = await supabase
    .from('split_members')
    .select('id')
    .eq('email', user.email)
    .is('user_id', null);

  if (!unclaimedRows || unclaimedRows.length === 0) return;

  const ids = unclaimedRows.map((r: any) => r.id);
  await supabase
    .from('split_members')
    .update({ user_id: user.id })
    .in('id', ids);
}