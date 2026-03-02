import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createDriver, updateDriver, getDrivers, getCarriers } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { US_STATES } from '@/lib/constants';

const EMPTY_FORM = {
  full_name: '', phone: '', email: '', license_number: '', license_state: '',
  pay_model: 'CPM', pay_rate: '', minimum_per_mile: '',
  driver_type: '', tax_type: '', route_type: '', hire_date: '',
  carrier_id: '', team_driver_id: '',
};

export default function DriverFormDialog({ open, onOpenChange, editingDriver, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(() => {
    if (editingDriver) {
      return {
        full_name: editingDriver.full_name || '',
        phone: editingDriver.phone || '',
        email: editingDriver.email || '',
        license_number: editingDriver.license_number || '',
        license_state: editingDriver.license_state || '',
        pay_model: editingDriver.pay_model || 'CPM',
        pay_rate: editingDriver.pay_rate || '',
        minimum_per_mile: editingDriver.minimum_per_mile || '',
        driver_type: editingDriver.driver_type || '',
        tax_type: editingDriver.tax_type || '',
        route_type: editingDriver.route_type || '',
        hire_date: editingDriver.hire_date || '',
        carrier_id: editingDriver.carrier_id || '',
        team_driver_id: editingDriver.team_driver_id || '',
      };
    }
    return { ...EMPTY_FORM };
  });

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: getDrivers, staleTime: 5 * 60 * 1000 });
  const { data: carriers = [] } = useQuery({ queryKey: ['carriers'], queryFn: getCarriers, staleTime: 5 * 60 * 1000 });

  const createMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: (data) => {
      toast.success('Driver created');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      onSuccess?.(data);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateDriver(id, data),
    onSuccess: () => {
      toast.success('Driver updated');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver', editingDriver?.id] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const handleSubmit = () => {
    if (!formData.full_name.trim()) return toast.error('Full name is required');
    if (!formData.pay_rate) return toast.error('Pay rate is required');
    const payload = {
      ...formData,
      pay_rate: parseFloat(formData.pay_rate),
      minimum_per_mile: formData.minimum_per_mile ? parseFloat(formData.minimum_per_mile) : null,
      carrier_id: formData.carrier_id ? parseInt(formData.carrier_id) : null,
      team_driver_id: formData.team_driver_id || null,
    };
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="e.g., John Miller" />
            </div>
            <div className="space-y-1.5">
              <Label>Driver Type</Label>
              <Select value={formData.driver_type || 'NONE'} onValueChange={(v) => setFormData({ ...formData, driver_type: v === 'NONE' ? '' : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not specified</SelectItem>
                  <SelectItem value="COMPANY_DRIVER">Company Driver</SelectItem>
                  <SelectItem value="OWNER_OPERATOR">Owner Operator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="555-0101" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="driver@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>CDL Number</Label>
              <Input value={formData.license_number} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} placeholder="CDL123456" />
            </div>
            <div className="space-y-1.5">
              <Label>License State</Label>
              <Select value={formData.license_state || undefined} onValueChange={(v) => setFormData({ ...formData, license_state: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Tax Type</Label>
              <Select value={formData.tax_type || 'NONE'} onValueChange={(v) => setFormData({ ...formData, tax_type: v === 'NONE' ? '' : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not specified</SelectItem>
                  <SelectItem value="W2">W-2</SelectItem>
                  <SelectItem value="1099">1099</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Route Type</Label>
              <Select value={formData.route_type || 'NONE'} onValueChange={(v) => setFormData({ ...formData, route_type: v === 'NONE' ? '' : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not specified</SelectItem>
                  <SelectItem value="LOCAL">Local</SelectItem>
                  <SelectItem value="REGIONAL">Regional</SelectItem>
                  <SelectItem value="OTR">OTR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hire Date</Label>
              <Input type="date" value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Carrier</Label>
              <Combobox
                value={formData.carrier_id ? String(formData.carrier_id) : null}
                onValueChange={(v) => setFormData({ ...formData, carrier_id: v || '' })}
                options={carriers.filter(c => c.status !== 'INACTIVE').map(c => ({ value: String(c.id), label: c.company_name }))}
                placeholder="Own fleet"
                searchPlaceholder="Search carriers..."
                allowClear
              />
            </div>
            <div className="space-y-1.5">
              <Label>Team Partner</Label>
              <Combobox
                value={formData.team_driver_id || null}
                onValueChange={(v) => setFormData({ ...formData, team_driver_id: v || '' })}
                options={drivers.filter(d => d.id !== editingDriver?.id && d.status !== 'INACTIVE').map(d => ({ value: String(d.id), label: d.full_name }))}
                placeholder="None"
                searchPlaceholder="Search drivers..."
                allowClear
              />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Pay Model *</Label>
              <Select value={formData.pay_model} onValueChange={(v) => setFormData({ ...formData, pay_model: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPM">Per Mile (CPM)</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FLAT">Flat Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pay Rate *</Label>
              <Input type="number" value={formData.pay_rate} onChange={(e) => setFormData({ ...formData, pay_rate: e.target.value })} step="0.01" placeholder={formData.pay_model === 'CPM' ? '0.55' : formData.pay_model === 'PERCENTAGE' ? '25' : '1200'} />
            </div>
            <div className="space-y-1.5">
              <Label>Min $/mile</Label>
              <Input type="number" value={formData.minimum_per_mile} onChange={(e) => setFormData({ ...formData, minimum_per_mile: e.target.value })} step="0.01" placeholder="Optional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="theme-brand-bg text-white">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editingDriver ? 'Save Changes' : 'Create Driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
