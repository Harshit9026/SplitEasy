import { createClient } from './supabase/client';

export interface Balance {
  userId: string;
  name: string;
  phone: string;
  amount: number; // positive = owed to them, negative = they owe
}

export interface Settlement {
  from: string;
  fromPhone: string;
  to: string;
  toPhone: string;
  amount: number;
}

export async function getGroupBalances(memberPhones: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { balances: [], settlements: [] };

  // Get all splits involving these people
  const { data: allSplits } = await supabase
    .from('splits')
    .select(`
      id,
      title,
      total_amount,
      created_by,
      upi_id,
      host_upi_id,
      split_members (
        id,
        phone_number,
        amount,
        paid
      )
    `)
    .order('created_at', { ascending: false });

  if (!allSplits) return { balances: [], settlements: [] };

  // Build a net balance map: phone → net amount
  // positive = people owe this person
  // negative = this person owes others
  const balanceMap: Record<string, number> = {};

  for (const split of allSplits) {
    const members = split.split_members || [];
    
    // Only process splits that involve our group members
    const relevantMembers = members.filter((m: any) =>
      memberPhones.includes(m.phone_number)
    );
    if (relevantMembers.length === 0) continue;

    // Find who paid (host) — we need their phone
    // For now we track by split_members who haven't paid yet
    for (const member of relevantMembers) {
      if (!member.paid) {
        // This member owes money — negative balance
        balanceMap[member.phone_number] =
          (balanceMap[member.phone_number] || 0) - member.amount;
      }
    }
  }

  return balanceMap;
}

// Core settle-up algorithm
// Takes net balances and returns minimum transactions
export function calculateSettlements(
  balances: Record<string, number>
): Settlement[] {
  const creditors: { phone: string; amount: number }[] = [];
  const debtors: { phone: string; amount: number }[] = [];

  for (const [phone, amount] of Object.entries(balances)) {
    if (amount > 0.01) creditors.push({ phone, amount });
    else if (amount < -0.01) debtors.push({ phone, amount: Math.abs(amount) });
  }

  const settlements: Settlement[] = [];

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.amount, debtor.amount);

    settlements.push({
      from: debtor.phone,
      fromPhone: debtor.phone,
      to: creditor.phone,
      toPhone: creditor.phone,
      amount: Math.round(amount),
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return settlements;
}