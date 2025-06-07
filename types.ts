

import { Content } from "@google/genai";

export enum AppMode {
  SPIRAL_EXE = "spiral.exe", 
  HYPERSTITION_CHAT_EXE = "hypersition-chat.exe",
  SEMANTIC_ESCAPE_EXE = "semantic_escape.exe",
  UNIVERSE_SIM_EXE = "universe-sim.exe",
  CHESS_SIM_EXE = "chess-sim.exe",
  CORRUPTION_EXE = "corruption.exe",
  NOOSPHERIC_CONQUEST_EXE = "noospheric-conquest.exe",
  STORY_WEAVER_EXE = "story_weaver.exe", // Added
}

export interface MatrixSettings {
  speed: number;
  glitchEffect: boolean;
  isPaused: boolean;
  matrixColor: string; // Dynamically set by theme for matrix character color
}

export interface AIPersona {
  name: string;
  systemPrompt: string;
  color: string; // Tailwind CSS class using CSS variable, e.g. text-[var(--color-ai1-text)]
  modelName: 'gemini-2.5-flash-preview-04-17' | 'gemini-2.5-pro-preview-05-06'; // Updated modelName type
  initialInternalHistory?: Content[];
}

export interface ChatMessage {
  id: string;
  sender: string; 
  text: string;
  timestamp: string;
  isUser: boolean; 
  color?: string; 
}

export type ModeStartMessageSeed = Omit<ChatMessage, 'id' | 'timestamp' | 'isUser'>;

export interface ImageSnapshot {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export interface ConversationBackup {
  version: string;
  timestamp: string;
  mode: AppMode; 
  personas: { 
    ai1: { name: string; systemPrompt: string; };
    ai2: { name: string; systemPrompt: string; } | null;
  };
  conversationHistory: ChatMessage[];
  turnCycleCount: number;
  nextAiToSpeak: 'AI1' | 'AI2' | 'STORY_WEAVER';
  themeName?: ThemeName; // Save active theme with backup
  typingSpeedMs?: number; // Save typing speed
  matrixSettings?: Omit<MatrixSettings, 'matrixColor'>; // Save relevant matrix settings
  // Chess specific state for backup
  chessBoardFEN?: string;
  chessCurrentPlayer?: PlayerColor;
  chessCoTAI1?: string;
  chessCoTAI2?: string;
  chessGameStatus?: string;
  // Noospheric Conquest specific state for backup
  noosphericGameState?: NoosphericGameState;
  noosphericMapType?: NoosphericMapType; // Added for map type backup
  // Story Weaver specific state for backup
  imageSnapshots?: ImageSnapshot[];
}

export type InterventionTarget = 'CHAT_FLOW' | 'AI1' | 'AI2';

export type ThemeName = 'terminal' | 'cyanotype' | 'redzone' | 'cyberpunkYellow' | 'noosphericDark';

// ThemeColors defines the structure for THEMES object in constants.ts
export interface ThemeColors {
  name: ThemeName;
  primary500: string;
  primary600: string;
  primary700: string;
  accent200: string;
  accent300: string;
  accent400: string;
  textBase: string;
  textHeading: string;
  textMuted: string;
  textPlaceholder: string;
  textButtonPrimary: string;
  textButtonSecondary: string;

  borderBase: string;
  borderStrong: string;
  borderInput: string;
  borderButtonPrimary: string;
  borderButtonSecondary: string;
  
  shadowBase: string;

  bgPage: string;
  bgTerminal: string;
  bgPanel: string;
  bgInput: string;
  bgButtonPrimary: string;
  bgButtonPrimaryHover: string;
  bgButtonSecondary: string;
  bgButtonSecondaryHover: string;
  bgDropdown: string;
  bgTooltip: string;
  bgModal: string;

  scrollbarThumb: string;
  scrollbarThumbHover: string;
  scrollbarTrack: string;

  matrixColor: string; // For MatrixBackground characters

  systemMessageColor: string;
  userInterventionColor: string;
  facilitatorColor: string;
  promptMessageColor: string;
  errorColor: string;
  infoColor: string;
  
  ai1TextColor: string;
  ai2TextColor: string;
  storyWeaverTextColor?: string; // Added for Story Weaver
  neutralKJColor?: string; // Optional, for Noospheric mode KJs
}

// Chess specific types
export enum PieceSymbol {
  PAWN = 'p',
  ROOK = 'r',
  KNIGHT = 'n',
  BISHOP = 'b',
  QUEEN = 'q',
  KING = 'k',
}

export enum PlayerColor {
  WHITE = 'w',
  BLACK = 'b',
}

export interface ChessPiece {
  symbol: PieceSymbol;
  color: PlayerColor;
}

export type ChessSquare = ChessPiece | null;
export type ChessBoardState = ChessSquare[][]; // 8x8 array

export interface UCIMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  promotion?: PieceSymbol; // e.g., 'q' for queen
}

// --- Chess Game History Types ---
export interface ChessMoveDetail {
  player: PlayerColor;
  uci: string;
  cot: string;
  strategy: string;
  moveTimestamp: number; // e.g. Date.now()
  timeTakenMs: number;
}

export interface ChessGameOutcome {
  winner: PlayerColor | 'draw' | 'error'; // 'error' if game ended due to an issue
  reason: string; // e.g., "Checkmate", "Resignation", "50-move rule", "Error: AI disconnected"
}

export interface ChessGameRecord {
  id: string; // Unique ID for the game, e.g., `game-${Date.now()}`
  startTime: string; // ISO string
  endTime: string; // ISO string
  moves: ChessMoveDetail[];
  outcome: ChessGameOutcome;
  ai1StrategyInitial: string; // Name of the strategy used by AI1
  ai2StrategyInitial: string; // Name of the strategy used by AI2
  finalFEN: string;
}

// --- Noospheric Conquest Types ---
export type NoosphericPlayerId = 'GEM-Q' | 'AXIOM' | 'NEUTRAL';
export type NoosphericMapType = "Global Conflict" | "Twin Peaks" | "Classic Lattice" | "Fractured Core";

export interface NoosphericNodeData {
  id: string; // e.g., "GC_NA_N"
  label: string; // Short label, e.g., "NA_N"
  regionName: string; // Full name, e.g., "NA North"
  owner: NoosphericPlayerId;
  standardUnits: number; // Standard units
  evolvedUnits: number;  // Evolved units
  qrOutput: number; // Quantum Resources generated per turn if controlled
  isKJ: boolean; // Is it a Knowledge Junction?
  isCN: boolean; // Is it a Command Node?
  x: number; // Position for map rendering
  y: number;
  connections: string[]; // Array of connected node IDs
  maxUnits?: number; 
  hasFabricationHub?: boolean;
  isHubActive?: boolean; // Is the fabrication hub currently operational?
  hubDisconnectedTurn?: number; // Turn number when the hub lost CN connection (for grace period)
}

export interface TacticalAnalysisEntry {
  turn: number;
  phase: NoosphericPhase;
  analysis: string;
}

export interface NoosphericFaction {
  id: NoosphericPlayerId;
  name: string;
  color: string; // Hex or CSS var for faction color
  qr: number; // Quantum Resources
  nodesControlled: number;
  totalUnits: number; // Sum of standard and evolved units
  totalStandardUnits: number; // Only standard units
  totalEvolvedUnits: number;  // Only evolved units
  activeHubsCount: number; // Count of active fabrication hubs
  kjsHeld: number;
  tacticalAnalysis?: string;
  aiError?: string;
  successfulPhases: number; // New: Counter for successful AI phases
  failedPhases: number;     // New: Counter for failed AI phases
  tacticalAnalysisHistory: TacticalAnalysisEntry[]; // New: History of tactical analyses
}

export type NoosphericPhase = 'FLUCTUATION' | 'RESOURCE' | 'MANEUVER' | 'COMBAT' | 'GAME_OVER';

export interface NoosphericGameState {
  turn: number;
  currentPhase: NoosphericPhase;
  activePlayer: NoosphericPlayerId; // Which AI is currently making decisions for its phase part
  mapNodes: Record<string, NoosphericNodeData>; // Nodes indexed by ID
  factions: {
    'GEM-Q': NoosphericFaction;
    'AXIOM': NoosphericFaction;
  };
  systemLog: SystemLogEntry[];
  battleLog: BattleLogEntry[];
  mapType: NoosphericMapType; 
  isPaused: boolean;
  winner?: NoosphericPlayerId | 'DRAW';
}

export type NoosphericActionType = 
  | 'DEPLOY_UNITS' 
  | 'MOVE_UNITS' 
  | 'ATTACK_NODE' 
  | 'ACTIVATE_FABRICATION_HUB' // New action
  | 'EVOLVE_UNITS'; // New action
  // | 'FORTIFY_NODE' // Example for future
  // | 'COLLECT_RESOURCES' // Likely implicit
  // | 'ANALYZE_KJ'; // Example for future

export interface NoosphericAIMoveAction {
  type: NoosphericActionType;
  nodeId?: string; // Target node for deployment, hub activation, unit evolution
  fromNodeId?: string; // For movement/attack
  toNodeId?: string; // For movement/attack
  units?: number; // Number of units for DEPLOY, MOVE, ATTACK
  unitsToEvolve?: number; // Number of units for EVOLVE_UNITS
}

export interface NoosphericAIResponse {
  actions: NoosphericAIMoveAction[];
  tacticalAnalysis: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  turn: number;
  phase: NoosphericPhase;
  message: string;
  type: 'EVENT' | 'AI_ACTION' | 'ERROR' | 'INFO';
  source?: NoosphericPlayerId; // Optional: if AI action/error
}

export interface DiceRollDetail {
  attackerRoll: number | string; // string for 'N/A'
  defenderRoll: number | string; // string for 'N/A'
  outcome: string; // e.g., "Attacker Hits (Defender loses 1 unit)"
  attackerUnitsRemaining: number;
  defenderUnitsRemaining: number;
}

export interface BattleLogEntry {
  id: string;
  timestamp: string;
  turn: number;
  attacker: NoosphericPlayerId;
  defender: NoosphericPlayerId;
  fromNodeId?: string; // Optional: Node the attack originated from
  nodeId: string; // Node being attacked
  outcome: 'ATTACKER_WINS' | 'DEFENDER_WINS' | 'MUTUAL_LOSSES'; 
  attackerLosses: number;
  defenderLosses: number;
  nodeCaptured: boolean;
  attackerInitialUnits?: number;
  defenderInitialUnits?: number;
  nodeName?: string;
  unitsRemainingAtNode?: number;
  diceRolls: DiceRollDetail[]; 
}

export interface BattleReportData extends BattleLogEntry {
  // Inherits all from BattleLogEntry, can add more specific modal-only fields if needed
}


// Mode specific descriptions for InfoModal
export interface ModeInfo {
  title: string;
  overview: string;
  objective?: string;
  keyElements?: string[];
  gamePhases?: string[]; 
  aiInteraction?: string;
  winning?: string; 
  themePrompt?: string; 
}

// Add SenderName type if not already fully defined elsewhere
import { AI1_NAME, AI2_NAME, SYSTEM_SENDER_NAME, USER_INTERVENTION_SENDER_NAME, FACILITATOR_SENDER_NAME } from './constants';
export type SenderName =
  | typeof AI1_NAME
  | typeof AI2_NAME
  | typeof SYSTEM_SENDER_NAME
  | typeof USER_INTERVENTION_SENDER_NAME
  | typeof FACILITATOR_SENDER_NAME
  | "STORY_WEAVER";
