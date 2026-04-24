'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Mail, QrCode, ChevronDown, Check, ArrowRight } from 'lucide-react';

interface Props {
  user?: { email?: string; id?: string } | null;
}

export default function ProfileMenu({ user: propUser }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(propUser || null);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If user passed as prop, use it; otherwise fetch
    if (propUser !== undefined) {
      setUser(propUser);
      return;
    }
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [propUser]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setChangingEmail(false);
        setError('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setEmailSent(true);
    setLoading(false);
  };

  // Show placeholder while loading
  if (!user) return (
    <div className="w-9 h-9 rounded-full bg-muted border border-border animate-pulse" />
  );

  const initials = user.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>

      {/* Avatar button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-card border border-border rounded-full pl-1 pr-3 py-1 hover:border-primary/50 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-72 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">

          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                <p className="text-xs text-green-600 font-medium">● Signed in</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2 space-y-0.5">

            {/* My Splits */}
            <button
              onClick={() => { router.push('/splits'); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
            >
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">My Splits</span>
            </button>

            {/* Change email */}
            <button
              onClick={() => { setChangingEmail(!changingEmail); setEmailSent(false); setError(''); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Change email</span>
            </button>

            {changingEmail && (
              <div className="px-3 pb-2 space-y-2">
                {emailSent ? (
                  <div className="flex items-center gap-2 text-green-600 text-xs bg-green-50 rounded-lg px-3 py-2">
                    <Check className="h-3.5 w-3.5" />
                    Check your new email for confirmation
                  </div>
                ) : (
                  <>
                    <input
                      type="email"
                      placeholder="New email address"
                      value={newEmail}
                      onChange={e => { setNewEmail(e.target.value); setError(''); }}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <button
                      onClick={handleChangeEmail}
                      disabled={loading}
                      className="w-full bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Sending...' : 'Send confirmation'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* My UPI */}
            <button
              onClick={() => { router.push('/profile'); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
            >
              <QrCode className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">My UPI & QR</span>
            </button>

            <div className="border-t border-border my-1" />

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left group"
            >
              <LogOut className="h-4 w-4 text-muted-foreground group-hover:text-red-500" />
              <span className="text-sm text-foreground group-hover:text-red-500">Sign out</span>
            </button>

          </div>
        </div>
      )}
    </div>
  );
}