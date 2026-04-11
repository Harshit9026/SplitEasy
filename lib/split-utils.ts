import { createClient } from './supabase/client';

export interface Split {
  id: string;
  created_by: string;
  title: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface SplitMember {
  id: string;
  split_id: string;
  user_id?: string;
  phone_number?: string;
  amount: number;
  paid: boolean;
  paid_at?: string;
  created_at: string;
}

// Create a new split
export async function createSplit(
  title: string,
  total_amount: number,
  description?: string
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('splits')
    .insert({
      created_by: user.id,
      title,
      total_amount,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get all splits for current user
export async function getUserSplits() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('splits')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Get a single split with members
export async function getSplitWithMembers(splitId: string) {
  const supabase = createClient();
  const { data: split, error: splitError } = await supabase
    .from('splits')
    .select('*')
    .eq('id', splitId)
    .single();

  if (splitError) throw splitError;

  const { data: members, error: membersError } = await supabase
    .from('split_members')
    .select('*')
    .eq('split_id', splitId)
    .order('created_at', { ascending: true });

  if (membersError) throw membersError;

  return { split, members };
}

// Add member to split
export async function addSplitMember(
  splitId: string,
  phoneNumber: string,
  amount: number,
  email?: string
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('split_members')
    .insert({
      split_id: splitId,
      phone_number: phoneNumber,
      amount,
      email: email || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update member payment status
export async function updateMemberPaymentStatus(
  memberId: string,
  paid: boolean
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('split_members')
    .update({
      paid,
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update split status
export async function updateSplitStatus(
  splitId: string,
  status: 'pending' | 'completed' | 'cancelled'
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('splits')
    .update({ status })
    .eq('id', splitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Generate UPI deeplink
export function generateUPILink(
  upiId: string,
  name: string,
  amount: number
): string {
  const encodedName = encodeURIComponent(name);
  const encodedNote = encodeURIComponent('Payment for split bill');
  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&tn=${encodedNote}&tr=${Date.now()}`;
}

// Generate WhatsApp message
export function generateWhatsAppMessage(
  splitTitle: string,
  amount: number,
  splitLink: string
): string {
  return `Hey! 👋 You owe ₹${amount} for "${splitTitle}". Pay here: ${splitLink}`;
}