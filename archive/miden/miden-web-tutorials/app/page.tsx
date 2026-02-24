'use client';
import { useState } from 'react';
import { createWalletAndFaucet } from '../lib/1_createWalletAndFaucet';
import { mintConsumeTransfer } from '../lib/2_mintConsumeTransfer';
import { incrementCounterContract } from '../lib/3_incrementCounterContract';
import { unauthenticatedNoteTransfer } from '../lib/4_unauthenticatedNoteTransfer';
import { foreignProcedureInvocation } from '../lib/5_foreignProcedureInvocation';

const tutorials = [
  { label: 'Tutorial 1: Create Wallet & Deploy Faucet', fn: createWalletAndFaucet, color: '#e65100' },
  { label: 'Tutorial 2: Mint, Consume & Transfer Tokens', fn: mintConsumeTransfer, color: '#ef6c00' },
  { label: 'Tutorial 3: Increment Counter Contract', fn: incrementCounterContract, color: '#f57c00' },
  { label: 'Tutorial 4: Unauthenticated Note Transfers', fn: unauthenticatedNoteTransfer, color: '#fb8c00' },
  { label: 'Tutorial 5: Foreign Procedure Invocation', fn: foreignProcedureInvocation, color: '#ffa726' },
];

export default function Home() {
  const [running, setRunning] = useState<number | null>(null);

  const run = async (idx: number) => {
    setRunning(idx);
    try {
      await tutorials[idx].fn();
    } catch (err) {
      console.error('Tutorial error:', err);
    }
    setRunning(null);
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: '#fff',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Miden Contract Tutorials</h1>
      <p style={{ color: '#aaa', marginBottom: '2rem' }}>
        Open browser console (F12) to see logs. Run tutorials in order.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', width: '100%' }}>
        {tutorials.map((t, i) => (
          <button
            key={i}
            onClick={() => run(i)}
            disabled={running !== null}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '1.1rem',
              cursor: running !== null ? 'wait' : 'pointer',
              background: 'transparent',
              border: `2px solid ${t.color}`,
              color: '#fff',
              borderRadius: '12px',
              transition: 'all 0.2s',
              opacity: running !== null && running !== i ? 0.4 : 1,
            }}
          >
            {running === i ? 'Running... (check console)' : t.label}
          </button>
        ))}
      </div>

      <p style={{ color: '#666', marginTop: '2rem', fontSize: '0.85rem' }}>
        Powered by @demox-labs/miden-sdk | Testnet RPC: rpc.testnet.miden.io
      </p>
    </main>
  );
}
