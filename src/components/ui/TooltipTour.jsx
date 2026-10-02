export default function TooltipTour({ state, dispatch }) {
  if (state.onboarding.completed) return null;
  const copy = [
    'Start with the adjacency matrix. Positive numbers create weighted directed links.',
    'Choose which routing algorithms to run simultaneously.',
    'Set packet source and destination, then hit Run.',
    'Watch metrics and pseudocode update while ARCNET explains context.',
  ];
  return (
    <div className="tour panel">
      <div className="label">Quick Tour</div>
      <p>{copy[state.onboarding.currentStep] || copy[0]}</p>
      <button onClick={() => state.onboarding.currentStep >= 3 ? dispatch({ type: 'COMPLETE_ONBOARDING' }) : dispatch({ type: 'NEXT_ONBOARDING' })}>{state.onboarding.currentStep >= 3 ? 'Start' : 'Next'}</button>
      <button onClick={() => dispatch({ type: 'COMPLETE_ONBOARDING' })}>Skip</button>
    </div>
  );
}
