import React from 'react';

interface CoTDisplayProps {
  title: string;
  cot: string;
  isLoading: boolean;
  playerNameColor: string; // e.g. "text-[var(--color-ai1-text)]"
}

const CoTDisplay: React.FC<CoTDisplayProps> = ({ title, cot, isLoading, playerNameColor }) => {
  return (
    <div className="bg-[var(--color-bg-terminal)] border-2 border-[var(--color-border-base)] shadow-md p-3 h-64 flex flex-col"> {/* Changed h-48 to h-64 */}
      <h3 className={`text-sm font-bold border-b border-[var(--color-border-strong)] pb-1 mb-2 ${playerNameColor}`}>
        {title} - Chain of Thought
      </h3>
      <div className="text-xs text-[var(--color-text-muted)] overflow-y-auto flex-grow log-display pr-1">
        {isLoading && <p className="animate-pulse">Analyzing position...</p>}
        {!isLoading && cot && <p className="whitespace-pre-wrap break-words">{cot}</p>}
        {!isLoading && !cot && <p>Awaiting first move analysis...</p>}
      </div>
    </div>
  );
};

export default CoTDisplay;