import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, FastForward, RotateCcw, HardDrive, Zap } from 'lucide-react';
import { MemoryEngine, MemoryAlgorithms } from './MemoryEngine';

const DEFAULT_HOLES = [100, 500, 200, 300];

const algorithmMeta = {
  [MemoryAlgorithms.FIRST_FIT]: {
    label: 'First Fit',
    description: 'Walk memory from the start and fill the first hole that fits the request.',
  },
  [MemoryAlgorithms.BEST_FIT]: {
    label: 'Best Fit',
    description: 'Choose the smallest hole that can contain the request to minimize waste.',
  },
  [MemoryAlgorithms.WORST_FIT]: {
    label: 'Worst Fit',
    description: 'Pick the largest hole so large requests keep getting space.',
  },
};

const MemoryRequestEditor = ({ requests, onUpdate, onAdd, onRemove, disabled }) => (
  <div className="glass rounded-2xl border border-white/10 overflow-hidden">
    <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
      <div>
        <h4 className="font-semibold text-white">Request Queue</h4>
        <p className="text-xs text-neutral-400">Define the memory footprint of each process.</p>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAdd}
        disabled={disabled}
        className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold uppercase tracking-widest"
      >
        Add Request
      </motion.button>
    </div>
    <div className="px-6 py-5 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
      {requests.map((request, idx) => (
        <div
          key={`${request.pid}-${idx}`}
          className="flex flex-col gap-2 bg-slate-900/40 border border-white/5 rounded-2xl px-4 py-4"
        >
          <div className="flex flex-wrap gap-3 items-center">
            <div className="text-xs uppercase tracking-wide text-neutral-400">Process</div>
            <input
              type="text"
              value={request.pid}
              onChange={(e) => onUpdate(idx, 'pid', e.target.value.toUpperCase())}
              disabled={disabled}
              className="bg-transparent border border-white/10 rounded-full px-3 py-1 text-sm text-white w-28"
            />
            <div className="text-xs uppercase tracking-wide text-neutral-400">Size (units)</div>
            <input
              type="number"
              min="1"
              value={request.size}
              onChange={(e) => onUpdate(idx, 'size', Number(e.target.value))}
              disabled={disabled}
              className="bg-transparent border border-white/10 rounded-full px-3 py-1 text-sm text-white w-20"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onRemove(idx)}
              disabled={disabled || requests.length === 1}
              className="ml-auto text-xs uppercase tracking-widest text-red-400 disabled:text-red-600"
            >
              Remove
            </motion.button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StatusChip = ({ label, value, hint }) => {
  const accentPalette = {
    Allocated: 'from-amber-500/40 via-orange-500/10 to-slate-900/70',
    Free: 'from-cyan-500/30 via-blue-500/10 to-slate-900/70',
    'Internal Frag': 'from-pink-500/30 via-purple-500/10 to-slate-900/70',
    'External Frag': 'from-emerald-500/30 via-cyan-500/10 to-slate-900/70',
  };
  const gradient = accentPalette[label] ?? 'from-slate-900/60 to-slate-900/90';

  return (
    <div className={`bg-gradient-to-br ${gradient} border border-white/10 rounded-2xl px-4 py-3 text-sm shadow-[0_15px_45px_rgba(14,165,233,0.25)]`}>
      <div className="text-xs text-neutral-300 uppercase tracking-widest">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
      <p className="text-xs text-neutral-400 mt-1">{hint}</p>
    </div>
  );
};

const MemorySimulator = ({ className = '' }) => {
  const holeSizes = DEFAULT_HOLES;
  const totalHoleSpace = holeSizes.reduce((sum, size) => sum + size, 0);

  const [requests, setRequests] = useState([
    { pid: 'P1', size: 24 },
    { pid: 'P2', size: 16 },
    { pid: 'P3', size: 32 },
    { pid: 'P4', size: 8 },
  ]);
  const [algorithm, setAlgorithm] = useState(MemoryAlgorithms.FIRST_FIT);
  const [speed, setSpeed] = useState(650);

  const [engine, setEngine] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [results, setResults] = useState(null);
  const [playing, setPlaying] = useState(false);

  const timerRef = useRef(null);

  const reset = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setEngine(null);
    setSnapshot(null);
    setResults(null);
  }, []);

  const initEngine = useCallback(() => {
    const freshEngine = new MemoryEngine(requests, algorithm, { initialHoles: DEFAULT_HOLES });
    setEngine(freshEngine);
    setSnapshot(freshEngine.getSnapshot());
    setResults(null);
    return freshEngine;
  }, [requests, algorithm]);

  const step = useCallback(() => {
    let current = engine;
    if (!current) {
      current = initEngine();
    }
    const snap = current.step();
    setEngine(current);
    setSnapshot(snap);
    if (snap.done) {
      setResults(snap.metrics);
      setPlaying(false);
    }
  }, [engine, initEngine]);

  const play = useCallback(() => {
    let current = engine;
    if (!current) {
      current = initEngine();
    }
    if (playing || current.isDone()) return;
    setEngine(current);
    setPlaying(true);
  }, [engine, initEngine, playing]);

  const pause = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runToEnd = useCallback(() => {
    let current = engine;
    if (!current) {
      current = initEngine();
    }
    const metrics = current.runToEnd();
    setEngine(current);
    setSnapshot(current.getSnapshot());
    setResults(metrics);
    setPlaying(false);
  }, [engine, initEngine]);

  useEffect(() => {
    reset();
  }, [requests, algorithm, reset]);

  useEffect(() => {
    if (playing && engine && !engine.isDone()) {
      timerRef.current = setInterval(() => {
        const snap = engine.step();
        setSnapshot(snap);
        if (snap.done) {
          setResults(snap.metrics);
          setPlaying(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        }
      }, speed);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, engine, speed]);

  const addRequest = () => {
    setRequests(prev => [...prev, { pid: `P${prev.length + 1}`, size: 8 }]);
  };

  const updateRequest = (idx, field, value) => {
    setRequests(prev => prev.map((request, index) => (
      index === idx ? { ...request, [field]: field === 'size' ? Math.max(1, Number(value) || 1) : value } : request
    )));
  };

  const removeRequest = (idx) => {
    setRequests(prev => (prev.length > 1 ? prev.filter((_, index) => index !== idx) : prev));
  };

  const handleAlgorithmChange = (algo) => {
    setAlgorithm(algo);
  };

  const currentRequest = snapshot?.currentRequest;
  const metrics = snapshot?.metrics ?? {
    totalMemory: totalHoleSpace,
    allocated: 0,
    free: totalHoleSpace,
    internalFragmentation: 0,
    externalFragmentation: 0,
    largestHole: totalHoleSpace,
  };
  const visualSegments = snapshot?.segments ?? [{ start: 0, size: totalHoleSpace, free: true }];
  const utilization = totalHoleSpace
    ? Math.min(100, Math.round((metrics.allocated / totalHoleSpace) * 100))
    : 0;

  return (
    <section className={`relative space-y-6 overflow-hidden rounded-[32px] ${className}`}>
      <div className="pointer-events-none absolute -top-24 left-0 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[160px]" />
      <div className="pointer-events-none absolute -bottom-10 right-10 h-64 w-64 rounded-full bg-cyan-500/25 blur-[140px]" />
      <div className="relative space-y-6">
        <div className="glass relative overflow-hidden rounded-2xl border border-white/10 p-relaxed space-y-6">
          <div className="pointer-events-none absolute -top-10 -right-6 h-32 w-32 rounded-full bg-cyan-500/30 blur-[120px]" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-white">Storage Allocation Lab</h3>
                <p className="text-sm text-neutral-400">Simulate contiguous memory allocation step by step.</p>
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Allocation algorithms</p>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {Object.entries(algorithmMeta).map(([key, meta]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAlgorithmChange(key)}
                disabled={playing}
                className={`rounded-2xl px-4 py-3 text-left transition-all border bg-slate-900/40 border-white/10 ${algorithm === key ? 'shadow-lg shadow-cyan-500/40 border-cyan-500/40' : 'hover:border-white/30'}`}
              >
                <div className="text-sm font-semibold text-white">{meta.label}</div>
                <p className="text-xs text-neutral-400 mt-1">{meta.description}</p>
              </motion.button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-slate-900/60 p-4 space-y-1 shadow-[0_15px_60px_rgba(14,165,233,0.25)]">
              <div className="text-xs uppercase tracking-[0.4em] text-neutral-300">Utilization</div>
              <div className="text-2xl font-semibold text-white">{utilization}%</div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{ width: `${utilization}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/40 to-slate-900/80 p-4 space-y-2 shadow-[0_15px_60px_rgba(168,85,247,0.25)]">
              <div className="text-xs uppercase tracking-[0.4em] text-neutral-300">Active algorithm</div>
              <div className="text-xl font-semibold text-white">{algorithmMeta[algorithm].label}</div>
              <p className="text-xs text-neutral-300">{algorithmMeta[algorithm].description}</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass rounded-2xl border border-white/10 px-5 py-5 space-y-3 bg-gradient-to-br from-slate-900/60 to-slate-900/30">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-neutral-400">
              <span>Pre-existing holes</span>
              <span className="text-xs text-neutral-400">Fixed inventory</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {holeSizes.map((size, idx) => (
                <span
                  key={`${size}-${idx}`}
                  className="px-3 py-1 rounded-full bg-white/10 text-[13px] font-semibold text-white border border-white/20"
                >
                  {size} units
                </span>
              ))}
            </div>
            <p className="text-xs text-neutral-400">Total contiguous capacity: {totalHoleSpace} units</p>
          </div>
          <div className="glass rounded-2xl border border-white/10 px-5 py-4 space-y-3 bg-gradient-to-br from-slate-900/60 to-slate-900/30">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Current request</span>
              <span className="text-emerald-400 font-semibold">{snapshot?.done ? 'Completed' : currentRequest?.pid ?? 'Pending'}</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {currentRequest ? `${currentRequest.size} units` : '—'}
            </div>
            <p className="text-xs text-neutral-400">Next process waiting for memory.</p>
          </div>
        </div>

        <MemoryRequestEditor
          requests={requests}
          onUpdate={updateRequest}
          onAdd={addRequest}
          onRemove={removeRequest}
          disabled={playing}
        />

        <div className="glass rounded-2xl border border-white/10 px-5 py-5 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatusChip label="Allocated" value={`${metrics.allocated} units`} hint="Total consumed" />
            <StatusChip label="Free" value={`${metrics.free} units`} hint="Available space" />
            <StatusChip label="Internal Frag" value={`${metrics.internalFragmentation} units`} hint="Padding overhead" />
            <StatusChip label="External Frag" value={`${metrics.externalFragmentation} units`} hint="Fragmented holes" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-neutral-400">
              <span>Memory Map</span>
              <span>Largest hole: {metrics.largestHole} units</span>
            </div>
            <div className="mt-3 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-1">
              <div className="h-12 rounded-3xl bg-slate-900/70 overflow-hidden flex text-[10px]">
                {visualSegments.map((segment, idx) => {
                  const owner = segment.free ? 'Free' : segment.processId ?? 'Allocated';
                  return (
                    <div
                      key={`${segment.start}-${idx}`}
                      style={{ width: `${(segment.size / totalHoleSpace) * 100}%` }}
                      className={`flex items-center justify-center text-[10px] font-semibold ${segment.free ? 'bg-slate-900/60 text-neutral-400' : 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white'} ${idx === 0 ? 'rounded-l-3xl' : ''} ${idx === visualSegments.length - 1 ? 'rounded-r-3xl' : ''}`}
                      title={`${owner} → ${segment.size} units`}
                    >
                      <span className="px-1">
                        {segment.free ? `Free (${segment.size})` : `${owner} (${segment.size})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 px-5 py-5 space-y-4">
          <div className="flex flex-wrap gap-4">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={step}
              disabled={snapshot?.done}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-3 disabled:opacity-60"
            >
              <SkipForward className="w-4 h-4" />
              Step
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={playing ? pause : play}
              disabled={snapshot?.done}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 rounded-2xl font-semibold px-4 py-3 disabled:opacity-70 ${playing ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? 'Pause' : 'Auto play'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={runToEnd}
              disabled={snapshot?.done}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-3 disabled:opacity-60"
            >
              <FastForward className="w-4 h-4" />
              Run to end
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={reset}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 rounded-2xl bg-neutral-700 hover:bg-neutral-600 text-white font-semibold px-4 py-3"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </motion.button>
          </div>
          <div className="text-xs text-neutral-400 flex items-center gap-3">
            <Zap className="w-4 h-4 text-blue-300" />
            Playback speed: <strong>{speed}ms per step</strong>
          </div>
          <input
            type="range"
            min="250"
            max="1200"
            step="50"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="accent-blue-500"
          />
        </div>

        <div className="glass rounded-2xl border border-white/10 px-5 py-5 space-y-3">
          <div className="flex items-center justify-between text-sm text-neutral-400">
            <span>Allocation log</span>
            <span className="text-xs text-slate-400">Latest entries</span>
          </div>
          <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-3">
            {snapshot?.logs?.length ? (
              [...snapshot.logs].reverse().slice(0, 5).map((entry, index) => (
                <div
                  key={`${entry.pid}-${index}`}
                  className="bg-gradient-to-br from-slate-900/80 to-slate-900/50 border border-white/5 rounded-2xl px-4 py-3 text-sm text-neutral-100 shadow-[0_10px_40px_rgba(15,118,110,0.35)]"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-widest text-neutral-400">
                    <span>{entry.pid}</span>
                    <span className={entry.type === 'FAILED' ? 'text-red-400' : 'text-emerald-400'}>
                      {entry.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-300">{entry.description}</p>
                </div>
              ))
            ) : (
              <div className="text-xs text-neutral-400">No allocation decisions yet.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MemorySimulator;
