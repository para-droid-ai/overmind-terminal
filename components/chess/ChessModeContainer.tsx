
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chat } from '@google/genai';
import { ChessBoardState, PlayerColor, UCIMove, PieceSymbol, AppMode, ThemeName, ChessGameRecord, ChessMoveDetail, ChessGameOutcome } from '../../types';
import { AI1_NAME, AI2_NAME, CHESS_SIM_START_MESSAGE, SYSTEM_SENDER_NAME, THEMES, CHESS_STRATEGIES, MAX_CHESS_RETRY_ATTEMPTS } from '../../constants';
import { 
    fenToBoard, boardToFen, INITIAL_BOARD_FEN, uciToCoords, 
    applyMoveToBoard, isMoveValid, getPieceUnicode 
} from '../../utils/chessLogic';
import ChessBoardDisplay from './ChessBoardDisplay';
import CoTDisplay from './CoTDisplay';

interface ChessModeContainerProps {
  ai1Chat: Chat | null;
  ai2Chat: Chat | null;
  addMessageToHistory: (sender: string, text: string, color?: string, isUser?: boolean, makeActiveTyping?: boolean) => string;
  apiKeyMissing: boolean;
  initialFen?: string;
  initialPlayer?: PlayerColor;
  initialCoTAI1?: string;
  initialCoTAI2?: string;
  initialGameStatus?: string;
  currentAppMode: AppMode;
  onModeChange: (newMode: AppMode) => void;
  activeTheme: ThemeName;
  isAiReadyForChessFromApp: boolean;
  appInitializationError: string | null;
  onOpenInfoModal: () => void; // Added for consistency
}

interface CapturedPieces {
  [PieceSymbol.QUEEN]: number;
  [PieceSymbol.ROOK]: number;
  [PieceSymbol.BISHOP]: number;
  [PieceSymbol.KNIGHT]: number;
  [PieceSymbol.PAWN]: number;
}

const INITIAL_PIECE_COUNTS: { [key in PieceSymbol]: number } = {
  [PieceSymbol.PAWN]: 8, [PieceSymbol.ROOK]: 2, [PieceSymbol.KNIGHT]: 2,
  [PieceSymbol.BISHOP]: 2, [PieceSymbol.QUEEN]: 1, [PieceSymbol.KING]: 1,
};

const ChessModeContainer: React.FC<ChessModeContainerProps> = ({
  ai1Chat,
  ai2Chat,
  addMessageToHistory,
  apiKeyMissing,
  initialFen = INITIAL_BOARD_FEN,
  initialPlayer,
  initialCoTAI1 = "",
  initialCoTAI2 = "",
  initialGameStatus,
  currentAppMode,
  onModeChange,
  activeTheme,
  isAiReadyForChessFromApp,
  appInitializationError,
  onOpenInfoModal, // Added
}) => {
  const fenData = fenToBoard(initialFen);
  const [boardState, setBoardState] = useState<ChessBoardState>(fenData.board);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(initialPlayer || fenData.currentPlayer);
  const [fenParts, setFenParts] = useState({
    castling: fenData.castling,
    enPassant: fenData.enPassant,
    halfMove: fenData.halfMove,
    fullMove: fenData.fullMove,
  });
  const [gameStatus, setGameStatus] = useState<string>(initialGameStatus || `${fenData.currentPlayer === PlayerColor.WHITE ? 'White' : 'Black'} to move.`);
  const [cotAI1, setCotAI1] = useState<string>(initialCoTAI1);
  const [cotAI2, setCotAI2] = useState<string>(initialCoTAI2);
  const [isLoadingAI, setIsLoadingAI] = useState<PlayerColor | null>(null);
  const [lastMove, setLastMove] = useState<UCIMove | null>(null);
  const [moveHistoryUI, setMoveHistoryUI] = useState<Array<{ moveNumber: number, player: PlayerColor, uci: string }>>([]);
  
  const [capturedByWhite, setCapturedByWhite] = useState<CapturedPieces>({ q:0, r:0, b:0, n:0, p:0 });
  const [capturedByBlack, setCapturedByBlack] = useState<CapturedPieces>({ q:0, r:0, b:0, n:0, p:0 });

  const [ai1Strategy, setAi1Strategy] = useState<string>(CHESS_STRATEGIES[0].id);
  const [ai2Strategy, setAi2Strategy] = useState<string>(CHESS_STRATEGIES[0].id);
  const [totalMoveTimeMs, setTotalMoveTimeMs] = useState(0);
  const [completedMovesForAvg, setCompletedMovesForAvg] = useState(0);

  const [isGameStarted, setIsGameStarted] = useState(false);
  const gameIsOverRef = useRef(false);
  const currentMoveNumberRef = useRef(fenData.fullMove); 
  
  const dataDivRef = useRef<HTMLDivElement>(null);

  // State for game history and stats
  const [currentGameMoves, setCurrentGameMoves] = useState<ChessMoveDetail[]>([]);
  const [gameHistoryArchive, setGameHistoryArchive] = useState<ChessGameRecord[]>([]);
  const [whiteWins, setWhiteWins] = useState(0);
  const [blackWins, setBlackWins] = useState(0);
  const [draws, setDraws] = useState(0);
  const [currentStreak, setCurrentStreak] = useState<{ player: PlayerColor | 'draw' | null; count: number }>({ player: null, count: 0 });
  const [longestWhiteStreak, setLongestWhiteStreak] = useState(0);
  const [longestBlackStreak, setLongestBlackStreak] = useState(0);
  const [autoRestartCountdown, setAutoRestartCountdown] = useState<number | null>(null);
  const autoRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    if (dataDivRef.current) {
      dataDivRef.current.dataset.currentFen = boardToFen(boardState, currentPlayer, fenParts.castling, fenParts.enPassant, fenParts.halfMove, fenParts.fullMove);
      dataDivRef.current.dataset.currentPlayer = currentPlayer;
      dataDivRef.current.dataset.cotAi1 = cotAI1;
      dataDivRef.current.dataset.cotAi2 = cotAI2;
      dataDivRef.current.dataset.gameStatus = gameStatus;
    }
  }, [boardState, currentPlayer, fenParts, cotAI1, cotAI2, gameStatus]);

  const isOverallAiReady = isAiReadyForChessFromApp && !!ai1Chat && !!ai2Chat && !apiKeyMissing;

  const resetGameCoreState = (startMessage?: string) => {
    const startingFenData = fenToBoard(INITIAL_BOARD_FEN);
    setBoardState(startingFenData.board);
    setCurrentPlayer(startingFenData.currentPlayer);
    setFenParts({
        castling: startingFenData.castling,
        enPassant: startingFenData.enPassant,
        halfMove: startingFenData.halfMove,
        fullMove: startingFenData.fullMove,
    });
    setCotAI1("");
    setCotAI2("");
    setLastMove(null);
    setMoveHistoryUI([]);
    setCurrentGameMoves([]);
    gameIsOverRef.current = false;
    currentMoveNumberRef.current = startingFenData.fullMove;
    setGameStatus(startMessage || `${startingFenData.currentPlayer === PlayerColor.WHITE ? 'White' : 'Black'} to move.`);
    if (autoRestartTimerRef.current) clearTimeout(autoRestartTimerRef.current);
    setAutoRestartCountdown(null);
  };

  const handleStartGame = () => {
    if (isOverallAiReady) {
      setIsGameStarted(true);
      setTotalMoveTimeMs(0); 
      setCompletedMovesForAvg(0);
      resetGameCoreState(CHESS_SIM_START_MESSAGE);
      addMessageToHistory(SYSTEM_SENDER_NAME, CHESS_SIM_START_MESSAGE, 'text-[var(--color-facilitator)]', false, false);
    }
  };
  
  const handleManualNewGame = () => {
     if (isOverallAiReady) {
        setIsGameStarted(true); // Ensure game can start even if it was stopped/errored
        setTotalMoveTimeMs(0);
        setCompletedMovesForAvg(0);
        resetGameCoreState("New game started. White to move.");
        addMessageToHistory(SYSTEM_SENDER_NAME, "Manual New Game Started. GEM-Q (White) to move.", 'text-[var(--color-facilitator)]', false, false);
     }
  };

  const calculateCapturedPieces = useCallback(() => {
    const currentCountsWhite: Partial<Record<PieceSymbol, number>> = {};
    const currentCountsBlack: Partial<Record<PieceSymbol, number>> = {};

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardState[r][c];
        if (piece) {
          if (piece.color === PlayerColor.WHITE) {
            currentCountsWhite[piece.symbol] = (currentCountsWhite[piece.symbol] || 0) + 1;
          } else {
            currentCountsBlack[piece.symbol] = (currentCountsBlack[piece.symbol] || 0) + 1;
          }
        }
      }
    }

    const newCapturedByWhite: CapturedPieces = { q:0, r:0, b:0, n:0, p:0 };
    const newCapturedByBlack: CapturedPieces = { q:0, r:0, b:0, n:0, p:0 };

    (Object.keys(INITIAL_PIECE_COUNTS) as PieceSymbol[]).forEach(symbol => {
      if (symbol === PieceSymbol.KING) return; 
      newCapturedByWhite[symbol] = INITIAL_PIECE_COUNTS[symbol] - (currentCountsBlack[symbol] || 0);
      newCapturedByBlack[symbol] = INITIAL_PIECE_COUNTS[symbol] - (currentCountsWhite[symbol] || 0);
    });
    setCapturedByWhite(newCapturedByWhite);
    setCapturedByBlack(newCapturedByBlack);
  }, [boardState]);

  useEffect(() => {
    calculateCapturedPieces();
  }, [boardState, calculateCapturedPieces]);

  const getGamePhase = (moveNum: number): string => {
    if (moveNum <= 10) return "Opening";
    if (moveNum <= 30) return "Middlegame";
    return "Endgame";
  };

  const handleGameEnd = useCallback((reason: string, winner?: PlayerColor | 'draw' | 'error') => {
    gameIsOverRef.current = true;
    const outcome: ChessGameOutcome = { winner: winner || 'error', reason };
    const gameRecord: ChessGameRecord = {
      id: `game-${Date.now()}`,
      startTime: gameHistoryArchive[gameHistoryArchive.length -1]?.endTime || new Date(Date.now() - currentGameMoves.reduce((acc, m) => acc + m.timeTakenMs, 0)).toISOString(), // Approx if no previous
      endTime: new Date().toISOString(),
      moves: [...currentGameMoves],
      outcome,
      ai1StrategyInitial: CHESS_STRATEGIES.find(s=>s.id === ai1Strategy)?.name || ai1Strategy,
      ai2StrategyInitial: CHESS_STRATEGIES.find(s=>s.id === ai2Strategy)?.name || ai2Strategy,
      finalFEN: boardToFen(boardState, currentPlayer, fenParts.castling, fenParts.enPassant, fenParts.halfMove, fenParts.fullMove),
    };
    setGameHistoryArchive(prev => [...prev, gameRecord]);

    if (winner === PlayerColor.WHITE) {
      setWhiteWins(w => w + 1);
      if (currentStreak.player === PlayerColor.WHITE) {
        const newCount = currentStreak.count + 1;
        setCurrentStreak({ player: PlayerColor.WHITE, count: newCount});
        setLongestWhiteStreak(Math.max(longestWhiteStreak, newCount));
      } else {
        setCurrentStreak({ player: PlayerColor.WHITE, count: 1 });
        setLongestWhiteStreak(Math.max(longestWhiteStreak, 1));
      }
    } else if (winner === PlayerColor.BLACK) {
      setBlackWins(b => b + 1);
      if (currentStreak.player === PlayerColor.BLACK) {
        const newCount = currentStreak.count + 1;
        setCurrentStreak({ player: PlayerColor.BLACK, count: newCount});
        setLongestBlackStreak(Math.max(longestBlackStreak, newCount));
      } else {
        setCurrentStreak({ player: PlayerColor.BLACK, count: 1 });
        setLongestBlackStreak(Math.max(longestBlackStreak, 1));
      }
    } else if (winner === 'draw') {
      setDraws(d => d + 1);
      setCurrentStreak({ player: 'draw', count: (currentStreak.player === 'draw' ? currentStreak.count + 1 : 1) });
    } else { // Error
      setCurrentStreak({ player: null, count: 0 });
    }
    
    setAutoRestartCountdown(5);
    setGameStatus(`${reason} New game in 5s...`);
  }, [currentGameMoves, ai1Strategy, ai2Strategy, boardState, currentPlayer, fenParts, currentStreak, longestWhiteStreak, longestBlackStreak, gameHistoryArchive]);

  const startNewGameAutomatically = useCallback(() => {
    resetGameCoreState("New game started. White to move.");
    addMessageToHistory(SYSTEM_SENDER_NAME, "New game started automatically. GEM-Q (White) to move.", 'text-[var(--color-facilitator)]', false, false);
    setTotalMoveTimeMs(0); // Reset for new game's average
    setCompletedMovesForAvg(0);
  }, [addMessageToHistory]);

  useEffect(() => {
    if (autoRestartCountdown !== null) {
      if (autoRestartCountdown > 0) {
        if (autoRestartTimerRef.current) clearTimeout(autoRestartTimerRef.current);
        autoRestartTimerRef.current = setTimeout(() => {
          setAutoRestartCountdown(val => (val !== null ? val - 1 : null));
          if (autoRestartCountdown -1 > 0) {
            setGameStatus(prevStatus => prevStatus.replace(/in \d+s/, `in ${autoRestartCountdown - 1}s`));
          } else if (autoRestartCountdown -1 === 0) {
            setGameStatus(prevStatus => prevStatus.replace(/in \d+s.../, 'starting now...'));
          }
        }, 1000);
      } else if (autoRestartCountdown === 0) {
        startNewGameAutomatically();
      }
    }
    return () => { if (autoRestartTimerRef.current) clearTimeout(autoRestartTimerRef.current); };
  }, [autoRestartCountdown, startNewGameAutomatically]);


  const makeAIMove = useCallback(async () => {
    if (apiKeyMissing || gameIsOverRef.current || !isGameStarted || !isOverallAiReady) return;

    const currentAiChat = currentPlayer === PlayerColor.WHITE ? ai1Chat : ai2Chat;
    const currentAiName = currentPlayer === PlayerColor.WHITE ? AI1_NAME : AI2_NAME;
    const currentStrategyId = currentPlayer === PlayerColor.WHITE ? ai1Strategy : ai2Strategy;
    const currentStrategyName = CHESS_STRATEGIES.find(s => s.id === currentStrategyId)?.name || "Balanced";
    
    if (!currentAiChat) {
      const errorMessage = `${currentAiName} is not available (chat instance is null).`;
      addMessageToHistory(SYSTEM_SENDER_NAME, errorMessage, 'text-[var(--color-error)]', false, false);
      handleGameEnd(`${currentAiName} unavailable. Game over.`, 'error');
      setIsLoadingAI(null);
      return;
    }

    let uciMoveString: string | null = null;
    let cotText: string = "AI did not provide Chain of Thought or it was malformed.";
    let parsedMove: UCIMove | null = null;
    let lastErrorForRetryPrompt: string | null = null;
    let moveProcessedSuccessfully = false;
    let timeTakenMs = 0;

    for (let attempt = 0; attempt <= MAX_CHESS_RETRY_ATTEMPTS; attempt++) {
        setIsLoadingAI(currentPlayer);
        const currentFen = boardToFen(boardState, currentPlayer, fenParts.castling, fenParts.enPassant, fenParts.halfMove, fenParts.fullMove);
        
        let prompt: string;
        if (attempt === 0) {
            prompt = `Current FEN: ${currentFen}\nYour turn (${currentPlayer === PlayerColor.WHITE ? 'White' : 'Black'}).\nSelected Strategy: ${currentStrategyName}.\nProvide your move in UCI format and your Chain of Thought.\nFormat your response strictly as:\nMOVE: [YourMoveInUCI]\nCOT: [YourReasoning]`;
        } else {
            const retryErrorMsg = lastErrorForRetryPrompt || 'Invalid move formatting or logic from previous attempt.';
            addMessageToHistory(SYSTEM_SENDER_NAME, `${currentAiName} (Attempt ${attempt + 1}/${MAX_CHESS_RETRY_ATTEMPTS + 1}): Retrying move. Previous error: ${retryErrorMsg}`, 'text-[var(--color-info)]', false, false);
            prompt = `Your previous move attempt was invalid: "${retryErrorMsg}"\nCurrent FEN: ${currentFen}\nYour turn (${currentPlayer === PlayerColor.WHITE ? 'White' : 'Black'}).\nSelected Strategy: ${currentStrategyName}.\nStrictly provide your move in UCI format (e.g., 'e2e4', 'g1f3', 'e7e8q' for promotion) and your Chain of Thought.\nFormat your response strictly as:\nMOVE: [YourMoveInUCI]\nCOT: [YourReasoning]`;
        }

        try {
            const startTime = performance.now();
            const result = await currentAiChat.sendMessage({ message: prompt });
            const timeTakenMsForThisAttempt = performance.now() - startTime;
            timeTakenMs = timeTakenMsForThisAttempt; 

            const responseTextFromAI = result.text;
            console.log(`AI Response from ${currentAiName} (Attempt ${attempt + 1}):`, responseTextFromAI);

            const primaryMoveRegex = /MOVE:\s*([a-h][1-8][a-h][1-8][qrbn]?)\s*/i;
            const algebraicCaptureRegex = /MOVE:\s*([a-h][1-8])x([a-h][1-8])([qrbn]?)\s*/i;

            let tempUciMoveString: string | null = null;
            let moveMatch = responseTextFromAI.match(primaryMoveRegex);

            if (moveMatch) {
                tempUciMoveString = moveMatch[1].toLowerCase();
            } else {
                const algebraicMatch = responseTextFromAI.match(algebraicCaptureRegex);
                if (algebraicMatch) {
                    tempUciMoveString = `${algebraicMatch[1]}${algebraicMatch[2]}${algebraicMatch[3] || ''}`.toLowerCase();
                }
            }
            
            const tempCotMatch = responseTextFromAI.match(/COT:\s*(.*)/is);
            const tempCotText = tempCotMatch ? tempCotMatch[1].trim() : "AI did not provide Chain of Thought or it was malformed.";

            if (!tempUciMoveString) {
                lastErrorForRetryPrompt = `AI did not provide a move in the expected 'MOVE: [UCI]' format. Full response: ${responseTextFromAI.substring(0, 100)}...`;
                if (attempt < MAX_CHESS_RETRY_ATTEMPTS) continue; 
                else break; 
            }
            
            tempUciMoveString = tempUciMoveString.trim().slice(0, 5);

            if (tempUciMoveString.length === 5) {
                const fifthChar = tempUciMoveString[4];
                if (!['q', 'r', 'b', 'n'].includes(fifthChar)) {
                    lastErrorForRetryPrompt = `AI provided a malformed 5-character UCI (promotion) move: ${tempUciMoveString}. Fifth char must be q, r, b, or n.`;
                    if (attempt < MAX_CHESS_RETRY_ATTEMPTS) continue;
                    else break;
                }
            }
            
            const tempParsedMove = uciToCoords(tempUciMoveString);
            if (!tempParsedMove) {
                lastErrorForRetryPrompt = `AI provided an invalid UCI move string (could not parse coordinates): ${tempUciMoveString}. Full response: ${responseTextFromAI.substring(0, 100)}...`;
                if (attempt < MAX_CHESS_RETRY_ATTEMPTS) continue;
                else break;
            }

            if (!isMoveValid(boardState, tempParsedMove, currentPlayer)) {
                lastErrorForRetryPrompt = `AI proposed an invalid move according to game rules: ${tempUciMoveString}.`;
                if (attempt < MAX_CHESS_RETRY_ATTEMPTS) continue;
                else break;
            }

            uciMoveString = tempUciMoveString;
            cotText = tempCotText;
            parsedMove = tempParsedMove;
            moveProcessedSuccessfully = true;
            if (attempt > 0) {
                 addMessageToHistory(SYSTEM_SENDER_NAME, `${currentAiName} successfully provided a valid move on attempt ${attempt + 1}: ${uciMoveString}`, 'text-[var(--color-info)]', false, false);
            }
            break; 

        } catch (error) { 
            lastErrorForRetryPrompt = error instanceof Error ? error.message : String(error);
            console.error(`Error during ${currentAiName}'s turn (Attempt ${attempt + 1} processing):`, error);
            if (attempt === MAX_CHESS_RETRY_ATTEMPTS) break; 
        }
    } 

    if (!moveProcessedSuccessfully) {
        const finalErrorMsg = `AI (${currentAiName}) failed to provide a valid move after ${MAX_CHESS_RETRY_ATTEMPTS + 1} attempts. Last error: ${lastErrorForRetryPrompt || "Unknown error after retries."}`;
        addMessageToHistory(SYSTEM_SENDER_NAME, finalErrorMsg, 'text-[var(--color-error)]', false, false);
        handleGameEnd(finalErrorMsg, 'error');
        setIsLoadingAI(null);
        return;
    }
    
    if (!uciMoveString || !parsedMove) { 
        const safeguardError = `Internal error: Move processed flag true, but UCI/parsed move is null. Last AI error: ${lastErrorForRetryPrompt}`;
        addMessageToHistory(SYSTEM_SENDER_NAME, safeguardError, 'text-[var(--color-error)]', false, false);
        handleGameEnd(safeguardError, 'error');
        setIsLoadingAI(null);
        return;
    }
    
    setTotalMoveTimeMs(prev => prev + timeTakenMs);
    setCompletedMovesForAvg(prev => prev + 1);

    if (currentPlayer === PlayerColor.WHITE) setCotAI1(cotText);
    else setCotAI2(cotText);
    
    const pieceMakingMove = boardState[parsedMove.from.row][parsedMove.from.col];
    const pieceCaptured = boardState[parsedMove.to.row][parsedMove.to.col]; 
    
    const newBoard = applyMoveToBoard(boardState, parsedMove);
    setBoardState(newBoard);
    setLastMove(parsedMove);
    
    const moveLogPlayerName = currentPlayer === PlayerColor.WHITE ? AI1_NAME : AI2_NAME;
    addMessageToHistory(moveLogPlayerName, `${moveLogPlayerName} (${currentPlayer === PlayerColor.WHITE ? "W" : "B"}) moves: ${uciMoveString}`, 
      currentPlayer === PlayerColor.WHITE ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]', false, false);
    
    setMoveHistoryUI(prev => [...prev, { 
      moveNumber: currentMoveNumberRef.current, 
      player: currentPlayer, 
      uci: uciMoveString! 
    }]);
    setCurrentGameMoves(prev => [...prev, {
      player: currentPlayer, uci: uciMoveString!, cot: cotText, strategy: currentStrategyName, moveTimestamp: Date.now(), timeTakenMs
    }]);
    
    const newHalfMove = (pieceMakingMove?.symbol === PieceSymbol.PAWN || pieceCaptured !== null)
                         ? 0 : fenParts.halfMove + 1;
    const newFullMove = currentPlayer === PlayerColor.BLACK ? fenParts.fullMove + 1 : fenParts.fullMove;
    currentMoveNumberRef.current = newFullMove;

    let newCastlingRights = fenParts.castling;
    if (pieceMakingMove?.symbol === PieceSymbol.KING) {
        if (currentPlayer === PlayerColor.WHITE) newCastlingRights = newCastlingRights.replace('K', '').replace('Q', '');
        else newCastlingRights = newCastlingRights.replace('k', '').replace('q', '');
    }
    if (parsedMove.from.row === 7 && parsedMove.from.col === 0) newCastlingRights = newCastlingRights.replace('Q', '');
    if (parsedMove.from.row === 7 && parsedMove.from.col === 7) newCastlingRights = newCastlingRights.replace('K', '');
    if (parsedMove.from.row === 0 && parsedMove.from.col === 0) newCastlingRights = newCastlingRights.replace('q', '');
    if (parsedMove.from.row === 0 && parsedMove.from.col === 7) newCastlingRights = newCastlingRights.replace('k', '');
    if (pieceCaptured?.symbol === PieceSymbol.ROOK) {
        if (parsedMove.to.row === 7 && parsedMove.to.col === 0 && pieceCaptured.color === PlayerColor.WHITE) newCastlingRights = newCastlingRights.replace('Q', '');
        if (parsedMove.to.row === 7 && parsedMove.to.col === 7 && pieceCaptured.color === PlayerColor.WHITE) newCastlingRights = newCastlingRights.replace('K', '');
        if (parsedMove.to.row === 0 && parsedMove.to.col === 0 && pieceCaptured.color === PlayerColor.BLACK) newCastlingRights = newCastlingRights.replace('q', '');
        if (parsedMove.to.row === 0 && parsedMove.to.col === 7 && pieceCaptured.color === PlayerColor.BLACK) newCastlingRights = newCastlingRights.replace('k', '');
    }
    if (newCastlingRights === "") newCastlingRights = "-";
    
    setFenParts(prev => ({ ...prev, castling: newCastlingRights, halfMove: newHalfMove, fullMove: newFullMove }));

    const nextPlayer = currentPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
    
    let gameEndReason = "";
    let gameWinner: PlayerColor | 'draw' | 'error' | undefined = undefined;

    const aiResponseTextForCheck = cotText.toLowerCase() + " " + (uciMoveString || "").toLowerCase(); 
    if (aiResponseTextForCheck.includes("checkmate")) {
      gameEndReason = `${currentAiName} announces Checkmate! ${currentAiName} wins!`;
      gameWinner = currentPlayer;
    } else if (aiResponseTextForCheck.includes("resign")) {
      gameEndReason = `${currentAiName} resigns. ${nextPlayer === PlayerColor.WHITE ? AI1_NAME : AI2_NAME} wins!`;
      gameWinner = nextPlayer;
    } else if (newHalfMove >= 100) { 
      gameEndReason = "Draw by 50-move rule.";
      gameWinner = 'draw';
    }
    
    if (gameEndReason) {
      handleGameEnd(gameEndReason, gameWinner);
      addMessageToHistory(SYSTEM_SENDER_NAME, `Game Over: ${gameEndReason}`, 'text-[var(--color-info)]', false, false);
    } else {
      setCurrentPlayer(nextPlayer);
      setGameStatus(`${nextPlayer === PlayerColor.WHITE ? 'White' : 'Black'} to move.`);
    }

    setIsLoadingAI(null);
  }, [ai1Chat, ai2Chat, boardState, currentPlayer, fenParts, addMessageToHistory, apiKeyMissing, isGameStarted, isOverallAiReady, ai1Strategy, ai2Strategy, handleGameEnd]);

  useEffect(() => {
    if (!isLoadingAI && !gameIsOverRef.current && !apiKeyMissing && (ai1Chat && ai2Chat) && isGameStarted && isOverallAiReady) {
      const timeoutId = setTimeout(() => makeAIMove(), 1500); 
      return () => clearTimeout(timeoutId);
    }
  }, [currentPlayer, isLoadingAI, makeAIMove, apiKeyMissing, ai1Chat, ai2Chat, isGameStarted, isOverallAiReady]);

  const ai1PersonaColor = 'text-[var(--color-ai1-text)]';
  const ai2PersonaColor = 'text-[var(--color-ai2-text)]';

  const renderCapturedPieces = (captured: CapturedPieces, perspective: PlayerColor) => {
    const pieceOrder: PieceSymbol[] = [PieceSymbol.QUEEN, PieceSymbol.ROOK, PieceSymbol.BISHOP, PieceSymbol.KNIGHT, PieceSymbol.PAWN];
    let displayPieces: React.ReactNode[] = [];
    pieceOrder.forEach(symbol => {
      for (let i = 0; i < captured[symbol]; i++) {
        const pieceColor = perspective === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
        displayPieces.push(
          <span key={`${symbol}-${i}-${pieceColor}`} className="text-lg mx-0.5" title={`${symbol.toUpperCase()} captured`}>
            {getPieceUnicode(symbol, pieceColor)}
          </span>
        );
      }
    });
    if (displayPieces.length === 0) return <span className="text-xs italic">None</span>;
    return displayPieces;
  };
  
  const totalWhiteCaptured = Object.values(capturedByBlack).reduce((sum, count) => sum + count, 0);
  const totalBlackCaptured = Object.values(capturedByWhite).reduce((sum, count) => sum + count, 0);
  const averageMoveTime = completedMovesForAvg > 0 ? (totalMoveTimeMs / completedMovesForAvg / 1000).toFixed(1) : "N/A";

  const availableModes = Object.values(AppMode).filter(mode => mode !== AppMode.UNIVERSE_SIM_EXE);

  const downloadJsonFile = (data: any, filename: string) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = filename;
    link.click();
    link.remove();
  };

  const handleExportLastGame = () => {
    if (gameHistoryArchive.length > 0) {
      const lastGame = gameHistoryArchive[gameHistoryArchive.length - 1];
      downloadJsonFile(lastGame, `chess-game-${lastGame.id}.json`);
    }
  };
  const handleExportGameById = (gameId: string) => {
    const gameToExport = gameHistoryArchive.find(g => g.id === gameId);
    if (gameToExport) {
        downloadJsonFile(gameToExport, `chess-game-${gameToExport.id}.json`);
    }
  };
  const handleExportAllGames = () => {
    if (gameHistoryArchive.length > 0) {
        downloadJsonFile(gameHistoryArchive, `chess-all-games-${Date.now()}.json`);
    }
  };

  const totalGames = whiteWins + blackWins + draws;
  const whiteWinPercentage = totalGames > 0 ? ((whiteWins / totalGames) * 100).toFixed(1) : "0.0";
  const blackWinPercentage = totalGames > 0 ? ((blackWins / totalGames) * 100).toFixed(1) : "0.0";
  const drawPercentage = totalGames > 0 ? ((draws / totalGames) * 100).toFixed(1) : "0.0";


  if (!isOverallAiReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-lg text-[var(--color-error)] p-4 text-center w-full">
        <p>Initializing AI for Chess Mode... Please wait.</p>
        {appInitializationError && !apiKeyMissing && (
          <div className="mt-4 text-sm text-[var(--color-error)] bg-[var(--color-bg-panel)] p-3 rounded border border-[var(--color-error)] max-w-md">
            <p className="font-semibold">An error occurred during App AI initialization:</p>
            <pre className="whitespace-pre-wrap mt-2">{appInitializationError}</pre>
          </div>
        )}
         {apiKeyMissing && (
           <div className="mt-4 text-sm text-[var(--color-error)] bg-[var(--color-bg-panel)] p-3 rounded border border-[var(--color-error)] max-w-md">
            <p className="font-semibold">API Key Missing!</p>
            <p>The API_KEY is not configured. Chess AIs cannot be initialized.</p>
          </div>
        )}
        <p className="mt-2 text-sm">If this message persists, AI initialization may have failed. Check console for errors. Ensure API key is valid and network connection is stable.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-bg-page)] text-[var(--color-text-base)] p-2 md:p-4 overflow-hidden">
      <div ref={dataDivRef} id="chess-mode-container-data" style={{ display: 'none' }}></div>
      
      <header className="flex flex-col sm:flex-row justify-between items-center mb-3 p-2 bg-[var(--color-bg-panel)] rounded-md shadow-lg">
        <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-heading)]">AI vs AI Chess Simulation</h1>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <button
                onClick={handleManualNewGame}
                className="px-3 py-1.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-xs font-semibold"
                disabled={!isGameStarted && !gameIsOverRef.current}
            >
             New Game
            </button>
            <div className="control-group space-y-1 sm:space-y-0 sm:flex sm:items-center sm:space-x-2">
            <label htmlFor="chessAppModeSelect" className="text-sm font-medium text-[var(--color-text-heading)] sr-only sm:not-sr-only">Mode:</label>
            <select
                id="chessAppModeSelect"
                value={currentAppMode}
                onChange={(e) => onModeChange(e.target.value as AppMode)}
                className="w-full sm:w-auto bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-2 rounded-sm focus-ring-accent text-xs"
            >
                {Object.values(AppMode).map(mode => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
            </select>
            </div>
             <button 
                onClick={onOpenInfoModal} 
                title="About Chess Mode"
                className="p-1.5 rounded-full hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
                aria-label="Show information about Chess mode"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-accent-300)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
            </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3 flex-grow min-h-0">
        {/* Left Column: Board and CoT */}
        <div className="flex-grow flex flex-col items-center gap-3 md:w-2/3">
          <div className="text-center p-2 bg-[var(--color-bg-panel)] rounded-md shadow-lg w-full max-w-lg">
            <p className={`text-lg font-semibold ${gameStatus.includes("White to move") ? ai1PersonaColor : gameStatus.includes("Black to move") ? ai2PersonaColor : 'text-[var(--color-text-heading)]'}`}>
              {gameStatus}
            </p>
            {isLoadingAI && (
              <p className="text-sm text-[var(--color-system-message)] animate-pulse">
                {isLoadingAI === PlayerColor.WHITE ? AI1_NAME : AI2_NAME} is thinking...
              </p>
            )}
            {!isGameStarted && isOverallAiReady && !autoRestartCountdown &&(
              <button
                onClick={handleStartGame}
                className="mt-2 px-4 py-2 bg-[var(--color-primary-500)] text-[var(--color-text-button-primary)] rounded hover:bg-[var(--color-primary-600)] focus-ring-primary text-sm font-semibold"
              >
                Start First Game
              </button>
            )}
          </div>
          <ChessBoardDisplay board={boardState} lastMove={lastMove} playerPerspective={PlayerColor.WHITE} />
          <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            <CoTDisplay title={`${AI1_NAME} (White)`} cot={cotAI1} isLoading={isLoadingAI === PlayerColor.WHITE} playerNameColor={ai1PersonaColor} />
            <CoTDisplay title={`${AI2_NAME} (Black)`} cot={cotAI2} isLoading={isLoadingAI === PlayerColor.BLACK} playerNameColor={ai2PersonaColor} />
          </div>
        </div>

        {/* Right Column: Player Stats, Move History, Game Stats, Archive */}
        <div className="w-full md:w-1/3 lg:max-w-sm flex flex-col gap-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[var(--color-bg-terminal)] border border-[var(--color-border-base)] p-2 rounded shadow">
              <h4 className={`font-semibold ${ai1PersonaColor}`}>{AI1_NAME} (White)</h4>
              <div className="text-xs mb-1">
                <label htmlFor="ai1StrategySelect" className="mr-1">Strategy:</label>
                <select 
                  id="ai1StrategySelect"
                  value={ai1Strategy} 
                  onChange={(e) => setAi1Strategy(e.target.value)}
                  className="ml-1 w-auto max-w-[150px] bg-[var(--color-bg-input)] border border-[var(--color-border-input)] text-[var(--color-text-muted)] p-0.5 rounded-sm text-xs focus-ring-accent"
                  disabled={isGameStarted && !gameIsOverRef.current && isLoadingAI === PlayerColor.WHITE}
                  aria-label={`${AI1_NAME} Strategy`}
                >
                  {CHESS_STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Pieces Captured: {totalWhiteCaptured}</p>
              <div className="flex flex-wrap items-center h-8 min-h-[2rem] text-sm">{renderCapturedPieces(capturedByBlack, PlayerColor.WHITE)}</div>
            </div>
            <div className="bg-[var(--color-bg-terminal)] border border-[var(--color-border-base)] p-2 rounded shadow">
              <h4 className={`font-semibold ${ai2PersonaColor}`}>{AI2_NAME} (Black)</h4>
               <div className="text-xs mb-1">
                <label htmlFor="ai2StrategySelect" className="mr-1">Strategy:</label>
                <select 
                  id="ai2StrategySelect"
                  value={ai2Strategy} 
                  onChange={(e) => setAi2Strategy(e.target.value)}
                  className="ml-1 w-auto max-w-[150px] bg-[var(--color-bg-input)] border border-[var(--color-border-input)] text-[var(--color-text-muted)] p-0.5 rounded-sm text-xs focus-ring-accent"
                  disabled={isGameStarted && !gameIsOverRef.current && isLoadingAI === PlayerColor.BLACK}
                  aria-label={`${AI2_NAME} Strategy`}
                >
                  {CHESS_STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Pieces Captured: {totalBlackCaptured}</p>
              <div className="flex flex-wrap items-center h-8 min-h-[2rem] text-sm">{renderCapturedPieces(capturedByWhite, PlayerColor.BLACK)}</div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-terminal)] border border-[var(--color-border-base)] p-2 rounded shadow flex flex-col min-h-[150px] max-h-56"> {/* Removed flex-1, set max-h */}
            <h4 className="text-sm font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border-strong)] pb-1 mb-1">Move History (Current Game)</h4>
            <ul className="text-xs text-[var(--color-text-muted)] overflow-y-auto log-display flex-grow pr-1">
              {moveHistoryUI.length === 0 && !isGameStarted && <li className="italic">Game has not started.</li>}
              {moveHistoryUI.length === 0 && isGameStarted && <li className="italic">No moves yet.</li>}
              {moveHistoryUI.map((move, index) => (
                <li key={index} className={`${move.player === PlayerColor.WHITE ? ai1PersonaColor : ai2PersonaColor} mb-0.5`}>
                  {move.player === PlayerColor.WHITE ? `${move.moveNumber}. ` : ""} 
                  {move.player === PlayerColor.WHITE ? "W: " : "B: "} 
                  {move.uci}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[var(--color-bg-terminal)] border border-[var(--color-border-base)] p-2 rounded shadow flex-1 min-h-[180px]"> {/* Kept flex-1, so it grows */}
            <h4 className="text-sm font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border-strong)] pb-1 mb-1">Game Statistics (Current Session)</h4>
            <div className="text-xs text-[var(--color-text-muted)] space-y-0.5">
              <p>Total Moves (Current Game): {moveHistoryUI.length}</p>
              <p>Avg Move Time: {averageMoveTime}s</p>
              <p>FullMove Clock: {fenParts.fullMove}</p>
              <p>HalfMove Clock: {fenParts.halfMove}</p>
              <p>Game Phase: {getGamePhase(fenParts.fullMove)}</p>
              <p>Castling: {fenParts.castling === "-" ? "None" : fenParts.castling}</p>
              <p>En Passant: {fenParts.enPassant === "-" ? "None" : fenParts.enPassant}</p>
              <hr className="border-[var(--color-border-strong)] opacity-30 my-1"/>
              <p>White Wins ({AI1_NAME}): {whiteWins} ({whiteWinPercentage}%)</p>
              <p>Black Wins ({AI2_NAME}): {blackWins} ({blackWinPercentage}%)</p>
              <p>Draws: {draws} ({drawPercentage}%)</p>
              <p>Current Streak: {currentStreak.player ? `${currentStreak.player === PlayerColor.WHITE ? AI1_NAME : currentStreak.player === PlayerColor.BLACK ? AI2_NAME : 'Draw'}: ${currentStreak.count}` : 'None'}</p>
              <p>Longest White Streak: {longestWhiteStreak}</p>
              <p>Longest Black Streak: {longestBlackStreak}</p>
            </div>
          </div>
          
          <div className="bg-[var(--color-bg-terminal)] border border-[var(--color-border-base)] p-2 rounded shadow flex flex-col min-h-[150px] max-h-56"> {/* Removed flex-1, set max-h */}
            <div className="flex justify-between items-center border-b border-[var(--color-border-strong)] pb-1 mb-1">
                <h4 className="text-sm font-semibold text-[var(--color-text-heading)]">Game History Archive</h4>
                <button
                    onClick={handleExportAllGames}
                    disabled={gameHistoryArchive.length === 0}
                    className="px-2 py-0.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-xs"
                    title="Export all archived games"
                >
                    Export All
                </button>
            </div>
            <ul className="text-xs text-[var(--color-text-muted)] overflow-y-auto log-display flex-grow pr-1">
                {gameHistoryArchive.length === 0 && <li className="italic">No games archived yet.</li>}
                {gameHistoryArchive.slice().reverse().map((game, index) => ( // Show newest first
                    <li key={game.id} className="mb-1 p-1 border-b border-dashed border-[var(--color-border-base)] border-opacity-30">
                        <div className="flex justify-between items-center">
                            <span>
                                Game {gameHistoryArchive.length - index}: {game.outcome.winner === PlayerColor.WHITE ? AI1_NAME : game.outcome.winner === PlayerColor.BLACK ? AI2_NAME : game.outcome.winner.toUpperCase()} wins ({Math.ceil(game.moves.length/2)} moves)
                            </span>
                            <button
                                onClick={() => handleExportGameById(game.id)}
                                className="px-1.5 py-0.5 bg-[var(--color-primary-700)] text-[var(--color-text-button-primary)] rounded hover:bg-[var(--color-primary-600)] focus-ring-accent text-[10px]"
                                title="Export this game"
                            >
                                Export
                            </button>
                        </div>
                         <small className="block opacity-70">{new Date(game.endTime).toLocaleString()}</small>
                    </li>
                ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChessModeContainer;