// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';
// import { Button } from '@/components/ui/button';
// import { Plus, LogOut, Loader2, ArrowRight } from 'lucide-react';
// import Link from 'next/link';

// interface SplitWithMembers {
//   id: string;
//   title: string;
//   total_amount: number;
//   status: string;
//   created_at: string;
//   members: Array<{
//     id: string;
//     phone_number: string;
//     amount: number;
//     paid: boolean;
//   }>;
// }

// export default function SplitsPage() {
//   const router = useRouter();
//   const [splits, setSplits] = useState<SplitWithMembers[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [userLoaded, setUserLoaded] = useState(false);
//   const [user, setUser] = useState<any>(null);

//   useEffect(() => {
//     const checkAuth = async () => {
//       const supabase = createClient();
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         router.push('/auth');
//       } else {
//         setUser(user);
//         setUserLoaded(true);
//         await loadSplits(user.id);
//       }
//     };
//     checkAuth();
//   }, [router]);

//   const loadSplits = async (userId: string) => {
//     try {
//       const supabase = createClient();
//       const { data: userSplits, error } = await supabase
//         .from('splits')
//         .select('id, title, total_amount, status, created_at')
//         .eq('created_by', userId)  // simpler than .or()
//         .order('created_at', { ascending: false });

//       if (error) throw error;

//       const splitsWithMembers = await Promise.all(
//         (userSplits || []).map(async (split) => {
//           const { data: members } = await supabase
//             .from('split_members')
//             .select('*')
//             .eq('split_id', split.id);

//           return {
//             ...split,
//             members: members || [],
//           };
//         })
//       );

//       setSplits(splitsWithMembers);
//     } catch (error) {
//       console.error('Failed to load splits:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ✅ Fixed: was using undefined `supabase` variable
//   const handleSignOut = async () => {
//     const supabase = createClient();
//     await supabase.auth.signOut();
//     router.push('/');
//   };

//   if (!userLoaded) {
//     return null;
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
//       <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
//         <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
//           <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
//             SplitEasy
//           </Link>
//           <div className="flex items-center gap-4">
//             <Link href="/create">
//               <Button>
//                 <Plus className="mr-2 h-4 w-4" />
//                 New Split
//               </Button>
//             </Link>
//             <Button variant="ghost" size="sm" onClick={handleSignOut}>
//               <LogOut className="h-4 w-4" />
//             </Button>
//           </div>
//         </div>
//       </nav>

//       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//         <div className="mb-12">
//           <h1 className="text-4xl font-bold text-foreground mb-2">Your Splits</h1>
//           <p className="text-muted-foreground">Manage all your bill splits in one place</p>
//         </div>

//         {loading ? (
//           <div className="flex items-center justify-center py-20">
//             <Loader2 className="h-8 w-8 text-primary animate-spin" />
//           </div>
//         ) : splits.length === 0 ? (
//           <div className="bg-card border border-border rounded-2xl p-12 text-center">
//             <div className="space-y-4">
//               <h2 className="text-2xl font-bold text-foreground">No splits yet</h2>
//               <p className="text-muted-foreground max-w-sm mx-auto">
//                 Create your first split to start tracking bill payments with friends
//               </p>
//               <Link href="/create">
//                 <Button size="lg">
//                   Create First Split
//                   <ArrowRight className="ml-2 h-4 w-4" />
//                 </Button>
//               </Link>
//             </div>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {splits.map((split) => {
//               const paidMembers = split.members.filter((m) => m.paid).length;
//               const totalMembers = split.members.length;
//               const progress = totalMembers ? (paidMembers / totalMembers) * 100 : 0;

//               return (
//                 <Link key={split.id} href={`/splits/${split.id}`}>
//                   <div className="group h-full bg-card border border-border rounded-xl p-6 hover:border-primary hover:shadow-lg transition-all duration-300 cursor-pointer">
//                     <div className="space-y-4">
//                       <div className="flex items-start justify-between">
//                         <div className="flex-1">
//                           <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
//                             {split.title}
//                           </h3>
//                           <p className="text-sm text-muted-foreground mt-1">
//                             {new Date(split.created_at).toLocaleDateString()}
//                           </p>
//                         </div>
//                         <div className="text-right">
//                           <div className="text-2xl font-bold text-primary">
//                             ₹{split.total_amount.toLocaleString()}
//                           </div>
//                           <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
//                             split.status === 'completed'
//                               ? 'bg-green-100 text-green-700'
//                               : 'bg-amber-100 text-amber-700'
//                           }`}>
//                             {split.status}
//                           </div>
//                         </div>
//                       </div>

//                       <div className="space-y-3">
//                         <div className="flex items-center justify-between text-sm">
//                           <span className="text-muted-foreground">{paidMembers} of {totalMembers} paid</span>
//                           <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
//                         </div>
//                         <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
//                           <div
//                             className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-300"
//                             style={{ width: `${progress}%` }}
//                           />
//                         </div>
//                       </div>

//                       <div className="flex items-center gap-2 pt-2">
//                         {split.members.slice(0, 3).map((member, idx) => (
//                           <div
//                             key={idx}
//                             className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
//                               member.paid ? 'bg-green-500' : 'bg-muted'
//                             }`}
//                             title={`${member.phone_number} - ${member.paid ? 'Paid' : 'Pending'}`}
//                           >
//                             {member.phone_number[0]}
//                           </div>
//                         ))}
//                         {split.members.length > 3 && (
//                           <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
//                             +{split.members.length - 3}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </Link>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserSplits } from '@/lib/split-utils';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Split {
  id: string;
  title: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function SplitsPage() {
  const router = useRouter();
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalCreated, setTotalCreated] = useState(0);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      const data = await getUserSplits();
      setSplits(data || []);
      setTotalCreated(data?.length || 0);
      setTotalPaid(
        data?.filter((s: Split) => s.status === 'completed')
          .reduce((sum: number, s: Split) => sum + s.total_amount, 0) || 0
      );
      setLoading(false);
    };
    init();
  }, [router]);

  const filtered = splits.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ? true : s.status === filter;
    return matchSearch && matchFilter;
  });

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'cancelled') return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'cancelled') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

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
          {[
            { label: 'Total splits', value: totalCreated },
            { label: 'Total paid out', value: `₹${splits.reduce((s, x) => s + x.total_amount, 0).toLocaleString()}` },
            { label: 'Completed', value: splits.filter(s => s.status === 'completed').length },
          ].map((m, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
              <p className="text-2xl font-bold text-primary">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search splits..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-2">
            {(['all', 'pending', 'completed'] as const).map(f => (
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

        {/* Splits list */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-5xl">🧾</p>
            <p className="text-xl font-semibold text-foreground">No splits yet</p>
            <p className="text-muted-foreground">Start by splitting your next bill!</p>
            <Link href="/create">
              <Button className="mt-2">Create your first split →</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((split, i) => (
              <Link key={split.id} href={`/splits/${split.id}`}>
                <div
                  className="bg-card border border-border rounded-xl px-6 py-4 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer flex items-center justify-between gap-4"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                      {split.title[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{split.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(split.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${getStatusBadge(split.status)}`}>
                      {getStatusIcon(split.status)}
                      {split.status}
                    </span>
                    <p className="text-lg font-bold text-primary">₹{split.total_amount.toLocaleString()}</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}