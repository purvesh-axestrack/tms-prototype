import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

/**
 * Searchable combobox built from shadcn Command + Popover.
 *
 * @param {Object} props
 * @param {string|null} props.value - Current value
 * @param {function} props.onValueChange - Called with new value (or null if cleared)
 * @param {{value: string, label: string}[]} props.options - Available choices
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.searchPlaceholder] - Search input placeholder
 * @param {boolean} [props.allowClear] - Show clear button when value is set
 * @param {boolean} [props.disabled] - Disable the combobox
 * @param {string} [props.className] - Additional classes for the trigger
 * @param {string} [props.emptyText] - Text shown when no matches
 */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  allowClear = false,
  disabled = false,
  className,
  emptyText = 'No results found.',
}) {
  const [open, setOpen] = React.useState(false);

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {allowClear && selected && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => { e.stopPropagation(); onValueChange(null); }}
                className="p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onValueChange(String(opt.value) === String(value) ? null : String(opt.value));
                    setOpen(false);
                  }}
                >
                  <Check className={cn('h-3.5 w-3.5', String(opt.value) === String(value) ? 'opacity-100' : 'opacity-0')} />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Inline-edit variant matching EditableSelect's compact styling.
 * Used in LoadDetail and DispatchCard for in-place entity selection.
 */
export function EditableCombobox({
  value,
  displayValue,
  onSave,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  allowNone = false,
  disabled = false,
  className,
  emptyText = 'No results found.',
}) {
  const [open, setOpen] = React.useState(false);
  const hasValue = value != null && value !== '';

  if (disabled) {
    return (
      <div className={cn('flex items-center px-1.5 py-0.5 h-7 text-sm font-medium', !hasValue && 'text-muted-foreground italic', className)}>
        {displayValue || (hasValue ? (options.find(o => String(o.value) === String(value))?.label || value) : placeholder)}
      </div>
    );
  }

  const selected = options.find(o => String(o.value) === String(value));

  const handleSelect = (selectedLabel) => {
    const opt = options.find(o => o.label === selectedLabel);
    if (!opt) return;
    const newVal = String(opt.value) === String(value) ? null : String(opt.value);
    if (String(newVal ?? '') !== String(value ?? '')) {
      onSave(newVal);
    }
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (hasValue) onSave(null);
  };

  return (
    <div className="relative group flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'flex items-center h-7 w-full text-sm border border-transparent shadow-none rounded-md hover:border-input hover:bg-muted/50 transition-colors font-medium px-1.5 text-left',
              allowNone && hasValue && 'pr-7',
              !hasValue && 'text-muted-foreground italic',
              className,
            )}
          >
            <span className="truncate">
              {displayValue || selected?.label || placeholder}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {allowNone && (
                  <CommandItem
                    value="__none__"
                    onSelect={() => { onSave(null); setOpen(false); }}
                  >
                    <Check className={cn('h-3.5 w-3.5', !hasValue ? 'opacity-100' : 'opacity-0')} />
                    <span className="text-muted-foreground">None</span>
                  </CommandItem>
                )}
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={handleSelect}
                  >
                    <Check className={cn('h-3.5 w-3.5', String(opt.value) === String(value) ? 'opacity-100' : 'opacity-0')} />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {allowNone && hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-1.5 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
