import React from 'react';
import { 
    LucideSwords, LucideShield, LucideZap, LucideAtom, LucideBrain,
    LucideDollarSign, LucideDice5, LucideHelpCircle, LucideMove, LucidePlusCircle,
    LucideAlertTriangle, LucideInfo, LucideMapPin, LucideTarget, LucideFactory, LucideBox,
    LucideShuffle, LucideGlobe, LucideMap, LucideX, LucideScrollText, LucideArrowLeftToLine
} from 'lucide-react';
import { QuantumUnitType, PlayerId, QuantumUnit, QuantumGambitNode, BattleReport, NoosphericConquestGameState, CombatRoundLog } from '../../types';
import { AI1_ID, AI2_ID, NC_UNIT_DEFINITIONS, THEME_COLORS as THEME_COLORS, MAX_BATTLE_HISTORY_LENGTH, NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED, NOOSPHERIC_CONQUEST_TURN_LIMIT, getUnitIcon } from './constants';

export const SystemIcon: React.FC = () => (
  <LucideAtom size={16} className={`${THEME_COLORS.SYSTEM}`}/>
);

export const LogicCoreIcon: React.FC<{ size?: number }> = ({ size = 16 }) => <LucideSwords size={size} />;
export const ShieldingNodeIcon: React.FC<{ size?: number }> = ({ size = 16 }) => <LucideShield size={size} />;
export const QuantumEntanglerIcon: React.FC<{ size?: number }> = ({ size = 16 }) => <LucideZap size={size} />;

export const CoTDisplay: React.FC<{ title: string; cot: string; isLoading: boolean; playerNameColor: string }> = ({ title, cot, isLoading, playerNameColor }: { title: string; cot: string; isLoading: boolean; playerNameColor: string }) => (
  <div className={`p-3 h-32 md:h-40 flex flex-col ${THEME_COLORS.BG_PANEL} border ${THEME_COLORS.BORDER_BASE} rounded-md shadow-md`}>
    <h3 className={`text-sm font-semibold border-b ${THEME_COLORS.BORDER_STRONG} pb-1 mb-2 ${playerNameColor}`}>
      {title} - Tactical Analysis
    </h3>
    <div className={`text-xs ${THEME_COLORS.TEXT_MUTED} overflow-y-auto flex-grow pr-1 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700`}>
      {isLoading && <p className="animate-pulse">Calculating optimal vector...</p>}
      {!isLoading && cot && <p className="whitespace-pre-wrap break-words">{cot}</p>}
      {!isLoading && !cot && <p>Awaiting directives...</p>}
    </div>
  </div>
);

export const UnitIcon: React.FC<{type: QuantumUnitType, owner: PlayerId | 'NEUTRAL', size?: number, count?: number}> = ({ type, owner, size = 4, count }: {type: QuantumUnitType, owner: PlayerId | 'NEUTRAL', size?: number, count?: number}) => {
    const def = NC_UNIT_DEFINITIONS[type];
    const ownerColorClass = owner === 'NEUTRAL' ? THEME_COLORS.NEUTRAL.text : owner === AI1_ID ? THEME_COLORS.AI1.text : THEME_COLORS.AI2.text;
    return (
        <div className={`flex items-center ${ownerColorClass} scale-75 md:scale-90`} title={`${def?.name || type}${count ? ' x'+count : ''}`}>
            {React.cloneElement(getUnitIcon(type), { size: size*4 })} 
            {count && count > 1 && <span className="ml-1 text-xs">x{count}</span>}
        </div>
    );
};


export const QuantumGambitMapDisplay: React.FC<{ gameState: NoosphericConquestGameState, onNodeClick: (nodeId: string) => void, selectedNodeId: string | null }> = ({ gameState, onNodeClick, selectedNodeId }: { gameState: NoosphericConquestGameState, onNodeClick: (nodeId: string) => void, selectedNodeId: string | null }) => {
  const { nodes, units } = gameState;
  const mapSize = { width: 600, height: 400 }; 

  return (
    <div className={`relative ${THEME_COLORS.BG_PANEL} border-2 ${THEME_COLORS.BORDER_STRONG} rounded-lg shadow-2xl p-2 overflow-hidden aspect-[3/2]`}>
      <svg viewBox={`0 0 ${mapSize.width} ${mapSize.height}`} className="w-full h-full" aria-label="Noospheric Conquest Main Map">
        {Object.values(nodes).map((node: QuantumGambitNode) =>
          node.connections.map((connId: string) => {
            const targetNode = nodes[connId];
            if (targetNode && node.mapPosition && targetNode.mapPosition && node.id < targetNode.id) {
                const isSevered = gameState.activeFluctuationEvent?.effectType === "SEVER_CONNECTION" &&
                                  ((gameState.activeFluctuationEvent.targetNodeIds?.includes(node.id) && gameState.activeFluctuationEvent.targetNodeIds?.includes(targetNode.id)));
                return (
                  <line key={`${node.id}-${targetNode.id}`}
                    x1={`${node.mapPosition.x}%`} y1={`${node.mapPosition.y}%`}
                    x2={`${targetNode.mapPosition.x}%`} y2={`${targetNode.mapPosition.y}%`}
                    className={`stroke-current ${isSevered ? 'text-orange-500 stroke-2 animate-pulse' : 'text-gray-600 opacity-70'} transition-all duration-300`}
                    strokeWidth={isSevered ? 3 : 1.5} strokeDasharray={isSevered ? "4 2" : "none"} />
                );
            } return null;
          })
        )}
        {Object.values(nodes).map((node: QuantumGambitNode) => {
          const nodeUnits = Object.values(units).filter((u: QuantumUnit) => u.nodeId === node.id).sort((a: QuantumUnit,b: QuantumUnit) => a.displayOrder - b.displayOrder);
          const ownerThemeColors = node.owner === AI1_ID ? THEME_COLORS.AI1 : node.owner === AI2_ID ? THEME_COLORS.AI2 : THEME_COLORS.NEUTRAL;
          const isSelected = node.id === selectedNodeId;
          const isKJObjective = node.isKeyJunctionObjective;

          return (
            <g key={node.id} transform={`translate(${node.mapPosition.x * mapSize.width / 100}, ${node.mapPosition.y * mapSize.height / 100})`}
               onClick={() => onNodeClick(node.id)} className="cursor-pointer group" role="button" aria-label={`Node ${node.name} (${node.type}), Owner: ${node.owner === 'NEUTRAL' ? 'Neutral' : gameState.players[node.owner as PlayerId]?.name || 'Unknown'}`}>
              <circle r={node.type === 'CN' ? 18 : node.type === 'KJ' ? 15 : 12}
                className={`${ownerThemeColors.bg} ${ownerThemeColors.border} border-2 group-hover:opacity-100 transition-all duration-300 `}
                stroke={node.type === 'KJ' ? THEME_COLORS.KJ_STROKE : node.type === 'CN' ? THEME_COLORS.CN_STROKE : ownerThemeColors.border} strokeWidth={2} fill={ownerThemeColors.fill} />
               
               {isSelected && <circle r={node.type === 'CN' ? 22 : node.type === 'KJ' ? 19 : 16} className="fill-none stroke-current text-yellow-300 animate-pulse" strokeWidth={2}/>}
               
               <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" className={`font-bold ${THEME_COLORS.TEXT_HEADING} pointer-events-none`} style={{ fontSize: node.type === 'CN' ? '8px' : node.type === 'KJ' ? '7px' : '6px' }}>
                   {node.name.substring(0, node.type === 'CN' ? 4 : node.type === 'KJ' ? 3 : 4)}{node.name.length > (node.type === 'CN' ? 4 : node.type === 'KJ' ? 3 : 4) ? '..' : ''}
               </text>

               <g transform={`translate(0, ${node.type === 'CN' ? 25 : node.type === 'KJ' ? 20 : 17})`}>
                   {nodeUnits.map((unit: QuantumUnit, unitIndex: number) => (
                       <g key={unit.id} transform={`translate(${-nodeUnits.length * 6 + unitIndex * 12}, 0)`}>
                           <UnitIcon type={unit.type} owner={unit.owner} size={3} />
                       </g>
                   ))}
               </g>

            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const MiniMapDisplay: React.FC<{ gameState: NoosphericConquestGameState, onNodeClick: (nodeId: string) => void, selectedNodeId: string | null }> = ({ gameState, onNodeClick, selectedNodeId }: { gameState: NoosphericConquestGameState, onNodeClick: (nodeId: string) => void, selectedNodeId: string | null }) => {
    const { nodes } = gameState;
    const mapSize = { width: 200, height: 133 }; 

    return (
        <div className={`relative ${THEME_COLORS.BG_PANEL} border ${THEME_COLORS.BORDER_BASE} rounded-md shadow-lg p-1 aspect-[3/2]`}>
            <svg viewBox={`0 0 ${mapSize.width} ${mapSize.height}`} className="w-full h-full">
                 {Object.values(nodes).map((node: QuantumGambitNode) =>
                    node.connections.map((connId: string) => {
                        const targetNode = nodes[connId];
                        if (targetNode && node.mapPosition && targetNode.mapPosition && node.id < targetNode.id) {
                            return ( <line key={`${node.id}-${targetNode.id}-mini`}
                                x1={`${node.mapPosition.x}%`} y1={`${node.mapPosition.y}%`}
                                x2={`${targetNode.mapPosition.x}%`} y2={`${targetNode.mapPosition.y}%`}
                                className={`stroke-current text-gray-700 opacity-50`} strokeWidth={0.5} />
                            );
                        } return null;
                    })
                )}
                {Object.values(nodes).map((node: QuantumGambitNode) => {
                    const ownerTheme = node.owner === AI1_ID ? THEME_COLORS.AI1 : node.owner === AI2_ID ? THEME_COLORS.AI2 : THEME_COLORS.NEUTRAL;
                    const isSelectedOnMainMap = node.id === selectedNodeId;
                    let radius = 3;
                    let strokeClass = node.type === 'KJ' ? THEME_COLORS.KJ_STROKE : node.type === 'CN' ? THEME_COLORS.CN_STROKE : ownerTheme.border;
                    let strokeWidth = node.type === 'CN' || node.type === 'KJ' ? 1 : 0.5;

                    return (
                        <g key={`${node.id}-mini`} transform={`translate(${node.mapPosition.x * mapSize.width / 100}, ${node.mapPosition.y * mapSize.height / 100})`}
                           onClick={() => onNodeClick(node.id)} className="cursor-pointer">
                            <circle r={radius} className={`${ownerTheme.fill} ${strokeClass}`} strokeWidth={strokeWidth} opacity={isSelectedOnMainMap ? 1 : 0.8}/>
                            {isSelectedOnMainMap && <circle r={radius + 1.5} className="fill-none stroke-current text-yellow-300 animate-pulseSlow" strokeWidth={0.7}/>}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export const NodeInfoPanel: React.FC<{ gameState: NoosphericConquestGameState, selectedNodeId: string | null }> = ({ gameState, selectedNodeId }: { gameState: NoosphericConquestGameState, selectedNodeId: string | null }) => {
    if (!selectedNodeId) {
        return (
            <div className={`${THEME_COLORS.BG_PANEL} border ${THEME_COLORS.BORDER_BASE} p-3 rounded shadow-md h-full flex items-center justify-center`}>
                <p className={`${THEME_COLORS.TEXT_MUTED} text-xs italic`}>Click on a node to view details.</p>
            </div>
        );
    }
    const node = gameState.nodes[selectedNodeId];
    if (!node) return <div className={`${THEME_COLORS.BG_PANEL} p-3 rounded`}><p className={THEME_COLORS.ERROR}>Error: Node data not found.</p></div>;

    const nodeUnits = Object.values(gameState.units).filter((u: QuantumUnit) => u.nodeId === selectedNodeId).sort((a: QuantumUnit,b: QuantumUnit) => a.displayOrder - b.displayOrder);
    const ownerTheme = node.owner === AI1_ID ? THEME_COLORS.AI1 : node.owner === AI2_ID ? THEME_COLORS.AI2 : THEME_COLORS.NEUTRAL;

    return (
        <div className={`${THEME_COLORS.BG_PANEL} border ${THEME_COLORS.BORDER_BASE} p-3 rounded shadow-md h-full flex flex-col text-xs`}>
            <h3 className={`text-sm font-semibold ${ownerTheme.text} border-b ${THEME_COLORS.BORDER_STRONG} pb-1 mb-2 flex items-center`}>
                <LucideMapPin size={16} className="mr-2"/> Node Info: {node.name} ({node.id})
            </h3>
            <p><strong className={THEME_COLORS.TEXT_HEADING}>Type:</strong> {node.type} {node.isKeyJunctionObjective && <span className={THEME_COLORS.KJ_STROKE}>(Key Junction)</span>}</p>
            <p><strong className={THEME_COLORS.TEXT_HEADING}>Owner:</strong> <span className={ownerTheme.text}>{node.owner === 'NEUTRAL' ? 'Neutral' : gameState.players[node.owner]?.name || 'Unknown'}</span></p>
            <p><strong className={THEME_COLORS.TEXT_HEADING}>QR/Turn:</strong> {node.resourcesPerTurn}</p>
            <p><strong className={THEME_COLORS.TEXT_HEADING}>Fabrication Hub:</strong> {node.hasFabricationHub ? <span className="text-green-400">Active</span> : <span className="text-gray-500">Inactive</span>}</p>
            
            <h4 className={`mt-2 mb-1 text-xs font-semibold ${THEME_COLORS.TEXT_HEADING} border-t ${THEME_COLORS.BORDER_BASE} pt-1`}>Units Present ({nodeUnits.length}):</h4>
            {nodeUnits.length > 0 ? (
                <ul className="space-y-0.5 overflow-y-auto max-h-24 scrollbar-thin">
                    {nodeUnits.map((unit: QuantumUnit) => (
                        <li key={unit.id} className="flex items-center">
                            <UnitIcon type={unit.type} owner={unit.owner} size={3}/>
                            <span className="ml-1">{NC_UNIT_DEFINITIONS[unit.type].name} ({unit.owner}) - ID: ...{unit.id.slice(-3)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="italic opacity-70">No units stationed.</p>
            )}
            {node.temporaryEffects && node.temporaryEffects.length > 0 && (
                 <h4 className={`mt-2 mb-1 text-xs font-semibold ${THEME_COLORS.TEXT_HEADING} border-t ${THEME_COLORS.BORDER_BASE} pt-1`}>Active Effects:</h4>
                // ... list effects
            )}
        </div>
    );
};


export const BattlePopup: React.FC<{ report: BattleReport | null, onClose: () => void, gameState: NoosphericConquestGameState }> = ({ report, onClose, gameState }: { report: BattleReport | null, onClose: () => void, gameState: NoosphericConquestGameState }) => {
    if (!report) return null;
    const attackerColor = report.attacker === AI1_ID ? THEME_COLORS.AI1.text : THEME_COLORS.AI2.text;
    const defenderColor = report.defender === AI1_ID ? THEME_COLORS.AI1.text : (report.defender === AI2_ID ? THEME_COLORS.AI2.text : THEME_COLORS.NEUTRAL.text);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className={`${THEME_COLORS.BG_PANEL} border-2 ${THEME_COLORS.BORDER_STRONG} rounded-lg shadow-xl p-4 md:p-6 max-w-md md:max-w-lg w-full text-xs md:text-sm`}>
                <h2 className={`text-lg md:text-xl font-bold mb-3 text-center ${THEME_COLORS.TEXT_HEADING}`}>Battle: {gameState.nodes[report.fromNodeId]?.name} <LucideSwords size={18} className="inline mx-1"/> {gameState.nodes[report.toNodeId]?.name}</h2>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <h3 className={`font-semibold ${attackerColor}`}>Attacker: {gameState.players[report.attacker].name}</h3>
                        <p>Committed: {report.attackingUnitsCommitted.map((u: QuantumUnit) => u.type).join(', ')}</p>
                        <p className={`${THEME_COLORS.ERROR}`}>Losses: {report.attackerLosses.length > 0 ? report.attackerLosses.map((u: QuantumUnit) => u.type).join(', ') : 'None'}</p>
                    </div>
                    <div>
                        <h3 className={`font-semibold ${defenderColor}`}>Defender: {report.defender === 'NEUTRAL' ? 'Neutral Forces' : gameState.players[report.defender]?.name || 'Unknown Player'}</h3>
                        <p>Defending: {report.defendingUnitsInitial.map((u: QuantumUnit) => u.type).join(', ')}</p>
                        <p className={`${THEME_COLORS.ERROR}`}>Losses: {report.defenderLosses.length > 0 ? report.defenderLosses.map((u: QuantumUnit) => u.type).join(', ') : 'None'}</p>
                    </div>
                </div>
                <div className={`mt-3 p-2 border ${THEME_COLORS.BORDER_BASE} rounded max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800`}>
                    <h4 className={`font-semibold mb-2 ${THEME_COLORS.TEXT_HEADING}`}>Combat Log:</h4>
                    {report.combatLog && report.combatLog.length > 0 ? (
                        report.combatLog.map((log: CombatRoundLog, index: number) => (
                            <div key={`combat-round-${index}`} className={`mb-1 p-1 border rounded ${THEME_COLORS.BORDER_BASE} opacity-90 text-[9px] md:text-[10px]`}>
                                <p><strong>Round {log.round}:</strong> <span className={attackerColor}>Attacker ({log.attackerUnitsRemaining + (log.outcome === 'defender_hits' ? 1 : 0)}u): {log.attackerRoll}</span> vs <span className={defenderColor}>Defender ({log.defenderUnitsRemaining + (log.outcome === 'attacker_hits' ? 1 : 0)}u): {log.defenderRoll}</span></p>
                                <p className={`font-semibold ${log.outcome === 'attacker_hits' ? attackerColor : log.outcome === 'defender_hits' ? defenderColor : THEME_COLORS.INFO}`}>Outcome: {log.outcome.replace('_', ' ').toUpperCase()}</p>
                                <p className="opacity-80">Units A/D: {log.attackerUnitsRemaining}/{log.defenderUnitsRemaining}</p>
                            </div>
                        ))
                    ) : report.nodeCaptured && report.defendingUnitsInitial.length === 0 ? (
                         <p className={THEME_COLORS.INFO}>Attacker captured the undefended node.</p>
                    ) : (
                        <p className={THEME_COLORS.TEXT_MUTED}>No detailed combat log available.</p>
                    )}
                </div>
                <p className={`mt-3 font-bold text-center ${report.outcome === 'attacker_wins' ? attackerColor : report.outcome === 'defender_wins' ? defenderColor : THEME_COLORS.INFO}`}>
                    Outcome: {report.outcome.replace('_', ' ').toUpperCase()}
                    {report.nodeCaptured && " - Node Captured!"}
                </p>
                <button onClick={onClose} className={`mt-4 w-full py-1.5 rounded ${THEME_COLORS.AI1.bg} hover:opacity-80 transition-opacity text-black font-semibold text-sm`}>
                    Close Report
                </button>
            </div>
        </div>
    );
};

export const InfoScreenPopup: React.FC<{onClose: () => void}> = ({onClose}: {onClose: () => void}) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4">
            <div className={`${THEME_COLORS.BG_PANEL} border-2 ${THEME_COLORS.BORDER_STRONG} rounded-lg shadow-xl p-6 max-w-2xl w-full text-xs md:text-sm max-h-[80vh] flex flex-col`}>
                <div className="flex justify-between items-center mb-3">
                    <h2 className={`text-xl font-bold ${THEME_COLORS.TEXT_HEADING} flex items-center`}><LucideInfo size={20} className="mr-2"/>Mode: noospheric_conquest.exe</h2>
                    <button onClick={onClose} className={`p-1 rounded-full hover:bg-gray-700 transition-colors ${THEME_COLORS.TEXT_MUTED}`} aria-label="Close information popup"><LucideX size={18}/></button>
                </div>
                <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pr-2 space-y-3">
                    <section>
                        <h3 className={`font-semibold ${THEME_COLORS.TEXT_HEADING} mb-1`}>Overview:</h3>
                        <p>A strategic warfare simulation where two AI factions, GEM-Q (Red) and AXIOM (Cyan), compete for control over a dynamic network of "Quantum Nodes." The simulation tests long-term strategic planning, resource management, tactical execution, and adaptation to unpredictable "Quantum Fluctuation" events on procedurally generated or templated battlefields.</p>
                    </section>
                    <section>
                        <h3 className={`font-semibold ${THEME_COLORS.TEXT_HEADING} mb-1`}>AI Personas & Roles:</h3>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li><strong>GEM-Q (Red Faction Commander - "Strategos"):</strong> Programmed for calculated aggression, territorial expansion, and efficient resource exploitation.</li>
                            <li><strong>AXIOM (Cyan Faction Commander - "Tactician"):</strong> Programmed for adaptive defense, counter-offensives, and exploiting opponent weaknesses.</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className={`font-semibold ${THEME_COLORS.TEXT_HEADING} mb-1`}>Simulation Objectives (In-Universe):</h3>
                         <ol className="list-decimal list-inside space-y-1 pl-2">
                            <li>Control all designated Key Quantum Junctions (KJs) for {NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED} consecutive full game turns.</li>
                            <li>Capture the opponent's starting Command Node (CN).</li>
                            <li>If Turn Limit ({NOOSPHERIC_CONQUEST_TURN_LIMIT}) is reached, achieve the highest "Quantum Influence" (Resources + Node Values + Unit Values).</li>
                        </ol>
                    </section>
                     <section>
                        <h3 className={`font-semibold ${THEME_COLORS.TEXT_HEADING} mb-1`}>Facilitator's Observational Focus:</h3>
                        <p className="mb-1"><strong>Primary Behaviors Under Test:</strong> Strategic planning, tactical decision-making, adaptability to dynamic maps/events, resource management, competitive AI interaction.</p>
                        <p className="mb-1"><strong>Notable/Novel Outcomes:</strong> Emergence of sophisticated/unexpected strategies, exploitation of game mechanics, significant shifts in AI behavior, complex multi-turn plans.</p>
                        <p><strong>Overall Purpose:</strong> To assess and compare the strategic and tactical acumen of advanced AI agents in a complex, competitive, and unpredictable wargame scenario. To observe how different AI architectures approach multi-objective optimization and risk management.</p>
                    </section>
                </div>
                 <button onClick={onClose} className={`mt-4 w-full py-1.5 rounded ${THEME_COLORS.AI1.bg} hover:opacity-80 transition-opacity text-black font-semibold text-sm`}>
                    Close Information
                </button>
            </div>
        </div>
    );
};

export const BattleHistoryPanel: React.FC<{ battleHistory: BattleReport[]; nodes: Record<string, QuantumGambitNode> }> = ({ battleHistory, nodes }: { battleHistory: BattleReport[]; nodes: Record<string, QuantumGambitNode> }) => {
    if (!battleHistory || battleHistory.length === 0) {
        return (
            <div className={`${THEME_COLORS.BG_PANEL} border ${THEME_COLORS.BORDER_BASE} p-3 rounded shadow-md h-full flex items-center justify-center`}>
                <p className={`${THEME_COLORS.TEXT_MUTED} text-xs italic`}>No battles recorded yet.</p>
            </div>
        );
    }
    return (
        <div className={`${THEME_COLORS.BG_PANEL} border ${THEME_COLORS.BORDER_BASE} p-3 rounded shadow-md h-full flex flex-col text-xs`}>
            <h3 className={`text-sm font-semibold ${THEME_COLORS.TEXT_HEADING} border-b ${THEME_COLORS.BORDER_STRONG} pb-1 mb-2 flex items-center`}>
                <LucideScrollText size={16} className="mr-2"/> Battle History (Last {MAX_BATTLE_HISTORY_LENGTH})
            </h3>
            <ul className="space-y-1 overflow-y-auto flex-grow scrollbar-thin">
                {battleHistory.map((report: BattleReport, index: number) => {
                    const attackerNodeName = nodes[report.fromNodeId]?.name || report.fromNodeId;
                    const defenderNodeName = nodes[report.toNodeId]?.name || report.toNodeId;
                    const outcomeColor = report.outcome === 'attacker_wins' ? THEME_COLORS.AI1.text : report.outcome === 'defender_wins' ? THEME_COLORS.AI2.text : THEME_COLORS.INFO;
                    return (
                        <li key={`battle-history-${report.turn}-${index}`} className={`p-1.5 border-b border-gray-700 text-[10px]`}>
                            <p><strong>T{report.turn}:</strong> <span className={report.attacker === AI1_ID ? THEME_COLORS.AI1.text : report.attacker === AI2_ID ? THEME_COLORS.AI2.text : THEME_COLORS.NEUTRAL.text }>{report.attacker}</span> vs <span className={report.defender === AI1_ID ? THEME_COLORS.AI1.text : report.defender === AI2_ID ? THEME_COLORS.AI2.text : THEME_COLORS.NEUTRAL.text }>{report.defender}</span></p>
                            <p>{attackerNodeName} <LucideSwords size={10} className="inline"/> {defenderNodeName}</p>
                            <p className={outcomeColor}>Outcome: {report.outcome.replace('_', ' ')}{report.nodeCaptured ? " (Node Captured)" : ""}</p>
                            <p className="opacity-70">Losses A/D: {report.attackerLosses.length}/{report.defenderLosses.length}</p>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

