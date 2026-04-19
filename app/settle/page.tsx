'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateUPILink } from '@/lib/split-utils';
import { QRCodeSVG } from 'qrcode.react';
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

function SettleUpContent() {
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

      let cutoff: Date | null = null;
      if (dateFilter === '7days') { cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); }
      else if (dateFilter === 'month') { cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 1); }
      else if (dateFilter === '3months') { cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3); }

      let splitsQuery = supabase
        .from('splits')
        .select(`
          id, title, total_amount, created_by, upi_id, host_upi_id, created_at,
          split_members ( id, phone_number, amount, paid )
        `);

      if (cutoff) splitsQuery = splitsQuery.gte('created_at', cutoff.toISOString());

      const { data: allSplits } = await splitsQuery;
      if (!allSplits) { setLoading(false); return; }

      const relevantSplits = groupId
        ? allSplits.filter(split => {
            const phones = split.split_members?.map((m: any) => m.phone_number) || [];
            return phones.some((p: string) => memberPhones.includes(p));
          })
        : allSplits;

      const netMap: Record<string, { net: number; upiId: string; name: string }> = {};

      const ensureKey = (phone: string, upiId = '', name = '') => {
        if (!netMap[phone]) {
          netMap[phone] = { net: 0, upiId, name: memberNames[phone] || name || phone };
        }
      };

      for (const split of relevantSplits) {
        const members = split.split_members || [];
        const hostUpi = split.upi_id || split.host_upi_id || '';

        for (const member of members) {
          if (!member.paid) {
            ensureKey(member.phone_number);
            netMap[member.phone_number].net -= member.amount;

            const hostKey = hostUpi || `host_${split.created_by}`;
            ensureKey(hostKey, hostUpi);
            netMap[hostKey].net += member.amount;
            if (hostUpi) netMap[hostKey].upiId = hostUpi;
          }
        }
      }

      const balanceList = Object.entries(netMap).map(([phone, val]) => ({
        phone, name: val.name, net: val.net, upiId: val.upiId,
      }));

      setBalances(balanceList);

      const creditors = balanceList.filter(b => b.net > 0.01).map(b => ({ ...b, amount: b.net }));
      const debtors = balanceList.filter(b => b.net < -0.01).map(b => ({ ...b, amount: Math.abs(b.net) }));

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
    window.location.href = generateUPILink(s.toUpiId, s.toName, s.amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href={groupId ? '/groups' : '/splits'}>
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
            {groupName ? `Settle Up — ${groupName}` : 'Settle Up'}
          </span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Date filters — scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: 'all', label: 'All time' },
            { key: '7days', label: 'Last 7 days' },
            { key: 'month', label: 'This month' },
            { key: '3months', label: 'Last 3 months' },
          ].map(d => (
            <button
              key={d.key}
              onClick={() => setDateFilter(d.key as any)}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-colors whitespace-nowrap flex-shrink-0
                ${dateFilter === d.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card border-border text-muted-foreground'}`}
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
            {/* Net balances */}
            <div className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Net balances
              </h2>
              {balances.length === 0 ? (
                <p className="text-muted-foreground text-sm">No balances found</p>
              ) : (
                <div className="space-y-2">
                  {balances.map((b, i) => (
                    <div key={i}
                      className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{b.phone}</p>
                        <p className={`text-xs mt-0.5 font-medium ${b.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {b.net >= 0 ? '↑ gets back' : '↓ owes'}
                        </p>
                      </div>
                      <p className={`text-lg font-bold flex-shrink-0 ${b.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {b.net >= 0 ? '+' : ''}₹{Math.abs(Math.round(b.net)).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settlements */}
            <div className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Minimum transactions to settle
              </h2>

              {settlements.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-2">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                  <p className="text-lg font-semibold text-green-700">All settled up!</p>
                  <p className="text-sm text-green-600">No pending payments</p>
                </div>
              ) : (
                settlements.map((s, i) => (
                  <div key={i}
                    className={`bg-card border rounded-2xl p-4 transition-all space-y-4 ${
                      settled.includes(String(i))
                        ? 'border-green-300 bg-green-50'
                        : 'border-border'
                    }`}
                  >
                    {/* Who pays who — mobile friendly row */}
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600 text-sm flex-shrink-0">
                        {s.fromName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{s.fromName}</p>
                        <p className="text-xs text-muted-foreground">pays</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-base font-bold text-primary">₹{s.amount}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 text-sm flex-shrink-0">
                        {s.toName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.toName}</p>
                        <p className="text-xs text-muted-foreground">receives</p>
                      </div>
                    </div>

                    {/* QR + pay — only if UPI available */}
                    {!settled.includes(String(i)) && s.toUpiId && (
                      <div
                        className="flex items-center gap-3 bg-muted/40 rounded-xl p-3 cursor-pointer active:scale-95 transition-transform"
                        onClick={() => handlePay(s)}
                      >
                        <div className="bg-white p-1.5 rounded-lg flex-shrink-0">
                          <QRCodeSVG
                            value={generateUPILink(s.toUpiId, s.toName, s.amount)}
                            size={52}
                            level="H"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Tap to pay ₹{s.amount} via UPI
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{s.toUpiId}</p>
                          <p className="text-xs text-primary font-medium">
                            Opens GPay / PhonePe ↗
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {settled.includes(String(i)) ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium w-full justify-center py-1">
                          <CheckCircle className="h-4 w-4" /> Settled
                        </div>
                      ) : (
                        <>
                          {s.toUpiId && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handlePay(s)}
                            >
                              Pay ₹{s.amount} via UPI
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setSettled(prev => [...prev, String(i)])}
                          >
                            Mark settled
                          </Button>
                        </>
                      )}
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

export default function SettleUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SettleUpContent />
    </Suspense>
  );
}