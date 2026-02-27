import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EditableField({
  value,
  onSave,
  type = 'text',
  placeholder = '—',
  prefix,
  suffix,
  formatDisplay,
  className,
  disabled = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Sync external value changes
  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = typeof draft === 'string' ? draft.trim() : draft;
    const original = value ?? '';
    if (String(trimmed) !== String(original)) {
      const final = type === 'number' ? (trimmed === '' ? null : Number(trimmed)) : trimmed;
      onSave(final);
    }
  };

  const cancel = () => {
    setDraft(value ?? '');
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn('h-7 text-sm', className)}
      />
    );
  }

  const display = formatDisplay
    ? formatDisplay(value)
    : (value != null && value !== '' ? String(value) : null);

  if (disabled) {
    return (
      <div className={cn('flex items-center gap-1 px-1.5 py-0.5 -mx-1.5 min-w-0', className)}>
        {prefix && <span className="text-muted-foreground text-xs shrink-0">{prefix}</span>}
        <span className={cn('font-medium truncate', !display && 'text-muted-foreground italic')}>
          {display || placeholder}
        </span>
        {suffix && <span className="text-muted-foreground text-xs shrink-0">{suffix}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'group flex items-center gap-1 text-left rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-muted/50 min-w-0',
        className,
      )}
    >
      {prefix && <span className="text-muted-foreground text-xs shrink-0">{prefix}</span>}
      <span className={cn('font-medium truncate', !display && 'text-muted-foreground italic')}>
        {display || placeholder}
      </span>
      {suffix && <span className="text-muted-foreground text-xs shrink-0">{suffix}</span>}
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}
