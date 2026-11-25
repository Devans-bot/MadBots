import { Check, GitBranch, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { CodeBlockPayload } from '../types';

interface DiffPreviewModalProps {
  open: boolean;
  codeBlock: CodeBlockPayload | null;
  onClose: () => void;
  onConfirmApply: () => void;
}

export function DiffPreviewModal({
  open,
  codeBlock,
  onClose,
  onConfirmApply,
}: DiffPreviewModalProps) {
  return (
    <AnimatePresence>
      {open && codeBlock && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="diff-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#191d24] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#0066ff]/10 text-[#0066ff] dark:text-[#66a3ff] flex items-center justify-center shrink-0">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="diff-modal-title"
                    className="text-[15px] font-bold text-zinc-950 dark:text-zinc-50 truncate"
                  >
                    Review Workspace Diff
                  </h2>
                  <p className="text-[12px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                    {codeBlock.filename} · {codeBlock.language}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close diff preview"
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[55vh] overflow-y-auto space-y-3 bg-[#f9f9f8] dark:bg-[#12151a]">
              {codeBlock.diffBefore && (
                <div className="rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 overflow-hidden">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300 border-b border-rose-200/60 dark:border-rose-900/50">
                    Removed lines
                  </div>
                  <pre className="p-3 font-mono text-[11.5px] text-rose-900 dark:text-rose-200 overflow-x-auto leading-relaxed">
                    <code>
                      {codeBlock.diffBefore
                        .split('\n')
                        .map((line) => `- ${line}`)
                        .join('\n')}
                    </code>
                  </pre>
                </div>
              )}

              <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 overflow-hidden">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border-b border-emerald-200/60 dark:border-emerald-900/50">
                  Incoming changes
                </div>
                <pre className="p-3 font-mono text-[11.5px] text-emerald-950 dark:text-emerald-200 overflow-x-auto leading-relaxed">
                  <code>
                    {codeBlock.code
                      .split('\n')
                      .map((line) => `+ ${line}`)
                      .join('\n')}
                  </code>
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#191d24]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmApply}
                className="px-4 py-2 rounded-xl text-[13px] font-bold bg-[#0066ff] hover:bg-[#0050cb] text-white flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {codeBlock.diffApplied ? 'Re-apply Diff' : 'Confirm Apply'}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
