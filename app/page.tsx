'use client';

import Link from 'next/link';
import { ArrowRight, Zap, QrCode, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ProfileMenu from '@/components/ProfileMenu';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">

      {/* Nav */}
     <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
  <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
    <div className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
      SplitEasy
    </div>
    <div className="flex items-center gap-2">
      {/* <Link href="/splits">
        <Button variant="ghost" size="sm" className="hidden sm:flex">My Splits</Button>
      </Link> */}
      <Link href="/groups">
        <Button variant="ghost" size="sm" className="hidden sm:flex">Groups</Button>
      </Link>
      <Link href="/create">
        <Button size="sm">
          + New Split
        </Button>
      </Link>
      <ProfileMenu />
    </div>
  </div>
</nav>

      {/* Hero */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                🇮🇳 Made for Indian college students
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
                Split bills.{' '}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Not friendships.
                </span>
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed">
                Auto fare, hostel food, trip expenses — split anything in 30 seconds.
                Pay via GPay or PhonePe in one tap.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/create">
                  <Button size="lg" className="w-full sm:w-auto">
                    Create a split
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/splits">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    My splits
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">Free</p>
                  <p className="text-xs text-muted-foreground">Always</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">30s</p>
                  <p className="text-xs text-muted-foreground">To create split</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">1 tap</p>
                  <p className="text-xs text-muted-foreground">To pay via UPI</p>
                </div>
              </div>
            </div>

            {/* Right — app mockup */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
              <div className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-secondary p-4 flex items-center gap-3">
                  <div className="flex -space-x-1">
                    {['R', 'P', 'A', 'H'].map((l, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-white/30 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                        {l}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Auto Gang</p>
                    <p className="text-white/70 text-xs">4 members</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { title: 'Auto fare', amount: '₹120', paid: '3/4', who: 'Rahul paid' },
                    { title: 'Lunch at Dominos', amount: '₹640', paid: '4/4', who: 'Priya paid' },
                    { title: 'Evening chai', amount: '₹80', paid: '2/4', who: 'You paid' },
                  ].map((item, i) => (
                    <div key={i} className="border border-border rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-muted-foreground">{item.who}</p>
                          <p className="text-2xl font-bold text-foreground">{item.amount}</p>
                          <p className="text-xs text-muted-foreground">{item.title}</p>
                        </div>
                        {item.paid === '4/4' ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Settled</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{item.paid} paid</span>
                        )}
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-primary rounded-full"
                          style={{ width: item.paid === '4/4' ? '100%' : item.paid === '3/4' ? '75%' : '50%' }} />
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="border border-border rounded-lg py-2 text-center text-xs font-medium text-foreground">Split expense</div>
                    <div className="bg-primary rounded-lg py-2 text-center text-xs font-medium text-white">Settle up</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="py-8 px-4 bg-card/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { emoji: '➕', label: 'New Split', href: '/create' },
              { emoji: '👥', label: 'My Groups', href: '/groups' },
              { emoji: '🧾', label: 'My Splits', href: '/splits' },
              { emoji: '💸', label: 'Settle Up', href: '/settle' },
            ].map((item, i) => (
              <Link key={i} href={item.href}>
                <div className="bg-card border border-border rounded-xl p-4 text-center space-y-2 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
                  <p className="text-2xl">{item.emoji}</p>
                  <p className="font-medium text-foreground text-sm">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Simple as 1-2-3</p>
            <h2 className="text-3xl font-bold text-foreground">How SplitEasy works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: Zap, title: 'Create a split', desc: 'Enter bill name, amount, UPI ID and add friends. Takes 30 seconds.', color: 'text-violet-600 bg-violet-50' },
              { step: '02', icon: MessageCircle, title: 'Share via WhatsApp', desc: 'Send the split link. Friends open it without logging in.', color: 'text-teal-600 bg-teal-50' },
              { step: '03', icon: QrCode, title: 'Pay in one tap', desc: 'Tap QR → GPay or PhonePe opens with exact amount pre-filled.', color: 'text-orange-600 bg-orange-50' },
            ].map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 space-y-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-3xl font-bold text-muted-foreground/20">{item.step}</span>
                </div>
                <h3 className="font-semibold text-foreground text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-card/30 border-y border-border">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-foreground">Everything you need</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '👥', title: 'Groups', desc: 'Auto Gang, Office Lunch — regular groups settle automatically', href: '/groups' },
              { icon: '⚡', title: 'Tap to Pay', desc: 'Tap QR → GPay/PhonePe opens with exact amount. No scanning', href: '/create' },
              { icon: '🧮', title: 'Smart settle up', desc: 'Minimum transactions to settle everyone in a group', href: '/settle' },
              { icon: '📊', title: 'Equal or custom', desc: 'Split equally or set custom amounts for each person', href: '/create' },
              { icon: '🔗', title: 'No signup for friends', desc: 'Share a link — friends pay without creating an account', href: '/splits' },
              { icon: '📅', title: 'Filter by date', desc: 'Settle last 7 days, this month, or all time', href: '/settle' },
            ].map((f, i) => (
              <Link key={i} href={f.href}>
                <div className="bg-card border border-border rounded-xl p-5 space-y-2 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer h-full">
                  <p className="text-2xl">{f.icon}</p>
                  <p className="font-semibold text-foreground text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SplitEasy
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Made with ❤️ in India
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/splits" className="hover:text-foreground transition-colors">My Splits</Link>
            <Link href="/groups" className="hover:text-foreground transition-colors">Groups</Link>
            <Link href="/settle" className="hover:text-foreground transition-colors">Settle Up</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}