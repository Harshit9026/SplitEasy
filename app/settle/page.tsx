'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { calculateSettlements } from '@/lib/settle-utils';
import { generateUPILink } from '@/lib/split-utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface NetBalance {
  phone: string;
  net: number; // positive = owed to them, negative = they owe
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
  toUpiId?: string;
}

export default function SettleUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<NetBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settled, setSettled] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      // Fetch all splits created by or involving this user
      const { data: createdSplits } = await supabase
        .from('splits')
        .select(`
          id, title, total_amount, created_by, upi_id, host_upi_id,
          split_members ( id, phone_number, amount, paid )
        `)
        .order('created_at', { ascending: false });

      const { data: memberSplits } = await supabase
        .from('split_members')
        .select(`
          id, phone_number, amount, paid,
          splits ( id, title, total_amount, created_by, upi_id, host_upi_id,
            split_members ( id, phone_number, amount, paid )
          )
        `)
        .eq('user_id', user.id);

      // Combine all splits
      const allSplits = [
        ...(createdSplits || []),
        ...(memberSplits?.map((m: any) => m.splits).filter(Boolean) || []),
      ];

      // Remove duplicates
      const uniqueSplits = allSplits.filter(
        (s, i, arr) => s && arr.findIndex(x => x?.id === s?.id) === i
      );

      // Build net balance map per phone number
      // Key: phone, Value: net (positive = owed to them)
      const netMap: Record<string, { net: number; upiId: string }> = {};

      for (const split of uniqueSplits) {
        if (!split) continue;
        const members = split.split_members || [];
        const hostUpi = split.upi_id || split.host_upi_id || '';

        // Host paid the full bill
        // Each unpaid member owes the host
        for (const member of members) {
          if (!member.paid) {
            // member owes money → negative balance for member
            if (!netMap[member.phone_number]) {
              netMap[member.phone_number] = { net: 0, upiId: '' };
            }
            netMap[member.phone_number].net -= member.amount;

            // host is owed money → positive balance for host
            // We identify host by created_by but track by upi
            const hostKey = hostUpi || `host_${split.created_by}`;
            if (!netMap[hostKey]) {
              netMap[hostKey] = { net: 0, upiId: hostUpi };
            }
            netMap[hostKey].net += member.amount;
            netMap[hostKey].upiId = hostUpi;
          }
        }
      }

      // Convert to array
      const balanceList = Object.entries(netMap).map(([phone, val]) => ({
        phone,
        net: val.net,
        upiId: val.upiId,
      }));

      setBalances(balanceList);

      // Calculate minimum settlements
      const balanceRecord: Record<string, number> = {};
      balanceList.forEach(b => { balanceRecord[b.phone] = b.net; });

      const creditors: { phone: string; amount: number; upiId: string }[] = [];
      const debtors: { phone: string; amount: number }[] = [];

      for (const b of balanceList) {
        if (b.net > 0.01) creditors.push({ phone: b.phone, amount: b.net, upiId: b.upiId });
        else if (b.net < -0.01) debtors.push({ phone: b.phone, amount: Math.abs(b.net) });
      }

      const result: Settlement[] = [];
      let i = 0, j = 0;
      while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        const amount = Math.min(creditor.amount, debtor.amount);

        result.push({
          from: debtor.phone,
          to: creditor.phone,
          amount: Math.round(amount),
          toUpiId: creditor.upiId,
        });

        creditor.amount -= amount;
        debtor.amount -= amount;
        if (creditor.amount < 0.01) i++;
        if (debtor.amount < 0.01) j++;
      }

      setSettlements(result);
      setLoading(false);
    };

    init();
  }, [router]);

  const handlePay = (settlement: Settlement) => {
    if (!settlement.toUpiId) return;
    const upiLink = generateUPILink(
      settlement.toUpiId,
      'Settlement',
      settlement.amount
    );
    window.location.href = upiLink;
  };

  const handleMarkSettled = (index: number) => {
    setSettled(prev => [...prev, String(index)]);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/splits">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Settle Up
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Net Balances */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Net balances
          </h2>
          {balances.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No balances to show yet
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {balances.map((b, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm truncate max-w-[160px]">
                      {b.phone}
                    </p>
                    <p className={`text-xs mt-0.5 ${b.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {b.net >= 0 ? 'gets back' : 'owes'}
                    </p>
                  </div>
                  <p className={`text-xl font-bold ${b.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {b.net >= 0 ? '+' : ''}₹{Math.abs(Math.round(b.net)).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settlements */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Minimum transactions to settle
          </h2>

          {settlements.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-2">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
              <p className="text-lg font-semibold text-green-700">All settled up!</p>
              <p className="text-sm text-green-600">No pending payments in the group</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settlements.map((s, i) => (
                <div
                  key={i}
                  className={`bg-card border rounded-xl px-5 py-4 transition-all ${
                    settled.includes(String(i))
                      ? 'border-green-300 bg-green-50'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600 text-sm flex-shrink-0">
                        {s.from[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[100px]">
                          {s.from}
                        </p>
                        <p className="text-xs text-muted-foreground">pays</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-lg font-bold text-primary">
                          ₹{s.amount.toLocaleString()}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 text-sm flex-shrink-0">
                        {s.to[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[100px]">
                          {s.to}
                        </p>
                        <p className="text-xs text-muted-foreground">receives</p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {settled.includes(String(i)) ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <CheckCircle className="h-4 w-4" />
                          Settled
                        </div>
                      ) : (
                        <>
                          {s.toUpiId && (
                            <Button
                              size="sm"
                              onClick={() => handlePay(s)}
                            >
                              Pay ₹{s.amount} via UPI
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkSettled(i)}
                          >
                            Mark settled
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}