import React, { useRef, useState } from 'react';
import {
  ArrowUp,
  FileCode2,
  FileText,
  Layers,
  Paperclip,
  Plus,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { WORKSPACE_FILES } from '../data/bots';
import type { BotAgent, MessageAttachment } from '../types';

interface ChatComposerProps {
  bot: BotAgent;
  disabled?: boolean;
  onSend: (text: string, attachments: MessageAttachment[]) => void;
}

export function ChatComposer({
  bot,
  disabled = false,
  onSend,
}: ChatComposerProps) {
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleWorkspaceFile = (file: MessageAttachment) => {
    setAttachments((prev) =>
      prev.some((f) => f.id === file.id)
        ? prev.filter((f) => f.id !== file.id)
        : [...prev, file],
    );
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kb = Math.max(1, Math.round(file.size / 1024));
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const kind: MessageAttachment['kind'] = [
      'ts',
      'tsx',
      'js',
      'wgsl',
      'css',
    ].includes(ext)
      ? 'code'
      : ['json', 'svg', 'png', 'jpg'].includes(ext)
        ? 'design'
        : 'doc';

    setAttachments((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        name: file.name,
        size: `${kb} KB`,
        kind,
      },
    ]);
    setAttachMenuOpen(false);
    e.target.value = '';
  };

  const handleSubmit = (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || disabled) return;
    onSend(text, attachments);
    setInputValue('');
    setAttachments([]);
    setAttachMenuOpen(false);
  };

  return (
    <div
      className="w-full text-white px-3 sm:px-4 pt-4 pb-safe backdrop-blur-md"
      style={{
        background:
          'linear-gradient(rgba(26, 28, 28, 0) 0%, rgba(26, 28, 28, 0.88) 28%, rgba(26, 28, 28, 0.98) 100%)',
      }}
    >
      <div className="mx-auto max-w-2xl flex flex-col gap-2 relative">
        {/* Inline Workspace Attachment Popover */}
        <AnimatePresence>
          {attachMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-label="Attach workspace file"
              className="mb-1 rounded-2xl bg-[#1f232a] border border-white/15 p-3 shadow-xl text-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-white/90">
                  Attach workspace context
                </span>
                <button
                  type="button"
                  aria-label="Close attachments menu"
                  onClick={() => setAttachMenuOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {WORKSPACE_FILES.map((file) => {
                  const selected = attachments.some((a) => a.id === file.id);
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => toggleWorkspaceFile(file)}
                      className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-[12px] border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#0066ff]/25 border-[#0066ff] text-white'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/85'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {file.kind === 'code' ? (
                          <FileCode2 className="w-3.5 h-3.5 text-[#66a3ff] shrink-0" />
                        ) : file.kind === 'design' ? (
                          <Layers className="w-3.5 h-3.5 text-[#ff5db5] shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                        )}
                        <span className="font-mono truncate">{file.name}</span>
                      </span>
                      <span className="text-[10px] font-mono text-white/50 shrink-0">
                        {file.size}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#66a3ff] hover:text-white transition-colors cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Upload from device</span>
                </button>
                <span className="text-[11px] text-white/50 tabular-nums">
                  {attachments.length} attached
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleLocalFileChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active attachments preview */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {attachments.map((file) => (
              <span
                key={file.id}
                className="inline-flex items-center gap-1.5 bg-white/15 border border-white/15 text-white text-[11px] font-mono px-2.5 py-1 rounded-full shrink-0"
              >
                <span>{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove attachment ${file.name}`}
                  onClick={() =>
                    setAttachments((prev) =>
                      prev.filter((item) => item.id !== file.id),
                    )
                  }
                  className="hover:text-pink-300 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Quick Prompt Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 select-none">
          {bot.quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={disabled}
              onClick={() => handleSubmit(prompt)}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/18 text-white/90 text-[12px] font-medium border border-white/10 whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Pill Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex items-center gap-2 bg-white/10 border border-white/15 focus-within:border-white/35 rounded-full px-2.5 py-1.5 shadow-sm transition-colors"
        >
          <button
            type="button"
            aria-label="Attach file"
            aria-expanded={attachMenuOpen}
            onClick={() => setAttachMenuOpen((prev) => !prev)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-90 cursor-pointer ${
              attachMenuOpen || attachments.length > 0
                ? 'bg-white/20 text-white'
                : 'text-white/75 hover:text-white hover:bg-white/10'
            }`}
          >
            <Plus
              className={`w-5 h-5 transition-transform duration-150 ${
                attachMenuOpen ? 'rotate-45' : ''
              }`}
            />
          </button>

          <label htmlFor="chat-composer-input" className="sr-only">
            Message {bot.name}
          </label>
          <input
            id="chat-composer-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Ask ${bot.name}...`}
            disabled={disabled}
            className="flex-1 bg-transparent border-0 text-[14px] text-white placeholder-white/55 focus:outline-none focus:ring-0 px-1 py-1.5 min-w-0"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || disabled}
            aria-label="Send message"
            className={`w-9 h-9 rounded-full text-white flex items-center justify-center transition-all shrink-0 active:scale-90 shadow-sm cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
              bot.accent === 'pink'
                ? 'bg-[#ff1493] hover:bg-[#e01080]'
                : 'bg-[#0066ff] hover:bg-[#0050cb]'
            }`}
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
