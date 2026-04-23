import { createClient } from './supabase/client';

export async function claimMemberships(phoneNumber: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('split_members')
    .update({ user_id: user.id })
    .eq('phone_number', phoneNumber)
    .is('user_id', null);
}

export async function getMemberSplits() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Single query — join split_members with splits directly
    // This works because split_members RLS allows user to see their own rows
    // and splits RLS now allows access if user is a member
    const { data, error } = await supabase
      .from('split_members')
      .select(`
        id,
        amount,
        paid,
        split_id,
        splits (
          id,
          title,
          total_amount,
          status,
          created_at,
          created_by
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('getMemberSplits error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data
      .filter((m: any) => m.splits) // make sure split exists
      .filter((m: any) => m.splits.created_by !== user.id) // exclude own splits
      .map((m: any) => ({
        ...m.splits,
        my_amount: m.amount,
        my_paid: m.paid,
        role: 'member',
      }));

  } catch (err) {
    console.error('getMemberSplits error:', err);
    return [];
  }
}