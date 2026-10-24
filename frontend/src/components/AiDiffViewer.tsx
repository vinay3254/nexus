import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Sparkles, CheckCircle2, Copy, Check, ChevronRight, FileCode } from 'lucide-react';
import type { SandboxEvent } from '../types';

interface AiDiffViewerProps {
  event: SandboxEvent;
}

export const AiDiffViewer: React.FC<AiDiffViewerProps> = ({ event }) => {
  const [viewMode, setViewMode] = useState<'split' | 'healed'>('split');
  const [copied, setCopied] = useState(false);

  const rawOriginal = event.code || '';
  const rawHealed = event.healed_code || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(rawHealed || rawOriginal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!rawOriginal && !rawHealed) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl border border-[#ef8354]/40 overflow-hidden shadow-2xl my-4 bg-[#222634]"
    >
      {/* Diff Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#252a38] border-b border-[#4f5d75]/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#ef8354]/15 text-[#ef8354] border border-[#ef8354]/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#ffffff]">
                Self-Healing Code Synthesis
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ef8354]/20 text-[#ef8354] border border-[#ef8354]/40 font-semibold">
                bwrap Verified
              </span>
            </div>
            <p className="text-xs text-[#bfc0c0] mt-0.5">
              S.H.I.E.L.D caught runtime exceptions in sandbox isolation and self-healed the implementation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-[#1e222e] rounded-lg text-xs font-sans border border-[#4f5d75]/50">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'split' ? 'bg-[#4f5d75] text-[#ffffff] font-medium shadow-sm' : 'text-[#bfc0c0] hover:text-[#ffffff]'
              }`}
              onClick={() => setViewMode('split')}
            >
              Side-by-Side Diff
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'healed' ? 'bg-[#4f5d75] text-[#ffffff] font-medium shadow-sm' : 'text-[#bfc0c0] hover:text-[#ffffff]'
              }`}
              onClick={() => setViewMode('healed')}
            >
              Healed Only
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#ef8354]/15 hover:bg-[#ef8354]/25 text-[#ef8354] border border-[#ef8354]/30 rounded-lg text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#ef8354]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>
      </div>

      {/* Diff Code Columns */}
      <div className={`grid ${viewMode === 'split' && rawHealed ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} divide-y md:divide-y-0 md:divide-x divide-[#4f5d75]/50 font-mono text-xs`}>
        {/* Left Column: Original Code (Crashed) */}
        {viewMode === 'split' && rawOriginal && rawHealed && (
          <div className="bg-rose-950/15 p-4">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-rose-900/40 text-rose-300">
              <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5" />
                Original Candidate (Sandbox Exception)
              </span>
              <span className="text-[10px] bg-rose-900/50 text-rose-200 px-2 py-0.5 rounded border border-rose-700/60 font-semibold">
                - Crashed
              </span>
            </div>

            <pre className="overflow-x-auto text-rose-200/90 leading-relaxed font-mono whitespace-pre-wrap">
              {rawOriginal}
            </pre>
          </div>
        )}

        {/* Right Column: Self-Healed Verified Code */}
        <div className="bg-[#ef8354]/5 p-4">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#ef8354]/30 text-[#ef8354]">
            <span className="flex items-center gap-1.5 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#ef8354]" />
              Self-Healed Output (Bubblewrap Exit 0)
            </span>
            <span className="text-[10px] bg-[#ef8354]/20 text-[#ef8354] px-2 py-0.5 rounded border border-[#ef8354]/40 font-semibold">
              + Verified
            </span>
          </div>

          <pre className="overflow-x-auto text-[#ffffff] leading-relaxed font-mono whitespace-pre-wrap">
            {rawHealed || rawOriginal}
          </pre>
        </div>
      </div>
    </motion.div>
  );
};
