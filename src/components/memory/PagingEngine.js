export const PagingAlgorithms = {
  FIFO: 'FIFO',
  LRU: 'LRU',
  OPTIMAL: 'OPTIMAL',
};

const MAX_LOGS = 12;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export class PagingEngine {
  constructor(processes, algorithm = PagingAlgorithms.FIFO, options = {}) {
    this.algorithm = algorithm;
    this.frameCount = Math.max(3, Number(options.frameCount) || 6);
    this.frames = Array.from({ length: this.frameCount }, (_, index) => ({
      frameId: index,
      isFree: true,
      pageId: null,
      processId: null,
    }));
    this.processes = this._normalizeProcesses(processes);
    this.pageTables = this._buildPageTables();
    this.referenceQueue = this._buildReferenceQueue();
    this.currentIndex = 0;
    this.logs = [];
    this.pageFaults = 0;
    this.pageHits = 0;
    this.fifoQueue = [];
    this.lastAccessed = new Map();
  }

  _normalizeProcesses(processes) {
    if (!processes || !processes.length) {
      return [{ pid: 'P1', totalPages: 4, referenceString: [0] }];
    }

    return processes.map((process, index) => {
      const pid = (process.pid || `P${index + 1}`).toUpperCase();
      const totalPages = Math.max(1, Number(process.totalPages) || 1);
      const referenceString = this._parseReferenceString(process.referenceString, totalPages);
      return { pid, totalPages, referenceString };
    });
  }

  _parseReferenceString(value, totalPages) {
    if (Array.isArray(value) && value.length) {
      return value.map(page => clamp(Number(page) || 0, 0, totalPages - 1));
    }
    const raw = String(value ?? '').split(/[\s,]+/).filter(Boolean);
    const normalized = raw
      .map(item => Number(item))
      .filter(num => !Number.isNaN(num))
      .map(page => clamp(page, 0, totalPages - 1));
    return normalized.length ? normalized : [0];
  }

  _buildPageTables() {
    return this.processes.reduce((tables, process) => {
      tables[process.pid] = Array.from({ length: process.totalPages }, () => null);
      return tables;
    }, {});
  }

  _buildReferenceQueue() {
    const queue = [];
    const maxLength = Math.max(...this.processes.map(process => process.referenceString.length));
    for (let step = 0; step < maxLength; step += 1) {
      this.processes.forEach(process => {
        const page = process.referenceString[step];
        if (typeof page === 'number') {
          queue.push({ pid: process.pid, page });
        }
      });
    }
    if (!queue.length) {
      queue.push({ pid: this.processes[0].pid, page: 0 });
    }
    return queue;
  }

  isDone() {
    return this.currentIndex >= this.referenceQueue.length;
  }

  getMetrics() {
    const totalReferences = Math.min(this.currentIndex, this.referenceQueue.length);
    const faultRate = totalReferences ? Math.round((this.pageFaults / totalReferences) * 100) : 0;
    return {
      totalReferences,
      pageFaults: this.pageFaults,
      pageHits: this.pageHits,
      pageFaultRate: faultRate,
      framesUsed: this.frames.filter(frame => !frame.isFree).length,
      frameCount: this.frames.length,
    };
  }

  _getPageKey(pid, page) {
    return `${pid}:${page}`;
  }

  _log(message, type = 'info') {
    this.logs.unshift({ message, type, timestamp: Date.now() });
    if (this.logs.length > MAX_LOGS) {
      this.logs.pop();
    }
  }

  _markAccessed(frame) {
    if (!frame || frame.isFree) return;
    const key = this._getPageKey(frame.processId, frame.pageId);
    this.lastAccessed.set(key, Date.now());
  }

  _findFreeFrame() {
    return this.frames.find(frame => frame.isFree) ?? null;
  }

  _evictFrame(frameId) {
    const frame = this.frames[frameId];
    if (frame.isFree) return;
    const key = this._getPageKey(frame.processId, frame.pageId);
    this.pageTables[frame.processId][frame.pageId] = null;
    this.lastAccessed.delete(key);
    this.fifoQueue = this.fifoQueue.filter(item => item.frameId !== frameId);
    frame.isFree = true;
    const evictedMessage = `Evicted page ${frame.pageId} of ${frame.processId} from Frame ${frameId} using ${this.algorithm}`;
    this._log(evictedMessage, 'evict');
    frame.pageId = null;
    frame.processId = null;
  }

  _loadPage(pid, page, frameId) {
    const frame = this.frames[frameId];
    frame.isFree = false;
    frame.processId = pid;
    frame.pageId = page;
    this.pageTables[pid][page] = frameId;
    this._markAccessed(frame);
    if (this.algorithm === PagingAlgorithms.FIFO) {
      this.fifoQueue.push({ frameId, pid, page });
    }
    const loadMessage = `Loaded page ${page} of ${pid} into Frame ${frameId}`;
    this._log(loadMessage, 'load');
  }

  _selectVictimFrame(startIndex) {
    if (this.algorithm === PagingAlgorithms.FIFO && this.fifoQueue.length) {
      const next = this.fifoQueue.shift();
      if (next) {
        return this.frames[next.frameId];
      }
    }

    const occupied = this.frames.filter(frame => !frame.isFree);
    if (!occupied.length) {
      return this.frames[0];
    }

    if (this.algorithm === PagingAlgorithms.LRU) {
      let victim = occupied[0];
      let oldest = Infinity;
      occupied.forEach(frame => {
        const key = this._getPageKey(frame.processId, frame.pageId);
        const lastUsed = this.lastAccessed.get(key) ?? 0;
        if (lastUsed < oldest) {
          oldest = lastUsed;
          victim = frame;
        }
      });
      return victim;
    }

    if (this.algorithm === PagingAlgorithms.OPTIMAL) {
      let victim = occupied[0];
      let furthestNextUse = -1;
      for (const frame of occupied) {
        const nextUse = this._nextUseIndex(frame.processId, frame.pageId, startIndex);
        if (nextUse === -1) {
          return frame;
        }
        if (nextUse > furthestNextUse) {
          furthestNextUse = nextUse;
          victim = frame;
        }
      }
      return victim;
    }

    return occupied[0];
  }

  _nextUseIndex(pid, page, startIndex) {
    for (let idx = startIndex; idx < this.referenceQueue.length; idx += 1) {
      const reference = this.referenceQueue[idx];
      if (reference.pid === pid && reference.page === page) {
        return idx;
      }
    }
    return -1;
  }

  step() {
    if (this.isDone()) {
      return this.getSnapshot();
    }
    const reference = this.referenceQueue[this.currentIndex];
    const referenceCursor = this.currentIndex;
    this.currentIndex += 1;
    if (!reference) {
      return this.getSnapshot();
    }

    const { pid, page } = reference;
    const table = this.pageTables[pid];
    const cachedFrame = table[page];

    if (cachedFrame !== null && cachedFrame !== undefined) {
      this.pageHits += 1;
      const hitMessage = `Page ${page} accessed for ${pid} → Hit (Frame ${cachedFrame})`;
      this._log(hitMessage, 'hit');
      this._markAccessed(this.frames[cachedFrame]);
    } else {
      this.pageFaults += 1;
      const faultMessage = `Page ${page} accessed for ${pid} → Fault`;
      this._log(faultMessage, 'fault');
      let frame = this._findFreeFrame();
      if (!frame) {
        frame = this._selectVictimFrame(this.currentIndex);
        this._evictFrame(frame.frameId);
      }
      this._loadPage(pid, page, frame.frameId);
    }

    return this.getSnapshot();
  }

  runToEnd() {
    while (!this.isDone()) {
      this.step();
    }
    return this.getMetrics();
  }

  getSnapshot() {
    const totalReferences = this.referenceQueue.length;
    const currentReference = this.currentIndex > 0
      ? this.referenceQueue[Math.min(this.currentIndex - 1, totalReferences - 1)]
      : null;
    const nextReference = this.referenceQueue[this.currentIndex] ?? null;

    const tablesClone = Object.entries(this.pageTables).reduce((acc, [pid, entries]) => {
      acc[pid] = entries.slice();
      return acc;
    }, {});

    return {
      frames: this.frames.map(frame => ({ ...frame })),
      pageTables: tablesClone,
      logs: [...this.logs],
      metrics: this.getMetrics(),
      currentReference,
      nextReference,
      referenceQueue: this.referenceQueue,
      currentIndex: this.currentIndex,
      done: this.isDone(),
    };
  }
}