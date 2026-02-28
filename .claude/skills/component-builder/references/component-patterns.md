# Component Patterns Reference

Extracted from the actual TMS codebase. Follow these exactly.

## File Locations

```
frontend/src/
├── pages/              # Top-level route components (DriversPage, InvoicesPage)
├── components/         # Shared components (LoadCard, LoadDetail, modals)
├── components/ui/      # shadcn primitives (DO NOT edit these)
├── services/api.js     # All API functions
├── contexts/           # AuthContext
└── lib/utils.js        # cn() helper
```

## Import Map by Component Type

### Page Component
```js
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getItems, createItem, updateItem, deleteItem, getItemById } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Pencil, Trash2, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
```

### Modal Component
```js
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
```

### Sheet Detail Component
```js
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
```

## Page Component Template

```jsx
const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-slate-200 text-slate-500',
};

const EMPTY_FORM = {
  name: '',
  status: 'ACTIVE',
};

export default function ResourcePage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();

  // Queries
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: getResources,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['resource', selectedId],
    queryFn: () => getResource(selectedId),
    enabled: !!selectedId,
  });

  // Filtered list
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item =>
      item.name?.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      toast.success('Created successfully');
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      closeForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateResource(id, data),
    onSuccess: () => {
      toast.success('Updated successfully');
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource', editingItem?.id] });
      closeForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      toast.success('Deactivated');
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to deactivate'),
  });

  // Helpers
  const isPending = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item, e) => {
    e?.stopPropagation();
    setEditingItem(item);
    setFormData({ name: item.name, status: item.status });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return toast.error('Name is required');

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <IconHere className="w-6 h-6" />
            Resources
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} total</p>
        </div>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4" /> Add Resource
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-9" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <IconHere className="w-10 h-10 text-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">
                      {search ? 'No matching results' : 'No items yet'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.map(item => (
              <TableRow key={item.id} className="cursor-pointer group" onClick={() => setSelectedId(item.id)}>
                <TableCell className="font-medium group-hover:text-amber-600 transition-colors">{item.name}</TableCell>
                <TableCell><Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(item, e)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); setConfirmDelete(item); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Form fields */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="bg-amber-500 hover:bg-amber-600">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingItem ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      {selectedId && (
        <Sheet open={true} onOpenChange={(open) => !open && setSelectedId(null)}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
            {/* Navy header + card body */}
          </SheetContent>
        </Sheet>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate {confirmDelete?.name}? This can be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => {
              deleteMutation.mutate(confirmDelete.id);
              setConfirmDelete(null);
            }}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

## Sheet Detail Template

```jsx
<Sheet open={true} onOpenChange={(open) => !open && onClose()}>
  <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
    {/* Navy header */}
    <div className="bg-navy-900 text-white p-6">
      <SheetHeader className="p-0">
        <div className="flex items-center gap-3 mb-1">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-amber-500 text-white font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <SheetTitle className="text-2xl font-display font-bold text-white">{title}</SheetTitle>
            <SheetDescription className="text-slate-400">
              <Badge className={statusColors[status]}>{status}</Badge>
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>
    </div>

    {/* Body */}
    <div className="p-6 space-y-5">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        {/* Status transition buttons or edit toggle */}
      </div>

      {/* Info cards in grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="py-4">
          <CardContent>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Section</div>
            {/* Content */}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* More sections */}
    </div>
  </SheetContent>
</Sheet>
```

## Dialog Modal Template

```jsx
<Dialog open={true} onOpenChange={(open) => !open && onClose()}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle className="text-xl font-display">Modal Title</DialogTitle>
      <DialogDescription>Optional description</DialogDescription>
    </DialogHeader>

    {error && (
      <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    )}

    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Field Name *</Label>
        <Input value={form.field} onChange={(e) => setForm({...form, field: e.target.value})} />
      </div>

      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={form.type || undefined} onValueChange={(v) => setForm({...form, type: v})}>
          <SelectTrigger>
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TYPE_A">Type A</SelectItem>
            <SelectItem value="TYPE_B">Type B</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={handleSubmit} disabled={isPending} className="bg-amber-500 hover:bg-amber-600">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Submit
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Typography & Spacing Conventions

| Element | Classes |
|---------|---------|
| Page title | `text-2xl font-display font-bold` |
| Section label | `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider` |
| Subtitle / count | `text-sm text-muted-foreground` |
| Table text | `text-sm` |
| Small label | `text-xs text-muted-foreground` |
| Info value | `font-medium` |
| Large number | `text-2xl font-bold` |
| Empty/null display | `—` (em dash) |

## Status Color Convention

Always define at file top as a constant object:

```js
const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-slate-200 text-slate-500',
  PENDING: 'bg-amber-100 text-amber-700',
  // ... resource-specific statuses
};
```

Use with Badge: `<Badge className={STATUS_COLORS[item.status]}>{item.status}</Badge>`

## Form Field Patterns

### Text Input
```jsx
<div className="space-y-1.5">
  <Label>Field Name *</Label>
  <Input value={form.field} onChange={(e) => setForm({...form, field: e.target.value})} placeholder="e.g., Example" />
</div>
```

### Select (shadcn — NEVER native)
```jsx
<div className="space-y-1.5">
  <Label>Type</Label>
  <Select value={form.type || undefined} onValueChange={(v) => setForm({...form, type: v})}>
    <SelectTrigger>
      <SelectValue placeholder="Select..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="OPTION_A">Option A</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Number with currency
```jsx
<div className="space-y-1.5">
  <Label>Amount</Label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
    <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} className="pl-7" />
  </div>
</div>
```

### Textarea
```jsx
<div className="space-y-1.5">
  <Label>Notes</Label>
  <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} />
</div>
```

## Route Registration

In `App.jsx`:

```jsx
// 1. Import
import ResourcePage from './pages/ResourcePage';

// 2. Add route inside <Routes>
<Route path="/resource" element={<ResourcePage />} />

// 3. Add nav entry
const NAV_SECTIONS = [
  {
    label: 'Section Name',
    items: [
      // Add entry with lucide icon:
      { to: '/resource', label: 'Resources', icon: IconName },
    ],
  },
];
```

## Data Fetching Best Practices

### Never Use Aggressive Polling

`refetchInterval` should be a last resort, not the default. Most pages don't need it at all.

| Scenario | Strategy |
|----------|----------|
| Data changes only via user actions in this app | No polling. Rely on `invalidateQueries()` in mutation `onSuccess`. This is the **default for all pages**. |
| Data changes from external sources (e.g., Samsara GPS) | `refetchInterval: 30000` (30s) minimum. Never less. |
| Dashboard/stats that summarize other data | `refetchInterval: 60000` (60s) or just `refetchOnWindowFocus: true` |
| Real-time collaboration (multiple dispatchers) | Not yet needed. When it is, use WebSockets/SSE, not polling. |

**Bad — burns API calls for no reason:**
```js
useQuery({
  queryKey: ['loads'],
  queryFn: getLoads,
  refetchInterval: 3000, // 20 fetches/min for data that changes once an hour
});
```

**Good — refreshes only when something changes:**
```js
useQuery({
  queryKey: ['loads'],
  queryFn: getLoads,
  // No refetchInterval. Data updates via invalidateQueries after mutations.
});

// In your mutation:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['loads'] });
}
```

### staleTime

Set `staleTime` for data that doesn't change often. Prevents refetches on component remounts and tab focus.

```js
// Reference data (customers, drivers, locations) — unlikely to change mid-session
useQuery({
  queryKey: ['customers'],
  queryFn: getCustomers,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Active operational data (loads, invoices) — keep default (0), rely on invalidation
useQuery({
  queryKey: ['loads'],
  queryFn: getLoads,
  // staleTime: 0 (default) — always refetch when stale
});
```

### Query Key Rules

1. List queries: `['resources']` or `['resources', { filters }]`
2. Detail queries: `['resource', id]`
3. Always invalidate both list and detail after mutations
4. Use `enabled: !!id` for conditional detail fetches

## Brand Colors

| Use | Color |
|-----|-------|
| Primary buttons / accents | `bg-amber-500 hover:bg-amber-600` |
| Sidebar / headers | `bg-navy-900` |
| Active nav | `bg-slate-700/80 text-white` |
| Inactive nav | `text-slate-400 hover:text-white hover:bg-white/5` |
| Destructive | `bg-red-600 hover:bg-red-700` |
| Success indicator | `bg-green-50 text-green-700 border-green-100` |
| Warning indicator | `bg-amber-50 text-amber-700 border-amber-100` |
| Error indicator | `bg-red-50 text-red-600 border-red-100` |
| Info indicator | `bg-blue-50 text-blue-700` |
