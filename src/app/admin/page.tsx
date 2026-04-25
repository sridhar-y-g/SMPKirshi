'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import {
  apiAdminStats, apiAdminUsers, apiAdminEditUser,
  apiAdminSetRole, apiAdminSetStatus, apiAdminDeleteUser
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Users, ShieldCheck, Clock, Crown, Search, RefreshCw,
  Edit3, Trash2, ShieldAlert, UserCheck, UserX, Loader2,
  BarChart3, Sprout, MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserNav } from '@/components/layout/user-nav';

interface UserRow {
  id: number; email: string; is_active: boolean; is_admin: boolean;
  created_at: string | null; full_name: string | null; phone: string | null;
  village: string | null; state: string | null; crop_type: string | null;
  land_holding_acres: number | null;
}

interface Stats { total_users: number; active_users: number; pending_verification: number; admin_count: number; }

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router  = useRouter();
  const { toast } = useToast();

  const [stats,      setStats]      = useState<Stats | null>(null);
  const [users,      setUsers]      = useState<UserRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal
  const [editUser,   setEditUser]   = useState<UserRow | null>(null);
  const [editForm,   setEditForm]   = useState<Partial<UserRow>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Confirm dialog
  const [confirm, setConfirm] = useState<{ title: string; desc: string; action: () => Promise<void> } | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading) {
      if (!user)          router.replace('/login');
      else if (!user.is_admin) router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [s, u] = await Promise.all([apiAdminStats(), apiAdminUsers()]);
      setStats(s); setUsers(u.users);
    } catch {
      toast({ title: 'Error', description: 'Failed to load admin data.', variant: 'destructive' });
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { if (user?.is_admin) fetchAll(); }, [user, fetchAll]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const doAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    try { await fn(); toast({ title: '✅ Success', description: successMsg }); fetchAll(true); }
    catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Action failed.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    await doAction(() => apiAdminEditUser(editUser.id, editForm), 'User updated successfully.');
    setEditSaving(false); setEditUser(null);
  };

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.state     ?? '').toLowerCase().includes(q) ||
      (u.crop_type ?? '').toLowerCase().includes(q);
  });

  // ── Loading states ──────────────────────────────────────────────────────────
  if (authLoading || (!user?.is_admin && !authLoading)) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Crown className="h-7 w-7 text-amber-500" /> Admin Console
          </h1>
          <p className="text-muted-foreground mt-1">Sampoorna Krishi — Platform User Management</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => fetchAll(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <UserNav />
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users,      label: 'Total Users',  val: stats.total_users,           cls: 'text-blue-500'   },
            { icon: UserCheck,  label: 'Active',       val: stats.active_users,          cls: 'text-green-500'  },
            { icon: Clock,      label: 'Pending OTP',  val: stats.pending_verification,  cls: 'text-amber-500'  },
            { icon: ShieldCheck,label: 'Admins',       val: stats.admin_count,           cls: 'text-purple-500' },
          ].map(({ icon: Icon, label, val, cls }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4 pt-5">
                <Icon className={`h-8 w-8 ${cls}`} />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold">{val}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* User table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Registered Farmers
            <Badge variant="secondary">{filtered.length} / {users.length}</Badge>
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm"
              placeholder="Search by email, name, state…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>State / Crop</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No users found.</TableCell></TableRow>
                  ) : filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{u.id}</TableCell>
                      <TableCell className="text-sm font-medium">{u.email}</TableCell>
                      <TableCell className="text-sm">{u.full_name || <span className="text-muted-foreground italic">—</span>}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {u.state    && <span className="text-xs flex items-center gap-1"><MapPin  className="h-3 w-3" />{u.state}</span>}
                          {u.crop_type && <span className="text-xs flex items-center gap-1"><Sprout className="h-3 w-3" />{u.crop_type}</span>}
                          {!u.state && !u.crop_type && <span className="text-xs text-muted-foreground italic">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'default' : 'secondary'} className={u.is_active ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'}>
                          {u.is_active ? 'Active' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={u.is_admin ? 'border-purple-500/50 text-purple-600 dark:text-purple-400' : ''}>
                          {u.is_admin ? '👑 Admin' : 'Farmer'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit */}
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit"
                            onClick={() => { setEditUser(u); setEditForm({ full_name: u.full_name ?? '', phone: u.phone ?? '', village: u.village ?? '', state: u.state ?? '', crop_type: u.crop_type ?? '', land_holding_acres: u.land_holding_acres ?? undefined, is_admin: u.is_admin, is_active: u.is_active }); }}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          {/* Admin toggle */}
                          <Button variant="ghost" size="icon" className="h-7 w-7" title={u.is_admin ? 'Revoke Admin' : 'Promote to Admin'}
                            onClick={() => setConfirm({ title: u.is_admin ? 'Revoke Admin' : 'Promote to Admin', desc: `${u.is_admin ? 'Remove admin privileges from' : 'Grant admin privileges to'} "${u.email}"?`, action: () => doAction(() => apiAdminSetRole(u.id, !u.is_admin), `Role updated for ${u.email}`) })}>
                            {u.is_admin ? <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />}
                          </Button>
                          {/* Status toggle */}
                          <Button variant="ghost" size="icon" className="h-7 w-7" title={u.is_active ? 'Suspend' : 'Activate'}
                            onClick={() => setConfirm({ title: u.is_active ? 'Suspend Account' : 'Activate Account', desc: `${u.is_active ? 'Suspend' : 'Activate'} account for "${u.email}"?`, action: () => doAction(() => apiAdminSetStatus(u.id, !u.is_active), `Account ${u.is_active ? 'suspended' : 'activated'} for ${u.email}`) })}>
                            {u.is_active ? <UserX className="h-3.5 w-3.5 text-orange-500" /> : <UserCheck className="h-3.5 w-3.5 text-green-500" />}
                          </Button>
                          {/* Delete */}
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete"
                            onClick={() => setConfirm({ title: 'Delete User', desc: `Permanently delete "${u.email}"? This cannot be undone.`, action: () => doAction(() => apiAdminDeleteUser(u.id), `${u.email} deleted.`) })}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Farmer — <span className="text-primary">{editUser?.email}</span></DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([['full_name','Full Name','text'], ['phone','Phone','text'], ['village','Village','text'], ['state','State','text'], ['crop_type','Crop Type','text'], ['land_holding_acres','Land (acres)','number']] as [keyof UserRow, string, string][]).map(([key, label, type]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input type={type} step={type==='number'?'0.5':undefined} className="h-8 text-sm" value={(editForm as Record<string, unknown>)[key] as string ?? ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))} />
              </div>
            ))}
            <div className="col-span-2 flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={!!editForm.is_active} onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))} /> Account Active
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={!!editForm.is_admin} onChange={(e) => setEditForm((p) => ({ ...p, is_admin: e.target.checked }))} /> Admin Role
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await confirm!.action(); setConfirm(null); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
