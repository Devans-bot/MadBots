import React, { useState } from 'react';
import { Code2, Palette, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { validateNewBotInput, type CreateBotInput } from '../lib/botEngine';
import type { BotCategory } from '../types';

interface NewBotModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateBotInput) => void;
}

export function NewBotModal({ open, onClose, onCreate }: NewBotModalProps) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('GPT-4o');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<BotCategory>('engineering');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: CreateBotInput = { name, model, role, category };
    const validationError = validateNewBotInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    onCreate(input);
    setName('');
    setModel('GPT-4o');
    setRole('');
    setCategory('engineering');
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-bot-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#191d24] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2
                id="new-bot-modal-title"
                className="text-[16px] font-bold text-zinc-950 dark:text-zinc-50"
              >
                New Prototype Bot
              </h2>
              <button
                type="button"
                aria-label="Close new bot dialog"
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label
                  htmlFor="new-bot-name"
                  className="block text-[12px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Bot Name
                </label>
                <input
                  id="new-bot-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Shader Architect"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#12151a] px-3.5 py-2.5 text-[14px] text-zinc-950 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#0066ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-bot-model"
                    className="block text-[12px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
                  >
                    Model
                  </label>
                  <input
                    id="new-bot-model"
                    type="text"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="GPT-4o / FLUX.1"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#12151a] px-3.5 py-2.5 text-[13px] font-mono text-zinc-950 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#0066ff]"
                  />
                </div>

                <div>
                  <span className="block text-[12px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Specialty
                  </span>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-[#12151a] border border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setCategory('engineering')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        category === 'engineering'
                          ? 'bg-white dark:bg-[#232832] text-[#0066ff] shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategory('creative')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        category === 'creative'
                          ? 'bg-white dark:bg-[#232832] text-[#ff1493] shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Art</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-bot-role"
                  className="block text-[12px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Short Focus (optional)
                </label>
                <input
                  id="new-bot-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Low-latency prototyping & architecture"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#12151a] px-3.5 py-2.5 text-[14px] text-zinc-950 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-[#0066ff]"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-[12px] font-semibold text-rose-600 dark:text-rose-400"
                >
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-[13px] font-bold bg-zinc-950 dark:bg-[#0066ff] hover:bg-zinc-800 dark:hover:bg-[#0050cb] text-white flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Bot</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
