import React from 'react';
import { useReducer } from 'react';
import {
  AppMode,
  PlayerId,
  QuantumUnitType,
  QuantumGambitNode,
  QuantumUnit,
  QuantumGambitPlayerState,
  NoosphericConquestGameState,
  GameAction,
  ActiveQuantumFluctuationEvent,
  BattleReport,
  MapTemplate,
  GamePhase,
} from '../../types';
import {
  AI1_ID,
  AI2_ID,
  AI1_NAME,
  AI2_NAME,
  NOOSPHERIC_CONQUEST_INITIAL_RESOURCES,
  NOOSPHERIC_CONQUEST_TURN_LIMIT,
  NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED,
  MAX_BATTLE_HISTORY_LENGTH,
  NC_UNIT_DEFINITIONS,
  NC_MAP_TEMPLATES,
  SYSTEM_SENDER_NAME,
  THEME_COLORS,
} from './constants';

import { SystemIcon } from './ui';

const generateUnitId = (type: QuantumUnitType, owner: PlayerId, count: number) => `${type}-${owner}-${String(count).padStart(3, '0')}`;

export const initialGameState = (selectedTemplate?: MapTemplate): NoosphericConquestGameState => { 
  const template = selectedTemplate || NC_MAP_TEMPLATES[Math.floor(Math.random() * NC_MAP_TEMPLATES.length)];
  
  const nodes: Record<string, QuantumGambitNode> = {};
  template.nodes.forEach((nodeData: QuantumGambitNode) => {
    nodes[nodeData.id] = {
      ...nodeData,
      owner: 'NEUTRAL', 
      temporaryEffects: [],
    };
  });

  const units: Record<string, QuantumUnit> = {};
  const players: Record<PlayerId, QuantumGambitPlayerState> = {
    [AI1_ID]: { id: AI1_ID, name: AI1_NAME, color: THEME_COLORS.AI1.text, bgColor: THEME_COLORS.AI1.bg, resources: NOOSPHERIC_CONQUEST_INITIAL_RESOURCES, commandNodeId: template.ai1StartNodeId, controlledKeyJunctionsTurns: {}, unitsDeployed: 0 },
    [AI2_ID]: { id: AI2_ID, name: AI2_NAME, color: THEME_COLORS.AI2.text, bgColor: THEME_COLORS.AI2.bg, resources: NOOSPHERIC_CONQUEST_INITIAL_RESOURCES, commandNodeId: template.ai2StartNodeId, controlledKeyJunctionsTurns: {}, unitsDeployed: 0 },
  } as Record<PlayerId, QuantumGambitPlayerState>;

  template.ai1InitialControlledNodes.forEach((nodeId: string) => {
      if(nodes[nodeId]) nodes[nodeId].owner = AI1_ID;
  });
  let p1UnitsDeployedCount = 0; 
  units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID, ++p1UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID, p1UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI1_ID, nodeId: template.ai1StartNodeId, displayOrder: 1 };
  units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID, ++p1UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID, p1UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI1_ID, nodeId: template.ai1StartNodeId, displayOrder: 2 };
  const ai1OtherStartNodes = template.ai1InitialControlledNodes.filter((id: string) => id !== template.ai1StartNodeId);
  if (ai1OtherStartNodes.length > 0 && nodes[ai1OtherStartNodes[0]]) {
      units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID, ++p1UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI1_ID, p1UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI1_ID, nodeId: ai1OtherStartNodes[0], displayOrder: 1 };
  }
  players[AI1_ID].unitsDeployed = p1UnitsDeployedCount;


  template.ai2InitialControlledNodes.forEach((nodeId: string) => {
      if(nodes[nodeId]) nodes[nodeId].owner = AI2_ID;
  });
  let p2UnitsDeployedCount = 0;
  units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID, ++p2UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID, p2UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI2_ID, nodeId: template.ai2StartNodeId, displayOrder: 1 };
  units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID, ++p2UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID, p2UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI2_ID, nodeId: template.ai2StartNodeId, displayOrder: 2 };
  const ai2OtherStartNodes = template.ai2InitialControlledNodes.filter((id: string) => id !== template.ai2StartNodeId);
  if (ai2OtherStartNodes.length > 0 && nodes[ai2OtherStartNodes[0]]) {
      units[generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID, ++p2UnitsDeployedCount)] = { id: generateUnitId(QuantumUnitType.LOGIC_CORE, AI2_ID, p2UnitsDeployedCount), type: QuantumUnitType.LOGIC_CORE, owner: AI2_ID, nodeId: ai2OtherStartNodes[0], displayOrder: 1 };
  }
  players[AI2_ID].unitsDeployed = p2UnitsDeployedCount;
  
  let neutralUnitsCount = 0;
  template.neutralKJsWithUnits?.forEach((nodeId: string) => {
      if(nodes[nodeId]) {
          nodes[nodeId].owner = 'NEUTRAL';
          const unitId = generateUnitId(QuantumUnitType.LOGIC_CORE, 'NEUTRAL' as PlayerId, ++neutralUnitsCount);
          units[unitId] = { id: unitId, type: QuantumUnitType.LOGIC_CORE, owner: 'NEUTRAL' as PlayerId, nodeId: nodeId, displayOrder: 1 };
      }
  });
   template.neutralNodesWithUnits?.forEach((nodeId: string) => {
      if(nodes[nodeId]) {
          nodes[nodeId].owner = 'NEUTRAL';
          const unitId = generateUnitId(QuantumUnitType.LOGIC_CORE, 'NEUTRAL' as PlayerId, ++neutralUnitsCount);
          units[unitId] = { id: unitId, type: QuantumUnitType.LOGIC_CORE, owner: 'NEUTRAL' as PlayerId, nodeId: nodeId, displayOrder: 1 };
      }
  });
  
  const keyJunctionsOnMap = template.nodes.filter((n: QuantumGambitNode) => n.type === 'KJ').map((n: QuantumGambitNode) => n.id);

  return {
    nodes, units, players, currentTurn: 1, currentPlayerId: AI1_ID, currentPhase: 'FLUCTUATION',
    gameLog: [{ id: 'start', sender: SYSTEM_SENDER_NAME, text: `Noospheric Conquest on "${template.name}" map. Turn 1: ${AI1_NAME} (Red). Fluctuation Phase.`, color: THEME_COLORS.SYSTEM, icon: 'system' , timestamp: Date.now() }],
    activeFluctuationEvent: null, battleReport: null, battleHistory: [], 
    keyJunctionsOnMap,
    turnLimit: NOOSPHERIC_CONQUEST_TURN_LIMIT,
    isBattlePopupVisible: false, turnStartTime: Date.now(), selectedNodeId: null, currentMapTemplateName: template.name,
    turnDurations: [],
  };
};

export const gameReducer = (state: NoosphericConquestGameState, action: GameAction): NoosphericConquestGameState => { 
   switch (action.type) {
    case 'ADD_LOG':
      return {
        ...state,
        gameLog: [...state.gameLog, { ...action.payload, id: `log-${Date.now()}-${Math.random()}`, timestamp: Date.now(), icon: action.payload?.icon === 'system' ? 'system' : undefined }],
      };
    case 'SELECT_NODE':
        return { ...state, selectedNodeId: action.payload };
    
    case 'SET_ACTIVE_EVENT':
        return { ...state, activeFluctuationEvent: action.payload };
    
    case 'APPLY_EVENT_EFFECTS_COMPLETE': {
        const newPlayers = { 
            ...state.players, 
            [AI1_ID]: {...state.players[AI1_ID]}, 
            [AI2_ID]: {...state.players[AI2_ID]} 
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
        if (newActiveEvent?.effectType === "FREE_UNIT_DEPLOYMENT" && newActiveEvent.targetPlayerId && newActiveEvent.details) {
            const playerId = newActiveEvent.targetPlayerId;
            const playerHubs = Object.values(state.nodes).filter((n: QuantumGambitNode) => n.owner === playerId && n.hasFabricationHub);
            if (playerHubs.length > 0) {
                const targetNodeId = playerHubs[0].id;
                const unitType = newActiveEvent.details.unitType as QuantumUnitType;
                const newUnitsDeployedCount = newPlayers[playerId].unitsDeployed + 1; 
                
                newPlayers[playerId] = {...newPlayers[playerId], unitsDeployed: newUnitsDeployedCount}; 

                const unitId = generateUnitId(unitType, playerId, newUnitsDeployedCount);
                const existingUnitsInNode = Object.values(newUnits).filter((u: QuantumUnit) => u.nodeId === targetNodeId).length;
                newUnits[unitId] = { id: unitId, type: unitType, owner: playerId, nodeId: targetNodeId, displayOrder: existingUnitsInNode + 1 };
            }
        }
        return { ...state, activeFluctuationEvent: newActiveEvent, players: newPlayers, units: newUnits };
    }

    case 'COLLECT_RESOURCES': {
      const currentPlayerState = state.players[state.currentPlayerId];
      let newResources = currentPlayerState.resources;
      Object.values(state.nodes).forEach((node: QuantumGambitNode) => {
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
        const { playerId, deployments } = action.payload as { playerId: PlayerId, deployments: { unitType: QuantumUnitType, nodeId: string, quantity: number }[] };
        const newPlayerState = { ...state.players[playerId] };
        const newUnits = { ...state.units };
        let currentUnitsDeployedCount = newPlayerState.unitsDeployed;

        deployments.forEach((order) => {
            const unitDef = NC_UNIT_DEFINITIONS[order.unitType];
            if (newPlayerState.resources >= unitDef.cost * order.quantity && state.nodes[order.nodeId]?.hasFabricationHub && state.nodes[order.nodeId]?.owner === playerId) {
                for (let i = 0; i < order.quantity; i++) {
                    newPlayerState.resources -= unitDef.cost;
                    currentUnitsDeployedCount++;
                    const unitId = generateUnitId(order.unitType, playerId, currentUnitsDeployedCount);
                    const existingUnitsInNode = Object.values(newUnits).filter((u: QuantumUnit) => u.nodeId === order.nodeId).length;
                    newUnits[unitId] = { id: unitId, type: order.unitType, owner: playerId, nodeId: order.nodeId, displayOrder: existingUnitsInNode + 1 };
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
        const { attack, battleReport } = action.payload as { attack: { fromNodeId: string, toNodeId: string, attackingUnits: QuantumUnit[] }, battleReport: BattleReport };
        const newUnits = { ...state.units };
        const newNodes = { ...state.nodes }; 
        const newBattleHistory = [...state.battleHistory, {...battleReport, turn: state.currentTurn}].slice(-MAX_BATTLE_HISTORY_LENGTH);


        battleReport.attackerLosses.forEach((lostUnit: QuantumUnit) => { delete newUnits[lostUnit.id]; });
        battleReport.defenderLosses.forEach((lostUnit: QuantumUnit) => { delete newUnits[lostUnit.id]; });
        
        const battleNodeIds = new Set([attack.fromNodeId, attack.toNodeId]);
        battleNodeIds.forEach((nodeId) => {
            const unitsInNode = Object.values(newUnits).filter((u: QuantumUnit) => u.nodeId === nodeId).sort((a: QuantumUnit,b: QuantumUnit) => a.displayOrder - b.displayOrder);
            unitsInNode.forEach((u: QuantumUnit,idx) => { 
                if(newUnits[u.id]) newUnits[u.id].displayOrder = idx + 1; 
            });
        });

        if (battleReport.nodeCaptured) {
            const capturedNodeOriginal = state.nodes[attack.toNodeId]; 
            newNodes[attack.toNodeId] = { ...capturedNodeOriginal, owner: battleReport.attacker }; 
            
            const survivingAttackerIds = attack.attackingUnits.map((au: QuantumUnit) => au.id).filter((id) => !battleReport.attackerLosses.some((al: QuantumUnit) => al.id === id));
            survivingAttackerIds.forEach((unitId) => {
                if (newUnits[unitId]) { 
                    newUnits[unitId] = { ...newUnits[unitId], nodeId: attack.toNodeId }; 
                }
            });
            const unitsInCapturedNode = Object.values(newUnits).filter((u: QuantumUnit) => u.nodeId === attack.toNodeId).sort((a: QuantumUnit,b: QuantumUnit) => a.displayOrder - b.displayOrder);
            unitsInCapturedNode.forEach((u: QuantumUnit,idx) => { 
                 if(newUnits[u.id]) newUnits[u.id].displayOrder = idx + 1; 
            });

            if (capturedNodeOriginal.type === 'CN') {
                const winner = battleReport.attacker;
                const loser = winner === AI1_ID ? AI2_ID : AI1_ID;
                return {
                    ...state, units: newUnits, nodes: newNodes, battleHistory: newBattleHistory,
                    battleReport, isBattlePopupVisible: true,
                    winner, currentPhase: 'GAME_OVER',
                    gameOverMessage: `${state.players[winner].name} captured ${state.players[loser].name}'s Command Node!`,
                    turnStartTime: null,
                };
            }
        }
        return { ...state, units: newUnits, nodes: newNodes, battleReport, battleHistory: newBattleHistory, isBattlePopupVisible: true };
    }
    
    case 'SHOW_BATTLE_POPUP':
        return { ...state, battleReport: action.payload as BattleReport, isBattlePopupVisible: true };
    case 'HIDE_BATTLE_POPUP':
        return { ...state, isBattlePopupVisible: false, battleReport: null };

    case 'MANEUVER_UNITS': {
        const { playerId, maneuvers } = action.payload as { playerId: PlayerId, maneuvers: { unitId: string, toNodeId: string }[] };
        const newUnits = { ...state.units };
        const originNodeIdsProcessed = new Set<string>();

        maneuvers.forEach((order) => {
            const unit = state.units[order.unitId];
            if (unit && unit.owner === playerId && !unit.hasMovedThisTurn) {
                const currentUnitNode = state.nodes[unit.nodeId];
                const targetNode = state.nodes[order.toNodeId];
                if (targetNode && targetNode.owner === playerId && currentUnitNode.connections.includes(order.toNodeId)) {
                    originNodeIdsProcessed.add(unit.nodeId);
                    newUnits[order.unitId] = { ...unit, nodeId: order.toNodeId, hasMovedThisTurn: true };
                }
            }
        });
        const affectedNodeIds = new Set([...originNodeIdsProcessed, ...maneuvers.map((m) => m.toNodeId)]);
        affectedNodeIds.forEach((nodeId) => {
            const unitsInNode = Object.values(newUnits).filter((u: QuantumUnit) => u.nodeId === nodeId).sort((a: QuantumUnit,b: QuantumUnit) => a.displayOrder - b.displayOrder);
            unitsInNode.forEach((u: QuantumUnit,idx) => { 
                if (newUnits[u.id]) newUnits[u.id].displayOrder = idx + 1; 
            });
        });
        return { ...state, units: newUnits };
    }
    
    case 'RESET_GAME_FOR_NEW_TURN': {
        const newUnits = { ...state.units };
        if (action.payload?.units) { 
            Object.keys(action.payload.units).forEach((unitId) => {
                if (newUnits[unitId]) {
                    newUnits[unitId] = { ...newUnits[unitId], ...action.payload.units![unitId] };
                }
            });
        } else if (action.payload !== undefined) {
            Object.keys(newUnits).forEach((unitId) => {
                if (newUnits[unitId]) { 
                     newUnits[unitId] = { ...newUnits[unitId], hasMovedThisTurn: false, hasAttackedThisTurn: false };
                }
            });
        }
        return { ...state, units: newUnits };
    }

    case 'ADVANCE_PHASE': {
        const orderedPhases: GamePhase[] = ['FLUCTUATION', 'RESOURCE', 'DEPLOYMENT', 'ATTACK', 'MANEUVER'];
        const nextPhaseIndex = orderedPhases.indexOf(state.currentPhase) + 1;
        let nextPhase: GamePhase = orderedPhases[nextPhaseIndex % orderedPhases.length];
        let newTurn = state.currentTurn;
        let nextPlayerId = state.currentPlayerId;
        const turnDuration = state.turnStartTime ? Date.now() - state.turnStartTime : 0;
        let newTurnDurations = [...state.turnDurations];
        let newTurnStartTime = state.turnStartTime; // Keep current turn start time by default

        if (nextPhase === 'FLUCTUATION') {
            newTurn++;
            newTurnStartTime = Date.now(); // Reset turn start time for new turn
            if (turnDuration > 0) {
                newTurnDurations.push(turnDuration); // Record duration for completed turn
            }
            if (state.currentPlayerId === AI1_ID) {
                nextPlayerId = AI2_ID;
                const gameLogEntry = { id: `turn-start-${newTurn}-${nextPlayerId}`, sender: SYSTEM_SENDER_NAME, text: `Turn ${newTurn}: ${AI2_NAME} (Cyan). Fluctuation Phase.`, color: THEME_COLORS.SYSTEM, icon: React.createElement(SystemIcon) , timestamp: Date.now() };
                return { ...state, currentPhase: nextPhase, currentPlayerId: nextPlayerId, currentTurn: newTurn, activeFluctuationEvent: null, battleReport: null, gameLog: [...state.gameLog, gameLogEntry], turnStartTime: newTurnStartTime, turnDurations: newTurnDurations };
            } else {
                nextPlayerId = AI1_ID;
                const gameLogEntry = { id: `turn-start-${newTurn}-${nextPlayerId}`, sender: SYSTEM_SENDER_NAME, text: `Turn ${newTurn}: ${AI1_NAME} (Red). Fluctuation Phase.`, color: THEME_COLORS.SYSTEM, icon: React.createElement(SystemIcon) , timestamp: Date.now() };
                return { ...state, currentPhase: nextPhase, currentPlayerId: nextPlayerId, currentTurn: newTurn, activeFluctuationEvent: null, battleReport: null, gameLog: [...state.gameLog, gameLogEntry], turnStartTime: newTurnStartTime, turnDurations: newTurnDurations };
            }
        }

        // Special handling for GAME_OVER to ensure turnStartTime is null and no new turn duration is recorded
        if (nextPhase === 'GAME_OVER') {
            return { ...state, currentPhase: nextPhase, currentPlayerId: nextPlayerId, currentTurn: newTurn, battleReport: null, turnStartTime: null };
        }

        // Default return for other phases, ensuring turnStartTime is passed through if not a new turn
        return { ...state, currentPhase: nextPhase, currentPlayerId: nextPlayerId, currentTurn: newTurn, battleReport: null, turnStartTime: newTurnStartTime, turnDurations: newTurnDurations };
    }

    case 'SET_GAME_OVER':
        return { ...state, winner: action.payload.winner, gameOverMessage: action.payload.message, currentPhase: 'GAME_OVER', turnStartTime: null };
    
    case 'START_GAME':
        return initialGameState(action.payload?.templateName ? NC_MAP_TEMPLATES.find(t => t.name === action.payload.templateName) : undefined);

    default:
      return state;
  }
}; 