import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, User, Clock, Zap, Star } from 'lucide-react';
import { getPidColor } from './SchedulerEngine';

/**
 * ProcessInput Component
 * Allows users to create, edit, and delete processes
 * Each process has: PID, Arrival Time, Burst Time, Priority
 */
const ProcessInput = ({ processes, onUpdate, onAdd, onRemove, disabled }) => {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Process Configuration</h3>
            <p className="text-xs text-neutral-400">Define processes to schedule</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAdd}
          disabled={disabled}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          Add Process
        </motion.button>
      </div>

      {/* Process List */}
      <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {processes.map((process, idx) => (
            <motion.div
              key={process.pid + idx}
              layout
              initial={{ opacity: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -100 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-slate-900/40 rounded-lg border border-white/10 overflow-hidden hover:border-white/20 transition-colors"
              style={{ borderLeftColor: getPidColor(process.pid), borderLeftWidth: '4px' }}
            >
              {/* Process Header */}
              <div className="px-5 py-4 bg-slate-800/30 flex items-center justify-between">
                <input
                  type="text"
                  value={process.pid}
                  onChange={(e) => onUpdate(idx, 'pid', e.target.value)}
                  disabled={disabled}
                  className="bg-transparent border-none text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 w-24 disabled:opacity-50"
                  placeholder="PID"
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onRemove(idx)}
                  disabled={disabled || processes.length <= 1}
                  className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={14} />
                </motion.button>
              </div>

              {/* Process Fields */}
              <div className="p-5 grid grid-cols-3 gap-4">
                {/* Arrival Time */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Clock size={12} />
                    Arrival
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={process.arrivalTime}
                    onChange={(e) => onUpdate(idx, 'arrivalTime', e.target.value)}
                    disabled={disabled}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
                  />
                </div>

                {/* Burst Time */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Zap size={12} />
                    Burst
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={process.burstTime}
                    onChange={(e) => onUpdate(idx, 'burstTime', e.target.value)}
                    disabled={disabled}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Star size={12} />
                    Priority
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={process.priority}
                    onChange={(e) => onUpdate(idx, 'priority', e.target.value)}
                    disabled={disabled}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {processes.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-slate-400"
          >
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No processes defined</p>
            <p className="text-sm">Click "Add Process" to create one</p>
          </motion.div>
        )}
      </div>

      {/* Help Text */}
      <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50">
        <p className="text-xs text-slate-400">
          💡 <strong>Tip:</strong> Try different arrival times and burst times to see how the algorithm behaves!
        </p>
      </div>
    </div>
  );
};

export default ProcessInput;
