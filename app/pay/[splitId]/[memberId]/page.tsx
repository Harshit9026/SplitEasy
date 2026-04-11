'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateUPILink } from '@/lib/split-utils';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';

interface Split {
  id: string;
  title: string;
  total_amount: number;
}

interface Member {
  id: string;
  phone_number: string;
  amount: number;
  paid: boolean;
}

export default function PayPage() {
  const params = useParams();
  const splitId = params.splitId as string;
  const memberId = params.memberId as string;

  const [split, setSplit] = useState<Split | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [hostUpiId, setHostUpiId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [markedPaid, setMarkedPaid] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const { data: splitData } = await supabase
        .from('splits')
        .select('*')
        .eq('id', splitId)
        .single();

      const { data: memberData } = await supabase
        .from('split_members')
        .select('*')
        .eq('id', memberId)
        .single();

      // Get host UPI from splits table or profiles
      const { data: hostData } = await supabase
        .from('splits')
        .select('upi_id')
        .eq('id', splitId)
        .single();

      setSplit(splitData);
      setMember(memberData);
      setHostUpiId(hostData?.upi_id || '');
      setMarkedPaid(memberData?.paid || false);
      setLoading(false);
    };
    load();
  }, [splitId, memberId]);

  const handleMarkPaid = async () => {
    setMarking(true);
    const supabase = createClient();
    await supabase
      .from('split_members')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('id', memberId);
    setMarkedPaid(true);
    setMarking(false);
  };

  const handleTapToPay = () => {
    if (!hostUpiId || !member || !split) return;
    const upiLink = generateUPILink(hostUpiId, split.title, member.amount);
    window.location.href = upiLink;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!split || !member) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Payment link not found.</p>
    </div>
  );

  const upiLink = hostUpiId
    ? generateUPILink(hostUpiId, split.title, member.amount)
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Payment request for</p>
          <h1 className="text-2xl font-bold text-foreground">{split.title}</h1>
        </div>

        {/* Amount */}
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">Your share</p>
          <p className="text-5xl font-bold text-primary">
            ₹{member.amount.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {member.phone_number}
          </p>
        </div>

        {markedPaid ? (
          /* Already paid state */
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-green-700">Payment recorded!</p>
            <p className="text-sm text-green-600">
              You're all settled for {split.title}
            </p>
          </div>
        ) : (
          <>
            {/* Tap to Pay button — works on phone without scanning */}
            {hostUpiId && (
              <Button
                className="w-full h-14 text-lg font-semibold"
                onClick={handleTapToPay}
              >
                Tap to Pay ₹{member.amount.toLocaleString()} via UPI
              </Button>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Opens GPay, PhonePe, or Paytm automatically
            </p>

            {/* QR for desktop users */}
            {hostUpiId && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <p className="text-xs text-muted-foreground">or scan QR on desktop</p>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-3">
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeSVG
                      value={upiLink}
                      size={180}
                      level="H"
                    />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{hostUpiId}</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Scan with any UPI app — ₹{member.amount} is pre-filled
                  </p>
                </div>
              </div>
            )}

            {/* Mark as paid button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleMarkPaid}
              disabled={marking}
            >
              {marking
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : "I've paid — mark as done"
              }
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Click after completing payment to notify the group
            </p>
          </>
        )}
      </div>
    </div>
  );
}