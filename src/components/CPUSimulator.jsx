import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, SkipForward, FastForward,
  Cpu, Clock, ListOrdered, CheckCircle2, 
  Settings, Gauge, Timer, Zap, TrendingUp,
  GraduationCap, Sparkles
} from 'lucide-react';

// Import components
import ConceptCard from './ConceptCard';
import ProcessInput from './ProcessInput';
import MetricsExplainer from './MetricsExplainer';
import TraceViewer from './TraceViewer';
import GanttChart from './GanttChart';
import MemorySimulator from './memory/MemorySimulator';
import PagingSimulator from './memory/PagingSimulator';
import SystemMetricsPanel from './SystemMetricsPanel';

// Import engine
import { 
  SchedulerEngine, 
  Algorithm, 
  ProcessState, 
  ConceptCards,
  getPidColor 
} from './SchedulerEngine';

/**
 * CPUSimulator - Main Component
 * Interactive educational CPU scheduling simulator
 * Features real-time visualization with Framer Motion animations
 */
const CPUSimulator = () => {
  // ===== STATE =====
  const [processes, setProcesses] = useState([
    { pid: 'P1', arrivalTime: 0, burstTime: 8, priority: 2 },
    { pid: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
    { pid: 'P3', arrivalTime: 2, burstTime: 2, priority: 3 },
  ]);
  const [algorithm, setAlgorithm] = useState(Algorithm.FCFS);
  const [quantum, setQuantum] = useState(2);
  const [speed, setSpeed] = useState(500);
  
  const [engine, setEngine] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [results, setResults] = useState(null);
  
  const [playing, setPlaying] = useState(false);
  const [showConcept, setShowConcept] = useState(true);
  const [showMetricsHelp, setShowMetricsHelp] = useState(false);
  const [activePage, setActivePage] = useState('scheduling');
  
  const timerRef = useRef(null);

  // ===== ENGINE FUNCTIONS =====
  const initEngine = useCallback(() => {
    const newEngine = new SchedulerEngine(processes, algorithm, { quantum });
    setEngine(newEngine);
    setSnapshot(newEngine.getSnapshot());
    setResults(null);
    return newEngine;
  }, [processes, algorithm, quantum]);

  const step = useCallback(() => {
    let eng = engine;
    if (!eng) {
      eng = initEngine();
      setEngine(eng);
    }
    if (eng.isDone()) return;
    
    const snap = eng.step();
    setSnapshot(snap);
    
    if (snap.done) {
      const final = eng.finalizeMetrics();
      setResults(final);
      setPlaying(false);
    }
  }, [engine, initEngine]);

  const play = useCallback(() => {
    let eng = engine;
    if (!eng) {
      eng = initEngine();
      setEngine(eng);
    }
    if (playing || eng.isDone()) return;
    
    setPlaying(true);
  }, [engine, playing, initEngine]);

  const pause = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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

  const runToEnd = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    let eng = engine;
    if (!eng) {
      eng = initEngine();
      setEngine(eng);
    }
    
    const final = eng.runToEnd();
    setSnapshot(eng.getSnapshot());
    setResults(final);
  }, [engine, initEngine]);

  // ===== EFFECTS =====
  // Handle auto-play
  useEffect(() => {
    if (playing && engine && !engine.isDone()) {
      timerRef.current = setInterval(() => {
        const snap = engine.step();
        setSnapshot(snap);
        
        if (snap.done) {
          setPlaying(false);
          const final = engine.finalizeMetrics();
          setResults(final);
          clearInterval(timerRef.current);
        }
      }, speed);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [playing, engine, speed]);

  // ===== PROCESS HANDLERS =====
  const addProcess = () => {
    const newPid = `P${processes.length + 1}`;
    setProcesses([...processes, { pid: newPid, arrivalTime: 0, burstTime: 1, priority: 1 }]);
  };

  const updateProcess = (idx, field, value) => {
    const updated = [...processes];
    updated[idx][field] = field === 'pid' ? value : Number(value) || 0;
    setProcesses(updated);
  };

  const removeProcess = (idx) => {
    if (processes.length > 1) {
      setProcesses(processes.filter((_, i) => i !== idx));
    }
  };

  const handleAlgoChange = (algo) => {
    reset();
    setAlgorithm(algo);
  };

  // ===== ALGORITHM INFO =====
  const algorithmDescriptions = {
    [Algorithm.FCFS]: 'First process to arrive runs first',
    [Algorithm.SJF]: 'Shortest burst time runs first',
    [Algorithm.SRTF]: 'Shortest remaining time (preemptive)',
    [Algorithm.PRIORITY]: 'Highest priority (lowest #) first',
    [Algorithm.RR]: 'Time slices for all processes',
  };

  // Check if simulation is running
  const isRunning = engine !== null;
  const isDone = snapshot?.done || false;

  const pageOptions = [
    { id: 'scheduling', label: 'Scheduling' },
    { id: 'storage', label: 'Storage Allocation' },
    { id: 'paging', label: 'Paging Explorer' },
    { id: 'metrics', label: 'Dynamic CPU Metrics' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070b16] via-[#0b1024] to-[#0c132e] text-white">
      {/* ===== HEADER ===== */}
        <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <motion.div 
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20"
                >
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                    OS Visualization Dashboard
                  </h1>
                  <p className="text-neutral-400 text-xs sm:text-sm mt-1">
                    Learn OS internals through interactive visualization
                  </p>
                </div>
              </div>
              <nav className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-neutral-300">
                {pageOptions.map(page => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setActivePage(page.id)}
                    className={`px-3 py-2 rounded-full transition-all text-white ${
                      activePage === page.id
                        ? 'bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 shadow-[0_10px_40px_-10px_rgba(123,66,255,0.7)]'
                        : 'bg-white/10 hover:bg-white/20 text-white/70'
                    }`}
                  >
                    {page.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {activePage === 'scheduling' && (
            <motion.div
              key="scheduling"
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <ConceptCard 
                algorithm={algorithm}
                isVisible={showConcept}
                onToggle={() => setShowConcept(!showConcept)}
              />

              <div className="glass rounded-2xl border border-white/10 p-relaxed space-y-5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Choose an Algorithm to Study
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {Object.values(Algorithm).map(algo => (
                    <motion.button
                      key={algo}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAlgoChange(algo)}
                      disabled={isRunning}
                      className={`p-3 sm:p-4 rounded-2xl font-medium text-sm transition-all relative overflow-hidden ${
                        algorithm === algo
                          ? 'bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 text-white shadow-[0_20px_40px_-20px_rgba(123,66,255,0.9)]'
                          : 'bg-slate-900/70 hover:bg-slate-800/70 text-slate-200 disabled:opacity-50 border border-white/10'
                      }`}
                    >
                      {algorithm === algo && (
                        <motion.div
                          layoutId="algorithmHighlight"
                          className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 -z-10"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <div className="font-bold">{algo}</div>
                      <div className="text-[11px] opacity-75 mt-1 hidden sm:block">
                        {algorithmDescriptions[algo]}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                  <div className="glass rounded-2xl overflow-hidden border border-white/10">
                    <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Simulation Settings</h3>
                        <p className="text-xs text-neutral-400">Control quantum + speed</p>
                      </div>
                    </div>
                    <div className="p-relaxed space-y-6">
                      <div>
                        <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-neutral-400 mb-2">
                          <Timer className="w-4 h-4 text-amber-400" />
                          Time Quantum
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={quantum}
                          onChange={(e) => { setQuantum(Number(e.target.value) || 1); reset(); }}
                          disabled={isRunning}
                          className="w-full bg-transparent border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-neutral-400 mt-2">Used only by Round Robin</p>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-neutral-400 mb-2">
                          <Gauge className="w-4 h-4 text-cyan-400" />
                          Playback Speed
                        </label>
                        <input
                          type="range"
                          min="100"
                          max="2000"
                          step="100"
                          value={speed}
                          onChange={(e) => setSpeed(Number(e.target.value))}
                          className="w-full accent-cyan-400"
                        />
                        <div className="flex justify-between text-[11px] uppercase tracking-[0.4em] text-neutral-500 mt-2">
                          <span>Fast</span>
                          <span>Slow</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-2xl overflow-hidden border border-white/10">
                    <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Execution Controls</h3>
                        <p className="text-xs text-neutral-400">Step through execution</p>
                      </div>
                    </div>
                    <div className="p-relaxed space-y-5">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={step}
                        disabled={isDone}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-3"
                      >
                        <SkipForward className="w-4 h-4" />
                        Step
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={playing ? pause : play}
                        disabled={isDone}
                        className={`w-full flex items-center justify-center gap-2 rounded-2xl font-semibold px-4 py-3 ${playing ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                      >
                        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {playing ? 'Pause' : 'Auto Play'}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={runToEnd}
                        disabled={isDone}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-3"
                      >
                        <FastForward className="w-4 h-4" />
                        Run to End
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={reset}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-3"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </motion.button>
                    </div>
                  </div>

                  <ProcessInput
                    processes={processes}
                    onUpdate={updateProcess}
                    onAdd={addProcess}
                    onRemove={removeProcess}
                    disabled={isRunning}
                  />
                </div>

                <div className="lg:col-span-8 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatusCard icon={Clock} label="Simulated Time" value={snapshot?.time ?? 0} color="blue" />
                    <StatusCard icon={Cpu} label="Running" value={snapshot?.running?.pid ?? '—'} valueColor={snapshot?.running ? getPidColor(snapshot.running.pid) : undefined} color="emerald" />
                    <StatusCard icon={ListOrdered} label="Ready Queue" value={snapshot?.ready?.length ?? 0} color="amber" />
                    <StatusCard icon={CheckCircle2} label="Completed" value={`${snapshot?.processes?.filter(p => p.state === ProcessState.TERMINATED).length ?? 0}/${processes.length}`} color="purple" />
                  </div>

                  {snapshot && (
                    <RunningProcessDetail running={snapshot.running} processes={snapshot.processes} />
                  )}

                  {snapshot && (
                    <ReadyQueue ready={snapshot.ready} algorithm={algorithm} />
                  )}

                  {snapshot && (
                    <ProcessStates processes={snapshot.processes} />
                  )}

                  {snapshot && (
                    <div className="grid lg:grid-cols-2 gap-6">
                      <GanttChart gantt={snapshot.gantt || []} currentTime={snapshot.time} />
                      <TraceViewer trace={snapshot.trace} />
                    </div>
                  )}

                  {results && (
                    <div className="space-y-4">
                      <MetricsExplainer isVisible={showMetricsHelp} onToggle={() => setShowMetricsHelp(!showMetricsHelp)} />
                      <ResultsTable results={results} />
                      <LearningInsights results={results} algorithm={algorithm} quantum={quantum} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activePage === 'storage' && (
            <motion.div
              key="storage"
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="glass relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-5 shadow-[0_25px_40px_-20px_rgba(15,118,110,0.8)]">
                <div className="pointer-events-none absolute -top-10 right-6 h-28 w-28 rounded-full bg-pink-500/30 blur-[120px]" />
                <div className="flex flex-col gap-3">
                  <p className="text-xs uppercase tracking-[0.4em] text-amber-300">Storage Lab</p>
                  <h2 className="text-3xl font-semibold text-white">
                    Contiguous Allocation Studio
                  </h2>
                  <p className="text-sm text-neutral-400">
                    Explore how first fit, best fit, and worst fit carve up memory inside a bold, neon-inspired laboratory.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white">Live</div>
                    <div className="flex items-center gap-1 text-sm text-neutral-300">
                      <Zap className="w-4 h-4 text-cyan-300" />
                      Real-time hole tracking
                    </div>
                  </div>
                </div>
              </div>
              <MemorySimulator className="pt-2" />
            </motion.div>
          )}

          {activePage === 'paging' && (
            <motion.div
              key="paging"
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="glass relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-5 shadow-[0_25px_40px_-20px_rgba(99,102,241,0.8)]">
                <div className="pointer-events-none absolute -top-10 right-6 h-28 w-28 rounded-full bg-cyan-500/20 blur-[120px]" />
                <div className="flex flex-col gap-3">
                  <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">Paging Lab</p>
                  <h2 className="text-3xl font-semibold text-white">
                    Replacement Policy Studio
                  </h2>
                  <p className="text-sm text-neutral-400">
                    Visualize FIFO, LRU, and Optimal page replacement across fixed-size frames while tracking faults and hits.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white">Live</div>
                    <div className="flex items-center gap-1 text-sm text-neutral-300">
                      <ListOrdered className="w-4 h-4 text-indigo-300" />
                      Frame-by-frame insight
                    </div>
                  </div>
                </div>
              </div>
              <PagingSimulator className="pt-2" />
            </motion.div>
          )}

          {activePage === 'metrics' && (
            <motion.div
              key="metrics"
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="glass relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-5 shadow-[0_25px_40px_-20px_rgba(56,189,248,0.5)]">
                <div className="pointer-events-none absolute -top-10 right-6 h-28 w-28 rounded-full bg-cyan-500/20 blur-[120px]" />
                <div className="flex flex-col gap-3">
                  <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Live Metrics</p>
                  <h2 className="text-3xl font-semibold text-white">
                    Dynamic CPU Overview
                  </h2>
                  <p className="text-sm text-neutral-400">
                    Pulls user-space OS metrics from the host so you can compare observed load with the scheduler simulations.
                  </p>
                </div>
              </div>
              <SystemMetricsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-slate-400 text-sm">
            🎓 Educational CPU Scheduling Simulator
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Learn FCFS, SJF, SRTF, Priority, and Round Robin through interactive visualization
          </p>
        </div>
      </footer>
    </div>
  );
};

// ===== SUB-COMPONENTS =====

const StatusCard = ({ icon: Icon, label, value, color, valueColor }) => {
  const colors = {
    blue: 'from-indigo-500 to-blue-500',
    emerald: 'from-emerald-500 to-teal-400',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-fuchsia-500 to-purple-500',
    cyber: 'from-cyan-400 to-sky-500',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div 
        className="text-2xl sm:text-3xl font-bold"
        style={{ color: valueColor || 'white' }}
      >
        {value}
      </div>
    </motion.div>
  );
};

const RunningProcessDetail = ({ running, processes }) => {
  const processData = running ? processes.find(p => p.pid === running.pid) : null;
  const progress = processData 
    ? ((processData.burstTime - running.remainingTime) / processData.burstTime) * 100 
    : 0;

  return (
    <motion.div 
      layout
      className="bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-cyan-900/30 border border-emerald-500/40 rounded-xl p-5 shadow-[0_20px_60px_-40px_rgba(0,255,200,0.4)]"
    >
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-emerald-300">
        <Cpu className="w-5 h-5" />
        Currently Executing
      </h3>
      <AnimatePresence mode="wait">
        {running ? (
          <motion.div
            key={running.pid}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ 
                    boxShadow: [
                      `0 0 0 0 ${getPidColor(running.pid)}40`,
                      `0 0 20px 5px ${getPidColor(running.pid)}40`,
                      `0 0 0 0 ${getPidColor(running.pid)}40`,
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
                  style={{ 
                    backgroundColor: `${getPidColor(running.pid)}30`,
                    color: getPidColor(running.pid),
                    border: `2px solid ${getPidColor(running.pid)}`
                  }}
                >
                  {running.pid}
                </motion.div>
                <div>
                  <p className="text-white font-semibold">
                    {running.remainingTime} time unit{running.remainingTime !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-sm text-slate-400">
                    {Math.round(progress)}% complete
                  </p>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-emerald-600/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
              />
            </div>
          </motion.div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-400 py-4 text-center"
          >
            CPU is IDLE - No process running. Waiting for next arrival...
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ReadyQueue = ({ ready, algorithm }) => {
  return (
    <div className="glass rounded-xl p-5 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-[#11182f]/60 border border-slate-700/70">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <ListOrdered className="w-5 h-5 text-blue-400" />
        Ready Queue
        <span className="text-xs text-slate-400 font-normal ml-2">
          ({algorithm === 'RR' || algorithm === 'FCFS' ? 'FIFO Order' : `Sorted by ${algorithm} policy`})
        </span>
      </h3>
      
      <AnimatePresence mode="popLayout">
        {ready.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-slate-400 text-sm p-4 bg-slate-900/50 rounded-lg border border-slate-600/50 text-center"
          >
            Queue is empty - all processes either running, completed, or not yet arrived
          </motion.div>
        ) : (
          <div className="space-y-2">
            {ready.map((p, i) => (
              <motion.div
                key={p.pid}
                layout
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ delay: i * 0.05 }}
                className="bg-slate-900/80 rounded-lg p-3 border border-slate-700/60 flex items-center justify-between shadow-[0_10px_30px_-20px_rgba(0,0,0,0.8)]"
                style={{ borderLeftColor: getPidColor(p.pid), borderLeftWidth: '4px' }}
              >
                <div className="flex items-center gap-3">
                  <span 
                    className="font-bold text-lg"
                    style={{ color: getPidColor(p.pid) }}
                  >
                    {p.pid}
                  </span>
                  <div className="text-xs text-slate-400 space-x-3">
                    <span>Remaining: <strong className="text-slate-300">{p.remainingTime}</strong></span>
                    <span>Burst: <strong className="text-slate-300">{p.burstTime}</strong></span>
                    {algorithm === 'PRIORITY' && (
                      <span>Priority: <strong className="text-amber-400">{p.priority}</strong></span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                  #{i + 1}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProcessStates = ({ processes }) => {
  const stateConfig = {
    [ProcessState.NEW]: { 
      color: 'from-slate-600 to-slate-700', 
      border: 'border-slate-500',
      text: 'Not yet arrived'
    },
    [ProcessState.READY]: { 
      color: 'from-blue-600/30 to-blue-700/30', 
      border: 'border-blue-500',
      text: 'Waiting in queue'
    },
    [ProcessState.RUNNING]: { 
      color: 'from-emerald-600/30 to-emerald-700/30', 
      border: 'border-emerald-500',
      text: 'Executing on CPU'
    },
    [ProcessState.TERMINATED]: { 
      color: 'from-purple-600/30 to-purple-700/30', 
      border: 'border-purple-500',
      text: 'Completed'
    },
  };

  return (
    <div className="glass rounded-xl p-5 bg-gradient-to-br from-[#0f172a]/80 via-[#111827]/70 to-[#1b1033]/60 border border-slate-700/70">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        Process State Diagram
      </h3>
      <p className="text-xs text-slate-400 mb-4">
        Track each process: NEW → READY → RUNNING → TERMINATED
      </p>
      
      <div className="space-y-2">
        <AnimatePresence>
          {processes.map((p) => {
            const config = stateConfig[p.state];
            return (
              <motion.div
                key={p.pid}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-gradient-to-r ${config.color} rounded-lg p-3 border ${config.border} flex items-center justify-between`}
              >
                <div className="flex items-center gap-3">
                  <span 
                    className="font-bold text-lg w-10"
                    style={{ color: getPidColor(p.pid) }}
                  >
                    {p.pid}
                  </span>
                  <div className="text-xs text-slate-300">
                    <span>AT: {p.arrivalTime}</span>
                    <span className="mx-2">|</span>
                    <span>BT: {p.burstTime}</span>
                    <span className="mx-2">|</span>
                    <span>Remaining: {p.remainingTime}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{p.state}</div>
                  <div className="text-xs text-slate-400">{config.text}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ResultsTable = ({ results }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-white">Final Results</h3>
        </div>
        
        {/* Average Metrics */}
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{results.averages.waiting}</div>
            <div className="text-xs text-slate-400">Avg. Waiting</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{results.averages.turnaround}</div>
            <div className="text-xs text-slate-400">Avg. Turnaround</div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50">
            <tr className="text-slate-400">
              <th className="px-4 py-3 text-left font-medium">Process</th>
              <th className="px-4 py-3 text-right font-medium">Arrival</th>
              <th className="px-4 py-3 text-right font-medium">Burst</th>
              <th className="px-4 py-3 text-right font-medium">Completion</th>
              <th className="px-4 py-3 text-right font-medium">Turnaround</th>
              <th className="px-4 py-3 text-right font-medium">Waiting</th>
            </tr>
          </thead>
          <tbody>
            {results.processes.map((p, i) => (
              <motion.tr 
                key={p.pid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-t border-slate-700/50 hover:bg-slate-700/20"
              >
                <td className="px-4 py-3">
                  <span 
                    className="font-bold"
                    style={{ color: getPidColor(p.pid) }}
                  >
                    {p.pid}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-300">{p.arrivalTime}</td>
                <td className="px-4 py-3 text-right text-slate-300">{p.burstTime}</td>
                <td className="px-4 py-3 text-right text-blue-400 font-semibold">{p.completionTime}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{p.turnaroundTime}</td>
                <td className="px-4 py-3 text-right text-amber-400 font-semibold">{p.waitingTime}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LearningInsights = ({ results, algorithm, quantum }) => {
  const insights = {
    [Algorithm.FCFS]: {
      color: 'amber',
      icon: '📌',
      title: 'FCFS Observation',
      insight: 'If a long process arrived first, all shorter processes had to wait. This is called the "Convoy Effect" - like being stuck behind a slow truck on a single-lane road!'
    },
    [Algorithm.SJF]: {
      color: 'emerald',
      icon: '📌',
      title: 'SJF Observation',
      insight: 'Shorter processes completed quickly, minimizing overall waiting time. However, if short jobs keep arriving, long jobs might wait indefinitely (starvation).'
    },
    [Algorithm.SRTF]: {
      color: 'blue',
      icon: '📌',
      title: 'SRTF Observation',
      insight: 'Preemption allowed shorter jobs to jump ahead. Notice the context switches in the Gantt chart - each switch has overhead in real systems!'
    },
    [Algorithm.PRIORITY]: {
      color: 'purple',
      icon: '📌',
      title: 'Priority Observation',
      insight: 'Higher priority (lower number) processes ran first. In real systems, we use "aging" to prevent low-priority tasks from starving forever.'
    },
    [Algorithm.RR]: {
      color: 'cyan',
      icon: '📌',
      title: 'Round Robin Observation',
      insight: `Each process got a fair share with quantum=${quantum}. More context switches than other algorithms, but better response time for all processes!`
    }
  };

  const info = insights[algorithm];
  const colorClasses = {
    amber: 'from-amber-900/30 to-amber-800/30 border-amber-500/30 text-amber-300',
    emerald: 'from-emerald-900/30 to-emerald-800/30 border-emerald-500/30 text-emerald-300',
    blue: 'from-blue-900/30 to-blue-800/30 border-blue-500/30 text-blue-300',
    purple: 'from-purple-900/30 to-purple-800/30 border-purple-500/30 text-purple-300',
    cyan: 'from-cyan-900/30 to-cyan-800/30 border-cyan-500/30 text-cyan-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${colorClasses[info.color]} border rounded-xl p-6`}
    >
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        💡 Learning Insights from This Simulation
      </h3>
      
      <div className="space-y-3 text-sm">
        <p className="text-slate-300">
          <strong>Average Waiting Time: {results.averages.waiting}</strong> — Each process waited this long on average before getting CPU time.
        </p>
        <p className="text-slate-300">
          <strong>Average Turnaround Time: {results.averages.turnaround}</strong> — From arrival to completion, this is the average total time.
        </p>
        <p className="text-slate-300">
          <strong>Total Simulation Time: {results.finalClock}</strong> — All processes completed at t={results.finalClock}.
        </p>
        
        <div className={`mt-4 p-4 rounded-lg bg-slate-900/50 ${colorClasses[info.color].split(' ').slice(-1)[0]}`}>
          <p>
            <strong>{info.icon} {info.title}:</strong> {info.insight}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default CPUSimulator;
