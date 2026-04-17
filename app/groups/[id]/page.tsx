'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Loader2, Plus, CheckCircle, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';


interface GroupMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  upi_id?: string;
}

interface ExpenseMember {
  id: string;
  member_phone: string;
  member_name: string;
  amount: number;
  paid: boolean;
  paid_at?: string;
}

interface Expense {
  id: string;
  title: string;
  total_amount: number;
  paid_by_phone: string;
  paid_by_name: string;
  split_type: string;
  created_at: string;
  group_expense_members: ExpenseMember[];
}

interface PersonBalance {
  name: string;
  phone: string;
  amount: number;
  unpaidCount: number;
}

interface Settlement {
  fromName: string;
  fromPhone: string;
  toName: string;
  toPhone: string;
  amount: number;
}

const COLORS = ['#8B5CF6','#14B8A6','#F97316','#F59E0B','#EC4899','#3B82F6'];
type Tab = 'chat' | 'expenses';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tab, setTab] = useState<Tab>('chat');
  const [myPhone, setMyPhone] = useState('');
  const [owedByMe, setOwedByMe] = useState<PersonBalance[]>([]);
  const [owedToMe, setOwedToMe] = useState<PersonBalance[]>([]);
  const [totalOwedByMe, setTotalOwedByMe] = useState(0);
  const [totalOwedToMe, setTotalOwedToMe] = useState(0);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settled, setSettled] = useState<string[]>([]);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [upiMap, setUpiMap] = useState<Record<string, string>>({});

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const { data: group } = await supabase
      .from('groups')
      .select(`*, group_members(*)`)
      .eq('id', groupId)
      .single();

    if (!group) { router.push('/groups'); return; }

    setGroupName(group.name);
    setGroupMembers(group.group_members || []);

    // Build UPI map — phone → upi_id
const upiMap: Record<string, string> = {};
group.group_members.forEach((m: GroupMember) => {
  if (m.upi_id) upiMap[m.phone] = m.upi_id;
});
setUpiMap(upiMap);

    const me = group.group_members?.find(
      (m: GroupMember) => m.email === user.email
    );
    const currentPhone = me?.phone || '';
    setMyPhone(currentPhone);

    // Load group expenses only
    const { data: expData } = await supabase
      .from('group_expenses')
      .select(`*, group_expense_members(*)`)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    const expList = expData || [];
    setExpenses(expList);

    // Build name map
    const nameMap: Record<string, string> = {};
    group.group_members.forEach((m: GroupMember) => {
      nameMap[m.phone] = m.name;
    });

    // Calculate balances from group expenses only
    const netMap: Record<string, { net: number; name: string }> = {};

    const ensureKey = (phone: string, name: string) => {
      if (!netMap[phone]) netMap[phone] = { net: 0, name };
    };

    for (const expense of expList) {
      for (const member of expense.group_expense_members || []) {
        if (member.paid) continue;
        const name = nameMap[member.member_phone] || member.member_name;

        // Member owes payer
        ensureKey(member.member_phone, name);
        netMap[member.member_phone].net -= member.amount;

        // Payer is owed
        const payerName = nameMap[expense.paid_by_phone] || expense.paid_by_name;
        ensureKey(expense.paid_by_phone, payerName);
        netMap[expense.paid_by_phone].net += member.amount;
      }
    }

    // Owed by me / owed to me
    const byMe: PersonBalance[] = [];
    const toMe: PersonBalance[] = [];
    let sumByMe = 0;
    let sumToMe = 0;

    for (const expense of expList) {
      const payerPhone = expense.paid_by_phone;
      const payerName = nameMap[payerPhone] || expense.paid_by_name;

      for (const member of expense.group_expense_members || []) {
        if (member.paid) continue;

        // I owe someone
        if (member.member_phone === currentPhone && payerPhone !== currentPhone) {
          const existing = byMe.find(b => b.phone === payerPhone);
          if (existing) {
            existing.amount += member.amount;
            existing.unpaidCount += 1;
          } else {
            byMe.push({ name: payerName, phone: payerPhone, amount: member.amount, unpaidCount: 1 });
          }
          sumByMe += member.amount;
        }

        // Someone owes me
        if (payerPhone === currentPhone && member.member_phone !== currentPhone) {
          const memberName = nameMap[member.member_phone] || member.member_name;
          const existing = toMe.find(t => t.phone === member.member_phone);
          if (existing) {
            existing.amount += member.amount;
            existing.unpaidCount += 1;
          } else {
            toMe.push({ name: memberName, phone: member.member_phone, amount: member.amount, unpaidCount: 1 });
          }
          sumToMe += member.amount;
        }
      }
    }

    setOwedByMe(byMe);
    setOwedToMe(toMe);
    setTotalOwedByMe(sumByMe);
    setTotalOwedToMe(sumToMe);

    // Settlements
    const balanceList = Object.entries(netMap).map(([phone, val]) => ({
      phone, name: val.name, net: val.net
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
        fromName: d.name, fromPhone: d.phone,
        toName: c.name, toPhone: c.phone,
        amount: Math.round(amount),
      });
      creditors[i].amount -= amount;
      debtors[j].amount -= amount;
      if (creditors[i].amount < 0.01) i++;
      if (debtors[j].amount < 0.01) j++;
    }

    setSettlements(result);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [groupId]);

  const handleMarkPaid = async (expenseId: string, memberId: string) => {
    setUpdatingMember(memberId);
    const supabase = createClient();
    await supabase
      .from('group_expense_members')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('id', memberId);
    await loadData();
    setUpdatingMember(null);
  };

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
          <div className="flex -space-x-2">
            {groupMembers.slice(0, 3).map((m, i) => (
              <div key={i}
                className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-white font-bold text-xs"
                style={{ background: COLORS[i % COLORS.length] }}>
                {m.name[0]?.toUpperCase()}
              </div>
            ))}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">{groupName}</p>
            <p className="text-xs text-muted-foreground">{groupMembers.length} members</p>
          </div>
          <Link href={`/groups/${groupId}/add-expense`}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add expense
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex border-t border-border">
          {(['chat', 'expenses'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4 pb-24">
          {expenses.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <p className="text-4xl">🧾</p>
              <p className="font-semibold text-foreground">No expenses yet</p>
              <p className="text-sm text-muted-foreground">Add your first group expense</p>
              <Link href={`/groups/${groupId}/add-expense`}>
                <Button size="sm" className="mt-2">
                  <Plus className="h-4 w-4 mr-1" /> Add expense
                </Button>
              </Link>
            </div>
          ) : (
            expenses.map(expense => {
              const members = expense.group_expense_members || [];
              const paidCount = members.filter(m => m.paid).length;
              const totalCount = members.length;
              const progress = totalCount ? (paidCount / totalCount) * 100 : 0;
              const isFullyPaid = progress === 100;

              const myRow = members.find(m => m.member_phone === myPhone);
              const iPaid = expense.paid_by_phone === myPhone;

              return (
                <div key={expense.id}
                  className="bg-card border border-border rounded-2xl p-5 space-y-3">

                  {/* Who paid */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ background: COLORS[groupMembers.findIndex(m => m.phone === expense.paid_by_phone) % COLORS.length] }}>
                      {expense.paid_by_name[0]?.toUpperCase()}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {expense.paid_by_phone === myPhone ? 'You' : expense.paid_by_name} paid
                    </p>
                  </div>

                  {/* Title + Amount */}
                  <div>
                    <p className="text-xs text-muted-foreground">{expense.title}</p>
                    <p className="text-3xl font-bold text-foreground">
                      ₹{expense.total_amount.toLocaleString()}
                    </p>
                  </div>

                  {/* Member avatars */}
                  <div className="flex -space-x-2">
                    {members.map((m, i) => (
                      <div key={i}
                        className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-white font-bold text-xs"
                        style={{ background: m.paid ? '#22C55E' : COLORS[i % COLORS.length] }}
                        title={`${m.member_name} — ${m.paid ? 'paid' : `owes ₹${m.amount}`}`}>
                        {m.member_name[0]?.toUpperCase()}
                      </div>
                    ))}
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {paidCount}/{totalCount} paid · {new Date(expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  {/* Action area */}
                  {!isFullyPaid ? (
                    <div className="space-y-3 pt-1">
                      {/* Show payer's QR — tap to pay directly */}
                      {upiMap[expense.paid_by_phone] && (
                        <div
                          className="flex items-center gap-4 bg-muted/30 rounded-xl p-3 cursor-pointer active:scale-95 transition-transform"
                          onClick={() => {
                            const upiLink = `upi://pay?pa=${upiMap[expense.paid_by_phone]}&pn=${encodeURIComponent(expense.paid_by_name)}&am=${myRow?.amount || expense.total_amount}&tn=${encodeURIComponent(expense.title)}&cu=INR`;
                            window.location.href = upiLink;
                          }}
                        >
                          <div className="bg-white p-2 rounded-lg flex-shrink-0">
                            <QRCodeSVG
                              value={`upi://pay?pa=${upiMap[expense.paid_by_phone]}&pn=${encodeURIComponent(expense.paid_by_name)}&am=${myRow?.amount || expense.total_amount}&tn=${encodeURIComponent(expense.title)}&cu=INR`}
                              size={64}
                              level="H"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              Tap QR to pay ₹{myRow?.amount || expense.total_amount}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {upiMap[expense.paid_by_phone]}
                            </p>
                            <p className="text-xs text-primary font-medium mt-0.5">
                              Opens GPay / PhonePe automatically ↗
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Mark paid button */}
                      {myRow && !myRow.paid && !iPaid && (
                        <button
                          onClick={() => handleMarkPaid(expense.id, myRow.id)}
                          disabled={updatingMember === myRow.id}
                          className="w-full bg-blue-50 text-blue-600 font-medium text-sm py-2.5 rounded-xl hover:bg-blue-100 transition-colors"
                        >
                          {updatingMember === myRow.id
                            ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            : "I've paid — mark as done"
                          }
                        </button>
                      )}

                      {iPaid && (
                        <p className="text-xs text-center text-muted-foreground">
                          Waiting for {members.filter(m => !m.paid && m.member_phone !== myPhone).length} people to pay
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                      <CheckCircle className="h-3 w-3" /> All settled
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6 pb-24">

          {/* Summary */}
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
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}>
                    {person.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.unpaidCount} unpaid expense{person.unpaidCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="font-bold text-red-500">₹{Math.round(person.amount).toLocaleString()}</p>
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
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}>
                    {person.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.unpaidCount} unpaid expense{person.unpaidCount > 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="font-bold text-green-600">₹{Math.round(person.amount).toLocaleString()}</p>
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

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          <Link href={`/groups/${groupId}/add-expense`} className="flex-1">
            <Button variant="outline" className="w-full">
              Split expense
            </Button>
          </Link>
          <Button className="flex-1" onClick={() => setShowSettleUp(true)}>
            Settle up
          </Button>
        </div>
      </div>

      {/* Settle Up Modal */}
      {showSettleUp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setShowSettleUp(false)}>
          <div className="bg-background rounded-t-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-background">
              <h2 className="font-semibold text-foreground text-lg">Settle up</h2>
              <button onClick={() => setShowSettleUp(false)} className="text-muted-foreground text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4 pb-8">
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
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600 text-sm">
                        {s.fromName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.fromName}</p>
                        <p className="text-xs text-muted-foreground">pays</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                      <p className="text-lg font-bold text-primary">₹{s.amount}</p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 text-sm">
                        {s.toName[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.toName}</p>
                        <p className="text-xs text-muted-foreground">receives</p>
                      </div>
                    </div>

                    {/* QR for settlement — tap to pay */}
                    {upiMap[s.toPhone] && !settled.includes(String(i)) && (
                      <div
                        className="flex items-center gap-4 bg-muted/30 rounded-xl p-3 mb-3 cursor-pointer active:scale-95 transition-transform"
                        onClick={() => {
                          const upiLink = `upi://pay?pa=${upiMap[s.toPhone]}&pn=${encodeURIComponent(s.toName)}&am=${s.amount}&tn=Settlement&cu=INR`;
                          window.location.href = upiLink;
                        }}
                      >
                        <div className="bg-white p-2 rounded-lg flex-shrink-0">
                          <QRCodeSVG
                            value={`upi://pay?pa=${upiMap[s.toPhone]}&pn=${encodeURIComponent(s.toName)}&am=${s.amount}&tn=Settlement&cu=INR`}
                            size={64}
                            level="H"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Tap to pay ₹{s.amount}
                          </p>
                          <p className="text-xs text-muted-foreground">{upiMap[s.toPhone]}</p>
                          <p className="text-xs text-primary font-medium">
                            Opens GPay / PhonePe ↗
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {settled.includes(String(i)) ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium w-full justify-center">
                          <CheckCircle className="h-4 w-4" /> Settled
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="flex-1"
                          onClick={() => setSettled(prev => [...prev, String(i)])}>
                          Mark settled
                        </Button>
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
  ); // THIS CLOSES THE RETURN STATEMENT
} // THIS CLOSES THE COMPONENT FUNCTION