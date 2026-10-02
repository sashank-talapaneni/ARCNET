import { Pause, Play, RotateCcw, StepBack, StepForward } from 'lucide-react';

export default function PlaybackControls({ state, simulation }) {
  if (state.mode === 'BUILD') return null;
  return (
    <div className="playback panel">
      <button onClick={simulation.playPause} type="button">{state.simulation.running ? <Pause size={16} /> : <Play size={16} />}</button>
      <button onClick={simulation.stepBack} type="button"><StepBack size={16} /></button>
      <button onClick={simulation.stepForward} type="button"><StepForward size={16} /></button>
      <button onClick={simulation.reset} type="button"><RotateCcw size={16} /></button>
      <select value={state.simulation.speed} onChange={(event) => simulation.setSpeed(Number(event.target.value))}>
        <option value="1">1x</option><option value="2">2x</option><option value="5">5x</option><option value="10">10x</option>
      </select>
      <span className="label">{state.simulation.currentStep}/{state.simulation.totalSteps}</span>
    </div>
  );
}
