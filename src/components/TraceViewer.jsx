import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ChevronRight, Clock, Play, Pause, RefreshCw, CheckCircle2, AlertTriangle, Zap, Info } from 'lucide-react';
import { getPidColor } from './SchedulerEngine';

/**
 * TraceViewer Component
 * Displays execution trace with educational explanations
 * Each event can be expanded to show WHY the scheduler made that decision
 */
const TraceViewer = ({ trace, maxEvents = 30 }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [filter, setFilter] = useState('all');

  // Get recent events
  const recentTrace = trace.slice(-maxEvents);
  
  // Filter events
  const filteredTrace = filter === 'all' 
    ? recentTrace 
    : recentTrace.filter(t => t.event === filter);

  const getEventIcon = (event) => {
    const icons = {
      ARRIVAL: Play,
      DISPATCH: Zap,
      PREEMPT: RefreshCw,
      COMPLETE: CheckCircle2,
      TICK: Clock,
      IDLE: Pause,
    };
    return icons[event] || Info;
  };

  const getEventColor = (event) => {
    const colors = {
      ARRIVAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      DISPATCH: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      PREEMPT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      COMPLETE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      TICK: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      IDLE: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[event] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const eventTypes = ['all', 'ARRIVAL', 'DISPATCH', 'PREEMPT', 'COMPLETE', 'TICK', 'IDLE'];

  if (trace.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
            <History className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-white">Execution Trace</h3>
        </div>
        <div className="text-center py-8 text-slate-400">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No events yet</p>
          <p className="text-sm">Click "Step" or "Play" to start the simulation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <History className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Execution Trace</h3>
            <p className="text-xs text-slate-400">Click events to see explanations</p>
          </div>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-1 flex-wrap">
          {eventTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                filter === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Event List */}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredTrace.map((event, index) => {
            const Icon = getEventIcon(event.event);
            const isExpanded = expandedIndex === index;
            const globalIndex = trace.indexOf(event);

            return (
              <motion.div
                key={`${event.time}-${event.event}-${globalIndex}`}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="border-b border-slate-700/50 last:border-b-0"
              >
                {/* Event Header */}
                <motion.button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {/* Time Badge */}
                    <div className="w-12 text-center">
                      <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                        t={event.time}
                      </span>
                    </div>

                    {/* Event Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getEventColor(event.event)}`}>
                      <Icon className="w-3 h-3" />
                      {event.event}
                    </div>

                    {/* Running Process */}
                    {event.running && (
                      <span 
                        className="text-sm font-semibold"
                        style={{ color: getPidColor(event.running) }}
                      >
                        {event.running}
                      </span>
                    )}

                    {/* Transitions */}
                    {event.transitions.length > 0 && (
                      <span className="text-xs text-slate-400 hidden md:inline">
                        {event.transitions[0]}
                      </span>
                    )}
                  </div>

                  {/* Expand Arrow */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </motion.div>
                </motion.button>

                {/* Expanded Explanation */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 ml-12">
                        <div className="bg-slate-900/70 rounded-lg p-4 border-l-2 border-blue-500 space-y-3">
                          {/* What Happened */}
                          <div>
                            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">
                              💭 What Happened
                            </h4>
                            <p className="text-sm text-slate-200">{event.explanation}</p>
                          </div>

                          {/* Why */}
                          {event.decision && (
                            <div>
                              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">
                                🤔 Why (Algorithm Logic)
                              </h4>
                              <p className="text-sm text-slate-300">{event.decision}</p>
                            </div>
                          )}

                          {/* Ready Queue State */}
                          {event.ready.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-1">
                                📋 Ready Queue at this moment
                              </h4>
                              <div className="flex gap-2 flex-wrap">
                                {event.ready.map((pid, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 rounded text-xs font-semibold bg-slate-800"
                                    style={{ color: getPidColor(pid) }}
                                  >
                                    {pid}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Showing {filteredTrace.length} of {trace.length} events
        </span>
        {trace.length > maxEvents && (
          <span className="text-xs text-amber-400">
            (Older events hidden)
          </span>
        )}
      </div>
    </div>
  );
};

export default TraceViewer;
