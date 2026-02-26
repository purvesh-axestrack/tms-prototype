import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  getUsers, createUser, updateUser, deleteUser, resetUserPassword,
  getAccessorialTypes, createAccessorialType,
  getDeductionTypes, createDeductionType,
  getSamsaraStatus, connectSamsara, disconnectSamsara,
} from '../services/api';
import GmailConnectionCard from '../components/GmailConnectionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Users, Receipt, Minus, Link2, Plus, KeyRound, Loader2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import ThemeSelector from '../components/ThemeSelector';

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
        <Settings className="w-6 h-6" />
        Settings
      </h2>

      <Tabs defaultValue="appearance">
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="gmail">Gmail</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="accessorials">Accessorial Types</TabsTrigger>}
          {isAdmin && <TabsTrigger value="deductions">Deduction Types</TabsTrigger>}
          {isAdmin && <TabsTrigger value="samsara">Samsara</TabsTrigger>}
        </TabsList>

        <TabsContent value="appearance" className="mt-4">
          <ThemeSelector />
        </TabsContent>

        <TabsContent value="gmail" className="mt-4">
          <GmailConnectionCard />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <UsersTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="accessorials" className="mt-4">
            <AccessorialTypesTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="deductions" className="mt-4">
            <DeductionTypesTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="samsara" className="mt-4">
            <SamsaraTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ─── Users Tab ──────────────────────────────────────────────

function UsersTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [form, setForm] = useState({ email: '', full_name: '', role: 'DISPATCHER', password: '' });
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success('User created');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ email: '', full_name: '', role: 'DISPATCHER', password: '' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success('User deactivated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to deactivate'),
  });

  const resetMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: (data) => {
      setTempPassword(data.temp_password);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to reset password'),
  });

  const roleColors = {
    ADMIN: 'bg-purple-100 text-purple-700',
    DISPATCHER: 'bg-blue-100 text-blue-700',
    ACCOUNTANT: 'bg-green-100 text-green-700',
  };

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">Manage user accounts and roles</p>
        <Button onClick={() => { setForm({ email: '', full_name: '', role: 'DISPATCHER', password: '' }); setShowCreate(true); }} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge className={roleColors[u.role] || ''}>{u.role}</Badge></TableCell>
                <TableCell>
                  <Badge className={u.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setForm({ email: u.email, full_name: u.full_name, role: u.role, password: '' });
                      setEditTarget(u);
                    }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setTempPassword(''); setResetTarget(u); resetMutation.mutate(u.id); }}>
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    {u.id !== currentUser?.id && u.is_active && (
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(u)}>Deactivate</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add User</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISPATCHER">Dispatcher</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Leave blank for default" />
              <p className="text-xs text-muted-foreground">Default: changeme123</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="bg-amber-500 hover:bg-amber-600">
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit User</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISPATCHER">Dispatcher</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Leave blank to keep current" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={() => {
              const updates = {};
              if (form.full_name !== editTarget.full_name) updates.full_name = form.full_name;
              if (form.email !== editTarget.email) updates.email = form.email;
              if (form.role !== editTarget.role) updates.role = form.role;
              if (form.password) updates.password = form.password;
              if (Object.keys(updates).length === 0) return toast.info('No changes');
              updateMutation.mutate({ id: editTarget.id, data: updates });
            }} disabled={updateMutation.isPending} className="bg-amber-500 hover:bg-amber-600">
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Password Reset</DialogTitle></DialogHeader>
          {resetMutation.isPending ? (
            <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Generating temporary password...</div>
          ) : tempPassword ? (
            <div className="space-y-3">
              <p className="text-sm">Temporary password for <span className="font-semibold">{resetTarget?.full_name}</span>:</p>
              <div className="bg-muted p-3 rounded-lg font-mono text-lg text-center select-all">{tempPassword}</div>
              <p className="text-xs text-muted-foreground">Share this with the user. They should change it on first login.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setResetTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate {deleteTarget?.full_name}? They will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(deleteTarget.id)}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Accessorial Types Tab ──────────────────────────────────

function AccessorialTypesTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', default_amount: '', unit: 'FLAT' });
  const queryClient = useQueryClient();

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['accessorialTypes'],
    queryFn: getAccessorialTypes,
  });

  const createMutation = useMutation({
    mutationFn: createAccessorialType,
    onSuccess: () => {
      toast.success('Accessorial type created');
      queryClient.invalidateQueries({ queryKey: ['accessorialTypes'] });
      setShowCreate(false);
      setForm({ code: '', name: '', description: '', default_amount: '', unit: 'FLAT' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">Accessorial charge types applied to loads (detention, lumper, TONU, etc.)</p>
        <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4" /> Add Type
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Default Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No accessorial types configured</TableCell></TableRow>
            ) : types.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-mono font-semibold">{t.code}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell><Badge variant="outline">{t.unit}</Badge></TableCell>
                <TableCell className="text-right font-medium">${parseFloat(t.default_amount).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Accessorial Type</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g., DET" />
              </div>
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Detention" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Default Amount</Label>
                <Input type="number" value={form.default_amount} onChange={(e) => setForm(p => ({ ...p, default_amount: e.target.value }))} step="0.01" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLAT">Flat</SelectItem>
                    <SelectItem value="PER_HOUR">Per Hour</SelectItem>
                    <SelectItem value="PER_MILE">Per Mile</SelectItem>
                    <SelectItem value="PER_CWT">Per CWT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ ...form, default_amount: parseFloat(form.default_amount) || 0 })}
              disabled={createMutation.isPending || !form.code || !form.name}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Deduction Types Tab ────────────────────────────────────

function DeductionTypesTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', default_amount: '', is_recurring: false });
  const queryClient = useQueryClient();

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['deductionTypes'],
    queryFn: getDeductionTypes,
  });

  const createMutation = useMutation({
    mutationFn: createDeductionType,
    onSuccess: () => {
      toast.success('Deduction type created');
      queryClient.invalidateQueries({ queryKey: ['deductionTypes'] });
      setShowCreate(false);
      setForm({ code: '', name: '', description: '', default_amount: '', is_recurring: false });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">Deduction types applied to driver settlements (insurance, advances, ELD, etc.)</p>
        <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4" /> Add Type
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead className="text-right">Default Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No deduction types configured</TableCell></TableRow>
            ) : types.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-mono font-semibold">{t.code}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>
                  <Badge className={t.is_recurring ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}>
                    {t.is_recurring ? 'Recurring' : 'One-time'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">${parseFloat(t.default_amount).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Deduction Type</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g., INS" />
              </div>
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Insurance" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Default Amount</Label>
                <Input type="number" value={form.default_amount} onChange={(e) => setForm(p => ({ ...p, default_amount: e.target.value }))} step="0.01" placeholder="0.00" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="is_recurring"
                  checked={form.is_recurring}
                  onCheckedChange={(checked) => setForm(p => ({ ...p, is_recurring: !!checked }))}
                />
                <Label htmlFor="is_recurring" className="font-normal">Recurring (auto-applied each settlement)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ ...form, default_amount: parseFloat(form.default_amount) || 0 })}
              disabled={createMutation.isPending || !form.code || !form.name}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Samsara Tab ────────────────────────────────────────────

function SamsaraTab() {
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['samsara-status'],
    queryFn: getSamsaraStatus,
    refetchInterval: 30000,
  });

  const handleConnect = async () => {
    if (!apiKey.trim()) return toast.error('API key is required');
    setConnecting(true);
    try {
      await connectSamsara(apiKey.trim());
      toast.success('Samsara connected');
      queryClient.invalidateQueries({ queryKey: ['samsara-status'] });
      setApiKey('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectSamsara();
      toast.success('Samsara disconnected');
      queryClient.invalidateQueries({ queryKey: ['samsara-status'] });
    } catch (err) {
      toast.error('Failed to disconnect');
    }
    setShowDisconnect(false);
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Link2 className="w-5 h-5" /> Samsara ELD Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <Badge className="bg-green-100 text-green-700">Connected</Badge>
                {status.org_name && <span className="text-sm font-medium">{status.org_name}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {status.org_id && (
                  <div>
                    <span className="text-muted-foreground">Org ID:</span>
                    <span className="ml-2 font-medium font-mono">{status.org_id}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Last Vehicle Sync:</span>
                  <span className="ml-2 font-medium">
                    {status.last_vehicle_sync ? new Date(status.last_vehicle_sync).toLocaleString() : 'Never'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Location Sync:</span>
                  <span className="ml-2 font-medium">
                    {status.last_location_sync ? new Date(status.last_location_sync).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowDisconnect(true)}
              >
                Disconnect Samsara
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-slate-300" />
                <Badge variant="secondary">Not Connected</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect your Samsara account to automatically sync vehicles, GPS locations, and driver HOS data.
              </p>
              <div className="flex gap-2 max-w-md">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Samsara API key"
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
                <Button onClick={handleConnect} disabled={connecting} className="bg-amber-500 hover:bg-amber-600">
                  {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : 'Connect'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Generate an API token in Samsara under Settings &gt; API Tokens.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnect} onOpenChange={setShowDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Samsara</AlertDialogTitle>
            <AlertDialogDescription>
              Disconnect Samsara? Vehicle and location syncing will stop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDisconnect}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
