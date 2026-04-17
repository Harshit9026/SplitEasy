'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, Users, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface GroupMember {
  id?: string;
  name: string;
  phone: string;
  email: string;
  upi_id?: string;
}

interface Group {
  id: string;
  name: string;
  created_at: string;
  group_members: GroupMember[];
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-teal-500', 'bg-orange-500',
  'bg-amber-500', 'bg-pink-500', 'bg-blue-500'
];

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([
    { name: '', phone: '', email: '' , upi_id: '' }
  ]);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      await loadGroups();
    };
    init();
  }, [router]);

  const loadGroups = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('groups')
      .select(`*, group_members(*)`)
      .order('created_at', { ascending: false });
    if (!error) setGroups(data || []);
    setLoading(false);
  };


  const handleAddMember = () => {
    setMembers([...members, { name: '', phone: '', email: '' , upi_id: ''}]);
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: string, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handleSave = async () => {
  if (!groupName.trim()) return;
  const validMembers = members.filter(m => m.name.trim() && m.phone.trim());
  if (validMembers.length === 0) {
    alert('Add at least one member with name and phone');
    return;
  }
  setSaving(true);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name: groupName.trim(), created_by: user?.id })
    .select().single();

  if (error || !group) {
    console.error('Group insert error:', error);
    alert('Failed to create group: ' + error?.message);
    setSaving(false);
    return;
  }

  const { error: memberError } = await supabase.from('group_members').insert(
    validMembers.map(m => ({
      group_id: group.id,
      name: m.name.trim(),
      phone: m.phone.trim(),
      email: m.email.trim() || null,
      upi_id: m.upi_id?.trim() || null,
    }))
  );

  if (memberError) {
    console.error('Member insert error:', memberError);
    alert('Group created but members failed: ' + memberError.message);
  }

  setGroupName('');
  setMembers([{ name: '', phone: '', email: '', upi_id: '' }]); // ✅ fixed
  setShowForm(false);
  await loadGroups();
  setSaving(false);
};

  const handleDelete = async (groupId: string) => {
    const supabase = createClient();
    await supabase.from('groups').delete().eq('id', groupId);
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Groups
            </span>
          </Link>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Group
          </Button>
        </div>
      </nav>

      
<div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {showForm && (
          <div className="bg-card border border-primary/30 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-lg">New Group</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <Input
              placeholder="Group name e.g. Auto Gang, Office Lunch"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Members</p>
              {members.map((member, index) => (

<div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-center">
    <Input
      placeholder="Name"
      value={member.name}
      onChange={e => handleMemberChange(index, 'name', e.target.value)}
    />
    <Input
      placeholder="Phone"
      value={member.phone}
      onChange={e => handleMemberChange(index, 'phone', e.target.value)}
    />
    <Input
      placeholder="Email"
      value={member.email}
      onChange={e => handleMemberChange(index, 'email', e.target.value)}
    />
    // The UPI + delete button cell
<div className="flex gap-2 items-center col-span-1 sm:col-span-2 lg:col-span-1">
  <Input
    placeholder="UPI ID e.g. name@upi"
    value={member.upi_id || ''}
    onChange={e => handleMemberChange(index, 'upi_id', e.target.value)}
    className="flex-1"
  />
  {members.length > 1 && (
    <button onClick={() => handleRemoveMember(index)} className="text-muted-foreground hover:text-red-500 shrink-0">
      <Trash2 className="h-4 w-4" />
    </button>
  )}
</div>
  </div>
))}
              <Button variant="outline" className="w-full" onClick={handleAddMember}>
                <Plus className="h-4 w-4 mr-1" /> Add Member
              </Button>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Group'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {groups.length === 0 && !showForm ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-5xl">👥</p>
            <p className="text-xl font-semibold text-foreground">No groups yet</p>
            <p className="text-muted-foreground">Create a group for your auto gang or office crew</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create your first group
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 transition-all cursor-pointer">
                  <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3 min-w-0">  
                      <div className="flex -space-x-2 shrink-0">  
                        {group.group_members?.slice(0, 4).map((m, i) => (
                          <div key={i}
                            className={`w-9 h-9 rounded-full border-2 border-background flex items-center justify-center text-white font-bold text-sm ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                            {m.name[0]?.toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0"> 
                        <p className="font-semibold text-foreground truncate">{group.name}</p>  
                        <p className="text-xs text-muted-foreground">
                          {group.group_members?.length || 0} members
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.preventDefault(); handleDelete(group.id); }}
                        className="text-muted-foreground hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}