import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock } from 'lucide-react';
import { getPidColor } from './SchedulerEngine';

/**
 * GanttChart Component
 * Visual timeline showing which process ran at which time
 * Helps visualize CPU utilization and scheduling decisions
 */
const GanttChart = ({ gantt, currentTime }) => {
  const scrollRef = useRef(null);

  // Auto-scroll to show latest execution
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [gantt]);

  if (!gantt || gantt.length === 0) {
    return (
      <div className="glass rounded-xl p-6 bg-gradient-to-br from-[#0d1224]/80 via-[#0f172a]/70 to-[#131a32]/70 border border-slate-700/70">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-white">Gantt Chart Timeline</h3>
        </div>
        <div className="text-center py-8 text-slate-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No execution data yet</p>
          <p className="text-sm">Run the simulation to see the timeline</p>
        </div>
      </div>
    );
  }

  // Calculate total time span
  const totalTime = Math.max(...gantt.map(g => g.end), currentTime || 0);
  const timeMarkers = Array.from({ length: totalTime + 1 }, (_, i) => i);

  return (
    <div className="glass rounded-xl overflow-hidden bg-gradient-to-br from-[#0d1224]/80 via-[#0f172a]/70 to-[#131a32]/70 border border-slate-700/70">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Gantt Chart Timeline</h3>
            <p className="text-xs text-slate-400">Visualizes CPU allocation over time</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="w-4 h-4" />
          <span>Total: {totalTime} units</span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-4">
        <div 
          ref={scrollRef}
          className="overflow-x-auto pb-2 custom-scrollbar"
        >
          <div className="min-w-max">
            {/* Time Markers */}
            <div className="flex mb-2">
              {timeMarkers.map(t => (
                <div 
                  key={t} 
                  className="w-12 flex-shrink-0 text-center text-xs text-slate-500 font-mono"
                >
                  {t}
                </div>
              ))}
            </div>

            {/* Gantt Bars */}
            <div className="relative h-16 bg-slate-900 rounded-lg border border-slate-600 overflow-hidden">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex">
                {timeMarkers.map(t => (
                  <div
                    key={t}
                    className="w-12 flex-shrink-0 border-r border-slate-700/50"
                  />
                ))}
              </div>

              {/* Process Segments */}
              <div className="absolute inset-0 flex">
                {gantt.map((segment, index) => {
                  const width = (segment.end - segment.start) * 48; // 48px per unit (w-12 = 3rem = 48px)
                  const left = segment.start * 48;
                  const color = getPidColor(segment.pid);

                  return (
                    <motion.div
                      key={index}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.05,
                        ease: 'easeOut'
                      }}
                      className="absolute top-2 bottom-2 rounded-md flex items-center justify-center font-bold text-sm border-2 shadow-lg cursor-pointer group"
                      style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        backgroundColor: `${color}30`,
                        borderColor: color,
                        color: color,
                        transformOrigin: 'left',
                      }}
                    >
                      <span className="truncate px-1">{segment.pid}</span>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                          <div className="text-white font-semibold">{segment.pid}</div>
                          <div className="text-slate-400">
                            Time: {segment.start} → {segment.end}
                          </div>
                          <div className="text-slate-400">
                            Duration: {segment.end - segment.start} unit(s)
                          </div>
                        </div>
                        <div 
                          className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-600"
                          style={{ marginTop: '-1px' }}
                        />
                      </div>
                    </motion.div>
                  );
                })}

                {/* Current Time Marker */}
                {currentTime !== undefined && currentTime > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: `${currentTime * 48}px` }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-red-400 font-mono whitespace-nowrap">
                      Now
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4">
              {[...new Set(gantt.map(g => g.pid))].map(pid => (
                <div key={pid} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border-2"
                    style={{ 
                      backgroundColor: `${getPidColor(pid)}30`,
                      borderColor: getPidColor(pid)
                    }}
                  />
                  <span className="text-sm text-slate-300">{pid}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50">
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <span>
            <strong className="text-slate-300">{gantt.length}</strong> context switches
          </span>
          <span>
            <strong className="text-slate-300">{[...new Set(gantt.map(g => g.pid))].length}</strong> unique processes
          </span>
          <span>
            <strong className="text-slate-300">{totalTime}</strong> total time units
          </span>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
