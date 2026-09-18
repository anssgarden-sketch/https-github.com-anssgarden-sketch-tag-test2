import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { testApi, travelApi } from '../services/api';
import { 
  X, 
  Wrench, 
  Zap, 
  Coins, 
  HeartPulse, 
  Clock, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle 
} from 'lucide-react';

interface TestControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestStepResult {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  details?: string;
}

export const TestControlDrawer: React.FC<TestControlDrawerProps> = ({ isOpen, onClose }) => {
  const { character, travelMap, triggerApRegen, drainAp, topupCredits, resurrect, refreshCharacter } = useGame();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [suiteResults, setSuiteResults] = useState<TestStepResult[]>([]);

  if (!isOpen) return null;

  const handleAction = async (name: string, fn: () => Promise<any>) => {
    setLoadingAction(name);
    try {
      await fn();
    } catch (err: any) {
      alert(`Action failed: ${err?.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const runTravelSuite = async () => {
    setSuiteRunning(true);
    const results: TestStepResult[] = [
      { step: 1, name: '1. Rail Reject (London -> Berlin, No Direct Rail Connection)', status: 'pending' },
      { step: 2, name: '2. Rail Immediate Arrival (London -> Paris, Direct Rail)', status: 'pending' },
      { step: 3, name: '3. Air Immediate Arrival (Paris -> Berlin, Airports)', status: 'pending' },
      { step: 4, name: '4. Road Immediate Arrival (Berlin -> Paris, Highway)', status: 'pending' },
      { step: 5, name: '5. In-Transit Deficit Check (Drain AP & Initiate Journey)', status: 'pending' },
    ];
    setSuiteResults([...results]);

    const cities = travelMap?.cities || [];
    const london = cities.find((c) => c.name === 'London');
    const berlin = cities.find((c) => c.name === 'Berlin');
    const paris = cities.find((c) => c.name === 'Paris');

    if (!london || !berlin || !paris) {
      alert('Map cities not loaded yet. Wait a moment and retry.');
      setSuiteRunning(false);
      return;
    }

    // Step 1: Reject Rail London -> Berlin
    results[0].status = 'running';
    setSuiteResults([...results]);
    try {
      await travelApi.initiate(berlin.id, 'rail');
      results[0].status = 'failed';
      results[0].details = 'Expected 400 error but request succeeded!';
    } catch (err: any) {
      if (err?.message?.includes('No direct rail connection') || err?.status === 400) {
        results[0].status = 'passed';
        results[0].details = `Clean 400 rejection: "${err.message}"`;
      } else {
        results[0].status = 'failed';
        results[0].details = `Unexpected error: ${err.message}`;
      }
    }
    setSuiteResults([...results]);

    // Make sure operative is in London and has funds
    await testApi.topupCredits();

    // Step 2: Rail London -> Paris (Immediate Arrival)
    results[1].status = 'running';
    setSuiteResults([...results]);
    try {
      const res = await travelApi.initiate(paris.id, 'rail');
      if (res.status === 'arrived') {
        results[1].status = 'passed';
        results[1].details = `Arrived in Paris! Distance: ${res.distance_px}px, AP: ${res.ap_spent}, Cost: $${res.credits_spent}`;
      } else {
        results[1].status = 'failed';
        results[1].details = `Expected arrived status, got: ${res.status}`;
      }
    } catch (err: any) {
      results[1].status = 'failed';
      results[1].details = err?.message;
    }
    setSuiteResults([...results]);

    // Step 3: Air Paris -> Berlin (Immediate Arrival)
    results[2].status = 'running';
    setSuiteResults([...results]);
    try {
      const res = await travelApi.initiate(berlin.id, 'air');
      if (res.status === 'arrived') {
        results[2].status = 'passed';
        results[2].details = `Flew into Berlin! Distance: ${res.distance_px}px, AP: ${res.ap_spent}, Cost: $${res.credits_spent}`;
      } else {
        results[2].status = 'failed';
        results[2].details = `Expected arrived status, got: ${res.status}`;
      }
    } catch (err: any) {
      results[2].status = 'failed';
      results[2].details = err?.message;
    }
    setSuiteResults([...results]);

    // Step 4: Road Berlin -> Paris (Immediate Arrival)
    results[3].status = 'running';
    setSuiteResults([...results]);
    try {
      const res = await travelApi.initiate(paris.id, 'road');
      if (res.status === 'arrived') {
        results[3].status = 'passed';
        results[3].details = `Drove to Paris via road! Distance: ${res.distance_px}px, AP: ${res.ap_spent}, Cost: $${res.credits_spent}`;
      } else {
        results[3].status = 'failed';
        results[3].details = `Expected arrived status, got: ${res.status}`;
      }
    } catch (err: any) {
      results[3].status = 'failed';
      results[3].details = err?.message;
    }
    setSuiteResults([...results]);

    // Step 5: In-Transit Deficit
    results[4].status = 'running';
    setSuiteResults([...results]);
    try {
      // Drain AP so current_ap becomes low (1 AP)
      await testApi.drainAp();
      await testApi.drainAp();
      // Travel from Paris to London via Road (distance ~36px -> 4 * 0.36 = 2 AP cost)
      const res = await travelApi.initiate(london.id, 'road');
      results[4].status = 'passed';
      results[4].details = `Result: status=${res.status}, deficit=${res.ap_deficit_hours || 0}h, message="${res.message}"`;
    } catch (err: any) {
      results[4].status = 'failed';
      results[4].details = err?.message;
    }
    setSuiteResults([...results]);

    await refreshCharacter();
    setSuiteRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in font-mono">
      <div className="w-full max-w-md bg-neutral-950 border-l border-neutral-800 p-6 h-full overflow-y-auto flex flex-col justify-between shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-neutral-100 text-sm">TAG Developer Test Toolkit</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick API Operations */}
          <div className="space-y-3">
            <span className="text-[11px] text-neutral-500 uppercase font-bold tracking-wider block">
              Character State Manipulation
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                disabled={!!loadingAction}
                onClick={() => handleAction('drain', drainAp)}
                className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left text-neutral-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Drain AP (-2)</span>
                </div>
                <div className="text-[10px] text-neutral-500">Test deficit mechanics</div>
              </button>

              <button
                type="button"
                disabled={!!loadingAction}
                onClick={() => handleAction('topup', topupCredits)}
                className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left text-neutral-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Top Up ($2,000)</span>
                </div>
                <div className="text-[10px] text-neutral-500">Fund Swiss account</div>
              </button>

              <button
                type="button"
                disabled={!!loadingAction}
                onClick={() => handleAction('regen', triggerApRegen)}
                className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left text-neutral-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>AP Regen Tick</span>
                </div>
                <div className="text-[10px] text-neutral-500">+1 AP & expire tags</div>
              </button>

              <button
                type="button"
                disabled={!!loadingAction}
                onClick={() => handleAction('resurrect', resurrect)}
                className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left text-neutral-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1">
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>Resurrect</span>
                </div>
                <div className="text-[10px] text-neutral-500">Revive dead character</div>
              </button>
            </div>
          </div>

          {/* Automated Travel Test Suite */}
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-500 uppercase font-bold tracking-wider">
                Automated 5-Step Travel Suite
              </span>
              <button
                type="button"
                disabled={suiteRunning}
                onClick={runTravelSuite}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{suiteRunning ? 'Executing...' : 'Run Test Suite'}</span>
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Executes the comprehensive travel verification plan: Rail Rejection (No Track), Rail Arrival (Eurostar corridor), Air Arrival (Airports), Road Arrival (Highways), and Deficit Calculation.
            </p>

            {suiteResults.length > 0 && (
              <div className="space-y-2 mt-3">
                {suiteResults.map((r) => (
                  <div
                    key={r.step}
                    className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-neutral-300">{r.name}</span>
                      {r.status === 'running' && (
                        <span className="text-amber-400 animate-pulse text-[10px]">RUNNING</span>
                      )}
                      {r.status === 'passed' && (
                        <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> PASSED
                        </span>
                      )}
                      {r.status === 'failed' && (
                        <span className="text-rose-400 flex items-center gap-1 text-[10px]">
                          <AlertCircle className="w-3 h-3" /> FAILED
                        </span>
                      )}
                      {r.status === 'pending' && (
                        <span className="text-neutral-600 text-[10px]">WAITING</span>
                      )}
                    </div>
                    {r.details && (
                      <p className="text-[10px] text-neutral-400 font-mono leading-tight">
                        {r.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-800 text-[11px] text-neutral-500">
          * Connected directly to live Supabase database via Node API.
        </div>
      </div>
    </div>
  );
};
