// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';
// import { QRCodeSVG } from 'qrcode.react';
// import {
//   getSplitWithMembers,
//   updateMemberPaymentStatus,
//   generateWhatsAppMessage,
//   generateUPILink,
// } from '@/lib/split-utils';
// import { Button } from '@/components/ui/button';
// import {
//   ArrowLeft,
//   Copy,
//   MessageCircle,
//   Phone,
//   Check,
//   X,
//   Loader2,
//   Share2,
// } from 'lucide-react';
// import Link from 'next/link';

// interface Split {
//   id: string;
//   title: string;
//   total_amount: number;
//   currency: string;
//   description?: string;
//   status: string;
//   created_at: string;
// }

// interface SplitMember {
//   id: string;
//   phone_number: string;
//   amount: number;
//   paid: boolean;
//   paid_at?: string;
// }

// export default function SplitDetailPage() {
//   const params = useParams();
//   const router = useRouter();
//   const splitId = params.id as string;

//   const [split, setSplit] = useState<Split | null>(null);
//   const [members, setMembers] = useState<SplitMember[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [updating, setUpdating] = useState<string | null>(null);
//   const [userLoaded, setUserLoaded] = useState(false);
//   const [copied, setCopied] = useState(false);
//  const [qrMember, setQrMember] = useState<SplitMember | null>(null);

//   useEffect(() => {
//     const checkAuth = async () => {
//       const supabase = createClient();
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (!user) {
//         router.push('/auth');
//       } else {
//         setUserLoaded(true);
//         await loadSplit();
//       }
//     };
//     checkAuth();
//   }, [router, splitId]);

//   const loadSplit = async () => {
//     try {
//       const { split: splitData, members: membersData } =
//         await getSplitWithMembers(splitId);
//       setSplit(splitData);
//       setMembers(membersData);
//     } catch (error) {
//       console.error('Failed to load split:', error);
//       router.push('/splits');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handlePaymentStatusChange = async (memberId: string, paid: boolean) => {
//     setUpdating(memberId);
//     try {
//       await updateMemberPaymentStatus(memberId, paid);
//       setMembers(
//         members.map((m) => (m.id === memberId ? { ...m, paid } : m))
//       );
//     } catch (error) {
//       console.error('Failed to update payment status:', error);
//     } finally {
//       setUpdating(null);
//     }
//   };

//   const handleSendReminder = (member: SplitMember) => {
//     if (!split) return;

//     const message = generateWhatsAppMessage(
//       split.title,
//       member.amount,
//       `${window.location.origin}/pay/${splitId}/${member.id}`
//     );

//     const encodedMessage = encodeURIComponent(message);
//     const phoneNumber = member.phone_number.replace(/\D/g, '');
//     window.open(
//       `https://wa.me/${phoneNumber}?text=${encodedMessage}`,
//       '_blank'
//     );
//   };

//   const handleCopyLink = () => {
//     const payLink = `${window.location.origin}/splits/${splitId}`;
//     navigator.clipboard.writeText(payLink);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   if (!userLoaded) {
//     return null;
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
//         <Loader2 className="h-8 w-8 text-primary animate-spin" />
//       </div>
//     );
//   }

//   if (!split) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
//         <div className="text-center">
//           <h1 className="text-2xl font-bold text-foreground mb-4">
//             Split not found
//           </h1>
//           <Link href="/splits">
//             <Button>Go Back to Splits</Button>
//           </Link>
//         </div>
//       </div>
//     );
//   }

//   const paidMembers = members.filter((m) => m.paid).length;
//   const totalMembers = members.length;
//   const progress = totalMembers ? (paidMembers / totalMembers) * 100 : 0;
//   const amountPaid = members.filter((m) => m.paid).reduce((sum, m) => sum + m.amount, 0);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
//       {/* Navigation */}
//       <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
//         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
//           <Link
//             href="/splits"
//             className="flex items-center gap-2 text-lg font-bold hover:opacity-80 transition-opacity"
//           >
//             <ArrowLeft className="h-5 w-5" />
//             <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
//               SplitEasy
//             </span>
//           </Link>
//         </div>
//       </nav>

//       {/* Main Content */}
//       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
//         {/* Header Card */}
//         <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-8 sm:p-12 mb-8">
//           <div className="space-y-6">
//             <div className="space-y-2">
//               <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
//                 {split.title}
//               </h1>
//               {split.description && (
//                 <p className="text-lg text-muted-foreground">{split.description}</p>
//               )}
//             </div>

//             <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
//               <div>
//                 <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
//                 <p className="text-3xl font-bold text-primary">
//                   ₹{split.total_amount.toLocaleString()}
//                 </p>
//               </div>
//               <div>
//                 <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
//                 <p className="text-3xl font-bold text-green-600">
//                   ₹{amountPaid.toLocaleString()}
//                 </p>
//               </div>
//               <div>
//                 <p className="text-sm text-muted-foreground mb-1">Remaining</p>
//                 <p className="text-3xl font-bold text-amber-600">
//                   ₹{(split.total_amount - amountPaid).toLocaleString()}
//                 </p>
//               </div>
//             </div>

//             {/* Progress Bar */}
//             <div className="space-y-3">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium text-foreground">
//                   {paidMembers} of {totalMembers} members have paid
//                 </span>
//                 <span className="text-sm font-bold text-primary">
//                   {Math.round(progress)}%
//                 </span>
//               </div>
//               <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
//                 <div
//                   className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-300"
//                   style={{ width: `${progress}%` }}
//                 ></div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex flex-col sm:flex-row gap-4 mb-8">
//           <Button
//             onClick={handleCopyLink}
//             variant="outline"
//             className="flex-1 sm:flex-none"
//           >
//             <Copy className="mr-2 h-4 w-4" />
//             {copied ? 'Copied!' : 'Copy Link'}
//           </Button>
//           <Button
//             onClick={() => {
//               const splitLink = `${window.location.origin}/splits/${splitId}`;
//               const text = generateWhatsAppMessage(split.title, split.total_amount, splitLink);
//               window.open(
//                 `https://wa.me/?text=${encodeURIComponent(text)}`,
//                 '_blank'
//               );
//             }}
//             variant="outline"
//             className="flex-1 sm:flex-none"
//           >
//             <MessageCircle className="mr-2 h-4 w-4" />
//             Share on WhatsApp
//           </Button>
//         </div>

//         {/* Members List */}
//         <div className="bg-card border border-border rounded-2xl overflow-hidden">
//           <div className="border-b border-border px-6 sm:px-8 py-4">
//             <h2 className="text-2xl font-bold text-foreground">Members</h2>
//           </div>

//           <div className="divide-y divide-border">
//             {members.map((member) => (
//               <div
//                 key={member.id}
//                 className="px-6 sm:px-8 py-6 hover:bg-muted/30 transition-colors"
//               >
//                 <div className="flex items-center justify-between gap-4">
//                   <div className="flex-1 min-w-0">
//                     <div className="flex items-center gap-3">
//                       <div
//                         className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
//                           member.paid
//                             ? 'bg-green-500'
//                             : 'bg-primary'
//                         }`}
//                       >
//                         {member.phone_number[0].toUpperCase()}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="font-semibold text-foreground truncate">
//                           {member.phone_number}
//                         </p>
//                         {member.paid && member.paid_at && (
//                           <p className="text-sm text-green-600">
//                             Paid on {new Date(member.paid_at).toLocaleDateString()}
//                           </p>
//                         )}
//                         {!member.paid && (
//                           <p className="text-sm text-amber-600">Payment pending</p>
//                         )}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="text-right flex-shrink-0">
//                     <p className="text-2xl font-bold text-primary mb-3">
//                       ₹{member.amount.toLocaleString()}
//                     </p>
//                     <div className="flex gap-2">
//                       <Button
//                         size="sm"
//                         variant="outline"
//                         onClick={() => handleSendReminder(member)}
//                       >
//                         <MessageCircle className="h-4 w-4" />
//                       </Button>
//                       <Button
//                         size="sm"
//                         onClick={() =>
//                           handlePaymentStatusChange(member.id, !member.paid)
//                         }
//                         disabled={updating === member.id}
//                         className={
//                           member.paid
//                             ? 'bg-green-500 hover:bg-green-600'
//                             : 'bg-muted hover:bg-muted-foreground/20'
//                         }
//                       >
//                         {updating === member.id ? (
//                           <Loader2 className="h-4 w-4 animate-spin" />
//                         ) : member.paid ? (
//                           <Check className="h-4 w-4" />
//                         ) : (
//                           <X className="h-4 w-4" />
//                         )}
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {progress === 100 && (
//           <div className="mt-8 p-6 rounded-xl bg-green-50 border border-green-200">
//             <p className="text-center text-green-700 font-semibold">
//               🎉 Everyone has paid! Split completed successfully.
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import {
  getSplitWithMembers,
  updateMemberPaymentStatus,
  generateWhatsAppMessage,
  generateUPILink,
} from '@/lib/split-utils';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Copy,
  MessageCircle,
  Check,
  X,
  Loader2,
  QrCode,
} from 'lucide-react';
import Link from 'next/link';

interface Split {
  id: string;
  title: string;
  total_amount: number;
  currency: string;
  description?: string;
  status: string;
  created_at: string;
  host_upi_id?: string;
}

interface SplitMember {
  id: string;
  phone_number: string;
  amount: number;
  paid: boolean;
  paid_at?: string;
}

export default function SplitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const splitId = params.id as string;
  const [isOwner, setIsOwner] = useState(false);

  const [split, setSplit] = useState<Split | null>(null);
  const [members, setMembers] = useState<SplitMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHostQR, setShowHostQR] = useState(false);
  const [hostUpiId, setHostUpiId] = useState('');
  const [editingUpi, setEditingUpi] = useState(false);
  const [qrMember, setQrMember] = useState<SplitMember | null>(null);

  useEffect(() => {
  const init = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Don't redirect — just note if user is logged in or not
    setIsOwner(user !== null);
    setUserLoaded(true);
    await loadSplit(user?.id);
  };
  init();
}, [splitId]);

  const loadSplit = async (userId?: string) => {
  try {
    const { split: splitData, members: membersData } =
      await getSplitWithMembers(splitId);
    setSplit(splitData);
    setMembers(membersData);
    
    // Check if current user is the creator
    if (userId && splitData.created_by === userId) {
      setIsOwner(true);
    }
  } catch (error) {
    console.error('Failed to load split:', error);
  } finally {
    setLoading(false);
  }
};

  const handleSaveUpi = async () => {
    if (!hostUpiId.trim()) return;
    try {
      const supabase = createClient();
      await supabase
        .from('splits')
        .update({ host_upi_id: hostUpiId.trim() })
        .eq('id', splitId);
      setSplit((prev) => prev ? { ...prev, host_upi_id: hostUpiId.trim() } : prev);
      setEditingUpi(false);
    } catch (error) {
      console.error('Failed to save UPI ID:', error);
    }
  };

  // const handlePaymentStatusChange = async (memberId: string, paid: boolean) => {
  //   setUpdating(memberId);
  //   try {
  //     await updateMemberPaymentStatus(memberId, paid);
  //     setMembers(members.map((m) => (m.id === memberId ? { ...m, paid } : m)));
  //   } catch (error) {
  //     console.error('Failed to update payment status:', error);
  //   } finally {
  //     setUpdating(null);
  //   }
  // };

  const handlePaymentStatusChange = async (memberId: string, paid: boolean) => {
  if (!memberId) {
    console.error("Invalid memberId");
    return;
  }

  setUpdating(memberId);

  try {
    await updateMemberPaymentStatus(memberId, paid);

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, paid } : m
      )
    );
  } catch (error) {
    console.error("Failed to update payment status:", error);
  } finally {
    setUpdating(null);
  }
};

  const handleSendReminder = (member: SplitMember) => {
    if (!split) return;
    const message = generateWhatsAppMessage(
      split.title,
      member.amount,
      `${window.location.origin}/pay/${splitId}/${member.id}`
    );
    const phoneNumber = member.phone_number.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendQRReminder = (member: SplitMember) => {
    if (!split || !hostUpiId) return;
    // member.amount → only their share, paid to host's UPI
    const upiLink = generateUPILink(hostUpiId, split.title, member.amount);
    const message =
      `Hi! Please pay ₹${member.amount} for *${split.title}*.\n\nPay directly via UPI: ${upiLink}\n\nOr open the split: ${window.location.origin}/splits/${splitId}`;
    const phoneNumber = member.phone_number.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCopyLink = () => {
    const payLink = `${window.location.origin}/splits/${splitId}`;
    navigator.clipboard.writeText(payLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!userLoaded) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!split) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Split not found</h1>
          <Link href="/splits"><Button>Go Back to Splits</Button></Link>
        </div>
      </div>
    );
  }

  const paidMembers = members.filter((m) => m.paid).length;
  const totalMembers = members.length;
  const progress = totalMembers ? (paidMembers / totalMembers) * 100 : 0;
  const amountPaid = members.filter((m) => m.paid).reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link
            href="/splits"
            className="flex items-center gap-2 text-lg font-bold hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SplitEasy
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-8 sm:p-12 mb-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground">{split.title}</h1>
              {split.description && (
                <p className="text-lg text-muted-foreground">{split.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-primary">₹{split.total_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                <p className="text-3xl font-bold text-green-600">₹{amountPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                <p className="text-3xl font-bold text-amber-600">
                  ₹{(split.total_amount - amountPaid).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {paidMembers} of {totalMembers} members have paid
                </span>
                <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Host UPI Section */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Your UPI / Payment QR</h2>
            {hostUpiId && !editingUpi && (
              <button
                onClick={() => setEditingUpi(true)}
                className="text-sm text-primary underline"
              >
                Edit
              </button>
            )}
          </div>

          {(!hostUpiId || editingUpi) && (
            <div className="flex gap-3">
              <input
                type="text"
                value={hostUpiId}
                onChange={(e) => setHostUpiId(e.target.value)}
                placeholder="Enter your UPI ID e.g. name@upi"
                className="flex-1 border border-border rounded-lg px-4 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button onClick={handleSaveUpi} disabled={!hostUpiId.trim()}>Save</Button>
              {editingUpi && (
                <Button variant="outline" onClick={() => setEditingUpi(false)}>Cancel</Button>
              )}
            </div>
          )}

          {hostUpiId && !editingUpi && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 bg-white rounded-xl border border-border">
                {/* Host preview QR shows total — just for host reference */}
                <QRCodeSVG
                  value={generateUPILink(hostUpiId, split.title, split.total_amount)}
                  size={120}
                  level="H"
                />
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-foreground">{hostUpiId}</p>
                <p className="text-xs text-muted-foreground">
                  Use the <span className="font-semibold">QR button</span> next to each member to show
                  them a QR pre-filled with <span className="font-semibold">their individual amount</span>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowHostQR(true)}>
                    <QrCode className="mr-2 h-4 w-4" />
                    View Full QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const upiLink = generateUPILink(hostUpiId, split.title, split.total_amount);
                      const msg = `Pay ₹${split.total_amount} for *${split.title}* → ${upiLink}\n\nOr scan QR at: ${window.location.origin}/splits/${splitId}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Share on WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button onClick={handleCopyLink} variant="outline" className="flex-1 sm:flex-none">
            <Copy className="mr-2 h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button
            onClick={() => {
              const splitLink = `${window.location.origin}/splits/${splitId}`;
              const text = generateWhatsAppMessage(split.title, split.total_amount, splitLink);
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }}
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Share on WhatsApp
          </Button>
        </div>

        {/* Members List */}
       <div className="bg-card border border-border rounded-2xl overflow-hidden">
  <div className="border-b border-border px-6 sm:px-8 py-4">
    <h2 className="text-2xl font-bold text-foreground">Members</h2>
  </div>

  <div className="divide-y divide-border">
    {members.map((member) => (
      <div
        key={member.id}
        className="px-6 sm:px-8 py-6 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                  member.paid ? 'bg-green-500' : 'bg-primary'
                }`}
              >
                {member.phone_number[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {member.phone_number}
                </p>
                {member.paid && member.paid_at && (
                  <p className="text-sm text-green-600">
                    Paid on {new Date(member.paid_at).toLocaleDateString()}
                  </p>
                )}
                {!member.paid && (
                  <p className="text-sm text-amber-600">Payment pending</p>
                )}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-primary mb-3">
              ₹{member.amount.toLocaleString()}
            </p>
            <div className="flex gap-2">

              {/* QR — visible to everyone */}
              {hostUpiId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setQrMember(member)}
                  title="Show payment QR"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              )}

              {/* WhatsApp reminder — owner only */}
              {isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendReminder(member)}
                  title="Send WhatsApp reminder"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}

              {/* Mark as paid — owner only */}
              {isOwner && (
                <Button
                  size="sm"
                  onClick={() => handlePaymentStatusChange(member.id, !member.paid)}
                  disabled={updating === member.id}
                  className={
                    member.paid
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-muted hover:bg-muted-foreground/20'
                  }
                >
                  {updating === member.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : member.paid ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}

            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>

{progress === 100 && (
  <div className="mt-8 p-6 rounded-xl bg-green-50 border border-green-200">
    <p className="text-center text-green-700 font-semibold">
      🎉 Everyone has paid! Split completed successfully.
    </p>
  </div>
)}
</div>

{/* QR Modal — visible to everyone */}
{qrMember && hostUpiId && (
  <div
    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onClick={() => setQrMember(null)}
  >
    <div
      className="bg-card rounded-2xl p-8 max-w-sm w-full space-y-4 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-bold text-foreground">Scan to Pay</h3>
      <p className="text-sm text-muted-foreground">
        {qrMember.phone_number}'s share for{' '}
        <span className="font-semibold">{split.title}</span>
      </p>
      <p className="text-4xl font-bold text-primary">
        ₹{qrMember.amount.toLocaleString()}
      </p>
      <div className="flex justify-center p-4 bg-white rounded-xl">
        <QRCodeSVG
          value={generateUPILink(hostUpiId, split.title, qrMember.amount)}
          size={220}
          level="H"
        />
      </div>
      <p className="text-sm font-mono text-foreground">{hostUpiId}</p>
      <p className="text-xs text-muted-foreground">
        Scan with GPay, PhonePe, or Paytm — amount is pre-filled to ₹{qrMember.amount}
      </p>
      <div className="flex gap-2">
        {/* WhatsApp send — owner only in modal too */}
        {isOwner && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleSendQRReminder(qrMember)}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Send on WhatsApp
          </Button>
        )}
        <Button className="flex-1" onClick={() => setQrMember(null)}>
          Close
        </Button>
      </div>
    </div>
  </div>
)}

      {/* Host Full QR Modal — total amount, for host's own reference */}
      {showHostQR && hostUpiId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHostQR(false)}
        >
          <div
            className="bg-card rounded-2xl p-8 max-w-sm w-full space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground">Your Payment QR</h3>
            <p className="text-sm text-muted-foreground">
              Total for <span className="font-semibold">{split.title}</span>
            </p>
            <p className="text-4xl font-bold text-primary">
              ₹{split.total_amount.toLocaleString()}
            </p>
            <div className="flex justify-center p-4 bg-white rounded-xl">
              <QRCodeSVG
                value={generateUPILink(hostUpiId, split.title, split.total_amount)}
                size={220}
                level="H"
              />
            </div>
            <p className="text-sm font-mono text-foreground">{hostUpiId}</p>
            <p className="text-xs text-muted-foreground">
              Use the per-member QR buttons instead so each person pays only their share
            </p>
            <Button className="w-full" onClick={() => setShowHostQR(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}