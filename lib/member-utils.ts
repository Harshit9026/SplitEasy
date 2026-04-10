import { createClient } from './supabase/client';

// Call this right after login — links the user to any splits
// they were added to via phone number
export async function claimMemberships(phoneNumber: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Link all split_members rows with this phone to this user account
  await supabase
    .from('split_members')
    .update({ user_id: user.id })
    .eq('phone_number', phoneNumber)
    .is('user_id', null);
}

// Get all splits where user is a member (not creator)
export async function getMemberSplits() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('split_members')
    .select(`
      id,
      amount,
      paid,
      splits (
        id,
        title,
        total_amount,
        status,
        created_at
      )
    `)
    .eq('user_id', user.id);

  if (error) return [];
  return data?.map((m: any) => ({
    ...m.splits,
    my_amount: m.amount,
    my_paid: m.paid,
    role: 'member'
  })) || [];
}