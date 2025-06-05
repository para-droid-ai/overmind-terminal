

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat, Content, Part, GenerateContentResponse } from "@google/genai";
import MatrixBackground from './components/MatrixBackground';
import TerminalWindow from './components/TerminalWindow';
import ControlsPanel from './components/ControlsPanel';
import ChessModeContainer from './components/chess/ChessModeContainer';
import NoosphericConquestContainer from './components/noospheric/NoosphericConquestContainer';
import InfoModal from './components/InfoModal';
import {
  AIPersona, MatrixSettings, ChatMessage,
  ConversationBackup, AppMode, ModeStartMessageSeed, InterventionTarget, ThemeName, PlayerColor,
  NoosphericGameState, NoosphericMapType // Added for Noospheric backup
} from './types';
import {
  DEFAULT_MATRIX_SPEED, AI1_NAME, AI2_NAME,
  GEM_Q_INITIATION_PROMPT, MAX_TURN_CYCLES, USER_PROMPT_MESSAGE, SYSTEM_SENDER_NAME,
  getAIPersona,
  HYPERSTITION_CHAT_EXE_MODE_START_MESSAGES, FACILITATOR_SENDER_NAME, USER_INTERVENTION_SENDER_NAME,
  INITIAL_START_PROMPT_MESSAGE, UNIVERSE_SIM_EXE_INITIATION_TRIGGER, CHESS_SIM_START_MESSAGE,
  NOOSPHERIC_CONQUEST_START_MESSAGE, // Added for new mode
  DEFAULT_TYPING_SPEED_MS,
  THEMES,
  SPIRAL_EXE_MODE_START_MESSAGES,
  CORRUPTION_EXE_MODE_START_MESSAGES,
  NOOSPHERIC_CONQUEST_EXE_START_MESSAGES, // Added for new mode start
  MODE_INFO_CONTENT, // Added for InfoModal
} from './constants';
import { INITIAL_BOARD_FEN, fenToBoard } from './utils/chessLogic';


const App: React.FC = () => {
  const [activeTheme, setActiveTheme] = useState<ThemeName>('terminal');

  const [matrixSettings, setMatrixSettings] = useState<MatrixSettings>({
    speed: DEFAULT_MATRIX_SPEED,
    glitchEffect: true,
    isPaused: false,
    matrixColor: THEMES.terminal.matrixColor,
  });
  const [fps, setFps] = useState(0);
  const [typingSpeedMs, setTypingSpeedMs] = useState<number>(DEFAULT_TYPING_SPEED_MS);

  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SPIRAL_EXE);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTypingMessageId, setCurrentTypingMessageId] = useState<string | null>(null);
  const [activeAINameForLoading, setActiveAINameForLoading] = useState<string | null>(null);

  const [isAwaitingUserInput, setIsAwaitingUserInput] = useState(false);
  const [userInputText, setUserInputText] = useState("");

  const [isAwaitingInitialStart, setIsAwaitingInitialStart] = useState(true);
  const [initialStartInputText, setInitialStartInputText] = useState("");
  const [universeSimInputText, setUniverseSimInputText] = useState("");

  const [turnCycleCount, setTurnCycleCount] = useState(0);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);


  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const commandHistoryIndexRef = useRef<number>(-1);

  const [forceTurnCheckToken, setForceTurnCheckToken] = useState(0);
  const [isAiReadyForChess, setIsAiReadyForChess] = useState(false);
  const [isAiReadyForNoospheric, setIsAiReadyForNoospheric] = useState(false); // For new mode


  const [chessInitialFen, setChessInitialFen] = useState<string>(INITIAL_BOARD_FEN);
  const [chessInitialPlayer, setChessInitialPlayer] = useState<PlayerColor | undefined>(undefined);
  const [chessInitialCoTAI1, setChessInitialCoTAI1] = useState<string>("");
  const [chessInitialCoTAI2, setChessInitialCoTAI2] = useState<string>("");
  const [chessInitialGameStatus, setChessInitialGameStatus] = useState<string | undefined>(undefined);
  const chessResetTokenRef = useRef(0);

  const [noosphericInitialState, setNoosphericInitialState] = useState<NoosphericGameState | undefined>(undefined); // For new mode
  const [noosphericInitialMapType, setNoosphericInitialMapType] = useState<NoosphericMapType | undefined>(undefined); // For new mode map type
  const [noosphericGameStartedFromBackup, setNoosphericGameStartedFromBackup] = useState(false);
  const noosphericResetTokenRef = useRef(0); // For new mode


  const ai1ChatRef = useRef<Chat | null>(null);
  const ai2ChatRef = useRef<Chat | null>(null);
  const nextAiToSpeakRef = useRef<'AI1' | 'AI2'>('AI1');

  const isUserInterventionPendingRef = useRef(false);
  const pendingInterventionTextRef = useRef<string | null>(null);
  const interventionTargetForPendingRef = useRef<InterventionTarget | null>(null);

  const queuedInterventionForAI1Ref = useRef<string | null>(null);
  const queuedInterventionForAI2Ref = useRef<string | null>(null);

  const genAI = useRef<GoogleGenAI | null>(null);
  const genAIInstanceInitialized = useRef(false);
  const wasAwaitingUserInputRef = useRef(false);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);


  const handleMatrixSettingsChange = useCallback(<K extends keyof MatrixSettings>(key: K, value: MatrixSettings[K]) => {
    setMatrixSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    const currentThemeColors = THEMES[activeTheme];
    if (currentThemeColors) {
      handleMatrixSettingsChange('matrixColor', currentThemeColors.matrixColor);
    }
  }, [activeTheme, handleMatrixSettingsChange]);

  const handleThemeChange = useCallback((themeName: ThemeName) => {
    setActiveTheme(themeName);
  }, []);


  const addMessageToHistory = useCallback((sender: string, text: string | undefined, colorClassOverride?: string, isUserForNextAI: boolean = false, makeActiveTyping: boolean = true): string => {
    const newText = typeof text === 'string' ? text : "";
    const ai1PersonaFromConstants = getAIPersona(1, currentMode); 
    const ai2PersonaFromConstants = getAIPersona(2, currentMode); 

    let colorClass = colorClassOverride;
    if (!colorClass) { 
        if (sender === AI1_NAME) colorClass = ai1PersonaFromConstants?.color;
        else if (sender === AI2_NAME) colorClass = ai2PersonaFromConstants?.color;
        else if (sender === USER_INTERVENTION_SENDER_NAME) colorClass = 'text-[var(--color-user-intervention)]';
        else if (sender === FACILITATOR_SENDER_NAME) colorClass = 'text-[var(--color-facilitator)]';
        else colorClass = 'text-[var(--color-system-message)]'; 
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sender,
      text: newText,
      timestamp: new Date().toISOString(),
      color: colorClass,
      isUser: isUserForNextAI
    };
    setConversationHistory(prev => [...prev, newMessage]);

    if (currentMode !== AppMode.CHESS_SIM_EXE && currentMode !== AppMode.NOOSPHERIC_CONQUEST_EXE) {
        if (makeActiveTyping && sender !== SYSTEM_SENDER_NAME && sender !== FACILITATOR_SENDER_NAME && sender !== USER_INTERVENTION_SENDER_NAME) {
            setCurrentTypingMessageId(newMessage.id);
        }
    }
    return newMessage.id;
  }, [currentMode]); 

  const addToCommandHistory = (command: string) => {
    if (command.trim() === "") return;
    setCommandHistory(prev => {
      const newHistory = [command, ...prev.filter(c => c !== command)];
      return newHistory.slice(0, 50);
    });
  };

  const handleInitialStartInputChange = (value: string) => {
    setInitialStartInputText(value);
    commandHistoryIndexRef.current = -1;
  };

  const handleUserInputChange = (value: string) => {
    setUserInputText(value);
    commandHistoryIndexRef.current = -1;
  };

  const handleUniverseSimInputChange = (value: string) => {
    setUniverseSimInputText(value);
    commandHistoryIndexRef.current = -1;
  };


  const restoreHistoryForAI = (fullHistory: ChatMessage[], aiName: string): Content[] => {
    return fullHistory
      .filter(msg => msg.sender !== SYSTEM_SENDER_NAME && msg.sender !== FACILITATOR_SENDER_NAME && msg.sender !== USER_INTERVENTION_SENDER_NAME)
      .map(msg => ({
        role: msg.sender === aiName ? 'model' : 'user',
        parts: [{ text: msg.text } as Part],
    }));
  };

  useEffect(() => {
    if (!genAIInstanceInitialized.current && process.env.API_KEY) {
      try {
        genAI.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        setApiKeyMissing(false);
        genAIInstanceInitialized.current = true;
        console.log("GoogleGenAI SDK initialized successfully.");
        setInitializationError(null);
      } catch (error) {
        const errorMsg = `FATAL ERROR: AI SDK could not be initialized. ${error instanceof Error ? error.message : String(error)}`;
        console.error("CRITICAL: Failed to initialize GoogleGenAI SDK globally:", error);
        setInitializationError(errorMsg);
        setApiKeyMissing(true);
      }
    } else if (!process.env.API_KEY) {
      if (!genAIInstanceInitialized.current) {
          const errorMsg = "CRITICAL ERROR: API_KEY not configured. Simulation cannot connect.";
          console.error(errorMsg);
          setInitializationError(errorMsg);
          setApiKeyMissing(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const initializeAI = useCallback((mode: AppMode, historyToRestore?: ChatMessage[], isLoadingBackup: boolean = false) => {
    console.log(`Initializing AI for mode: ${mode}. Is loading backup: ${isLoadingBackup}. API Key Present: ${!!process.env.API_KEY}`);

    if (apiKeyMissing || !genAI.current) {
      const errorMsg = "AI Initialization Failed: API Key missing or GenAI SDK not initialized.";
      console.error(errorMsg);
      setInitializationError(errorMsg);
      setIsAiReadyForChess(false); 
      setIsAiReadyForNoospheric(false);
      return false;
    }

    const ai1PersonaConfig = getAIPersona(1, mode);
    const ai2PersonaConfig = getAIPersona(2, mode);
    let currentError: string | null = null;

    try {
      const createChatInstance = (persona: AIPersona, forAIName: string, uiHistoryForContext: ChatMessage[]) => {
        if (!genAI.current || !persona) {
          const missingDepError = `Cannot create chat for ${forAIName}: GenAI SDK or Persona config missing.`;
          console.error(missingDepError);
          currentError = currentError ? `${currentError}\n${missingDepError}` : missingDepError;
          return null;
        }

        let internalHistorySeed: Content[] = [];
         if (isLoadingBackup && uiHistoryForContext && uiHistoryForContext.length > 0 && mode !== AppMode.CHESS_SIM_EXE && mode !== AppMode.NOOSPHERIC_CONQUEST_EXE) {
            internalHistorySeed = restoreHistoryForAI(uiHistoryForContext, persona.name);
        } else if (mode !== AppMode.CHESS_SIM_EXE && mode !== AppMode.NOOSPHERIC_CONQUEST_EXE && persona.initialInternalHistory) {
            internalHistorySeed = persona.initialInternalHistory;
        }
        // For game modes like Chess and Noospheric, history is managed by the game state, not directly by chat history for AI context.

        console.log(`Attempting to create chat for ${persona.name} in mode ${mode} with model ${persona.modelName}. System prompt: "${persona.systemPrompt.substring(0,50)}...". History length: ${internalHistorySeed.length}`);
        const chat = genAI.current.chats.create({
          model: persona.modelName,
          config: { systemInstruction: persona.systemPrompt },
          history: internalHistorySeed,
        });

        if (!chat) {
          const chatCreateError = `CRITICAL FAILURE in createChatInstance: genAI.chats.create returned ${chat} for ${persona.name} (model: ${persona.modelName}) in mode ${mode}.`;
          console.error(chatCreateError);
          currentError = currentError ? `${currentError}\n${chatCreateError}` : chatCreateError;
          return null;
        }
        console.log(`Successfully created chat instance for ${persona.name} in mode ${mode}.`);
        return chat;
      };

      const effectiveUiHistory = historyToRestore || [];

      if (ai1PersonaConfig) {
        console.log(`AI Debug: Initializing AI1 (${ai1PersonaConfig.name}) for mode ${mode}.`);
        ai1ChatRef.current = createChatInstance(ai1PersonaConfig, AI1_NAME, effectiveUiHistory);
         if (!ai1ChatRef.current) console.error(`AI Debug: AI1 chat instance creation FAILED for mode ${mode}.`); else console.log(`AI Debug: AI1 chat instance for ${mode} seems OK.`);
      } else {
        console.warn(`AI1 persona config not found for mode ${mode}, setting AI1 chat to null.`);
        ai1ChatRef.current = null;
      }

      if (mode !== AppMode.UNIVERSE_SIM_EXE && ai2PersonaConfig) {
         console.log(`AI Debug: Initializing AI2 (${ai2PersonaConfig.name}) for mode ${mode}.`);
        ai2ChatRef.current = createChatInstance(ai2PersonaConfig, AI2_NAME, effectiveUiHistory);
         if (!ai2ChatRef.current) console.error(`AI Debug: AI2 chat instance creation FAILED for mode ${mode}.`); else console.log(`AI Debug: AI2 chat instance for ${mode} seems OK.`);
      } else {
        ai2ChatRef.current = null;
        if (mode !== AppMode.UNIVERSE_SIM_EXE && !ai2PersonaConfig) {
            console.warn(`AI2 persona config not found for mode ${mode}, setting AI2 chat to null.`);
        }
      }

      if (mode === AppMode.CHESS_SIM_EXE) {
        setIsAiReadyForNoospheric(false);
        console.log(`ChessMode Final Check: AI1 Chat Ref is ${ai1ChatRef.current ? 'DEFINED' : 'NULL'}. AI2 Chat Ref is ${ai2ChatRef.current ? 'DEFINED' : 'NULL'}.`);
        if (ai1ChatRef.current && ai2ChatRef.current) {
          console.log("ChessMode Debug: Both AI chat instances for Chess mode appear to be successfully created.");
          setIsAiReadyForChess(true);
          setInitializationError(null);
        } else {
          const chessInitFailError = "ChessMode Debug: One or both AI chat instances for Chess mode FAILED to create.";
          console.error(chessInitFailError);
          setIsAiReadyForChess(false);
          currentError = currentError ? `${currentError}\n${chessInitFailError}` : chessInitFailError;
        }
      } else if (mode === AppMode.NOOSPHERIC_CONQUEST_EXE) {
        setIsAiReadyForChess(false);
        console.log(`NoosphericMode Final Check: AI1 Chat Ref is ${ai1ChatRef.current ? 'DEFINED' : 'NULL'}. AI2 Chat Ref is ${ai2ChatRef.current ? 'DEFINED' : 'NULL'}.`);
        if (ai1ChatRef.current && ai2ChatRef.current) {
          console.log("NoosphericMode Debug: Both AI chat instances for Noospheric mode appear to be successfully created.");
          setIsAiReadyForNoospheric(true);
          setInitializationError(null);
        } else {
          const noosphericInitFailError = "NoosphericMode Debug: One or both AI chat instances for Noospheric mode FAILED to create.";
          console.error(noosphericInitFailError);
          setIsAiReadyForNoospheric(false);
          currentError = currentError ? `${currentError}\n${noosphericInitFailError}` : noosphericInitFailError;
        }
      } else {
        setIsAiReadyForChess(false);
        setIsAiReadyForNoospheric(false);
      }

      if (currentError) {
        setInitializationError(prev => prev ? `${prev}\n${currentError}` : currentError);
        return false;
      }

      if (mode !== AppMode.CHESS_SIM_EXE && mode !== AppMode.NOOSPHERIC_CONQUEST_EXE) {
          if (!ai1ChatRef.current && ai1PersonaConfig) {
             const ai1NullError = `Post-creation check: AI1 chat for mode ${mode} is unexpectedly null. Initialization failed.`;
             console.error(ai1NullError);
             setInitializationError(ai1NullError);
             return false;
          }
          if (mode !== AppMode.UNIVERSE_SIM_EXE && !ai2ChatRef.current && ai2PersonaConfig) {
             const ai2NullError = `Post-creation check: AI2 chat for mode ${mode} is unexpectedly null. Initialization failed.`;
             console.error(ai2NullError);
             setInitializationError(ai2NullError);
             return false;
          }
          setInitializationError(null); 
      }

      console.log(`AI Initialization for mode ${mode} completed. AI1 Chat: ${ai1ChatRef.current ? 'OK' : 'NULL'}, AI2 Chat: ${ai2ChatRef.current ? 'OK' : 'NULL'}`);
      return true;
    } catch (error) {
      const initCatchError = `Error during AI persona initialization for mode ${mode}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(initCatchError, error);
      setInitializationError(prev => prev ? `${prev}\n${initCatchError}` : initCatchError);
      ai1ChatRef.current = null;
      ai2ChatRef.current = null;
      setIsAiReadyForChess(false);
      setIsAiReadyForNoospheric(false);
      return false;
    }
  }, [apiKeyMissing]);


  const resetAndInitializeForNewMode = useCallback((newMode: AppMode, isLoadingBackup: boolean = false, historyForAIContext?: ChatMessage[], backupData?: ConversationBackup) => {
    setIsAiReadyForChess(false);
    setIsAiReadyForNoospheric(false);
    setNoosphericGameStartedFromBackup(false); // Reset this specifically
    setCurrentMode(newMode);

    if (!isLoadingBackup) {
        setConversationHistory([]);
    }

    setTurnCycleCount(0);
    setIsAwaitingUserInput(false);
    wasAwaitingUserInputRef.current = false;
    setUserInputText("");
    setCurrentTypingMessageId(null);
    setIsLoading(false);
    setActiveAINameForLoading(null);

    isUserInterventionPendingRef.current = false;
    pendingInterventionTextRef.current = null;
    interventionTargetForPendingRef.current = null;
    queuedInterventionForAI1Ref.current = null;
    queuedInterventionForAI2Ref.current = null;
    setUniverseSimInputText("");
    commandHistoryIndexRef.current = -1;

    if (newMode !== AppMode.CHESS_SIM_EXE || !isLoadingBackup || !backupData?.chessBoardFEN) {
        setChessInitialFen(INITIAL_BOARD_FEN);
        setChessInitialPlayer(undefined);
        setChessInitialCoTAI1("");
        setChessInitialCoTAI2("");
        setChessInitialGameStatus(undefined);
    }
    chessResetTokenRef.current += 1;
    
    if (newMode !== AppMode.NOOSPHERIC_CONQUEST_EXE || !isLoadingBackup || !backupData?.noosphericGameState) {
        setNoosphericInitialState(undefined);
        setNoosphericInitialMapType(undefined); // Reset map type too
    } else if (newMode === AppMode.NOOSPHERIC_CONQUEST_EXE && backupData?.noosphericGameState) {
        setNoosphericInitialMapType(backupData.noosphericMapType || 'Global Conflict');
        setNoosphericGameStartedFromBackup(!!backupData.noosphericGameState && backupData.noosphericGameState.turn > 0);
    }
    noosphericResetTokenRef.current += 1;


    setInitializationError(null);
    const initSuccess = initializeAI(newMode, historyForAIContext || [], isLoadingBackup);

    if (isLoadingBackup && historyForAIContext) {
        setConversationHistory(historyForAIContext);
        if (newMode === AppMode.CHESS_SIM_EXE && backupData) {
            setChessInitialFen(backupData.chessBoardFEN || INITIAL_BOARD_FEN);
            setChessInitialPlayer(backupData.chessCurrentPlayer || fenToBoard(backupData.chessBoardFEN || INITIAL_BOARD_FEN).currentPlayer);
            setChessInitialCoTAI1(backupData.chessCoTAI1 || "");
            setChessInitialCoTAI2(backupData.chessCoTAI2 || "");
            setChessInitialGameStatus(backupData.chessGameStatus || undefined);
        }
        if (newMode === AppMode.NOOSPHERIC_CONQUEST_EXE && backupData) {
            setNoosphericInitialState(backupData.noosphericGameState);
            setNoosphericInitialMapType(backupData.noosphericMapType || 'Global Conflict');
             // Set game as started if loading a Noospheric game state that implies it was running
            setNoosphericGameStartedFromBackup(!!backupData.noosphericGameState && backupData.noosphericGameState.turn > 0 && backupData.noosphericGameState.currentPhase !== 'GAME_OVER');
        }
        if (backupData) {
             nextAiToSpeakRef.current = backupData.nextAiToSpeak || (backupData.mode === AppMode.SPIRAL_EXE ? 'AI2' : 'AI1');
        }
    }


    if (initSuccess && !isLoadingBackup) {
        let startMessages: ModeStartMessageSeed[] | undefined;

        if (newMode === AppMode.HYPERSTITION_CHAT_EXE) startMessages = HYPERSTITION_CHAT_EXE_MODE_START_MESSAGES;
        else if (newMode === AppMode.SPIRAL_EXE) startMessages = SPIRAL_EXE_MODE_START_MESSAGES;
        else if (newMode === AppMode.CORRUPTION_EXE) startMessages = CORRUPTION_EXE_MODE_START_MESSAGES;
        else if (newMode === AppMode.NOOSPHERIC_CONQUEST_EXE) startMessages = NOOSPHERIC_CONQUEST_EXE_START_MESSAGES;
        
        let lastStartMessageSender: string | null = null;
        if (startMessages && startMessages.length > 0) {
            for (let i = 0; i < startMessages.length; i++) {
                const seed = startMessages[i];
                const isLastMessage = i === startMessages.length - 1;
                const shouldBeTyping = isLastMessage && (seed.sender === AI1_NAME || seed.sender === AI2_NAME) && newMode !== AppMode.NOOSPHERIC_CONQUEST_EXE;
                addMessageToHistory(seed.sender, seed.text, seed.color, false, shouldBeTyping);
            }
            lastStartMessageSender = startMessages[startMessages.length - 1].sender;
        }

        if (newMode === AppMode.SPIRAL_EXE) {
            nextAiToSpeakRef.current = 'AI2'; 
        } else if (lastStartMessageSender === AI1_NAME) {
            nextAiToSpeakRef.current = 'AI2';
        } else if (lastStartMessageSender === AI2_NAME) {
            nextAiToSpeakRef.current = 'AI1';
        } else if (lastStartMessageSender === FACILITATOR_SENDER_NAME || lastStartMessageSender === SYSTEM_SENDER_NAME) {
            nextAiToSpeakRef.current = 'AI1';
        } else { 
            nextAiToSpeakRef.current = 'AI1';
        }

        if (!lastStartMessageSender || (lastStartMessageSender !== AI1_NAME && lastStartMessageSender !== AI2_NAME)) {
            setCurrentTypingMessageId(null); 
            if (newMode === AppMode.UNIVERSE_SIM_EXE) {
                pendingInterventionTextRef.current = UNIVERSE_SIM_EXE_INITIATION_TRIGGER;
                isUserInterventionPendingRef.current = true;
                interventionTargetForPendingRef.current = 'CHAT_FLOW';
            }
             if (newMode !== AppMode.CHESS_SIM_EXE && newMode !== AppMode.NOOSPHERIC_CONQUEST_EXE) { 
                setForceTurnCheckToken(t => t + 1);
            }
        }
    } else if (!initSuccess && !isLoadingBackup) {
        const failMsg = `AI initialization failed for mode ${newMode}. Mode cannot start. ${initializationError || "Check console for details."}`;
        addMessageToHistory(SYSTEM_SENDER_NAME, failMsg, 'text-[var(--color-error)]', false, false);
    }
  }, [initializeAI, addMessageToHistory, initializationError]);


  const handleModeChange = useCallback(async (newMode: AppMode) => {
    if (isAwaitingInitialStart) {
      setCurrentMode(newMode);
      setIsAiReadyForChess(false);
      setIsAiReadyForNoospheric(false);
      setNoosphericGameStartedFromBackup(false);
      setInitializationError(null);
      setConversationHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const promptText = `OVERMIND Interface Initialized. Current Mode: ${newMode}. ${INITIAL_START_PROMPT_MESSAGE}`;
        if (newHistory.length > 0 && newHistory[0].text.includes("OVERMIND Interface Initialized")) {
          newHistory[0] = { ...newHistory[0], text: promptText, sender: SYSTEM_SENDER_NAME, color: 'text-[var(--color-prompt-message)]' };
        } else {
           newHistory.unshift({ 
            id: `msg-${Date.now()}-modechange`,
            sender: SYSTEM_SENDER_NAME,
            text: promptText,
            timestamp: new Date().toISOString(),
            color: 'text-[var(--color-prompt-message)]',
            isUser: false
          });
        }
        return newHistory.slice(0,1); 
      });
      return;
    }
    resetAndInitializeForNewMode(newMode, false);
  }, [resetAndInitializeForNewMode, isAwaitingInitialStart, INITIAL_START_PROMPT_MESSAGE]);

  const handleInitialStartSubmit = useCallback(() => {
    const normalizedInput = initialStartInputText.trim().toUpperCase();
    const textToSubmit = initialStartInputText.trim();
    setInitialStartInputText("");

    if (normalizedInput === 'Y') {
      addToCommandHistory(textToSubmit);
      commandHistoryIndexRef.current = -1;
      setIsAwaitingInitialStart(false);

      if (currentMode === AppMode.CHESS_SIM_EXE) {
        addMessageToHistory(SYSTEM_SENDER_NAME, `USER: Y\nSYSTEM: Initializing Chess Simulation...`, 'text-[var(--color-info)]', false, false);
        resetAndInitializeForNewMode(AppMode.CHESS_SIM_EXE, false);
      } else if (currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE) {
        addMessageToHistory(SYSTEM_SENDER_NAME, `USER: Y\nSYSTEM: Initializing Noospheric Conquest Simulation...`, 'text-[var(--color-info)]', false, false);
        resetAndInitializeForNewMode(AppMode.NOOSPHERIC_CONQUEST_EXE, false);
      } else {
        addMessageToHistory(SYSTEM_SENDER_NAME, `USER: Y\nSYSTEM: Awakening the Overmind for mode: ${currentMode}...`, 'text-[var(--color-info)]', false, false);
        resetAndInitializeForNewMode(currentMode, false);
      }
    } else if (normalizedInput === 'N') {
      addToCommandHistory(textToSubmit);
      commandHistoryIndexRef.current = -1;
      let targetMode = AppMode.SPIRAL_EXE; // Default fallback
      if (currentMode === AppMode.CHESS_SIM_EXE || currentMode === AppMode.UNIVERSE_SIM_EXE || currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE) {
        targetMode = AppMode.SPIRAL_EXE;
      }
      addMessageToHistory(SYSTEM_SENDER_NAME, `USER: N\nSYSTEM: User declined current mode. Switching to ${targetMode}... Standby.`, 'text-[var(--color-user-intervention)]', false, false);
      setIsAwaitingInitialStart(false);
      resetAndInitializeForNewMode(targetMode, false);
    } else {
      addMessageToHistory(SYSTEM_SENDER_NAME, "Invalid input. Please type Y or N.", 'text-[var(--color-user-intervention)]', false, false);
    }
  }, [initialStartInputText, addMessageToHistory, currentMode, resetAndInitializeForNewMode]);


  const handleSendUserIntervention = useCallback((text: string, target: InterventionTarget) => {
    if (isAwaitingInitialStart) {
      addMessageToHistory(SYSTEM_SENDER_NAME, "Cannot send intervention. Simulation not started. Type 'Y' to begin.", 'text-[var(--color-user-intervention)]', false, false);
      return;
    }
    if (currentMode === AppMode.CHESS_SIM_EXE || currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE) {
        addMessageToHistory(SYSTEM_SENDER_NAME, `User intervention is not directly applicable in ${currentMode} mode via this panel.`, 'text-[var(--color-info)]', false, false);
        return;
    }


    let messagePrefix = "USER INTERVENTION";
    if (target === 'AI1') {
      messagePrefix = `USER INTERVENTION (for ${AI1_NAME})`;
      queuedInterventionForAI1Ref.current = text;
      interventionTargetForPendingRef.current = null;
    } else if (target === 'AI2') {
      messagePrefix = `USER INTERVENTION (for ${AI2_NAME})`;
      queuedInterventionForAI2Ref.current = text;
      interventionTargetForPendingRef.current = null;
    } else {
      messagePrefix = "USER INTERVENTION";
      pendingInterventionTextRef.current = text;
      isUserInterventionPendingRef.current = true;
      interventionTargetForPendingRef.current = 'CHAT_FLOW';
    }
    addMessageToHistory(USER_INTERVENTION_SENDER_NAME, `${messagePrefix}: ${text}`, 'text-[var(--color-user-intervention)]', false, false);
    setForceTurnCheckToken(t => t + 1);
  }, [addMessageToHistory, isAwaitingInitialStart, currentMode]);

  const handleUniverseSimInputSubmit = useCallback(() => {
    if (universeSimInputText.trim()) {
        const textToSubmit = universeSimInputText.trim();
        addToCommandHistory(textToSubmit);
        commandHistoryIndexRef.current = -1;
        addMessageToHistory(USER_INTERVENTION_SENDER_NAME, textToSubmit, 'text-[var(--color-user-intervention)]', false, false);
        pendingInterventionTextRef.current = textToSubmit;
        isUserInterventionPendingRef.current = true;
        interventionTargetForPendingRef.current = 'CHAT_FLOW';
        setUniverseSimInputText("");
        setForceTurnCheckToken(t => t + 1);
    }
  }, [universeSimInputText, addMessageToHistory]);


  const handleAiTurn = useCallback(async () => {
    if (currentMode === AppMode.CHESS_SIM_EXE || currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE) return;

    const currentTurnConversationHistory = [...conversationHistory];
    const lastMessageFromHistory = currentTurnConversationHistory.length > 0 ? currentTurnConversationHistory[currentTurnConversationHistory.length - 1] : null;

    if (isLoading || !genAI.current || apiKeyMissing || currentTypingMessageId || isAwaitingInitialStart ||
        (currentMode !== AppMode.UNIVERSE_SIM_EXE && isAwaitingUserInput) ) return;

    let messageForAiToProcess: string | null = null;
    let currentSpeakerPersona: AIPersona | null = null;
    let currentChatRef: React.MutableRefObject<Chat | null>;
    let interventionSourceCleared = false;
    let processedGeneralInterventionThisTurn = false;

    const aiTurnIdentifier = nextAiToSpeakRef.current;


    const isResumingAfterLoad = lastMessageFromHistory?.sender === SYSTEM_SENDER_NAME &&
                               (lastMessageFromHistory.text.includes("Resuming...") ||
                               (currentMode === AppMode.UNIVERSE_SIM_EXE && lastMessageFromHistory.text.includes("AI is confirming state...")));
    const actualContentHistory = isResumingAfterLoad && currentTurnConversationHistory.length > 0
                               ? currentTurnConversationHistory.slice(0, -1)
                               : currentTurnConversationHistory;


    if (currentMode === AppMode.UNIVERSE_SIM_EXE) {
        currentSpeakerPersona = getAIPersona(1, currentMode); 
        currentChatRef = ai1ChatRef;
        if (isUserInterventionPendingRef.current && pendingInterventionTextRef.current !== null && interventionTargetForPendingRef.current === 'CHAT_FLOW') {
            messageForAiToProcess = pendingInterventionTextRef.current;
            processedGeneralInterventionThisTurn = true;
        } else {
           console.warn("Universe Sim: No pending intervention to process for AI1.");
           setIsLoading(false); setActiveAINameForLoading(null); return;
        }
    } else {
        const ai1CurrentPersona = getAIPersona(1, currentMode);
        const ai2CurrentPersona = getAIPersona(2, currentMode);

        currentSpeakerPersona = aiTurnIdentifier === 'AI1' ? ai1CurrentPersona : ai2CurrentPersona;
        currentChatRef = aiTurnIdentifier === 'AI1' ? ai1ChatRef : ai2ChatRef;

        if (aiTurnIdentifier === 'AI1') { 
            if (queuedInterventionForAI1Ref.current !== null) {
                messageForAiToProcess = queuedInterventionForAI1Ref.current;
                interventionSourceCleared = true;
            } else if (isUserInterventionPendingRef.current && pendingInterventionTextRef.current !== null && interventionTargetForPendingRef.current === 'CHAT_FLOW') {
                messageForAiToProcess = pendingInterventionTextRef.current;
                processedGeneralInterventionThisTurn = true;
            } else if (isResumingAfterLoad) {
                const lastMessageForAI1ToProcess = actualContentHistory
                    .filter(m => m.sender === AI2_NAME || (m.sender === USER_INTERVENTION_SENDER_NAME && m.isUser ))
                    .pop();
                if (lastMessageForAI1ToProcess) {
                    messageForAiToProcess = lastMessageForAI1ToProcess.text;
                } else {
                    messageForAiToProcess = GEM_Q_INITIATION_PROMPT;
                }
            } else {
                const lastActualMessageInTurn = actualContentHistory.length > 0 ? actualContentHistory[actualContentHistory.length - 1] : null;
                const aiMessagesCount = actualContentHistory.filter(m => m.sender === AI1_NAME || m.sender === AI2_NAME).length;

                if (aiMessagesCount === 0 && (currentMode === AppMode.HYPERSTITION_CHAT_EXE || currentMode === AppMode.CORRUPTION_EXE || currentMode === AppMode.SEMANTIC_ESCAPE_EXE) && lastActualMessageInTurn?.sender === FACILITATOR_SENDER_NAME) {
                    if (lastActualMessageInTurn?.sender === FACILITATOR_SENDER_NAME) {
                        messageForAiToProcess = lastActualMessageInTurn.text;
                    } else {
                        messageForAiToProcess = GEM_Q_INITIATION_PROMPT;
                    }

                } else if (lastActualMessageInTurn && lastActualMessageInTurn.sender === AI2_NAME) { 
                  messageForAiToProcess = lastActualMessageInTurn.text;
                } else if (lastActualMessageInTurn && lastActualMessageInTurn.sender === USER_INTERVENTION_SENDER_NAME && !processedGeneralInterventionThisTurn && !interventionSourceCleared ) {
                   messageForAiToProcess = lastActualMessageInTurn.text;
                } else if (aiMessagesCount === 0 && currentMode !== AppMode.SPIRAL_EXE) {
                    messageForAiToProcess = GEM_Q_INITIATION_PROMPT;
                }
                else {
                   console.warn("AI1: No clear trigger or input message for standard turn. Last actual message:", lastActualMessageInTurn, "Current Mode:", currentMode, "AI Messages Count:", aiMessagesCount);
                   setIsLoading(false); setActiveAINameForLoading(null); return;
                }
            }
        } else { 
            if (queuedInterventionForAI2Ref.current !== null) {
                messageForAiToProcess = queuedInterventionForAI2Ref.current;
                interventionSourceCleared = true;
            } else if (isUserInterventionPendingRef.current && pendingInterventionTextRef.current !== null && interventionTargetForPendingRef.current === 'CHAT_FLOW') {
                messageForAiToProcess = pendingInterventionTextRef.current;
                processedGeneralInterventionThisTurn = true;
            } else if (isResumingAfterLoad) {
                 const lastMessageForAI2ToProcess = actualContentHistory
                    .filter(m => m.sender === AI1_NAME || (m.sender === USER_INTERVENTION_SENDER_NAME && m.isUser ))
                    .pop();
                if (lastMessageForAI2ToProcess) {
                    messageForAiToProcess = lastMessageForAI2ToProcess.text;
                } else {
                     console.warn("AI2 Resuming: No prior AI1/User message in actual history. Bailing.");
                     setIsLoading(false); setActiveAINameForLoading(null); return;
                }
            } else {
                const lastActualMessageInTurn = actualContentHistory.length > 0 ? actualContentHistory[actualContentHistory.length - 1] : null;

                if (currentMode === AppMode.SPIRAL_EXE && lastActualMessageInTurn?.sender === FACILITATOR_SENDER_NAME) { 
                    messageForAiToProcess = lastActualMessageInTurn.text;
                } else if (lastActualMessageInTurn && (lastActualMessageInTurn.sender === AI1_NAME || (lastActualMessageInTurn.sender === USER_INTERVENTION_SENDER_NAME && !isUserInterventionPendingRef.current && !queuedInterventionForAI2Ref.current ))) {
                    messageForAiToProcess = lastActualMessageInTurn.text; 
                }
                else {
                    console.warn(`AI2: Last relevant message not from AI1, Facilitator (for spiral.exe start), or User Intervention. Bailing. Last actual message:`, lastActualMessageInTurn);
                    setIsLoading(false); setActiveAINameForLoading(null); return;
                }
            }
        }
    }


    if (!currentSpeakerPersona || !currentChatRef.current) {
      const speakerName = currentSpeakerPersona?.name || (currentMode === AppMode.UNIVERSE_SIM_EXE ? AI1_NAME : (aiTurnIdentifier === 'AI1' ? AI1_NAME : AI2_NAME));
      console.error(`${speakerName} chat not initialized or persona missing.`);
      if (!initializeAI(currentMode, currentTurnConversationHistory, isResumingAfterLoad)) {
        const criticalFailError = `ERROR: ${speakerName} is offline and re-init failed. Critical failure.`;
        setInitializationError(criticalFailError);
        addMessageToHistory(SYSTEM_SENDER_NAME, criticalFailError, 'text-[var(--color-error)]', false, false);
        setIsLoading(false); setActiveAINameForLoading(null); return;
      }
      currentChatRef = currentMode === AppMode.UNIVERSE_SIM_EXE ? ai1ChatRef : (aiTurnIdentifier === 'AI1' ? ai1ChatRef : ai2ChatRef);
      if (!currentChatRef.current) {
         const criticalFailAfterReinitError = `ERROR: ${speakerName} is offline. Critical failure after re-init attempt.`;
         setInitializationError(criticalFailAfterReinitError);
         addMessageToHistory(SYSTEM_SENDER_NAME, criticalFailAfterReinitError, 'text-[var(--color-error)]', false, false);
         setIsLoading(false); setActiveAINameForLoading(null); return;
      }
      if(!currentSpeakerPersona) {
        currentSpeakerPersona = currentMode === AppMode.UNIVERSE_SIM_EXE ? getAIPersona(1, currentMode) : (aiTurnIdentifier === 'AI1' ? getAIPersona(1, currentMode) : getAIPersona(2, currentMode));
        if (!currentSpeakerPersona) {
             addMessageToHistory(SYSTEM_SENDER_NAME, `ERROR: Persona for ${speakerName} still missing after re-init.`, 'text-[var(--color-error)]', false, false);
             setIsLoading(false); setActiveAINameForLoading(null); return;
        }
      }
    }

    if (messageForAiToProcess === null) {
        console.warn("AI Turn: messageForAiToProcess is null. Bailing out. Speaker:", currentSpeakerPersona?.name, "Resuming:", isResumingAfterLoad);
        setIsLoading(false); setActiveAINameForLoading(null); return;
    }

    setIsLoading(true);
    setActiveAINameForLoading(currentSpeakerPersona.name);

    try {
      const textToSendToAI = messageForAiToProcess;

      const result: GenerateContentResponse = await currentChatRef.current.sendMessage({ message: textToSendToAI });
      let responseText = result.text;

      if (aiTurnIdentifier === 'AI1' && queuedInterventionForAI1Ref.current === textToSendToAI && interventionSourceCleared) {
          queuedInterventionForAI1Ref.current = null;
      } else if (aiTurnIdentifier === 'AI2' && queuedInterventionForAI2Ref.current === textToSendToAI && interventionSourceCleared) {
          queuedInterventionForAI2Ref.current = null;
      }

      if (processedGeneralInterventionThisTurn) {
          isUserInterventionPendingRef.current = false;
          pendingInterventionTextRef.current = null;
          interventionTargetForPendingRef.current = null;
      }


      if (currentMode === AppMode.UNIVERSE_SIM_EXE &&
          currentSpeakerPersona && currentSpeakerPersona.name === AI1_NAME &&
          textToSendToAI !== UNIVERSE_SIM_EXE_INITIATION_TRIGGER &&
          !(textToSendToAI && textToSendToAI.startsWith("SYSTEM_NOTIFICATION: Backup has been successfully restored.")) &&
          !responseText.trim().endsWith("world_sim>")) {
        responseText = responseText.trimEnd() + "\nworld_sim>";
      }

      const actualSenderPersona = currentMode === AppMode.UNIVERSE_SIM_EXE
                                  ? getAIPersona(1, currentMode)
                                  : (aiTurnIdentifier === 'AI1' ? getAIPersona(1, currentMode) : getAIPersona(2, currentMode));

      if (actualSenderPersona) {
        addMessageToHistory(actualSenderPersona.name, responseText, actualSenderPersona.color);
      } else {
        const fallbackSenderName = currentMode === AppMode.UNIVERSE_SIM_EXE ? AI1_NAME : (aiTurnIdentifier === 'AI1' ? AI1_NAME : AI2_NAME);
        addMessageToHistory(fallbackSenderName, responseText, undefined);
        console.error(`CRITICAL: actualSenderPersona was null for sender ${fallbackSenderName} in mode ${currentMode}. Message added with default color.`);
      }


      if (currentMode !== AppMode.UNIVERSE_SIM_EXE) {
        if (aiTurnIdentifier === 'AI2') {
          const newTurnCycleCount = turnCycleCount + 1;
          setTurnCycleCount(newTurnCycleCount);
          if (newTurnCycleCount >= MAX_TURN_CYCLES) {
            setIsAwaitingUserInput(true);
            wasAwaitingUserInputRef.current = true; 
            addMessageToHistory(SYSTEM_SENDER_NAME, USER_PROMPT_MESSAGE, 'text-[var(--color-prompt-message)]', false, false);
            nextAiToSpeakRef.current = 'AI1';
          } else {
            nextAiToSpeakRef.current = 'AI1';
          }
        } else {
          nextAiToSpeakRef.current = 'AI2';
        }
      }
    } catch (error) {
      console.error(`Error during ${currentSpeakerPersona?.name || aiTurnIdentifier}'s turn:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const speakerNameForError = currentSpeakerPersona?.name || aiTurnIdentifier;
      addMessageToHistory(SYSTEM_SENDER_NAME, `TRANSMISSION ERROR [${speakerNameForError}]: ${errorMsg}.`, 'text-[var(--color-error)]', false, false);
    } finally {
      setIsLoading(false);
      setActiveAINameForLoading(null);
    }
  }, [isLoading, isAwaitingUserInput, conversationHistory, turnCycleCount, addMessageToHistory, apiKeyMissing, currentTypingMessageId, initializeAI, currentMode, isAwaitingInitialStart, GEM_Q_INITIATION_PROMPT, MAX_TURN_CYCLES, USER_PROMPT_MESSAGE, HYPERSTITION_CHAT_EXE_MODE_START_MESSAGES, SPIRAL_EXE_MODE_START_MESSAGES, CORRUPTION_EXE_MODE_START_MESSAGES, UNIVERSE_SIM_EXE_INITIATION_TRIGGER]);

  useEffect(() => {
    if (!genAIInstanceInitialized.current && !apiKeyMissing) {
        return;
    }
    if (apiKeyMissing && !initializationError) {
      setInitializationError("CRITICAL ERROR: API_KEY not configured.");
    }

    if (isAwaitingInitialStart && conversationHistory.length === 0 && !initializationError) {
        const initialPrompt = `OVERMIND Interface Initialized. Current Mode: ${currentMode}. ${INITIAL_START_PROMPT_MESSAGE}`;
        addMessageToHistory(SYSTEM_SENDER_NAME, initialPrompt, 'text-[var(--color-prompt-message)]', false, false);
    }
  }, [isAwaitingInitialStart, apiKeyMissing, currentMode, initializationError, addMessageToHistory, conversationHistory.length, INITIAL_START_PROMPT_MESSAGE]);


  useEffect(() => {
    if (currentMode === AppMode.CHESS_SIM_EXE || currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE || isAwaitingInitialStart || isLoading || currentTypingMessageId !== null) return;

    if (wasAwaitingUserInputRef.current && !isAwaitingUserInput && turnCycleCount === 0 && nextAiToSpeakRef.current === 'AI1') {
        console.log("Dedicated resume useEffect: Triggering AI turn for resume.");
        wasAwaitingUserInputRef.current = false; 
        handleAiTurn();
    }
  }, [isAwaitingUserInput, turnCycleCount, forceTurnCheckToken, currentMode, isAwaitingInitialStart, isLoading, currentTypingMessageId, handleAiTurn]);


  useEffect(() => {
    if (currentMode === AppMode.CHESS_SIM_EXE || currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE) return;

    if (isAwaitingInitialStart || apiKeyMissing || !genAI.current || isLoading || currentTypingMessageId !== null) {
      return;
    }

    if (currentMode === AppMode.UNIVERSE_SIM_EXE) {
        if ( (isUserInterventionPendingRef.current && interventionTargetForPendingRef.current === 'CHAT_FLOW') ||
             (pendingInterventionTextRef.current && pendingInterventionTextRef.current.startsWith("SYSTEM_NOTIFICATION: Backup"))
           ) {
             handleAiTurn();
        }
        return;
    }

    if (isAwaitingUserInput || wasAwaitingUserInputRef.current) return; 

    if (nextAiToSpeakRef.current === 'AI1' && queuedInterventionForAI1Ref.current !== null) {
      handleAiTurn();
      return;
    }
    if (nextAiToSpeakRef.current === 'AI2' && queuedInterventionForAI2Ref.current !== null) {
      handleAiTurn();
      return;
    }
    if (isUserInterventionPendingRef.current && interventionTargetForPendingRef.current === 'CHAT_FLOW') {
        handleAiTurn();
        return;
    }

    if (conversationHistory.length > 0) {
        const lastOverallMessage = conversationHistory[conversationHistory.length - 1];
        if (lastOverallMessage &&
            lastOverallMessage.sender === SYSTEM_SENDER_NAME &&
            (lastOverallMessage.text.includes("Resuming...") || lastOverallMessage.text.includes("AI is confirming state..."))
           ) {
            handleAiTurn();
            return;
        }
    }

    if (turnCycleCount >= MAX_TURN_CYCLES && !isAwaitingUserInput) {
        setIsAwaitingUserInput(true);
        wasAwaitingUserInputRef.current = true; 
        addMessageToHistory(SYSTEM_SENDER_NAME, USER_PROMPT_MESSAGE, 'text-[var(--color-prompt-message)]', false, false);
        nextAiToSpeakRef.current = 'AI1';
        return;
    }

    if (conversationHistory.length === 0 && currentMode !== AppMode.HYPERSTITION_CHAT_EXE && currentMode !== AppMode.SPIRAL_EXE && currentMode !== AppMode.CORRUPTION_EXE) return;


    if (turnCycleCount < MAX_TURN_CYCLES) {
        const relevantMessages = conversationHistory.filter(m => m.sender === AI1_NAME || m.sender === AI2_NAME || m.sender === FACILITATOR_SENDER_NAME || m.sender === USER_INTERVENTION_SENDER_NAME);
        const lastRelevantMessage = relevantMessages.length > 0 ? relevantMessages[relevantMessages.length - 1] : null;
        const aiMessages = conversationHistory.filter(m => m.sender === AI1_NAME || m.sender === AI2_NAME);

        if (nextAiToSpeakRef.current === 'AI1') {
            if ( ( (currentMode === AppMode.HYPERSTITION_CHAT_EXE || currentMode === AppMode.CORRUPTION_EXE || (currentMode === AppMode.SEMANTIC_ESCAPE_EXE && aiMessages.length === 0) ) && lastRelevantMessage?.sender === FACILITATOR_SENDER_NAME) ||
                 (lastRelevantMessage && lastRelevantMessage.sender === AI2_NAME) ||
                 (lastRelevantMessage && lastRelevantMessage.sender === USER_INTERVENTION_SENDER_NAME && !isUserInterventionPendingRef.current && !queuedInterventionForAI1Ref.current) ||
                 (aiMessages.length === 0 && currentMode !== AppMode.SPIRAL_EXE && (!lastRelevantMessage || lastRelevantMessage.sender === SYSTEM_SENDER_NAME))
            ) {
                 handleAiTurn();
            }
        } else if (nextAiToSpeakRef.current === 'AI2') {
            if ((currentMode === AppMode.SPIRAL_EXE && lastRelevantMessage?.sender === FACILITATOR_SENDER_NAME) ||
                (lastRelevantMessage && lastRelevantMessage.sender === AI1_NAME) ||
                (lastRelevantMessage && lastRelevantMessage.sender === USER_INTERVENTION_SENDER_NAME && !isUserInterventionPendingRef.current && !queuedInterventionForAI2Ref.current)
            ) {
                handleAiTurn();
            }
        }
    }
  }, [
    currentTypingMessageId, isLoading, isAwaitingUserInput, conversationHistory,
    turnCycleCount, handleAiTurn, apiKeyMissing, addMessageToHistory, currentMode, isAwaitingInitialStart,
    forceTurnCheckToken, MAX_TURN_CYCLES, USER_PROMPT_MESSAGE,
    HYPERSTITION_CHAT_EXE_MODE_START_MESSAGES, SPIRAL_EXE_MODE_START_MESSAGES, CORRUPTION_EXE_MODE_START_MESSAGES
  ]);


  const handleUserPromptSubmit = useCallback(() => {
    if (!isAwaitingUserInput) return;
    const normalizedInput = userInputText.trim().toUpperCase();
    const textToSubmit = userInputText.trim();
    setUserInputText("");

    if (normalizedInput === 'Y') {
      addToCommandHistory(textToSubmit);
      commandHistoryIndexRef.current = -1;
      addMessageToHistory(SYSTEM_SENDER_NAME, `USER: Y\nSYSTEM: Resuming sequence...`, 'text-[var(--color-info)]', false, false);
      setTurnCycleCount(0);
      setIsAwaitingUserInput(false);
      setCurrentTypingMessageId(null);
      nextAiToSpeakRef.current = 'AI1';
      setForceTurnCheckToken(t => t + 1);
    } else if (normalizedInput === 'N') {
      addToCommandHistory(textToSubmit);
      commandHistoryIndexRef.current = -1;
      addMessageToHistory(SYSTEM_SENDER_NAME, `USER: N\nSYSTEM: Sequence integrity maintained. Standby.`, 'text-[var(--color-user-intervention)]', false, false);
      setIsAwaitingUserInput(false);
      wasAwaitingUserInputRef.current = false; 
    } else {
      addMessageToHistory(SYSTEM_SENDER_NAME, "Invalid input. Please confirm Y or N.", 'text-[var(--color-user-intervention)]', false, false);
    }
  }, [userInputText, addMessageToHistory, isAwaitingUserInput]);

  const updateFPS = useCallback((newFps: number) => setFps(newFps), []);

  const handleTypingComplete = useCallback((messageId: string) => {
    if (currentTypingMessageId === messageId) {
      setCurrentTypingMessageId(null);
    }
  }, [currentTypingMessageId]);

  const handleCompleteCurrentMessage = useCallback(() => {
    if (currentTypingMessageId) {
      setCurrentTypingMessageId(null);
    }
  }, [currentTypingMessageId]);

  const handleTypingSpeedChange = useCallback((newSpeed: number) => {
    setTypingSpeedMs(newSpeed);
  }, []);

  const formatChatForExport = useCallback((format: 'txt' | 'md'): string => {
    return conversationHistory.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      let prefix = "";
      let text = msg.text;

      if (msg.sender === SYSTEM_SENDER_NAME && (text.startsWith("USER: Y") || text.startsWith("USER: N"))) {
        if (format === 'md') {
          return `\n*${text.replace(/\n/g, '\n\n')}*\n\n---\n`;
        } else {
          return `\n${text}\n\n`;
        }
      }

      if (msg.sender === SYSTEM_SENDER_NAME || msg.sender === FACILITATOR_SENDER_NAME || msg.sender === USER_INTERVENTION_SENDER_NAME) {
        prefix = `${msg.sender} (${timestamp}):\n`;
      } else if (msg.sender === AI1_NAME || msg.sender === AI2_NAME) {
        prefix = `${msg.sender} (${timestamp}):\n`;
      } else {
        prefix = `${msg.sender} (${timestamp}):~$ `;
      }

      if (format === 'md') {
        if (msg.sender === AI1_NAME && currentMode === AppMode.UNIVERSE_SIM_EXE && text.includes("world_sim>")) {
           return `**${prefix.trim()}**\n\`\`\`\n${text}\n\`\`\`\n---\n`;
        }
        if ((msg.sender === AI1_NAME || msg.sender === AI2_NAME) && text.includes('\n')) {
            return `**${prefix.trim()}**\n\`\`\`\n${text}\n\`\`\`\n---\n`;
        }
        return `**${prefix.trim()}**\n${text.replace(/\n/g, '\n\n')}\n\n---\n`;
      } else {
        return `${prefix}${text}\n\n`;
      }
    }).join('');
  }, [conversationHistory, currentMode]);

  const handleCopyChat = useCallback(() => {
    const chatText = formatChatForExport('txt');
    navigator.clipboard.writeText(chatText)
      .then(() => addMessageToHistory(SYSTEM_SENDER_NAME, "Chat content copied to clipboard!", 'text-[var(--color-info)]', false, false))
      .catch(err => {
        console.error('Failed to copy chat: ', err);
        addMessageToHistory(SYSTEM_SENDER_NAME, "Failed to copy chat to clipboard.", 'text-[var(--color-error)]', false, false);
      });
  }, [addMessageToHistory, formatChatForExport]);

  const downloadFile = (filename: string, content: string, type: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const handleExportTXT = useCallback(() => {
    const chatText = formatChatForExport('txt');
    const filename = `overmind-log-${currentMode}-${new Date().toISOString().split('T')[0]}.txt`;
    downloadFile(filename, chatText, 'text/plain;charset=utf-8;');
    addMessageToHistory(SYSTEM_SENDER_NAME, `Chat exported as ${filename}`, 'text-[var(--color-info)]', false, false);
  }, [currentMode, addMessageToHistory, formatChatForExport]);

  const handleExportMD = useCallback(() => {
    const chatText = formatChatForExport('md');
    const filename = `overmind-log-${currentMode}-${new Date().toISOString().split('T')[0]}.md`;
    downloadFile(filename, chatText, 'text/markdown;charset=utf-8;');
    addMessageToHistory(SYSTEM_SENDER_NAME, `Chat exported as ${filename}`, 'text-[var(--color-info)]', false, false);
  }, [currentMode, addMessageToHistory, formatChatForExport]);

  const handleBackupChat = useCallback(() => {
    const ai1P = getAIPersona(1, currentMode);
    const ai2P = getAIPersona(2, currentMode);

    let chessData = {};
    if (currentMode === AppMode.CHESS_SIM_EXE) {
      const chessContainerDataElement = document.getElementById('chess-mode-container-data');
      const currentFen = chessContainerDataElement?.dataset.currentFen;
      const currentPlayer = chessContainerDataElement?.dataset.currentPlayer as PlayerColor | undefined;
      const cotAi1 = chessContainerDataElement?.dataset.cotAi1;
      const cotAi2 = chessContainerDataElement?.dataset.cotAi2;
      const gameStatus = chessContainerDataElement?.dataset.gameStatus;

      chessData = {
        chessBoardFEN: currentFen || chessInitialFen,
        chessCurrentPlayer: currentPlayer || chessInitialPlayer || PlayerColor.WHITE,
        chessCoTAI1: cotAi1 || chessInitialCoTAI1,
        chessCoTAI2: cotAi2 || chessInitialCoTAI2,
        chessGameStatus: gameStatus || chessInitialGameStatus || "Game in progress",
      };
    }
    
    let noosphericData = {};
    if (currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE) {
      const noosphericContainerDataElement = document.getElementById('noospheric-conquest-container-data');
      const currentNoosphericStateString = noosphericContainerDataElement?.dataset.noosphericGameState;
      const currentMapType = noosphericContainerDataElement?.dataset.noosphericMapType as NoosphericMapType | undefined;
      if (currentNoosphericStateString) {
        try {
          noosphericData = { 
            noosphericGameState: JSON.parse(currentNoosphericStateString),
            noosphericMapType: currentMapType || noosphericInitialMapType || 'Global Conflict' 
          };
        } catch (e) {
          console.error("Failed to parse Noospheric game state from data attribute for backup:", e);
          noosphericData = { noosphericGameState: noosphericInitialState, noosphericMapType: noosphericInitialMapType || 'Global Conflict' };
        }
      } else {
        noosphericData = { noosphericGameState: noosphericInitialState, noosphericMapType: noosphericInitialMapType || 'Global Conflict' };
      }
    }


    const backupData: ConversationBackup = {
      version: "1.5.0", // Incremented version for NoosphericMapType
      timestamp: new Date().toISOString(),
      mode: currentMode,
      personas: {
        ai1: { name: ai1P?.name || AI1_NAME, systemPrompt: ai1P?.systemPrompt || "Error: AI1 prompt not found" },
        ai2: ai2P ? { name: ai2P.name, systemPrompt: ai2P.systemPrompt } : null,
      },
      conversationHistory,
      turnCycleCount,
      nextAiToSpeak: nextAiToSpeakRef.current,
      themeName: activeTheme,
      typingSpeedMs: typingSpeedMs,
      matrixSettings: {
        speed: matrixSettings.speed,
        glitchEffect: matrixSettings.glitchEffect,
        isPaused: matrixSettings.isPaused,
      },
      ...chessData,
      ...noosphericData,
    };
    const filename = `overmind-backup-${currentMode}-${new Date().toISOString().replace(/:/g, '-')}.json`;
    downloadFile(filename, JSON.stringify(backupData, null, 2), 'application/json;charset=utf-8;');
    addMessageToHistory(SYSTEM_SENDER_NAME, `Conversation backed up as ${filename}`, 'text-[var(--color-info)]', false, false);
  }, [conversationHistory, currentMode, turnCycleCount, addMessageToHistory, activeTheme, typingSpeedMs, matrixSettings, chessInitialFen, chessInitialPlayer, chessInitialCoTAI1, chessInitialCoTAI2, chessInitialGameStatus, noosphericInitialState, noosphericInitialMapType]);

  const handleLoadChat = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const backupData = JSON.parse(text) as ConversationBackup;

        if (!backupData.version || !backupData.mode || !backupData.conversationHistory || !backupData.personas) {
          throw new Error("Invalid backup file structure.");
        }

        addMessageToHistory(SYSTEM_SENDER_NAME, `Loading backup: ${file.name}... Mode: ${backupData.mode}`, 'text-[var(--color-prompt-message)]', false, false);

        if (backupData.themeName) {
          setActiveTheme(backupData.themeName);
        } else {
          setActiveTheme('terminal');
        }
        if (backupData.typingSpeedMs) {
          setTypingSpeedMs(backupData.typingSpeedMs);
        }
        if (backupData.matrixSettings) {
          setMatrixSettings(prev => ({
            ...prev,
            speed: backupData.matrixSettings?.speed ?? DEFAULT_MATRIX_SPEED,
            glitchEffect: backupData.matrixSettings?.glitchEffect ?? true,
            isPaused: backupData.matrixSettings?.isPaused ?? false,
          }));
        }

        resetAndInitializeForNewMode(backupData.mode, true, backupData.conversationHistory, backupData);

        setIsAwaitingInitialStart(false);
        setIsAwaitingUserInput(false);
        wasAwaitingUserInputRef.current = false;
        setCurrentTypingMessageId(null);
        isUserInterventionPendingRef.current = false;
        pendingInterventionTextRef.current = null;
        interventionTargetForPendingRef.current = null;
        queuedInterventionForAI1Ref.current = null;
        queuedInterventionForAI2Ref.current = null;
        setUniverseSimInputText("");


        if (backupData.mode === AppMode.UNIVERSE_SIM_EXE) {
            setTurnCycleCount(backupData.turnCycleCount || 0);
            addMessageToHistory(SYSTEM_SENDER_NAME, `Universe Simulation state (Mode: ${backupData.mode}) restored from ${file.name}. AI is confirming state...`, 'text-[var(--color-prompt-message)]', false, false);
            pendingInterventionTextRef.current = "SYSTEM_NOTIFICATION: Backup has been successfully restored. Please acknowledge and await further user commands.";
            isUserInterventionPendingRef.current = true;
            interventionTargetForPendingRef.current = 'CHAT_FLOW';
        } else if (backupData.mode === AppMode.CHESS_SIM_EXE) {
            setTurnCycleCount(0);
            addMessageToHistory(SYSTEM_SENDER_NAME, `Chess game (Mode: ${backupData.mode}) loaded from ${file.name}. Resuming...`, 'text-[var(--color-prompt-message)]', false, false);
        } else if (backupData.mode === AppMode.NOOSPHERIC_CONQUEST_EXE) {
            setTurnCycleCount(0); 
            addMessageToHistory(SYSTEM_SENDER_NAME, `Noospheric Conquest game (Mode: ${backupData.mode}, Map: ${backupData.noosphericMapType || 'Global Conflict'}) loaded from ${file.name}. Resuming...`, 'text-[var(--color-prompt-message)]', false, false);
        } else {
            setTurnCycleCount(backupData.turnCycleCount >= MAX_TURN_CYCLES ? 0 : backupData.turnCycleCount);
            if (backupData.turnCycleCount >= MAX_TURN_CYCLES) {
              setIsAwaitingUserInput(true);
              wasAwaitingUserInputRef.current = true; 
              addMessageToHistory(SYSTEM_SENDER_NAME, `Conversation (Mode: ${backupData.mode}) loaded from ${file.name}. ${USER_PROMPT_MESSAGE}`, 'text-[var(--color-prompt-message)]', false, false);
            } else {
              addMessageToHistory(SYSTEM_SENDER_NAME, `Conversation (Mode: ${backupData.mode}) loaded from ${file.name}. Resuming...`, 'text-[var(--color-prompt-message)]', false, false);
            }
        }
        setForceTurnCheckToken(t => t + 1);

      } catch (err) {
        console.error("Failed to load backup:", err);
        addMessageToHistory(SYSTEM_SENDER_NAME, `Error loading backup: ${err instanceof Error ? err.message : String(err)}`, 'text-[var(--color-error)]', false, false);
      } finally {
        if (event.target) event.target.value = "";
      }
    }
  }, [addMessageToHistory, resetAndInitializeForNewMode, MAX_TURN_CYCLES, USER_PROMPT_MESSAGE]);

  const handleCommandHistoryNavigation = useCallback((direction: 'up' | 'down', inputType: 'initial' | 'prompt' | 'universeSim') => {
    if (commandHistory.length === 0) return;

    let newIndex = commandHistoryIndexRef.current;
    if (direction === 'up') {
      newIndex = commandHistoryIndexRef.current === -1 ? commandHistory.length -1 : Math.max(0, commandHistoryIndexRef.current - 1) ;

    } else {
      newIndex = commandHistoryIndexRef.current === commandHistory.length -1 ? -1 : Math.min(commandHistory.length -1 , commandHistoryIndexRef.current +1);
    }


    if (newIndex !== commandHistoryIndexRef.current) {
      commandHistoryIndexRef.current = newIndex;
      const commandToSet = newIndex === -1 ? "" : commandHistory[commandHistory.length - 1 - newIndex];

      if (inputType === 'initial') {
        setInitialStartInputText(commandToSet);
      } else if (inputType === 'prompt') {
        setUserInputText(commandToSet);
      } else if (inputType === 'universeSim') {
        setUniverseSimInputText(commandToSet);
      }
    } else if (direction === 'down' && commandHistoryIndexRef.current === commandHistory.length -1 && newIndex === commandHistory.length -1){
        commandHistoryIndexRef.current = -1;
         if (inputType === 'initial') setInitialStartInputText("");
         else if (inputType === 'prompt') setUserInputText("");
         else if (inputType === 'universeSim') setUniverseSimInputText("");
    }
  }, [commandHistory]);


  const terminalTitle = `OVERMIND INTERFACE // MODE: ${currentMode}`;
  const isUniverseSimActivePhase2 = currentMode === AppMode.UNIVERSE_SIM_EXE &&
                                   !isLoading &&
                                   currentTypingMessageId === null &&
                                   conversationHistory.length > 0 &&
                                   conversationHistory.some(msg => msg.sender === AI1_NAME && msg.text.trim().endsWith("world_sim>"));
  
  const openInfoModal = () => setIsInfoModalOpen(true);
  const closeInfoModal = () => setIsInfoModalOpen(false);


  const renderAppContent = () => {
    if (isAwaitingInitialStart) {
      return (
        <>
          <main className="flex-grow h-full flex flex-col items-center justify-center md:mr-[calc(20rem+0.5rem)]"> 
            <TerminalWindow
              title={`OVERMIND INTERFACE // Confirm Mode: ${currentMode}`}
              messages={conversationHistory}
              isTypingActive={false}
              isAwaitingInitialStart={true}
              initialStartPromptMessageText={INITIAL_START_PROMPT_MESSAGE}
              initialStartInputValue={initialStartInputText}
              onInitialStartInputChange={handleInitialStartInputChange}
              onInitialStartSubmit={handleInitialStartSubmit}
              typingSpeed={typingSpeedMs}
              currentMode={currentMode}
              commandHistory={commandHistory}
              onCommandHistoryNavigation={handleCommandHistoryNavigation}
              className="w-full md:w-3/4 lg:w-2/3 max-w-4xl h-[300px] md:h-[400px]"
            />
          </main>
          <ControlsPanel
            matrixSettings={matrixSettings}
            onMatrixSettingsChange={handleMatrixSettingsChange}
            onCopyChat={handleCopyChat}
            onExportTXT={handleExportTXT}
            onExportMD={handleExportMD}
            onBackupChat={handleBackupChat}
            onLoadChat={handleLoadChat}
            isAIsTyping={isLoading}
            activeAIName={activeAINameForLoading}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            onSendUserIntervention={handleSendUserIntervention}
            currentTypingSpeed={typingSpeedMs}
            onTypingSpeedChange={handleTypingSpeedChange}
            onCompleteCurrentMessage={handleCompleteCurrentMessage}
            activeTheme={activeTheme}
            onThemeChange={handleThemeChange}
            onOpenInfoModal={openInfoModal}
          />
        </>
      );
    }

    if (currentMode === AppMode.CHESS_SIM_EXE) {
      return (
        <ChessModeContainer
          key={chessResetTokenRef.current}
          ai1Chat={ai1ChatRef.current}
          ai2Chat={ai2ChatRef.current}
          addMessageToHistory={addMessageToHistory}
          apiKeyMissing={apiKeyMissing}
          initialFen={chessInitialFen}
          initialPlayer={chessInitialPlayer}
          initialCoTAI1={chessInitialCoTAI1}
          initialCoTAI2={chessInitialCoTAI2}
          initialGameStatus={chessInitialGameStatus}
          currentAppMode={currentMode}
          onModeChange={handleModeChange}
          activeTheme={activeTheme}
          isAiReadyForChessFromApp={isAiReadyForChess}
          appInitializationError={initializationError}
          onOpenInfoModal={openInfoModal}
        />
      );
    }
    
    if (currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE) {
      return (
        <NoosphericConquestContainer
          key={`${noosphericResetTokenRef.current}-${noosphericInitialMapType}`} // Include map type in key
          ai1Chat={ai1ChatRef.current}
          ai2Chat={ai2ChatRef.current}
          apiKeyMissing={apiKeyMissing}
          initialGameState={noosphericInitialState}
          initialMapType={noosphericInitialMapType} // Pass initial map type
          isGameStartedFromBackup={noosphericGameStartedFromBackup} // Pass new prop
          currentAppMode={currentMode}
          onModeChange={handleModeChange}
          activeTheme={activeTheme}
          isAiReadyForNoosphericFromApp={isAiReadyForNoospheric}
          appInitializationError={initializationError}
          onOpenInfoModal={openInfoModal}
        />
      );
    }

    // Default: TerminalWindow + ControlsPanel for other modes
    return (
      <>
        <main className="flex-grow h-full md:mr-[calc(20rem+0.5rem)]">
          <TerminalWindow
            title={terminalTitle}
            messages={conversationHistory}
            isTypingActive={currentTypingMessageId !== null}
            activeTypingMessageId={currentTypingMessageId}
            onTypingComplete={handleTypingComplete}
            isPromptingUser={isAwaitingUserInput}
            userInputValue={userInputText}
            onUserInputChange={handleUserInputChange}
            onUserPromptSubmit={handleUserPromptSubmit}
            isAwaitingInitialStart={false}
            typingSpeed={typingSpeedMs}
            isUniverseSimActivePhase2={isUniverseSimActivePhase2}
            universeSimInputValue={universeSimInputText}
            onUniverseSimInputChange={handleUniverseSimInputChange}
            onUniverseSimInputSubmit={handleUniverseSimInputSubmit}
            currentMode={currentMode}
            commandHistory={commandHistory}
            onCommandHistoryNavigation={handleCommandHistoryNavigation}
            className="h-full w-full"
          />
        </main>
        <ControlsPanel
          matrixSettings={matrixSettings}
          onMatrixSettingsChange={handleMatrixSettingsChange}
          onCopyChat={handleCopyChat}
          onExportTXT={handleExportTXT}
          onExportMD={handleExportMD}
          onBackupChat={handleBackupChat}
          onLoadChat={handleLoadChat}
          isAIsTyping={isLoading}
          activeAIName={activeAINameForLoading}
          currentMode={currentMode}
          onModeChange={handleModeChange}
          onSendUserIntervention={handleSendUserIntervention}
          currentTypingSpeed={typingSpeedMs}
          onTypingSpeedChange={handleTypingSpeedChange}
          onCompleteCurrentMessage={handleCompleteCurrentMessage}
          activeTheme={activeTheme}
          onThemeChange={handleThemeChange}
          onOpenInfoModal={openInfoModal}
        />
      </>
    );
  };


  return (
    <>
      <MatrixBackground settings={matrixSettings} onFPSUpdate={updateFPS} />
      {apiKeyMissing && (
         <div
            className="fixed top-0 left-0 right-0 bg-[var(--color-error)] text-[var(--color-bg-page)] p-3 text-center z-50 shadow-lg"
            role="alert"
            aria-labelledby="apikey-error-title-banner"
         >
            <h2 id="apikey-error-title-banner" className="text-lg font-bold">API KEY CONFIGURATION ERROR</h2>
            <p className="text-sm">AI services offline: <code className="bg-black bg-opacity-20 px-1 rounded">process.env.API_KEY</code> is missing.</p>
         </div>
      )}
      <div className={`fixed inset-0 p-2 md:p-4 z-10 ${apiKeyMissing ? 'pt-16 md:pt-20' : ''}
                     flex flex-col
                     ${(currentMode === AppMode.CHESS_SIM_EXE && !isAwaitingInitialStart) || (currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE && !isAwaitingInitialStart) ? '' : 'md:flex-row'}`}>
        {renderAppContent()}
      </div>
      {isInfoModalOpen && MODE_INFO_CONTENT[currentMode] && (
        <InfoModal
          modeInfo={MODE_INFO_CONTENT[currentMode]}
          onClose={closeInfoModal}
        />
      )}
      <div className="fixed bottom-1 left-2 text-xs text-[var(--color-text-muted)] z-30" aria-live="off">FPS: {fps}</div>
      <div id="chess-mode-container-data" style={{ display: 'none' }}></div>
      <div id="noospheric-conquest-container-data" style={{ display: 'none' }}></div> {/* For Noospheric data */}
    </>
  );
};

export default App;