'use client';

import Link from 'next/link';
import { ArrowRight, Users, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsSignedIn(!!user);
    };
    checkAuth();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SplitEasy
          </div>
          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <>
                <Link href="/splits">
                  <Button variant="ghost">My Splits</Button>
                </Link>
                <Button
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    setIsSignedIn(false);
                  }}
                  variant="outline"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Split Bills Instantly
                </p>
                <h1 className="text-5xl sm:text-6xl lg:text-5xl font-bold text-foreground">
                  <span className="text-pretty">
                    Split bills with friends{' '}
                    <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                      instantly
                    </span>
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                  No more complicated calculations. No more awkward conversations. Just create a split, invite friends via WhatsApp, and everyone knows exactly what they owe.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href={isSignedIn ? '/create' : '/auth'} className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto">
                    Create Your First Split
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold border-2 border-background"
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Trusted by 1000+ college students
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative h-96 sm:h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-card to-card/90 rounded-2xl border border-border p-8 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Pizza Night Split</h3>
                    <span className="text-sm font-semibold text-primary">₹1500</span>
                  </div>
                  <div className="space-y-3">
                    {['Rahul', 'Priya', 'Amit'].map((name, i) => (
                      <div
                        key={name}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                            {name[0]}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          ₹{500 + i * 100}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Button className="w-full" size="sm">
                      Send Payment Reminders
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28 bg-card/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">
              Why Choose SplitEasy
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
              Everything you need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Designed specifically for college students who want to split bills without the drama
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: '30-Second Splits',
                description:
                  'Create a split in 30 seconds. Just add a title, amount, and friends.',
              },
              {
                icon: Users,
                title: 'WhatsApp Integration',
                description:
                  'Automatically send payment reminders and links to friends on WhatsApp.',
              },
              {
                icon: Shield,
                title: 'Secure & Private',
                description:
                  'Your data is encrypted and only visible to people in your splits.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-8 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all duration-300"
              >
                <feature.icon className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
              Ready to split smarter?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join 1000+ students who&apos;ve stopped fighting about bills.
            </p>
          </div>
          <Link href={isSignedIn ? '/create' : '/auth'} className="inline-block">
            <Button size="lg">
              Start Splitting Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SplitEasy
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 SplitEasy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
