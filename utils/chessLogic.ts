
import { ChessBoardState, ChessPiece, ChessSquare, PieceSymbol, PlayerColor, UCIMove } from '../types';

export const INITIAL_BOARD_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function getPieceUnicode(piece: PieceSymbol, color: PlayerColor): string {
  switch (color) {
    case PlayerColor.WHITE:
      switch (piece) {
        case PieceSymbol.KING: return '♔';
        case PieceSymbol.QUEEN: return '♕';
        case PieceSymbol.ROOK: return '♖';
        case PieceSymbol.BISHOP: return '♗';
        case PieceSymbol.KNIGHT: return '♘';
        case PieceSymbol.PAWN: return '♙';
      }
      break;
    case PlayerColor.BLACK:
      switch (piece) {
        case PieceSymbol.KING: return '♚';
        case PieceSymbol.QUEEN: return '♛';
        case PieceSymbol.ROOK: return '♜';
        case PieceSymbol.BISHOP: return '♝';
        case PieceSymbol.KNIGHT: return '♞';
        case PieceSymbol.PAWN: return '♟︎'; // Note: Added U+FE0E for explicit rendering
      }
      break;
  }
  return '';
}

export function fenToBoard(fen: string): { board: ChessBoardState; currentPlayer: PlayerColor; castling: string; enPassant: string; halfMove: number; fullMove: number; } {
  const parts = fen.split(' ');
  const piecePlacement = parts[0];
  const rows = piecePlacement.split('/');

  const board: ChessBoardState = Array(8).fill(null).map(() => Array(8).fill(null));

  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const char of rows[r]) {
      if (isNaN(parseInt(char))) {
        const color = char === char.toUpperCase() ? PlayerColor.WHITE : PlayerColor.BLACK;
        const symbol = char.toLowerCase() as PieceSymbol;
        board[r][c] = { symbol, color };
        c++;
      } else {
        c += parseInt(char);
      }
    }
  }
  return {
    board,
    currentPlayer: parts[1] as PlayerColor,
    castling: parts[2],
    enPassant: parts[3],
    halfMove: parseInt(parts[4]),
    fullMove: parseInt(parts[5]),
  };
}

export function boardToFen(
    board: ChessBoardState, 
    currentPlayer: PlayerColor, 
    castling: string, 
    enPassant: string, 
    halfMove: number, 
    fullMove: number
): string {
  let fen = "";
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    for (let c = 0; c < 8; c++) {
      const square = board[r][c];
      if (square) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        fen += square.color === PlayerColor.WHITE ? square.symbol.toUpperCase() : square.symbol.toLowerCase();
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    if (r < 7) {
      fen += "/";
    }
  }
  fen += ` ${currentPlayer} ${castling} ${enPassant} ${halfMove} ${fullMove}`;
  return fen;
}


export function uciToCoords(uciMove: string): UCIMove | null {
  if (uciMove.length < 4 || uciMove.length > 5) return null;
  const fromColChar = uciMove[0];
  const fromRowChar = uciMove[1];
  const toColChar = uciMove[2];
  const toRowChar = uciMove[3];
  const promotionChar = uciMove.length === 5 ? uciMove[4] : undefined;

  const colMap: { [key: string]: number } = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
  
  const fromCol = colMap[fromColChar];
  const fromRow = 8 - parseInt(fromRowChar);
  const toCol = colMap[toColChar];
  const toRow = 8 - parseInt(toRowChar);

  if (fromCol === undefined || isNaN(fromRow) || toCol === undefined || isNaN(toRow) ||
      fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
      toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
    return null;
  }
  
  let promotionPiece: PieceSymbol | undefined = undefined;
  if (promotionChar) {
    const validPromotionSymbols = [PieceSymbol.QUEEN, PieceSymbol.ROOK, PieceSymbol.BISHOP, PieceSymbol.KNIGHT];
    if (validPromotionSymbols.includes(promotionChar as PieceSymbol)) {
      promotionPiece = promotionChar as PieceSymbol;
    } else {
      return null; // Invalid promotion character
    }
  }

  return {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    promotion: promotionPiece,
  };
}

export function applyMoveToBoard(board: ChessBoardState, uciMove: UCIMove): ChessBoardState {
  const newBoard = board.map(row => row.slice()) as ChessBoardState; // Deep copy
  const pieceToMove = newBoard[uciMove.from.row][uciMove.from.col];

  if (pieceToMove) {
    // Standard move part
    newBoard[uciMove.to.row][uciMove.to.col] = pieceToMove;
    newBoard[uciMove.from.row][uciMove.from.col] = null;

    // Handle castling rook movement
    if (pieceToMove.symbol === PieceSymbol.KING) {
      const colDiff = uciMove.to.col - uciMove.from.col;
      if (colDiff === 2) { // Kingside castle
        const rook = newBoard[uciMove.from.row][7]; // Rook from h-file (col 7)
        if (rook && rook.symbol === PieceSymbol.ROOK && rook.color === pieceToMove.color) {
            newBoard[uciMove.from.row][5] = rook; // Rook to f-file (col 5)
            newBoard[uciMove.from.row][7] = null;
        }
      } else if (colDiff === -2) { // Queenside castle
        const rook = newBoard[uciMove.from.row][0]; // Rook from a-file (col 0)
         if (rook && rook.symbol === PieceSymbol.ROOK && rook.color === pieceToMove.color) {
            newBoard[uciMove.from.row][3] = rook; // Rook to d-file (col 3)
            newBoard[uciMove.from.row][0] = null;
        }
      }
    }

    // Handle promotion
    if (uciMove.promotion && pieceToMove.symbol === PieceSymbol.PAWN) {
      if ((pieceToMove.color === PlayerColor.WHITE && uciMove.to.row === 0) ||
          (pieceToMove.color === PlayerColor.BLACK && uciMove.to.row === 7)) {
        newBoard[uciMove.to.row][uciMove.to.col] = { ...pieceToMove, symbol: uciMove.promotion };
      }
    }
  }
  return newBoard;
}

export function isMoveValid(board: ChessBoardState, uciMove: UCIMove, player: PlayerColor): boolean {
  // Check if 'from' and 'to' squares are the same
  if (uciMove.from.row === uciMove.to.row && uciMove.from.col === uciMove.to.col) {
    console.warn(`isMoveValid: Invalid move - 'from' and 'to' squares are identical: ${String.fromCharCode(97 + uciMove.from.col)}${8 - uciMove.from.row}`);
    return false;
  }

  const fromSquare = board[uciMove.from.row]?.[uciMove.from.col];
  
  if (!fromSquare) {
    console.warn(`isMoveValid: No piece at source square ${String.fromCharCode(97 + uciMove.from.col)}${8 - uciMove.from.row}`);
    return false; 
  }
  
  const piece = fromSquare; // Renamed for clarity
  if (piece.color !== player) {
    console.warn(`isMoveValid: Piece at source ${String.fromCharCode(97 + uciMove.from.col)}${8 - uciMove.from.row} is not player's piece. Piece color: ${piece.color}, Player: ${player}`);
    return false; 
  }

  const targetSquareContent = board[uciMove.to.row]?.[uciMove.to.col];
  if (targetSquareContent && targetSquareContent.color === player) {
    console.warn(`isMoveValid: Cannot capture own piece at target ${String.fromCharCode(97 + uciMove.to.col)}${8 - uciMove.to.row}`);
    return false; // Cannot capture own piece
  }

  // Special handling for King moves to allow for castling UCI
  if (piece.symbol === PieceSymbol.KING) {
    const colDiff = Math.abs(uciMove.to.col - uciMove.from.col);
    const rowDiff = Math.abs(uciMove.to.row - uciMove.from.row);

    if (rowDiff === 0 && colDiff === 2) {
      // This is a castling attempt (e.g., e1g1, e8g8, e1c1, e8c8)
      // For basic validation, we allow this. Full castling legality (rights, path clear, not in check)
      // is handled by more complex logic (or implicitly by AI knowing the rules).
      // The key is that applyMoveToBoard will handle moving the rook.
    } else if (colDiff <= 1 && rowDiff <= 1 && (colDiff !== 0 || rowDiff !== 0)) {
      // Standard 1-square king move
    } else {
      console.warn(`isMoveValid: Invalid king move pattern for King. From ${uciMove.from.row},${uciMove.from.col} To ${uciMove.to.row},${uciMove.to.col}`);
      return false;
    }
  }


  // Enhanced promotion validation
  if (uciMove.promotion) {
    if (piece.symbol !== PieceSymbol.PAWN) {
      console.warn(`isMoveValid: Invalid promotion attempt - piece is not a pawn. Piece: ${piece.symbol}`);
      return false; // Only pawns can promote
    }
    if (piece.color === PlayerColor.WHITE && uciMove.to.row !== 0) {
      console.warn(`isMoveValid: Invalid promotion attempt - White pawn not on rank 0. To row: ${uciMove.to.row}`);
      return false; // White promotes on rank 0 (board index)
    }
    if (piece.color === PlayerColor.BLACK && uciMove.to.row !== 7) {
      console.warn(`isMoveValid: Invalid promotion attempt - Black pawn not on rank 7. To row: ${uciMove.to.row}`);
      return false; // Black promotes on rank 7 (board index)
    }
  }
  
  // TODO: Add actual chess rules validation (piece movement, captures, check, etc.)
  // For now, this is a placeholder for much more complex logic.
  // We're mostly relying on the AI providing valid moves that adhere to FEN.

  return true; 
}

// Placeholder for game status check
export function getGameStatus(board: ChessBoardState, currentPlayer: PlayerColor): string {
  // TODO: Implement check, checkmate, stalemate detection
  // For now, just indicate whose turn it is.
  return `${currentPlayer === PlayerColor.WHITE ? 'White' : 'Black'} to move.`;
}
