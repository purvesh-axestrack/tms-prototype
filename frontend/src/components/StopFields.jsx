import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Snowflake } from 'lucide-react';
import {
  STOP_ACTION_TYPES, STOP_ACTION_TYPE_LABELS,
  APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS,
  STOP_REEFER_MODES, STOP_REEFER_MODE_LABELS,
  QUANTITY_TYPES, QUANTITY_TYPE_LABELS,
  STOP_STATUSES,
} from '@/lib/constants';
import LocationAutocomplete from './LocationAutocomplete';

/**
 * Shared stop field grid used by LoadCreateModal, LoadDetail, and DraftReviewModal.
 * Renders only the fields — no Card wrapper, no stop header, no add/remove buttons.
 */
export default function StopFields({
  stop,
  index,
  onUpdate,
  onLocationSelect,
  showStatusFields = false,
  disabled = false,
}) {
  const u = (field, value) => onUpdate(index, field, value);

  return (
    <>
      {/* Location */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Facility</Label>
          <LocationAutocomplete
            value={stop.facility_name || ''}
            onChange={(val) => u('facility_name', val)}
            onSelect={(loc) => onLocationSelect(index, loc)}
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="lg:col-span-2 space-y-1">
          <Label className="text-xs">Address</Label>
          <Input value={stop.address || ''} onChange={(e) => u('address', e.target.value)} className="h-8 text-sm" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">City</Label>
          <Input value={stop.city || ''} onChange={(e) => u('city', e.target.value)} className="h-8 text-sm" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">State</Label>
          <Input value={stop.state || ''} onChange={(e) => u('state', e.target.value)} className="h-8 text-sm" maxLength={2} disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ZIP</Label>
          <Input value={stop.zip || ''} onChange={(e) => u('zip', e.target.value)} className="h-8 text-sm" disabled={disabled} />
        </div>
      </div>

      {/* Scheduling */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Appt Type</Label>
          <Select value={stop.appointment_type || 'APPOINTMENT'} onValueChange={(v) => u('appointment_type', v)} disabled={disabled}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TYPES.map(t => <SelectItem key={t} value={t}>{APPOINTMENT_TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Appt Start</Label>
          <Input type="datetime-local" value={stop.appointment_start ? stop.appointment_start.slice(0, 16) : ''} onChange={(e) => u('appointment_start', e.target.value)} className="h-8 text-sm" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Appt End</Label>
          <Input type="datetime-local" value={stop.appointment_end ? stop.appointment_end.slice(0, 16) : ''} onChange={(e) => u('appointment_end', e.target.value)} className="h-8 text-sm" disabled={disabled} />
        </div>
      </div>

      {/* Status (LoadDetail only) */}
      {showStatusFields && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Action Type</Label>
            <Select value={stop.action_type || 'NONE'} onValueChange={(v) => u('action_type', v === 'NONE' ? '' : v)} disabled={disabled}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No Action</SelectItem>
                {STOP_ACTION_TYPES.map(t => <SelectItem key={t} value={t}>{STOP_ACTION_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stop Status</Label>
            <Select value={stop.stop_status || 'NONE'} onValueChange={(v) => u('stop_status', v === 'NONE' ? null : v)} disabled={disabled}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {STOP_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replaceAll('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Free Time (min)</Label>
            <Input type="number" value={stop.free_time_minutes ?? 120} onChange={(e) => u('free_time_minutes', parseInt(e.target.value) || 0)} className="h-8 text-sm" disabled={disabled} />
          </div>
        </div>
      )}

      <Separator className="my-2" />

      {/* Cargo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Commodity</Label>
          <Input value={stop.commodity || ''} onChange={(e) => u('commodity', e.target.value)} className="h-8 text-sm" placeholder="e.g. General Freight" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Weight (lbs)</Label>
          <Input type="number" step="0.01" value={stop.weight || ''} onChange={(e) => u('weight', e.target.value)} className="h-8 text-sm" placeholder="0" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quantity</Label>
          <Input type="number" step="0.01" value={stop.quantity || ''} onChange={(e) => u('quantity', e.target.value)} className="h-8 text-sm" placeholder="0" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qty Type</Label>
          <Select value={stop.quantity_type || 'NONE'} onValueChange={(v) => u('quantity_type', v === 'NONE' ? '' : v)} disabled={disabled}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              {QUANTITY_TYPES.map(t => <SelectItem key={t} value={t}>{QUANTITY_TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reefer (PICKUP only) */}
      {stop.stop_type === 'PICKUP' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><Snowflake className="w-3 h-3 text-sky-500" /> Reefer Mode</Label>
            <Select value={stop.stop_reefer_mode || 'NONE'} onValueChange={(v) => u('stop_reefer_mode', v === 'NONE' ? '' : v)} disabled={disabled}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {STOP_REEFER_MODES.map(m => <SelectItem key={m} value={m}>{STOP_REEFER_MODE_LABELS[m]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {stop.stop_reefer_mode && (
            <div className="space-y-1">
              <Label className="text-xs">Set Temp (&deg;F)</Label>
              <Input type="number" step="0.1" value={stop.stop_set_temp || ''} onChange={(e) => u('stop_set_temp', e.target.value)} className="h-8 text-sm" placeholder="e.g. -10" disabled={disabled} />
            </div>
          )}
        </div>
      )}

      {/* Documents */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">BOL #</Label>
          <Input value={stop.bol_number || ''} onChange={(e) => u('bol_number', e.target.value)} className="h-8 text-sm" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PO #</Label>
          <Input value={stop.po_number || ''} onChange={(e) => u('po_number', e.target.value)} className="h-8 text-sm" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{stop.stop_type === 'PICKUP' ? 'PU #' : 'DEL #'}</Label>
          <Input value={stop.ref_number || ''} onChange={(e) => u('ref_number', e.target.value)} className="h-8 text-sm" disabled={disabled} />
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-1">
        <Label className="text-xs">Instructions</Label>
        <Input value={stop.instructions || ''} onChange={(e) => u('instructions', e.target.value)} className="h-8 text-sm" placeholder="Stop-specific instructions" disabled={disabled} />
      </div>
    </>
  );
}
