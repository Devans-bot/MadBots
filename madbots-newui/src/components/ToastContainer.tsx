import { CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none max-w-sm w-[calc(100%-2rem)]"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-lg text-[13px] font-medium"
          >
            <span className="flex items-center gap-2 min-w-0">
              {toast.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-[#4d94ff] dark:text-[#0066ff] shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
              className="w-6 h-6 rounded-full hover:bg-white/10 dark:hover:bg-black/10 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
