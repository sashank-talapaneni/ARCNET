import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X } from 'lucide-react';

function panelPosition(rect) {
  if (!rect) return { right: 340, bottom: 76 };
  const width = 300;
  const top = rect.top > 220 ? rect.top - 16 : rect.bottom + 12;
  return {
    left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + (rect.width / 2) - (width / 2))),
    top: rect.top > 220 ? top - 180 : top,
  };
}

export default function ExplanationPanel({ explanation, onClose, onFollowUp }) {
  const style = useMemo(() => panelPosition(explanation?.triggerRect), [explanation?.triggerRect]);
  const submit = (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.followup;
    const value = input.value.trim();
    if (!value) return;
    onFollowUp(value);
    input.value = '';
  };

  return (
    <AnimatePresence>
      {explanation && (
        <motion.div
          className="explanation-panel"
          style={style}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <button className="icon-button" onClick={onClose} type="button"><X size={14} /></button>
          <div className="label">✦ ARCNET AI</div>
          {explanation.loading ? <p className="ai-loading">Analyzing<span>.</span><span>.</span><span>.</span></p> : <p>{explanation.content}</p>}
          {!explanation.loading && (
            <form className="follow-up" onSubmit={submit}>
              <input name="followup" placeholder="Ask a follow-up..." />
              <button type="submit"><Send size={13} /></button>
            </form>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
