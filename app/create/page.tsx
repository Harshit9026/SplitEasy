// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { createClient } from '@/lib/supabase/client';
// import { createSplit, addSplitMember } from '@/lib/split-utils';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { ArrowLeft, Plus, Trash2, Send, Loader2 } from 'lucide-react';
// import Link from 'next/link';

// export default function CreateSplitPage() {
//   const router = useRouter();
//   const [step, setStep] = useState(1);
//   const [isLoading, setIsLoading] = useState(false);
//   const [userLoaded, setUserLoaded] = useState(false);
//   const [hostUpiId, setHostUpiId] = useState('');

//   // Step 1: Split Details
//   const [title, setTitle] = useState('');
//   const [totalAmount, setTotalAmount] = useState('');
//   const [description, setDescription] = useState('');

//   // Step 2: Add Members
//   const [members, setMembers] = useState<Array<{ name: string; phone: string; amount: string; email: string }>>([
//   { name: '', phone: '', amount: '', email: '' },
// ]);

//   const [splitId, setSplitId] = useState<string | null>(null);
//   const [error, setError] = useState('');

//   // Check auth
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
//       }
//     };
//     checkAuth();
//   }, [router]);

//   const handleNextStep = async () => {
//     if (step === 1) {
//       if (!title.trim() || !totalAmount) {
//         setError('Please fill in all required fields');
//         return;
//       }

//       setIsLoading(true);
//       setError('');

//       try {
//         const split = await createSplit(title, parseFloat(totalAmount), description, hostUpiId);
//         setSplitId(split.id);
//         setStep(2);
//       } catch (err) {
//         setError('Failed to create split. Please try again.');
//       } finally {
//         setIsLoading(false);
//       }
//     }
//   };

//   const handleAddMember = () => {
//     setMembers([...members, { name: '', phone: '', amount: '', email: '' }]);
//   };

//   const handleRemoveMember = (index: number) => {
//     setMembers(members.filter((_, i) => i !== index));
//   };

//   const handleMemberChange = (index: number, field: string, value: string) => {
//     const newMembers = [...members];
//     newMembers[index] = { ...newMembers[index], [field]: value };
//     setMembers(newMembers);
//   };

//   const handleCreateSplit = async () => {
//     if (!splitId) return;

//     // Validate members
//     const validMembers = members.filter((m) => m.phone.trim() && m.amount);
//     if (validMembers.length === 0) {
//       setError('Please add at least one member with a phone number and amount');
//       return;
//     }

//     setIsLoading(true);
//     setError('');

//     try {
//       for (const member of validMembers) {
//         await addSplitMember(splitId, member.phone, parseFloat(member.amount), member.email);
//       }

//       // Redirect to split details
//       router.push(`/splits/${splitId}`);
//     } catch (err) {
//       setError('Failed to add members. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   if (!userLoaded) {
//     return null;
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
//       {/* Navigation */}
//       <nav className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
//         <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16">
//           <Link
//             href="/splits"
//             className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
//           >
//             <ArrowLeft className="h-5 w-5" />
//             <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
//               SplitEasy
//             </span>
//           </Link>
//         </div>
//       </nav>

//       {/* Main Content */}
//       <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
//         <div className="w-full max-w-2xl">
//           {/* Progress Indicator */}
//           <div className="flex items-center gap-4 mb-12">
//             <div
//               className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
//                 step >= 1
//                   ? 'bg-primary text-primary-foreground'
//                   : 'bg-muted text-muted-foreground'
//               }`}
//             >
//               1
//             </div>
//             <div className={`flex-1 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
//             <div
//               className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
//                 step >= 2
//                   ? 'bg-primary text-primary-foreground'
//                   : 'bg-muted text-muted-foreground'
//               }`}
//             >
//               2
//             </div>
//           </div>

//           <div className="bg-card rounded-2xl border border-border p-8 sm:p-12 shadow-xl">
//             {/* Step 1: Split Details */}
//             {step === 1 && (
//               <div className="space-y-8">
//                 <div className="space-y-2">
//                   <h1 className="text-3xl font-bold text-foreground">
//                     Create a New Split
//                   </h1>
//                   <p className="text-muted-foreground">
//                     Give your split a name and total amount
//                   </p>
//                 </div>

//                 <div className="space-y-4">
//                   <div className="space-y-2">
//                     <label className="text-sm font-medium text-foreground">
//                       Split Name *
//                     </label>
//                     <Input
//                       placeholder="e.g., Pizza Night, Road Trip"
//                       value={title}
//                       onChange={(e) => setTitle(e.target.value)}
//                       className="text-base"
//                     />
//                   </div>

//                   <div className="space-y-2">
//                     <label className="text-sm font-medium text-foreground">
//                       Total Amount (₹) *
//                     </label>
//                     <Input
//                       type="number"
//                       placeholder="0.00"
//                       value={totalAmount}
//                       onChange={(e) => setTotalAmount(e.target.value)}
//                       className="text-base"
//                     />
//                   </div>

//                   <div className="space-y-2">
//   <label className="text-sm font-medium text-foreground">
//     Your UPI ID *
//   </label>
//   <Input
//     placeholder="yourname@upi"
//     value={hostUpiId}
//     onChange={(e) => setHostUpiId(e.target.value)}
//     className="text-base"
//   />
// </div>

//                   <div className="space-y-2">
//                     <label className="text-sm font-medium text-foreground">
//                       Description (Optional)
//                     </label>
//                     <Input
//                       placeholder="Add notes about this split..."
//                       value={description}
//                       onChange={(e) => setDescription(e.target.value)}
//                       className="text-base"
//                     />
//                   </div>
//                 </div>

//                 {error && (
//                   <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
//                     {error}
//                   </div>
//                 )}

//                 <div className="flex gap-4">
//                   <Link href="/splits" className="flex-1">
//                     <Button variant="outline" className="w-full">
//                       Cancel
//                     </Button>
//                   </Link>
//                   <Button
//                     onClick={handleNextStep}
//                     disabled={isLoading}
//                     className="flex-1"
//                     size="lg"
//                   >
//                     {isLoading ? (
//                       <>
//                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                         Creating...
//                       </>
//                     ) : (
//                       'Next Step'
//                     )}
//                   </Button>
//                 </div>
//               </div>
//             )}

//             {/* Step 2: Add Members */}
//             {step === 2 && (
//               <div className="space-y-8">
//                 <div className="space-y-2">
//                   <h1 className="text-3xl font-bold text-foreground">
//                     Add Friends
//                   </h1>
//                   <p className="text-muted-foreground">
//                     Add the people who owe money for this split
//                   </p>
//                 </div>

//                 <div className="space-y-4">
//                   {members.map((member, index) => (
//                     <div
//                       key={index}
//                       className="flex gap-3 items-end p-4 rounded-lg border border-border bg-muted/30"
//                     >
//                       <div className="flex-1">
//                         <label className="text-xs font-medium text-foreground">
//                           Name
//                         </label>
//                         <Input
//                           placeholder="Friend's name"
//                           value={member.name}
//                           onChange={(e) =>
//                             handleMemberChange(index, 'name', e.target.value)
//                           }
//                           className="mt-1"
//                         />
//                       </div>
//                       <div className="flex-1">
//                         <label className="text-xs font-medium text-foreground">
//                           Phone
//                         </label>
//                         <Input
//                           placeholder="9876543210"
//                           value={member.phone}
//                           onChange={(e) =>
//                             handleMemberChange(index, 'phone', e.target.value)
//                           }
//                           className="mt-1"
//                         />
//                       </div>
//                       <div className="flex-1">
//   <label className="text-xs font-medium text-foreground">
//     Email
//   </label>
//   <Input
//     placeholder="friend@gmail.com"
//     value={member.email}
//     onChange={(e) =>
//       handleMemberChange(index, 'email', e.target.value)
//     }
//     className="mt-1"
//   />
// </div>
//                       <div className="flex-1">
//                         <label className="text-xs font-medium text-foreground">
//                           Amount (₹)
//                         </label>
//                         <Input
//                           type="number"
//                           placeholder="0.00"
//                           value={member.amount}
//                           onChange={(e) =>
//                             handleMemberChange(index, 'amount', e.target.value)
//                           }
//                           className="mt-1"
//                         />
//                       </div>
//                       <Button
//                         variant="ghost"
//                         size="sm"
//                         onClick={() => handleRemoveMember(index)}
//                         className="mb-0 text-destructive hover:bg-destructive/10"
//                       >
//                         <Trash2 className="h-4 w-4" />
//                       </Button>
//                     </div>
//                   ))}

//                   <Button
//                     variant="outline"
//                     onClick={handleAddMember}
//                     className="w-full"
//                   >
//                     <Plus className="mr-2 h-4 w-4" />
//                     Add Another Friend
//                   </Button>
//                 </div>

//                 {error && (
//                   <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
//                     {error}
//                   </div>
//                 )}

//                 <div className="flex gap-4">
//                   <Button
//                     variant="outline"
//                     onClick={() => setStep(1)}
//                     className="flex-1"
//                   >
//                     Back
//                   </Button>
//                   <Button
//                     onClick={handleCreateSplit}
//                     disabled={isLoading}
//                     className="flex-1"
//                     size="lg"
//                   >
//                     {isLoading ? (
//                       <>
//                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                         Creating...
//                       </>
//                     ) : (
//                       <>
//                         <Send className="mr-2 h-4 w-4" />
//                         Create Split
//                       </>
//                     )}
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createSplit, addSplitMember } from '@/lib/split-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateSplitPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [hostUpiId, setHostUpiId] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Step 1
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');

  // Split mode
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');

  // Step 2: Members (excluding creator)
  const [members, setMembers] = useState<Array<{ name: string; phone: string; amount: string; email: string }>>([
    { name: '', phone: '', amount: '', email: '' },
  ]);

  const [splitId, setSplitId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
      } else {
        setCurrentUser(user);
        setUserLoaded(true);
      }
    };
    checkAuth();
  }, [router]);

  // Auto-calculate equal split amounts when switching to equal mode or member count changes
  useEffect(() => {
    if (splitMode === 'equal' && totalAmount) {
      const total = parseFloat(totalAmount);
      if (!isNaN(total)) {
        // +1 for the creator
        const perPerson = (total / (members.length + 1)).toFixed(2);
        setMembers(prev => prev.map(m => ({ ...m, amount: perPerson })));
      }
    }
  }, [splitMode, members.length, totalAmount]);

  const handleNextStep = async () => {
    if (!title.trim() || !totalAmount) {
      setError('Please fill in all required fields');
      return;
    }
    if (!hostUpiId.trim()) {
      setError('Please enter your UPI ID');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const split = await createSplit(title, parseFloat(totalAmount), description, hostUpiId);
      setSplitId(split.id);
      setStep(2);
    } catch (err) {
      setError('Failed to create split. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = () => {
    const newMember = { name: '', phone: '', amount: '', email: '' };
    const newMembers = [...members, newMember];

    if (splitMode === 'equal' && totalAmount) {
      const total = parseFloat(totalAmount);
      if (!isNaN(total)) {
        const perPerson = (total / (newMembers.length + 1)).toFixed(2);
        setMembers(newMembers.map(m => ({ ...m, amount: perPerson })));
        return;
      }
    }
    setMembers(newMembers);
  };

  const handleRemoveMember = (index: number) => {
    const newMembers = members.filter((_, i) => i !== index);
    if (splitMode === 'equal' && totalAmount && newMembers.length > 0) {
      const total = parseFloat(totalAmount);
      if (!isNaN(total)) {
        const perPerson = (total / (newMembers.length + 1)).toFixed(2);
        setMembers(newMembers.map(m => ({ ...m, amount: perPerson })));
        return;
      }
    }
    setMembers(newMembers);
  };

  const handleMemberChange = (index: number, field: string, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  // Total assigned to members (creator's share is total - sum of member amounts)
  const membersTotal = members.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const creatorShare = totalAmount ? Math.max(0, parseFloat(totalAmount) - membersTotal) : 0;
  const totalAssigned = membersTotal + creatorShare;
  const isBalanced = totalAmount ? Math.abs(totalAssigned - parseFloat(totalAmount)) < 0.01 : false;

  const handleCreateSplit = async () => {
    if (!splitId || !currentUser) return;

    const validMembers = members.filter((m) => m.phone.trim() && m.amount);
    if (validMembers.length === 0) {
      setError('Please add at least one member with a phone number and amount');
      return;
    }

    if (splitMode === 'custom' && !isBalanced) {
      setError(`Amounts don't add up to ₹${totalAmount}. Remaining: ₹${(parseFloat(totalAmount) - membersTotal).toFixed(2)}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Add creator as a paid member
      const supabase = createClient();
      await supabase.from('split_members').insert({
        split_id: splitId,
        user_id: currentUser.id,
        phone_number: currentUser.phone || currentUser.email || 'You (creator)',
        email: currentUser.email || null,
        amount: parseFloat(creatorShare.toFixed(2)),
        paid: true,
        paid_at: new Date().toISOString(),
      });

      // Add other members
      for (const member of validMembers) {
        await addSplitMember(splitId, member.phone, parseFloat(member.amount), member.email);
      }

      router.push(`/splits/${splitId}`);
    } catch (err) {
      console.error(err);
      setError('Failed to add members. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!userLoaded) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16">
          <Link
            href="/splits"
            className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SplitEasy
            </span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="flex items-center gap-4 mb-12">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
            <div className={`flex-1 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 sm:p-12 shadow-xl">

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">Create a New Split</h1>
                  <p className="text-muted-foreground">Give your split a name and total amount</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Split Name *</label>
                    <Input
                      placeholder="e.g., Pizza Night, Road Trip"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Total Amount (₹) *</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Your UPI ID *</label>
                    <Input
                      placeholder="yourname@upi"
                      value={hostUpiId}
                      onChange={(e) => setHostUpiId(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Description (Optional)</label>
                    <Input
                      placeholder="Add notes about this split..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-base"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">{error}</div>
                )}

                <div className="flex gap-4">
                  <Link href="/splits" className="flex-1">
                    <Button variant="outline" className="w-full">Cancel</Button>
                  </Link>
                  <Button onClick={handleNextStep} disabled={isLoading} className="flex-1" size="lg">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Next Step'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">Add Friends</h1>
                  <p className="text-muted-foreground">Add people who need to pay for this split</p>
                </div>

                {/* Split mode toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Split Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSplitMode('equal')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        splitMode === 'equal'
                          ? 'bg-primary text-white border-primary'
                          : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      ⚖️ Equal Split
                    </button>
                    <button
                      onClick={() => setSplitMode('custom')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        splitMode === 'custom'
                          ? 'bg-primary text-white border-primary'
                          : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      ✏️ Custom Split
                    </button>
                  </div>
                  {splitMode === 'equal' && totalAmount && (
                    <p className="text-xs text-muted-foreground">
                      ₹{totalAmount} ÷ {members.length + 1} people = <span className="font-semibold text-primary">₹{(parseFloat(totalAmount) / (members.length + 1)).toFixed(2)} each</span>
                    </p>
                  )}
                </div>

                {/* Creator row — always shown as paid */}
                <div className="p-4 rounded-xl border border-green-200 bg-green-50 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">You (creator)</p>
                      <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-700">
                        ₹{creatorShare.toFixed(2)}
                      </p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Paid</span>
                    </div>
                  </div>
                </div>

                {/* Member rows */}
                <div className="space-y-3">
                  {members.map((member, index) => (
                    <div key={index} className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Friend {index + 1}</p>
                        {members.length > 1 && (
                          <button
                            onClick={() => handleRemoveMember(index)}
                            className="text-destructive hover:bg-destructive/10 rounded-lg p-1 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Phone *</label>
                          <Input
                            placeholder="9876543210"
                            value={member.phone}
                            onChange={(e) => handleMemberChange(index, 'phone', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Amount (₹) *</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={member.amount}
                            onChange={(e) => handleMemberChange(index, 'amount', e.target.value)}
                            disabled={splitMode === 'equal'}
                            className="mt-1 disabled:opacity-60"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Name</label>
                          <Input
                            placeholder="Friend's name"
                            value={member.name}
                            onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Email</label>
                          <Input
                            placeholder="friend@gmail.com"
                            value={member.email}
                            onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={handleAddMember} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Friend
                </Button>

                {/* Summary */}
                {totalAmount && (
                  <div className={`p-4 rounded-xl border text-sm space-y-1 ${isBalanced ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total bill</span>
                      <span className="font-semibold">₹{parseFloat(totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Your share</span>
                      <span className="font-semibold text-green-700">₹{creatorShare.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Friends owe</span>
                      <span className="font-semibold">₹{membersTotal.toFixed(2)}</span>
                    </div>
                    {!isBalanced && splitMode === 'custom' && (
                      <p className="text-amber-700 font-medium pt-1">
                        ⚠️ ₹{Math.abs(parseFloat(totalAmount) - totalAssigned).toFixed(2)} {totalAssigned > parseFloat(totalAmount) ? 'over' : 'remaining'}
                      </p>
                    )}
                    {isBalanced && <p className="text-green-700 font-medium pt-1">✓ Amounts balanced</p>}
                  </div>
                )}

                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">{error}</div>
                )}

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={handleCreateSplit} disabled={isLoading} className="flex-1" size="lg">
                    {isLoading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                      : <><Send className="mr-2 h-4 w-4" />Create Split</>
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}