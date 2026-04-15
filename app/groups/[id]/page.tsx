'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateUPILink } from '@/lib/split-utils';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Loader2, Plus, CheckCircle,
  ArrowRight, MessageCircle
} from 'lucide-react';
import Link from 'next/link';

interface GroupMember {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface Split {
  id: string;
  title: string;
  total_amount: number;
  created_at: string;
  upi_id: string;
  host_upi_id: string;
  split_members: {
    id: string;
    phone_number: string;
    amount: number;
    paid: boolean;
    paid_at?: string;
  }[];
}

interface PersonBalance {
  name: string;
  phone: string;
  amount: number;
  unpaidCount: number;
  upiId: string;
}

interface Settlement {
  fromName: string;
  fromPhone: string;
  toName: string;
  toPhone: string;
  amount: number;
  toUpiId: string;
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-teal-500', 'bg-orange-500',
  'bg-amber-500', 'bg-pink-500', 'bg-blue-500'
];

type Tab = 'chat' | 'expenses';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [tab, setTab] = useState<Tab>('chat');
  const [owedByMe, setOwedByMe] = useState<PersonBalance[]>([]);
  const [owedToMe, setOwedToMe] = useState<PersonBalance[]>([]);
  const [totalOwedByMe, setTotalOwedByMe] = useState(0);
  const [totalOwedToMe, setTotalOwedToMe] = useState(0);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settled, setSettled] = useState<string[]>([]);
  const [myPhone, setMyPhone] = useState('');
  const [showSettleUp, setShowSettleUp] = useState(false);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      // Get group info
      const { data: group } = await supabase
        .from('groups')
        .select(`*, group_members(*)`)
        .eq('id', groupId)
        .single();

      if (!group) { router.push('/groups'); return; }

      setGroupName(group.name);
      setGroupMembers(group.group_members || []);

      // Find current user's phone in group
      const myMember = group.group_members?.find(
        (m: GroupMember) => m.email === user.email
      );
      const currentPhone = myMember?.phone || user.email || '';
      setMyPhone(currentPhone);

      // Get all splits involving this group's members
      const memberPhones = group.group_members.map((m: GroupMember) => m.phone);

      const { data: allSplits } = await supabase
        .from('splits')
        .select(`
          id, title, total_amount, created_at, upi_id, host_upi_id, created_by,
          split_members ( id, phone_number, amount, paid, paid_at )
        `)
        .order('created_at', { ascending: false });

      // Filter splits involving group members
      const groupSplits = (allSplits || []).filter(split => {
        const phones = split.split_members?.map((m: any) => m.phone_number) || [];
        return phones.some((p: string) => memberPhones.includes(p));
      });

      setSplits(groupSplits);

      // Build name map
      const nameMap: Record<string, string> = {};
      const upiMap: Record<string, string> = {};
      group.group_members.forEach((m: GroupMember) => {
        nameMap[m.phone] = m.name;
      });

      // Calculate balances
      const owedByMeMap: Record<string, { amount: number; count: number; upiId: string }> = {};
      const owedToMeMap: Record<string, { amount: number; count: number; upiId: string }> = {};

      for (const split of groupSplits) {
        const hostUpi = split.upi_id || split.host_upi_id || '';

        for (const member of split.split_members || []) {
          if (member.paid) continue;

          // I owe this person (I am a member, they are host)
          if (member.phone_number === currentPhone) {
            const hostPhone = `host_${split.created_by}`;
            if (!owedByMeMap[hostPhone]) {
              owedByMeMap[hostPhone] = { amount: 0, count: 0, upiId: hostUpi };
            }
            owedByMeMap[hostPhone].amount += member.amount;
            owedByMeMap[hostPhone].count += 1;
            owedByMeMap[hostPhone].upiId = hostUpi;
          }

          // They owe me (I am host, they are member)
          // Check if this split was created by current user
        }
      }

      // Simpler approach — track per phone
      const netMap: Record<string, {
        net: number; name: string; upiId: string; count: number
      }> = {};

      for (const split of groupSplits) {
        const hostUpi = split.upi_id || split.host_upi_id || '';

        for (const member of split.split_members || []) {
          if (member.paid) continue;
          const phone = member.phone_number;
          const name = nameMap[phone] || phone;

          if (!netMap[phone]) {
            netMap[phone] = { net: 0, name, upiId: '', count: 0 };
          }
          // member owes → negative for them
          netMap[phone].net -= member.amount;
          netMap[phone].count += 1;

          // host gets back → positive for host key
          const hostKey = hostUpi || `host_${split.created_by}`;
          if (!netMap[hostKey]) {
            netMap[hostKey] = { net: 0, name: nameMap[hostKey] || 'Host', upiId: hostUpi, count: 0 };
          }
          netMap[hostKey].net += member.amount;
          if (hostUpi) netMap[hostKey].upiId = hostUpi;
        }
      }

      // Separate owed by me vs owed to me
      const byMe: PersonBalance[] = [];
      const toMe: PersonBalance[] = [];
      let sumByMe = 0;
      let sumToMe = 0;

      // For display — who owes whom relative to current user
      for (const split of groupSplits) {
        const hostUpi = split.upi_id || split.host_upi_id || '';

        for (const member of split.split_members || []) {
          if (member.paid) continue;

          // I am the member — I owe the host
          if (member.phone_number === currentPhone) {
            // Find who the host is
            const existing = byMe.find(b => b.phone === `host_${split.created_by}`);
            if (existing) {
              existing.amount += member.amount;
              existing.unpaidCount += 1;
            } else {
              byMe.push({
                name: nameMap[`host_${split.created_by}`] || 'Group Host',
                phone: `host_${split.created_by}`,
                amount: member.amount,
                unpaidCount: 1,
                upiId: hostUpi,
              });
            }
            sumByMe += member.amount;
          }
        }

        // I am the host — members owe me
        // Check created_by matches current user
      }

      // Get splits created by current user (where members owe me)
      const { data: mySplits } = await supabase
        .from('splits')
        .select(`
          id, title, upi_id, host_upi_id,
          split_members ( phone_number, amount, paid )
        `)
        .eq('created_by', user.id);

      for (const split of mySplits || []) {
        for (const member of split.split_members || []) {
          if (member.paid) continue;
          if (!memberPhones.includes(member.phone_number)) continue;

          const name = nameMap[member.phone_number] || member.phone_number;
          const existing = toMe.find(t => t.phone === member.phone_number);
          if (existing) {
            existing.amount += member.amount;
            existing.unpaidCount += 1;
          } else {
            toMe.push({
              name,
              phone: member.phone_number,
              amount: member.amount,
              unpaidCount: 1,
              upiId: '',
            });
          }
          sumToMe += member.amount;
        }
      }

      setOwedByMe(byMe);
      setOwedToMe(toMe);
      setTotalOwedByMe(sumByMe);
      setTotalOwedToMe(sumToMe);

      // Calculate settlements
      const balanceList = Object.entries(netMap).map(([phone, val]) => ({
        phone,
        name: val.name,
        net: val.net,
        upiId: val.upiId,
      }));

      const creditors = balanceList.filter(b => b.net > 0.01).map(b => ({ ...b, amount: b.net }));
      const debtors = balanceList.filter(b => b.net < -0.01).map(b => ({ ...b, amount: Math.abs(b.net) }));

      const result: Settlement[] = [];
      let i = 0, j = 0;
      while (i < creditors.length && j < debtors.length) {
        const c = creditors[i];
        const d = debtors[j];
        const amount = Math.min(c.amount, d.amount);
        result.push({
          fromName: d.name,
          fromPhone: d.phone,
          toName: c.name,
          toPhone: c.phone,
          amount: Math.round(amount),
          toUpiId: c.upiId,
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
  }, [groupId, router]);

  const getMemberName = (phone: string) => {
    return groupMembers.find(m => m.phone === phone)?.name || phone;
  };

  const getPaidCount = (split: Split) =>
    split.split_members?.filter(m => m.paid).length || 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/groups">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          {/* Group avatar stack */}
          <div className="flex -space-x-2">
            {groupMembers.slice(0, 3).map((m, i) => (
              <div key={i}
                className={`w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-white font-bold text-xs ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                {m.name[0]?.toUpperCase()}
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">{groupName}</p>
            <p className="text-xs text-muted-foreground">{groupMembers.length} members</p>
          </div>
          <Link href="/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add expense
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex border-t border-border">
          {(['chat', 'expenses'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
          {splits.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <p className="text-4xl">🧾</p>
              <p className="font-semibold text-foreground">No expenses yet</p>
              <p className="text-sm text-muted-foreground">Add your first group expense</p>
              <Link href="/create">
                <Button size="sm" className="mt-2">
                  <Plus className="h-4 w-4 mr-1" /> Add expense
                </Button>
              </Link>
            </div>
          ) : (
            splits.map(split => {
              const paidCount = getPaidCount(split);
              const totalCount = split.split_members?.length || 0;
              const progress = totalCount ? (paidCount / totalCount) * 100 : 0;
              const hostUpi = split.upi_id || split.host_upi_id || '';

              return (
                <Link key={split.id} href={`/splits/${split.id}`}>
                  <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all cursor-pointer">
                    {/* Who added */}
                    <p className="text-xs text-muted-foreground mb-3 font-medium">
                      Split request
                    </p>

                    {/* Amount */}
                    <p className="text-3xl font-bold text-foreground mb-3">
                      ₹{split.total_amount.toLocaleString()}
                    </p>

                    {/* Member avatars */}
                    <div className="flex -space-x-2 mb-3">
                      {split.split_members?.slice(0, 6).map((m, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-white font-bold text-xs ${
                            m.paid ? 'bg-green-500' : AVATAR_COLORS[i % AVATAR_COLORS.length]
                          }`}
                          title={getMemberName(m.phone_number)}
                        >
                          {getMemberName(m.phone_number)[0]?.toUpperCase()}
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1 mb-3">
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {paidCount}/{totalCount} paid
                      </p>
                    </div>

                    {/* Time + Pay button */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {progress < 100 ? '⏱ Unpaid' : '✅ Settled'} · {new Date(split.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {hostUpi && progress < 100 && (
                        <button
                          onClick={e => {
                            e.preventDefault();
                            window.location.href = generateUPILink(hostUpi, split.title, split.total_amount);
                          }}
                          className="bg-blue-50 text-blue-600 font-medium text-sm px-5 py-2 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">

          {/* Summary bar */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-red-500">
                  ₹{totalOwedByMe.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Owed by you</p>
              </div>
              <div className="p-5 text-center">
                <p className="text-2xl font-bold text-green-600">
                  ₹{totalOwedToMe.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Owed to you</p>
              </div>
            </div>
          </div>

          {/* Owed by you */}
          {owedByMe.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Owed by you</p>
              {owedByMe.map((person, i) => (
                <div key={i} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {person.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.unpaidCount} unpaid expense{person.unpaidCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-500">₹{person.amount.toLocaleString()}</p>
                    {person.upiId && (
                      <button
                        onClick={() => window.location.href = generateUPILink(person.upiId, 'Group settlement', person.amount)}
                        className="text-xs text-blue-600 mt-0.5"
                      >
                        Pay now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Owed to you */}
          {owedToMe.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {owedToMe.length} people owe you
              </p>
              {owedToMe.map((person, i) => (
                <div key={i} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {person.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.unpaidCount} unpaid expense{person.unpaidCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="font-bold text-green-600">₹{person.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {owedByMe.length === 0 && owedToMe.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-semibold text-foreground">All settled up!</p>
              <p className="text-sm text-muted-foreground">No pending payments in this group</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom bar — Settle up button */}
      <div className="sticky bottom-0 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          <Link href="/create" className="flex-1">
            <Button variant="outline" className="w-full">
              Split expense
            </Button>
          </Link>
          <Button
            className="flex-1"
            onClick={() => setShowSettleUp(true)}
          >
            Settle up
          </Button>
        </div>
      </div>

      {/* Settle Up Modal */}
      {showSettleUp && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setShowSettleUp(false)}
        >
          <div
            className="bg-background rounded-t-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-lg">Settle up</h2>
              <button onClick={() => setShowSettleUp(false)} className="text-muted-foreground">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {settlements.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
                  <p className="font-semibold text-green-700">All settled!</p>
                  <p className="text-sm text-muted-foreground">No pending payments</p>
                </div>
              ) : (
                settlements.map((s, i) => (
                  <div key={i} className={`border rounded-xl px-4 py-4 transition-all ${
                    settled.includes(String(i)) ? 'border-green-300 bg-green-50' : 'border-border bg-card'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600 text-sm">
                        {s.fromName[0]?.toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <div>
                          <p className="text-sm font-medium">{s.fromName}</p>
                          <p className="text-xs text-muted-foreground">pays</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                        <p className="text-lg font-bold text-primary">₹{s.amount}</p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                        <div>
                          <p className="text-sm font-medium">{s.toName}</p>
                          <p className="text-xs text-muted-foreground">receives</p>
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 text-sm">
                        {s.toName[0]?.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {settled.includes(String(i)) ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium w-full justify-center">
                          <CheckCircle className="h-4 w-4" /> Settled
                        </div>
                      ) : (
                        <>
                          {s.toUpiId && (
                            <Button size="sm" className="flex-1"
                              onClick={() => window.location.href = generateUPILink(s.toUpiId, 'Settlement', s.amount)}>
                              Pay ₹{s.amount} via UPI
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="flex-1"
                            onClick={() => setSettled(prev => [...prev, String(i)])}>
                            Mark settled
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}