import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Activity, HardDrive, Clock3, Layers, Terminal } from 'lucide-react';
import { createPollingService } from '../utils/systemMetrics';

const formatBytes = (value) => {
  if (value == null) return '—';
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
};

const formatPercent = (value) => (value == null ? '—' : `${value.toFixed(1)}%`);

const FALLBACK_METRICS = {
  timestamp: Date.now(),
  cpu: {
    overall: 34.7,
    perCore: [
      { core: 0, load: 32.1, loadUser: 25.3, loadSystem: 6.8 },
      { core: 1, load: 35.2, loadUser: 27.1, loadSystem: 8.1 },
      { core: 2, load: 33.8, loadUser: 26.5, loadSystem: 7.3 },
      { core: 3, load: 37.5, loadUser: 28.7, loadSystem: 8.8 },
    ],
    frequencyMHz: 3200,
    brand: 'Sample CPU',
    physicalCores: 2,
    logicalCores: 4,
  },
  memory: {
    used: 6 * 1024 ** 3,
    free: 2 * 1024 ** 3,
    cached: 1 * 1024 ** 3,
    buffers: 512 * 1024 ** 2,
    swapUsed: 512 * 1024 ** 2,
    swapTotal: 1 * 1024 ** 3,
  },
  system: {
    uptime: 3600,
    activeProcesses: 18,
  },
  processes: {
    total: 18,
    running: 3,
    blocked: 0,
    sleeping: 15,
    list: [
      { pid: 101, name: 'Simulator', cpu: 12.4, memory: 180, state: 'running' },
      { pid: 202, name: 'Renderer', cpu: 8.2, memory: 115, state: 'sleeping' },
      { pid: 303, name: 'Watcher', cpu: 5.6, memory: 90, state: 'sleeping' },
    ],
  },
};

const createFallbackMetrics = () => ({
  ...FALLBACK_METRICS,
  timestamp: Date.now(),
});

const formatUptime = (seconds) => {
  if (!seconds) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs}h ${mins}m ${secs}s`;
};

const MetricBadge = ({ label, value, caption, icon: Icon }) => (
  <div className="glass rounded-2xl border border-white/10 px-4 py-3 space-y-1">
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-neutral-400">
      <Icon className="w-4 h-4 text-cyan-300" />
      {label}
    </div>
    <div className="text-2xl font-semibold text-white">{value}</div>
    <p className="text-xs text-neutral-400">{caption}</p>
  </div>
);

const SystemMetricsPanel = () => {
  const [metrics, setMetrics] = useState(createFallbackMetrics());
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(true);

  useEffect(() => {
    const handleError = (err) => {
      const message = typeof err === 'string' ? err : err?.message ?? 'Unable to fetch metrics';
      const requiresFallback = message.includes('System metrics unavailable');
      if (requiresFallback) {
        setMetrics(createFallbackMetrics());
        setIsFallback(true);
      }
      setError(message);
    };

    const service = createPollingService({
      intervalMs: 4000,
      onUpdate: (data) => {
        setMetrics(data);
        setError(null);
        setIsFallback(false);
      },
      onError: handleError,
    });

    service.start();
    return () => service.stop();
  }, []);

  const lastUpdated = useMemo(() => {
    if (!metrics?.timestamp) return '—';
    return new Date(metrics.timestamp).toLocaleTimeString();
  }, [metrics]);

  const topProcesses = metrics?.processes?.list ?? [];

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-900/30 p-6 space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center"
            >
              <Cpu className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-2xl font-semibold text-white">Dynamic CPU Metrics</h3>
              <p className="text-xs text-neutral-400">Live metrics describing your host alongside the simulations.</p>
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-[0.5em] text-cyan-200">Updated: {lastUpdated}</p>
        </div>
        {error && (
          <p className="text-xs text-amber-300">
            {error}
            {isFallback && ' Showing sample data while live metrics are unavailable.'}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <MetricBadge
            label="CPU Load"
            value={formatPercent(metrics?.cpu?.overall)}
            caption="Aggregated across all cores"
            icon={Activity}
          />
          <MetricBadge
            label="Frequency"
            value={metrics?.cpu?.frequencyMHz ? `${metrics.cpu.frequencyMHz.toFixed(1)} MHz` : '—'}
            caption={`Cores: ${metrics?.cpu?.physicalCores ?? '?'} / ${metrics?.cpu?.logicalCores ?? '?'}`}
            icon={Cpu}
          />
          <MetricBadge
            label="System Uptime"
            value={formatUptime(metrics?.system?.uptime)}
            caption={`${metrics?.system?.activeProcesses ?? 0} processes active`}
            icon={Clock3}
          />
        </div>
      </div>

      <div className="glass rounded-3xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">CPU Core Activity</h4>
            <p className="text-xs text-neutral-400">Per-core utilization snapshot</p>
          </div>
          <span className="text-xs text-neutral-400">{formatPercent(metrics?.cpu?.perCore?.reduce((acc, core) => acc + core.load, 0) / (metrics?.cpu?.perCore?.length || 1))}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {metrics?.cpu?.perCore?.map((core) => (
            <div key={core.core} className="rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span>Core {core.core}</span>
                <span>{formatPercent(core.load)}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${core.load}%` }} />
              </div>
              <div className="mt-2 text-[11px] text-neutral-500">User {formatPercent(core.loadUser)}</div>
              <div className="text-[11px] text-neutral-500">System {formatPercent(core.loadSystem)}</div>
            </div>
          ))}
          {!metrics?.cpu?.perCore?.length && (
            <div className="text-xs text-neutral-400">Waiting for per-core details…</div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricBadge
          label="Memory Used"
          value={formatBytes(metrics?.memory?.used)}
          caption={`Free ${formatBytes(metrics?.memory?.free)}`}
          icon={HardDrive}
        />
        <MetricBadge
          label="Cached"
          value={formatBytes(metrics?.memory?.cached)}
          caption={`Buffers ${formatBytes(metrics?.memory?.buffers)}`}
          icon={Layers}
        />
        <MetricBadge
          label="Swap Used"
          value={formatBytes(metrics?.memory?.swapUsed)}
          caption={`Total ${formatBytes(metrics?.memory?.swapTotal)}`}
          icon={HardDrive}
        />
        <MetricBadge
          label="Processes"
          value={`${metrics?.processes?.total ?? 0}`}
          caption={`${metrics?.processes?.running ?? 0} running`}
          icon={Terminal}
        />
      </div>

      <div className="glass rounded-3xl border border-white/10 bg-slate-900/80 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white">Top Processes</h4>
          <span className="text-xs text-neutral-400">Sorted by CPU usage</span>
        </div>
        <div className="space-y-2">
          {topProcesses.map((process) => (
            <div key={process.pid} className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-2 text-sm">
              <div>
                <div className="text-white font-semibold">{process.name}</div>
                <div className="text-[11px] text-neutral-400">PID {process.pid} • {process.state}</div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-white">{formatPercent(process.cpu)}</div>
                <div className="text-[11px] text-neutral-400">{formatBytes(process.memory * 1024 * 1024)}</div>
              </div>
            </div>
          ))}
          {!topProcesses.length && (
            <div className="text-xs text-neutral-400">Waiting for process data…</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemMetricsPanel;
