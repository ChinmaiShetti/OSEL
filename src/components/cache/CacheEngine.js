/**
 * CacheEngine - Cache Replacement Simulation Engine
 * Educational cache memory simulation for OS and Computer Architecture
 * Supports FIFO and LRU replacement algorithms
 * 
 * IMPORTANT: This is a conceptual educational simulation, not hardware-level cache
 */

export const CacheAlgorithms = {
    FIFO: 'FIFO',
    LRU: 'LRU',
};

/**
 * CacheEngine - Simulates cache memory with replacement policies
 */
export class CacheEngine {
    constructor(sequence, { cacheSize = 4, algorithm = CacheAlgorithms.FIFO } = {}) {
        // Parse input sequence (reference string)
        this.sequence = sequence.split(/[,\s]+/).filter(Boolean);
        this.cacheSize = cacheSize;
        this.algorithm = algorithm;

        // Initialize cache slots
        // Each slot contains: dataId, isValid, arrivalTime (FIFO), lastAccessTime (LRU)
        this.slots = Array.from({ length: cacheSize }, () => ({
            isValid: false,      // Is this slot occupied?
            dataId: null,        // Data block identifier
            arrivalTime: null,   // When was this loaded (for FIFO)
            lastAccessTime: null,// When was this last accessed (for LRU)
        }));

        // State tracking (MANDATORY as per requirements)
        this.currentIndex = 0;
        this.logs = [];
        this.metrics = {
            hitCount: 0,        // Cache hit count
            missCount: 0,       // Cache miss count
            hitRate: 0,         // Hit rate percentage
            processed: 0,       // Number of accesses processed
            totalAccesses: this.sequence.length,
        };
        this.evictedData = null;  // Track last evicted data
        this.done = false;
    }

    /**
     * Get current state snapshot for UI
     */
    getSnapshot() {
        return {
            slots: this.slots.map(slot => ({ ...slot })),
            logs: [...this.logs],
            metrics: { ...this.metrics },
            nextAccess: this.currentIndex < this.sequence.length ? this.sequence[this.currentIndex] : '—',
            evictedData: this.evictedData,
            done: this.done,
        };
    }

    /**
     * Check if simulation is complete
     */
    isDone() {
        return this.done;
    }

    /**
     * Add log entry with timestamp
     * Logs are required per specifications
     */
    addLog(type, message) {
        this.logs.push({
            type,
            message,
            timestamp: Date.now(),
        });
    }

    /**
     * ACCESS HANDLING: Search cache for a data block
     * Returns index if found (HIT), -1 if not found (MISS)
     */
    searchCache(dataId) {
        return this.slots.findIndex(slot => slot.isValid && slot.dataId === dataId);
    }

    /**
     * Find first empty slot in cache
     * Returns index if found, -1 if cache is full
     */
    findEmptySlot() {
        return this.slots.findIndex(slot => !slot.isValid);
    }

    /**
     * Handle CACHE HIT
     * - Update lastAccessTime for LRU
     * - Increment hit count
     * - Log the hit
     */
    handleCacheHit(hitIndex, dataId, time) {
        this.metrics.hitCount++;

        // Update last access time (critical for LRU)
        this.slots[hitIndex].lastAccessTime = time;

        // Required logging: "Data X → Cache Hit"
        this.addLog('hit', `Data ${dataId} → Cache Hit (Slot ${hitIndex + 1})`);
    }

    /**
     * Load data into empty slot
     * - Set all metadata (arrivalTime for FIFO, lastAccessTime for LRU)
     * - Log the load
     */
    loadIntoEmptySlot(emptyIndex, dataId, time) {
        this.slots[emptyIndex] = {
            isValid: true,
            dataId: dataId,
            arrivalTime: time,
            lastAccessTime: time,
        };

        // Required logging: "Loaded Data Y into Cache"
        this.addLog('load', `Loaded Data ${dataId} into Cache (Slot ${emptyIndex + 1})`);
    }

    /**
     * REPLACEMENT DECISION: Determine which slot to evict
     * This is the core cache replacement algorithm logic
     */
    getEvictionIndex() {
        if (this.algorithm === CacheAlgorithms.FIFO) {
            // ===== FIFO (First In First Out) =====
            // LOGIC: Evict the entry that was loaded earliest (oldest arrivalTime)
            let oldestIndex = 0;
            let oldestTime = this.slots[0].arrivalTime;

            for (let i = 1; i < this.slots.length; i++) {
                if (this.slots[i].arrivalTime < oldestTime) {
                    oldestTime = this.slots[i].arrivalTime;
                    oldestIndex = i;
                }
            }

            return oldestIndex;

        } else if (this.algorithm === CacheAlgorithms.LRU) {
            // ===== LRU (Least Recently Used) =====
            // LOGIC: Evict the entry with oldest lastAccessTime
            let lruIndex = 0;
            let lruTime = this.slots[0].lastAccessTime;

            for (let i = 1; i < this.slots.length; i++) {
                if (this.slots[i].lastAccessTime < lruTime) {
                    lruTime = this.slots[i].lastAccessTime;
                    lruIndex = i;
                }
            }

            return lruIndex;
        }

        // Fallback (should never reach here)
        return 0;
    }

    /**
     * STATE UPDATE: Evict and replace based on algorithm
     * - Invoke replacement algorithm to select victim
     * - Log eviction
     * - Replace with new data
     * - Update metadata
     */
    evictAndReplace(dataId, time) {
        // REPLACEMENT DECISION: Use algorithm to select victim slot
        const evictIndex = this.getEvictionIndex();
        this.evictedData = this.slots[evictIndex].dataId;

        // Required logging: "Evicted Data Z using FIFO/LRU"
        this.addLog(
            'evict',
            `Evicted Data ${this.evictedData} using ${this.algorithm} (Slot ${evictIndex + 1})`
        );

        // STATE UPDATE: Replace the evicted slot with new data
        this.slots[evictIndex] = {
            isValid: true,
            dataId: dataId,
            arrivalTime: time,        // Update arrival time for FIFO
            lastAccessTime: time,     // Update last access for LRU
        };

        // Required logging: "Loaded Data Y into Cache"
        this.addLog('load', `Loaded Data ${dataId} into Cache (Slot ${evictIndex + 1})`);
    }

    /**
     * Handle CACHE MISS
     * - Increment miss count
     * - Log the miss
     * - If free slot exists: load into it
     * - If cache full: invoke replacement algorithm
     */
    handleCacheMiss(dataId, time) {
        this.metrics.missCount++;

        // Required logging: "Data Y → Cache Miss"
        this.addLog('miss', `Data ${dataId} → Cache Miss`);

        // Check if there's a free cache slot
        const emptyIndex = this.findEmptySlot();

        if (emptyIndex !== -1) {
            // Free slot available - load directly
            this.loadIntoEmptySlot(emptyIndex, dataId, time);
        } else {
            // Cache is full - invoke replacement algorithm
            this.evictAndReplace(dataId, time);
        }
    }

    /**
     * Execute one cache access (one step of simulation)
     * 
     * CACHE BEHAVIOR (per specifications):
     * 1. On each data access:
     *    - Search cache for the dataId
     *    - If found → CACHE HIT
     *    - If not found → CACHE MISS
     * 
     * 2. On CACHE HIT:
     *    - Update lastAccessTime
     *    - No eviction occurs
     * 
     * 3. On CACHE MISS:
     *    - If free slot exists: load data
     *    - If cache full: invoke replacement algorithm
     */
    step() {
        // Check if simulation is complete
        if (this.currentIndex >= this.sequence.length) {
            this.done = true;
            return this.getSnapshot();
        }

        // Get next data access from reference string
        const dataId = this.sequence[this.currentIndex];
        const time = this.currentIndex;  // Time step for metadata
        this.evictedData = null;          // Clear previous eviction

        // STEP 1: ACCESS HANDLING - Search cache for the data
        const hitIndex = this.searchCache(dataId);

        // STEP 2: Handle HIT or MISS
        if (hitIndex !== -1) {
            // === CACHE HIT ===
            this.handleCacheHit(hitIndex, dataId, time);
        } else {
            // === CACHE MISS ===
            this.handleCacheMiss(dataId, time);
        }

        // STEP 3: STATE TRACKING - Update metrics
        this.metrics.processed++;
        this.currentIndex++;

        // Calculate hit rate
        this.metrics.hitRate = this.metrics.processed > 0
            ? Math.round((this.metrics.hitCount / this.metrics.processed) * 100)
            : 0;

        // Check if we're done
        if (this.currentIndex >= this.sequence.length) {
            this.done = true;
            this.addLog('info', `✅ Simulation complete! Final hit rate: ${this.metrics.hitRate}%`);
        }

        return this.getSnapshot();
    }

    /**
     * Run simulation to completion
     * Used for "Run to End" feature
     */
    runToEnd() {
        while (!this.isDone()) {
            this.step();
        }
        return this.getSnapshot();
    }
}
