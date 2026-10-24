import React, { useState } from 'react';
import { Database, Search, Download, Copy, Check, FileText } from 'lucide-react';
import type { BoardEntry } from '../types';

interface BlackboardLedgerProps {
  entries: BoardEntry[];
  onExport: () => void;
}

export const BlackboardLedger: React.FC<BlackboardLedgerProps> = ({
  entries,
  onExport,
}) => {
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filtered = entries.filter((e) =>
    `${e.key} ${e.author} ${JSON.stringify(e.value)}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (key: string, value: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="shield-container" style={{ paddingBlock: '40px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span className="shield-section-label">Shared Memory Ledger</span>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', margin: '0 0 8px' }}>
            The Living <em>Blackboard.</em>
          </h2>
          <p style={{ color: 'var(--shield-muted)', fontSize: '16px', margin: 0 }}>
            In-memory asyncio event bus backed by SQLite WAL persistence.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span
            id="board-count"
            style={{
              fontFamily: 'var(--shield-mono)',
              fontSize: '13px',
              color: 'var(--shield-muted)',
            }}
          >
            {entries.length} entries
          </span>
          <button
            id="export-board"
            type="button"
            className="shield-pill shield-pill-dark"
            onClick={onExport}
          >
            <Download size={14} />
            <span>Export Blackboard JSON</span>
          </button>
        </div>
      </div>

      {/* Search Input Filter */}
      <div style={{ position: 'relative', marginBottom: '28px' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '18px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--shield-muted)',
          }}
        />
        <input
          id="board-search"
          type="search"
          placeholder="Filter entries by key, author, or content payload…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 20px 14px 48px',
            borderRadius: '100px',
            border: '1px solid var(--shield-line)',
            background: 'var(--shield-surface)',
            fontSize: '14px',
            color: 'var(--shield-ink)',
            outline: 'none',
          }}
        />
      </div>

      {/* Ledger Records */}
      <div id="board-entries" className="shield-records">
        {filtered.length > 0 ? (
          filtered.map((entry) => (
            <details key={entry.key} className="record" open>
              <summary>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={18} style={{ color: 'var(--shield-terracotta)' }} />
                  <span style={{ fontFamily: 'var(--shield-mono)', fontWeight: 600 }}>{entry.key}</span>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'var(--shield-mono)',
                    color: 'var(--shield-muted)',
                  }}
                >
                  v{entry.version}
                </span>
              </summary>

              <p className="secondary">
                Author: <strong>{entry.author}</strong> · Version {entry.version}
                {entry.timestamp && ` · ${new Date(entry.timestamp).toLocaleString()}`}
              </p>

              <pre className="code-block">{JSON.stringify(entry.value, null, 2)}</pre>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                }}
              >
                <button
                  type="button"
                  className="shield-text-link"
                  data-copy-entry={entry.key}
                  onClick={() => handleCopy(entry.key, entry.value)}
                >
                  {copiedKey === entry.key ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === entry.key ? 'Copied' : 'Copy payload'}</span>
                </button>
              </div>
            </details>
          ))
        ) : (
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              border: '1px dashed var(--shield-line)',
              borderRadius: '20px',
              color: 'var(--shield-muted)',
            }}
          >
            <Database size={32} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No matching blackboard records found. Run a multi-agent task to publish outputs.</p>
          </div>
        )}
      </div>
    </div>
  );
};
