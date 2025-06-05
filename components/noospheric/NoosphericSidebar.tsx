

import React, { useState } from 'react';
import { NoosphericGameState, NoosphericNodeData, NoosphericPlayerId, ThemeName, SystemLogEntry, TacticalAnalysisEntry } from '../../types'; 
import { AI1_NAME, AI2_NAME, THEMES } from '../../constants'; 

interface NoosphericSidebarProps {
  gameState: NoosphericGameState;
  selectedNodeId: string | null;
  isLoadingAI: NoosphericPlayerId | null;
  onOpenInfoModal: () => void;
  activeTheme?: ThemeName; 
  isGameStarted: boolean; 
  currentAiTurnDurationDisplay: string; 
  averageTurnTimeDisplay: string; 
  totalGameTimeMs?: number;
  formatDuration: (ms: number) => string;
}

const MINIMAP_SIZE = 150; 
const NODE_MINIMAP_RADIUS = 1.8;
const MINIMAP_CONNECTION_COLOR = "rgba(128, 128, 140, 0.7)"; 
const MINIMAP_CONNECTION_STROKE_WIDTH = "0.4"; 

// Helper function for connectivity check (can be defined within the component or imported)
const isNodeConnectedToFactionCN = (nodeId: string, factionId: NoosphericPlayerId, mapNodes: Record<string, NoosphericNodeData>): boolean => {
    if (!mapNodes[nodeId] || mapNodes[nodeId].owner !== factionId) return false;

    const queue: string[] = [nodeId];
    const visited: Set<string> = new Set([nodeId]);

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentNode = mapNodes[currentId];

        // If currentNode is undefined (should not happen if graph is consistent), or owner mismatch, skip.
        if (!currentNode || currentNode.owner !== factionId) continue;

        if (currentNode.isCN) return true; // Found a CN belonging to the faction

        for (const neighborId of currentNode.connections) {
            const neighborNode = mapNodes[neighborId];
            if (neighborNode && neighborNode.owner === factionId && !visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push(neighborId);
            }
        }
    }
    return false;
};


const NoosphericSidebar: React.FC<NoosphericSidebarProps> = ({ 
    gameState, selectedNodeId, isLoadingAI, onOpenInfoModal, activeTheme = 'noosphericDark', isGameStarted, currentAiTurnDurationDisplay, averageTurnTimeDisplay, totalGameTimeMs, formatDuration
}) => {
  const { turn, currentPhase, activePlayer, factions, systemLog, battleLog, mapNodes, winner } = gameState;

  const selectedNodeDetails = selectedNodeId ? mapNodes[selectedNodeId] : null;
  const totalUnitsOnSelectedNode = selectedNodeDetails ? (selectedNodeDetails.standardUnits || 0) + (selectedNodeDetails.evolvedUnits || 0) : 0;


  const PADDING_MINIMAP = NODE_MINIMAP_RADIUS * 2.5;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const nodeValues = Object.values(mapNodes);
  if (nodeValues.length > 0) {
    nodeValues.forEach(n => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
    });
  } else { 
    minX = 0; minY = 0; maxX = 100; maxY = 100; 
  }

  const mapWidth = Math.max(1, maxX - minX); 
  const mapHeight = Math.max(1, maxY - minY);
  const scaleX = (MINIMAP_SIZE - 2 * PADDING_MINIMAP) / mapWidth;
  const scaleY = (MINIMAP_SIZE - 2 * PADDING_MINIMAP) / mapHeight;
  const scale = Math.min(scaleX, scaleY);

  const factionColors = {
    'GEM-Q': THEMES[activeTheme]?.ai1TextColor || '#ef4444',
    'AXIOM': THEMES[activeTheme]?.ai2TextColor || '#22d3ee',
    'NEUTRAL': '#6b7280', 
    'KJ_NEUTRAL': THEMES[activeTheme]?.neutralKJColor || '#eab308',
  };

  const renderFactionPanel = (factionId: 'GEM-Q' | 'AXIOM') => {
    const faction = factions[factionId];
    const isFactionLoading = isLoadingAI === factionId;
    const isFactionActive = isGameStarted && activePlayer === factionId && (currentPhase === 'MANEUVER' || currentPhase === 'COMBAT') && !winner; 
    const borderColorClass = factionId === 'GEM-Q' ? 'border-[var(--color-ai1-text)]' : 'border-[var(--color-ai2-text)]';
    
    let totalQROutputThisTurn = 0;
    if (isGameStarted) {
        Object.values(mapNodes).forEach(node => {
            if (node.owner === factionId && isNodeConnectedToFactionCN(node.id, factionId, mapNodes)) {
                totalQROutputThisTurn += node.qrOutput;
            }
        });
    }
    
    return (
      <div className={`p-2.5 rounded border-2 ${borderColorClass} ${isFactionLoading && !faction.aiError ? 'animate-pulse' : ''} bg-[var(--color-bg-terminal)] bg-opacity-50 flex flex-col`}>
        <h3 className={`text-md font-semibold mb-1 ${factionId === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]'}`}>
          {faction.name} {isFactionLoading && !faction.aiError ? '(Thinking...)' : isFactionActive ? '(Active)' : ''}
        </h3>
        <div className="grid grid-cols-2 gap-x-2 text-xs mb-1.5">
            <div> {/* Left Column */}
                <p>QR: <span className="font-bold text-[var(--color-text-heading)]">{faction.qr}</span></p>
                <p>Nodes: <span className="font-bold text-[var(--color-text-heading)]">{faction.nodesControlled}</span></p>
                <p>KJs Held: <span className="font-bold text-[var(--color-text-heading)]">{faction.kjsHeld}</span></p>
                <p>QR/Turn: <span className="font-bold text-green-400">{totalQROutputThisTurn}</span></p>
            </div>
            <div> {/* Right Column */}
                <p>Total Units: <span className="font-bold text-[var(--color-text-heading)]">{faction.totalUnits}</span></p>
                <p>Std Units: <span className="font-bold text-[var(--color-text-base)]">{faction.totalStandardUnits}</span></p>
                <p>Evl Units: <span className="font-bold text-purple-400">{faction.totalEvolvedUnits}</span></p>
                <p>Hubs Active: <span className="font-bold text-cyan-400">{faction.activeHubsCount}</span></p>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-x-2 text-xs"> {/* Removed mb-1.5 from here */}
             <p>Success Phases: <span className="font-bold text-green-400">{faction.successfulPhases}</span></p>
             <p>Failed Phases: <span className="font-bold text-red-400">{faction.failedPhases}</span></p>
        </div>
        {/* Current Tactical Analysis section removed here */}
      </div>
    );
  };

  const getSystemLogPrefixAndContext = (entry: SystemLogEntry): string => {
    const { type, source, turn: entryTurn, phase: entryPhase } = entry;
    let prefixHtml = "";
    let mainColorClass = "text-[var(--color-text-muted)]";

    if (type === 'ERROR') {
      prefixHtml = `<span class="text-[var(--color-error)] mr-1">[!]</span>`;
      mainColorClass = "text-[var(--color-error)]";
    } else if (source === 'GEM-Q' && type === 'AI_ACTION') {
      prefixHtml = `<span class="text-[var(--color-ai1-text)] mr-1">♦</span>`;
      mainColorClass = "text-[var(--color-ai1-text)] opacity-90";
    } else if (source === 'AXIOM' && type === 'AI_ACTION') {
      prefixHtml = `<span class="text-[var(--color-ai2-text)] mr-1">▲</span>`;
      mainColorClass = "text-[var(--color-ai2-text)] opacity-90";
    } else if (type === 'EVENT') {
      prefixHtml = `<span class="text-[var(--color-system-message)] mr-1">§</span>`;
      mainColorClass = "text-[var(--color-system-message)]";
    } else { // INFO or other
      prefixHtml = `<span class="text-[var(--color-info)] mr-1">(i)</span>`;
       mainColorClass = "text-[var(--color-text-muted)]"; // Default to muted for info not covered
    }

    let contextHtml = "";
    if (type === 'AI_ACTION' && source) {
        // Make turn/phase context slightly less prominent
        contextHtml = ` <span class="opacity-60 text-[0.9em]">[T${entryTurn}, ${entryPhase.substring(0,4)}]</span> `;
    }
    
    // Combine prefix, context, and message with appropriate coloring
    return `<span class="${mainColorClass}">${prefixHtml}${contextHtml}${entry.message}</span>`;
  };


  return (
    <aside className="w-full md:w-1/3 lg:w-[320px] flex flex-col gap-2 overflow-y-auto p-1 bg-[var(--color-bg-panel)] rounded-md shadow-lg log-display">
      {/* Turn & Phase Info */}
      <div className="p-2.5 border-b-2 border-[var(--color-border-strong)] flex-shrink-0 bg-[var(--color-bg-terminal)] bg-opacity-50 rounded-t-md">
        {isGameStarted ? (
          <>
            <div className="flex justify-between items-center">
                <p className="text-sm font-semibold">
                Turn: <span className="text-[var(--color-text-heading)]">{turn}</span> 
                {gameState.currentPhase !== 'GAME_OVER' && 
                    <span className={`ml-1 ${activePlayer === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]'}`}>
                    ({activePlayer === AI1_NAME ? AI1_NAME : AI2_NAME})
                    </span>
                }
                </p>
                <div className="flex items-center text-xs text-[var(--color-text-muted)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                    </svg>
                    <span>{currentAiTurnDurationDisplay}</span>
                </div>
            </div>
            <p className="text-sm">Phase: <span className="text-[var(--color-accent-300)] font-semibold">{currentPhase}</span></p>
            { gameState.currentPhase !== 'GAME_OVER' &&
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Avg Turn: {averageTurnTimeDisplay}</p>
            }
            { (winner || gameState.currentPhase === 'GAME_OVER') && 
                <p className="text-md font-bold mt-1 text-center" style={{color: winner === 'GEM-Q' ? factionColors['GEM-Q'] : winner === 'AXIOM' ? factionColors['AXIOM'] : factionColors.NEUTRAL }}>
                    {
                      winner === 'DRAW' ? 'Game is a DRAW!' :
                      winner === 'GEM-Q' ? `${AI1_NAME} WINS!` :
                      winner === 'AXIOM' ? `${AI2_NAME} WINS!` :
                      winner === 'NEUTRAL' ? 'Neutral Outcome' :
                      'Game Over'
                    }
                </p>
            }
             {gameState.currentPhase === 'GAME_OVER' && totalGameTimeMs !== undefined && (
                <p className="text-xs text-center text-[var(--color-info)] mt-0.5">Total Game Time: {formatDuration(totalGameTimeMs)}</p>
            )}
          </>
        ) : (
          <p className="text-sm font-semibold text-center text-[var(--color-text-muted)]">Game Not Started</p>
        )}
      </div>

      {/* Minimap or Node Details */}
      <div className="p-2.5 border-b-2 border-[var(--color-border-strong)] h-[210px] flex-shrink-0 flex flex-col bg-[var(--color-bg-terminal)] bg-opacity-50">
        {selectedNodeDetails ? (
          <>
            <h4 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1 flex-shrink-0">Node Info: {selectedNodeDetails.regionName} ({selectedNodeDetails.label || selectedNodeDetails.id})</h4>
            <div className="text-xs space-y-0.5 overflow-y-auto log-display pr-1 flex-grow custom-scrollbar">
                <p>Type: <span className="font-semibold">{selectedNodeDetails.isCN ? 'CN' : selectedNodeDetails.isKJ ? 'KJ' : 'QN'}</span></p>
                <p>Owner: <span className={`font-bold ${selectedNodeDetails.owner === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : selectedNodeDetails.owner === 'AXIOM' ? 'text-[var(--color-ai2-text)]' : 'text-[var(--color-text-muted)]'}`}>{mapNodes[selectedNodeDetails.id]?.owner || 'Unknown'}</span></p>
                <p>QR/Turn: <span className="font-semibold">{selectedNodeDetails.qrOutput}</span></p>
                {selectedNodeDetails.hasFabricationHub && (
                  <>
                    <p>Fab. Hub: <span className={`font-semibold ${selectedNodeDetails.isHubActive ? 'text-green-400' : 'text-yellow-400'}`}>
                      {selectedNodeDetails.isHubActive ? 'Active' : 'Inactive'}
                      {selectedNodeDetails.hubDisconnectedTurn && !selectedNodeDetails.isHubActive && ` (Disconnected - Grace Turn: ${selectedNodeDetails.hubDisconnectedTurn})`}
                      {selectedNodeDetails.hubDisconnectedTurn && selectedNodeDetails.isHubActive && ` (Grace Period Active - Disconnected Turn: ${selectedNodeDetails.hubDisconnectedTurn})`}
                    </span></p>
                  </>
                )}
                 {!selectedNodeDetails.hasFabricationHub && (
                     <p>Fab. Hub: <span className="font-semibold text-[var(--color-text-muted)]">N/A</span></p>
                 )}
                <hr className="border-[var(--color-border-strong)] opacity-30 my-1.5"/>
                <p className="font-semibold text-[var(--color-text-heading)]">Units Present ({totalUnitsOnSelectedNode}):</p>
                <p>Standard: <span className="font-bold">{selectedNodeDetails.standardUnits || 0}</span></p>
                <p>Evolved: <span className="font-bold text-purple-400">{selectedNodeDetails.evolvedUnits || 0}</span></p>
                
                <p className="mt-1">Max Units: {selectedNodeDetails.maxUnits || 'N/A'}</p>
                <p>Connections: {selectedNodeDetails.connections.map(id => mapNodes[id]?.label || id).join(', ')}</p>
            </div>
          </>
        ) : (
          <>
            <h4 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1 text-center flex-shrink-0">Minimap</h4>
            <div className="flex justify-center items-center flex-grow my-1">
                <svg width={MINIMAP_SIZE} height={MINIMAP_SIZE} viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`} className="bg-black border border-[var(--color-border-base)] rounded">
                {/* Connections first */}
                {nodeValues.map(node =>
                    node.connections.map(connId => {
                    const targetNode = nodeValues.find(n => n.id === connId);
                    if (targetNode && node.id < targetNode.id) { 
                        const x1 = ((node.x - minX) * scale) + PADDING_MINIMAP;
                        const y1 = ((node.y - minY) * scale) + PADDING_MINIMAP;
                        const x2 = ((targetNode.x - minX) * scale) + PADDING_MINIMAP;
                        const y2 = ((targetNode.y - minY) * scale) + PADDING_MINIMAP;
                        return (
                        <line 
                            key={`mini-conn-${node.id}-${connId}`} 
                            x1={x1} y1={y1} x2={x2} y2={y2} 
                            stroke={MINIMAP_CONNECTION_COLOR} 
                            strokeWidth={MINIMAP_CONNECTION_STROKE_WIDTH}
                        />
                        );
                    }
                    return null;
                    })
                )}
                {/* Nodes on top */}
                {nodeValues.map(node => {
                    const cx = ((node.x - minX) * scale) + PADDING_MINIMAP;
                    const cy = ((node.y - minY) * scale) + PADDING_MINIMAP;
                    let color = factionColors[node.owner] || factionColors['NEUTRAL'];
                    if (node.isKJ && node.owner === 'NEUTRAL') color = factionColors['KJ_NEUTRAL'];
                    else if (node.isKJ) color = factionColors[node.owner] || factionColors['KJ_NEUTRAL']; 
                    
                    return (
                    <circle 
                        key={`mini-${node.id}`} 
                        cx={cx} 
                        cy={cy} 
                        r={NODE_MINIMAP_RADIUS * (node.isCN || node.isKJ ? 1.5 : 1) }
                        fill={color} 
                    />
                    );
                })}
                </svg>
            </div>
            <p className="text-xs text-center mt-1 text-[var(--color-text-muted)] flex-shrink-0">Click on a map node to view details.</p>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-2 p-2.5 border-b-2 border-[var(--color-border-strong)] flex-shrink-0">
        {renderFactionPanel('GEM-Q')}
        {renderFactionPanel('AXIOM')}
      </div>

      <div className="p-2.5 flex-grow min-h-[150px] flex flex-col border-b-2 border-[var(--color-border-strong)] bg-[var(--color-bg-terminal)] bg-opacity-50">
        <h4 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1 flex-shrink-0">System Log</h4>
        <ul className="text-xs space-y-0.5 overflow-y-auto flex-grow log-display pr-1 custom-scrollbar">
          {systemLog.slice().reverse().map(entry => (
            <li key={entry.id} className="leading-snug"
                dangerouslySetInnerHTML={{ __html: getSystemLogPrefixAndContext(entry) }}
            />
          ))}
        </ul>
      </div>

      <div className="p-2.5 flex-grow min-h-[120px] flex flex-col bg-[var(--color-bg-terminal)] bg-opacity-50 rounded-b-md">
        <div className="flex justify-between items-center mb-1 flex-shrink-0">
            <h4 className="text-sm font-semibold text-[var(--color-text-heading)]">Battle History (Last 5)</h4>
            <button 
                onClick={onOpenInfoModal} 
                title="About Noospheric Conquest Mode"
                className="p-1 rounded-full hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
                aria-label="Show information about Noospheric Conquest mode"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[var(--color-accent-300)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </button>
        </div>
        <ul className="text-xs space-y-1 overflow-y-auto flex-grow log-display pr-1 custom-scrollbar">
          {battleLog.length === 0 && <li className="italic text-[var(--color-text-muted)]">No battles recorded yet.</li>}
          {battleLog.slice(-5).reverse().map(entry => (
            <li key={entry.id} className="border-t border-dashed border-[var(--color-border-strong)] pt-1">
              <p>T{entry.turn}: {mapNodes[entry.nodeId]?.label || entry.nodeId} ({mapNodes[entry.nodeId]?.regionName || 'Unknown Region'})</p>
              <p><span className={entry.attacker === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]'}>{entry.attacker}</span> vs <span className={entry.defender === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : entry.defender === 'AXIOM' ? 'text-[var(--color-ai2-text)]' : 'text-[var(--color-text-muted)]'}>{entry.defender}</span></p>
              <p>Outcome: <span className={entry.outcome.includes("ATTACKER") ? 'text-[var(--color-system-message)]' : 'text-[var(--color-info)]'}>{entry.outcome.replace('_', ' ')}{entry.nodeCaptured ? ' (Node Captured)' : ''}</span></p>
              <p>Losses A/D: {entry.attackerLosses}/{entry.defenderLosses}</p>
            </li>
          ))}
        </ul>
      </div>
       <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-scrollbar-track);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-scrollbar-thumb);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-scrollbar-thumb-hover);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: var(--color-scrollbar-thumb) var(--color-scrollbar-track);
        }
      `}</style>
    </aside>
  );
};

export default NoosphericSidebar;
