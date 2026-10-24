import React, { useState } from 'react';
import { Lock, ShieldCheck, Check, AlertCircle, Upload, FileCheck } from 'lucide-react';
import { verifyReceiptSignature } from '../receipts';
import { parseReceipt } from '../validation';
import type { Receipt } from '../types';

interface TiltReceiptCardProps {
  receipts: Receipt[];
  onImportReceipt?: (receipt: Receipt) => void;
}

export const TiltReceiptCard: React.FC<TiltReceiptCardProps> = ({
  receipts,
  onImportReceipt,
}) => {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<string, boolean>>({});

  const handleVerify = async (receipt: Receipt) => {
    setVerifyingId(receipt.task_id);
    try {
      const valid = await verifyReceiptSignature(receipt);
      setVerificationResults((prev) => ({ ...prev, [receipt.task_id]: valid }));
    } catch {
      setVerificationResults((prev) => ({ ...prev, [receipt.task_id]: false }));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const parsed = parseReceipt(raw);
        onImportReceipt?.(parsed);
      } catch {
        // invalid receipt
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="shield-container" style={{ paddingBlock: '40px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '36px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span className="shield-section-label">Cryptographic Trust Layer</span>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', margin: '0 0 8px' }}>
            Tamper-Evident <em>Receipt Vault.</em>
          </h2>
          <p style={{ color: 'var(--shield-muted)', fontSize: '16px', maxWidth: '720px' }}>
            Every completed agent execution, output payload, and telemetry packet is hashed with SHA-256 and signed with Ed25519 asymmetric keys.
          </p>
        </div>

        {/* Upload receipt JSON file */}
        <div>
          <label
            htmlFor="receipt-file"
            className="shield-pill shield-pill-dark"
            style={{ cursor: 'pointer' }}
          >
            <Upload size={14} />
            <span>Import Receipt File</span>
          </label>
          <input
            id="receipt-file"
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div id="receipt-list" className="shield-records">
        {receipts.length > 0 ? (
          receipts.map((r, i) => {
            const isVerified = verificationResults[r.task_id];
            const isVerifying = verifyingId === r.task_id;

            return (
              <details key={r.task_id || i} className="record" open>
                <summary>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldCheck size={20} style={{ color: 'var(--shield-terracotta)' }} />
                    <span style={{ fontWeight: 500 }}>Receipt for Task: {r.task_id}</span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--shield-mono)',
                      fontSize: '11px',
                      color: 'var(--shield-muted)',
                    }}
                  >
                    {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : 'Active'}
                  </span>
                </summary>

                <div style={{ marginTop: '16px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        background: 'var(--shield-paper-warm)',
                        border: '1px solid var(--shield-line)',
                      }}
                    >
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--shield-muted)' }}>
                        SHA-256 Digest
                      </span>
                      <p
                        style={{
                          fontFamily: 'var(--shield-mono)',
                          fontSize: '12px',
                          color: 'var(--shield-ink)',
                          wordBreak: 'break-all',
                          margin: '4px 0 0',
                        }}
                      >
                        {r.payload_digest}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        background: 'var(--shield-paper-warm)',
                        border: '1px solid var(--shield-line)',
                      }}
                    >
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--shield-muted)' }}>
                        Ed25519 Public Key
                      </span>
                      <p
                        style={{
                          fontFamily: 'var(--shield-mono)',
                          fontSize: '12px',
                          color: 'var(--shield-ink)',
                          wordBreak: 'break-all',
                          margin: '4px 0 0',
                        }}
                      >
                        {r.public_key || 'Embedded daemon authority key'}
                      </p>
                    </div>
                  </div>

                  {r.signature && (
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--shield-muted)' }}>
                        Digital Asymmetric Signature
                      </span>
                      <pre className="code-block" style={{ marginTop: '4px', fontSize: '11px' }}>
                        {r.signature}
                      </pre>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      {isVerified !== undefined && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            color: isVerified ? 'var(--shield-emerald, #2e5a44)' : 'var(--shield-crimson, #a63a2a)',
                            fontWeight: 600,
                          }}
                        >
                          {isVerified ? (
                            <>
                              <Check size={16} /> Signature verified (Ed25519)
                            </>
                          ) : (
                            <>
                              <AlertCircle size={16} /> Verification failed (Signature mismatch)
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      data-verify-receipt={String(i)}
                      className="shield-pill shield-pill-terracotta"
                      style={{ minHeight: '38px', padding: '6px 16px', fontSize: '13px' }}
                      onClick={() => handleVerify(r)}
                      disabled={isVerifying}
                    >
                      <Lock size={13} />
                      <span>{isVerifying ? 'Verifying Ed25519…' : 'Verify Signature'}</span>
                    </button>
                  </div>
                </div>
              </details>
            );
          })
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
            <Lock size={32} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No cryptographic receipts archived yet. Run a multi-agent task or import a receipt file.</p>
          </div>
        )}
      </div>
    </div>
  );
};
