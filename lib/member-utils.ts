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

  // Step 1: get member rows
  const { data: members, error } = await supabase
    .from('split_members')
    .select('id, amount, paid, split_id')
    .eq('user_id', user.id);

  if (error || !members?.length) return [];

  // Step 2: get splits separately
  const splitIds = members.map(m => m.split_id);
  const { data: splits } = await supabase
    .from('splits')
    .select('id, title, total_amount, status, created_at')
    .in('id', splitIds);

  if (!splits) return [];

  // Step 3: join in JS
  return members.map(m => {
    const split = splits.find(s => s.id === m.split_id);
    return {
      ...split,
      my_amount: m.amount,
      my_paid: m.paid,
      role: 'member',
    };
  }).filter(m => m.id);
}