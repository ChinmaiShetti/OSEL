import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lightbulb, AlertCircle, Check, X, Eye, EyeOff, Zap, Clock, Info } from 'lucide-react';
import { ConceptCards } from './SchedulerEngine';

/**
 * ConceptCard Component
 * Displays educational information about the selected scheduling algorithm
 * Uses Framer Motion for smooth expand/collapse animations
 */
const ConceptCard = ({ algorithm, concept: customConcept, isVisible, onToggle }) => {
  const activeConcept = customConcept ?? ConceptCards[algorithm];

  if (!activeConcept) return null;

  return (
    <AnimatePresence mode="wait">
      {isVisible ? (
        <motion.div
          key="concept-expanded"
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="glass-effect rounded-xl overflow-hidden"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center"
                >
                  <BookOpen className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <motion.h2 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-xl font-bold text-white"
                  >
                    📚 {activeConcept.title}
                  </motion.h2>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 mt-1"
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      activeConcept.preemptive 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    }`}>
                      {activeConcept.preemptive ? '⚡ Preemptive' : '🔒 Non-Preemptive'}
                    </span>
                    <span className="text-xs text-slate-400">{activeConcept.complexity}</span>
                  </motion.div>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onToggle}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors"
              >
                <EyeOff size={18} />
              </motion.button>
            </div>

            {/* Core Concept */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-600/50"
            >
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-200 leading-relaxed">{activeConcept.concept}</p>
              </div>
            </motion.div>

            {/* Pros and Cons Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Pros */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-500/30"
              >
                <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {activeConcept.pros.map((pro, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                      className="text-sm text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-emerald-400 mt-1">•</span>
                      {pro}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {/* Cons */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-red-900/20 rounded-lg p-4 border border-red-500/30"
              >
                <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Weaknesses
                </h3>
                <ul className="space-y-2">
                  {activeConcept.cons.map((con, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                      className="text-sm text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-red-400 mt-1">•</span>
                      {con}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Real World Example */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-800/30 rounded-lg p-4 border border-slate-600/30"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wide">💡 Analogy</h4>
                  <p className="text-sm text-slate-300">{activeConcept.example}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-purple-400 mb-1 uppercase tracking-wide">🌐 Real World Use</h4>
                  <p className="text-sm text-slate-300">{activeConcept.realWorld}</p>
                </div>
              </div>
              {activeConcept.quantumNote && (
                <div className="mt-3 pt-3 border-t border-slate-600/30">
                  <p className="text-xs text-amber-300 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {activeConcept.quantumNote}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="concept-collapsed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggle}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 transition-colors"
          >
            <Eye size={16} />
            <span className="text-sm font-medium">Show Algorithm Explanation</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConceptCard;
