import { Sparkles } from 'lucide-react';

export default function AskButton({ onAsk, label = 'Explain' }) {
  return <button className="ask-button" type="button" onClick={onAsk} title={label}><Sparkles size={14} /><span>{label}</span></button>;
}
