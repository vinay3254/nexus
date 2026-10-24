import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Code2, Database, Rocket, Play, Eye, CornerDownLeft, Layers, ShieldCheck } from 'lucide-react';
import type { PlanStep } from '../types';

interface AiPromptBarProps {
  onDispatch: (task: string) => void;
  onPreviewPlan: (task: string) => void;
  busy: boolean;
  plannedSteps: PlanStep[] | null;
  mode: 'live' | 'preview';
}

const EXAMPLE_PROMPTS = [
  {
    icon: Database,
    title: 'Clean & analyze data',
    prompt: 'Clean CSV data, compute anomaly metrics, and write a summary report',
    tag: 'data-agent',
  },
  {
    icon: Sparkles,
    title: 'Research a topic',
    prompt: 'Research multi-agent orchestration and summarize the findings',
    tag: 'research-agent',
  },
  {
    icon: Rocket,
    title: 'Build & deploy',
    prompt: 'Write a Python script, sandbox verify, and configure Docker deployment',
    tag: 'coding + ops',
  },
];

export const AiPromptBar: React.FC<AiPromptBarProps> = ({
  onDispatch,
  onPreviewPlan,
  busy,
  plannedSteps,
  mode,
}) => {
  const [task, setTask] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!task.trim()) {
      setFeedbackMsg({ text: 'Please enter a task description first.', error: true });
      return;
    }
    setFeedbackMsg(null);
    onDispatch(task.trim());
  };

  const handlePreview = () => {
    if (!task.trim()) {
      setFeedbackMsg({ text: 'Enter a task to preview execution plan.', error: true });
      return;
    }
    setFeedbackMsg(null);
    onPreviewPlan(task.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full">
      {/* Container with dynamic glow border */}
      <motion.div
        className={`glass-panel rounded-2xl p-5 transition-all duration-300 relative overflow-hidden ${
          isFocused
            ? 'ring-2 ring-[#ef8354]/60 shadow-[0_0_40px_rgba(239,131,84,0.25)] border-[#ef8354]/50'
            : 'border-[#4f5d75]/50 hover:border-[#bfc0c0]/40'
        }`}
        animate={{ scale: isFocused ? 1.002 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Subtle top ambient gradient using Coral and Slate */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4f5d75]/30 via-[#ef8354]/60 to-[#4f5d75]/30" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#ef8354] shadow-[0_0_8px_#ef8354] animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#bfc0c0]">
              01 / Autonomous Dispatcher
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#bfc0c0]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ef8354]/15 text-[#ef8354] border border-[#ef8354]/30 font-medium">
              <Layers className="w-3 h-3" />
              Capability Routing
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4f5d75]/30 text-[#ffffff] border border-[#4f5d75]/50">
              <ShieldCheck className="w-3 h-3 text-[#bfc0c0]" />
              bwrap Sandboxed
            </span>
          </div>
        </div>

        <form id="task-form" onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              id="task-input"
              className="w-full bg-transparent text-[#ffffff] placeholder:text-[#bfc0c0]/50 resize-none outline-none text-base sm:text-lg min-h-[90px] leading-relaxed font-normal"
              placeholder="Describe your objective. S.H.I.E.L.D will decompose tasks, route to specialists, sandbox execute, self-heal, and cryptographically sign receipts…"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              maxLength={20000}
              required
            />
          </div>

          {/* Quick Prompt Suggestion Chips */}
          <div className="example-prompts flex flex-wrap gap-2 my-3">
            {EXAMPLE_PROMPTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={idx}
                  type="button"
                  className="prompt-chip group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-[#222634]/90 hover:bg-[#4f5d75]/40 text-[#bfc0c0] hover:text-[#ffffff] border border-[#4f5d75]/40 hover:border-[#ef8354]/50 transition-all shadow-sm"
                  onClick={() => {
                    setTask(item.prompt);
                    setFeedbackMsg(null);
                  }}
                  data-prompt={item.prompt}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Icon className="w-3.5 h-3.5 text-[#ef8354] group-hover:scale-110 transition-transform" />
                  <span>{item.title}</span>
                  <span className="text-[10px] text-[#bfc0c0]/70 group-hover:text-[#bfc0c0]">· {item.tag}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Bottom Bar: Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#4f5d75]/40">
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                id="preview-plan"
                className="inline-flex items-center gap-1.5 text-xs text-[#bfc0c0] hover:text-[#ffffff] py-1.5 px-3 rounded-lg hover:bg-[#4f5d75]/30 transition-colors border border-transparent hover:border-[#4f5d75]/50"
                onClick={handlePreview}
                disabled={busy}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Eye className="w-3.5 h-3.5 text-[#ef8354]" />
                <span>Preview plan</span>
                <span className="text-[10px] text-[#bfc0c0]/70">· Dry run</span>
              </motion.button>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#bfc0c0]/70">
                <kbd className="px-1.5 py-0.5 rounded bg-[#222634] border border-[#4f5d75] text-[#bfc0c0] font-mono text-[10px]">
                  Ctrl
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#222634] border border-[#4f5d75] text-[#bfc0c0] font-mono text-[10px]">
                  Enter
                </kbd>
              </span>

              <motion.button
                type="submit"
                id="run-task"
                className="shimmer-sweep relative inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#ef8354] via-[#e76f51] to-[#ef8354] hover:shadow-[0_0_25px_rgba(239,131,84,0.45)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={busy}
                whileHover={{ scale: busy ? 1 : 1.03 }}
                whileTap={{ scale: busy ? 1 : 0.97 }}
              >
                <Play className="w-4 h-4 fill-current text-white" />
                <span id="run-label">{busy ? 'Executing pipeline…' : 'Run task'}</span>
              </motion.button>
            </div>
          </div>

          {/* Feedback messaging */}
          <AnimatePresence>
            {feedbackMsg && (
              <motion.p
                id="task-feedback"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="status"
                className={`mt-3 text-xs px-3 py-1.5 rounded-lg border ${
                  feedbackMsg.error
                    ? 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                    : 'bg-[#ef8354]/15 text-[#ffffff] border-[#ef8354]/40'
                }`}
              >
                {feedbackMsg.text}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
};
