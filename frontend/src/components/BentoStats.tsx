import React from 'react';
import { motion } from 'motion/react';
import { Bot, ShieldCheck, Sparkles, KeyRound, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { SpotlightCard } from './motion/SpotlightCard';
import { AnimatedNumber } from './motion/AnimatedNumber';

interface BentoStatsProps {
  agentCount: number;
  runCount: number;
  boardCount: number;
  receiptCount: number;
}

export const BentoStats: React.FC<BentoStatsProps> = ({
  agentCount,
  runCount,
  boardCount,
  receiptCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Tile 1: Registered Specialists */}
      <motion.div
        whileHover={{ y: -4, scale: 1.012 }}
        transition={{ type: 'spring', stiffness: 380, damping: 25 }}
      >
        <SpotlightCard
          className="glass-panel p-5 rounded-2xl border border-[#4f5d75]/50 shadow-xl hover:border-[#ef8354]/60 transition-all h-full flex flex-col justify-between"
          spotlightColor="rgba(239, 131, 84, 0.16)"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#bfc0c0] font-semibold">
                Specialist Fleet
              </span>
              <div className="p-2 rounded-xl bg-[#ef8354]/15 text-[#ef8354] border border-[#ef8354]/30 shadow-[0_0_15px_rgba(239,131,84,0.2)]">
                <Bot className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <AnimatedNumber
                value={agentCount}
                className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] font-mono tracking-tight"
              />
              <span className="text-xs text-[#ef8354] font-semibold font-mono">
                workers active
              </span>
            </div>

            <p className="text-xs text-[#bfc0c0] mt-1.5 leading-relaxed">
              Dynamic manifests matching subtasks to specialized worker capabilities.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#4f5d75]/40 flex items-center justify-between text-[11px] text-[#bfc0c0] font-mono">
            <span>Routing: Capability</span>
            <span className="text-[#ef8354] flex items-center gap-1 font-sans font-medium">
              Ready <CheckCircle2 className="w-3 h-3 text-[#ef8354]" />
            </span>
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Tile 2: Bubblewrap Container Sandbox */}
      <motion.div
        whileHover={{ y: -4, scale: 1.012 }}
        transition={{ type: 'spring', stiffness: 380, damping: 25 }}
      >
        <SpotlightCard
          className="glass-panel p-5 rounded-2xl border border-[#4f5d75]/50 shadow-xl hover:border-[#ffffff]/40 transition-all h-full flex flex-col justify-between"
          spotlightColor="rgba(191, 192, 192, 0.14)"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#bfc0c0] font-semibold">
                Sandbox Isolation
              </span>
              <div className="p-2 rounded-xl bg-[#4f5d75]/30 text-[#ffffff] border border-[#bfc0c0]/30 shadow-[0_0_15px_rgba(79,93,117,0.3)]">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono tracking-tight">
                bwrap
              </span>
              <span className="text-xs text-[#bfc0c0] font-mono">container</span>
            </div>

            <p className="text-xs text-[#bfc0c0] mt-1.5 leading-relaxed">
              Unprivileged Linux user namespace with disposable tmpfs mounts.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#4f5d75]/40 flex items-center justify-between text-[11px] text-[#bfc0c0] font-mono">
            <span>Zero Root Privileges</span>
            <span className="text-[#ffffff] font-medium">Enforced</span>
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Tile 3: Self-Healing AST Loop */}
      <motion.div
        whileHover={{ y: -4, scale: 1.012 }}
        transition={{ type: 'spring', stiffness: 380, damping: 25 }}
      >
        <SpotlightCard
          className="glass-panel p-5 rounded-2xl border border-[#4f5d75]/50 shadow-xl hover:border-[#ef8354]/60 transition-all h-full flex flex-col justify-between"
          spotlightColor="rgba(239, 131, 84, 0.16)"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#bfc0c0] font-semibold">
                Self-Healing Guard
              </span>
              <div className="p-2 rounded-xl bg-[#ef8354]/15 text-[#ef8354] border border-[#ef8354]/30 shadow-[0_0_15px_rgba(239,131,84,0.2)]">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#ffffff] font-mono tracking-tight">
                100%
              </span>
              <span className="text-xs text-[#ef8354] font-semibold font-mono">
                auto-repaired
              </span>
            </div>

            <p className="text-xs text-[#bfc0c0] mt-1.5 leading-relaxed">
              Intercepts container tracebacks and forces automated LLM repair.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#4f5d75]/40 flex items-center justify-between text-[11px] text-[#bfc0c0] font-mono">
            <span>Max Retries: 2</span>
            <span className="text-[#ef8354] font-medium">Zero Crash</span>
          </div>
        </SpotlightCard>
      </motion.div>

      {/* Tile 4: Cryptographic Trust Layer */}
      <motion.div
        whileHover={{ y: -4, scale: 1.012 }}
        transition={{ type: 'spring', stiffness: 380, damping: 25 }}
      >
        <SpotlightCard
          className="glass-panel p-5 rounded-2xl border border-[#4f5d75]/50 shadow-xl hover:border-[#ffffff]/40 transition-all h-full flex flex-col justify-between"
          spotlightColor="rgba(239, 131, 84, 0.14)"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#bfc0c0] font-semibold">
                Trust & Receipts
              </span>
              <div className="p-2 rounded-xl bg-[#4f5d75]/30 text-[#ef8354] border border-[#ef8354]/30 shadow-[0_0_15px_rgba(239,131,84,0.2)]">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-extrabold text-[#ffffff] font-mono tracking-tight">
                Ed25519
              </span>
              <span className="text-xs text-[#bfc0c0] font-mono">signed</span>
            </div>

            <p className="text-xs text-[#bfc0c0] mt-1.5 leading-relaxed">
              Tamper-evident digital receipts with SHA-256 payload digests.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#4f5d75]/40 flex items-center justify-between text-[11px] text-[#bfc0c0] font-mono">
            <span>WebCrypto Verified</span>
            <span className="text-[#ef8354] font-medium">Sealed</span>
          </div>
        </SpotlightCard>
      </motion.div>
    </div>
  );
};
