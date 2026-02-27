import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EditableSelect({
  value,
  displayValue,
  onSave,
  options,
  placeholder = 'Select...',
  allowNone = false,
  className,
  disabled = false,
}) {
  const handleChange = (newVal) => {
    const result = newVal === '__NONE__' ? null : newVal;
    if (String(result ?? '') !== String(value ?? '')) {
      onSave(result);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (value != null && value !== '') {
      onSave(null);
    }
  };

  const hasValue = value != null && value !== '';
  const selectVal = hasValue ? String(value) : (allowNone ? '__NONE__' : undefined);

  if (disabled) {
    return (
      <div className={cn('flex items-center px-1.5 py-0.5 h-7 text-sm font-medium', !hasValue && 'text-muted-foreground italic', className)}>
        {displayValue || (hasValue ? (options.find(o => String(o.value) === String(value))?.label || value) : placeholder)}
      </div>
    );
  }

  return (
    <div className="relative group flex items-center">
      <Select value={selectVal} onValueChange={handleChange}>
        <SelectTrigger
          className={cn(
            'h-7 text-sm border-transparent shadow-none hover:border-input hover:bg-muted/50 transition-colors font-medium px-1.5',
            allowNone && hasValue && 'pr-7',
            !hasValue && 'text-muted-foreground italic',
            className,
          )}
        >
          <SelectValue placeholder={placeholder}>
            {displayValue || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="__NONE__"><span className="text-muted-foreground">None</span></SelectItem>}
          {options.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allowNone && hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-1.5 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
