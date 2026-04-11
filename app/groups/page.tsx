'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, Plus, Trash2, ArrowRight, Users, X
} from 'lucide-react';
import Link from 'next/link';

interface GroupMember {
  id?: string;
  name: string;
  phone: string;
  email: string;
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
    { name: '', phone: '', email: '' }
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
    setMembers([...members, { name: '', phone: '', email: '' }]);
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
    if (validMembers.length === 0) return;

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name: groupName.trim(), created_by: user?.id })
      .select()
      .single();

    if (error || !group) { setSaving(false); return; }

    await supabase.from('group_members').insert(
      validMembers.map(m => ({
        group_id: group.id,
        name: m.name.trim(),
        phone: m.phone.trim(),
        email: m.email.trim() || null,
      }))
    );

    setGroupName('');
    setMembers([{ name: '', phone: '', email: '' }]);
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
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Groups
          </span>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Group
          </Button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

        {/* Create Group Form */}
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
                <div key={index} className="grid grid-cols-3 gap-2 items-center">
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
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email"
                      value={member.email}
                      onChange={e => handleMemberChange(index, 'email', e.target.value)}
                    />
                    {members.length > 1 && (
                      <button
                        onClick={() => handleRemoveMember(index)}
                        className="text-muted-foreground hover:text-red-500"
                      >
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

        {/* Groups List */}
        {groups.length === 0 && !showForm ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-5xl">👥</p>
            <p className="text-xl font-semibold text-foreground">No groups yet</p>
            <p className="text-muted-foreground">
              Create a group for your auto gang, office lunch crew, or roommates
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create your first group
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <div
                key={group.id}
                className="bg-card border border-border rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.group_members?.length || 0} members
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/settle?group=${group.id}`}>
                      <Button size="sm" variant="outline">
                        Settle Up
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Members avatars */}
                <div className="flex gap-2 flex-wrap">
                  {group.group_members?.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {m.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs text-foreground">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}