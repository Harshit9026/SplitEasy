'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.push('/');
    };
    checkAuth();
  }, [router]);

  const handleSendOTP = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Use the magic link to sign in
      if (data.link) {
        window.location.href = data.link;
      } else {
        router.push('/');
      }

    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SplitEasy
          </h1>
          <p className="text-muted-foreground text-sm">
            Split bills. Not friendships.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">

          {step === 'email' ? (
            <>
              <div className="space-y-1">
                <h2 className="font-semibold text-foreground text-lg">
                  Enter your email
                </h2>
                <p className="text-sm text-muted-foreground">
                  We'll send a 6-digit OTP to verify
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  className="text-base"
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  autoFocus
                />

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleSendOTP}
                  disabled={loading}
                >
                  {loading
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : 'Send OTP'
                  }
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="font-semibold text-foreground text-lg">
                  Enter OTP
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sent to {email}
                  <button
                    onClick={() => { setStep('email'); setError(''); setOtp(''); }}
                    className="text-primary ml-2 underline text-xs"
                  >
                    Change
                  </button>
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  type="number"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.slice(0, 6)); setError(''); }}
                  maxLength={6}
                  className="text-2xl font-bold tracking-widest text-center h-14"
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                  autoFocus
                />

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button
                  className="w-full h-12 text-base font-semibold"
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length < 6}
                >
                  {loading
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : 'Verify OTP'
                  }
                </Button>

                <button
                  onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                  className="w-full text-sm text-muted-foreground hover:text-primary transition-colors text-center"
                >
                  Didn't receive OTP? Resend
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}

