import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { renderMarkdown } from '../../utils/renderMarkdown.jsx';

export default function GlobalAssistant({ ai }) {
  const conversationEndRef = useRef(null);

  const submit = (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    const message = input.value.trim();
    if (!message) return;
    ai.askGlobal(message);
    input.value = '';
  };

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'Escape') ai.closeGlobalAssistant();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ai]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ai.globalHistory, ai.isGlobalLoading]);

  return (
    <>
      <AnimatePresence>
        {ai.globalAssistantOpen && (
          <motion.section
            className="assistant-conversation-panel"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
          >
            <header className="assistant-header">
              <span>✦ ARCNET AI</span>
              <button type="button" onClick={ai.closeGlobalAssistant}>✕ Close</button>
            </header>
            <div className="assistant-history">
              {ai.globalHistory.map((item, i) => (
                <div key={`${item.role}-${i}`} className={`assistant-message ${item.role}`}>
                  <b>{item.role === 'assistant' ? '✦' : 'You'}</b>
                  {item.role === 'assistant' ? renderMarkdown(item.content) : item.content}
                </div>
              ))}
              {ai.isGlobalLoading && <div className="assistant-loading"><b>✦</b>Analyzing...</div>}
              <div ref={conversationEndRef} />
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      <form className="global-assistant" onSubmit={submit}>
        <span className="assistant-mark">✦</span>
        <input name="message" placeholder="Ask ARCNET anything about this simulation..." onFocus={ai.openGlobalAssistant} />
        <button type="submit"><Send size={14} /></button>
        <small>Enter ↵</small>
      </form>
    </>
  );
}
