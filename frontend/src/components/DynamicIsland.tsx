import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ShieldCheck, Cpu, Command, Sun, Moon, Radio } from 'lucide-react';

interface DynamicIslandProps {
  connected: boolean;
  busy: boolean;
  currentAgent: string | null;
  activeStatusText: string;
  agentCount: number;
  onOpenCommand: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleMode: () => void;
  mode: 'live' | 'preview';
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  connected,
  busy,
  currentAgent,
  activeStatusText,
  agentCount,
  onOpenCommand,
  isDark,
  onToggleTheme,
  onToggleMode,
  mode,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <motion.div
        layout
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="glass-panel px-4 py-2.5 rounded-full border border-[#4f5d75]/80 shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex items-center gap-3.5 backdrop-blur-xl bg-[#222634]/95 text-xs"
      >
        {/* Pulsing state dot */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                busy ? 'bg-[#ef8354]' : connected ? 'bg-[#ef8354]' : 'bg-[#bfc0c0]'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                busy ? 'bg-[#ef8354]' : connected ? 'bg-[#ef8354]' : 'bg-[#4f5d75]'
              }`}
            />
          </span>

          <span className="font-medium text-[#ffffff] truncate max-w-[170px] sm:max-w-[240px]">
            {busy ? (
              <span className="text-[#ef8354] font-mono">
                {currentAgent ? `${currentAgent} · running` : 'Orchestrating…'}
              </span>
            ) : (
              <span>{activeStatusText || 'S.H.I.E.L.D Autonomous Hub'}</span>
            )}
          </span>
        </div>

        <div className="h-3.5 w-px bg-[#4f5d75]/80" />

        {/* Mode & Connection badge */}
        <button
          type="button"
          onClick={onToggleMode}
          className="flex items-center gap-1.5 text-[11px] text-[#bfc0c0] hover:text-[#ffffff] transition-colors"
          title="Toggle between Live Server & Offline Preview simulation"
        >
          <Radio className={`w-3 h-3 ${connected ? 'text-[#ef8354]' : 'text-[#bfc0c0]'}`} />
          <span id="dynamic-island-connection" className="font-semibold text-[#ffffff]">
            {connected ? 'Connected' : mode === 'preview' ? 'Offline Preview' : 'Connecting…'}
          </span>
        </button>

        <div className="h-3.5 w-px bg-[#4f5d75]/80 hidden sm:block" />

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenCommand}
            className="p-1 text-[#bfc0c0] hover:text-[#ffffff] hover:bg-[#4f5d75]/40 rounded-md transition-colors"
            title="Open Command Palette (Ctrl+K)"
          >
            <Command className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="p-1 text-[#bfc0c0] hover:text-[#ffffff] hover:bg-[#4f5d75]/40 rounded-md transition-colors"
            title="Toggle Dark / Light Theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-[#ef8354]" /> : <Moon className="w-3.5 h-3.5 text-[#bfc0c0]" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
