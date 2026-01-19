import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  FastForward,
  RotateCcw,
  Zap,
  Database,
  ShieldCheck,
  ListOrdered,
  Info,
} from 'lucide-react';
import ConceptCard from '../ConceptCard';
import { CacheEngine, CacheAlgorithms } from './CacheEngine';
import { ConceptCards } from '../SchedulerEngine';

const StatusChip = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white shadow-[0_10px_40px_rgba(13,110,253,0.25)]">
    <div className="text-xs text-slate-400 uppercase tracking-[0.3em] mb-1">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
    {hint && <p className="text-xs text-slate-400 mt-2">{hint}</p>}
  </div>
);

const CacheAccessEditor = ({ sequence, onSequenceChange, cacheSize, onCacheSizeChange, disabled }) => (
  <div className="glass rounded-2xl border border-white/10 p-5 space-y-3 bg-gradient-to-br from-slate-900/80 to-slate-900/60">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-white font-semibold">Access Sequence</h4>
        <p className="text-xs text-slate-400">Comma or space separated identifiers</p>
      </div>
      <span className="text-xs uppercase tracking-[0.4em] text-emerald-400">Live</span>
    </div>
    <textarea
      value={sequence}
      onChange={(event) => onSequenceChange(event.target.value)}
      disabled={disabled}
      rows={3}
      className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
      placeholder="A B C A D B C E"
    />
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <label className="flex items-center gap-2">
        Cache Slots:
        <input
          type="number"
          min="2"
          max="10"
          value={cacheSize}
          onChange={(event) => onCacheSizeChange(Number(event.target.value))}
          disabled={disabled}
          className="w-20 bg-transparent border border-white/10 rounded-2xl px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </label>
      <span className="text-xs text-slate-500">Smaller caches spotlight misses</span>
    </div>
  </div>
);

const CacheSlotTile = ({ slot, index }) => {
  const status = slot.isValid ? 'Loaded' : 'Empty';
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Slot {index + 1}</span>
        <span className="text-[10px] uppercase tracking-[0.3em]">
          {status}
        </span>
      </div>
      <div className="text-lg font-semibold text-white">
        {slot.isValid ? slot.dataId : '—'}
      </div>
      <div className="text-xs text-slate-500 flex justify-between">
        <span>Arr: {slot.arrivalTime ?? '—'}</span>
        <span>Last: {slot.lastAccessTime ?? '—'}</span>
      </div>
    </div>
  );
};

const LogEntry = ({ entry }) => {
  const accent = {
    hit: 'text-emerald-300',
    miss: 'text-amber-300',
    load: 'text-cyan-300',
    evict: 'text-rose-300',
    info: 'text-slate-300',
  }[entry.type] ?? 'text-slate-300';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
      <p className={`font-semibold ${accent}`}>{entry.message}</p>
      <p className="text-[10px] text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</p>
    </div>
  );
};

const CacheSimulator = ({ className = '' }) => {
  const [sequence, setSequence] = useState('A B C A D B C E');
  const [cacheSize, setCacheSize] = useState(4);
  const [algorithm, setAlgorithm] = useState(CacheAlgorithms.FIFO);
  const [speed, setSpeed] = useState(650);
  const [engine, setEngine] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [showConcept, setShowConcept] = useState(true);

  const timerRef = useRef(null);

  const handleCacheSizeChange = useCallback((value) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setCacheSize(Math.max(2, Math.min(10, parsed)));
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setEngine(null);
    setSnapshot(null);
  }, []);

  const initEngine = useCallback(() => {
    const fresh = new CacheEngine(sequence, { cacheSize, algorithm });
    setEngine(fresh);
    const snap = fresh.getSnapshot();
    setSnapshot(snap);
    return fresh;
  }, [sequence, cacheSize, algorithm]);

  const step = useCallback(() => {
    let current = engine;
    if (!current) {
      current = initEngine();
    }
    const snap = current.step();
    setEngine(current);
    setSnapshot(snap);
    if (snap.done) {
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
    setPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    let current = engine;
    if (!current) {
      current = initEngine();
    }
    current.runToEnd();
    setEngine(current);
    setSnapshot(current.getSnapshot());
  }, [engine, initEngine]);

  useEffect(() => {
    reset();
  }, [sequence, cacheSize, algorithm, reset]);

  useEffect(() => {
    if (playing && engine && !engine.isDone()) {
      timerRef.current = setInterval(() => {
        const snap = engine.step();
        setSnapshot(snap);
        if (snap.done && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setPlaying(false);
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

  const metrics = snapshot?.metrics ?? {
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    processed: 0,
    totalAccesses: sequence ? sequence.split(/[,\s]+/).filter(Boolean).length : 0,
  };

  const activeConcept = ConceptCards[algorithm];
  const occupiedSlots = snapshot?.slots?.filter((slot) => slot.isValid).length ?? 0;
  const progress = metrics.totalAccesses
    ? Math.min(100, Math.round((metrics.processed / metrics.totalAccesses) * 100))
    : 0;
  const nextAccess = snapshot?.nextAccess ?? '—';
  const logs = snapshot?.logs ?? [];

  return (
    <section className={`relative space-y-6 overflow-hidden rounded-[32px] ${className}`}>
      <div className="pointer-events-none absolute -top-24 left-0 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[160px]" />
      <div className="pointer-events-none absolute -bottom-10 right-10 h-64 w-64 rounded-full bg-cyan-500/25 blur-[140px]" />

      <div className="relative space-y-6">
        <ConceptCard 
          algorithm={algorithm}
          concept={activeConcept}
          isVisible={showConcept}
          onToggle={() => setShowConcept((prev) => !prev)}
        />

        <div className="glass rounded-3xl border border-white/10 bg-slate-900/60 p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Cache Lab</p>
                <h2 className="text-3xl font-semibold text-white">Cache Memory Explorer</h2>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Feed a reference string, choose FIFO or LRU, and watch the slot map react in real time.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
            <CacheAccessEditor
              sequence={sequence}
              onSequenceChange={setSequence}
              cacheSize={cacheSize}
              onCacheSizeChange={handleCacheSizeChange}
              disabled={playing}
            />

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatusChip label="Cache Hits" value={metrics.hitCount} hint="Successful reads" />
                <StatusChip label="Cache Misses" value={metrics.missCount} hint="Loads required" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <StatusChip label="Hit Rate" value={`${metrics.hitRate}%`} hint="Lower is learning time" />
                <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">
                    <span>Next Access</span>
                    <span>{metrics.processed}/{metrics.totalAccesses}</span>
                  </div>
                  <div className="text-lg font-semibold text-white">{nextAccess}</div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Processed {metrics.processed} of {metrics.totalAccesses || '—'} references</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-3 text-sm text-slate-300">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Architecture</p>
                <div className="flex items-center justify-between">
                  <span>Slots Used</span>
                  <span>{occupiedSlots}/{cacheSize}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Evicted Last</span>
                  <span className="text-amber-300">{snapshot?.evictedData ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[CacheAlgorithms.FIFO, CacheAlgorithms.LRU].map((algo) => (
              <motion.button
                key={algo}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAlgorithm(algo)}
                disabled={playing}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all border ${
                  algorithm === algo
                    ? 'bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 text-white border-transparent shadow-[0_20px_45px_rgba(123,66,255,0.5)]'
                    : 'bg-slate-900/40 text-slate-200 border-white/10 hover:border-white/30'
                }`}
              >
                {algo}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="glass rounded-3xl border border-white/10 bg-slate-900/70 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Cache Contents</p>
                <h3 className="text-lg font-semibold text-white">Slot Map</h3>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(snapshot?.slots ?? Array.from({ length: cacheSize })).map((slot, index) => (
                <CacheSlotTile key={index} slot={slot ?? { isValid: false, dataId: null }} index={index} />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Arrival/Last timestamps are simulation steps. Watch FIFO always bump the oldest slot when you miss.
            </p>
          </div>

          <div className="glass rounded-3xl border border-white/10 bg-slate-900/70 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ListOrdered className="w-5 h-5 text-emerald-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Access Log</p>
                <h3 className="text-lg font-semibold text-white">Hit / Miss Trace</h3>
              </div>
            </div>
            <div className="space-y-3 max-h-[340px] overflow-y-auto">
              {logs.length ? (
                logs.map((entry, idx) => (
                  <LogEntry key={`${entry.message}-${idx}`} entry={entry} />
                ))
              ) : (
                <div className="text-xs text-slate-500">Run the simulation to populate the log.</div>
              )}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <Info className="w-3 h-3" />
              Each line shows chronological events with time stamps.
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl border border-white/10 bg-slate-900/50 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={step}
              disabled={snapshot?.done}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-3"
            >
              <SkipForward className="w-4 h-4" />
              Step
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={playing ? pause : play}
              disabled={snapshot?.done}
              className={`flex items-center justify-center gap-2 rounded-2xl font-semibold px-4 py-3 ${playing ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? 'Pause' : 'Auto Play'}
            </motion.button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={runToEnd}
              disabled={snapshot?.done}
              className="flex items-center justify-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-3"
            >
              <FastForward className="w-4 h-4" />
              Run to End
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-3"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </motion.button>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-300" />
            Playback speed: <strong>{speed}ms per step</strong>
          </div>
          <input
            type="range"
            min="250"
            max="1200"
            step="50"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="accent-blue-500 w-full"
          />
        </div>
      </div>
    </section>
  );
};

export default CacheSimulator;
