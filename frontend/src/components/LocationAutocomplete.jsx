import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLocations } from '../services/api';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

/**
 * Autocomplete input for facility_name that searches locations master.
 * When a location is selected, calls onSelect with the full location record
 * to auto-fill address/city/state/zip.
 */
export default function LocationAutocomplete({ value, onChange, onSelect, placeholder = 'Facility name', className = '' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['locations', 'autocomplete', query],
    queryFn: () => getLocations({ q: query }),
    enabled: query.length >= 2,
    staleTime: 30000,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setQuery(val);
    setOpen(val.length >= 2);
  };

  const handleSelect = (location) => {
    onChange(location.facility_name);
    onSelect(location);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value || ''}
        onChange={handleInputChange}
        onFocus={() => { if ((value || '').length >= 2) { setQuery(value); setOpen(true); } }}
        placeholder={placeholder}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((loc) => (
            <button
              key={loc.id}
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-b-0"
              onClick={() => handleSelect(loc)}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium truncate">{loc.facility_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
