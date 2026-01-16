import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  FastForward,
  RotateCcw,
  ListOrdered,
  Zap,
  Info,
} from 'lucide-react';
import ConceptCard from '../ConceptCard';
import { PagingEngine, PagingAlgorithms } from './PagingEngine';

const algorithmMeta = {
  [PagingAlgorithms.FIFO]: {
    label: 'FIFO',
    description: 'Evict the earliest loaded page when memory is full.',
  },
  [PagingAlgorithms.LRU]: {
    label: 'LRU',
    description: 'Evict the least recently used page using exact timestamps.',
  },
  [PagingAlgorithms.OPTIMAL]: {
    label: 'Optimal',
    description: 'Evict the page whose next reference is farthest away.',
  },
};

const PAGING_CONCEPTS = {
  [PagingAlgorithms.FIFO]: {
    title: 'FIFO Replacement',
    concept: 'Pages are evicted in the order they were loaded. When a fault occurs, the oldest resident page makes room for the new one.',
    pros: [
      'Ultra-simple queue-based implementation.',
      'Easy to predict and reason about for teaching contexts.',
      'Constant-time updates when a fault happens.',
    ],
    cons: [
      'Belady\'s anomaly can make adding frames actually increase faults.',
      'The oldest page might still be hot, so faults can spike.',
      'Ignores actual usage patterns after loading.',
    ],
    example: 'Evict the customer who has been waiting the longest, even if they just sat down.',
    realWorld: 'Legacy page managers and simple cache designs that favor predictability.',
    complexity: 'Time: O(1) per fault with a circular queue, Space: O(frames)',
    preemptive: false,
  },
  [PagingAlgorithms.LRU]: {
    title: 'Least Recently Used (LRU)',
    concept: 'Track the usage history and evict the page that has not been touched for the longest time, which assumes recent activity predicts future references.',
    pros: [
      'Captures temporal locality and adapts quickly to shifting workloads.',
      'No Belady\'s anomaly - faults never increase when more frames are added.',
      'Often nearly as good as optimal for real programs.',
    ],
    cons: [
      'Needs timestamps or counters, increasing tracking overhead.',
      'Updating access order on every reference can be expensive.',
      'Hardware support is ideal; software implementations can be slow.',
    ],
    example: 'Freeze the browser tabs you never interacted with; evict the tab that hasn\'t been clicked in the longest time.',
    realWorld: 'Modern caches and operating systems with reference bits or aging registers.',
    complexity: 'Time: O(1) with hardware counters, Space: O(frames)',
    preemptive: false,
  },
  [PagingAlgorithms.OPTIMAL]: {
    title: 'Optimal Replacement',
    concept: 'Evict the page whose next access is farthest in the future - perfect if you could see the future, making it a benchmark for other heuristics.',
    pros: [
      'Achieves the lowest possible page fault rate.',
      'Useful as a theoretical gold standard for other algorithms.',
      'Highlights workload patterns when used offline.',
    ],
    cons: [
      'Requires perfect knowledge of future references - impossible in real time.',
      'Used mainly in simulations and academic comparisons.',
      'Hard to approximate without extra prediction logic.',
    ],
    example: 'Packing groceries when you know exactly when each item will be used later.',
    realWorld: 'Offline simulations and research tools that evaluate replacement heuristics.',
    complexity: 'Time: O(n²) if you scan the future queue each time, Space: O(frames)',
    preemptive: false,
  },
};

const StatusChip = ({ label, value, hint }) => {
  const palette = {
    References: 'from-cyan-500/40 via-blue-500/10 to-slate-900/70',
    'Page Faults': 'from-rose-500/40 via-orange-500/10 to-slate-900/70',
    'Fault Rate': 'from-amber-500/40 via-amber-400/10 to-slate-900/70',
    Hits: 'from-emerald-500/40 via-cyan-500/10 to-slate-900/70',
  };
  const gradient = palette[label] ?? 'from-slate-900/60 to-slate-900/90';
  return (
    <div className={`bg-gradient-to-br ${gradient} border border-white/10 rounded-2xl px-4 py-3 text-sm shadow-[0_15px_45px_rgba(14,165,233,0.25)]`}>
      <div className="text-xs text-neutral-300 uppercase tracking-widest">{label}</div>
      <div className="text-xl font-semibold text-white">{value}</div>
      <p className="text-xs text-neutral-400 mt-1">{hint}</p>
    </div>
  );
};

const ProcessReferenceEditor = ({ processes, onUpdate, onAdd, onRemove, disabled }) => (
  <div className="glass rounded-2xl border border-white/10 overflow-hidden">
    <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
      <div>
        <h4 className="font-semibold text-white">Process Workload</h4>
        <p className="text-xs text-neutral-400">Define pages per process + reference string.</p>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAdd}
        disabled={disabled}
        className="px-4 py-2 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-semibold uppercase tracking-widest"
      >
        Add Process
      </motion.button>
    </div>
    <div className="px-6 py-5 space-y-4 max-h-[420px] overflow-y-auto custom-scrollbar">
      {processes.map((process, idx) => (
        <div
          key={`${process.pid}-${idx}`}
          className="flex flex-col gap-3 bg-slate-900/40 border border-white/5 rounded-2xl px-4 py-4"
        >
          <div className="flex flex-wrap gap-3 items-center">
            <div className="text-xs uppercase tracking-wide text-neutral-400">Process</div>
            <input
              type="text"
              value={process.pid}
              onChange={(e) => onUpdate(idx, 'pid', e.target.value.toUpperCase())}
              disabled={disabled}
              className="bg-transparent border border-white/10 rounded-full px-3 py-1 text-sm text-white w-24"
            />
            <div className="text-xs uppercase tracking-wide text-neutral-400">Pages</div>
            <input
              type="number"
              min="1"
              value={process.totalPages}
              onChange={(e) => onUpdate(idx, 'totalPages', Number(e.target.value) || 1)}
              disabled={disabled}
              className="bg-transparent border border-white/10 rounded-full px-3 py-1 text-sm text-white w-20"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onRemove(idx)}
              disabled={disabled || processes.length === 1}
              className="ml-auto text-xs uppercase tracking-widest text-red-400 disabled:text-red-600"
            >
              Remove
            </motion.button>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.4em] text-neutral-400">Reference string</div>
            <input
              type="text"
              value={process.referenceString}
              onChange={(e) => onUpdate(idx, 'referenceString', e.target.value)}
              placeholder="0,1,2,0"
              disabled={disabled}
              className="w-full bg-transparent border border-white/10 rounded-2xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <p className="text-[11px] text-neutral-400">Comma or space separated page numbers</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PagingSimulator = ({ className = '' }) => {
  const [processes, setProcesses] = useState([
    { pid: 'P1', totalPages: 4, referenceString: '0,1,2,3,0,1' },
    { pid: 'P2', totalPages: 3, referenceString: '0,2,1,0' },
    { pid: 'P3', totalPages: 5, referenceString: '1,4,2,3,1' },
  ]);
  const [algorithm, setAlgorithm] = useState(PagingAlgorithms.FIFO);
  const [frameCount, setFrameCount] = useState(6);
  const [speed, setSpeed] = useState(650);

  const [engine, setEngine] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [activeFrameInfo, setActiveFrameInfo] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [showConcept, setShowConcept] = useState(true);

  const timerRef = useRef(null);

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
    const fresh = new PagingEngine(processes, algorithm, { frameCount });
    setEngine(fresh);
    setSnapshot(fresh.getSnapshot());
    return fresh;
  }, [processes, algorithm, frameCount]);

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
  }, [processes, algorithm, frameCount, reset]);

  useEffect(() => {
    if (playing && engine && !engine.isDone()) {
      timerRef.current = setInterval(() => {
        const snap = engine.step();
        setSnapshot(snap);
          if (snap.done) {
          setPlaying(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
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

  useEffect(() => {
    setActiveFrameInfo(null);
  }, [snapshot?.currentIndex]);

  const addProcess = () => {
    setProcesses(prev => [...prev, {
      pid: `P${prev.length + 1}`,
      totalPages: 3,
      referenceString: '0,1,2',
    }]);
  };

  const updateProcess = (idx, field, value) => {
    setProcesses(prev => prev.map((process, index) => (
      index === idx
        ? { ...process, [field]: field === 'totalPages' ? Math.max(1, Number(value) || 1) : value }
        : process
    )));
  };

  const removeProcess = (idx) => {
    setProcesses(prev => (prev.length > 1 ? prev.filter((_, index) => index !== idx) : prev));
  };

  const currentReference = snapshot?.currentReference;
  const nextReference = snapshot?.nextReference;
  const referenceQueue = snapshot?.referenceQueue ?? [];
  const referencesProcessed = snapshot?.currentIndex ?? 0;
  const totalReferences = referenceQueue.length;
  const progressBase = totalReferences || 1;
  const referenceProgress = Math.min(100, Math.round((Math.min(referencesProcessed, progressBase) / progressBase) * 100));
  const referencesRemaining = Math.max(0, totalReferences - referencesProcessed);
  const referenceSummary = totalReferences ? `${referencesProcessed}/${totalReferences}` : '—';
  const metrics = snapshot?.metrics ?? {
    totalReferences: 0,
    pageFaults: 0,
    pageHits: 0,
    pageFaultRate: 0,
    framesUsed: 0,
    frameCount,
  };
  const frames = snapshot?.frames ?? [];
  const pageTables = snapshot?.pageTables ?? {};
  const pageTablesDisplay = Object.keys(pageTables).length
    ? pageTables
    : processes.reduce((acc, process) => {
      acc[process.pid] = Array.from({ length: process.totalPages }, () => null);
      return acc;
    }, {});
  const logs = snapshot?.logs ?? [];
  const activePagingConcept = PAGING_CONCEPTS[algorithm] ?? PAGING_CONCEPTS[PagingAlgorithms.FIFO];

  const getFrameExplanation = (frame) => {
    if (frame.isFree) {
      return 'This frame is currently unused.';
    }
    const matchingLoad = logs.find(log => log.message.includes(`Frame ${frame.frameId}`) && log.message.toLowerCase().includes('loaded'));
    if (matchingLoad) {
      return matchingLoad.message;
    }
    const eviction = logs.find(log => log.message.includes(`Frame ${frame.frameId}`));
    if (eviction) {
      return eviction.message;
    }
    return `Page ${frame.pageId} of ${frame.processId} occupies Frame ${frame.frameId}.`;
  };

  const getAlgorithmInsight = (frame) => {
    if (frame.isFree) return '';
    const descriptions = {
      [PagingAlgorithms.FIFO]: `FIFO fills frames in arrival order, so this frame holds the oldest loaded page. The next allocation will wrap to Frame ${(frame.frameId + 1) % frameCount}.`,
      [PagingAlgorithms.LRU]: `LRU just accessed this page, so it is safe from eviction until other frames show older timestamps. Keep an eye on the frame with the lowest timestamp when the next fault occurs.`,
      [PagingAlgorithms.OPTIMAL]: `Optimal kept this page because its next use is farther away than every other resident page, so it remains until an even more distant future reference is discovered.`,
    };
    return descriptions[algorithm] ?? '';
  };

  const toggleFrameInfo = (frameId) => {
    setActiveFrameInfo(prev => (prev === frameId ? null : frameId));
  };

  const nextReferences = referenceQueue.slice(referencesProcessed, referencesProcessed + 5);
  const frameUsagePercent = frameCount ? Math.min(100, Math.round((metrics.framesUsed / frameCount) * 100)) : 0;
  const displayFrames = frames.length
    ? frames
    : Array.from({ length: frameCount }, (_, idx) => ({
      frameId: idx,
      isFree: true,
      pageId: null,
      processId: null,
    }));

  return (
    <section className={`relative space-y-6 overflow-hidden rounded-[32px] ${className}`}>
      <div className="pointer-events-none absolute -top-24 left-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-[160px]" />
      <div className="pointer-events-none absolute -bottom-10 right-10 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-[140px]" />

      <div className="relative space-y-6">
        <ConceptCard
          algorithm={algorithm}
          concept={activePagingConcept}
          isVisible={showConcept}
          onToggle={() => setShowConcept(prev => !prev)}
        />
        <div className="glass relative overflow-hidden rounded-2xl border border-white/10 p-relaxed space-y-6">
          <div className="pointer-events-none absolute -top-10 -right-6 h-32 w-32 rounded-full bg-slate-900/50 blur-[120px]" />
          <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <ListOrdered className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-white">Paging Simulation Studio</h3>
            <p className="text-sm text-neutral-400">Replay FIFO, LRU, and Optimal replacement policies.</p>
          </div>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Non-contiguous memory</p>

        <div className="grid md:grid-cols-3 gap-3">
          {Object.entries(algorithmMeta).map(([key, meta]) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setAlgorithm(key)}
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
            <div className="text-xs uppercase tracking-[0.4em] text-neutral-300">Page references</div>
            <div className="text-2xl font-semibold text-white">{referenceSummary}</div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${referenceProgress}%` }} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/40 to-slate-900/80 p-4 space-y-2 shadow-[0_15px_60px_rgba(168,85,247,0.25)]">
            <div className="text-xs uppercase tracking-[0.4em] text-neutral-300">Frame usage</div>
            <div className="text-2xl font-semibold text-white">{metrics.framesUsed}/{frameCount} occupied</div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500" style={{ width: `${frameUsagePercent}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatusChip label="References" value={`${metrics.totalReferences}`} hint="Total steps run" />
          <StatusChip label="Page Faults" value={`${metrics.pageFaults}`} hint="Forced loads" />
          <StatusChip label="Fault Rate" value={`${metrics.pageFaultRate}%`} hint="Faults per reference" />
          <StatusChip label="Hits" value={`${metrics.pageHits}`} hint="Hits saved faults" />
        </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ProcessReferenceEditor
          processes={processes}
          onUpdate={updateProcess}
          onAdd={addProcess}
          onRemove={removeProcess}
          disabled={playing}
        />
        <div className="glass rounded-2xl border border-white/10 px-5 py-5 space-y-4 bg-gradient-to-br from-slate-900/60 to-slate-900/30">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-neutral-400">
            <span>Physical memory</span>
            <span className="text-xs text-neutral-400">{frameCount} frames</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-neutral-400 mb-2">
                <span>Frame count</span>
              </label>
              <input
                type="range"
                min="3"
                max="12"
                value={frameCount}
                onChange={(e) => setFrameCount(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[11px] uppercase tracking-[0.4em] text-neutral-500 mt-2">
                <span>Compressed</span>
                <span>Spacious</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Current reference</span>
                <span className="text-emerald-400 font-semibold">{snapshot?.done ? 'Completed' : currentReference?.pid ?? 'Pending'}</span>
              </div>
              <div className="text-2xl font-semibold text-white">
                {currentReference ? `${currentReference.pid} → Page ${currentReference.page}` : '—'}
              </div>
              <p className="text-xs text-neutral-400">Next: {nextReference ? `${nextReference.pid} → Page ${nextReference.page}` : '—'}</p>
              <div className="text-[11px] text-neutral-400">References remaining: {referencesRemaining}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-2xl border border-white/10 px-5 py-5 space-y-4 bg-gradient-to-br from-slate-900/70 to-slate-900/30">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-neutral-400">
            <span>Page tables</span>
            <span className="text-xs text-neutral-400">Live mappings</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {Object.entries(pageTablesDisplay).map(([pid, table]) => (
              <div
                key={pid}
                className="rounded-2xl border border-white/5 bg-slate-900/60 p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-sm font-semibold text-white">
                  <span>{pid}</span>
                  <span className="text-xs text-neutral-400">Pages {table.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {table.map((frameId, pageIndex) => (
                    <span
                      key={`${pid}-${pageIndex}`}
                      className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-200"
                      title={`Page ${pageIndex}`}
                    >
                      Pg{pageIndex}: {frameId !== null ? `F${frameId}` : 'Invalid'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl border border-white/10 px-5 py-5 space-y-4 bg-gradient-to-br from-slate-900/70 to-slate-900/30">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-neutral-400">
            <span>Reference queue</span>
            <span className="text-xs text-neutral-400">Upcoming</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextReferences.map((reference, idx) => (
              <span
                key={`${reference.pid}-${reference.page}-${idx}`}
                className="px-3 py-2 rounded-2xl bg-slate-900/50 border border-white/10 text-xs text-white"
              >
                {reference.pid} → Pg {reference.page}
              </span>
            ))}
            {!nextReferences.length && (
              <span className="px-3 py-2 rounded-2xl bg-slate-900/30 border border-white/10 text-xs text-neutral-400">Queue empty</span>
            )}
          </div>
          <div className="text-[11px] text-neutral-400">References remaining: {referencesRemaining}</div>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/10 px-5 py-5 space-y-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-neutral-400">
          <span>Physical frames</span>
          <span className="text-xs text-neutral-400">Live view</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {displayFrames.map(frame => (
            <div
              key={frame.frameId}
              className={`relative rounded-2xl border border-white/10 p-3 text-sm text-white ${frame.isFree ? 'bg-slate-900/40' : 'bg-gradient-to-br from-indigo-500 to-cyan-500'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.4em] text-white/60">Frame {frame.frameId}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFrameInfo(frame.frameId);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  aria-label={`Explain frame ${frame.frameId}`}
                >
                  <Info className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="font-semibold text-lg mt-2">
                {frame.isFree ? 'Free' : `${frame.processId}: Pg ${frame.pageId}`}
              </div>
              {!frame.isFree && <div className="text-[11px] text-white/70">Occupied</div>}
              {activeFrameInfo === frame.frameId && !frame.isFree && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-1/2 top-full z-20 -translate-x-1/2 w-72 rounded-2xl border border-white/20 bg-slate-900/90 px-3 py-3 text-xs text-neutral-200 shadow-[0_20px_40px_-30px_rgba(0,0,0,0.8)]"
                >
                  <p className="font-semibold text-white text-sm">{getFrameExplanation(frame)}</p>
                  <p className="text-[11px] text-cyan-200 mt-2">{getAlgorithmInsight(frame)}</p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass rounded-2xl border border-white/10 px-5 py-5 space-y-3 bg-gradient-to-br from-slate-900/60 to-slate-900/30">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-neutral-400">
            <span>Event log</span>
            <span className="text-xs text-neutral-400">Latest actions</span>
          </div>
          <ul className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {logs.map((event, idx) => (
              <li
                key={`${event.message}-${idx}`}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/50 px-3 py-3"
              >
                <Zap className="w-4 h-4 text-amber-300 mt-1" />
                <div>
                  <p className="text-sm text-white">{event.message}</p>
                  <p className="text-[11px] text-neutral-500">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                </div>
              </li>
            ))}
            {!logs.length && <li className="text-xs text-neutral-400">No activity yet.</li>}
          </ul>
        </div>
        <div className="glass rounded-2xl border border-white/10 px-5 py-5 space-y-4 bg-gradient-to-br from-slate-900/60 to-slate-900/30">
          <div className="text-xs uppercase tracking-[0.3em] text-neutral-400">Playback</div>
          <div className="flex flex-wrap gap-3">
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
          <div>
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-neutral-400 mb-2">
              Playback speed
            </label>
            <input
              type="range"
              min="150"
              max="1500"
              step="50"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PagingSimulator;