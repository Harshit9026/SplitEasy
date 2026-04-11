'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateUPILink } from '@/lib/split-utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  toUpiId?: string;
}

interface Balance {
  phone: string;
  name: string;
  net: number;
  upiId: string;
}

export default function SettleUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('group');

  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settled, setSettled] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | 'month' | '3months'>('all');

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      setLoading(true);

      let memberPhones: string[] = [];
      let memberNames: Record<string, string> = {};

      // If group selected, get group members
      if (groupId) {
        const { data: group } = await supabase
          .from('groups')
          .select(`*, group_members(*)`)
          .eq('id', groupId)
          .single();

        if (group) {
          setGroupName(group.name);
          memberPhones = group.group_members.map((m: any) => m.phone);
          group.group_members.forEach((m: any) => {
            memberNames[m.phone] = m.name;
          });
        }
      }

      // Date cutoff
      let cutoff: Date | null = null;
      if (dateFilter === '7days') { cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); }
      else if (dateFilter === 'month') { cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 1); }
      else if (dateFilter === '3months') { cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3); }

      // Fetch all splits
      let splitsQuery = supabase
        .from('splits')
        .select(`
          id, title, total_amount, created_by, upi_id, host_upi_id, created_at,
          split_members ( id, phone_number, amount, paid )
        `);

      if (cutoff) splitsQuery = splitsQuery.gte('created_at', cutoff.toISOString());

      const { data: allSplits } = await splitsQuery;

      if (!allSplits) { setLoading(false); return; }

      // Filter splits to only those involving group members
      const relevantSplits = groupId
        ? allSplits.filter(split => {
            const phones = split.split_members?.map((m: any) => m.phone_number) || [];
            return phones.some((p: string) => memberPhones.includes(p));
          })
        : allSplits;

      // Build net balance map
      const netMap: Record<string, { net: number; upiId: string; name: string }> = {};

      const ensureKey = (phone: string, upiId = '', name = '') => {
        if (!netMap[phone]) {
          netMap[phone] = {
            net: 0,
            upiId,
            name: memberNames[phone] || name || phone,
          };
        }
      };

      for (const split of relevantSplits) {
        const members = split.split_members || [];
        const hostUpi = split.upi_id || split.host_upi_id || '';

        for (const member of members) {
          if (!member.paid) {
            // Member owes → negative
            ensureKey(member.phone_number);
            netMap[member.phone_number].net -= member.amount;

            // Host gets paid → positive
            const hostKey = hostUpi || `host_${split.created_by}`;
            ensureKey(hostKey, hostUpi);
            netMap[hostKey].net += member.amount;
            if (hostUpi) netMap[hostKey].upiId = hostUpi;
          }
        }
      }

      const balanceList = Object.entries(netMap).map(([phone, val]) => ({
        phone,
        name: val.name,
        net: val.net,
        upiId: val.upiId,
      }));

      setBalances(balanceList);

      // Calculate minimum settlements
      const creditors = balanceList
        .filter(b => b.net > 0.01)
        .map(b => ({ ...b, amount: b.net }));
      const debtors = balanceList
        .filter(b => b.net < -0.01)
        .map(b => ({ ...b, amount: Math.abs(b.net) }));

      const result: Settlement[] = [];
      let i = 0, j = 0;

      while (i < creditors.length && j < debtors.length) {
        const creditor = { ...creditors[i] };
        const debtor = { ...debtors[j] };
        const amount = Math.min(creditor.amount, debtor.amount);

        result.push({
          from: debtor.phone,
          fromName: debtor.name,
          to: creditor.phone,
          toName: creditor.name,
          amount: Math.round(amount),
          toUpiId: creditor.upiId,
        });

        creditors[i].amount -= amount;
        debtors[j].amount -= amount;
        if (creditors[i].amount < 0.01) i++;
        if (debtors[j].amount < 0.01) j++;
      }

      setSettlements(result);
      setLoading(false);
    };

    init();
  }, [router, groupId, dateFilter]);

  const handlePay = (s: Settlement) => {
    if (!s.toUpiId) return;
    window.location.href = generateUPILink(s.toUpiId, 'Settlement', s.amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href={groupId ? '/groups' : '/splits'}>
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {groupName ? `Settle Up — ${groupName}` : 'Settle Up'}
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Date filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All time' },
            { key: '7days', label: 'Last 7 days' },
            { key: 'month', label: 'This month' },
            { key: '3months', label: 'Last 3 months' },
          ].map(d => (
            <button
              key={d.key}
              onClick={() => setDateFilter(d.key as any)}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-colors
                ${dateFilter === d.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Net Balances */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Net balances
              </h2>
              {balances.length === 0 ? (
                <p className="text-muted-foreground text-sm">No balances found</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {balances.map((b, i) => (
                    <div
                      key={i}
                      className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground text-sm">{b.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{b.phone}</p>
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
                  <p className="text-sm text-green-600">No pending payments in this group</p>
                </div>
              ) : (
                settlements.map((s, i) => (
                  <div
                    key={i}
                    className={`bg-card border rounded-xl px-5 py-4 transition-all ${
                      settled.includes(String(i))
                        ? 'border-green-300 bg-green-50'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600 text-sm">
                          {s.fromName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.fromName}</p>
                          <p className="text-xs text-muted-foreground">pays</p>
                        </div>
                        <div className="flex items-center gap-1 px-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-lg font-bold text-primary">
                            ₹{s.amount.toLocaleString()}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 text-sm">
                          {s.toName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.toName}</p>
                          <p className="text-xs text-muted-foreground">receives</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {settled.includes(String(i)) ? (
                          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="h-4 w-4" /> Settled
                          </div>
                        ) : (
                          <>
                            {s.toUpiId && (
                              <Button size="sm" onClick={() => handlePay(s)}>
                                Pay ₹{s.amount} via UPI
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSettled(prev => [...prev, String(i)])}
                            >
                              Mark settled
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}