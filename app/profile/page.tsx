'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      setEmail(user.email || '');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setName(profile.name || '');
        setPhone(profile.phone || '');
        setUpiId(profile.upi_id || '');
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('user_profiles').upsert({
      id: user?.id,
      name: name.trim(),
      phone: phone.trim(),
      upi_id: upiId.trim(),
      updated_at: new Date().toISOString(),
    });

    // Also update group_members rows with this email
    if (upiId.trim()) {
      await supabase
        .from('group_members')
        .update({ upi_id: upiId.trim() })
        .eq('email', user?.email);
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&cu=INR`
    : '';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/splits">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-foreground">My Profile & UPI</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Profile fields */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Your details</h2>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Email (from login)</label>
            <p className="text-sm font-medium text-foreground">{email}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Your name</label>
            <Input
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Phone number</label>
            <Input
              placeholder="9876543210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium text-primary">
              Your UPI ID ★ (important for receiving payments)
            </label>
            <Input
              placeholder="yourname@upi or yourphone@ybl"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This is used to generate QR codes so others can pay you directly
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
             saved ? <><CheckCircle className="h-4 w-4 mr-2" /> Saved!</> :
             'Save profile'}
          </Button>
        </div>

        {/* QR preview */}
        {upiId && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 text-center">
            <h2 className="font-semibold text-foreground">Your payment QR</h2>
            <p className="text-sm text-muted-foreground">
              Share this so anyone can pay you directly
            </p>
            <div className="flex justify-center">
              <div
                className="bg-white p-4 rounded-2xl cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => window.location.href = upiLink}
                title="Tap to open UPI app"
              >
                <QRCodeSVG value={upiLink} size={200} level="H" />
              </div>
            </div>
            <p className="text-sm font-mono text-foreground">{upiId}</p>
            <Button
              className="w-full"
              onClick={() => window.location.href = upiLink}
            >
              Tap to open UPI app
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}