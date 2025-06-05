

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, GenerateContentResponse } from '@google/genai';
import { 
    AppMode, ThemeName, NoosphericGameState, NoosphericPlayerId, 
    NoosphericFaction, NoosphericNodeData, NoosphericPhase, SystemLogEntry, BattleLogEntry, NoosphericAIResponse,
    NoosphericMapType, BattleReportData, DiceRollDetail, TacticalAnalysisEntry
} from '../../types';
import { AI1_NAME, AI2_NAME, SYSTEM_SENDER_NAME, THEMES, NOOSPHERIC_CONQUEST_START_MESSAGE, GEMINI_MODEL_NAME, getAIPersona, FAB_HUB_ACTIVATION_COST, FAB_HUB_GARRISON_MIN, EVOLVE_UNIT_COST } from '../../constants';
import NoosphericMapDisplay from './NoosphericMapDisplay';
import NoosphericSidebar from './NoosphericSidebar';
import BattleReportModal from './BattleReportModal'; 
import { getMapDataByType, calculateInitialFactionData } from '../../data/noospheric-map-data';

interface NoosphericConquestContainerProps {
  ai1Chat: Chat | null;
  ai2Chat: Chat | null;
  apiKeyMissing: boolean;
  initialGameState?: NoosphericGameState;
  initialMapType?: NoosphericMapType;
  isGameStartedFromBackup?: boolean; 
  currentAppMode: AppMode;
  onModeChange: (newMode: AppMode) => void;
  activeTheme: ThemeName;
  isAiReadyForNoosphericFromApp: boolean;
  appInitializationError: string | null;
  onOpenInfoModal: () => void;
}

const DEFAULT_MAX_TURNS = 20; 
const ALL_MAP_TYPES: NoosphericMapType[] = ["Global Conflict", "Twin Peaks", "Classic Lattice", "Fractured Core"];
const AI_DECISION_DELAY_MS = 500;
const PHASE_ADVANCE_DELAY_MS = 200; 
const MAX_NOOSPHERIC_RETRY_ATTEMPTS = 2;


interface FluctuationEvent {
  name: string;
  description: (target?: string) => string;
  probability: number; // 0 to 1
  effect: (gameState: NoosphericGameState) => NoosphericGameState;
  getTargetPlayer?: (gameState: NoosphericGameState) => NoosphericPlayerId | 'NEUTRAL' | null;
}


const NoosphericConquestContainer: React.FC<NoosphericConquestContainerProps> = ({
  ai1Chat,
  ai2Chat,
  apiKeyMissing,
  initialGameState,
  initialMapType = "Global Conflict",
  isGameStartedFromBackup = false, 
  currentAppMode,
  onModeChange,
  activeTheme,
  isAiReadyForNoosphericFromApp,
  appInitializationError,
  onOpenInfoModal,
}) => {
  const [currentMapTypeInternal, setCurrentMapTypeInternal] = useState<NoosphericMapType>(initialMapType);
  const [isGameStarted, setIsGameStarted] = useState(isGameStartedFromBackup); 

  const createInitialGameState = useCallback((mapType: NoosphericMapType, gameJustStarted: boolean = false): NoosphericGameState => {
    const mapData = getMapDataByType(mapType);
    const factionData = calculateInitialFactionData(mapData);
    let initialMessage = NOOSPHERIC_CONQUEST_START_MESSAGE;
    if (gameJustStarted) {
        initialMessage = `Noospheric Conquest game started on ${mapType} map. Turn 1, FLUCTUATION Phase.`;
    }

    return {
      turn: 1,
      currentPhase: 'FLUCTUATION',
      activePlayer: 'GEM-Q', 
      mapNodes: mapData, 
      factions: {
        'GEM-Q': { ...factionData['GEM-Q'], tacticalAnalysis: gameJustStarted ? "Preparing initial strategy..." : "Awaiting game start..." },
        'AXIOM': { ...factionData['AXIOM'], tacticalAnalysis: gameJustStarted ? "Awaiting opponent's move..." : "Awaiting game start..." },
      },
      systemLog: [{ id: `sys-${Date.now()}`, timestamp: new Date().toISOString(), turn: 1, phase: 'FLUCTUATION', message: initialMessage, type: 'EVENT' }],
      battleLog: [],
      mapType: mapType,
      isPaused: false,
      winner: undefined,
    };
  }, []);
  
  const [gameState, setGameState] = useState<NoosphericGameState>(
    initialGameState && initialGameState.mapType === initialMapType 
      ? initialGameState 
      : createInitialGameState(initialMapType, isGameStartedFromBackup)
  );

  const [isLoadingAI, setIsLoadingAI] = useState<NoosphericPlayerId | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [latestBattleReportForModal, setLatestBattleReportForModal] = useState<BattleReportData | null>(null);
  const gameIsOverRef = useRef(false);
  const dataDivRef = useRef<HTMLDivElement>(null);

  const [currentAiTurnDurationDisplay, setCurrentAiTurnDurationDisplay] = useState<string>("--:--.-");
  const aiTurnStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const turnStartTimeForAvgRef = useRef<number | null>(null);
  const [totalGameTimeMs, setTotalGameTimeMs] = useState(0);
  const [completedTurnsForAvg, setCompletedTurnsForAvg] = useState(0);
  const [averageTurnTimeDisplay, setAverageTurnTimeDisplay] = useState<string>("--:--.-");
  const kjControlStreakRef = useRef<{ 'GEM-Q': number; 'AXIOM': number }>({ 'GEM-Q': 0, 'AXIOM': 0 });

  const [showGemQMainHistory, setShowGemQMainHistory] = useState(false);
  const [showAxiomMainHistory, setShowAxiomMainHistory] = useState(false);


  useEffect(() => {
    gameIsOverRef.current = gameState.currentPhase === 'GAME_OVER';
    if (dataDivRef.current) {
        try {
            dataDivRef.current.dataset.noosphericGameState = JSON.stringify(gameState);
            dataDivRef.current.dataset.noosphericMapType = gameState.mapType;
        } catch (e) {
            console.error("Error stringifying gameState for data attribute:", e, gameState);
        }
    }
  }, [gameState]);
  
  const isOverallAiReady = isAiReadyForNoosphericFromApp && !!ai1Chat && !!ai2Chat && !apiKeyMissing;

  const addSystemLog = useCallback((message: string, type: SystemLogEntry['type'], source?: NoosphericPlayerId, explicitTurn?: number, explicitPhase?: NoosphericPhase) => {
    setGameState(prev => ({
      ...prev,
      systemLog: [...prev.systemLog, { 
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2,9)}`, 
        timestamp: new Date().toISOString(), 
        turn: explicitTurn !== undefined ? explicitTurn : prev.turn, 
        phase: explicitPhase !== undefined ? explicitPhase : prev.currentPhase, 
        message, 
        type,
        source
      }].slice(-100) 
    }));
  }, []);

  const addBattleLog = useCallback((logData: Omit<BattleLogEntry, 'id' | 'timestamp'>) => {
    const battleLogEntry: BattleLogEntry = {
        ...logData,
        id: `battle-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
        timestamp: new Date().toISOString(),
    };
    setGameState(prev => ({
      ...prev,
      battleLog: [...prev.battleLog, battleLogEntry].slice(-20) 
    }));
    
    setGameState(prev => {
      const finalNodeState = prev.mapNodes[logData.nodeId]; 
      const totalUnitsAtNode = (finalNodeState?.standardUnits || 0) + (finalNodeState?.evolvedUnits || 0);
      const battleReportData: BattleReportData = {
          ...battleLogEntry,
          nodeName: finalNodeState?.regionName || logData.nodeName || 'Unknown Node',
          attackerInitialUnits: logData.attackerInitialUnits || 0,
          defenderInitialUnits: logData.defenderInitialUnits || 0,
          unitsRemainingAtNode: totalUnitsAtNode, 
          diceRolls: logData.diceRolls,
      };
      setLatestBattleReportForModal(battleReportData);
      return prev; 
    });

  }, []); 

  const formatDuration: (ms: number) => string = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  };
  
    const isNodeConnectedToCN = useCallback((nodeId: string, ownerId: NoosphericPlayerId, currentMapNodes: Record<string, NoosphericNodeData>): boolean => {
        if (!ownerId || ownerId === 'NEUTRAL') return false;

        const queue: string[] = [nodeId];
        const visited: Set<string> = new Set([nodeId]);
        
        while (queue.length > 0) {
            const currentNodeId = queue.shift()!;
            const currentNode = currentMapNodes[currentNodeId];

            if (!currentNode || currentNode.owner !== ownerId) continue;
            if (currentNode.isCN) return true; // Found a path to a Command Node

            for (const neighborId of currentNode.connections) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    const neighborNode = currentMapNodes[neighborId];
                    if (neighborNode && neighborNode.owner === ownerId) {
                        queue.push(neighborId);
                    }
                }
            }
        }
        return false;
    }, []);


  const FLUCTUATION_EVENTS: FluctuationEvent[] = [
    {
        name: "Quantum Resource Surge",
        description: (target) => `${target} experiences a Quantum Resource Surge! +10 QR.`,
        probability: 0.15,
        getTargetPlayer: () => Math.random() < 0.5 ? 'GEM-Q' : 'AXIOM',
        effect: (gs) => {
            const targetPlayer = Math.random() < 0.5 ? 'GEM-Q' : 'AXIOM';
            gs.factions[targetPlayer].qr += 10;
            return gs;
        }
    },
    {
        name: "Noospheric Anomaly",
        description: () => `A Noospheric Anomaly briefly destabilizes a random neutral KJ! It loses 2 standard units.`,
        probability: 0.1,
        getTargetPlayer: () => null, 
        effect: (gs) => {
            const neutralKJs = Object.values(gs.mapNodes).filter(n => n.isKJ && n.owner === 'NEUTRAL' && (n.standardUnits > 0 || n.evolvedUnits > 0));
            if (neutralKJs.length > 0) {
                const targetNode = neutralKJs[Math.floor(Math.random() * neutralKJs.length)];
                gs.mapNodes[targetNode.id].standardUnits = Math.max(0, targetNode.standardUnits - 2);
            }
            return gs;
        }
    },
    {
        name: "Minor Reinforcements",
        description: (target) => `Minor reinforcements (2 standard units) appear at a random controlled node for ${target}!`,
        probability: 0.12,
        getTargetPlayer: () => Math.random() < 0.5 ? 'GEM-Q' : 'AXIOM',
        effect: (gs) => {
            const targetPlayer = Math.random() < 0.5 ? 'GEM-Q' : 'AXIOM';
            const playerNodes = Object.values(gs.mapNodes).filter(n => n.owner === targetPlayer);
            if (playerNodes.length > 0) {
                const targetNode = playerNodes[Math.floor(Math.random() * playerNodes.length)];
                const totalUnitsAtNode = (gs.mapNodes[targetNode.id].standardUnits || 0) + (gs.mapNodes[targetNode.id].evolvedUnits || 0);
                 if (totalUnitsAtNode + 2 <= (gs.mapNodes[targetNode.id].maxUnits || Infinity)) {
                    gs.mapNodes[targetNode.id].standardUnits += 2;
                    // gs.factions[targetPlayer].totalUnits += 2; // Recalculated at end of turn
                }
            }
            return gs;
        }
    },
     {
        name: "Sudden Unit Decay",
        description: (target) => `Sudden unit decay affects ${target}! One of their nodes loses 1 standard unit.`,
        probability: 0.08,
        getTargetPlayer: () => Math.random() < 0.5 ? 'GEM-Q' : 'AXIOM',
        effect: (gs) => {
            const targetPlayer = Math.random() < 0.5 ? 'GEM-Q' : 'AXIOM';
            const playerNodesWithUnits = Object.values(gs.mapNodes).filter(n => n.owner === targetPlayer && n.standardUnits > 0);
            if (playerNodesWithUnits.length > 0) {
                const targetNode = playerNodesWithUnits[Math.floor(Math.random() * playerNodesWithUnits.length)];
                gs.mapNodes[targetNode.id].standardUnits = Math.max(0, targetNode.standardUnits - 1);
                // gs.factions[targetPlayer].totalUnits = Math.max(0, gs.factions[targetPlayer].totalUnits -1); // Recalculated at end of turn
            }
            return gs;
        }
    }
  ];

  const handleFluctuationEvent = useCallback((currentGameState: NoosphericGameState, turnForLog: number): NoosphericGameState => {
    let newGameState = { ...currentGameState };
    const randomNumber = Math.random();
    let cumulativeProbability = 0;
    let eventTriggered = false;

    for (const event of FLUCTUATION_EVENTS) {
        cumulativeProbability += event.probability;
        if (randomNumber < cumulativeProbability) {
            let targetName = "";
            if (event.getTargetPlayer) {
                const targetPlayerId = event.getTargetPlayer(newGameState);
                targetName = targetPlayerId === 'GEM-Q' ? AI1_NAME : targetPlayerId === 'AXIOM' ? AI2_NAME : "NEUTRAL";
            }
            newGameState = event.effect(newGameState);
            addSystemLog(`Fluctuation: ${event.description(targetName)}`, 'EVENT', undefined, turnForLog, 'FLUCTUATION');
            eventTriggered = true;
            break; 
        }
    }
    if (!eventTriggered) {
        addSystemLog("Fluctuation: The noosphere remains stable this turn. No unusual events.", 'INFO', undefined, turnForLog, 'FLUCTUATION');
    }
    return newGameState;
  }, [addSystemLog]);


  const handleMapTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isGameStarted) return; 
    const newMapType = event.target.value as NoosphericMapType;
    setCurrentMapTypeInternal(newMapType);
    setGameState(createInitialGameState(newMapType, false)); 
    setSelectedNodeId(null);
    addSystemLog(`Previewing ${newMapType} map. Click 'Start Game' to begin.`, "INFO");
  };

  const handleStartNewGameClick = useCallback(() => {
    const gameJustStarted = true;
    const newInitialState = createInitialGameState(currentMapTypeInternal, gameJustStarted);
    setGameState(newInitialState); 
    setIsGameStarted(true);
    setSelectedNodeId(null);
    setLatestBattleReportForModal(null); 
    
    setTotalGameTimeMs(0);
    setCompletedTurnsForAvg(0);
    setAverageTurnTimeDisplay("--:--.-");
    turnStartTimeForAvgRef.current = Date.now(); 
    kjControlStreakRef.current = { 'GEM-Q': 0, 'AXIOM': 0 };
  }, [currentMapTypeInternal, createInitialGameState]);

  const handlePauseToggle = () => {
    if (!isGameStarted) return;
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    addSystemLog(gameState.isPaused ? "Simulation Resumed." : "Simulation Paused.", "INFO");
  };

  const handleNodeClick = (nodeId: string) => {
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null); 
    } else {
      setSelectedNodeId(nodeId);
    }
  };
  
  const processAIResponse = useCallback((aiResponse: NoosphericAIResponse, player: NoosphericPlayerId) => {
    addSystemLog(`${player} tactical analysis: ${aiResponse.tacticalAnalysis}`, 'AI_ACTION', player);
    
    setGameState(prevGameState => {
        let currentPrev = JSON.parse(JSON.stringify(prevGameState)) as NoosphericGameState; // Deep copy
            
        aiResponse.actions.forEach(action => {
            const actionNodeLabel = action.nodeId ? (currentPrev.mapNodes[action.nodeId]?.label || action.nodeId) : '';
            const actionFromNodeLabel = action.fromNodeId ? (currentPrev.mapNodes[action.fromNodeId]?.label || action.fromNodeId) : '';
            const actionToNodeLabel = action.toNodeId ? (currentPrev.mapNodes[action.toNodeId]?.label || action.toNodeId) : '';
            let actionDetails = action.fromNodeId ? `from ${actionFromNodeLabel} to ${actionToNodeLabel}` : actionNodeLabel;
            if (action.type === 'EVOLVE_UNITS') actionDetails += ` (Units: ${action.unitsToEvolve || 0})`;
            else if (action.type !== 'ACTIVATE_FABRICATION_HUB') actionDetails += ` (Units: ${action.units || 0})`;


            if ( (action.type !== 'ACTIVATE_FABRICATION_HUB' && (action.units === undefined || action.units <= 0)) &&
                 (action.type === 'EVOLVE_UNITS' && (action.unitsToEvolve === undefined || action.unitsToEvolve <=0))
               ) {
                addSystemLog(`${player} proposed action ${action.type} with invalid units/unitsToEvolve. Action ignored. Details: ${actionDetails}`, 'INFO', player);
                return; 
            }

            let isValidActionForPhase = false;
            if (currentPrev.currentPhase === 'MANEUVER') {
                isValidActionForPhase = ['DEPLOY_UNITS', 'MOVE_UNITS', 'ACTIVATE_FABRICATION_HUB', 'EVOLVE_UNITS'].includes(action.type);
            } else if (currentPrev.currentPhase === 'COMBAT') {
                isValidActionForPhase = action.type === 'ATTACK_NODE';
            }

            if (!isValidActionForPhase) {
                addSystemLog(`${player} submitted invalid action type '${action.type}' for ${currentPrev.currentPhase} phase. Action ignored. Details: ${actionDetails}`, 'ERROR', player);
                return; 
            }
             addSystemLog(`${player} action: ${action.type} ${actionDetails}`, 'AI_ACTION', player);
            
            if (action.type === 'DEPLOY_UNITS' && action.nodeId && action.units) {
                const targetNode = currentPrev.mapNodes[action.nodeId!];
                const unitCost = action.units; 
                if (targetNode && targetNode.owner === player && currentPrev.factions[player].qr >= unitCost) { 
                    const totalUnitsAtNode = (targetNode.standardUnits || 0) + (targetNode.evolvedUnits || 0);
                    if (totalUnitsAtNode + action.units <= (targetNode.maxUnits || Infinity)) {
                        currentPrev.mapNodes[action.nodeId!].standardUnits = (targetNode.standardUnits || 0) + action.units!;
                        currentPrev.factions[player].qr -= unitCost; 
                        // currentPrev.factions[player].totalUnits += action.units!; // Recalculated at end of turn
                    } else {
                         addSystemLog(`${player} failed to deploy to ${targetNode?.label}: Exceeds max units (${targetNode.maxUnits}).`, 'ERROR', player);
                    }
                } else {
                    addSystemLog(`${player} failed to deploy to ${targetNode?.label}: Invalid target, insufficient QR, or node full. QR: ${currentPrev.factions[player].qr}, Cost: ${unitCost}`, 'ERROR', player);
                }
            }
            else if (action.type === 'MOVE_UNITS' && action.fromNodeId && action.toNodeId && action.units) {
                const sourceNode = currentPrev.mapNodes[action.fromNodeId!];
                const destNode = currentPrev.mapNodes[action.toNodeId!];
                const totalUnitsToMove = action.units!;
                const totalUnitsAtSource = (sourceNode.standardUnits || 0) + (sourceNode.evolvedUnits || 0);

                if (sourceNode && destNode && sourceNode.owner === player && sourceNode.connections.includes(action.toNodeId!) && totalUnitsAtSource >= totalUnitsToMove) {
                    if (destNode.owner === player || destNode.owner === 'NEUTRAL') { 
                        let standardUnitsToMove = Math.min(totalUnitsToMove, sourceNode.standardUnits);
                        let evolvedUnitsToMove = Math.min(totalUnitsToMove - standardUnitsToMove, sourceNode.evolvedUnits);
                        
                        const currentTotalAtDest = (destNode.standardUnits || 0) + (destNode.evolvedUnits || 0);
                        const remainingCapacity = (destNode.maxUnits || Infinity) - currentTotalAtDest;
                        
                        const actualStandardMovedToDest = Math.min(standardUnitsToMove, remainingCapacity);
                        const actualEvolvedMovedToDest = Math.min(evolvedUnitsToMove, remainingCapacity - actualStandardMovedToDest);

                        currentPrev.mapNodes[action.fromNodeId!].standardUnits -= actualStandardMovedToDest;
                        currentPrev.mapNodes[action.fromNodeId!].evolvedUnits -= actualEvolvedMovedToDest;

                        currentPrev.mapNodes[action.toNodeId!].standardUnits = (destNode.standardUnits || 0) + actualStandardMovedToDest;
                        currentPrev.mapNodes[action.toNodeId!].evolvedUnits = (destNode.evolvedUnits || 0) + actualEvolvedMovedToDest;
                        
                        const returnedStandard = standardUnitsToMove - actualStandardMovedToDest;
                        const returnedEvolved = evolvedUnitsToMove - actualEvolvedMovedToDest;

                        if (returnedStandard > 0 || returnedEvolved > 0) {
                            currentPrev.mapNodes[action.fromNodeId!].standardUnits += returnedStandard;
                            currentPrev.mapNodes[action.fromNodeId!].evolvedUnits += returnedEvolved;
                            addSystemLog(`${player} move to ${destNode.label} capped by max units. ${returnedStandard + returnedEvolved} units returned to ${sourceNode.label}.`, 'INFO', player);
                        }

                        if (destNode.owner === 'NEUTRAL') { 
                            currentPrev.mapNodes[action.toNodeId!].owner = player;
                           // currentPrev.factions[player].nodesControlled +=1; // Recalculated at end of turn
                           // if(destNode.isKJ) currentPrev.factions[player].kjsHeld +=1; // Recalculated at end of turn
                        }
                    } else {
                         addSystemLog(`${player} attempted invalid move to enemy node ${destNode.label} during MANEUVER. Use ATTACK in COMBAT.`, 'ERROR', player);
                    }
                } else {
                    addSystemLog(`${player} failed to move units from ${sourceNode?.label} to ${destNode?.label}: Invalid path, ownership, or insufficient units.`, 'ERROR', player);
                }
            }
            else if (action.type === 'ACTIVATE_FABRICATION_HUB' && action.nodeId) {
                const targetNode = currentPrev.mapNodes[action.nodeId];
                const totalUnitsAtNode = (targetNode.standardUnits || 0) + (targetNode.evolvedUnits || 0);
                if (targetNode && targetNode.owner === player && targetNode.hasFabricationHub && !targetNode.isHubActive &&
                    currentPrev.factions[player].qr >= FAB_HUB_ACTIVATION_COST &&
                    totalUnitsAtNode >= FAB_HUB_GARRISON_MIN &&
                    isNodeConnectedToCN(action.nodeId, player, currentPrev.mapNodes)) {
                    currentPrev.mapNodes[action.nodeId].isHubActive = true;
                    currentPrev.mapNodes[action.nodeId].hubDisconnectedTurn = undefined; // Clear any grace period
                    currentPrev.factions[player].qr -= FAB_HUB_ACTIVATION_COST;
                    addSystemLog(`${player} activated Fabrication Hub at ${targetNode.label}.`, 'AI_ACTION', player);
                } else {
                     addSystemLog(`${player} failed to activate Hub at ${targetNode?.label}. Conditions not met (Hub: ${targetNode?.hasFabricationHub}, Active: ${targetNode?.isHubActive} QR: ${currentPrev.factions[player].qr}, Garrison: ${totalUnitsAtNode}, Connected: ${targetNode ? isNodeConnectedToCN(action.nodeId, player, currentPrev.mapNodes) : 'N/A'}).`, 'ERROR', player);
                }
            }
            else if (action.type === 'EVOLVE_UNITS' && action.nodeId && action.unitsToEvolve) {
                const targetNode = currentPrev.mapNodes[action.nodeId];
                const cost = action.unitsToEvolve * EVOLVE_UNIT_COST;
                if (targetNode && targetNode.owner === player && targetNode.isHubActive &&
                    currentPrev.factions[player].qr >= cost &&
                    targetNode.standardUnits >= action.unitsToEvolve &&
                    isNodeConnectedToCN(action.nodeId, player, currentPrev.mapNodes)) {
                    currentPrev.mapNodes[action.nodeId].standardUnits -= action.unitsToEvolve;
                    currentPrev.mapNodes[action.nodeId].evolvedUnits += action.unitsToEvolve;
                    currentPrev.factions[player].qr -= cost;
                    addSystemLog(`${player} evolved ${action.unitsToEvolve} units at ${targetNode.label}.`, 'AI_ACTION', player);
                } else {
                    addSystemLog(`${player} failed to evolve units at ${targetNode?.label}. Conditions not met (Active: ${targetNode?.isHubActive}, QR: ${currentPrev.factions[player].qr}, Std.Units: ${targetNode?.standardUnits}, Connected: ${targetNode ? isNodeConnectedToCN(action.nodeId, player, currentPrev.mapNodes) : 'N/A'}).`, 'ERROR', player);
                }
            }
            else if (action.type === 'ATTACK_NODE' && action.fromNodeId && action.toNodeId && action.units) {
                 const attackerNode = currentPrev.mapNodes[action.fromNodeId!];
                 const defenderNode = currentPrev.mapNodes[action.toNodeId!];
                 const totalAttackingUnitsRequest = action.units!;
                 
                 const attackerInitialStandard = attackerNode.standardUnits || 0;
                 const attackerInitialEvolved = attackerNode.evolvedUnits || 0;
                 const attackerSourceTotal = attackerInitialStandard + attackerInitialEvolved;

                 if (attackerNode && defenderNode && attackerNode.owner === player && attackerSourceTotal >= totalAttackingUnitsRequest && defenderNode.owner !== player && attackerNode.connections.includes(action.toNodeId!)) {
                    const defenderPlayerId = defenderNode.owner;
                    const defenderInitialStandardUnits = defenderNode.standardUnits || 0;
                    const defenderInitialEvolvedUnits = defenderNode.evolvedUnits || 0;
                    const defenderInitialTotalUnits = defenderInitialStandardUnits + defenderInitialEvolvedUnits;
                    
                    let attackingStandardUnits = Math.min(totalAttackingUnitsRequest, attackerInitialStandard);
                    let attackingEvolvedUnits = Math.min(totalAttackingUnitsRequest - attackingStandardUnits, attackerInitialEvolved);
                    let currentAttackerTotalForCombat = attackingStandardUnits + attackingEvolvedUnits;

                    let currentDefenderStandardUnits = defenderInitialStandardUnits;
                    let currentDefenderEvolvedUnits = defenderInitialEvolvedUnits;
                    let totalAttackerLosses = 0;
                    let totalDefenderLosses = 0;
                    const diceRollsDetails: DiceRollDetail[] = [];

                    const attackerHasEvolved = attackingEvolvedUnits > 0;
                    const defenderHasEvolved = defenderInitialEvolvedUnits > 0;

                    if (defenderInitialTotalUnits === 0 && defenderPlayerId === 'NEUTRAL') { 
                        diceRollsDetails.push({ attackerRoll: 'N/A', defenderRoll: 'N/A', outcome: 'Attacker auto-captures empty neutral node', attackerUnitsRemaining: currentAttackerTotalForCombat, defenderUnitsRemaining: 0 });
                    } else { 
                        let tempDefenderTotal = defenderInitialTotalUnits;
                        let tempAttackerTotalInBattle = currentAttackerTotalForCombat;

                        while(tempAttackerTotalInBattle > 0 && tempDefenderTotal > 0) {
                            let attackerRoll = 1 + Math.floor(Math.random() * 6) + (attackerHasEvolved ? 5 : 0);
                            let defenderRoll = 1 + Math.floor(Math.random() * 6) + (defenderHasEvolved ? 5 : 0);
                            
                            let roundOutcome = "";

                            if (attackerRoll > defenderRoll) {
                                tempDefenderTotal--;
                                totalDefenderLosses++;
                                roundOutcome = `Attacker Hits (Defender loses 1 unit)`;
                            } else if (defenderRoll > attackerRoll) {
                                tempAttackerTotalInBattle--;
                                totalAttackerLosses++;
                                roundOutcome = `Defender Hits (Attacker loses 1 unit)`;
                            } else {
                                roundOutcome = "Clash (No losses this roll)";
                            }
                            diceRollsDetails.push({ attackerRoll, defenderRoll, outcome: roundOutcome, attackerUnitsRemaining: tempAttackerTotalInBattle, defenderUnitsRemaining: tempDefenderTotal });
                        }
                        currentAttackerTotalForCombat = tempAttackerTotalInBattle; 

                        let remainingDefenderLosses = totalDefenderLosses;
                        const standardDefenderLossesApplied = Math.min(remainingDefenderLosses, defenderInitialStandardUnits);
                        currentDefenderStandardUnits = defenderInitialStandardUnits - standardDefenderLossesApplied;
                        remainingDefenderLosses -= standardDefenderLossesApplied;
                        currentDefenderEvolvedUnits = Math.max(0, defenderInitialEvolvedUnits - remainingDefenderLosses);
                    }
                    
                    const battleOutcome: BattleLogEntry['outcome'] = currentAttackerTotalForCombat > 0 ? 'ATTACKER_WINS' : 'DEFENDER_WINS';
                    const nodeCaptured = battleOutcome === 'ATTACKER_WINS';

                    let remainingAttackerLossesInBattle = totalAttackerLosses;
                    const standardAttackerLossesCommitted = Math.min(remainingAttackerLossesInBattle, attackingStandardUnits);
                    attackingStandardUnits -= standardAttackerLossesCommitted; 
                    remainingAttackerLossesInBattle -= standardAttackerLossesCommitted;
                    attackingEvolvedUnits = Math.max(0, attackingEvolvedUnits - remainingAttackerLossesInBattle); 
                    
                    currentPrev.mapNodes[action.fromNodeId!].standardUnits = attackerInitialStandard - (Math.min(totalAttackingUnitsRequest, attackerInitialStandard) - attackingStandardUnits);
                    currentPrev.mapNodes[action.fromNodeId!].evolvedUnits = attackerInitialEvolved - (Math.min(totalAttackingUnitsRequest - Math.min(totalAttackingUnitsRequest, attackerInitialStandard), attackerInitialEvolved) - attackingEvolvedUnits);


                    if (nodeCaptured) {
                        const remainingStandardAttackers = attackingStandardUnits; 
                        const remainingEvolvedAttackers = attackingEvolvedUnits;   
                        
                        const totalUnitsToPlace = remainingStandardAttackers + remainingEvolvedAttackers;
                        const destCapacity = defenderNode.maxUnits || Infinity;
                        let actualStandardPlaced = remainingStandardAttackers;
                        let actualEvolvedPlaced = remainingEvolvedAttackers;

                        if (totalUnitsToPlace > destCapacity) {
                            const overflow = totalUnitsToPlace - destCapacity;
                            if (actualEvolvedPlaced >= overflow) { 
                                actualEvolvedPlaced -= overflow;
                            } else {
                                const remainingOverflow = overflow - actualEvolvedPlaced;
                                actualEvolvedPlaced = 0;
                                actualStandardPlaced = Math.max(0, actualStandardPlaced - remainingOverflow);
                            }
                             addSystemLog(`Overflow units (${overflow}) returned to ${attackerNode.label} after capturing ${defenderNode.label}.`, 'INFO', player);
                             currentPrev.mapNodes[action.fromNodeId!].standardUnits += (remainingStandardAttackers - actualStandardPlaced);
                             currentPrev.mapNodes[action.fromNodeId!].evolvedUnits += (remainingEvolvedAttackers - actualEvolvedPlaced);
                        }

                        currentPrev.mapNodes[action.toNodeId!] = { 
                            ...defenderNode, 
                            owner: player, 
                            standardUnits: actualStandardPlaced,
                            evolvedUnits: actualEvolvedPlaced,
                            isHubActive: false, 
                            hubDisconnectedTurn: undefined
                        };

                       // currentPrev.factions[player].nodesControlled +=1; // Recalculated end of turn
                       // if(defenderNode.isKJ) currentPrev.factions[player].kjsHeld +=1; // Recalculated end of turn
                       // if (defenderPlayerId !== 'NEUTRAL') {
                       //    currentPrev.factions[defenderPlayerId].nodesControlled = Math.max(0, currentPrev.factions[defenderPlayerId].nodesControlled - 1); // Recalculated
                       //    if(defenderNode.isKJ) currentPrev.factions[defenderPlayerId].kjsHeld = Math.max(0, currentPrev.factions[defenderPlayerId].kjsHeld -1); // Recalculated
                       // }
                    } else { 
                        currentPrev.mapNodes[action.toNodeId!] = { ...defenderNode, standardUnits: currentDefenderStandardUnits, evolvedUnits: currentDefenderEvolvedUnits };
                    }
                                        
                    addBattleLog({
                        turn: currentPrev.turn, 
                        attacker: player, 
                        defender: defenderPlayerId, 
                        fromNodeId: action.fromNodeId,
                        nodeId: action.toNodeId!, 
                        outcome: battleOutcome, 
                        attackerLosses: totalAttackerLosses, 
                        defenderLosses: totalDefenderLosses, 
                        nodeCaptured,
                        attackerInitialUnits: totalAttackingUnitsRequest,
                        defenderInitialUnits: defenderInitialTotalUnits,
                        diceRolls: diceRollsDetails,
                        nodeName: defenderNode.regionName, 
                        unitsRemainingAtNode: (currentPrev.mapNodes[action.toNodeId!].standardUnits || 0) + (currentPrev.mapNodes[action.toNodeId!].evolvedUnits || 0)
                    });
                } else {
                    addSystemLog(`${player} failed to attack ${defenderNode?.label} from ${attackerNode?.label}: Invalid setup or target. Source Units: ${attackerSourceTotal}, Requested: ${totalAttackingUnitsRequest}`, 'ERROR', player);
                }
            }
        });
        currentPrev.factions[player].tacticalAnalysis = aiResponse.tacticalAnalysis;
        currentPrev.factions[player].aiError = undefined;

        // Log tactical analysis to history
        const newAnalysisEntry: TacticalAnalysisEntry = {
          turn: currentPrev.turn,
          phase: currentPrev.currentPhase,
          analysis: aiResponse.tacticalAnalysis,
        };
        currentPrev.factions[player].tacticalAnalysisHistory = [
          ...currentPrev.factions[player].tacticalAnalysisHistory,
          newAnalysisEntry
        ].slice(-50); // Keep last 50 entries


        return currentPrev;
    });

  }, [addSystemLog, addBattleLog, isNodeConnectedToCN]); 

  const advancePhase = useCallback(() => {
    setGameState(prev => {
      if (gameIsOverRef.current || prev.isPaused) return prev;
      let nextPhase: NoosphericPhase = prev.currentPhase;
      let nextTurn = prev.turn;
      let nextActivePlayer = prev.activePlayer;
      let updatedState = { ...prev, mapNodes: { ...prev.mapNodes}, factions: {...prev.factions, 'GEM-Q': {...prev.factions['GEM-Q']}, 'AXIOM': {...prev.factions['AXIOM']}} };

      switch (prev.currentPhase) {
        case 'FLUCTUATION': 
            updatedState = handleFluctuationEvent(updatedState, updatedState.turn);
            nextPhase = 'RESOURCE'; 
            addSystemLog("Fluctuation complete. Resource phase starting.", "EVENT", undefined, updatedState.turn, 'FLUCTUATION');
            break;
        case 'RESOURCE':    
            nextPhase = 'MANEUVER'; 
            nextActivePlayer = 'GEM-Q'; 
            const updatedFactionsResource = JSON.parse(JSON.stringify(updatedState.factions));
            Object.values(updatedState.mapNodes).forEach(node => {
                if (node.owner !== 'NEUTRAL' && updatedFactionsResource[node.owner]) {
                    if (isNodeConnectedToCN(node.id, node.owner, updatedState.mapNodes)) {
                        updatedFactionsResource[node.owner].qr += node.qrOutput;
                    } else {
                         addSystemLog(`Node ${node.label} (${node.owner}) disconnected from CN, no QR generated.`, "INFO", node.owner, updatedState.turn, 'RESOURCE');
                    }
                }
            });
            addSystemLog("Resources collected. Maneuver phase starting for GEM-Q.", "EVENT", undefined, updatedState.turn, 'RESOURCE');
            updatedState = { ...updatedState, factions: updatedFactionsResource };
            break;
        case 'MANEUVER':    
            if (prev.activePlayer === 'GEM-Q') {
                nextActivePlayer = 'AXIOM'; 
                addSystemLog("GEM-Q maneuver actions processed. Maneuver phase for AXIOM.", "EVENT", undefined, prev.turn, 'MANEUVER');
            } else { 
                nextPhase = 'COMBAT'; 
                nextActivePlayer = 'GEM-Q';
                addSystemLog("AXIOM maneuver actions processed. Combat phase starting for GEM-Q.", "EVENT", undefined, prev.turn, 'MANEUVER');
            }
            break;
        case 'COMBAT':      
            if (prev.activePlayer === 'GEM-Q') {
                nextActivePlayer = 'AXIOM';
                addSystemLog("GEM-Q combat actions processed. Combat phase for AXIOM.", "EVENT", undefined, prev.turn, 'COMBAT');
            } else { 
                
                addSystemLog(`AXIOM combat actions processed. End of Turn ${prev.turn}.`, "EVENT", undefined, prev.turn, 'COMBAT');

                if (turnStartTimeForAvgRef.current) {
                    const turnEndTime = Date.now();
                    const currentTurnDuration = turnEndTime - turnStartTimeForAvgRef.current;
                    setTotalGameTimeMs(t => t + currentTurnDuration);
                    setCompletedTurnsForAvg(c => {
                        const newCompletedTurns = c + 1;
                        if (newCompletedTurns > 0) {
                             setAverageTurnTimeDisplay(formatDuration((totalGameTimeMs + currentTurnDuration) / newCompletedTurns));
                        }
                        return newCompletedTurns;
                    });
                }
                turnStartTimeForAvgRef.current = Date.now(); 

                const tempMapNodes = JSON.parse(JSON.stringify(updatedState.mapNodes));
                Object.values(tempMapNodes).forEach((nodeProcessing: any) => {
                    const node = nodeProcessing as NoosphericNodeData;
                    if (node.owner !== 'NEUTRAL' && node.hasFabricationHub && node.isHubActive) {
                        if (!isNodeConnectedToCN(node.id, node.owner, tempMapNodes)) {
                            if (node.hubDisconnectedTurn === undefined) {
                                tempMapNodes[node.id].hubDisconnectedTurn = prev.turn;
                                addSystemLog(`Fabrication Hub at ${node.label} (${node.owner}) lost CN connection. Grace period started (Turn ${prev.turn}).`, "INFO", node.owner, prev.turn, 'COMBAT');
                            }
                        } else {
                            tempMapNodes[node.id].hubDisconnectedTurn = undefined; 
                        }
                    }
                    if (node.owner !== 'NEUTRAL' && node.hasFabricationHub && node.isHubActive && node.hubDisconnectedTurn !== undefined && prev.turn > node.hubDisconnectedTurn) {
                        tempMapNodes[node.id].isHubActive = false;
                        tempMapNodes[node.id].hubDisconnectedTurn = undefined;
                        addSystemLog(`Fabrication Hub at ${node.label} (${node.owner}) deactivated due to prolonged CN disconnection.`, "EVENT", node.owner, prev.turn, 'COMBAT');
                    }
                });
                updatedState.mapNodes = tempMapNodes;

                const newFactions = JSON.parse(JSON.stringify(updatedState.factions));
                (['GEM-Q', 'AXIOM'] as NoosphericPlayerId[]).forEach(pId => {
                    newFactions[pId].totalUnits = 0;
                    newFactions[pId].totalStandardUnits = 0;
                    newFactions[pId].totalEvolvedUnits = 0;
                    newFactions[pId].nodesControlled = 0;
                    newFactions[pId].kjsHeld = 0;
                    newFactions[pId].activeHubsCount = 0;
                });
                
                Object.values(updatedState.mapNodes).forEach(node => {
                    const owner = node.owner;
                    if (owner !== 'NEUTRAL') {
                        newFactions[owner].totalStandardUnits += (node.standardUnits || 0);
                        newFactions[owner].totalEvolvedUnits += (node.evolvedUnits || 0);
                        newFactions[owner].nodesControlled++;
                        if (node.isKJ && isNodeConnectedToCN(node.id, owner, updatedState.mapNodes)) {
                            newFactions[owner].kjsHeld++;
                        }
                        if (node.hasFabricationHub && node.isHubActive) {
                            newFactions[owner].activeHubsCount++;
                        }
                    }
                });
                newFactions['GEM-Q'].totalUnits = newFactions['GEM-Q'].totalStandardUnits + newFactions['GEM-Q'].totalEvolvedUnits;
                newFactions['AXIOM'].totalUnits = newFactions['AXIOM'].totalStandardUnits + newFactions['AXIOM'].totalEvolvedUnits;

                updatedState.factions = newFactions;

                // KJ Control Win Condition Logic
                let requiredKJsForWin = 2;
                let kjWinStreakTarget = 2;

                if (updatedState.mapType === "Fractured Core") {
                    requiredKJsForWin = 4;
                    kjWinStreakTarget = 3;
                } else if (updatedState.mapType === "Classic Lattice") {
                    requiredKJsForWin = 2; 
                    kjWinStreakTarget = 3;
                }
                // Other maps default to 2 KJs for 2 turns.

                (['GEM-Q', 'AXIOM'] as NoosphericPlayerId[]).forEach(player => {
                    const opponent = player === 'GEM-Q' ? 'AXIOM' : 'GEM-Q';
                    if (updatedState.factions[player].kjsHeld >= requiredKJsForWin) {
                        kjControlStreakRef.current[player]++;
                        // If opponent also meets KJ condition, nobody's streak resets this turn specifically because of this
                        // but the win can only occur if one side has it and the other doesn't (implicitly by one winning first).
                        // However, if one side gains the KJs and the other loses them below threshold, then opponent streak resets.
                        if (updatedState.factions[opponent].kjsHeld < requiredKJsForWin) {
                           kjControlStreakRef.current[opponent] = 0; 
                        }
                    } else {
                        kjControlStreakRef.current[player] = 0; 
                    }

                    if (kjControlStreakRef.current[player] >= kjWinStreakTarget) {
                        if (updatedState.winner === undefined) { 
                            updatedState.winner = player;
                            nextPhase = 'GAME_OVER';
                            addSystemLog(`${player} wins by controlling ${updatedState.factions[player].kjsHeld} (target: ${requiredKJsForWin}+) connected KJs for ${kjWinStreakTarget} consecutive opponent turns!`, "EVENT", undefined, prev.turn, 'COMBAT');
                        }
                    }
                });
                
                if (nextPhase !== 'GAME_OVER') {
                    const gemQHasUnits = updatedState.factions['GEM-Q'].totalUnits > 0;
                    const axiomHasUnits = updatedState.factions['AXIOM'].totalUnits > 0;
                    const gemQHasCNs = Object.values(updatedState.mapNodes).some(n => n.owner === 'GEM-Q' && n.isCN);
                    const axiomHasCNs = Object.values(updatedState.mapNodes).some(n => n.owner === 'AXIOM' && n.isCN);

                    const gemQLoses = !gemQHasUnits && !gemQHasCNs;
                    const axiomLoses = !axiomHasUnits && !axiomHasCNs;

                    if (gemQLoses && axiomLoses) {
                        updatedState.winner = 'DRAW'; 
                        nextPhase = 'GAME_OVER';
                        addSystemLog(`Mutual Annihilation! Both factions eliminated. Game is a DRAW.`, "EVENT", undefined, prev.turn, 'COMBAT');
                    } else if (gemQLoses) {
                        updatedState.winner = 'AXIOM';
                        nextPhase = 'GAME_OVER';
                        addSystemLog(`GEM-Q has been eliminated (no CNs or units). AXIOM wins by annihilation!`, "EVENT", undefined, prev.turn, 'COMBAT');
                    } else if (axiomLoses) {
                        updatedState.winner = 'GEM-Q';
                        nextPhase = 'GAME_OVER';
                        addSystemLog(`AXIOM has been eliminated (no CNs or units). GEM-Q wins by annihilation!`, "EVENT", undefined, prev.turn, 'COMBAT');
                    }
                }

                if (nextPhase !== 'GAME_OVER') {
                    nextTurn = prev.turn + 1; 
                    addSystemLog(`Starting Fluctuation phase for Turn ${nextTurn}.`, "EVENT", undefined, nextTurn, 'FLUCTUATION');
                    updatedState = handleFluctuationEvent(updatedState, nextTurn); 
                    addSystemLog(`Fluctuation complete. Resource phase starting for Turn ${nextTurn}.`, "EVENT", undefined, nextTurn, 'FLUCTUATION'); 
                    
                    const updatedFactionsResourceInner = JSON.parse(JSON.stringify(updatedState.factions)); 
                    Object.values(updatedState.mapNodes).forEach(node => {
                        if (node.owner !== 'NEUTRAL' && updatedFactionsResourceInner[node.owner]) {
                           if (isNodeConnectedToCN(node.id, node.owner, updatedState.mapNodes)) {
                                updatedFactionsResourceInner[node.owner].qr += node.qrOutput;
                            } else {
                                addSystemLog(`Node ${node.label} (${node.owner}) disconnected, no QR generated in Turn ${nextTurn}.`, "INFO", node.owner, nextTurn, 'RESOURCE');
                            }
                        }
                    });
                    updatedState = { ...updatedState, factions: updatedFactionsResourceInner };
                    addSystemLog(`Resources collected. Maneuver phase starting for GEM-Q for Turn ${nextTurn}.`, "EVENT", undefined, nextTurn, 'RESOURCE'); 
                    
                    nextPhase = 'MANEUVER';
                    nextActivePlayer = 'GEM-Q';

                    if (nextTurn > DEFAULT_MAX_TURNS) {
                        nextPhase = 'GAME_OVER';
                        let winnerScore: NoosphericPlayerId | 'DRAW' = 'DRAW';
                        const gemScore = updatedState.factions['GEM-Q'].qr + (updatedState.factions['GEM-Q'].nodesControlled * 10) + (updatedState.factions['GEM-Q'].kjsHeld * 50) + (updatedState.factions['GEM-Q'].totalUnits * 2);
                        const axiomScore = updatedState.factions['AXIOM'].qr + (updatedState.factions['AXIOM'].nodesControlled * 10) + (updatedState.factions['AXIOM'].kjsHeld * 50) + (updatedState.factions['AXIOM'].totalUnits * 2);

                        if (gemScore > axiomScore) winnerScore = 'GEM-Q';
                        else if (axiomScore > gemScore) winnerScore = 'AXIOM';
                        addSystemLog(`Max turns (${DEFAULT_MAX_TURNS}) reached. Game Over. Winner by Score: ${winnerScore} (GEM-Q: ${gemScore}, AXIOM: ${axiomScore})`, "EVENT", undefined, nextTurn, 'GAME_OVER');
                        updatedState.winner = winnerScore;
                    }
                }
            }
            break;
        case 'GAME_OVER': return prev; 
      }
      return { ...updatedState, currentPhase: nextPhase, turn: nextTurn, activePlayer: nextActivePlayer };
    });
  }, [addSystemLog, handleFluctuationEvent, totalGameTimeMs, formatDuration, isNodeConnectedToCN]); 


  const makeAIMove = useCallback(async () => {
    const currentPhaseSnapshot = gameState.currentPhase;
    const activePlayerSnapshot = gameState.activePlayer;
    const currentTurnSnapshot = gameState.turn; 

    if (apiKeyMissing || gameIsOverRef.current || !isOverallAiReady || gameState.isPaused || currentPhaseSnapshot === 'GAME_OVER') {
      return;
    }

    if (currentPhaseSnapshot !== 'MANEUVER' && currentPhaseSnapshot !== 'COMBAT') {
        setIsLoadingAI(null); 
        return;
    }

    const currentPlayerId = activePlayerSnapshot; 
    const currentAiChat = currentPlayerId === 'GEM-Q' ? ai1Chat : ai2Chat;
    if (!currentAiChat) {
      addSystemLog(`${currentPlayerId} is not available (chat instance is null). Skipping action.`, "ERROR", currentPlayerId);
      setIsLoadingAI(null);
      setTimeout(advancePhase, PHASE_ADVANCE_DELAY_MS); 
      return;
    }
    
    const basePromptGameState = {
        turn: currentTurnSnapshot, 
        currentPhase: currentPhaseSnapshot, 
        yourFactionId: currentPlayerId,    
        mapNodes: gameState.mapNodes, 
        mapType: gameState.mapType,
        factions: { 
            'GEM-Q': { qr: gameState.factions['GEM-Q'].qr, nodesControlled: gameState.factions['GEM-Q'].nodesControlled, totalUnits: gameState.factions['GEM-Q'].totalUnits, totalStandardUnits: gameState.factions['GEM-Q'].totalStandardUnits, totalEvolvedUnits: gameState.factions['GEM-Q'].totalEvolvedUnits, activeHubsCount: gameState.factions['GEM-Q'].activeHubsCount, kjsHeld: gameState.factions['GEM-Q'].kjsHeld },
            'AXIOM': { qr: gameState.factions['AXIOM'].qr, nodesControlled: gameState.factions['AXIOM'].nodesControlled, totalUnits: gameState.factions['AXIOM'].totalUnits, totalStandardUnits: gameState.factions['AXIOM'].totalStandardUnits, totalEvolvedUnits: gameState.factions['AXIOM'].totalEvolvedUnits, activeHubsCount: gameState.factions['AXIOM'].activeHubsCount, kjsHeld: gameState.factions['AXIOM'].kjsHeld }
        }
    };
    const basePromptString = `Current Game State:\n${JSON.stringify(basePromptGameState, null, 2)}\n\nYour turn (${currentPlayerId}) for phase ${currentPhaseSnapshot} on map "${gameState.mapType}". Provide your response in the specified JSON format. Prioritize capturing KJs and CNs. Ensure actions are valid and units count > 0. For COMBAT phase, focus on 'ATTACK_NODE' actions. For MANEUVER, focus on 'DEPLOY_UNITS', 'MOVE_UNITS', 'ACTIVATE_FABRICATION_HUB', 'EVOLVE_UNITS'. Remember unit deployment, hub activation, and unit evolution cost QR. Adhere to your strategic directives regarding win conditions and connectivity rules.`;

    let aiResponseProcessedSuccessfully = false;
    let lastValidationError: string | null = null;

    for (let attempt = 0; attempt <= MAX_NOOSPHERIC_RETRY_ATTEMPTS; attempt++) {
        setIsLoadingAI(currentPlayerId);
        setGameState(prev => ({
            ...prev,
            factions: { ...prev.factions, [currentPlayerId]: { ...prev.factions[currentPlayerId], aiError: undefined }}
        }));

        let promptForAI = basePromptString;
        if (attempt > 0 && lastValidationError) {
            promptForAI += `\n\nATTENTION: Your previous attempt (Attempt ${attempt}) was invalid. Error: "${lastValidationError}". Please provide a new set of actions, ensuring they are valid according to all rules. This is attempt ${attempt + 1} of ${MAX_NOOSPHERIC_RETRY_ATTEMPTS + 1}.`;
            addSystemLog(`${currentPlayerId} (Attempt ${attempt + 1}/${MAX_NOOSPHERIC_RETRY_ATTEMPTS + 1}) Retrying. Prev Error: ${lastValidationError.substring(0,150)}...`, 'INFO', currentPlayerId);
        }
        
        try {
            const response: GenerateContentResponse = await currentAiChat.sendMessage({ message: promptForAI });
            let aiResponseText = response.text.trim();
            const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
            const match = aiResponseText.match(fenceRegex);
            if (match && match[2]) {
                aiResponseText = match[2].trim();
            }

            const parsedResponse: NoosphericAIResponse = JSON.parse(aiResponseText);
            let currentAttemptIsValid = true;
            lastValidationError = null; 

            if (!parsedResponse.actions || typeof parsedResponse.tacticalAnalysis === 'undefined') {
                lastValidationError = "AI response missing 'actions' or 'tacticalAnalysis' key.";
                currentAttemptIsValid = false;
            } else {
                for (const action of parsedResponse.actions) {
                     if ( (action.type !== 'ACTIVATE_FABRICATION_HUB' && (action.units === undefined || action.units <= 0)) &&
                          (action.type === 'EVOLVE_UNITS' && (action.unitsToEvolve === undefined || action.unitsToEvolve <=0))
                        ) {
                        lastValidationError = `Action ${action.type} has invalid or missing units/unitsToEvolve value. Must be > 0.`;
                        currentAttemptIsValid = false; break;
                    }
                    if (currentPhaseSnapshot === 'MANEUVER' && !['DEPLOY_UNITS', 'MOVE_UNITS', 'ACTIVATE_FABRICATION_HUB', 'EVOLVE_UNITS'].includes(action.type)) {
                        lastValidationError = `Action ${action.type} is invalid in MANEUVER phase.`; currentAttemptIsValid = false; break;
                    }
                    if (currentPhaseSnapshot === 'COMBAT' && action.type !== 'ATTACK_NODE') {
                        lastValidationError = `Action ${action.type} is invalid in COMBAT phase.`; currentAttemptIsValid = false; break;
                    }
                    if (action.type === 'DEPLOY_UNITS') {
                        const targetNode = gameState.mapNodes[action.nodeId!];
                        const totalUnitsAtNode = (targetNode.standardUnits || 0) + (targetNode.evolvedUnits || 0);
                        if (!targetNode.isCN || targetNode.owner !== currentPlayerId) { lastValidationError = `DEPLOY_UNITS to non-owned CN.`; currentAttemptIsValid = false; break;}
                        if (gameState.factions[currentPlayerId].qr < (action.units || 0)) { lastValidationError = `DEPLOY_UNITS: Insufficient QR.`; currentAttemptIsValid = false; break;}
                        if (totalUnitsAtNode + (action.units || 0) > (targetNode.maxUnits || Infinity)) { lastValidationError = `DEPLOY_UNITS to ${targetNode.label}: Would exceed max units (${targetNode.maxUnits}). Current: ${totalUnitsAtNode}, Deploying: ${action.units || 0}`; currentAttemptIsValid = false; break; }
                    } else if (action.type === 'MOVE_UNITS') {
                        const sourceNode = gameState.mapNodes[action.fromNodeId!]; const destNode = gameState.mapNodes[action.toNodeId!];
                        const totalSourceUnits = (sourceNode.standardUnits || 0) + (sourceNode.evolvedUnits || 0);
                        const totalDestUnits = (destNode.standardUnits || 0) + (destNode.evolvedUnits || 0);
                        if (sourceNode.owner !== currentPlayerId) {lastValidationError = `MOVE_UNITS from unowned node.`; currentAttemptIsValid = false; break;}
                        if (totalSourceUnits < (action.units || 0)) {lastValidationError = `MOVE_UNITS: Insufficient units at source.`; currentAttemptIsValid = false; break;}
                        if (!sourceNode.connections.includes(action.toNodeId!)) {lastValidationError = `MOVE_UNITS: Nodes not connected.`; currentAttemptIsValid = false; break;}
                        if (destNode.owner !== currentPlayerId && destNode.owner !== 'NEUTRAL') {lastValidationError = `MOVE_UNITS to enemy node in MANEUVER.`; currentAttemptIsValid = false; break;}
                        if (totalDestUnits + (action.units || 0) > (destNode.maxUnits || Infinity)) { lastValidationError = `MOVE_UNITS to ${destNode.label}: Destination would exceed max units (${destNode.maxUnits}). Current: ${totalDestUnits}, Moving: ${action.units || 0}`; currentAttemptIsValid = false; break; }
                    } else if (action.type === 'ACTIVATE_FABRICATION_HUB') {
                        const targetNode = gameState.mapNodes[action.nodeId!];
                        const totalUnitsAtNode = (targetNode.standardUnits || 0) + (targetNode.evolvedUnits || 0);
                        if(!targetNode.hasFabricationHub) {lastValidationError = `ACT_HUB: Node has no hub.`; currentAttemptIsValid = false; break;}
                        if(targetNode.isHubActive) {lastValidationError = `ACT_HUB: Hub already active.`; currentAttemptIsValid = false; break;}
                        if(gameState.factions[currentPlayerId].qr < FAB_HUB_ACTIVATION_COST) {lastValidationError = `ACT_HUB: Insufficient QR.`; currentAttemptIsValid = false; break;}
                        if(totalUnitsAtNode < FAB_HUB_GARRISON_MIN) {lastValidationError = `ACT_HUB: Insufficient garrison.`; currentAttemptIsValid = false; break;}
                        if(!isNodeConnectedToCN(action.nodeId!, currentPlayerId, gameState.mapNodes)) {lastValidationError = `ACT_HUB: Node not connected to CN.`; currentAttemptIsValid = false; break;}
                    } else if (action.type === 'EVOLVE_UNITS') {
                        const targetNode = gameState.mapNodes[action.nodeId!];
                        if(!targetNode.isHubActive) {lastValidationError = `EVOLVE: Hub not active.`; currentAttemptIsValid = false; break;}
                        if(gameState.factions[currentPlayerId].qr < ((action.unitsToEvolve || 0) * EVOLVE_UNIT_COST) ) {lastValidationError = `EVOLVE: Insufficient QR.`; currentAttemptIsValid = false; break;}
                        if(targetNode.standardUnits < (action.unitsToEvolve || 0)) {lastValidationError = `EVOLVE: Insufficient standard units.`; currentAttemptIsValid = false; break;}
                        if(!isNodeConnectedToCN(action.nodeId!, currentPlayerId, gameState.mapNodes)) {lastValidationError = `EVOLVE: Node not connected to CN.`; currentAttemptIsValid = false; break;}
                    }
                }
            }

            if (currentAttemptIsValid && parsedResponse) {
                processAIResponse(parsedResponse, currentPlayerId);
                aiResponseProcessedSuccessfully = true;
                 setGameState(prev => ({ ...prev, factions: { ...prev.factions, [currentPlayerId]: { ...prev.factions[currentPlayerId], successfulPhases: prev.factions[currentPlayerId].successfulPhases + 1 }}}));
                if (attempt > 0) {
                    addSystemLog(`${currentPlayerId} provided valid actions on attempt ${attempt + 1}.`, 'INFO', currentPlayerId);
                }
                break; 
            } else {
                const validationErrorMsg = lastValidationError || "Unknown pre-validation error.";
                console.error(`Pre-validation failed for ${currentPlayerId} (Attempt ${attempt + 1}):`, validationErrorMsg, "Raw response:", aiResponseText);
                setGameState(prev => ({ ...prev, factions: { ...prev.factions, [currentPlayerId]: { ...prev.factions[currentPlayerId], aiError: `Validation Error (Attempt ${attempt+1}): ${validationErrorMsg}.` }}}));
                if (attempt === MAX_NOOSPHERIC_RETRY_ATTEMPTS) {
                    addSystemLog(`${currentPlayerId} failed all ${MAX_NOOSPHERIC_RETRY_ATTEMPTS + 1} attempts. Last error: ${validationErrorMsg}`, 'ERROR', currentPlayerId);
                    setGameState(prev => ({ ...prev, factions: { ...prev.factions, [currentPlayerId]: { ...prev.factions[currentPlayerId], failedPhases: prev.factions[currentPlayerId].failedPhases + 1 }}}));
                }
            }
        } catch (apiOrParseError) {
            lastValidationError = apiOrParseError instanceof Error ? apiOrParseError.message : String(apiOrParseError);
            const rawResp = (apiOrParseError as any).responseText || "N/A"; 
            console.error(`Error processing AI response for ${currentPlayerId} (Attempt ${attempt + 1}):`, lastValidationError, "Raw (if available):", rawResp);
            addSystemLog(`Error from ${currentPlayerId} (Attempt ${attempt + 1}): ${lastValidationError.substring(0,100)}...`, "ERROR", currentPlayerId);
            setGameState(prev => ({ ...prev, factions: { ...prev.factions, [currentPlayerId]: { ...prev.factions[currentPlayerId], aiError: `API/Parse Error (Attempt ${attempt+1}): ${lastValidationError}.` }}}));
            if (attempt === MAX_NOOSPHERIC_RETRY_ATTEMPTS) {
                 addSystemLog(`${currentPlayerId} failed all ${MAX_NOOSPHERIC_RETRY_ATTEMPTS + 1} attempts after API/Parse error. Last: ${lastValidationError}`, 'ERROR', currentPlayerId);
                 setGameState(prev => ({ ...prev, factions: { ...prev.factions, [currentPlayerId]: { ...prev.factions[currentPlayerId], failedPhases: prev.factions[currentPlayerId].failedPhases + 1 }}}));
            }
        }
    } 

    if (!aiResponseProcessedSuccessfully) {
        addSystemLog(`${currentPlayerId} failed to provide valid actions after all attempts. Turn actions skipped.`, 'ERROR', currentPlayerId);
        setGameState(prev => ({ ...prev, factions: { ...prev.factions, [currentPlayerId]: { ...prev.factions[currentPlayerId], failedPhases: prev.factions[currentPlayerId].failedPhases + 1 }}}));
    }

    setIsLoadingAI(null);
    setTimeout(advancePhase, AI_DECISION_DELAY_MS);
  }, [apiKeyMissing, gameIsOverRef, isOverallAiReady, gameState, ai1Chat, ai2Chat, addSystemLog, processAIResponse, advancePhase, isNodeConnectedToCN]);
  
  useEffect(() => {
     if (isGameStarted && isOverallAiReady && !gameState.isPaused && !isLoadingAI && !gameIsOverRef.current && gameState.currentPhase !== 'GAME_OVER') {
        if (gameState.currentPhase === 'MANEUVER' || gameState.currentPhase === 'COMBAT') {
            const timeoutId = setTimeout(() => makeAIMove(), AI_DECISION_DELAY_MS); 
            return () => clearTimeout(timeoutId);
        } 
        else if ((gameState.currentPhase === 'FLUCTUATION' || gameState.currentPhase === 'RESOURCE') && gameState.turn === 1 && 
                 (gameState.systemLog.length === 1 && gameState.systemLog[0].message.includes("game started on"))) {
            const timeoutId = setTimeout(() => advancePhase(), PHASE_ADVANCE_DELAY_MS);
            return () => clearTimeout(timeoutId);
        }
    }
  }, [isGameStarted, gameState.currentPhase, gameState.activePlayer, gameState.turn, gameState.isPaused, isLoadingAI, isOverallAiReady, makeAIMove, advancePhase, gameState.systemLog]);


  useEffect(() => {
    if (isGameStartedFromBackup && initialGameState) {
      setGameState(initialGameState);
      setCurrentMapTypeInternal(initialGameState.mapType);
      setIsGameStarted(true); 
      if (initialGameState.turn > 1) { 
        setCompletedTurnsForAvg(initialGameState.turn -1); 
        setAverageTurnTimeDisplay("Resumed"); 
      } else {
        setTotalGameTimeMs(0);
        setCompletedTurnsForAvg(0);
        setAverageTurnTimeDisplay("--:--.-");
      }
      turnStartTimeForAvgRef.current = Date.now();
      kjControlStreakRef.current = { 'GEM-Q': 0, 'AXIOM': 0 }; 
    } else if (!isGameStartedFromBackup && !isGameStarted) {
      setGameState(createInitialGameState(initialMapType, false));
      setTotalGameTimeMs(0);
      setCompletedTurnsForAvg(0);
      setAverageTurnTimeDisplay("--:--.-");
      turnStartTimeForAvgRef.current = null;
      kjControlStreakRef.current = { 'GEM-Q': 0, 'AXIOM': 0 };
    }
  }, [isGameStartedFromBackup, initialGameState, initialMapType, createInitialGameState, isGameStarted]);


  useEffect(() => {
    const cleanupInterval = () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    };

    const isTimerRunningCondition = isGameStarted &&
                                   !gameState.isPaused &&
                                   isLoadingAI && 
                                   (gameState.currentPhase === 'MANEUVER' || gameState.currentPhase === 'COMBAT');

    if (isTimerRunningCondition) {
        if (!aiTurnStartTimeRef.current) {
            aiTurnStartTimeRef.current = Date.now();
            setCurrentAiTurnDurationDisplay(formatDuration(0));
        }
        cleanupInterval(); 
        timerIntervalRef.current = setInterval(() => {
            if (aiTurnStartTimeRef.current) {
                const elapsed = Date.now() - aiTurnStartTimeRef.current;
                setCurrentAiTurnDurationDisplay(formatDuration(elapsed));
            }
        }, 100);
    } else {
        cleanupInterval();
        if (aiTurnStartTimeRef.current && !isLoadingAI) { 
            aiTurnStartTimeRef.current = null; 
        }
        
        if (!isGameStarted || 
            gameState.currentPhase === 'FLUCTUATION' || 
            gameState.currentPhase === 'RESOURCE' || 
            gameState.currentPhase === 'GAME_OVER') {
            setCurrentAiTurnDurationDisplay("--:--.-");
            aiTurnStartTimeRef.current = null; 
        }
    }
    return cleanupInterval;
  }, [isLoadingAI, gameState.currentPhase, gameState.isPaused, isGameStarted, gameState.turn, formatDuration]); 


  if (!isOverallAiReady && !isGameStartedFromBackup) { 
    return (
      <div className="flex flex-col items-center justify-center h-full text-lg text-[var(--color-error)] p-4 text-center w-full">
        <p>Initializing AI for Noospheric Conquest... Please wait.</p>
        {appInitializationError && !apiKeyMissing && (
          <div className="mt-4 text-sm text-[var(--color-error)] bg-[var(--color-bg-panel)] p-3 rounded border border-[var(--color-error)] max-w-md">
            <p className="font-semibold">An error occurred during App AI initialization:</p>
            <pre className="whitespace-pre-wrap mt-2">{appInitializationError}</pre>
          </div>
        )}
         {apiKeyMissing && (
           <div className="mt-4 text-sm text-[var(--color-error)] bg-[var(--color-bg-panel)] p-3 rounded border border-[var(--color-error)] max-w-md">
            <p className="font-semibold">API Key Missing!</p>
            <p>The API_KEY is not configured. Noospheric AIs cannot be initialized.</p>
          </div>
        )}
      </div>
    );
  }

  const gemQTacticalAnalysisCurrent = gameState.factions['GEM-Q'].aiError 
    ? gameState.factions['GEM-Q'].aiError
    : isLoadingAI === 'GEM-Q' && !gameState.factions['GEM-Q'].aiError 
        ? "Analyzing..." 
        : gameState.factions['GEM-Q'].tacticalAnalysis || "Awaiting orders...";

  const axiomTacticalAnalysisCurrent = gameState.factions['AXIOM'].aiError
    ? gameState.factions['AXIOM'].aiError
    : isLoadingAI === 'AXIOM' && !gameState.factions['AXIOM'].aiError 
        ? "Analyzing..."
        : gameState.factions['AXIOM'].tacticalAnalysis || "Awaiting orders...";


  const renderTacticalAnalysisBox = (
    factionId: 'GEM-Q' | 'AXIOM',
    title: string,
    currentAnalysis: string,
    history: TacticalAnalysisEntry[],
    showHistoryState: boolean,
    setShowHistoryState: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const borderColorClass = factionId === 'GEM-Q' ? 'border-[var(--color-ai1-text)]' : 'border-[var(--color-ai2-text)]';
    const textColorClass = factionId === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]';
    const isLoadingThisAI = isLoadingAI === factionId;
    const aiError = gameState.factions[factionId].aiError;

    return (
      <div className={`bg-[var(--color-bg-panel)] p-2.5 border-2 ${borderColorClass} rounded shadow-md overflow-hidden flex flex-col h-full`}>
        <div className="flex justify-between items-center mb-0.5 flex-shrink-0">
            <h4 className={`text-sm font-semibold ${textColorClass} border-b border-opacity-50 pb-1`}>{title}</h4>
            {history && history.length > 0 && (
                <button 
                    onClick={() => setShowHistoryState(!showHistoryState)}
                    className="text-xs px-1.5 py-0.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
                >
                    {showHistoryState ? 'Current' : 'History'}
                </button>
            )}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] overflow-y-auto flex-grow custom-scrollbar pr-1">
            {showHistoryState ? (
                history.slice().reverse().map((entry, index) => (
                    <p key={index} className="mb-1 border-b border-dashed border-[var(--color-border-base)] border-opacity-30 pb-0.5">
                        <span className="opacity-70">[T{entry.turn}, {entry.phase.substring(0,3)}]</span> {entry.analysis}
                    </p>
                ))
            ) : (
                aiError 
                    ? <span className="text-[var(--color-error)]">{currentAnalysis}</span>
                    : (isLoadingThisAI && !aiError ? <span className="animate-pulse">{currentAnalysis}</span> : currentAnalysis)
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-bg-page)] text-[var(--color-text-base)] p-1 md:p-2 overflow-hidden">
      <div ref={dataDivRef} id="noospheric-conquest-container-data" style={{ display: 'none' }}></div>
      <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center mb-2 p-2 bg-[var(--color-bg-panel)] rounded-md shadow-md">
        <div className="flex items-center">
            <h1 className="text-lg md:text-xl font-bold text-[var(--color-text-heading)] mr-2">
            Noospheric Conquest
            </h1>
            <select
                id="noosphericMapSelect"
                value={currentMapTypeInternal}
                onChange={handleMapTypeChange}
                className="bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1.5 rounded-sm focus-ring-accent text-xs appearance-none pl-3 pr-6"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                aria-label="Select Map"
                disabled={isGameStarted || isLoadingAI !== null}
            >
            {ALL_MAP_TYPES.map(mapName => (
                <option key={mapName} value={mapName}>{mapName}</option>
            ))}
            </select>
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <button 
            onClick={handleStartNewGameClick}
            className="px-3 py-1.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-xs font-semibold"
            disabled={isLoadingAI !== null && isGameStarted && gameState.currentPhase !== 'GAME_OVER'}
            aria-label={isGameStarted ? "Start New Game" : "Start Game"}
          >
            {isGameStarted ? 'New Game' : 'Start Game'}
          </button>
          <button 
            onClick={handlePauseToggle}
            className={`px-3 py-1.5 rounded text-xs font-semibold focus-ring-accent
                        ${gameState.isPaused 
                          ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
                          : 'bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] hover:bg-[var(--color-bg-button-secondary-hover)]'}`}
            aria-label={gameState.isPaused ? "Resume Simulation" : "Pause Simulation"}
            disabled={!isGameStarted || gameState.currentPhase === 'GAME_OVER'}
          >
            {gameState.isPaused ? 'Resume Sim' : 'Pause Sim'}
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-grow min-h-0 gap-2">
        <main className="flex-grow flex flex-col w-full md:w-[calc(100%-320px-0.5rem)] min-h-0"> 
          <div className="flex-grow bg-[var(--color-bg-terminal)] border-2 border-[var(--color-border-base)] rounded-md shadow-lg p-1 md:p-2 overflow-hidden h-[65%] md:h-[calc(100%-9.5rem-0.5rem)]">
            <NoosphericMapDisplay 
              nodes={Object.values(gameState.mapNodes)} 
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNodeId}
              factionColors={{
                'GEM-Q': THEMES[activeTheme]?.ai1TextColor || '#ef4444', 
                'AXIOM': THEMES[activeTheme]?.ai2TextColor || '#22d3ee', 
                'NEUTRAL': '#6b7280', 
                'KJ_NEUTRAL': THEMES[activeTheme]?.neutralKJColor || '#eab308',
              }}
              isLoadingAI={isLoadingAI}
              activePlayer={gameState.activePlayer}
              gameState={gameState} 
            />
          </div>
          <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 h-[35%] md:h-[9.5rem]">
             {renderTacticalAnalysisBox('GEM-Q', `${AI1_NAME} (Red) - Tactical Analysis`, gemQTacticalAnalysisCurrent, gameState.factions['GEM-Q'].tacticalAnalysisHistory, showGemQMainHistory, setShowGemQMainHistory)}
             {renderTacticalAnalysisBox('AXIOM', `${AI2_NAME} (Cyan) - Tactical Analysis`, axiomTacticalAnalysisCurrent, gameState.factions['AXIOM'].tacticalAnalysisHistory, showAxiomMainHistory, setShowAxiomMainHistory)}
          </div>
        </main>

        <NoosphericSidebar 
          gameState={gameState} 
          selectedNodeId={selectedNodeId}
          isLoadingAI={isLoadingAI}
          onOpenInfoModal={onOpenInfoModal}
          activeTheme={activeTheme}
          isGameStarted={isGameStarted}
          currentAiTurnDurationDisplay={currentAiTurnDurationDisplay} 
          averageTurnTimeDisplay={averageTurnTimeDisplay}
          totalGameTimeMs={gameState.currentPhase === 'GAME_OVER' ? totalGameTimeMs : undefined}
          formatDuration={formatDuration}
        />
      </div>
      {latestBattleReportForModal && (
        <BattleReportModal
          report={latestBattleReportForModal}
          factionColors={THEMES[activeTheme]}
          onClose={() => setLatestBattleReportForModal(null)}
        />
      )}
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
    </div>
  );
};

export default NoosphericConquestContainer;
