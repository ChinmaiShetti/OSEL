const DEFAULT_PROCESS_LIMIT = 40;
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const browserNavigator = typeof navigator !== 'undefined' ? navigator : null;
const browserSessionStart = Date.now();
let siModule = null;
let browserLoadSample = 35;
let browserSamplerHandle = null;

const normalizeCpuFrequency = (speed, governorReport) => {
  if (speed) {
    return Number(speed.current || speed.avg || speed) || null;
  }

  if (governorReport?.speed) {
    return Number(governorReport.speed) || null;
  }

  return null;
};

const ensureSiModule = async () => {
  if (isBrowser) {
    throw new Error('System metrics unavailable in browser environments.');
  }

  if (siModule) return siModule;
  const imported = await import('systeminformation');
  siModule = imported.default ?? imported;
  return siModule;
};

const oscillate = (base, amplitude, period, phase = 0) => base + Math.sin((Date.now() + phase) / period) * amplitude;
const getBrowserCoreCount = () => Math.max(1, Math.min(8, browserNavigator?.hardwareConcurrency ?? 4));
const startBrowserLoadSampler = () => {
  if (!isBrowser || browserSamplerHandle) return;
  const hasPerformance = typeof performance !== 'undefined' && typeof performance.now === 'function';
  if (!hasPerformance) return;

  const intervalMs = 1000;
  let last = performance.now();

  browserSamplerHandle = setInterval(() => {
    const now = performance.now();
    const drift = Math.max(0, now - last - intervalMs);
    const lagPercent = Math.min(100, (drift / intervalMs) * 100);
    browserLoadSample = browserLoadSample * 0.7 + lagPercent * 0.3;
    last = now;
  }, intervalMs);
};

startBrowserLoadSampler();

const createBrowserProcessList = () => {
  const now = Date.now();
  const base = [
    { pid: 101, name: 'Simulator', memory: 180, state: 'running', baseCpu: 12.4 },
    { pid: 202, name: 'Renderer', memory: 115, state: 'sleeping', baseCpu: 8.2 },
    { pid: 303, name: 'Watcher', memory: 90, state: 'sleeping', baseCpu: 5.6 },
    { pid: 404, name: 'Indexer', memory: 75, state: 'running', baseCpu: 4.1 },
  ];
  return base.map((proc, index) => ({
    pid: proc.pid,
    name: proc.name,
    state: proc.state,
    cpu: Number((proc.baseCpu + oscillate(0, 2.5, 4200, index * 500)).toFixed(1)),
    memory: Number((proc.memory + oscillate(0, 8, 4600, index * 700)).toFixed(1)),
  }));
};

const fetchBrowserCpuMetrics = async () => {
  startBrowserLoadSampler();
  const now = Date.now();
  const coreCount = getBrowserCoreCount();
  const baseLoad = browserLoadSample || 32 + Math.sin(now / 4000) * 5;
  const perCore = Array.from({ length: coreCount }, (_, index) => {
    const phaseLoad = baseLoad + Math.sin((now + index * 1200) / 3800) * 4;
    const load = Number(Math.min(95, Math.max(2, phaseLoad)).toFixed(1));
    return {
      core: index,
      load,
      loadUser: Number(Math.max(0, load - 5).toFixed(1)),
      loadSystem: Number(Math.min(load, 14).toFixed(1)),
    };
  });

  const frequencyMHz = Number((3200 + Math.sin(now / 4200) * 50).toFixed(1));
  return {
    overall: Number((perCore.reduce((sum, core) => sum + core.load, 0) / coreCount).toFixed(1)),
    perCore,
    frequencyMHz,
    brand: 'Browser CPU Emulator',
    physicalCores: Math.max(1, Math.floor(coreCount / 2)),
    logicalCores: coreCount,
  };
};

const fetchBrowserMemoryMetrics = async () => {
  const totalMemoryGB = browserNavigator?.deviceMemory ?? 8;
  const total = totalMemoryGB * 1024 ** 3;
  const usedRatio = 0.55 + Math.abs(Math.sin(Date.now() / 5000)) * 0.08;
  const used = Math.min(total, Math.max(0, total * usedRatio));

  return {
    total,
    used,
    free: total - used,
    cached: total * 0.12,
    buffers: total * 0.06,
    swapTotal: (totalMemoryGB / 2) * 1024 ** 3,
    swapUsed: Math.min(total * 0.05, 512 * 1024 ** 2),
  };
};

const fetchBrowserProcessMetrics = async (limit = DEFAULT_PROCESS_LIMIT) => {
  const list = createBrowserProcessList()
    .slice(0, limit)
    .map((entry) => ({
      ...entry,
      cpu: Number(entry.cpu.toFixed(1)),
      memory: Number(entry.memory.toFixed(1)),
    }));

  return {
    total: list.length,
    running: list.filter((proc) => proc.state === 'running').length,
    blocked: 0,
    sleeping: list.filter((proc) => proc.state === 'sleeping').length,
    list,
  };
};

const fetchBrowserSystemMetrics = async () => {
  const uptimeSeconds = Math.max(0, Math.floor((Date.now() - browserSessionStart) / 1000));
  return {
    uptime: uptimeSeconds,
    bootTime: Math.floor(browserSessionStart / 1000),
    load: [
      Number((1 + Math.sin(Date.now() / 5000) * 0.2).toFixed(2)),
      Number((0.6 + Math.sin(Date.now() / 6000) * 0.15).toFixed(2)),
      Number((0.4 + Math.sin(Date.now() / 7000) * 0.1).toFixed(2)),
    ],
    platform: browserNavigator?.platform ?? 'Browser',
    activeProcesses: 18,
  };
};
const formatProcessEntry = (entry) => ({
  pid: entry.pid,
  name: entry.name,
  cpu: Number(entry.cpu.toFixed(1)),
  memory: Number(entry.mem.toFixed(1)),
  state: entry.state || 'unknown',
});

export const fetchCpuMetrics = async () => {
  if (isBrowser) {
    return fetchBrowserCpuMetrics();
  }

  const si = await ensureSiModule();
  const [currentLoad, cpuInfo, cpuSpeed] = await Promise.all([
    si.currentLoad(),
    si.cpu(),
    si.cpuCurrentspeed(),
  ]);

  const perCore = currentLoad.cpus?.map((core, index) => ({
    core: index,
    load: Number(core.load.toFixed(1)),
    loadUser: Number((core.loadUser ?? 0).toFixed(1)),
    loadSystem: Number((core.loadSystem ?? 0).toFixed(1)),
  })) ?? [];

  const freq = normalizeCpuFrequency(cpuSpeed, cpuInfo);

  return {
    overall: Number(currentLoad.currentload.toFixed(1)),
    perCore,
    frequencyMHz: freq,
    brand: cpuInfo.brand,
    physicalCores: cpuInfo.physicalCores,
    logicalCores: cpuInfo.cores,
  };
};

export const fetchMemoryMetrics = async () => {
  if (isBrowser) {
    return fetchBrowserMemoryMetrics();
  }

  const si = await ensureSiModule();
  const memory = await si.mem();

  return {
    total: memory.total,
    used: memory.used,
    free: memory.free,
    cached: memory.cached ?? memory.buffcache ?? null,
    buffers: memory.buffers ?? null,
    swapTotal: memory.swaptotal ?? memory.swapTotal ?? 0,
    swapUsed: memory.swapused ?? memory.swapUsed ?? 0,
    swapFree: memory.swapfree ?? memory.swapFree ?? 0,
  };
};

export const fetchProcessMetrics = async (limit = DEFAULT_PROCESS_LIMIT) => {
  if (isBrowser) {
    return fetchBrowserProcessMetrics(limit);
  }

  const si = await ensureSiModule();
  const processes = await si.processes();
  const sorted = processes.list
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, limit)
    .map(formatProcessEntry);

  return {
    total: processes.all,
    running: processes.running,
    blocked: processes.blocked,
    sleeping: processes.sleeping,
    list: sorted,
  };
};

export const fetchSystemMetrics = async () => {
  if (isBrowser) {
    return fetchBrowserSystemMetrics();
  }

  const si = await ensureSiModule();
  const [timeInfo, osInfo, processes] = await Promise.all([
    si.time(),
    si.osInfo(),
    si.processes(),
  ]);

  return {
    uptime: timeInfo.uptime ?? 0,
    bootTime: timeInfo.bootTime ?? 0,
    load: timeInfo.loadavg ?? [],
    platform: osInfo.platform,
    activeProcesses: processes.all,
  };
};

export const collectSystemState = async (options = {}) => {
  const { processLimit = DEFAULT_PROCESS_LIMIT } = options;

  const [cpu, memory, system, processes] = await Promise.all([
    fetchCpuMetrics(),
    fetchMemoryMetrics(),
    fetchSystemMetrics(),
    fetchProcessMetrics(processLimit),
  ]);

  return {
    timestamp: Date.now(),
    cpu,
    memory,
    system,
    processes,
  };
};

export const createPollingService = ({
  intervalMs = 5000,
  onUpdate,
  onError,
  processLimit = DEFAULT_PROCESS_LIMIT,
} = {}) => {
  let handle = null;

  const poll = async () => {
    try {
      const state = await collectSystemState({ processLimit });
      onUpdate?.(state);
    } catch (error) {
      onError?.(error);
    }
  };

  return {
    start: () => {
      if (handle) return;
      poll();
      handle = setInterval(poll, intervalMs);
    },
    stop: () => {
      if (!handle) return;
      clearInterval(handle);
      handle = null;
    },
    isPolling: () => Boolean(handle),
  };
};
