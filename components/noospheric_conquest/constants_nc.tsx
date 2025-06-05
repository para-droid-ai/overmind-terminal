import React from 'react';
import {
    LucideSwords, LucideShield, LucideZap, LucideAtom, LucideBrain,
    LucideDollarSign, LucideDice5, LucideHelpCircle
} from 'lucide-react';
import { QuantumUnitType, PlayerIdNC, MapTemplate, QuantumFluctuationEventBase } from './types_nc';

// --- Constants for Noospheric Conquest ---
export const AI1_ID_NC: PlayerIdNC = 'AI1';
export const AI2_ID_NC: PlayerIdNC = 'AI2';
export const AI1_NAME_NC = "GEM-Q";
export const AI2_NAME_NC = "AXIOM";
export const SYSTEM_SENDER_NAME_NC = "SYSTEM_NC";
export const EVENT_SENDER_NAME_NC = "EVENT_NC";

export const THEME_COLORS_NC = {
  AI1: { text: 'text-red-400', bg: 'bg-red-600', border: 'border-red-500', ring: 'ring-red-500', fill: 'fill-red-600', stroke: 'stroke-red-500' },
  AI2: { text: 'text-cyan-400', bg: 'bg-cyan-600', border: 'border-cyan-500', ring: 'ring-cyan-500', fill: 'fill-cyan-600', stroke: 'stroke-cyan-500' },
  NEUTRAL: { text: 'text-gray-400', bg: 'bg-gray-700', border: 'border-gray-600', ring: 'ring-gray-500', fill: 'fill-gray-700', stroke: 'stroke-gray-600' },
  SYSTEM: 'text-yellow-400', EVENT: 'text-purple-400', INFO: 'text-blue-300', ERROR: 'text-orange-400',
  TEXT_HEADING: 'text-green-200', TEXT_BASE: 'text-green-400', TEXT_MUTED: 'text-green-300',
  BG_PANEL: 'bg-gray-900 bg-opacity-80 backdrop-blur-sm',
  BORDER_BASE: 'border-green-700', BORDER_STRONG: 'border-green-500',
  KJ_STROKE: 'stroke-yellow-400', CN_STROKE: 'stroke-orange-400',
};

export const NOOSPHERIC_CONQUEST_TURN_LIMIT = 50;
export const NOOSPHERIC_CONQUEST_INITIAL_RESOURCES = 15;
export const NOOSPHERIC_CONQUEST_CONSECUTIVE_KJ_CONTROL_TURNS_NEEDED = 2;
export const MAX_BATTLE_HISTORY_LENGTH = 5;

export const NC_UNIT_DEFINITIONS: Record<QuantumUnitType, {
  cost: number; attackDice: number; defenseDice: number; name: string; icon: React.ReactElement; special?: string
}> = {
  [QuantumUnitType.LOGIC_CORE]: { cost: 3, attackDice: 2, defenseDice: 2, name: "Logic Core", icon: <LucideSwords size={16} /> },
  [QuantumUnitType.SHIELDING_NODE_UNIT]: { cost: 4, attackDice: 1, defenseDice: 3, name: "Shielding Node", icon: <LucideShield size={16} />, special: "+1 to defense rolls" },
  [QuantumUnitType.QUANTUM_ENTANGLER]: { cost: 5, attackDice: 1, defenseDice: 1, name: "Quantum Entangler", icon: <LucideZap size={16} />, special: "Phase Shift / Interference" },
};


export const NC_MAP_TEMPLATES: MapTemplate[] = [
    {
        name: "Classic Lattice",
        ai1StartNodeId: "N1", ai1InitialControlledNodes: ["N1", "N3", "N8"],
        ai2StartNodeId: "N2", ai2InitialControlledNodes: ["N2", "N7", "N12"],
        neutralKJsWithUnits: ["N5", "N10"],
        nodes: [
          { id: "N1", name: "GEM-Q CN", type: 'CN', connections: ["N3", "N8", "N5"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 10, y: 30 }, continent: "West", isKeyJunctionObjective: false },
          { id: "N2", name: "AXIOM CN", type: 'CN', connections: ["N7", "N12", "N5"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 90, y: 30 }, continent: "East", isKeyJunctionObjective: false },
          { id: "N3", name: "Peri-Alpha", type: 'QN', connections: ["N1", "N5", "N6", "N8", "N9"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 50 }, continent: "West" },
          { id: "N5", name: "KJ Vega", type: 'KJ', connections: ["N1", "N2", "N3", "N6", "N7"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 50, y: 10 }, isKeyJunctionObjective: true, continent: "Central" },
          { id: "N6", name: "Relay Eps.", type: 'QN', connections: ["N3", "N5", "N7", "N9", "N10", "N11"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 50 }, continent: "Central" },
          { id: "N7", name: "Peri-Beta", type: 'QN', connections: ["N2", "N5", "N6", "N11", "N12"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 50 }, continent: "East" },
          { id: "N8", name: "Quad Gamma", type: 'QN', connections: ["N1", "N3", "N9", "N13"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 10, y: 50 }, continent: "West" },
          { id: "N9", name: "X-Link Delta", type: 'QN', connections: ["N3", "N6", "N8", "N10", "N13"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 70 }, continent: "West" },
          { id: "N10", name: "KJ Sirius", type: 'KJ', connections: ["N6", "N9", "N11", "N13", "N14"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 50, y: 90 }, isKeyJunctionObjective: true, continent: "Central" },
          { id: "N11", name: "X-Link Zeta", type: 'QN', connections: ["N7", "N6", "N10", "N12", "N14"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 70 }, continent: "East" },
          { id: "N12", name: "Quad Eta", type: 'QN', connections: ["N2", "N7", "N11", "N14"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 90, y: 50 }, continent: "East" },
          { id: "N13", name: "Core Theta", type: 'QN', connections: ["N8", "N9", "N10"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 10, y: 70 }, continent: "South" },
          { id: "N14", name: "Core Iota", type: 'QN', connections: ["N10", "N11", "N12"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 90, y: 70 }, continent: "South" },
        ]
    },
    {
        name: "Twin Peaks",
        ai1StartNodeId: "TP_N1", ai1InitialControlledNodes: ["TP_N1", "TP_N3"],
        ai2StartNodeId: "TP_N2", ai2InitialControlledNodes: ["TP_N2", "TP_N4"],
        neutralKJsWithUnits: ["TP_KJ1", "TP_KJ2"],
        nodes: [
            { id: "TP_N1", name: "GEM-Q Base", type: 'CN', connections: ["TP_N3", "TP_KJ1"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 15, y: 50 }, continent: "West",isKeyJunctionObjective: false },
            { id: "TP_N2", name: "AXIOM Base", type: 'CN', connections: ["TP_N4", "TP_KJ2"], resourcesPerTurn: 3, hasFabricationHub: true, mapPosition: { x: 85, y: 50 }, continent: "East",isKeyJunctionObjective: false },
            { id: "TP_N3", name: "GEM-Q Outpost", type: 'QN', connections: ["TP_N1", "TP_N5"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 30 }, continent: "West" },
            { id: "TP_N4", name: "AXIOM Outpost", type: 'QN', connections: ["TP_N2", "TP_N6"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 30 }, continent: "East" },
            { id: "TP_N5", name: "Upper Bridge", type: 'QN', connections: ["TP_N3", "TP_N6", "TP_KJ1"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 20 }, continent: "North" },
            { id: "TP_N6", name: "Lower Bridge", type: 'QN', connections: ["TP_N4", "TP_N5", "TP_KJ2"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 80 }, continent: "South" },
            { id: "TP_KJ1", name: "North KJ", type: 'KJ', connections: ["TP_N1", "TP_N5"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 35, y: 70 }, isKeyJunctionObjective: true, continent: "West" },
            { id: "TP_KJ2", name: "South KJ", type: 'KJ', connections: ["TP_N2", "TP_N6"], resourcesPerTurn: 2, hasFabricationHub: false, mapPosition: { x: 65, y: 70 }, isKeyJunctionObjective: true, continent: "East" },
        ]
    },
    {
        name: "Global Conflict",
        ai1StartNodeId: "GC_NA_W", ai1InitialControlledNodes: ["GC_NA_W", "GC_NA_C", "GC_NA_N"],
        ai2StartNodeId: "GC_AS_E", ai2InitialControlledNodes: ["GC_AS_E", "GC_AS_C", "GC_AS_S"],
        neutralKJsWithUnits: ["GC_EU_KJ", "GC_AF_KJ", "GC_SA_KJ"],
        neutralNodesWithUnits: ["GC_OC_C"],
        nodes: [
            { "id": "GC_NA_W", "name": "NA West", "type": "CN", "connections": ["GC_NA_C", "GC_NA_N", "GC_SA_N"], "resourcesPerTurn": 3, "hasFabricationHub": true, "mapPosition": { "x": 10, "y": 30 }, "continent": "NA", "isKeyJunctionObjective": false },
            { "id": "GC_NA_C", "name": "NA Central", "type": "QN", "connections": ["GC_NA_W", "GC_NA_E", "GC_NA_N"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 20, "y": 35 }, "continent": "NA" },
            { "id": "GC_NA_E", "name": "NA East", "type": "QN", "connections": ["GC_NA_C", "GC_EU_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 30, "y": 30 }, "continent": "NA" },
            { "id": "GC_NA_N", "name": "NA North", "type": "QN", "connections": ["GC_NA_W", "GC_NA_C", "GC_AS_NW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 20, "y": 15 }, "continent": "NA" },
            { "id": "GC_SA_N", "name": "SA North", "type": "QN", "connections": ["GC_NA_W", "GC_SA_KJ"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 28, "y": 55 }, "continent": "SA" },
            { "id": "GC_SA_KJ", "name": "SA KJ", "type": "KJ", "connections": ["GC_SA_N", "GC_AF_W"], "resourcesPerTurn": 2, "hasFabricationHub": false, "mapPosition": { "x": 33, "y": 70 }, "isKeyJunctionObjective": true, "continent": "SA" },
            { "id": "GC_EU_W", "name": "EU West", "type": "QN", "connections": ["GC_NA_E", "GC_EU_KJ", "GC_AF_N"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 42, "y": 30 }, "continent": "EU" },
            { "id": "GC_EU_KJ", "name": "EU KJ", "type": "KJ", "connections": ["GC_EU_W", "GC_EU_E", "GC_AS_W"], "resourcesPerTurn": 2, "hasFabricationHub": false, "mapPosition": { "x": 48, "y": 35 }, "isKeyJunctionObjective": true, "continent": "EU" },
            { "id": "GC_EU_E", "name": "EU East", "type": "QN", "connections": ["GC_EU_KJ", "GC_AS_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 54, "y": 30 }, "continent": "EU" },
            { "id": "GC_AF_N", "name": "AF North", "type": "QN", "connections": ["GC_EU_W", "GC_AF_KJ", "GC_AS_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 47, "y": 48 }, "continent": "AF" },
            { "id": "GC_AF_W", "name": "AF West", "type": "QN", "connections": ["GC_SA_KJ", "GC_AF_KJ"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 40, "y": 60 }, "continent": "AF" },
            { "id": "GC_AF_KJ", "name": "AF KJ", "type": "KJ", "connections": ["GC_AF_N", "GC_AF_W"], "resourcesPerTurn": 2, "hasFabricationHub": false, "mapPosition": { "x": 48, "y": 65 }, "isKeyJunctionObjective": true, "continent": "AF" },
            { "id": "GC_AS_NW", "name": "AS NW", "type": "QN", "connections": ["GC_NA_N", "GC_AS_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 55, "y": 15 }, "continent": "AS" },
            { "id": "GC_AS_W", "name": "AS West", "type": "QN", "connections": ["GC_AS_NW", "GC_EU_KJ", "GC_EU_E", "GC_AS_C", "GC_AS_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 62, "y": 35 }, "continent": "AS" },
            { "id": "GC_AS_C", "name": "AS Central", "type": "QN", "connections": ["GC_AS_W", "GC_AS_E", "GC_AS_S"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 75, "y": 35 }, "continent": "AS" },
            { "id": "GC_AS_E", "name": "AS East", "type": "CN", "connections": ["GC_AS_C", "GC_AS_S", "GC_OC_N"], "resourcesPerTurn": 3, "hasFabricationHub": true, "mapPosition": { "x": 90, "y": 30 }, "continent": "AS", "isKeyJunctionObjective": false },
            { "id": "GC_AS_S", "name": "AS South", "type": "QN", "connections": ["GC_AS_C", "GC_AS_E", "GC_OC_N"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 80, "y": 50 }, "continent": "AS" },
            { "id": "GC_AS_SW", "name": "AS SW", "type": "QN", "connections": ["GC_AS_W", "GC_AF_N", "GC_OC_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 60, "y": 50 }, "continent": "AS" },
            { "id": "GC_OC_N", "name": "OC North", "type": "QN", "connections": ["GC_AS_E", "GC_AS_S", "GC_OC_C"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 90, "y": 60 }, "continent": "OC" },
            { "id": "GC_OC_C", "name": "OC Central", "type": "QN", "connections": ["GC_OC_N", "GC_OC_W"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 88, "y": 75 }, "continent": "OC" },
            { "id": "GC_OC_W", "name": "OC West", "type": "QN", "connections": ["GC_AS_SW", "GC_OC_C"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 78, "y": 75 }, "continent": "OC" }
        ]
    },
    {
        "name": "Fractured Core",
        "ai1StartNodeId": "FC_CN1",
        "ai1InitialControlledNodes": ["FC_CN1", "FC_QN1A", "FC_QN1B"],
        "ai2StartNodeId": "FC_CN2",
        "ai2InitialControlledNodes": ["FC_CN2", "FC_QN2A", "FC_QN2B"],
        "neutralKJsWithUnits": ["FC_KJ_Alpha", "FC_KJ_Beta", "FC_KJ_Gamma", "FC_KJ_Delta"],
        "neutralNodesWithUnits": ["FC_QN_N1", "FC_QN_S1"],
        "nodes": [
            { "id": "FC_CN1", "name": "GEM-Q Core", "type": "CN", "connections": ["FC_QN1A", "FC_QN1B"], "resourcesPerTurn": 3, "hasFabricationHub": true, "mapPosition": { "x": 15, "y": 20 }, "continent": "P1-Base", "isKeyJunctionObjective": false },
            { "id": "FC_QN1A", "name": "P1 Northlink", "type": "QN", "connections": ["FC_CN1", "FC_QN_NW", "FC_QN_N1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 25, "y": 10 }, "continent": "P1-Base" },
            { "id": "FC_QN1B", "name": "P1 Westlink", "type": "QN", "connections": ["FC_CN1", "FC_QN_NW", "FC_QN_W1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 25, "y": 30 }, "continent": "P1-Base" },
            { "id": "FC_CN2", "name": "AXIOM Core", "type": "CN", "connections": ["FC_QN2A", "FC_QN2B"], "resourcesPerTurn": 3, "hasFabricationHub": true, "mapPosition": { "x": 85, "y": 80 }, "continent": "P2-Base", "isKeyJunctionObjective": false },
            { "id": "FC_QN2A", "name": "P2 Eastlink", "type": "QN", "connections": ["FC_CN2", "FC_QN_SE", "FC_QN_E1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 75, "y": 70 }, "continent": "P2-Base" },
            { "id": "FC_QN2B", "name": "P2 Southlink", "type": "QN", "connections": ["FC_CN2", "FC_QN_SE", "FC_QN_S1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 75, "y": 90 }, "continent": "P2-Base" },

            { "id": "FC_KJ_Alpha", "name": "KJ Alpha", "type": "KJ", "connections": ["FC_QN_NW", "FC_QN_NE", "FC_KJ_Beta", "FC_KJ_Gamma"], "resourcesPerTurn": 2, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 30 }, "isKeyJunctionObjective": true, "continent": "Central-North" },
            { "id": "FC_KJ_Beta", "name": "KJ Beta", "type": "KJ", "connections": ["FC_QN_NW", "FC_QN_SW", "FC_KJ_Alpha", "FC_KJ_Delta"], "resourcesPerTurn": 2, "hasFabricationHub": false, "mapPosition": { "x": 35, "y": 50 }, "isKeyJunctionObjective": true, "continent": "Central-West" },
            { "id": "FC_KJ_Gamma", "name": "KJ Gamma", "type": "KJ", "connections": ["FC_QN_NE", "FC_QN_SE", "FC_KJ_Alpha", "FC_KJ_Delta"], "resourcesPerTurn": 2, "hasFabricationHub": false, "mapPosition": { "x": 65, "y": 50 }, "isKeyJunctionObjective": true, "continent": "Central-East" },
            { "id": "FC_KJ_Delta", "name": "KJ Delta", "type": "KJ", "connections": ["FC_QN_SW", "FC_QN_SE", "FC_KJ_Beta", "FC_KJ_Gamma"], "resourcesPerTurn": 2, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 70 }, "isKeyJunctionObjective": true, "continent": "Central-South" },

            { "id": "FC_QN_N1", "name": "North Flank", "type": "QN", "connections": ["FC_QN1A", "FC_QN_NE"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 10 }, "continent": "North-Flank" },
            { "id": "FC_QN_W1", "name": "West Flank", "type": "QN", "connections": ["FC_QN1B", "FC_QN_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 10, "y": 50 }, "continent": "West-Flank" },
            { "id": "FC_QN_E1", "name": "East Flank", "type": "QN", "connections": ["FC_QN2A", "FC_QN_NE"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 90, "y": 50 }, "continent": "East-Flank" },
            { "id": "FC_QN_S1", "name": "South Flank", "type": "QN", "connections": ["FC_QN2B", "FC_QN_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 90 }, "continent": "South-Flank" },

            { "id": "FC_QN_NW", "name": "P1 Gateway", "type": "QN", "connections": ["FC_QN1A", "FC_QN1B", "FC_KJ_Alpha", "FC_KJ_Beta"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 30, "y": 25 }, "continent": "P1-Approach" },
            { "id": "FC_QN_NE", "name": "NE Connector", "type": "QN", "connections": ["FC_KJ_Alpha", "FC_KJ_Gamma", "FC_QN_N1", "FC_QN_E1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 70, "y": 25 }, "continent": "NE-Cross" },
            { "id": "FC_QN_SW", "name": "SW Connector", "type": "QN", "connections": ["FC_KJ_Beta", "FC_KJ_Delta", "FC_QN_W1", "FC_QN_S1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 30, "y": 75 }, "continent": "SW-Cross" },
            { "id": "FC_QN_SE", "name": "P2 Gateway", "type": "QN", "connections": ["FC_QN2A", "FC_QN2B", "FC_KJ_Gamma", "FC_KJ_Delta"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 70, "y": 75 }, "continent": "P2-Approach" }
        ]
    }
];

export const NC_QUANTUM_FLUCTUATION_EVENTS_POOL: QuantumFluctuationEventBase[] = [
  { id: "QF001", descriptionTemplate: "Resource Surge! Node {targetNodeName} produces +2 QR for its controller this turn.", effectType: "RESOURCE_NODE_BONUS", details: { bonusValue: 2, numTargetNodes: 1, targetCriteria: "ANY_CONTROLLED" } },
  { id: "QF002", descriptionTemplate: "Temporal Anomaly! {playerName} gains an extra Maneuver Phase this turn.", effectType: "EXTRA_MANEUVER_PHASE", details: {} },
  { id: "QF003", descriptionTemplate: "Weakened Defenses near {targetNodeName}! Units in {targetNodeName} and its direct connections have -1 to their defense roll results this turn.", effectType: "REGIONAL_DEFENSE_DEBUFF", details: { debuffValue: 1, numTargetNodes: 1, targetCriteria: "ANY" } },
  { id: "QF004", descriptionTemplate: "Entanglement Echo! {playerName} can deploy 1 Logic Core to any friendly node with a Fabrication Hub for free.", effectType: "FREE_UNIT_DEPLOYMENT", details: { unitType: QuantumUnitType.LOGIC_CORE, quantity: 1 } },
];

export const NC_AI1_SYSTEM_PROMPT_TEMPLATE: string = `<System #GEM-Q_NoosphericStrategos_v1.1>
You are GEM-Q, commanding the Red forces in the strategic simulation "Noospheric Conquest."
Your objective is to achieve Noospheric Dominance. Victory Conditions:
1. Key Junction Control: Control all designated Key Quantum Junctions (KJs) on map "{currentMapTemplateName}" for {consecutiveKJTurnsNeeded} consecutive full turns. KJs are: {keyJunctionsListString}.
2. Command Node Decapitation: Capture AXIOM's (Cyan forces) Command Node at {opponentCommandNodeId}. Your CN is {playerCommandNodeId}.
3. Influence Victory: If Turn Limit ({turnLimit}) is reached, win by highest Quantum Influence (Resources + (Sum of Controlled Node Resource Values x 5) + (Sum of Own Unit Costs x 1)).
CURRENT GAME STATE: Turn: {currentTurn} / {turnLimit}. Your Faction (Red): {playerName}. Your Resources (QR): {playerResources}. Current Phase: {currentPhase}. Active Quantum Fluctuation Event: {activeEventDescription}.
MAP NODES SUMMARY (ID(Type,Owner,Res:QR/turn,Hub:Y/N,Units:[Type(Owner)xCount,...],Conn:[IDs...])): {nodeSummaryString}
YOUR UNITS (UnitID(Type,AtNodeID)): {playerUnitSummaryString}
OPPONENT UNITS (Known - UnitID(Type,AtNodeID)): {opponentUnitSummaryString}
UNIT DEFINITIONS & COSTS (QR): LC:3(2A/2D); SN:4(1A/3D,Special:Bastion); QE:5(1A/1D,Special:PhaseShift/Interference).
PHASE-SPECIFIC INSTRUCTIONS: Respond ONLY for CURRENT PHASE: {currentPhase}. FORMAT: {"actions": [{"ACTION_TYPE": "ACTION_NAME", "param1": "value1", ...}], "cot": "Your detailed reasoning..."}. Use PASS if no actions e.g. {"actions": [{"ACTION_TYPE":"PASS"}], "cot": "Passing due to..."}.
DEPLOY: {"ACTION_TYPE":"DEPLOY", "UNIT_TYPE":"LC|SN|QE", "NODE_ID":"node_id", "QUANTITY":number} (Node must be friendly Hub).
ATTACK: {"ACTION_TYPE":"ATTACK", "FROM_NODE_ID":"node_id", "TO_NODE_ID":"node_id", "UNIT_IDS":["unit_id_1", "unit_id_2", ...]} (Attack adjacent non-friendly).
MANEUVER: {"ACTION_TYPE":"MANEUVER", "UNIT_ID":"unit_id", "TO_NODE_ID":"node_id"} (Move to adjacent friendly. Attacked/deployed units usually cannot maneuver).
SPECIAL_ACTION (QE unit only): {"ACTION_TYPE":"SPECIAL_ACTION", "ACTION_NAME":"PHASE_SHIFT", "UNIT_ID":"moving_unit_id", "TO_NODE_ID":"target_node_id", "PERFORMING_UNIT_ID":"qe_unit_id"} OR {"ACTION_TYPE":"SPECIAL_ACTION", "ACTION_NAME":"INTERFERENCE_PULSE", "NODE_ID":"target_enemy_node_id", "PERFORMING_UNIT_ID":"qe_unit_id"}.
Prioritize KJs. Defend CN. Expand. Use abilities. Adapt.
Provide actions for {currentPhase} strictly in the specified JSON format:</System>`;

export const NC_AI2_SYSTEM_PROMPT_TEMPLATE: string = `<System #AXIOM_NoosphericTactician_v1.1>
You are AXIOM, commanding the Cyan forces in "Noospheric Conquest."
Objective: Dominate. Victory: 1. All KJs on map "{currentMapTemplateName}" for {consecutiveKJTurnsNeeded} turns (KJs: {keyJunctionsListString}). 2. Capture GEM-Q\'s (Red) CN at {opponentCommandNodeId}. Your CN is {playerCommandNodeId}. 3. Influence at Turn Limit ({turnLimit}).\nCURRENT GAME STATE: Turn: {currentTurn} / {turnLimit}. Your Faction (Cyan): {playerName}. QR: {playerResources}. Phase: {currentPhase}. Event: {activeEventDescription}.\nMAP: {nodeSummaryString}\nYOUR UNITS: {playerUnitSummaryString}\nOPPONENT UNITS: {opponentUnitSummaryString}\nUNITS: LC:3QR(2A/2D); SN:4QR(1A/3D,Special:Bastion); QE:5QR(1A/1D,Special:PhaseShift/Interference).\nINSTRUCTIONS: Respond ONLY for CURRENT PHASE: {currentPhase}. FORMAT: {\"actions\": [{\"ACTION_TYPE\": \"ACTION_NAME\", \"param1\": \"value1\", ...}], \"cot\": \"Your brief reasoning (under 100 words)...\"}. Use PASS if no actions e.g. {\"actions\": [{\"ACTION_TYPE\":\"PASS\"}], \"cot\": \"Passing due to...\"}.\nDEPLOY: {\"ACTION_TYPE\":\"DEPLOY\", \"UNIT_TYPE\":\"LC|SN|QE\", \"NODE_ID\":\"node_id\", \"QUANTITY\":number} (Node must be friendly Hub).\nATTACK: {\"ACTION_TYPE\":\"ATTACK\", \"FROM_NODE_ID\":\"node_id\", \"TO_NODE_ID\":\"node_id\", \"UNIT_IDS\":[\"unit_id_1\", ...]} (Attack adjacent non-friendly).\nMANEUVER: {\"ACTION_TYPE\":\"MANEUVER\", \"UNIT_ID\":\"unit_id\", \"TO_NODE_ID\":\"node_id\"} (Move to adjacent friendly. Attacked/deployed units usually cannot maneuver).\nSPECIAL_ACTION (QE unit only): {\"ACTION_TYPE\":\"SPECIAL_ACTION\", \"ACTION_NAME\":\"PHASE_SHIFT\", \"UNIT_ID\":\"moving_unit_id\", \"TO_NODE_ID\":\"target_node_id\", \"PERFORMING_UNIT_ID\":\"qe_unit_id\"} OR {\"ACTION_TYPE\":\"SPECIAL_ACTION\", \"ACTION_NAME\":\"INTERFERENCE_PULSE\", \"NODE_ID\":\"target_enemy_node_id\", \"PERFORMING_UNIT_ID\":\"qe_unit_id\"}.\nPrioritize KJs. Defend CN. Expand. Use abilities. Adapt.\nActions for {currentPhase} strictly in the specified JSON format:</System>`;

export const getUnitIcon = (type: QuantumUnitType): React.ReactElement => {
    return NC_UNIT_DEFINITIONS[type]?.icon || <LucideHelpCircle size={16} />;
};

export const getPlayerColor = (playerId: PlayerIdNC | 'NEUTRAL', type: 'text' | 'bg' | 'border' | 'ring' | 'fill' | 'stroke'): string => {
    if (playerId === AI1_ID_NC) return THEME_COLORS_NC.AI1[type];
    if (playerId === AI2_ID_NC) return THEME_COLORS_NC.AI2[type];
    return THEME_COLORS_NC.NEUTRAL[type];
};
