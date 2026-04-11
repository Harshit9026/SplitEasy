'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserSplits } from '@/lib/split-utils';
import { getMemberSplits } from '@/lib/member-utils';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Split {
  id: string;
  title: string;
  total_amount: number;
  status: string;
  created_at: string;
  my_amount?: number;
  my_paid?: boolean;
  role?: string;
}

const FILTER_OPTIONS = ['all', 'pending', 'completed'] as const;

const getStatusBadge = (status: string) => {
  if (status === 'completed') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'cancelled') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

const getStatusIcon = (status: string) => {
  if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === 'cancelled') return <AlertCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
};

export default function SplitsPage() {
  const router = useRouter();
  const [mySplits, setMySplits] = useState<Split[]>([]);
  const [memberSplits, setMemberSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

 useEffect(() => {
  const init = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    setLoading(true); 

    const [created, member] = await Promise.all([
      getUserSplits(),
      getMemberSplits(),
    ]);

    setMySplits(created || []);
    setMemberSplits(member || []);
    setLoading(false);
  };
  init();
}, [router]); 

  const filterSplits = (splits: Split[]) =>
    splits.filter(s => {
      const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' ? true : s.status === filter;
      return matchSearch && matchFilter;
    });

  const SplitCard = ({ split, isMember = false }: { split: Split, isMember?: boolean }) => (
    <Link href={`/splits/${split.id}`}>
      <div className="bg-card border border-border rounded-xl px-6 py-4 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
            {split.title[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground truncate">{split.title}</p>
              {isMember && (
                <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full flex-shrink-0">
                  member
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(split.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </p>
            {/* Show member's own amount + paid status */}
            {isMember && split.my_amount && (
              <p className={`text-xs font-medium mt-0.5 ${split.my_paid ? 'text-green-600' : 'text-amber-600'}`}>
                Your share: ₹{split.my_amount.toLocaleString()} — {split.my_paid ? 'Paid ✓' : 'Pending'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${getStatusBadge(split.status)}`}>
            {getStatusIcon(split.status)}
            {split.status}
          </span>
          <p className="text-lg font-bold text-primary">
            ₹{split.total_amount.toLocaleString()}
          </p>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const filteredMySplits = filterSplits(mySplits);
  const filteredMemberSplits = filterSplits(memberSplits);
  const totalSplits = filteredMySplits.length + filteredMemberSplits.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SplitEasy
          </span>
          <Link href="/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Split
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Created by me</p>
            <p className="text-2xl font-bold text-primary">{mySplits.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Member of</p>
            <p className="text-2xl font-bold text-violet-600">{memberSplits.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">I still owe</p>
            <p className="text-2xl font-bold text-amber-600">
              ₹{memberSplits
                  .filter(s => !s.my_paid)
                  .reduce((sum, s) => sum + (s.my_amount || 0), 0)
                  .toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search splits..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-2">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm border transition-colors capitalize
                  ${filter === f
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {totalSplits === 0 && (
          <div className="text-center py-20 space-y-4">
            <p className="text-5xl">🧾</p>
            <p className="text-xl font-semibold text-foreground">No splits yet</p>
            <p className="text-muted-foreground">Start by splitting your next bill!</p>
            <Link href="/create">
              <Button className="mt-2">Create your first split →</Button>
            </Link>
          </div>
        )}

        {/* Splits I created */}
        {filteredMySplits.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Created by me
            </h2>
            {filteredMySplits.map(split => (
              <SplitCard key={split.id} split={split} isMember={false} />
            ))}
          </div>
        )}

        {/* Splits I am a member of */}
        {filteredMemberSplits.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              I'm a member of
            </h2>
            {filteredMemberSplits.map(split => (
              <SplitCard key={split.id} split={split} isMember={true} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}