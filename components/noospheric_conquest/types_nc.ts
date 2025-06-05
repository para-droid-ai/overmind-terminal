// --- Enums and Types for Noospheric Conquest ---
export enum QuantumUnitType {
  LOGIC_CORE = 'LC',
  SHIELDING_NODE_UNIT = 'SN',
  QUANTUM_ENTANGLER = 'QE',
}

export type PlayerIdNC = 'AI1' | 'AI2'; // Renamed to avoid conflict with global PlayerColor

export interface QuantumUnit {
  id: string; type: QuantumUnitType; owner: PlayerIdNC | 'NEUTRAL'; nodeId: string; // Allow NEUTRAL owner for units
  hasMovedThisTurn?: boolean; hasAttackedThisTurn?: boolean; displayOrder: number; 
}

export interface QuantumGambitNodeData { 
  id: string; name: string; type: 'CN' | 'QN' | 'KJ'; connections: string[]; 
  resourcesPerTurn: number; hasFabricationHub: boolean; mapPosition: { x: number; y: number }; 
  isKeyJunctionObjective?: boolean; continent?: string; 
}

export interface QuantumGambitNode extends QuantumGambitNodeData { 
  owner: PlayerIdNC | 'NEUTRAL'; temporaryEffects?: string[];
}

export interface QuantumGambitPlayerState {
  id: PlayerIdNC; name: string; color: string; bgColor: string; resources: number;
  commandNodeId: string; controlledKeyJunctionsTurns: Record<string, number>; unitsDeployed: number; 
}

export interface QuantumFluctuationEventBase {
  id: string;
  descriptionTemplate: string; 
  effectType: string; 
  details?: any;
}

export interface ActiveQuantumFluctuationEvent extends QuantumFluctuationEventBase {
  resolvedDescription: string; 
  targetNodeIds?: string[];
  targetPlayerId?: PlayerIdNC;
  isActiveThisTurn: boolean;
  effectApplied?: boolean;
}

export interface BattleReport { 
  turn: number; 
  attacker: PlayerIdNC; defender: PlayerIdNC | 'NEUTRAL'; fromNodeId: string; toNodeId: string;
  attackingUnitsCommitted: Array<{ type: QuantumUnitType; id: string }>;
  defendingUnitsInitial: Array<{ type: QuantumUnitType; id: string }>;
  combatLog?: CombatRoundLog[]; // Detailed log of each dice roll exchange
  outcome: 'attacker_wins' | 'defender_wins' | 'stalemate_retreat' | 'defender_eliminated_no_capture' | 'pending';
  attackerLosses: Array<{ type: QuantumUnitType; id: string }>;
  defenderLosses: Array<{ type: QuantumUnitType; id: string }>;
  nodeCaptured: boolean;
}

export interface CombatRoundLog {
  round: number;
  attackerRoll: number;
  defenderRoll: number;
  attackerModifiedRoll?: number;
  defenderModifiedRoll?: number;
  outcome: 'attacker_hits' | 'defender_hits' | 'clash';
  attackerUnitsRemaining: number;
  defenderUnitsRemaining: number;
}

export interface GameLogMessageNC { 
  id: string; sender: string; text: string; color?: string; icon?: React.ReactNode; timestamp: number;
}

export type GamePhaseNC = 'FLUCTUATION' | 'RESOURCE' | 'DEPLOYMENT' | 'ATTACK' | 'MANEUVER' | 'GAME_OVER';

export interface NoosphericConquestGameState { 
  nodes: Record<string, QuantumGambitNode>; units: Record<string, QuantumUnit>;
  players: Record<PlayerIdNC, QuantumGambitPlayerState>; currentTurn: number;
  currentPlayerId: PlayerIdNC; currentPhase: GamePhaseNC; gameLog: GameLogMessageNC[];
  activeFluctuationEvent?: ActiveQuantumFluctuationEvent | null; 
  battleReport?: BattleReport | null; 
  battleHistory: BattleReport[]; 
  winner?: PlayerIdNC | 'DRAW'; gameOverMessage?: string; keyJunctionsOnMap: string[];
  turnLimit: number; isBattlePopupVisible: boolean; turnStartTime: number | null; 
  selectedNodeId: string | null; currentMapTemplateName: string; 
}

export interface MapTemplate { 
    name: string; nodes: QuantumGambitNodeData[]; ai1StartNodeId: string;
    ai1InitialControlledNodes: string[]; ai2StartNodeId: string;
    ai2InitialControlledNodes: string[]; neutralKJsWithUnits?: string[]; neutralNodesWithUnits?: string[];
}

// For AI response parsing
export interface AIAction {
    ACTION_TYPE: "DEPLOY" | "ATTACK" | "MANEUVER" | "SPECIAL_ACTION" | "PASS";
    UNIT_TYPE?: QuantumUnitType;
    NODE_ID?: string;
    QUANTITY?: number;
    FROM_NODE_ID?: string;
    TO_NODE_ID?: string;
    UNIT_IDS?: string[];
    UNIT_ID?: string;
    ACTION_NAME?: "PHASE_SHIFT" | "INTERFERENCE_PULSE";
    PERFORMING_UNIT_ID?: string;
}
  
export interface AIResponseFormat {
    actions: AIAction[];
    cot: string;
}
