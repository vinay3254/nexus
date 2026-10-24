import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Terminal, Copy, Check, Trash2, Shield, AlertTriangle } from 'lucide-react';
import type { ActivityEvent, SandboxEvent } from '../types';

interface MacTerminalProps {
  events: ActivityEvent[];
  sandboxEvents: SandboxEvent[];
  onClear?: () => void;
}

export const MacTerminal: React.FC<MacTerminalProps> = ({ events, sandboxEvents, onClear }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'sandbox' | 'errors'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, sandboxEvents]);

  const handleCopy = () => {
    const text = events.map((e) => `[${e.time}] ${e.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredEvents = events.filter((e) => {
    if (activeTab === 'sandbox') return e.kind === 'sandbox';
    if (activeTab === 'errors') return e.kind === 'error';
    return true;
  });

  return (
    <div className="rounded-2xl border border-[#4f5d75]/60 bg-[#222634]/95 shadow-2xl overflow-hidden font-mono text-xs relative">
      {/* Mac Window Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#252a38] border-b border-[#4f5d75]/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Traffic Lights */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ef8354]/90 hover:bg-[#ef8354] transition-colors inline-block cursor-pointer shadow-[0_0_6px_rgba(239,131,84,0.4)]" />
            <span className="w-3 h-3 rounded-full bg-[#bfc0c0]/70 hover:bg-[#bfc0c0] transition-colors inline-block cursor-pointer" />
            <span className="w-3 h-3 rounded-full bg-[#4f5d75] hover:bg-[#bfc0c0] transition-colors inline-block cursor-pointer" />
          </div>

          <div className="h-4 w-px bg-[#4f5d75]/60 mx-1.5" />

          <div className="flex items-center gap-1.5 text-[#ffffff] font-sans font-medium">
            <Terminal className="w-3.5 h-3.5 text-[#ef8354]" />
            <span className="text-[13px]">shield-sandbox · bubblewrap</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-sans">
          <button
            type="button"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-[#4f5d75] text-[#ffffff] shadow-sm'
                : 'text-[#bfc0c0] hover:text-[#ffffff] hover:bg-[#4f5d75]/40'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All ({events.length})
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'sandbox'
                ? 'bg-[#ef8354]/20 text-[#ef8354] border border-[#ef8354]/40 font-semibold'
                : 'text-[#bfc0c0] hover:text-[#ffffff] hover:bg-[#4f5d75]/40'
            }`}
            onClick={() => setActiveTab('sandbox')}
          >
            Sandbox ({events.filter((e) => e.kind === 'sandbox').length})
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              activeTab === 'errors'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40 font-semibold'
                : 'text-[#bfc0c0] hover:text-[#ffffff] hover:bg-[#4f5d75]/40'
            }`}
            onClick={() => setActiveTab('errors')}
          >
            Errors ({events.filter((e) => e.kind === 'error').length})
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 text-[#bfc0c0] hover:text-[#ffffff] hover:bg-[#4f5d75]/40 rounded-lg transition-colors"
              title="Clear Terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-[#4f5d75]/50 hover:bg-[#4f5d75] text-[#ffffff] rounded-lg transition-colors border border-[#4f5d75]/60"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#ef8354]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Body with Animated Laser Scanline */}
      <div
        ref={scrollRef}
        className="p-4 max-h-[380px] min-h-[220px] overflow-y-auto space-y-1.5 selection:bg-[#ef8354]/30 selection:text-white relative"
      >
        {/* Animated Laser Scanning Beam */}
        <div className="laser-scanline" />

        <div className="text-[#bfc0c0]/70 text-[11px] pb-2 border-b border-[#4f5d75]/40 flex items-center justify-between">
          <span>// Linux unprivileged user namespace active [bwrap --ro-bind / / --tmpfs /tmp]</span>
          <span className="flex items-center gap-1.5 text-[#ef8354] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef8354] animate-ping" />
            Live IO
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-[#bfc0c0]/50">
            <p>No log events recorded in this session.</p>
            <p className="text-[11px] text-[#bfc0c0]/40 mt-1">Dispatch a task to stream live agent execution.</p>
          </div>
        ) : (
          filteredEvents.map((evt, idx) => {
            const isError = evt.kind === 'error' || evt.message.includes('⚠️') || evt.message.includes('Error');
            const isSandbox = evt.kind === 'sandbox' || evt.message.includes('Sandbox') || evt.message.includes('container');
            const isSuccess = evt.message.includes('✅') || evt.message.includes('✨') || evt.message.includes('successfully');
            const displayMessage = evt.message.replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2700}-\u{27BF}\u{FE0F}]/gu, '').trim();

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 leading-relaxed font-mono"
              >
                <span className="text-[#bfc0c0]/50 select-none shrink-0 font-normal">{evt.time}</span>
                <span className="text-[#4f5d75] select-none shrink-0">›</span>

                <div className="flex-1 break-words">
                  {isError ? (
                    <span className="text-rose-400 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 inline text-rose-500" />
                      {displayMessage}
                    </span>
                  ) : isSandbox ? (
                    <span className="text-[#bfc0c0] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 shrink-0 inline text-[#ef8354]" />
                      {displayMessage}
                    </span>
                  ) : isSuccess ? (
                    <span className="text-[#ef8354] font-semibold">{displayMessage}</span>
                  ) : (
                    <span className="text-[#ffffff]">{displayMessage}</span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {/* Blinking prompt cursor in signature coral */}
        <div className="flex items-center gap-1 text-[#ef8354] pt-1">
          <span className="text-[#bfc0c0]/60">shield@sandbox:~$</span>
          <span className="inline-block w-2 h-4 bg-[#ef8354] animate-pulse shadow-[0_0_6px_#ef8354]" />
        </div>
      </div>
    </div>
  );
};
