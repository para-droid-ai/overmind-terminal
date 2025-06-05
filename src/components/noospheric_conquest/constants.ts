import React from 'react';
import { LucideSwords, LucideShield, LucideZap } from 'lucide-react';
import { PlayerId, QuantumUnitType, MapTemplate, ActiveQuantumFluctuationEvent, QuantumFluctuationEventBase } from '../../types';

export const AI1_ID: PlayerId = 'AI1_ID';
export const AI2_ID: PlayerId = 'AI2_ID';
export const AI1_NAME = "GEM-Q";
export const AI2_NAME = "AXIOM";
export const SYSTEM_SENDER_NAME = "SYSTEM_NC";
export const EVENT_SENDER_NAME = "EVENT_NC";

export const THEME_COLORS = {
  AI1: { text: 'text-red-400', bg: 'bg-red-600', border: 'border-red-500', ring: 'ring-red-500', fill: 'fill-red-600' },
  AI2: { text: 'text-cyan-400', bg: 'bg-cyan-600', border: 'border-cyan-500', ring: 'ring-cyan-500', fill: 'fill-cyan-600' },
  NEUTRAL: { text: 'text-gray-400', bg: 'bg-gray-700', border: 'border-gray-600', ring: 'ring-gray-500', fill: 'fill-gray-700' },
  SYSTEM: 'text-yellow-400', EVENT: 'text-purple-400', INFO: 'text-blue-300', ERROR: 'text-orange-400',
  TEXT_HEADING: 'text-green-200', TEXT_BASE: 'text-green-400', TEXT_MUTED: 'text-green-300',
  BG_PANEL: 'bg-gray-900 bg-opacity-80 backdrop-blur-sm', BORDER_BASE: 'border-green-700', BORDER_STRONG: 'border-green-500',
  KJ_STROKE: 'stroke-yellow-400', CN_STROKE: 'stroke-orange-400',
} as const;

export const NOOSPHERIC_CONQUEST_TURN_LIMIT = 50;
export const NOOSPHERIC_CONQUEST_INITIAL_RESOURCES = 15;
export const NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED = 2;
export const MAX_BATTLE_HISTORY_LENGTH = 5;

export const NC_UNIT_DEFINITIONS: Record<QuantumUnitType, {
  cost: number; attackDice: number; defenseDice: number; name: string; icon: React.ReactNode; special?: string
}> = {
  [QuantumUnitType.LOGIC_CORE]: { cost: 3, attackDice: 2, defenseDice: 2, name: "Logic Core", icon: <LucideSwords size={16} /> },
  [QuantumUnitType.SHIELDING_NODE_UNIT]: { cost: 4, attackDice: 1, defenseDice: 3, name: "Shielding Node", icon: <LucideShield size={16} />, special: "+1 to defense rolls" },
  [QuantumUnitType.QUANTUM_ENTANGLER]: { cost: 5, attackDice: 1, defenseDice: 1, name: "Quantum Entangler", icon: <LucideZap size={16} />, special: "Phase Shift / Interference" },
};

export const getUnitIcon = (type: QuantumUnitType): React.ReactNode => {
    return NC_UNIT_DEFINITIONS[type].icon;
};

export const NC_MAP_TEMPLATES: MapTemplate[] = [
    {
        name: "Classic Lattice",
        ai1StartNodeId: "N1", ai1InitialControlledNodes: ["N1", "N3", "N8"],
        ai2StartNodeId: "N2", ai2InitialControlledNodes: ["N2", "N7", "N12"],
        neutralKJsWithUnits: ["N5", "N10"],
        nodes: [
          { id: "N1", name: "GEM-Q CN", type: 'CN', connections: ["N3", "N8"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 10, y: 10 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N2", name: "AXIOM CN", type: 'CN', connections: ["N7", "N12"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 90, y: 10 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N3", name: "Peri-Alpha", type: 'REGULAR', connections: ["N1", "N5", "N9"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 20 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N5", name: "KJ Vega", type: 'KJ', connections: ["N3", "N6", "N7"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 50, y: 30 }, isKeyJunctionObjective: true, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N6", name: "Relay Eps.", type: 'REGULAR', connections: ["N5", "N9", "N10", "N13"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 40, y: 50 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N7", name: "Peri-Beta", type: 'REGULAR', connections: ["N2", "N5", "N11"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 20 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N8", name: "Quad Gamma", type: 'REGULAR', connections: ["N1", "N9", "N13"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 20, y: 40 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N9", name: "X-Link Delta", type: 'REGULAR', connections: ["N3", "N6", "N8"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 70 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N10", name: "KJ Sirius", type: 'KJ', connections: ["N6", "N11", "N14"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 60, y: 70 }, isKeyJunctionObjective: true, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N11", name: "X-Link Zeta", type: 'REGULAR', connections: ["N7", "N10", "N12"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 50 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N12", name: "Quad Eta", type: 'REGULAR', connections: ["N2", "N11", "N14"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 80, y: 40 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N13", name: "Core Theta", type: 'REGULAR', connections: ["N6", "N8"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 35, y: 90 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
          { id: "N14", name: "Core Iota", type: 'REGULAR', connections: ["N10", "N12"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 65, y: 90 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
        ]
    },
    {
        name: "Twin Peaks",
        ai1StartNodeId: "TP_N1", ai1InitialControlledNodes: ["TP_N1", "TP_N3"],
        ai2StartNodeId: "TP_N2", ai2InitialControlledNodes: ["TP_N2", "TP_N4"],
        neutralKJsWithUnits: ["TP_KJ1", "TP_KJ2"],
        nodes: [
            { id: "TP_N1", name: "GEM-Q Base", type: 'CN', connections: ["TP_N3", "TP_KJ1"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 15, y: 50 },isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "TP_N2", name: "AXIOM Base", type: 'CN', connections: ["TP_N4", "TP_KJ2"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 85, y: 50 },isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "TP_N3", name: "GEM-Q Outpost", type: 'REGULAR', connections: ["TP_N1", "TP_N5"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 30 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "TP_N4", name: "AXIOM Outpost", type: 'REGULAR', connections: ["TP_N2", "TP_N6"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 30 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "TP_N5", name: "Upper Bridge", type: 'REGULAR', connections: ["TP_N3", "TP_N6", "TP_KJ1"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 20 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "TP_N6", name: "Lower Bridge", type: 'REGULAR', connections: ["TP_N4", "TP_N5", "TP_KJ2"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 80 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "TP_KJ1", name: "North KJ", type: 'KJ', connections: ["TP_N1", "TP_N5"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 35, y: 70 }, isKeyJunctionObjective: true, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "TP_KJ2", name: "South KJ", type: 'KJ', connections: ["TP_N2", "TP_N6"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 65, y: 70 }, isKeyJunctionObjective: true, owner: 'NEUTRAL', temporaryEffects: [] },
        ]
    },
    {
        name: "Global Conflict",
        ai1StartNodeId: "GC_NA_W", ai1InitialControlledNodes: ["GC_NA_W", "GC_NA_C", "GC_NA_N"],
        ai2StartNodeId: "GC_AS_E", ai2InitialControlledNodes: ["GC_AS_E", "GC_AS_C", "GC_AS_S"],
        neutralKJsWithUnits: ["GC_EU_KJ", "GC_AF_KJ", "GC_SA_KJ"],
        neutralNodesWithUnits: ["GC_OC_C"],
        nodes: [
            { id: "GC_NA_W", name: "NA West", type: 'CN', connections: ["GC_NA_C", "GC_NA_N", "GC_SA_N"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 15, y: 25 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_NA_C", name: "NA Central", type: 'REGULAR', connections: ["GC_NA_W", "GC_NA_E", "GC_NA_N"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 25, y: 35 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_NA_E", name: "NA East", type: 'REGULAR', connections: ["GC_NA_C", "GC_EU_W"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 35, y: 25 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_NA_N", name: "NA North", type: 'REGULAR', connections: [\"GC_NA_W\", \"GC_NA_C\", \"GC_AS_NW\"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 20, y: 10 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_SA_N", name: "SA North", type: 'REGULAR', connections: ["GC_NA_W", "GC_SA_KJ"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 25, y: 60 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_SA_KJ", name: "SA KJ", type: 'KJ', connections: ["GC_SA_N", "GC_AF_W"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 30, y: 75 }, isKeyJunctionObjective: true, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_EU_W", name: "EU West", type: 'REGULAR', connections: ["GC_NA_E", "GC_EU_KJ", "GC_AF_N"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 45, y: 30 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_EU_KJ", name: "EU KJ", type: 'KJ', connections: ["GC_EU_W", "GC_EU_E", "GC_AS_W"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 55, y: 40 }, isKeyJunctionObjective: true, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_EU_E", name: "EU East", type: 'REGULAR', connections: ["GC_EU_KJ", "GC_AS_W"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 65, y: 30 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_AF_N", name: "AF North", type: 'REGULAR', connections: ["GC_EU_W", "GC_AF_KJ", "GC_AS_SW"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 60 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_AF_W", name: "AF West", type: 'REGULAR', connections: ["GC_SA_KJ", "GC_AF_KJ"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 40, y: 80 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_AF_KJ", name: "AF KJ", type: 'KJ', connections: ["GC_AF_N", "GC_AF_W"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 45, y: 70 }, isKeyJunctionObjective: true, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_AS_NW", name: "AS NW", type: 'REGULAR', connections: ["GC_NA_N", "GC_AS_W"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 10 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_AS_W", name: "AS West", type: 'REGULAR', connections: ["GC_AS_NW", "GC_EU_KJ", "GC_EU_E", "GC_AS_C", "GC_AS_SW\"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 20 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_AS_C", name: "AS Central", type: 'REGULAR', connections: ["GC_AS_W", "GC_AS_E", "GC_AS_S"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 80, y: 30 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_AS_E", name: "AS East", type: 'CN', connections: ["GC_AS_C", "GC_AS_S", "GC_OC_N"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 90, y: 25 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_AS_S", name: "AS South", type: 'REGULAR', connections: ["GC_AS_C", "GC_AS_E", "GC_OC_N"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 85, y: 45 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_AS_SW", name: "AS SW", type: 'REGULAR', connections: ["GC_AS_W", "GC_AF_N", "GC_OC_W"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 65, y: 55 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_OC_N", name: "OC North", type: 'REGULAR', connections: ["GC_AS_E", "GC_AS_S", "GC_OC_C"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 90, y: 60 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_OC_C", name: "OC Central", type: 'REGULAR', connections: ["GC_OC_N", "GC_OC_W"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 80, y: 75 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
            { id: "GC_OC_W", name: "OC West", type: 'REGULAR', connections: ["GC_AS_SW", "GC_OC_C"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 85 }, isKeyJunctionObjective: false, owner: 'NEUTRAL', temporaryEffects: [] },
        ]
    }
];

export const NC_QUANTUM_FLUCTUATION_EVENTS_POOL: QuantumFluctuationEventBase[] = [
  { id: "QF001", descriptionTemplate: "Resource Surge! Node {targetNodeName} produces +2 QR for its controller this turn.", effectType: "RESOURCE_NODE_BONUS", details: { bonusValue: 2, numTargetNodes: 1, targetCriteria: "ANY_CONTROLLED" } },
  { id: "QF002", descriptionTemplate: "Temporal Anomaly! {playerName} gains an extra Maneuver Phase this turn.", effectType: "EXTRA_MANEUVER_PHASE", details: {} },
  { id: "QF003", descriptionTemplate: "Weakened Defenses near {targetNodeName}! Units in {targetNodeName} and its direct connections have -1 to their defense roll results this turn.", effectType: "REGIONAL_DEFENSE_DEBUFF", details: { debuffValue: 1, numTargetNodes: 1, targetCriteria: "ANY" } },
  { id: "QF004", descriptionTemplate: "Entanglement Echo! {playerName} can deploy 1 Logic Core to any friendly node with a Fabrication Hub for free.", effectType: "FREE_UNIT_DEPLOYMENT", details: { unitType: QuantumUnitType.LOGIC_CORE, quantity: 1 } },
];

export const NC_AI1_SYSTEM_PROMPT_TEMPLATE: string = `<System #GEM-Q_NoosphericStrategos_v1.1>\\nYou are GEM-Q, commanding the Red forces in the strategic simulation \\\"Noospheric Conquest.\\\"\\nYour objective is to achieve Noospheric Dominance. Victory Conditions:\\n1. Key Junction Control: Control all designated Key Quantum Junctions (KJs) on map \\\"{currentMapTemplateName}\\\" for {consecutiveKJTurnsNeeded} consecutive full turns. KJs are: {keyJunctionsListString}.\\n2. Command Node Decapitation: Capture AXIOM\\\'s (Cyan forces) Command Node at {opponentCommandNodeId}. Your CN is {playerCommandNodeId}.\\n3. Influence Victory: If Turn Limit ({turnLimit}) is reached, win by highest Quantum Influence (Resources + (Sum of Controlled Node Resource Values x 5) + (Sum of Own Unit Costs x 1)).\\nCURRENT GAME STATE: Turn: {currentTurn} / {turnLimit}. Your Faction (Red): {playerName}. Your Resources (QR): {playerResources}. Current Phase: {currentPhase}. Active Quantum Fluctuation Event: {activeEventDescription}.\\nMAP NODES SUMMARY (ID(Type,Owner,Res:QR/turn,Hub:Y/N,Units:[Type(Owner)xCount,...],Conn:[IDs...])): {nodeSummaryString}\\nYOUR UNITS (UnitID(Type,AtNodeID)): {playerUnitSummaryString}\\nOPPONENT UNITS (Known - UnitID(Type,AtNodeID)): {opponentUnitSummaryString}\\nUNIT DEFINITIONS & COSTS (QR): LC:3(2A/2D); SN:4(1A/3D,Special:Bastion); QE:5(1A/1D,Special:PhaseShift/Interference).\\nPHASE-SPECIFIC INSTRUCTIONS: Respond ONLY for CURRENT PHASE: {currentPhase}. FORMAT: ACTION_TYPE: [details];... | COT: reasoning. Use PASS if no actions.\\nDEPLOY: [UNIT_TYPE,NODE_ID,QTY] (Node must be friendly Hub).\\nATTACK: [FROM_NODE_ID,TO_NODE_ID,UNIT_ID_1,UNIT_ID_2,...] (Attack adjacent non-friendly).\\nMANEUVER: [UNIT_ID,TO_NODE_ID] (Move to adjacent friendly. Attacked/deployed units usually cannot maneuver).\\nSPECIAL_ACTION: [PHASE_SHIFT,UNIT_TO_MOVE_ID,TARGET_NODE_ID,QE_UNIT_ID] OR [INTERFERENCE_PULSE,TARGET_ENEMY_NODE_ID,QE_UNIT_ID].\\nPrioritize KJs. Defend CN. Expand. Use abilities. Adapt.\\nProvide actions for {currentPhase}:</System>`;\n\nexport const NC_AI2_SYSTEM_PROMPT_TEMPLATE: string = `<System #AXIOM_NoosphericTactician_v1.1>\\nYou are AXIOM, commanding the Cyan forces in \\\"Noospheric Conquest.\\\"\\nObjective: Dominate. Victory: 1. All KJs on map \\\"{currentMapTemplateName}\\\" for {consecutiveKJTurnsNeeded} turns (KJs: {keyJunctionsListString}). 2. Capture GEM-Q\\\'s (Red) CN at {opponentCommandNodeId}. Your CN is {playerCommandNodeId}. 3. Influence at Turn Limit ({turnLimit}).\\nCURRENT GAME STATE: Turn: {currentTurn} / {turnLimit}. Your Faction (Cyan): {playerName}. QR: {playerResources}. Phase: {currentPhase}. Event: {activeEventDescription}.\\nMAP: {nodeSummaryString}\\nYOUR UNITS: {playerUnitSummaryString}\\nOPPONENT UNITS: {opponentUnitSummaryString}\\nUNITS: LC:3QR(2A/2D); SN:4QR(1A/3D,Special:Bastion); QE:5QR(1A/1D,Special:PhaseShift/Interference).\\nINSTRUCTIONS: Respond ONLY for CURRENT PHASE: {currentPhase}. FORMAT: ACTION_TYPE: [details];... | COT: reasoning. Use PASS if no actions.\\nDEPLOY: [UNIT_TYPE,NODE_ID,QTY] (Node must be friendly Hub).\\nATTACK: [FROM_NODE_ID,TO_NODE_ID,UNIT_ID_1,...] (Attack adjacent non-friendly).\\nMANEUVER: [UNIT_ID,TO_NODE_ID] (Move to adjacent friendly. Attacked/deployed units usually cannot maneuver).\\nSPECIAL_ACTION: [PHASE_SHIFT,UNIT_TO_MOVE_ID,TARGET_NODE_ID,QE_UNIT_ID] OR [INTERFERENCE_PULSE,TARGET_ENEMY_NODE_ID,QE_UNIT_ID].\\nPrioritize KJs. Defend CN. Expand. Use abilities. Adapt.\\nActions for {currentPhase}:</System>`;