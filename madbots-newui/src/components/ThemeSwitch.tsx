import { Check } from 'lucide-react';
import { motion } from 'motion/react';

interface ThemeSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ThemeSwitch({ checked, onChange }: ThemeSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Toggle Dark Night Mode"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066ff] ${
        checked
          ? 'bg-[#0066ff]'
          : 'bg-[#e2e2e2] dark:bg-zinc-700'
      }`}
      style={{ width: 52, height: 28 }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        className={`w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center ${
          checked ? 'ml-auto' : 'ml-0'
        }`}
      >
        {checked && (
          <Check className="w-3.5 h-3.5 text-[#0066ff]" strokeWidth={3} />
        )}
      </motion.span>
    </button>
  );
}
