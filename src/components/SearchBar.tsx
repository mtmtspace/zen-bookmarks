import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Command } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [shortcutText, setShortcutText] = useState('Ctrl K');
  const [isMacDevice, setIsMacDevice] = useState(false);

  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
    setIsMacDevice(isMac);
    setShortcutText(isMac ? 'Cmd K' : 'Ctrl K');

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        onChange('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500">
        <Search size={18} className="text-stone-400 group-focus-within:text-primary-500" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for anything..."
        className="block w-full pl-11 pr-12 py-3.5 border-none rounded-2xl bg-white shadow-soft-md text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm font-medium transition-all"
      />
      
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
        >
          <X size={16} />
        </button>
      ) : (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <kbd className="hidden sm:flex items-center gap-1 border border-stone-200 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-stone-400 bg-stone-50">
            {isMacDevice ? <Command size={10} /> : null}
            <span>{shortcutText}</span>
          </kbd>
        </div>
      )}
    </div>
  );
};
