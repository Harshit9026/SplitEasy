'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSplitWithMembers, generateUPILink } from '@/lib/split-utils';
import { Button } from '@/components/ui/button';
import { Copy, Phone, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Split {
  id: string;
  title: string;
  total_amount: number;
  description?: string;
  created_at: string;
}

interface Member {
  id: string;
  phone_number: string;
  amount: number;
  paid: boolean;
}

export default function FriendPayPage() {
  const params = useParams();
  const splitId = params.splitId as string;
  const memberId = params.memberId as string;

  const [split, setSplit] = useState<Split | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { split: splitData, members } = await getSplitWithMembers(splitId);
        setSplit(splitData);

        const foundMember = members.find((m: Member) => m.id === memberId);
        if (foundMember) {
          setMember(foundMember);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [splitId, memberId]);

  const handleCopyUPI = () => {
    if (!member) return;

    // In a real scenario, you'd need to map phone numbers to actual UPI IDs
    // For now, we'll use a placeholder format
    const upiId = `${member.phone_number}@upi`;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPaymentApp = () => {
    if (!member || !split) return;

    // Generate UPI deep link
    const upiLink = generateUPILink(
      member.phone_number,
      split.title,
      member.amount
    );

    // Try to open UPI payment app
    window.location.href = upiLink;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!split || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">
            Payment not found
          </h1>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (member.paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
              <span className="text-3xl">✓</span>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Payment Received!
            </h1>
            <p className="text-muted-foreground">
              Thank you for paying ₹{member.amount.toLocaleString()} for &quot;{split.title}&quot;
            </p>
          </div>
          <Link href="/">
            <Button className="w-full">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          >
            SplitEasy
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Payment Card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-b border-border px-6 sm:px-8 py-12">
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  Amount Due
                </p>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  ₹{member.amount.toLocaleString()}
                </h1>
                <p className="text-lg text-foreground font-semibold">
                  {split.title}
                </p>
              </div>
            </div>

            {/* Details Section */}
            <div className="px-6 sm:px-8 py-8 space-y-6">
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Bill Title</span>
                  <span className="font-semibold text-foreground">
                    {split.title}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Your Share</span>
                  <span className="font-semibold text-foreground">
                    ₹{member.amount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Payment Status
                  </span>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                    Pending
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Payment Methods
                </p>

                {/* UPI Payment */}
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">UPI Payment</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Direct payment via UPI apps
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded p-3 font-mono text-sm break-all text-foreground">
                    {member.phone_number}@upi
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyUPI}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied ? 'Copied!' : 'Copy UPI'}
                    </Button>
                    <Button
                      onClick={handleOpenPaymentApp}
                      size="sm"
                      className="flex-1"
                    >
                      Open Payment App
                    </Button>
                  </div>
                </div>

                {/* WhatsApp Reminder */}
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.783 1.14L1.07 3.971l1.182 4.369a9.844 9.844 0 00.869 4.386 9.915 9.915 0 008.26 5.575c4.92.006 8.935-4.01 8.935-8.933 0-2.366-.931-4.581-2.624-6.26-.598-.58-1.298-1.056-2.077-1.386A9.884 9.884 0 0012.051 6.98z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">WhatsApp</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Send a reminder message
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold">Tip:</p>
                  <p>
                    Complete your payment and share the confirmation with the bill creator
                  </p>
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="border-t border-border px-6 sm:px-8 py-4 bg-muted/20">
              <p className="text-xs text-muted-foreground text-center">
                Questions? Contact the person who created the split
              </p>
            </div>
          </div>

          {/* Back Link */}
          <div className="text-center mt-6">
            <Link href="/" className="text-sm text-primary hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
