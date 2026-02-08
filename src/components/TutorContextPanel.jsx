import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, MessageSquare } from 'lucide-react';

const TutorContextPanel = ({ title, summary, questions = [], onAsk }) => {
  if (!title) return null;

  return (
    <div className="glass rounded-2xl border border-white/10 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Ask the OS Tutor</h3>
          <p className="text-xs text-neutral-400">{title}</p>
        </div>
      </div>
      {summary && <p className="text-sm text-slate-300">{summary}</p>}
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <motion.button
            key={question}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAsk?.(question)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs text-slate-200 hover:border-cyan-400/60"
          >
            <MessageSquare className="w-3 h-3 text-cyan-300" />
            {question}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default TutorContextPanel;
