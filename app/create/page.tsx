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

  // Step 1: Split Details
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Add Members
  const [members, setMembers] = useState<Array<{ name: string; phone: string; amount: string; email: string }>>([
  { name: '', phone: '', amount: '', email: '' },
]);

  const [splitId, setSplitId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
      } else {
        setUserLoaded(true);
      }
    };
    checkAuth();
  }, [router]);

  const handleNextStep = async () => {
    if (step === 1) {
      if (!title.trim() || !totalAmount) {
        setError('Please fill in all required fields');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const split = await createSplit(title, parseFloat(totalAmount), description);
        setSplitId(split.id);
        setStep(2);
      } catch (err) {
        setError('Failed to create split. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddMember = () => {
    setMembers([...members, { name: '', phone: '', amount: '', email: '' }]);
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: string, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  const handleCreateSplit = async () => {
    if (!splitId) return;

    // Validate members
    const validMembers = members.filter((m) => m.phone.trim() && m.amount);
    if (validMembers.length === 0) {
      setError('Please add at least one member with a phone number and amount');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      for (const member of validMembers) {
        await addSplitMember(splitId, member.phone, parseFloat(member.amount), member.email);
      }

      // Redirect to split details
      router.push(`/splits/${splitId}`);
    } catch (err) {
      setError('Failed to add members. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!userLoaded) {
    return null;
  }

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

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-2xl">
          {/* Progress Indicator */}
          <div className="flex items-center gap-4 mb-12">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                step >= 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              1
            </div>
            <div className={`flex-1 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                step >= 2
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              2
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 sm:p-12 shadow-xl">
            {/* Step 1: Split Details */}
            {step === 1 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    Create a New Split
                  </h1>
                  <p className="text-muted-foreground">
                    Give your split a name and total amount
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Split Name *
                    </label>
                    <Input
                      placeholder="e.g., Pizza Night, Road Trip"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Total Amount (₹) *
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Description (Optional)
                    </label>
                    <Input
                      placeholder="Add notes about this split..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-base"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Link href="/splits" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    onClick={handleNextStep}
                    disabled={isLoading}
                    className="flex-1"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Next Step'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Add Members */}
            {step === 2 && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    Add Friends
                  </h1>
                  <p className="text-muted-foreground">
                    Add the people who owe money for this split
                  </p>
                </div>

                <div className="space-y-4">
                  {members.map((member, index) => (
                    <div
                      key={index}
                      className="flex gap-3 items-end p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex-1">
                        <label className="text-xs font-medium text-foreground">
                          Name
                        </label>
                        <Input
                          placeholder="Friend's name"
                          value={member.name}
                          onChange={(e) =>
                            handleMemberChange(index, 'name', e.target.value)
                          }
                          className="mt-1"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-foreground">
                          Phone
                        </label>
                        <Input
                          placeholder="9876543210"
                          value={member.phone}
                          onChange={(e) =>
                            handleMemberChange(index, 'phone', e.target.value)
                          }
                          className="mt-1"
                        />
                      </div>
                      <div className="flex-1">
  <label className="text-xs font-medium text-foreground">
    Email
  </label>
  <Input
    placeholder="friend@gmail.com"
    value={member.email}
    onChange={(e) =>
      handleMemberChange(index, 'email', e.target.value)
    }
    className="mt-1"
  />
</div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-foreground">
                          Amount (₹)
                        </label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={member.amount}
                          onChange={(e) =>
                            handleMemberChange(index, 'amount', e.target.value)
                          }
                          className="mt-1"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(index)}
                        className="mb-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={handleAddMember}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Friend
                  </Button>
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateSplit}
                    disabled={isLoading}
                    className="flex-1"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Create Split
                      </>
                    )}
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
