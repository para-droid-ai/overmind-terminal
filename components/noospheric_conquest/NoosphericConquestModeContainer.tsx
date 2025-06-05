import React, { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppMode } from '../../types'; // Global AppMode
import { 
    LucideSwords, LucideShield, LucideZap, LucideAtom, LucideDice5, LucideMove, 
    LucidePlusCircle, LucideDollarSign, LucideAlertTriangle, LucideInfo, 
    LucideChevronRight, LucideChevronLeft, LucideTimer, LucideMapPin, LucideTarget, 
    LucideFactory, LucideBox, LucideShuffle, LucideGlobe, LucideMap, LucideX, 
    LucideBrain, LucideScrollText, LucideArrowLeftToLine
} from 'lucide-react';

import { 
    QuantumUnitType, PlayerIdNC, QuantumUnit, QuantumGambitNode,
    QuantumGambitPlayerState, ActiveQuantumFluctuationEvent, BattleReport, GameLogMessageNC,
    GamePhaseNC, NoosphericConquestGameState, MapTemplate, AIAction, AIResponseFormat, CombatRoundLog
} from './types_nc';
import {
    AI1_ID_NC, AI2_ID_NC, AI1_NAME_NC, AI2_NAME_NC, SYSTEM_SENDER_NAME_NC, EVENT_SENDER_NAME_NC,
    THEME_COLORS_NC, NOOSPHERIC_CONQUEST_TURN_LIMIT, NOOSPHERIC_CONQUEST_INITIAL_RESOURCES,
    NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED, MAX_BATTLE_HISTORY_LENGTH,
    NC_UNIT_DEFINITIONS, NC_MAP_TEMPLATES, NC_QUANTUM_FLUCTUATION_EVENTS_POOL,
    NC_AI1_SYSTEM_PROMPT_TEMPLATE, NC_AI2_SYSTEM_PROMPT_TEMPLATE, getUnitIcon, getPlayerColor
} from './constants_nc';

interface NoosphericConquestModeContainerProps {
  genAI: GoogleGenAI | null;
  appOnModeChange: (newMode: AppMode) => void; 
}

// --- Game State Initialization and Reducer ---
const generateUnitId = (type: QuantumUnitType, owner: PlayerIdNC | 'NEUTRAL', count: number) => `${type}-${owner}-${String(count).padStart(3, '0')}`;

const initialGameState = (selectedTemplate?: MapTemplate): NoosphericConquestGameState => { 
  const template = selectedTemplate || NC_MAP_TEMPLATES[Math.floor(Math.random() * NC_MAP_TEMPLATES.length)];
  
  const nodes: Record<string, QuantumGambitNode> = {};
  template.nodes.forEach(nodeData => {
    nodes[nodeData.id] = {
      ...nodeData,
      owner: 'NEUTRAL', 
      temporaryEffects: [],
    };
  });

  const units: Record<string, QuantumUnit> = {};
  const players: Record<PlayerIdNC, QuantumGambitPlayerState> = {
    [AI1_ID_NC]: { 
        id: AI1_ID_NC, name: AI1_NAME_NC, color: THEME_COLORS_NC.AI1.text, bgColor: THEME_COLORS_NC.AI1.bg, 
        resources: NOOSPHERIC_CONQUEST_INITIAL_RESOURCES, commandNodeId: template.ai1StartNodeId, 
        controlledKeyJunctionsTurns: {}, unitsDeployed: 0 
    },
    [AI2_ID_NC]: { 
        id: AI2_ID_NC, name: AI2_NAME_NC, color: THEME_COLORS_NC.AI2.text, bgColor: THEME_COLORS_NC.AI2.bg, 
        resources: NOOSPHERIC_CONQUEST_INITIAL_RESOURCES, commandNodeId: template.ai2StartNodeId, 
        controlledKeyJunctionsTurns: {}, unitsDeployed: 0 
    },
  } as Record<PlayerIdNC, QuantumGambitPlayerState>; // Explicit cast

  template.ai1InitialControlledNodes.forEach(nodeId => {
      if(nodes[nodeId]) nodes[nodeId].owner = AI1_ID_NC;
  });
  let p1UnitsDeployedCount = 0; 
  units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID_NC, ++p1UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID_NC, p1UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI1_ID_NC, nodeId: template.ai1StartNodeId, displayOrder: 1 };
  units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID_NC, ++p1UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID_NC, p1UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI1_ID_NC, nodeId: template.ai1StartNodeId, displayOrder: 2 };
  const ai1OtherStartNodes = template.ai1InitialControlledNodes.filter(id => id !== template.ai1StartNodeId);
  if (ai1OtherStartNodes.length > 0 && nodes[ai1OtherStartNodes[0]]) {
      units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID_NC, ++p1UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID_NC, p1UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI1_ID_NC, nodeId: ai1OtherStartNodes[0], displayOrder: 1 };
  }
  players[AI1_ID_NC].unitsDeployed = p1UnitsDeployedCount;


  template.ai2InitialControlledNodes.forEach(nodeId => {
      if(nodes[nodeId]) nodes[nodeId].owner = AI2_ID_NC;
  });
  let p2UnitsDeployedCount = 0;
  units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID_NC, ++p2UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID_NC, p2UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI2_ID_NC, nodeId: template.ai2StartNodeId, displayOrder: 1 };
  units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID_NC, ++p2UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID_NC, p2UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI2_ID_NC, nodeId: template.ai2StartNodeId, displayOrder: 2 };
  const ai2OtherStartNodes = template.ai2InitialControlledNodes.filter(id => id !== template.ai2StartNodeId);
  if (ai2OtherStartNodes.length > 0 && nodes[ai2OtherStartNodes[0]]) {
      units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID_NC, ++p2UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID_NC, p2UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI2_ID_NC, nodeId: ai2OtherStartNodes[0], displayOrder: 1 };
  }
  players[AI2_ID_NC].unitsDeployed = p2UnitsDeployedCount;
  
  let neutralUnitsCount = 0;
  (template.neutralKJsWithUnits || []).forEach(nodeId => {
      if(nodes[nodeId]) {
          nodes[nodeId].owner = 'NEUTRAL';
          const unitId = generateUnitId(QuantumUnitType.LOGIC_CORE, 'NEUTRAL', ++neutralUnitsCount);
          units[unitId] = { id: unitId, type: QuantumUnitType.LOGIC_CORE, owner: 'NEUTRAL', nodeId: nodeId, displayOrder: 1 };
      }
  });
   (template.neutralNodesWithUnits || []).forEach(nodeId => {
      if(nodes[nodeId]) {
          nodes[nodeId].owner = 'NEUTRAL';
          const unitId = generateUnitId(QuantumUnitType.LOGIC_CORE, 'NEUTRAL', ++neutralUnitsCount);
          units[unitId] = { id: unitId, type: QuantumUnitType.LOGIC_CORE, owner: 'NEUTRAL', nodeId: nodeId, displayOrder: 1 };
      }
  });
  
  const keyJunctionsOnMap = template.nodes.filter(n => n.type === 'KJ').map(n => n.id);

  return {
    nodes, units, players, currentTurn: 1, currentPlayerId: AI1_ID_NC, currentPhase: 'FLUCTUATION',
    gameLog: [{ id: 'start', sender: SYSTEM_SENDER_NAME_NC, text: `Noospheric Conquest on "${template.name}" map. Turn 1: ${AI1_NAME_NC} (Red). Fluctuation Phase.`, color: THEME_COLORS_NC.SYSTEM, icon: <LucideAtom size={16}/> as React.ReactElement, timestamp: Date.now() }],
    activeFluctuationEvent: null, battleReport: null, battleHistory: [], 
    keyJunctionsOnMap,
    turnLimit: NOOSPHERIC_CONQUEST_TURN_LIMIT,
    isBattlePopupVisible: false, turnStartTime: Date.now(), selectedNodeId: null, currentMapTemplateName: template.name,
  };
};

type DeploymentOrder = { unitType: QuantumUnitType; nodeId: string; quantity: number; }
type AttackDeclaration = { fromNodeId: string; toNodeId: string; attackingUnits: QuantumUnit[]; } 
type ManeuverOrder = { unitId: string; toNodeId: string; }

type GameAction = 
  | { type: 'START_GAME'; payload?: { templateName?: string } } 
  | { type: 'ADVANCE_PHASE'; payload?: any } 
  | { type: 'SET_ACTIVE_EVENT'; payload: ActiveQuantumFluctuationEvent }
  | { type: 'APPLY_EVENT_EFFECTS_COMPLETE' } | { type: 'COLLECT_RESOURCES' }
  | { type: 'DEPLOY_UNITS'; payload: { playerId: PlayerIdNC; deployments: DeploymentOrder[] } }
  | { type: 'DECLARE_ATTACK'; payload: { battleReport: BattleReport } } // Removed 'attack' from payload as it's in battleReport
  | { type: 'MANEUVER_UNITS'; payload: { playerId: PlayerIdNC; maneuvers: ManeuverOrder[] } }
  | { type: 'SET_GAME_OVER'; payload: { winner?: PlayerIdNC | 'DRAW'; message: string } }
  | { type: 'ADD_LOG'; payload: Omit<GameLogMessageNC, 'id' | 'timestamp'> }
  | { type: 'SHOW_BATTLE_POPUP'; payload: BattleReport } | { type: 'HIDE_BATTLE_POPUP' }
  | { type: 'RESET_GAME_FOR_NEW_TURN'; payload?: { units?: Record<string, Partial<QuantumUnit>> } } 
  | { type: 'SELECT_NODE'; payload: string | null };


// Game Reducer
const gameReducer = (state: NoosphericConquestGameState, action: GameAction): NoosphericConquestGameState => { 
   switch (action.type) {
    case 'ADD_LOG':
      return {
        ...state,
        gameLog: [...state.gameLog, { ...action.payload, id: `log-${Date.now()}-${Math.random()}`, timestamp: Date.now() }].slice(-100), // Keep last 100 logs
      };
    case 'SELECT_NODE':
        return { ...state, selectedNodeId: action.payload };
    
    case 'SET_ACTIVE_EVENT': {
        const payload = action.payload as ActiveQuantumFluctuationEvent; // Explicit assertion
        return { ...state, activeFluctuationEvent: payload };
    }
    
    case 'APPLY_EVENT_EFFECTS_COMPLETE': {
        const newPlayers = { 
            ...state.players, 
            [AI1_ID_NC]: {...state.players[AI1_ID_NC]}, 
            [AI2_ID_NC]: {...state.players[AI2_ID_NC]} 
        };
        const newUnits = { ...state.units }; 
        let newActiveEvent = state.activeFluctuationEvent ? { ...state.activeFluctuationEvent, effectApplied: true } : null;

        if (newActiveEvent?.effectType === "RESOURCE_NODE_BONUS" && newActiveEvent.targetNodeIds) {
            const targetNodeId = newActiveEvent.targetNodeIds[0];
            const node = state.nodes[targetNodeId];
            if (node && node.owner !== 'NEUTRAL') {
                const ownerId = node.owner;
                 newPlayers[ownerId] = {...newPlayers[ownerId], resources: newPlayers[ownerId].resources + (newActiveEvent.details?.bonusValue || 0) };
            }
        }
        if (newActiveEvent?.effectType === "FREE_UNIT_DEPLOYMENT" && newActiveEvent.targetPlayerId) {
            const playerId = newActiveEvent.targetPlayerId;
            const playerHubs = Object.values(state.nodes).filter(n => n.owner === playerId && n.hasFabricationHub);
            if (playerHubs.length > 0) {
                const targetNodeId = playerHubs[0].id; // Deploy to first available hub
                const unitType = newActiveEvent.details.unitType as QuantumUnitType;
                const newUnitsDeployedCount = newPlayers[playerId].unitsDeployed + 1; 
                
                newPlayers[playerId] = {...newPlayers[playerId], unitsDeployed: newUnitsDeployedCount}; 

                const unitId = generateUnitId(unitType, playerId, newUnitsDeployedCount);
                const existingUnitsInNode = Object.values(state.units).filter(u => u.nodeId === targetNodeId).length;
                newUnits[unitId] = { id: unitId, type: unitType, owner: playerId, nodeId: targetNodeId, displayOrder: existingUnitsInNode + 1, hasMovedThisTurn: true, hasAttackedThisTurn: true };
            }
        }
        return { ...state, activeFluctuationEvent: newActiveEvent, players: newPlayers, units: newUnits };
    }

    case 'COLLECT_RESOURCES': {
      const currentPlayerState = state.players[state.currentPlayerId];
      let newResources = currentPlayerState.resources;
      Object.values(state.nodes).forEach(node => {
        if (node.owner === state.currentPlayerId) {
          newResources += node.resourcesPerTurn;
        }
      });
      return {
        ...state,
        players: {
          ...state.players,
          [state.currentPlayerId]: { ...currentPlayerState, resources: newResources },
        },
      };
    }
    
    case 'DEPLOY_UNITS': {
        if (!action.payload) return state;
        const payload: { playerId: PlayerIdNC; deployments: DeploymentOrder[] } = action.payload;
        const { playerId, deployments } = payload;
        const newPlayerState = { ...state.players[playerId] };
        const newUnits = { ...state.units };
        let currentUnitsDeployedCount = newPlayerState.unitsDeployed;

        deployments.forEach(order => {
            const unitDef = NC_UNIT_DEFINITIONS[order.unitType];
            if (newPlayerState.resources >= unitDef.cost * order.quantity && state.nodes[order.nodeId]?.hasFabricationHub && state.nodes[order.nodeId]?.owner === playerId) {
                for (let i = 0; i < order.quantity; i++) {
                    newPlayerState.resources -= unitDef.cost;
                    currentUnitsDeployedCount++;
                    const unitId = generateUnitId(order.unitType, playerId, currentUnitsDeployedCount);
                    const existingUnitsInNode = Object.values(newUnits).filter(u => u.nodeId === order.nodeId).length;
                    newUnits[unitId] = { id: unitId, type: order.unitType, owner: playerId, nodeId: order.nodeId, displayOrder: existingUnitsInNode + 1, hasMovedThisTurn: true, hasAttackedThisTurn: true };
                }
            }
        });
        newPlayerState.unitsDeployed = currentUnitsDeployedCount;
        return { 
            ...state, 
            players: { ...state.players, [playerId]: newPlayerState }, 
            units: newUnits 
        };
    }

    case 'DECLARE_ATTACK': {
        const { battleReport } = action.payload; 
        const newUnits = { ...state.units };
        const newNodes = { ...state.nodes }; 
        const combatLog: CombatRoundLog[] = [];
        let currentAttackerUnits = Object.values(newUnits).filter(u => battleReport.attackingUnitsCommitted.some(auc => auc.id === u.id));
        let currentDefenderUnits = Object.values(newUnits).filter(u => battleReport.defendingUnitsInitial.some(dui => dui.id === u.id));
        const attackerOriginalCount = currentAttackerUnits.length;
        const defenderOriginalCount = currentDefenderUnits.length;
        let attackerLossesCount = 0;
        let defenderLossesCount = 0;
        let battleOutcome: BattleReport['outcome'];
        let nodeWasCaptured = false;

        // Handle auto-win if no defenders
        if (defenderOriginalCount === 0) {
            battleOutcome = 'attacker_wins';
            nodeWasCaptured = true; // Auto-capture empty node
            combatLog.push({ // Log the auto-win
                round: 1,
                attackerRoll: 0, // N/A
                defenderRoll: 0, // N/A
                outcome: 'clash', // Use 'clash' conceptually for no combat
                attackerUnitsRemaining: attackerOriginalCount,
                defenderUnitsRemaining: 0,
            });
        } else { // Regular combat
            let round = 1;
            while (currentAttackerUnits.length > 0 && currentDefenderUnits.length > 0) {
                // Simulate D6 rolls
                const attackerRoll = Math.floor(Math.random() * 6) + 1;
                const defenderRoll = Math.floor(Math.random() * 6) + 1;

                let roundOutcome: CombatRoundLog['outcome'];
                let attackerCasualty = 0;
                let defenderCasualty = 0;

                if (attackerRoll > defenderRoll) {
                    // Attacker wins the roll, Defender loses a unit
                    defenderCasualty = 1;
                    defenderLossesCount++;
                    currentDefenderUnits.pop(); // Remove one unit conceptually
                    roundOutcome = 'attacker_hits';
                } else if (defenderRoll > attackerRoll) {
                    // Defender wins the roll, Attacker loses a unit
                    attackerCasualty = 1;
                    attackerLossesCount++;
                    currentAttackerUnits.pop(); // Remove one unit conceptually
                    roundOutcome = 'defender_hits';
                } else {
                    // Rolls are equal, no casualties this round
                    roundOutcome = 'clash';
                }

                combatLog.push({
                    round: round,
                    attackerRoll: attackerRoll,
                    defenderRoll: defenderRoll,
                    outcome: roundOutcome,
                    attackerUnitsRemaining: currentAttackerUnits.length,
                    defenderUnitsRemaining: currentDefenderUnits.length,
                });

                round++;
            }

            // Determine overall battle outcome
            if (currentAttackerUnits.length === 0 && currentDefenderUnits.length === 0) {
                battleOutcome = 'stalemate_retreat'; // Both eliminated
            } else if (currentAttackerUnits.length === 0) {
                battleOutcome = 'defender_wins'; // Attacker eliminated
            } else { // currentDefenderUnits.length === 0
                battleOutcome = 'attacker_wins'; // Defender eliminated
                // Check if node is captured
                const targetNode = state.nodes[battleReport.toNodeId];
                if (targetNode && targetNode.owner !== battleReport.attacker) { // Only capture if it wasn't already theirs
                  nodeWasCaptured = true;
                }
            }
        }

        // Identify actual units lost based on counts
        const attackerLosses = battleReport.attackingUnitsCommitted
            .slice(0, attackerLossesCount) // Take the first N units as losses (simplified)
            .map(unit => ({ type: unit.type, id: unit.id }));

        const defenderLosses = battleReport.defendingUnitsInitial
            .slice(0, defenderLossesCount) // Take the first N units as losses (simplified)
            .map(unit => ({ type: unit.type, id: unit.id }));

        // Update the battleReport with the simulation results
        const finalBattleReport: BattleReport = {
            ...battleReport,
            combatLog: combatLog,
            outcome: battleOutcome,
            attackerLosses: attackerLosses,
            defenderLosses: defenderLosses,
            nodeCaptured: nodeWasCaptured,
        };

        // Add updated battle report to history
        const newBattleHistory = [...state.battleHistory, {...finalBattleReport, turn: state.currentTurn}].slice(-MAX_BATTLE_HISTORY_LENGTH);

        battleReport.attackingUnitsCommitted.forEach(attackerCommitted => {
            if (newUnits[attackerCommitted.id] && !battleReport.attackerLosses.some(loss => loss.id === attackerCommitted.id)) {
                newUnits[attackerCommitted.id].hasAttackedThisTurn = true;
            }
        });

        // Remove lost units based on the simulation results
        finalBattleReport.attackerLosses.forEach(lostUnit => { delete newUnits[lostUnit.id]; });
        finalBattleReport.defenderLosses.forEach(lostUnit => { delete newUnits[lostUnit.id]; });
        
        const battleNodeIds = new Set([battleReport.fromNodeId, battleReport.toNodeId]);
        battleNodeIds.forEach(nodeId => {
            const unitsInNode = Object.values(newUnits).filter(u => u.nodeId === nodeId).sort((a,b) => a.displayOrder - b.displayOrder);
            unitsInNode.forEach((u,idx) => { 
                if(newUnits[u.id]) newUnits[u.id].displayOrder = idx + 1; 
            });
        });

        // Update node owner if captured
        if (finalBattleReport.nodeCaptured) {
            const targetNode = newNodes[finalBattleReport.toNodeId];
            if (targetNode) {
                targetNode.owner = battleReport.attacker;
                // Clear any temporary effects on the captured node
                targetNode.temporaryEffects = [];
            }
        }

        return {
            ...state,
            units: newUnits,
            nodes: newNodes,
            battleHistory: newBattleHistory,
            battleReport: finalBattleReport, // Set current battle report for popup
        };
    }
    
    case 'SHOW_BATTLE_POPUP':
        // This action is now dispatched from handleAIPlayerTurn after the reducer updates state
        return { ...state, battleReport: action.payload as BattleReport, isBattlePopupVisible: true };
    case 'HIDE_BATTLE_POPUP':
        return { ...state, isBattlePopupVisible: false, battleReport: null };

    case 'MANEUVER_UNITS': {
        const { playerId, maneuvers } = action.payload;
        const newUnits = { ...state.units };
        const originNodeIdsProcessed = new Set<string>();

        maneuvers.forEach(order => {
            const unit = state.units[order.unitId];
            if (unit && unit.owner === playerId && !unit.hasMovedThisTurn && !unit.hasAttackedThisTurn) {
                const currentUnitNode = state.nodes[unit.nodeId];
                const targetNode = state.nodes[order.toNodeId];
                if (targetNode && targetNode.owner === playerId && currentUnitNode.connections.includes(order.toNodeId)) {
                    originNodeIdsProcessed.add(unit.nodeId);
                    newUnits[order.unitId] = { ...unit, nodeId: order.toNodeId, hasMovedThisTurn: true };
                }
            }
        });
        const affectedNodeIds = new Set([...originNodeIdsProcessed, ...maneuvers.map(m => m.toNodeId)]);
        affectedNodeIds.forEach(nodeId => {
            const unitsInNode = Object.values(newUnits).filter(u => u.nodeId === nodeId).sort((a,b) => a.displayOrder - b.displayOrder);
            unitsInNode.forEach((u,idx) => { 
                if (newUnits[u.id]) newUnits[u.id].displayOrder = idx + 1; 
            });
        });
        return { ...state, units: newUnits };
    }
    
    case 'RESET_GAME_FOR_NEW_TURN': {
        const newUnits = { ...state.units };
        const resetPayload = action.payload as { units?: Record<string, Partial<QuantumUnit>> } | undefined;
        if (resetPayload?.units) {
            const unitsToProcess: Record<string, Partial<QuantumUnit>> = resetPayload.units; // Explicitly capture narrowed type
            Object.keys(unitsToProcess).forEach(unitId => {
                if (newUnits[unitId]) {
                    newUnits[unitId] = { ...newUnits[unitId], ...unitsToProcess[unitId] };
                }
            });
        } else {
            Object.keys(newUnits).forEach(unitId => {
                if (newUnits[unitId]) { 
                     newUnits[unitId] = { ...newUnits[unitId], hasMovedThisTurn: false, hasAttackedThisTurn: false };
                }
            });
        }
        return { ...state, units: newUnits };
    }

    case 'ADVANCE_PHASE': {
      let nextPhase: GamePhaseNC = state.currentPhase;
      let nextPlayerId = state.currentPlayerId;
      let newTurn = state.currentTurn;
      let newTurnStartTime = state.turnStartTime;

      switch (state.currentPhase) {
        case 'FLUCTUATION': nextPhase = 'RESOURCE'; break;
        case 'RESOURCE':    nextPhase = 'DEPLOYMENT'; break;
        case 'DEPLOYMENT':  nextPhase = 'ATTACK'; break;
        case 'ATTACK':      nextPhase = 'MANEUVER'; break;
        case 'MANEUVER':
            nextPhase = 'FLUCTUATION'; 
            nextPlayerId = state.currentPlayerId === AI1_ID_NC ? AI2_ID_NC : AI1_ID_NC;
            if (nextPlayerId === AI1_ID_NC) newTurn = state.currentTurn + 1;
            newTurnStartTime = Date.now(); 
          break;
        default: break;
      }
      
      if (nextPhase === 'FLUCTUATION' && (newTurn > state.currentTurn || (newTurn === state.currentTurn && nextPlayerId !== state.currentPlayerId) )) { 
        const newPlayersData = { 
            ...state.players,
            [AI1_ID_NC]: { ...state.players[AI1_ID_NC], controlledKeyJunctionsTurns: { ...state.players[AI1_ID_NC].controlledKeyJunctionsTurns } },
            [AI2_ID_NC]: { ...state.players[AI2_ID_NC], controlledKeyJunctionsTurns: { ...state.players[AI2_ID_NC].controlledKeyJunctionsTurns } }
        };

        state.keyJunctionsOnMap.forEach(kjNodeId => {
            const node = state.nodes[kjNodeId];
            if (node.owner !== 'NEUTRAL') {
                if (node.owner === AI1_ID_NC) {
                    newPlayersData[AI1_ID_NC].controlledKeyJunctionsTurns[kjNodeId] = (newPlayersData[AI1_ID_NC].controlledKeyJunctionsTurns[kjNodeId] || 0) + 1;
                    newPlayersData[AI2_ID_NC].controlledKeyJunctionsTurns[kjNodeId] = 0;
                } else if (node.owner === AI2_ID_NC) {
                    newPlayersData[AI2_ID_NC].controlledKeyJunctionsTurns[kjNodeId] = (newPlayersData[AI2_ID_NC].controlledKeyJunctionsTurns[kjNodeId] || 0) + 1;
                    newPlayersData[AI1_ID_NC].controlledKeyJunctionsTurns[kjNodeId] = 0;
                }
            } else { 
                 newPlayersData[AI1_ID_NC].controlledKeyJunctionsTurns[kjNodeId] = 0;
                 newPlayersData[AI2_ID_NC].controlledKeyJunctionsTurns[kjNodeId] = 0;
            }
        });
        
        let kjWinPlayer: PlayerIdNC | null = null;
        ([AI1_ID_NC, AI2_ID_NC] as PlayerIdNC[]).forEach(pid => {
            let controlledKJsCount = 0;
            state.keyJunctionsOnMap.forEach(kjId => {
                if (newPlayersData[pid].controlledKeyJunctionsTurns[kjId] >= NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED) {
                    controlledKJsCount++;
                }
            });
            if (state.keyJunctionsOnMap.length > 0 && controlledKJsCount >= state.keyJunctionsOnMap.length) { 
                kjWinPlayer = pid;
            }
        });

        if (kjWinPlayer) {
            const winnerPlayer = kjWinPlayer as PlayerIdNC;
            const loserPlayerId = winnerPlayer === AI1_ID_NC ? AI2_ID_NC : AI1_ID_NC;
            const winnerPlayerName = state.players[winnerPlayer]?.name || 'Unknown Player';
            const loserPlayerName = state.players[loserPlayerId]?.name || 'Unknown Player';
            return {
                ...state, players: newPlayersData, winner: kjWinPlayer, currentPhase: 'GAME_OVER',
                gameOverMessage: `${winnerPlayerName} captured ${loserPlayerName}'s Command Node!`, turnStartTime: null,
            };
        }
        if (newTurn > state.turnLimit) {
            let p1Influence = newPlayersData[AI1_ID_NC].resources;
            let p2Influence = newPlayersData[AI2_ID_NC].resources;
            Object.values(state.nodes).forEach(n => {
                if(n.owner === AI1_ID_NC) p1Influence += n.resourcesPerTurn * 5;
                if(n.owner === AI2_ID_NC) p2Influence += n.resourcesPerTurn * 5;
            });
            Object.values(state.units).forEach(u => {
                if (u && u.type && NC_UNIT_DEFINITIONS[u.type]) {
                    if(u.owner === AI1_ID_NC) p1Influence += NC_UNIT_DEFINITIONS[u.type].cost;
                    if(u.owner === AI2_ID_NC) p2Influence += NC_UNIT_DEFINITIONS[u.type].cost;
                } else {
                    console.warn("Undefined unit or unit type in influence calculation:", u);
                }
            });
            const winner = p1Influence > p2Influence ? AI1_ID_NC : p2Influence > p1Influence ? AI2_ID_NC : 'DRAW';
            const winnerMessage = winner === 'DRAW' ? 'Draw!' : `${state.players[winner as PlayerIdNC]?.name || 'Unknown Player'} wins by Influence!`;
             return {
                ...state, players: newPlayersData, winner, currentPhase: 'GAME_OVER',
                gameOverMessage: `Turn limit! ${winnerMessage} (P1: ${p1Influence}, P2: ${p2Influence})`,
                turnStartTime: null,
            };
        }
         return { ...state, players: newPlayersData, currentPhase: nextPhase, currentPlayerId: nextPlayerId, currentTurn: newTurn, activeFluctuationEvent: null, battleReport: null, turnStartTime: newTurnStartTime };
      }
      return { ...state, currentPhase: nextPhase, currentPlayerId: nextPlayerId, currentTurn: newTurn, battleReport: null, turnStartTime: (nextPhase === 'FLUCTUATION' && newTurnStartTime === state.turnStartTime ? Date.now() : newTurnStartTime) };
    }

    case 'SET_GAME_OVER':
      return { ...state, currentPhase: 'GAME_OVER', winner: action.payload.winner, gameOverMessage: action.payload.message, turnStartTime: null };
    
    case 'START_GAME': {
        const selectedMapTpl = action.payload?.templateName 
            ? NC_MAP_TEMPLATES.find(t => t.name === action.payload?.templateName)
            : undefined; 
        return {...initialGameState(selectedMapTpl), turnStartTime: Date.now()};
      }
    default:
      return state;
  }
};


// --- UI Components ---
const CoTDisplayUI: React.FC<{ title: string; cot: string; isLoading: boolean; playerNameColor: string }> = ({ title, cot, isLoading, playerNameColor }) => (
  <div className={`p-3 h-32 md:h-40 flex flex-col ${THEME_COLORS_NC.BG_PANEL} border ${THEME_COLORS_NC.BORDER_BASE} rounded-md shadow-md`}>
    <h3 className={`text-sm font-semibold border-b ${THEME_COLORS_NC.BORDER_STRONG} pb-1 mb-2 ${playerNameColor}`}>
      {title} - Tactical Analysis
    </h3>
    <div className={`text-xs ${THEME_COLORS_NC.TEXT_MUTED} overflow-y-auto flex-grow pr-1 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700`}>
      {isLoading && <p className="animate-pulse">Calculating optimal vector...</p>}
      {!isLoading && cot && <p className="whitespace-pre-wrap break-words">{cot}</p>}
      {!isLoading && !cot && <p>Awaiting directives...</p>}
    </div>
  </div>
);

const UnitDisplayIcon: React.FC<{type: QuantumUnitType, owner: PlayerIdNC | 'NEUTRAL', size?: number, count?: number}> = ({ type, owner, size = 4, count }) => {
    const def = NC_UNIT_DEFINITIONS[type];
    const color = getPlayerColor(owner, 'text');
    return (
        <div className={`flex items-center ${color} scale-75 md:scale-90`} title={`${def.name}${count ? ' x'+count : ''}`}>
            {React.cloneElement(getUnitIcon(type) as React.ReactElement<{ size?: number }>, { size: size*4 })} 
            {count && count > 1 && <span className="ml-1 text-xs">x{count}</span>}
        </div>
    );
};


const QuantumGambitMapDisplay: React.FC<{ gameState: NoosphericConquestGameState, onNodeClick: (nodeId: string) => void, selectedNodeId: string | null }> = ({ gameState, onNodeClick, selectedNodeId }) => {
  const { nodes, units } = gameState;
  const mapSize = { width: 600, height: 400 }; 

  return (
    <div className={`relative ${THEME_COLORS_NC.BG_PANEL} border-2 ${THEME_COLORS_NC.BORDER_STRONG} rounded-lg shadow-2xl p-2 overflow-hidden aspect-[3/2]`}>
      <svg viewBox={`0 0 ${mapSize.width} ${mapSize.height}`} className="w-full h-full" aria-label="Noospheric Conquest Main Map">
        {Object.values(nodes).map(node =>
          node.connections.map(connId => {
            const targetNode = nodes[connId];
            if (targetNode && node.mapPosition && targetNode.mapPosition && node.id < targetNode.id) { // Draw each line once
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
        {Object.values(nodes).map(node => {
          const nodeUnits = Object.values(units).filter(u => u.nodeId === node.id).sort((a,b) => a.displayOrder - b.displayOrder);
          const ownerThemeColors = node.owner === AI1_ID_NC ? THEME_COLORS_NC.AI1 : node.owner === AI2_ID_NC ? THEME_COLORS_NC.AI2 : THEME_COLORS_NC.NEUTRAL;
          const isSelected = node.id === selectedNodeId;
          const isKJObjective = node.isKeyJunctionObjective;

          return (
            <g key={node.id} transform={`translate(${node.mapPosition.x * mapSize.width / 100}, ${node.mapPosition.y * mapSize.height / 100})`}
               onClick={() => onNodeClick(node.id)} className="cursor-pointer group" role="button" aria-label={`Node ${node.name} (${node.type}), Owner: ${node.owner === 'NEUTRAL' ? 'Neutral' : gameState.players[node.owner as PlayerIdNC]?.name || 'Unknown'}`}>
              <circle r={node.type === 'CN' ? 18 : node.type === 'KJ' ? 15 : 12}
                className={`${ownerThemeColors.bg} ${ownerThemeColors.border} border-2 group-hover:opacity-100 transition-all duration-300 
                           ${isSelected ? `ring-4 ring-offset-2 ${THEME_COLORS_NC.TEXT_HEADING} ring-offset-gray-800 shadow-xl` : ''} 
                           ${isKJObjective && node.owner !== gameState.currentPlayerId ? `${THEME_COLORS_NC.KJ_STROKE} stroke-[3px] opacity-70` : ''}
                           ${isKJObjective && node.owner === gameState.currentPlayerId ? `${THEME_COLORS_NC.KJ_STROKE} stroke-[3px] opacity-100 animate-pulseSlow` : ''}
                           `} />
              <text textAnchor="middle" dy="-22" className={`fill-current ${ownerThemeColors.text} text-[7px] md:text-[8px] font-semibold select-none opacity-80 group-hover:opacity-100`}>{node.name}</text>
              <text textAnchor="middle" dy="3" className={`fill-current ${ownerThemeColors.text} text-[9px] md:text-[10px] font-bold select-none`}>
                {node.type === 'KJ' ? 'KJ' : node.type === 'CN' ? 'CN' : node.id.substring(0,4)}
              </text>
              <g transform={`translate(0, 25)`} aria-label={`${nodeUnits.length} units at ${node.name}`}>
                {nodeUnits.slice(0,3).map((unit, index) => ( 
                  <g key={unit.id} transform={`translate(${(index - (nodeUnits.slice(0,3).length-1)/2) * 12}, 0)`}>
                     <UnitDisplayIcon type={unit.type} owner={unit.owner} size={5}/>
                  </g>
                ))}
                 {nodeUnits.length > 3 && <text x="0" y="12" textAnchor="middle" className={`fill-current ${THEME_COLORS_NC.TEXT_MUTED} text-[7px]`}>+{nodeUnits.length - 3} more</text>}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const MiniMapDisplay: React.FC<{ gameState: NoosphericConquestGameState, onNodeClick: (nodeId: string) => void, selectedNodeId: string | null }> = ({ gameState, onNodeClick, selectedNodeId }) => {
    const { nodes } = gameState;
    const mapSize = { width: 150, height: 100 }; 

    return (
        <div className={`relative ${THEME_COLORS_NC.BG_PANEL} border ${THEME_COLORS_NC.BORDER_BASE} rounded-md shadow-lg p-1 aspect-[3/2]`} aria-label="Minimap">
            <svg viewBox={`0 0 ${mapSize.width} ${mapSize.height}`} className="w-full h-full">
                 {Object.values(nodes).map(node =>
                    node.connections.map(connId => {
                        const targetNode = nodes[connId];
                        if (targetNode && node.mapPosition && targetNode.mapPosition && node.id < targetNode.id) { // Draw each line once
                            return ( <line key={`${node.id}-${targetNode.id}-mini`}
                                x1={`${node.mapPosition.x}%`} y1={`${node.mapPosition.y}%`}
                                x2={`${targetNode.mapPosition.x}%`} y2={`${targetNode.mapPosition.y}%`}
                                className={`stroke-current text-gray-700 opacity-50`} strokeWidth={0.5} />
                            );
                        } return null;
                    })
                )}
                {Object.values(nodes).map(node => {
                    const ownerFillClass = getPlayerColor(node.owner, 'fill');
                    let strokeClass = getPlayerColor(node.owner, 'stroke');
                    const isSelectedOnMainMap = node.id === selectedNodeId;
                    let radius = 3;
                    
                    let strokeWidth = 0.5;

                    if (node.type === 'CN') { radius = 4; strokeClass = THEME_COLORS_NC.CN_STROKE; strokeWidth = 1;}
                    else if (node.type === 'KJ') { radius = 3.5; strokeClass = THEME_COLORS_NC.KJ_STROKE; strokeWidth = 1;}
                    
                    return (
                        <g key={`${node.id}-mini`} transform={`translate(${node.mapPosition.x * mapSize.width / 100}, ${node.mapPosition.y * mapSize.height / 100})`}
                           onClick={() => onNodeClick(node.id)} className="cursor-pointer" role="button" aria-label={`Minimap Node ${node.name}`}>
                            <circle r={radius} className={`${ownerFillClass} ${strokeClass}`} strokeWidth={strokeWidth} opacity={isSelectedOnMainMap ? 1 : 0.8}/>
                            {isSelectedOnMainMap && <circle r={radius + 1.5} className="fill-none stroke-current text-yellow-300 animate-pulseSlow" strokeWidth={0.7}/>}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const NodeInfoPanel: React.FC<{ gameState: NoosphericConquestGameState, selectedNodeId: string | null }> = ({ gameState, selectedNodeId }) => {
    if (!selectedNodeId) {
        return (
            <div className={`${THEME_COLORS_NC.BG_PANEL} border ${THEME_COLORS_NC.BORDER_BASE} p-3 rounded shadow-md h-full flex items-center justify-center`}>
                <p className={`${THEME_COLORS_NC.TEXT_MUTED} text-xs italic`}>Click on a node to view details.</p>
            </div>
        );
    }
    const node = gameState.nodes[selectedNodeId];
    if (!node) return <div className={`${THEME_COLORS_NC.BG_PANEL} p-3 rounded`}><p className={THEME_COLORS_NC.ERROR}>Error: Node data not found.</p></div>;

    const nodeUnits = Object.values(gameState.units).filter(u => u.nodeId === selectedNodeId).sort((a,b) => a.displayOrder - b.displayOrder);
    const ownerTextColor = getPlayerColor(node.owner, 'text');

    return (
        <div className={`${THEME_COLORS_NC.BG_PANEL} border ${THEME_COLORS_NC.BORDER_BASE} p-3 rounded shadow-md h-full flex flex-col text-xs`}>
            <h3 className={`text-sm font-semibold ${ownerTextColor} border-b ${THEME_COLORS_NC.BORDER_STRONG} pb-1 mb-2 flex items-center`}>
                <LucideMapPin size={16} className="mr-2"/> Node Info: {node.name} ({node.id.substring(0,6)})
            </h3>
            <p><strong className={THEME_COLORS_NC.TEXT_HEADING}>Type:</strong> {node.type} {node.isKeyJunctionObjective && <span className={THEME_COLORS_NC.KJ_STROKE}>(Key Junction)</span>}</p>
            <p><strong className={THEME_COLORS_NC.TEXT_HEADING}>Owner:</strong> <span className={ownerTextColor}>{node.owner === 'NEUTRAL' ? 'Neutral' : gameState.players[node.owner as PlayerIdNC]?.name || 'Unknown'}</span></p>
            <p><strong className={THEME_COLORS_NC.TEXT_HEADING}>QR/Turn:</strong> {node.resourcesPerTurn}</p>
            <p><strong className={THEME_COLORS_NC.TEXT_HEADING}>Fabrication Hub:</strong> {node.hasFabricationHub ? <span className="text-green-400">Active</span> : <span className="text-gray-500">Inactive</span>}</p>

            <h4 className={`mt-2 mb-1 text-xs font-semibold ${THEME_COLORS_NC.TEXT_HEADING} border-t ${THEME_COLORS_NC.BORDER_BASE} pt-1`}>Units Present ({nodeUnits.length}):</h4>
            {nodeUnits.length > 0 ? (
                <ul className="space-y-0.5 overflow-y-auto max-h-24 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {nodeUnits.map(unit => (
                        <li key={unit.id} className="flex items-center">
                            <UnitDisplayIcon type={unit.type} owner={unit.owner} size={3}/>
                            <span className="ml-1">{NC_UNIT_DEFINITIONS[unit.type].name} ({getPlayerColor(unit.owner, 'text') === THEME_COLORS_NC.AI1.text ? AI1_NAME_NC : (getPlayerColor(unit.owner, 'text') === THEME_COLORS_NC.AI2.text ? AI2_NAME_NC : 'Neutral')}) - ID: ...{unit.id.slice(-3)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="italic opacity-70">No units stationed.</p>
            )}
            {node.temporaryEffects && node.temporaryEffects.length > 0 && (
                 <h4 className={`mt-2 mb-1 text-xs font-semibold ${THEME_COLORS_NC.TEXT_HEADING} border-t ${THEME_COLORS_NC.BORDER_BASE} pt-1`}>Active Effects:</h4>
                // TODO: list effects
            )}
        </div>
    );
};

const BattleHistoryPanel: React.FC<{ battleHistory: BattleReport[]; nodes: Record<string, QuantumGambitNode> }> = ({ battleHistory, nodes }) => {
    if (!battleHistory || battleHistory.length === 0) {
        return (
            <div className={`${THEME_COLORS_NC.BG_PANEL} border ${THEME_COLORS_NC.BORDER_BASE} p-3 rounded shadow-md h-full flex items-center justify-center`}>
                <p className={`${THEME_COLORS_NC.TEXT_MUTED} text-xs italic`}>No battles recorded yet.</p>
            </div>
        );
    }
    return (
        <div className={`${THEME_COLORS_NC.BG_PANEL} border ${THEME_COLORS_NC.BORDER_BASE} p-3 rounded shadow-md h-full flex flex-col text-xs`}>
            <h3 className={`text-sm font-semibold ${THEME_COLORS_NC.TEXT_HEADING} border-b ${THEME_COLORS_NC.BORDER_STRONG} pb-1 mb-2 flex items-center`}>
                <LucideScrollText size={16} className="mr-2"/> Battle History (Last {MAX_BATTLE_HISTORY_LENGTH})
            </h3>
            <ul className="space-y-1 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {battleHistory.map((report, index) => {
                    const attackerNodeName = nodes[report.fromNodeId]?.name || report.fromNodeId;
                    const defenderNodeName = nodes[report.toNodeId]?.name || report.toNodeId;
                    const outcomeColor = report.outcome === 'attacker_wins' ? getPlayerColor(report.attacker, 'text') : report.outcome === 'defender_wins' ? getPlayerColor(report.defender, 'text') : THEME_COLORS_NC.INFO;
                    return (
                        <li key={`${report.turn}-${index}`} className={`p-1.5 border-b border-gray-700 text-[10px]`}>
                            <p><strong>T{report.turn}:</strong> <span className={getPlayerColor(report.attacker, 'text')}>{report.attacker === AI1_ID_NC ? AI1_NAME_NC : AI2_NAME_NC}</span> vs <span className={getPlayerColor(report.defender, 'text') }>{report.defender === AI1_ID_NC ? AI1_NAME_NC : report.defender === AI2_ID_NC ? AI2_NAME_NC : 'Neutral'}</span></p>
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


// Main Game Container
const NoosphericConquestModeContainer: React.FC<NoosphericConquestModeContainerProps> = ({ genAI, appOnModeChange }) => { 
  const [gameState, dispatch] = useReducer(gameReducer, undefined, initialGameState); 
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const battlePopupDisplayTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  const [displayedTurnTime, setDisplayedTurnTime] = useState("00:00");
  const turnTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedMapTemplateName, setSelectedMapTemplateName] = useState<string>("RANDOM");
  const [isInfoScreenVisible, setIsInfoScreenVisible] = useState(false);
  
  const [ai1CoT, setAi1CoT] = useState("Awaiting GEM-Q's first analysis...");
  const [ai2CoT, setAi2CoT] = useState("Awaiting AXIOM's first analysis...");
  const [isAiThinking, setIsAiThinking] = useState(false); 

  const addLog = useCallback((sender: string, text: string, color?: string, icon?: React.ReactNode) => {
    dispatch({ type: 'ADD_LOG', payload: { sender, text, color, icon } });
  }, []);
  
  const handleNodeClick = useCallback((nodeId: string) => {
    dispatch({ type: 'SELECT_NODE', payload: nodeId });
  }, []);
  
  const getBoardStringRepresentation = (gs: NoosphericConquestGameState, perspectivePlayerId: PlayerIdNC): string => {
    let boardStr = "";
    Object.values(gs.nodes).forEach(node => {
        const unitsInNode = Object.values(gs.units).filter(u => u.nodeId === node.id);
        const unitSummary = unitsInNode.map(u => `${u.type}(${u.owner})`).join(',');
        boardStr += `${node.id}(Type:${node.type},Owner:${node.owner},Res:${node.resourcesPerTurn},Hub:${node.hasFabricationHub?'Y':'N'},Units:[${unitSummary}],Conn:[${node.connections.join(',')}]); `;
    });
    return boardStr.slice(0, -2); 
  };

  const getUnitsStringRepresentation = (gs: NoosphericConquestGameState, forPlayerId: PlayerIdNC, type: 'player' | 'opponent'): string => {
      const targetPlayerId = type === 'player' ? forPlayerId : (forPlayerId === AI1_ID_NC ? AI2_ID_NC : AI1_ID_NC);
      const playerUnits = Object.values(gs.units).filter(u => u.owner === targetPlayerId);
      if (playerUnits.length === 0) return "None";
      return playerUnits.map(u => `${u.id}(Type:${u.type},Node:${u.nodeId})`).join(', ');
  };

  const parseAIResponse = useCallback((responseText: string, currentPhase: GamePhaseNC): AIResponseFormat => {
    let jsonString = responseText.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const matchFence = jsonString.match(fenceRegex);
    if (matchFence && matchFence[1]) {
        jsonString = matchFence[1].trim();
    }

    try {
        const aiResponse = JSON.parse(jsonString) as AIResponseFormat;
        if (!aiResponse.actions || !Array.isArray(aiResponse.actions) || typeof aiResponse.cot !== 'string') {
            throw new Error("AI response missing 'actions' array or 'cot' string.");
        }
        if (aiResponse.actions.length === 0) { 
             return { actions: [{ ACTION_TYPE: "PASS" }], cot: aiResponse.cot || "Passing due to no valid actions." };
        }
        return aiResponse;
    } catch (e) {
        console.error("Error parsing AI JSON response:", e, "Response was:", jsonString);
        addLog(SYSTEM_SENDER_NAME_NC, `Error parsing AI JSON: ${(e as Error).message}. Response snippet: ${jsonString.substring(0,100)}. AI will pass.`, THEME_COLORS_NC.ERROR);
        return { actions: [{ ACTION_TYPE: "PASS" }], cot: "Error parsing AI response. Passing turn." };
    }
  }, [addLog]); 


  const handleAIPlayerTurn = useCallback(async (playerId: PlayerIdNC, currentGameState: NoosphericConquestGameState): Promise<{ aiPassed: boolean; battleReportOutcome?: BattleReport }> => { 
    setIsAiThinking(true);
    addLog(playerId === AI1_ID_NC ? AI1_NAME_NC : AI2_NAME_NC, "Analyzing quantum lattice...", currentGameState.players[playerId].color, <LucideBrain size={14}/>);

    const { currentTurn, currentPhase, players, activeFluctuationEvent, keyJunctionsOnMap, turnLimit, currentMapTemplateName, units: gameUnits, nodes: gameNodes } = currentGameState; 
    const playerState = players[playerId];
    const opponentId = playerId === AI1_ID_NC ? AI2_ID_NC : AI1_ID_NC;
    
    const nodeSummaryString = getBoardStringRepresentation(currentGameState, playerId);
    const playerUnitSummaryString = getUnitsStringRepresentation(currentGameState, playerId, 'player');
    const opponentUnitSummaryString = getUnitsStringRepresentation(currentGameState, playerId, 'opponent');
    const keyJunctionsListString = keyJunctionsOnMap.join(', ');
    
    const promptTemplate = playerId === AI1_ID_NC ? NC_AI1_SYSTEM_PROMPT_TEMPLATE : NC_AI2_SYSTEM_PROMPT_TEMPLATE;
    const fullPrompt = promptTemplate 
        .replace(/{currentMapTemplateName}/g, currentMapTemplateName)
        .replace(/{consecutiveKJTurnsNeeded}/g, String(NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED))
        .replace(/{keyJunctionsListString}/g, keyJunctionsListString)
        .replace(/{opponentCommandNodeId}/g, players[opponentId].commandNodeId)
        .replace(/{playerCommandNodeId}/g, playerState.commandNodeId)
        .replace(/{turnLimit}/g, String(turnLimit))
        .replace(/{currentTurn}/g, String(currentTurn))
        .replace(/{playerName}/g, playerState.name)
        .replace(/{playerResources}/g, String(playerState.resources))
        .replace(/{currentPhase}/g, currentPhase)
        .replace(/{activeEventDescription}/g, activeFluctuationEvent?.resolvedDescription || "None")
        .replace(/{nodeSummaryString}/g, nodeSummaryString)
        .replace(/{playerUnitSummaryString}/g, playerUnitSummaryString)
        .replace(/{opponentUnitSummaryString}/g, opponentUnitSummaryString);
    
    let aiPassedUltimately = false; 
    let battleReportOutcome: BattleReport | undefined = undefined;
    if (!genAI) {
        addLog(SYSTEM_SENDER_NAME_NC, "Gemini AI SDK not available. AI passing.", THEME_COLORS_NC.ERROR);
        setIsAiThinking(false);
        return { aiPassed: true, battleReportOutcome: undefined }; 
    }
    try {        
        const modelResponse = await genAI.models.generateContent({
            model: playerId === AI1_ID_NC ? 'gemini-2.5-flash-preview-04-17' : 'gemini-2.5-flash-preview-05-20',
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            config: { responseMimeType: "application/json" }
        });
        
        if (!modelResponse.text) {
             console.error("Model response text is undefined.");
             setIsAiThinking(false);
             return { aiPassed: false, battleReportOutcome: undefined };
        }
        let jsonStr = modelResponse.text.trim();
        
        const {actions: rawActions, cot: parsedCot} = parseAIResponse(jsonStr, currentPhase);

        if (playerId === AI1_ID_NC) setAi1CoT(parsedCot); else setAi2CoT(parsedCot);
        addLog(playerId === AI1_ID_NC ? AI1_NAME_NC : AI2_NAME_NC, `CoT: ${parsedCot.substring(0,150)}...`, players[playerId].color);


        if (rawActions.length > 0 && rawActions[0].ACTION_TYPE !== 'PASS') {
            const gameActions = rawActions.map((action: AIAction) => {
                if (action.ACTION_TYPE === "DEPLOY" && (!action.UNIT_TYPE || !action.NODE_ID || typeof action.QUANTITY !== 'number')) return null;
                if (action.ACTION_TYPE === "ATTACK" && (!action.FROM_NODE_ID || !action.TO_NODE_ID || !action.UNIT_IDS || !Array.isArray(action.UNIT_IDS))) return null;
                if (action.ACTION_TYPE === "MANEUVER" && (!action.UNIT_ID || !action.TO_NODE_ID)) return null;

                switch(action.ACTION_TYPE) { 
                    case "DEPLOY":
                        return { type: 'DEPLOY_UNITS', payload: { playerId, deployments: [{ unitType: action.UNIT_TYPE!, nodeId: action.NODE_ID!, quantity: action.QUANTITY! }] }};
                    case "ATTACK": {
                        const attackingUnitIds = action.UNIT_IDS || []; 
                        const attackingUnits = attackingUnitIds.map((id: string) => gameUnits[id]).filter(Boolean) as QuantumUnit[];
                        if (attackingUnits.length === 0 && attackingUnitIds.length > 0) {
                            addLog(SYSTEM_SENDER_NAME_NC, `${playerId === AI1_ID_NC ? AI1_NAME_NC : AI2_NAME_NC} tried to attack with non-existent/invalid units. Attack failed.`, THEME_COLORS_NC.ERROR);
                            return null; 
                        }
                        const defendersInNode = Object.values(gameUnits).filter(u => u.nodeId === action.TO_NODE_ID && u.owner !== playerId);
                        let attackerLossesCount = Math.random() < 0.3 ? Math.min(1, attackingUnits.length) : 0;
                        let defenderLossesCount = Math.random() < 0.5 ? Math.min(1, defendersInNode.length) : 0;
                        const battleReport: BattleReport = {
                            turn: currentGameState.currentTurn, 
                            attacker: playerId, defender: gameNodes[action.TO_NODE_ID!].owner as PlayerIdNC | 'NEUTRAL', 
                            fromNodeId: action.FROM_NODE_ID!, toNodeId: action.TO_NODE_ID!,
                            attackingUnitsCommitted: attackingUnits.map(u => ({type: u.type, id: u.id})),
                            defendingUnitsInitial: defendersInNode.map(u => ({type: u.type, id: u.id})),
                            combatLog: [], // combatLog will be populated by the reducer
                            outcome: 'pending', // outcome will be determined by the reducer
                            attackerLosses: [], // losses will be populated by the reducer
                            defenderLosses: [], // losses will be populated by the reducer
                            nodeCaptured: false, // node capture will be determined by the reducer
                        };
                        battleReportOutcome = battleReport; // Set the outcome here
                        return { type: 'DECLARE_ATTACK', payload: { battleReport } };
                      }
                    case "MANEUVER":
                        return { type: 'MANEUVER_UNITS', payload: { playerId, maneuvers: [{ unitId: action.UNIT_ID!, toNodeId: action.TO_NODE_ID! }] }};
                    default: return null;
                }
            }).filter(Boolean);

            if (gameActions.length > 0) {
                gameActions.forEach(ga => dispatch(ga as GameAction)); 
            } else { 
                 addLog(playerId === AI1_ID_NC ? AI1_NAME_NC : AI2_NAME_NC, "AI proposed invalid actions or no valid actions found in response. Passing phase.", players[playerId].color);
                 aiPassedUltimately = true;
            }
        } else { 
            addLog(playerId === AI1_ID_NC ? AI1_NAME_NC : AI2_NAME_NC, "Passing phase.", players[playerId].color);
            aiPassedUltimately = true;
        }
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error("Error in AI turn (Gemini API):", errorMessage); 
        let logMsg = `${playerId === AI1_ID_NC ? AI1_NAME_NC : AI2_NAME_NC} encountered an API error. Using fallback.`;
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
            logMsg = `${playerId === AI1_ID_NC ? AI1_NAME_NC : AI2_ID_NC} API Auth Error (${errorMessage.match(/(\d{3})/)?.[0]}). Using fallback. Check console for details: ${errorMessage.substring(0,150)}`;
        } else if (errorMessage.includes("Invalid response structure") || errorMessage.includes("Failed to parse JSON")) {
            logMsg = `${playerId === AI1_ID_NC ? AI1_NAME_NC : AI2_ID_NC} API response error. Using fallback. Check console.`;
        }
        addLog(SYSTEM_SENDER_NAME_NC, logMsg, THEME_COLORS_NC.ERROR);
        if (playerId === AI1_ID_NC) setAi1CoT("API Error. Using fallback logic."); else setAi2CoT("API Error. Using fallback logic.");
        aiPassedUltimately = true;
    } finally {
        setIsAiThinking(false);
    }
    return { aiPassed: aiPassedUltimately, battleReportOutcome }; 
  }, [addLog, parseAIResponse, genAI]);
  
  useEffect(() => {
    // Clear existing timers on unmount or re-render (standard cleanup)
    if (autoPlayIntervalRef.current) clearTimeout(autoPlayIntervalRef.current);
    if (battlePopupDisplayTimeoutRef.current) clearTimeout(battlePopupDisplayTimeoutRef.current);

    // If game is over and not auto-playing, or AI is thinking, stop all auto-advancement
    if (gameState.currentPhase === 'GAME_OVER' || !isAutoPlaying || isAiThinking) {
      if (isAutoPlaying && gameState.currentPhase === 'GAME_OVER') setIsAutoPlaying(false);
      return; // Stop any further auto-play logic
    }

    // Handle battle popup display and auto-advancement when visible and auto-playing
    if (gameState.isBattlePopupVisible && isAutoPlaying) {
      battlePopupDisplayTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'HIDE_BATTLE_POPUP' });
        dispatch({ type: 'ADVANCE_PHASE' });
      }, 5000); // Display for 5 seconds
      return; // Pause performStep while battle popup is visible during auto-play
    }

    // If no battle popup is visible and auto-play conditions are met, perform the next step
    const performStep = async () => { 
      if (gameState.currentPhase === 'GAME_OVER') {
          setIsAutoPlaying(false);
          return;
      }
      
      let advancePhaseAfterCurrentProcessing = false;

      switch (gameState.currentPhase) {
        case 'FLUCTUATION': {
          const randomEventBase = NC_QUANTUM_FLUCTUATION_EVENTS_POOL[Math.floor(Math.random() * NC_QUANTUM_FLUCTUATION_EVENTS_POOL.length)];
          const eventPrompt = `Provide ONLY a single, short, flavorful event description for a sci-fi strategy game event in 2-3 sentences. Do NOT provide options or conversational text. Event Type: "${randomEventBase.effectType}". Details: ${JSON.stringify(randomEventBase.details)}. Current Turn: ${gameState.currentTurn}. Player: ${gameState.players[gameState.currentPlayerId].name}.`;
          let dynamicDescription = randomEventBase.descriptionTemplate.replace("{playerName}", gameState.players[gameState.currentPlayerId].name); 

           if (genAI) {
                try {
                    const modelResponse = await genAI.models.generateContent({
                        model: 'gemini-2.5-flash-preview-04-17',
                        contents: [{ role: "user", parts: [{ text: eventPrompt }] }]
                    });
                    if (modelResponse.text) {
                         dynamicDescription = modelResponse.text;
                    } else {
                        console.warn("Could not parse Gemini response for event description, using template.");
                    }
                } catch (error) {
                    const errorMessage = (error as Error).message;
                    console.error("Error fetching dynamic event description:", errorMessage); 
                    let logMessage = `Event Gen Error: ${errorMessage.substring(0,100)}. Using template.`;
                     if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
                        logMessage = `Event Gen API Auth Error (${errorMessage.match(/(\d{3})/)?.[0]}). Using template. Check console.`;
                    }
                    addLog(SYSTEM_SENDER_NAME_NC, logMessage, THEME_COLORS_NC.ERROR);
                }
            } else {
                addLog(SYSTEM_SENDER_NAME_NC, "AI SDK not available for event generation. Using template.", THEME_COLORS_NC.ERROR);
            }


          let targetNodeIds: string[] | undefined;
          if (randomEventBase.descriptionTemplate.includes("{targetNodeName}") && !dynamicDescription.includes(gameState.players[gameState.currentPlayerId].name)) { 
            const availableNodes = Object.values(gameState.nodes).filter(n => (randomEventBase.details.targetCriteria === "ANY_CONTROLLED" && n.owner === gameState.currentPlayerId) || (randomEventBase.details.targetCriteria === "ANY"));
            if (availableNodes.length > 0) {
                const targetNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];
                dynamicDescription = dynamicDescription.replace(/{targetNodeName}/g, targetNode.name); 
                targetNodeIds = [targetNode.id];
            } else { dynamicDescription += " (No valid targets found)"; }
          }
          const activeEvent: ActiveQuantumFluctuationEvent = { ...randomEventBase, resolvedDescription: dynamicDescription, targetNodeIds, targetPlayerId: gameState.currentPlayerId, isActiveThisTurn: true, effectApplied: false };
          dispatch({ type: 'SET_ACTIVE_EVENT', payload: activeEvent });
          addLog(EVENT_SENDER_NAME_NC, activeEvent.resolvedDescription, THEME_COLORS_NC.EVENT, <LucideAtom size={14}/>);
          dispatch({ type: 'APPLY_EVENT_EFFECTS_COMPLETE' });
          advancePhaseAfterCurrentProcessing = true;
          break;
        }
        case 'RESOURCE':
          addLog(gameState.currentPlayerId === AI1_ID_NC ? AI1_NAME_NC : AI2_NAME_NC, `Collecting Quantum Resources...`, gameState.players[gameState.currentPlayerId].color, <LucideDollarSign size={14}/>);
          dispatch({ type: 'COLLECT_RESOURCES' });
          advancePhaseAfterCurrentProcessing = true;
          break;
        case 'DEPLOYMENT': 
        case 'ATTACK': 
        case 'MANEUVER': {
          const { aiPassed, battleReportOutcome } = await handleAIPlayerTurn(gameState.currentPlayerId, gameState); 
          if (battleReportOutcome) { // A battle occurred, so do not immediately advance phase
              // The battle popup will be visible, and the useEffect will handle auto-advancement after 5s
              advancePhaseAfterCurrentProcessing = false; 
          } else if (aiPassed) { // No battle, and AI passed/invalid action
            advancePhaseAfterCurrentProcessing = true;
          }
          break;
        }
        default: break;
      }
      
      if(advancePhaseAfterCurrentProcessing){ 
          dispatch({ type: 'ADVANCE_PHASE' });
      }
    };
    
    autoPlayIntervalRef.current = setTimeout(performStep, 1800); 

    return () => {
      if (autoPlayIntervalRef.current) clearTimeout(autoPlayIntervalRef.current);
      if (battlePopupDisplayTimeoutRef.current) clearTimeout(battlePopupDisplayTimeoutRef.current);
    };
  }, [gameState.currentPhase, gameState.currentPlayerId, gameState.isBattlePopupVisible, isAutoPlaying, isAiThinking, gameState, handleAIPlayerTurn, addLog, genAI]); 

  const toggleAutoPlay = useCallback(() => { 
    setIsAutoPlaying(prev => {
        if (!prev && gameState.currentPhase === 'GAME_OVER') { 
            const templateName = selectedMapTemplateName === "RANDOM" ? undefined : selectedMapTemplateName;
            dispatch({type: 'START_GAME', payload: {templateName}});
            return true;
        }
        return !prev;
    });
    if (autoPlayIntervalRef.current) {
      clearTimeout(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
     if (battlePopupDisplayTimeoutRef.current) { 
      clearTimeout(battlePopupDisplayTimeoutRef.current);
      battlePopupDisplayTimeoutRef.current = null;
    }
  }, [gameState.currentPhase, selectedMapTemplateName, dispatch]);
  
  const handleAdvanceManually = useCallback(async () => { 
      if (gameState.currentPhase === 'GAME_OVER') {
          const templateName = selectedMapTemplateName === "RANDOM" ? undefined : selectedMapTemplateName;
          dispatch({type: 'START_GAME', payload: {templateName}});
          return;
      }
      if (gameState.isBattlePopupVisible) {
          dispatch({type: 'HIDE_BATTLE_POPUP'});
          // If battle popup was visible, and user clicked to close it, then advance phase
          dispatch({ type: 'ADVANCE_PHASE' });
          return;
      }

      let shouldAdvancePhase = false;
      if (['DEPLOYMENT', 'ATTACK', 'MANEUVER'].includes(gameState.currentPhase)) {
          const { aiPassed, battleReportOutcome } = await handleAIPlayerTurn(gameState.currentPlayerId, gameState); 
          if (battleReportOutcome) {
             // Battle occurred, no immediate phase advancement needed here, useEffect handles it
             return; // Stop further processing in this function
          } else if (aiPassed) { 
             shouldAdvancePhase = true;
          }
      } else { 
          // FLUCTUATION or RESOURCE phase
          if (gameState.currentPhase === 'FLUCTUATION') {
            const randomEventBase = NC_QUANTUM_FLUCTUATION_EVENTS_POOL[Math.floor(Math.random() * NC_QUANTUM_FLUCTUATION_EVENTS_POOL.length)];
            const eventPrompt = `Generate a short, flavorful event description for a sci-fi strategy game event. Event Type: "${randomEventBase.effectType}". Details: ${JSON.stringify(randomEventBase.details)}. Current Turn: ${gameState.currentTurn}. Player: ${gameState.players[gameState.currentPlayerId].name}.`;
            let dynamicDescription = randomEventBase.descriptionTemplate.replace("{playerName}", gameState.players[gameState.currentPlayerId].name);
            if (genAI) {
                try {
                    const modelResponse = await genAI.models.generateContent({
                        model: 'gemini-2.5-flash-preview-04-17',
                        contents: [{ role: "user", parts: [{ text: eventPrompt }] }]
                    });
                    if (modelResponse.text) {
                        dynamicDescription = modelResponse.text;
                    }
                } catch (error) { 
                    const errorMessage = (error as Error).message;
                    console.error("Error fetching dynamic event description (manual):", errorMessage); 
                    let logMessage = `Event Gen Error (Manual): ${errorMessage.substring(0,100)}. Using template.`;
                    if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
                        logMessage = `Event Gen API Auth Error (${errorMessage.match(/(\d{3})/)?.[0]}). Using template. Check console.`;
                    }
                    addLog(SYSTEM_SENDER_NAME_NC, logMessage, THEME_COLORS_NC.ERROR); 
                }
            } else {
                addLog(SYSTEM_SENDER_NAME_NC, "AI SDK not available for event generation. Using template.", THEME_COLORS_NC.ERROR);
            }


            let targetNodeIds: string[] | undefined;
            if (randomEventBase.descriptionTemplate.includes("{targetNodeName}") && !dynamicDescription.includes(gameState.players[gameState.currentPlayerId].name)) {
                const availableNodes = Object.values(gameState.nodes).filter(n => (randomEventBase.details.targetCriteria === "ANY_CONTROLLED" && n.owner === gameState.currentPlayerId) || (randomEventBase.details.targetCriteria === "ANY"));
                if (availableNodes.length > 0) { const targetNode = availableNodes[Math.floor(Math.random() * availableNodes.length)]; dynamicDescription = dynamicDescription.replace(/{targetNodeName}/g, targetNode.name); targetNodeIds = [targetNode.id]; } 
                else { dynamicDescription += " (No valid targets found)"; }
            }
            const activeEvent: ActiveQuantumFluctuationEvent = { ...randomEventBase, resolvedDescription: dynamicDescription, targetNodeIds, targetPlayerId: gameState.currentPlayerId, isActiveThisTurn: true, effectApplied: false };
            dispatch({ type: 'SET_ACTIVE_EVENT', payload: activeEvent });
            addLog(EVENT_SENDER_NAME_NC, activeEvent.resolvedDescription, THEME_COLORS_NC.EVENT, <LucideAtom size={14}/>);
            dispatch({ type: 'APPLY_EVENT_EFFECTS_COMPLETE' });
          } else if (gameState.currentPhase === 'RESOURCE') {
            addLog(gameState.currentPlayerId === AI1_ID_NC ? AI1_NAME_NC : AI2_NAME_NC, `Collecting Quantum Resources...`, gameState.players[gameState.currentPlayerId].color, <LucideDollarSign size={14}/>);
            dispatch({ type: 'COLLECT_RESOURCES' });
          }
          shouldAdvancePhase = true;
      }

      if (shouldAdvancePhase) {
          dispatch({ type: 'ADVANCE_PHASE' });
      }
  }, [gameState, genAI, addLog, handleAIPlayerTurn, dispatch, selectedMapTemplateName]);

  const handleNewGameWithSelectedMap = () => { 
    const templateName = selectedMapTemplateName === "RANDOM" ? undefined : selectedMapTemplateName;
    dispatch({type: 'START_GAME', payload: {templateName}});
    if(isAutoPlaying) setIsAutoPlaying(false); 
    setAi1CoT("Preparing initial strategy..."); 
    setAi2CoT("Awaiting opponent's move...");
  };


  const gameLogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { 
    if (gameLogRef.current) {
      gameLogRef.current.scrollTop = gameLogRef.current.scrollHeight;
    }
  }, [gameState.gameLog]);

  useEffect(() => { 
    if (gameState.currentPhase === 'FLUCTUATION' && gameState.currentTurn > 0) { 
        dispatch({ type: 'RESET_GAME_FOR_NEW_TURN' });
    }
  }, [gameState.currentTurn, gameState.currentPlayerId, gameState.currentPhase]);

  useEffect(() => { 
    if (gameState.turnStartTime && gameState.currentPhase !== 'GAME_OVER') {
      turnTimerIntervalRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - (gameState.turnStartTime ?? Date.now())) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        setDisplayedTurnTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }, 1000);
    } else {
      if (turnTimerIntervalRef.current) clearInterval(turnTimerIntervalRef.current);
      setDisplayedTurnTime(gameState.currentPhase === 'GAME_OVER' ? "Final" : "00:00");
    }
    return () => {
      if (turnTimerIntervalRef.current) clearInterval(turnTimerIntervalRef.current);
    };
  }, [gameState.turnStartTime, gameState.currentPhase]);


  const { players, nodes, units, currentTurn, currentPlayerId, currentPhase, gameLog, activeFluctuationEvent, battleReport, isBattlePopupVisible, selectedNodeId, currentMapTemplateName, battleHistory } = gameState;
  const currentPlayer = players[currentPlayerId];

  return (
    <div className={`flex flex-col h-screen w-screen ${THEME_COLORS_NC.TEXT_BASE} p-2 md:p-3 bg-gray-950 font-mono overflow-hidden`}>
      <header className={`flex items-center justify-between mb-2 p-2 ${THEME_COLORS_NC.BG_PANEL} border ${THEME_COLORS_NC.BORDER_BASE} rounded-md shadow-lg`}>
        <h1 className={`text-base md:text-lg font-bold ${THEME_COLORS_NC.TEXT_HEADING} flex items-center`}><LucideGlobe size={18} className="mr-2"/>Noospheric Conquest <span className="text-xs opacity-70 ml-1 md:ml-2">(Map: {currentMapTemplateName})</span></h1>
        <div className="flex items-center space-x-1 md:space-x-2">
            <button
              onClick={() => appOnModeChange(AppMode.SPIRAL_EXE)} 
              className={`px-2 py-1 text-xs font-semibold rounded bg-gray-600 text-white hover:bg-gray-500 transition-opacity flex items-center focus-ring-accent`}
              title="Exit to Overmind Hub"
            >
               <LucideArrowLeftToLine size={14} className="mr-1"/> Exit
            </button>
            <select 
                value={selectedMapTemplateName} 
                onChange={(e) => setSelectedMapTemplateName(e.target.value)}
                className={`bg-gray-800 border ${THEME_COLORS_NC.BORDER_STRONG} text-xs p-1 rounded focus:ring-1 ${getPlayerColor(AI1_ID_NC, 'ring')}`}
                aria-label="Select Map Template"
            >
                <option value="RANDOM">Random Map</option>
                {NC_MAP_TEMPLATES.map(template => (
                    <option key={template.name} value={template.name}>{template.name}</option>
                ))}
            </select>
            <button 
                onClick={handleNewGameWithSelectedMap} 
                className={`px-2 py-1 text-xs font-semibold rounded ${getPlayerColor(AI2_ID_NC, 'bg')} text-black hover:opacity-80 transition-opacity flex items-center focus-ring-accent`}
            >
               <LucideShuffle size={14} className="mr-1"/> New Game
            </button>
            <button onClick={toggleAutoPlay} className={`px-2 py-1 text-xs font-semibold rounded ${isAutoPlaying ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'} hover:opacity-80 transition-opacity focus-ring-accent`}>
                {isAutoPlaying ? 'Pause Sim' : 'Auto-Play'}
            </button>
            {!isAutoPlaying && (
                 <button onClick={handleAdvanceManually} className={`px-2 py-1 text-xs font-semibold rounded ${getPlayerColor(AI1_ID_NC, 'bg')} text-black hover:opacity-80 transition-opacity flex items-center focus-ring-accent`} disabled={isAiThinking}>
                    {isAiThinking ? <LucideBrain size={14} className="inline animate-pulse"/> : (gameState.currentPhase === 'GAME_OVER' ? 'Restart' : gameState.isBattlePopupVisible ? 'Close & Next' : 'Next')} 
                    {!isAiThinking && <LucideChevronRight size={14} className="inline"/>}
                </button>
            )}
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-2 md:gap-3 flex-grow min-h-0">
        <div className="flex-grow flex flex-col gap-2 md:gap-3 md:w-3/5 lg:w-2/3">
          <QuantumGambitMapDisplay gameState={gameState} onNodeClick={handleNodeClick} selectedNodeId={selectedNodeId} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            <CoTDisplayUI title={`${AI1_NAME_NC} (Red)`} cot={ai1CoT} isLoading={currentPlayerId === AI1_ID_NC && isAiThinking} playerNameColor={THEME_COLORS_NC.AI1.text} />
            <CoTDisplayUI title={`${AI2_NAME_NC} (Cyan)`} cot={ai2CoT} isLoading={currentPlayerId === AI2_ID_NC && isAiThinking} playerNameColor={THEME_COLORS_NC.AI2.text} />
          </div>
        </div>

        <div className="w-full md:w-2/5 lg:w-1/3 flex flex-col gap-2 md:gap-3 min-h-0">
          <div className={`${THEME_COLORS_NC.BG_PANEL} border ${THEME_COLORS_NC.BORDER_BASE} p-3 rounded shadow-md`}>
            <div className="flex justify-between items-center mb-1">
                <h2 className={`text-sm font-bold ${THEME_COLORS_NC.TEXT_HEADING}`}>Turn: {currentTurn} ({players[currentPlayerId].name})</h2>
                <span className={`text-xs font-mono ${THEME_COLORS_NC.TEXT_MUTED} flex items-center`}><LucideTimer size={14} className="mr-1"/>{displayedTurnTime}</span>
            </div>
            <p className={`text-xs ${THEME_COLORS_NC.TEXT_HEADING} mb-1`}>Phase: <span className="text-yellow-400 font-semibold">{currentPhase}</span></p>
            {activeFluctuationEvent && (
              <div className={`p-2 my-1 rounded text-xs border ${THEME_COLORS_NC.EVENT} border-purple-500 bg-purple-900 bg-opacity-30`}>
                <p><LucideAtom size={14} className="inline mr-1"/><strong>Event:</strong> {activeFluctuationEvent.resolvedDescription}</p>
              </div>
            )}
            {gameState.gameOverMessage && (
                <p className={`font-bold mt-1 ${gameState.winner === AI1_ID_NC ? THEME_COLORS_NC.AI1.text : gameState.winner === AI2_ID_NC ? THEME_COLORS_NC.AI2.text : THEME_COLORS_NC.INFO}`}>
                    {gameState.gameOverMessage}
                </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 md:gap-3">
             <MiniMapDisplay gameState={gameState} onNodeClick={handleNodeClick} selectedNodeId={selectedNodeId} />
             <NodeInfoPanel gameState={gameState} selectedNodeId={selectedNodeId} />
          </div>


          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {[players[AI1_ID_NC], players[AI2_ID_NC]].map(p => (
              <div key={p.id} className={`${THEME_COLORS_NC.BG_PANEL} border ${p.id === AI1_ID_NC ? THEME_COLORS_NC.AI1.border : THEME_COLORS_NC.AI2.border} p-2 rounded shadow-sm text-[10px] md:text-xs`}>
                <h3 className={`font-semibold ${p.color}`}>{p.name}</h3>
                <p className={`${THEME_COLORS_NC.TEXT_MUTED}`}><LucideDollarSign size={12} className="inline mr-0.5"/>QR: {p.resources}</p>
                <p className={`${THEME_COLORS_NC.TEXT_MUTED}`}>Nodes: {Object.values(nodes).filter(n => n.owner === p.id).length}</p>
                 <p className={`${THEME_COLORS_NC.TEXT_MUTED}`}>Units: {Object.values(units).filter(u => u.owner === p.id).length}</p>
                 <p className={`${THEME_COLORS_NC.TEXT_MUTED}`}>KJs Held: {Object.keys(p.controlledKeyJunctionsTurns).filter(kjId => p.controlledKeyJunctionsTurns[kjId] > 0 && nodes[kjId]?.owner === p.id).length} ({Object.entries(p.controlledKeyJunctionsTurns).filter(([,turns]) => turns > 0).map(([kjId, turns]) => `${nodes[kjId]?.name.substring(0,2)}:${turns}`).join(', ')})</p>
              </div>
            ))}
          </div>
          
          <div className={`${THEME_COLORS_NC.BG_PANEL} border ${THEME_COLORS_NC.BORDER_BASE} p-2 rounded shadow-md flex flex-col flex-grow min-h-[120px]`}>
            <h3 className={`text-sm font-semibold ${THEME_COLORS_NC.TEXT_HEADING} border-b ${THEME_COLORS_NC.BORDER_STRONG} pb-1 mb-1`}>System Log</h3>
            <div ref={gameLogRef} className="text-[10px] md:text-xs space-y-0.5 overflow-y-auto flex-grow pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {gameLog.slice(-50).map(log => ( 
                <div key={log.id} className="flex items-start">
                  {log.icon && <span className={`mr-1 ${log.color || THEME_COLORS_NC.TEXT_MUTED}`}>{log.icon}</span>}
                  <span className={`${log.color || THEME_COLORS_NC.TEXT_MUTED} whitespace-pre-wrap break-words`}>
                    <strong className="font-semibold">{log.sender}: </strong>{log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0 h-40 md:h-48">
            <BattleHistoryPanel battleHistory={battleHistory} nodes={nodes} />
          </div>

        </div>
      </div>
      {/* {isBattlePopupVisible && battleReport && <BattlePopup report={battleReport} onClose={() => dispatch({type: 'HIDE_BATTLE_POPUP'})} gameState={gameState} />} */}
      {/* {isInfoScreenVisible && <InfoScreenPopup onClose={() => setIsInfoScreenVisible(false)} />} */}
      <button 
        onClick={() => setIsInfoScreenVisible(true)} 
        className={`fixed bottom-3 right-3 p-2 rounded-full ${THEME_COLORS_NC.BG_PANEL} ${THEME_COLORS_NC.BORDER_STRONG} border hover:opacity-80 transition-opacity shadow-lg focus-ring-accent`}
        title="Game Mode Information"
        aria-label="Game Mode Information"
      >
        <LucideInfo size={20} className={THEME_COLORS_NC.TEXT_HEADING}/>
      </button>
    </div>
  );
};

export default NoosphericConquestModeContainer;
