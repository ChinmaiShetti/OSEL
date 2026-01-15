import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Zap, Flag, Timer, Hourglass, Info } from 'lucide-react';
import { MetricsExplanation } from './SchedulerEngine';

/**
 * MetricsExplainer Component
 * Educational display of scheduling metrics with explanations
 * Collapsible for space efficiency
 */
const MetricsExplainer = ({ isVisible, onToggle }) => {
  const metrics = Object.entries(MetricsExplanation);

  const getIcon = (key) => {
    const icons = {
      AT: Clock,
      BT: Zap,
      CT: Flag,
      TAT: Timer,
      WT: Hourglass,
    };
    const Icon = icons[key] || Info;
    return <Icon className="w-4 h-4" />;
  };

  const getColor = (key) => {
    const colors = {
      AT: 'from-slate-500 to-slate-600',
      BT: 'from-blue-500 to-blue-600',
      CT: 'from-emerald-500 to-emerald-600',
      TAT: 'from-purple-500 to-purple-600',
      WT: 'from-amber-500 to-amber-600',
    };
    return colors[key] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
      {/* Toggle Header */}
      <motion.button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Info className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Understand the Metrics</h3>
            <p className="text-xs text-slate-400">Learn what CT, TAT, WT mean</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isVisible ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </motion.button>

      {/* Content */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {metrics.map(([key, metric], index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-900/50 rounded-lg p-4 border border-slate-600/30"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getColor(key)} flex items-center justify-center flex-shrink-0`}>
                      {getIcon(key)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{metric.icon}</span>
                        <h4 className="font-semibold text-white">{metric.name}</h4>
                      </div>
                      <div className="bg-slate-800 rounded px-2 py-1 inline-block mb-2">
                        <code className="text-xs text-emerald-400 font-mono">{metric.formula}</code>
                      </div>
                      <p className="text-sm text-slate-300">{metric.meaning}</p>
                      <p className="text-xs text-slate-400 mt-1">{metric.calculation}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Key Relationships */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-500/30"
              >
                <h4 className="font-semibold text-blue-300 mb-2">🔗 Key Relationships</h4>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>• <strong>TAT = CT - AT</strong> → How long from arrival to finish</p>
                  <p>• <strong>WT = TAT - BT</strong> → How long spent waiting (not running)</p>
                  <p>• Lower WT = Better algorithm for that workload</p>
                  <p>• Lower TAT = Processes complete faster overall</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MetricsExplainer;
