'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface GroupMember {
  id: string;
  name: string;
  phone: string;
}

export default function AddGroupExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [myPhone, setMyPhone] = useState('');
  const [myName, setMyName] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [paidByPhone, setPaidByPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
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

      // Find current user in group
      const me = group.group_members?.find(
        (m: GroupMember) => m.email === user.email
      );
      const phone = me?.phone || '';
      const name = me?.name || user.email || '';
      setMyPhone(phone);
      setMyName(name);
      setPaidByPhone(phone);

      // Select all members by default
      const allPhones = group.group_members.map((m: GroupMember) => m.phone);
      setSelectedMembers(allPhones);

      setLoading(false);
    };
    init();
  }, [groupId, router]);

  const toggleMember = (phone: string) => {
    setSelectedMembers(prev =>
      prev.includes(phone)
        ? prev.filter(p => p !== phone)
        : [...prev, phone]
    );
  };

  const getEqualShare = () => {
    const total = parseFloat(totalAmount) || 0;
    const count = selectedMembers.length;
    if (!count) return 0;
    return Math.round((total / count) * 100) / 100;
  };

  const getCustomTotal = () => {
    return Object.values(customAmounts)
      .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Please enter expense title'); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { setError('Please enter valid amount'); return; }
    if (selectedMembers.length === 0) { setError('Select at least one member'); return; }
    if (!paidByPhone) { setError('Select who paid'); return; }

    if (splitType === 'custom') {
      const customTotal = getCustomTotal();
      const total = parseFloat(totalAmount);
      if (Math.abs(customTotal - total) > 1) {
        setError(`Custom amounts (₹${customTotal}) don't match total (₹${total})`);
        return;
      }
    }

    setSaving(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const paidByMember = groupMembers.find(m => m.phone === paidByPhone);

    // Create expense
    const { data: expense, error: expError } = await supabase
      .from('group_expenses')
      .insert({
        group_id: groupId,
        title: title.trim(),
        total_amount: parseFloat(totalAmount),
        paid_by_phone: paidByPhone,
        paid_by_name: paidByMember?.name || paidByPhone,
        split_type: splitType,
        created_by: user?.id,
      })
      .select()
      .single();

    if (expError || !expense) {
      setError('Failed to create expense');
      setSaving(false);
      return;
    }

    // Create members
    const equalShare = getEqualShare();
    const membersToInsert = selectedMembers.map(phone => {
      const member = groupMembers.find(m => m.phone === phone);
      const amount = splitType === 'equal'
        ? equalShare
        : parseFloat(customAmounts[phone] || '0');

      // Person who paid is already paid
      const isPayer = phone === paidByPhone;

      return {
        expense_id: expense.id,
        member_phone: phone,
        member_name: member?.name || phone,
        amount,
        paid: isPayer,
        paid_at: isPayer ? new Date().toISOString() : null,
      };
    });

    await supabase.from('group_expense_members').insert(membersToInsert);

    router.push(`/groups/${groupId}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const equalShare = getEqualShare();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href={`/groups/${groupId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-foreground">Add expense — {groupName}</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Title & Amount */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Expense details</h2>
          <Input
            placeholder="What's this for? e.g. Auto fare, Lunch"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground font-semibold">₹</span>
            <Input
              type="number"
              placeholder="0.00"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              className="pl-7 text-xl font-bold"
            />
          </div>
        </div>

        {/* Paid by */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Paid by</h2>
          <div className="flex flex-wrap gap-2">
            {groupMembers.map((member, i) => (
              <button
                key={member.id}
                onClick={() => setPaidByPhone(member.phone)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-all ${
                  paidByPhone === member.phone
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card border-border text-foreground hover:border-primary/50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold
                  ${paidByPhone === member.phone ? 'bg-white/30' : 'bg-primary'}`}>
                  {member.name[0]?.toUpperCase()}
                </div>
                {member.name}
                {member.phone === myPhone && ' (you)'}
              </button>
            ))}
          </div>
        </div>

        {/* Split between */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Split between</h2>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(['equal', 'custom'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setSplitType(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                    splitType === t
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {groupMembers.map((member, i) => {
              const isSelected = selectedMembers.includes(member.phone);
              const isEqual = splitType === 'equal';

              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border opacity-50'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleMember(member.phone)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </button>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-${['violet', 'teal', 'orange', 'amber', 'pink', 'blue'][i % 6]}-500`}
                    style={{ background: ['#8B5CF6','#14B8A6','#F97316','#F59E0B','#EC4899','#3B82F6'][i % 6] }}>
                    {member.name[0]?.toUpperCase()}
                  </div>

                  <span className="flex-1 text-sm font-medium text-foreground">
                    {member.name}
                    {member.phone === myPhone && <span className="text-muted-foreground"> (you)</span>}
                    {member.phone === paidByPhone && <span className="text-xs text-primary ml-1">paid</span>}
                  </span>

                  {/* Amount */}
                  {isSelected && (
                    isEqual ? (
                      <span className="text-sm font-semibold text-foreground">
                        ₹{equalShare || 0}
                      </span>
                    ) : (
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={customAmounts[member.phone] || ''}
                          onChange={e => setCustomAmounts(prev => ({
                            ...prev,
                            [member.phone]: e.target.value
                          }))}
                          className="w-full pl-5 pr-2 py-1 text-sm border border-border rounded-lg bg-background text-right focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom total check */}
          {splitType === 'custom' && totalAmount && (
            <div className={`flex justify-between text-sm px-2 ${
              Math.abs(getCustomTotal() - parseFloat(totalAmount)) < 1
                ? 'text-green-600'
                : 'text-red-500'
            }`}>
              <span>Total entered</span>
              <span>₹{getCustomTotal()} / ₹{totalAmount}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : 'Add expense'
          }
        </Button>
      </div>
    </div>
  );
}