import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function EditableSelect({
  value,
  displayValue,
  onSave,
  options,
  placeholder = 'Select...',
  allowNone = false,
  className,
}) {
  const handleChange = (newVal) => {
    const result = newVal === '__NONE__' ? null : newVal;
    if (String(result ?? '') !== String(value ?? '')) {
      onSave(result);
    }
  };

  const selectVal = value != null && value !== '' ? String(value) : (allowNone ? '__NONE__' : undefined);

  return (
    <Select value={selectVal} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          'h-7 text-sm border-transparent shadow-none hover:border-input hover:bg-muted/50 transition-colors font-medium px-1.5',
          !selectVal && 'text-muted-foreground italic',
          className,
        )}
      >
        <SelectValue placeholder={placeholder}>
          {displayValue || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="__NONE__">None</SelectItem>}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
