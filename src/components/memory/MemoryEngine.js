export const MemoryAlgorithms = {
  FIRST_FIT: 'FIRST_FIT',
  BEST_FIT: 'BEST_FIT',
  WORST_FIT: 'WORST_FIT',
};

const alignUp = (value, unit) => Math.ceil(value / unit) * unit;

export class MemoryEngine {
  constructor(requests, algorithm, options = {}) {
    this.algorithm = algorithm;
    this.initialHoles = options.initialHoles ?? [100, 500, 200, 300];
    this.memorySize = this.initialHoles.reduce((sum, size) => sum + size, 0);
    this.allocationUnit = options.allocationUnit ?? 1;
    this.requests = this._hydrateRequests(requests);
    this.segments = this._buildInitialSegments();
    this.currentIndex = 0;
    this.logs = [];
    this.internalFragmentation = 0;
    this.lastEvent = null;
  }

  _hydrateRequests(requests) {
    return requests.map((req, index) => ({
      pid: req.pid || `P${index + 1}`,
      size: Number(req.size) || 1,
      status: 'PENDING',
      allocation: null,
    }));
  }

  _buildInitialSegments() {
    const segments = [];
    let offset = 0;
    this.initialHoles.forEach(size => {
      segments.push({
        start: offset,
        size,
        free: true,
        processId: null,
      });
      offset += size;
    });
    return segments;
  }

  isDone() {
    return this.currentIndex >= this.requests.length;
  }

  getAlgorithmLabel() {
    switch (this.algorithm) {
      case MemoryAlgorithms.BEST_FIT:
        return 'Best Fit';
      case MemoryAlgorithms.WORST_FIT:
        return 'Worst Fit';
      default:
        return 'First Fit';
    }
  }

  getMetrics() {
    const freeSegments = this.segments.filter(segment => segment.free);
    const allocatedSegments = this.segments.filter(segment => !segment.free);
    const totalFree = freeSegments.reduce((sum, segment) => sum + segment.size, 0);
    const totalAllocated = allocatedSegments.reduce((sum, segment) => sum + segment.size, 0);
    const largestHole = freeSegments.length ? Math.max(...freeSegments.map(segment => segment.size)) : 0;
    const externalFragmentation = totalFree - largestHole;

    return {
      totalMemory: this.memorySize,
      allocated: totalAllocated,
      free: totalFree,
      largestHole,
      internalFragmentation: this.internalFragmentation,
      externalFragmentation: externalFragmentation < 0 ? 0 : externalFragmentation,
    };
  }

  getSnapshot() {
    const currentRequest = this.requests[this.currentIndex];
    return {
      segments: this.segments.map(segment => ({ ...segment })),
      requests: this.requests.map(req => ({ ...req })),
      logs: [...this.logs],
      metrics: this.getMetrics(),
      currentRequest,
      done: this.isDone(),
      lastEvent: this.lastEvent,
    };
  }

  findCandidates(alignedSize) {
    return this.segments.filter(segment => segment.free && segment.size >= alignedSize);
  }

  selectHole(request) {
    const aligned = alignUp(request.size, this.allocationUnit);
    const candidates = this.findCandidates(aligned);
    if (!candidates.length) {
      return { hole: null, alignedSize: aligned };
    }

    let chosen;
    if (this.algorithm === MemoryAlgorithms.BEST_FIT) {
      chosen = candidates.reduce((best, candidate) => (candidate.size < best.size ? candidate : best));
    } else if (this.algorithm === MemoryAlgorithms.WORST_FIT) {
      chosen = candidates.reduce((best, candidate) => (candidate.size > best.size ? candidate : best));
    } else {
      chosen = candidates[0];
    }

    return { hole: chosen, alignedSize: aligned };
  }

  allocateSegment(request, hole, alignedSize, holeIndex) {
    const remainder = hole.size - alignedSize;
    const allocatedSegment = {
      start: hole.start,
      size: alignedSize,
      free: false,
      processId: request.pid,
      requestedSize: request.size,
    };
    const segmentsToInsert = [allocatedSegment];

    if (remainder > 0) {
      segmentsToInsert.push({
        start: hole.start + alignedSize,
        size: remainder,
        free: true,
        processId: null,
      });
    }

    this.segments.splice(holeIndex, 1, ...segmentsToInsert);
    this.internalFragmentation += alignedSize - request.size;
    request.status = 'ALLOCATED';
    request.allocation = { start: allocatedSegment.start, size: alignedSize };

    const logMessage = `${this.getAlgorithmLabel()} selected hole at ${hole.start} (size ${hole.size}). ` +
      `Allocated ${alignedSize} units for ${request.pid}${remainder > 0 ? `; ${remainder} units remain free.` : '.'}`;

    const event = {
      pid: request.pid,
      type: 'ALLOCATED',
      description: logMessage,
      holeStart: hole.start,
      size: alignedSize,
      timestamp: Date.now(),
    };
    this.logs.push(event);
    this.lastEvent = event;
  }

  logFailure(request, alignedSize) {
    request.status = 'FAILED';
    request.allocation = null;
    const logMessage = `No contiguous hole was large enough for ${request.pid} (${alignedSize} units).`;
    const event = {
      pid: request.pid,
      type: 'FAILED',
      description: logMessage,
      size: alignedSize,
      timestamp: Date.now(),
    };
    this.logs.push(event);
    this.lastEvent = event;
  }

  step() {
    if (this.isDone()) {
      return this.getSnapshot();
    }

    const request = this.requests[this.currentIndex];
    const { hole, alignedSize } = this.selectHole(request);

    if (hole) {
      const holeIndex = this.segments.findIndex(segment => segment === hole);
      this.allocateSegment(request, hole, alignedSize, holeIndex);
    } else {
      this.logFailure(request, alignedSize);
    }

    this.currentIndex += 1;
    return this.getSnapshot();
  }

  runToEnd() {
    while (!this.isDone()) {
      this.step();
    }
    return this.getMetrics();
  }
}
