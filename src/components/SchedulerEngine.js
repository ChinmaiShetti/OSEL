/**
 * CPU Scheduling Engine
 * Core OS scheduling logic implementation
 * Supports: FCFS, SJF, SRTF, Priority (Preemptive), Round Robin
 * 
 * Educational Focus: Every action includes WHY the decision was made
 */

// Algorithm types
export const Algorithm = {
  FCFS: 'FCFS',
  SJF: 'SJF',
  SRTF: 'SRTF',
  PRIORITY: 'PRIORITY',
  RR: 'RR',
};

// Process states following OS theory
export const ProcessState = {
  NEW: 'NEW',
  READY: 'READY',
  RUNNING: 'RUNNING',
  TERMINATED: 'TERMINATED',
};

/**
 * Core Scheduler Engine
 * Simulates CPU scheduling with step-by-step execution
 * Generates detailed trace with explanations for learning
 */
export class SchedulerEngine {
  constructor(processes, algorithm, options = {}) {
    this.algorithm = algorithm;
    this.quantum = Number(options.quantum) || 1;
    this.original = this.cloneProcesses(processes);
    this.reset();
  }

  /**
   * Deep clone processes to allow reset
   */
  cloneProcesses(processes) {
    return processes.map(p => ({
      pid: p.pid,
      arrivalTime: Number(p.arrivalTime),
      burstTime: Number(p.burstTime),
      remainingTime: Number(p.burstTime),
      priority: p.priority !== undefined ? Number(p.priority) : 0,
      completionTime: null,
      waitingTime: null,
      turnaroundTime: null,
      state: ProcessState.NEW,
    }));
  }

  /**
   * Reset engine to initial state
   */
  reset() {
    this.time = 0;
    this.ready = [];
    this.running = null;
    this.completedCount = 0;
    this.gantt = [];
    this.trace = [];
    this.quantumCounter = 0;
    this.processes = this.cloneProcesses(this.original);
  }

  /**
   * Check if all processes are done
   */
  isDone() {
    return this.completedCount === this.processes.length;
  }

  /**
   * Get processes arriving at current time
   */
  arrivalsAtTime() {
    return this.processes.filter(p => p.state === ProcessState.NEW && p.arrivalTime === this.time);
  }

  /**
   * Add event to trace with educational explanation
   */
  pushTrace(event, info = {}) {
    this.trace.push({
      time: this.time,
      event,
      running: this.running ? this.running.pid : null,
      ready: this.ready.map(p => p.pid),
      transitions: info.transitions || [],
      explanation: info.explanation || '',
      decision: info.decision || '',
    });
  }

  /**
   * Sort ready queue based on algorithm policy
   * This is where each algorithm's core logic differs
   */
  sortReady(algorithm, ready) {
    switch (algorithm) {
      case Algorithm.SJF:
        // Shortest Job First: sort by burst time (original job length)
        ready.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime);
        break;
      case Algorithm.SRTF:
        // Shortest Remaining Time First: sort by remaining time
        ready.sort((a, b) => a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime);
        break;
      case Algorithm.PRIORITY:
        // Priority: lower number = higher priority
        ready.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);
        break;
      default:
        // FCFS and RR: FIFO order (no sort needed, order is arrival order)
        break;
    }
  }

  /**
   * Dispatch next process from ready queue to running state
   * Returns true if a process was dispatched
   */
  dispatchNext() {
    if (!this.ready.length) return false;
    
    let chosen;
    if (this.algorithm === Algorithm.RR || this.algorithm === Algorithm.FCFS) {
      // FIFO order for FCFS and RR
      chosen = this.ready.shift();
      const reason = this.algorithm === Algorithm.RR 
        ? `${chosen.pid} is first in queue (Round Robin uses FIFO order)`
        : `${chosen.pid} arrived first (First Come First Serve)`;
      this.pushTrace('DISPATCH', { 
        transitions: [`${chosen.pid} → RUNNING`],
        explanation: reason,
        decision: this.algorithm === Algorithm.RR 
          ? 'In RR, processes take turns in the order they arrived. No priority given to any process.'
          : 'In FCFS, the process that arrived first gets the CPU. Simple queue order.'
      });
    } else {
      // Sort by algorithm policy and take best candidate
      this.sortReady(this.algorithm, this.ready);
      chosen = this.ready.shift();
      const reason = this.getDispatchReason(chosen);
      this.pushTrace('DISPATCH', { 
        transitions: [`${chosen.pid} → RUNNING`],
        explanation: `${chosen.pid} selected: ${reason}`,
        decision: `${this.algorithm} algorithm chooses the next process based on its policy.`
      });
    }
    
    this.running = chosen;
    this.running.state = ProcessState.RUNNING;
    this.quantumCounter = 0;
    return true;
  }

  /**
   * Get human-readable reason for dispatch decision
   */
  getDispatchReason(process) {
    switch (this.algorithm) {
      case Algorithm.FCFS:
        return `arrived first at t=${process.arrivalTime}`;
      case Algorithm.SJF:
        return `has shortest burst time (${process.burstTime} units)`;
      case Algorithm.SRTF:
        return `has shortest remaining time (${process.remainingTime} units)`;
      case Algorithm.PRIORITY:
        return `has highest priority (priority=${process.priority}, lower is better)`;
      default:
        return 'selected by scheduler';
    }
  }

  /**
   * Check if running process should be preempted
   * Only applies to preemptive algorithms: SRTF, PRIORITY, RR
   */
  shouldPreempt() {
    if (!this.running) return false;
    
    if (this.algorithm === Algorithm.SRTF) {
      // Preempt if any ready process has shorter remaining time
      const best = [...this.ready].sort((a, b) => 
        a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime
      )[0];
      return best && best.remainingTime < this.running.remainingTime;
    }
    
    if (this.algorithm === Algorithm.PRIORITY) {
      // Preempt if any ready process has higher priority (lower number)
      const best = [...this.ready].sort((a, b) => 
        a.priority - b.priority || a.arrivalTime - b.arrivalTime
      )[0];
      return best && best.priority < this.running.priority;
    }
    
    if (this.algorithm === Algorithm.RR) {
      // Preempt when time quantum expires
      return this.quantumCounter >= this.quantum;
    }
    
    return false;
  }

  /**
   * Preempt currently running process
   * Move it back to ready queue
   */
  preemptRunning(reason) {
    if (!this.running) return;
    
    this.running.state = ProcessState.READY;
    this.ready.push(this.running);
    
    const explanation = this.getPreemptExplanation(reason);
    this.pushTrace('PREEMPT', { 
      transitions: [`${this.running.pid} → READY (${reason})`],
      explanation,
      decision: `${this.algorithm} is a preemptive algorithm. When a better candidate arrives/becomes available, the current process is interrupted.`
    });
    
    this.running = null;
    this.quantumCounter = 0;
  }

  /**
   * Get human-readable explanation for preemption
   */
  getPreemptExplanation(reason) {
    switch (reason) {
      case 'quantum expired':
        return `Time quantum of ${this.quantum} units expired. In Round Robin, fairness is maintained by giving each process equal time.`;
      case 'better candidate':
        if (this.algorithm === Algorithm.SRTF) {
          const best = this.ready[this.ready.length - 1]; // Last added (preempted process)
          const newBest = this.ready[0];
          return `A process with shorter remaining time is available. SRTF always picks the process closest to completion.`;
        }
        if (this.algorithm === Algorithm.PRIORITY) {
          return `A higher priority process is now available. Priority scheduling always runs the highest priority (lowest number) process.`;
        }
        return 'A better candidate is available.';
      default:
        return reason;
    }
  }

  /**
   * Extend or add to Gantt chart
   */
  extendGantt(pid) {
    if (!this.gantt.length || this.gantt[this.gantt.length - 1].pid !== pid) {
      this.gantt.push({ pid, start: this.time, end: this.time + 1 });
    } else {
      this.gantt[this.gantt.length - 1].end += 1;
    }
  }

  /**
   * Execute one time unit of simulation
   * This is the core step function - educational heart of the simulator
   */
  step() {
    if (this.isDone()) return { done: true, time: this.time };

    // 1. Handle arrivals at current time
    const arriving = this.arrivalsAtTime();
    arriving.forEach(p => {
      p.state = ProcessState.READY;
      this.ready.push(p);
      this.pushTrace('ARRIVAL', { 
        transitions: [`${p.pid} → READY`],
        explanation: `${p.pid} has arrived at time ${this.time} and moved to the ready queue. It will now compete for CPU time.`,
        decision: 'New processes enter the READY state and join the queue. They wait for the scheduler to select them.'
      });
    });

    // 2. Check for preemption (SRTF, PRIORITY)
    // For SRTF/PRIORITY, we check AFTER arrivals to see if new process should preempt
    if (this.running && this.shouldPreempt() && this.algorithm !== Algorithm.RR) {
      this.preemptRunning('better candidate');
    }

    // 3. Dispatch if no process running
    if (!this.running) {
      this.dispatchNext();
    }

    // 4. Handle idle CPU
    if (!this.running) {
      this.pushTrace('IDLE', { 
        explanation: 'No processes in ready queue. CPU is idle and waiting for the next process to arrive.',
        decision: 'When the ready queue is empty, the CPU has nothing to execute. This is wasted CPU time!'
      });
      this.time += 1;
      return this.getSnapshot();
    }

    // 5. Execute one time unit
    this.extendGantt(this.running.pid);
    this.running.remainingTime -= 1;
    this.quantumCounter += 1;

    // 6. Check for completion
    if (this.running.remainingTime === 0) {
      this.running.state = ProcessState.TERMINATED;
      this.running.completionTime = this.time + 1;
      this.pushTrace('COMPLETE', { 
        transitions: [`${this.running.pid} → TERMINATED`],
        explanation: `${this.running.pid} has finished all its work! Completion time = ${this.time + 1}`,
        decision: 'When remaining time hits 0, the process is done. It leaves the system and frees the CPU.'
      });
      this.running = null;
      this.completedCount += 1;
      this.quantumCounter = 0;
      this.time += 1;
      return this.getSnapshot();
    }

    // 7. Check for RR quantum expiration (after execution)
    if (this.algorithm === Algorithm.RR && this.shouldPreempt()) {
      this.time += 1;
      this.preemptRunning('quantum expired');
      return this.getSnapshot();
    }

    // 8. Normal tick - process continues
    this.pushTrace('TICK', { 
      explanation: `${this.running.pid} executed for 1 time unit. Remaining time: ${this.running.remainingTime} unit(s).`,
      decision: 'The running process makes progress. Each tick reduces remaining time by 1.'
    });
    
    this.time += 1;
    return this.getSnapshot();
  }

  /**
   * Get current state snapshot for UI
   */
  getSnapshot() {
    return {
      time: this.time,
      running: this.running ? { 
        pid: this.running.pid, 
        remainingTime: this.running.remainingTime,
        burstTime: this.running.burstTime 
      } : null,
      ready: this.ready.map(p => ({ 
        pid: p.pid, 
        remainingTime: p.remainingTime, 
        priority: p.priority, 
        burstTime: p.burstTime,
        arrivalTime: p.arrivalTime
      })),
      trace: [...this.trace],
      gantt: [...this.gantt],
      processes: this.processes.map(p => ({
        pid: p.pid,
        arrivalTime: p.arrivalTime,
        burstTime: p.burstTime,
        remainingTime: p.remainingTime,
        priority: p.priority,
        state: p.state,
        completionTime: p.completionTime,
      })),
      done: this.isDone(),
    };
  }

  /**
   * Calculate final metrics after all processes complete
   */
  finalizeMetrics() {
    this.processes.forEach(p => {
      // Turnaround Time = Completion Time - Arrival Time
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      // Waiting Time = Turnaround Time - Burst Time
      p.waitingTime = p.turnaroundTime - p.burstTime;
    });

    const totals = this.processes.reduce((acc, p) => {
      acc.waiting += p.waitingTime;
      acc.turnaround += p.turnaroundTime;
      return acc;
    }, { waiting: 0, turnaround: 0 });

    return {
      processes: this.processes,
      gantt: this.gantt,
      averages: {
        waiting: Number((totals.waiting / this.processes.length).toFixed(2)),
        turnaround: Number((totals.turnaround / this.processes.length).toFixed(2)),
      },
      finalClock: this.time,
      trace: this.trace,
    };
  }

  /**
   * Run simulation to completion
   * Used for "Run to End" feature
   */
  runToEnd(maxTicks = 10000) {
    let guard = 0;
    while (!this.isDone() && guard < maxTicks) {
      this.step();
      guard += 1;
    }
    return this.finalizeMetrics();
  }
}

// Algorithm concept cards for educational display
export const ConceptCards = {
  FCFS: {
    title: 'First Come First Serve',
    shortName: 'FCFS',
    concept: 'Processes execute in the exact order they arrive, like a queue at a store. The first process to arrive gets the CPU first, and it runs until completion.',
    pros: [
      'Simplest to understand and implement',
      'Fair in a basic sense (FIFO order)',
      'No starvation - every process eventually runs',
      'Minimal overhead (no preemption)'
    ],
    cons: [
      'Convoy Effect: one long process delays all short ones behind it',
      'Poor average waiting time compared to other algorithms',
      'Not suitable for interactive systems',
      'Non-preemptive - unresponsive to urgent tasks'
    ],
    example: 'Bank teller queue - customers are served in arrival order, regardless of how quick their transaction is.',
    realWorld: 'Batch processing systems, print queues, simple embedded systems',
    complexity: 'Time: O(n), Space: O(n)',
    preemptive: false,
  },
  SJF: {
    title: 'Shortest Job First (Non-Preemptive)',
    shortName: 'SJF',
    concept: 'Always pick the process with the shortest total burst time. Once a process starts, it runs to completion without interruption.',
    pros: [
      'Optimal average waiting time for non-preemptive algorithms',
      'Short jobs complete quickly',
      'Good throughput for batch systems',
      'Predictable behavior'
    ],
    cons: [
      'Starvation: long processes may wait forever if short jobs keep arriving',
      'Requires knowing burst time in advance (often unrealistic)',
      'Non-preemptive - new short job must wait',
      'Not fair to long processes'
    ],
    example: 'Grocery express lane - quick checkouts (few items) go first.',
    realWorld: 'Batch job scheduling, task prioritization when job lengths are known',
    complexity: 'Time: O(n log n) for sorting, Space: O(n)',
    preemptive: false,
  },
  SRTF: {
    title: 'Shortest Remaining Time First (Preemptive SJF)',
    shortName: 'SRTF',
    concept: 'Like SJF, but preemptive. If a new process arrives with shorter remaining time than the current process, it takes over the CPU immediately.',
    pros: [
      'Theoretically optimal average waiting time',
      'Very responsive to short jobs',
      'Efficient CPU utilization',
      'Good for interactive systems'
    ],
    cons: [
      'High context switch overhead',
      'Severe starvation for long processes',
      'Requires continuous remaining time tracking',
      'Difficult to implement efficiently'
    ],
    example: 'Emergency room triage - patient closest to recovery gets treated first, but new critical cases can interrupt.',
    realWorld: 'Real-time systems where response time is critical',
    complexity: 'Time: O(n²) worst case, Space: O(n)',
    preemptive: true,
  },
  PRIORITY: {
    title: 'Priority Scheduling (Preemptive)',
    shortName: 'Priority',
    concept: 'Each process has a priority value. The process with highest priority (lowest number) runs first. Can preempt when higher priority arrives.',
    pros: [
      'Critical tasks get immediate attention',
      'Flexible - priorities can represent importance, deadlines, etc.',
      'Good for real-time systems',
      'Customizable to system needs'
    ],
    cons: [
      'Starvation: low-priority processes may never run',
      'Priority inversion problem',
      'Difficult to choose correct priority values',
      'Requires aging mechanism to prevent starvation'
    ],
    example: 'Hospital ER - heart attack patient (priority 1) seen before sprained ankle (priority 5).',
    realWorld: 'Operating system kernel tasks, real-time systems, network packet scheduling',
    complexity: 'Time: O(n), Space: O(n)',
    preemptive: true,
  },
  RR: {
    title: 'Round Robin',
    shortName: 'RR',
    concept: 'Each process gets a fixed time slice (quantum). After the quantum expires, the process goes to the back of the queue. Fair rotation ensures all processes make progress.',
    pros: [
      'Fairness: all processes get equal CPU time',
      'Good response time for all processes',
      'No starvation - every process guaranteed time',
      'Suitable for interactive/time-sharing systems'
    ],
    cons: [
      'Context switch overhead (especially with small quantum)',
      'Average waiting time can be high',
      'Quantum selection is critical (too small = overhead, too large = becomes FCFS)',
      'Not optimal for varying job sizes'
    ],
    example: 'Turn-based game - each player gets exactly 30 seconds per turn, then rotates.',
    realWorld: 'Time-sharing systems, modern OS process schedulers (often combined with priority)',
    complexity: 'Time: O(n), Space: O(n)',
    preemptive: true,
    quantumNote: 'Typical quantum: 10-100ms in real systems'
  },
};

// Metrics explanations for educational display
export const MetricsExplanation = {
  AT: {
    name: 'Arrival Time (AT)',
    formula: 'Given in input',
    meaning: 'When the process enters the system and becomes available for scheduling.',
    calculation: 'Specified when creating the process.',
    icon: '🚀',
  },
  BT: {
    name: 'Burst Time (BT)',
    formula: 'Given in input',
    meaning: 'Total CPU time the process needs to complete its work.',
    calculation: 'Specified when creating the process.',
    icon: '⏱️',
  },
  CT: {
    name: 'Completion Time (CT)',
    formula: 'Time when process finishes',
    meaning: 'The exact clock time when the process completes all its work and exits.',
    calculation: 'Recorded when process transitions to TERMINATED state.',
    icon: '🏁',
  },
  TAT: {
    name: 'Turnaround Time (TAT)',
    formula: 'TAT = CT - AT',
    meaning: 'Total time the process spent in the system (from arrival to completion).',
    calculation: 'Completion Time minus Arrival Time. Includes both waiting and execution.',
    icon: '🔄',
  },
  WT: {
    name: 'Waiting Time (WT)',
    formula: 'WT = TAT - BT',
    meaning: 'Time the process spent waiting in the ready queue (not executing).',
    calculation: 'Turnaround Time minus Burst Time. This is "wasted" time from the process perspective.',
    icon: '⏸️',
  },
};

// Color generation for process visualization
export const getPidColor = (pid) => {
  const colors = [
    '#3b82f6', // blue
    '#ec4899', // pink
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f43f5e', // rose
    '#14b8a6', // teal
    '#84cc16', // lime
    '#f97316', // orange
  ];
  let hash = 0;
  for (let i = 0; i < pid.length; i++) {
    hash = ((hash << 5) - hash) + pid.charCodeAt(i);
  }
  return colors[Math.abs(hash) % colors.length];
};
