import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Search, User, Clock, Copy, Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { BoardEntry } from '../types';

interface BlackboardLiveProps {
  entries: BoardEntry[];
  onAddEntry?: (key: string, value: unknown) => void;
}

export const BlackboardLive: React.FC<BlackboardLiveProps> = ({ entries, onAddEntry }) => {
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyValue = (key: string, val: unknown) => {
    navigator.clipboard.writeText(typeof val === 'string' ? val : JSON.stringify(val, null, 2));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filtered = entries.filter((e) =>
    e.key.toLowerCase().includes(search.toLowerCase()) ||
    e.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[#4f5d75]/60 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#4f5d75]/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ef8354]/15 text-[#ef8354] border border-[#ef8354]/30 shadow-[0_0_15px_rgba(239,131,84,0.2)]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#ffffff]">
                Shared Memory Blackboard
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ef8354]/20 text-[#ef8354] border border-[#ef8354]/30 font-semibold">
                Pub/Sub Broadcast
              </span>
            </div>
            <p className="text-xs text-[#bfc0c0] mt-0.5">
              Live immutable blackboard notebook. Prevents redundant API and compute costs across workers.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#bfc0c0]" />
          <input
            type="text"
            placeholder="Filter keys or authors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#222634] border border-[#4f5d75]/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#ffffff] placeholder:text-[#bfc0c0]/50 focus:outline-none focus:border-[#ef8354]/60"
          />
        </div>
      </div>

      {/* Realtime Push Feed */}
      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[#bfc0c0]/60 font-mono text-xs">
            <p>No blackboard entries recorded yet.</p>
            <p className="text-[11px] text-[#bfc0c0]/40 mt-1">
              Entries broadcast automatically when agents publish artifacts or outputs.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((entry) => {
              const isExpanded = expandedKeys[entry.key] ?? true;
              return (
                <motion.div
                  key={entry.key}
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="rounded-xl bg-[#222634]/90 border border-[#4f5d75]/50 hover:border-[#ef8354]/50 transition-all p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleExpand(entry.key)}
                        className="text-[#bfc0c0] hover:text-[#ffffff]"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <span className="font-mono text-xs font-bold text-[#ef8354]">
                        {entry.key}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#bfc0c0] font-mono bg-[#4f5d75]/40 px-2 py-0.5 rounded-md border border-[#4f5d75]/60">
                        <User className="w-3 h-3 text-[#ef8354]" />
                        {entry.author}
                      </span>

                      <button
                        type="button"
                        onClick={() => copyValue(entry.key, entry.value)}
                        className="p-1 rounded text-[#bfc0c0] hover:text-[#ffffff] hover:bg-[#4f5d75]/40"
                        title="Copy entry value"
                      >
                        {copiedKey === entry.key ? <Check className="w-3.5 h-3.5 text-[#ef8354]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content Value */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-[#4f5d75]/40 font-mono text-xs overflow-x-auto"
                      >
                        <pre className="p-3 rounded-lg bg-[#1e222e] text-[#ffffff] whitespace-pre-wrap leading-relaxed border border-[#4f5d75]/40">
                          {typeof entry.value === 'string'
                            ? entry.value
                            : JSON.stringify(entry.value, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
