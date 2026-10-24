import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Bot, Shield, Clock, Tag, ExternalLink, X, Sparkles } from 'lucide-react';
import type { AgentManifest } from '../types';
import { SpotlightCard } from './motion/SpotlightCard';

interface AgentStoreProps {
  agents: AgentManifest[];
  onSelectAgent?: (id: string) => void;
}

export const AgentStore: React.FC<AgentStoreProps> = ({ agents, onSelectAgent }) => {
  const [activeModalAgent, setActiveModalAgent] = useState<AgentManifest | null>(null);

  const getAgentRoleColor = (id: string) => {
    switch (id) {
      case 'coding-agent':
        return { text: 'text-[#ef8354]', bg: 'bg-[#ef8354]/15', border: 'border-[#ef8354]/40' };
      case 'research-agent':
        return { text: 'text-[#bfc0c0]', bg: 'bg-[#4f5d75]/30', border: 'border-[#bfc0c0]/40' };
      case 'data-agent':
        return { text: 'text-[#ffffff]', bg: 'bg-[#4f5d75]/40', border: 'border-[#ffffff]/40' };
      case 'ops-agent':
        return { text: 'text-[#ef8354]', bg: 'bg-[#ef8354]/10', border: 'border-[#ef8354]/30' };
      default:
        return { text: 'text-[#bfc0c0]', bg: 'bg-[#4f5d75]/20', border: 'border-[#4f5d75]/40' };
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-[#4f5d75]/60 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#4f5d75]/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ef8354]/15 text-[#ef8354] border border-[#ef8354]/30 shadow-[0_0_15px_rgba(239,131,84,0.2)]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#ffffff]">
                AI Specialist Agent Store & Registry
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ef8354]/20 text-[#ef8354] border border-[#ef8354]/30 font-semibold">
                Dynamic Manifests
              </span>
            </div>
            <p className="text-xs text-[#bfc0c0] mt-0.5">
              Specialized autonomous workers with capability-based routing and runtime plugin extensions.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-[#bfc0c0] bg-[#222634] px-3 py-1.5 rounded-xl border border-[#4f5d75]/60">
          {agents.length} Registered Specialists
        </span>
      </div>

      {/* Grid of Agent Cards */}
      <div id="registry-agents" className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {agents.map((ag) => {
          const colors = getAgentRoleColor(ag.id);
          return (
            <SpotlightCard
              key={ag.id}
              onClick={() => setActiveModalAgent(ag)}
              className="agent-card group p-5 rounded-2xl bg-[#222634]/90 border border-[#4f5d75]/50 hover:border-[#ef8354]/60 transition-all cursor-pointer relative overflow-hidden shadow-lg hover:shadow-[0_0_30px_rgba(239,131,84,0.18)]"
              spotlightColor="rgba(239, 131, 84, 0.16)"
            >
              {/* Subtle top accent sheen */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colors.bg} ${colors.text} ${colors.border} border shadow-sm`}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#ffffff] group-hover:text-[#ef8354] transition-colors">
                      {ag.name}
                    </h3>
                    <p className="text-xs text-[#bfc0c0] font-mono">{ag.id}</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-[#bfc0c0] bg-[#4f5d75]/40 px-2 py-0.5 rounded-lg border border-[#4f5d75]/60">
                  v{ag.version}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-[#bfc0c0] mt-3 leading-relaxed">
                {ag.desc || `Autonomous specialist configured to execute ${ag.capabilities.join(', ')} tasks with deterministic isolation.`}
              </p>

              {/* Capability Tags */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {ag.capabilities.map((cap, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#4f5d75]/30 text-[#ffffff] border border-[#4f5d75]/50 group-hover:border-[#ef8354]/30"
                  >
                    <Tag className="w-2.5 h-2.5 text-[#ef8354]" />
                    {cap}
                  </span>
                ))}
              </div>

              {/* Footer Meta */}
              <div className="flex items-center justify-between pt-3 mt-4 border-t border-[#4f5d75]/40 text-[11px] text-[#bfc0c0]/80">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-[#ef8354]" />
                  Timeout: {ag.timeout_secs}s
                </span>
                <span className="text-[#ef8354] font-medium group-hover:underline flex items-center gap-1">
                  Inspect manifest <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {/* Modal Dialog */}
      <AnimatePresence>
        {activeModalAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-[#ef8354]/50 shadow-2xl relative bg-[#222634]"
            >
              <div className="flex items-start justify-between pb-4 border-b border-[#4f5d75]/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#ef8354]/15 text-[#ef8354] border border-[#ef8354]/30">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#ffffff]">
                      {activeModalAgent.name}
                    </h3>
                    <p className="text-xs text-[#bfc0c0] font-mono">{activeModalAgent.id} · v{activeModalAgent.version}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalAgent(null)}
                  className="p-1 rounded-lg text-[#bfc0c0] hover:text-[#ffffff] hover:bg-[#4f5d75]/30"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#bfc0c0] font-semibold">Description</span>
                  <p className="text-[#ffffff] mt-1 leading-relaxed">
                    {activeModalAgent.desc}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#bfc0c0] font-semibold">Capabilities</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {activeModalAgent.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-[#4f5d75]/40 text-[#ffffff] font-mono text-[11px] border border-[#4f5d75]/60"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#bfc0c0] font-semibold">Manifest JSON</span>
                  <pre className="mt-1 p-3 rounded-xl bg-[#1e222e] text-[#ef8354] font-mono text-[11px] overflow-x-auto border border-[#4f5d75]/50">
                    {JSON.stringify(activeModalAgent, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-3 border-t border-[#4f5d75]/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModalAgent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4f5d75] hover:bg-[#bfc0c0] text-[#ffffff] hover:text-[#222634] transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
