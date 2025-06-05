# OVERMIND UI - Issue Tracking & Resolution Log

This document tracks significant issues encountered during the development of the OVERMIND UI, the steps taken to diagnose them, and the solutions implemented.

## 1. AI Initialization Failures

### Symptoms:
- Application stuck on loading screens (e.g., "Initializing AI for Chess Mode...").
- Errors like "GEM-Q unavailable. Game over." in Chess Mode.
- Generic API key error messages initially blocking the entire UI.
- Inconsistent AI readiness, especially when switching modes or loading backups.

### Troubleshooting & Solutions:
- **API Key Check & SDK Initialization (`App.tsx`):**
    - Ensured `process.env.API_KEY` is checked early.
    - Global `GoogleGenAI` instance (`genAI.current`) initialized once on App mount to prevent multiple initializations.
    - Displayed a persistent top banner error if API key is missing, allowing the rest of the UI to attempt rendering.
- **`initializeAI` Function Refinement (`App.tsx`):**
    - Added more granular logging to trace success/failure of `genAI.current.chats.create()` for each persona.
    - Implemented an `initializationError` state to capture and display specific failures from `initializeAI` in the UI, particularly for Chess Mode.
    - Ensured `Chat` instances are correctly created with appropriate system prompts and history context based on the current `AppMode` and whether a backup is being loaded.
- **Chess Mode Specific Initialization (`App.tsx`, `ChessModeContainer.tsx`):**
    - Made `ChessModeContainer` rendering conditional on AI chat instances (`ai1ChatRef`, `ai2ChatRef`) being successfully initialized and passed as props (`isAiReadyForChess` state in `App.tsx`).
    - `ChessModeContainer` now displays its own loading/error messages based on props from `App.tsx` rather than `App.tsx` showing a full-screen block.
    - Added `chessResetTokenRef` to help ensure `ChessModeContainer` remounts and reinitializes correctly when switching to/loading chess games.
- **Mode Switching Logic (`App.tsx`):**
    - `resetAndInitializeForNewMode` function overhauled to cleanly reset all relevant states (conversation history, turn counts, AI chat refs, chess-specific states) before calling `initializeAI` for the new mode.
- **Status**: Largely resolved. Robust error display and graceful handling of initialization failures are key.

## 2. AI Chess Move Formatting & Validity Errors

This has been an iterative process, primarily involving prompt engineering and client-side parsing/validation adjustments. The core challenge is the AI's occasional inability to strictly adhere to UCI format or correctly interpret the FEN, leading to illegal moves.

### Symptoms:
- Errors like "AI did not provide a move in the expected UCI format."
- Errors like "AI proposed an invalid move (basic check failed): [move]."
- Game ending prematurely due to the AI making clearly illegal moves not caught by basic parsing (e.g., moving opponent's piece, moving from empty square, misidentifying own piece after castling).
- AI announcing "Checkmate" in CoT when the client-side state does not (yet) validate this.

### Iterative Troubleshooting & Solutions:

1.  **Initial Prompts & Parsing (`constants.ts`, `ChessModeContainer.tsx`):**
    *   Initial system prompts for chess AIs instructed them to use UCI format and provide a CoT.
    *   Basic regex parsing in `makeAIMove` for `MOVE: [UCI]` and `COT: [text]`.
2.  **Strict UCI Format Enforcement (Attempt 1 - Prompts):**
    *   System prompts updated to be *extremely* explicit: "Your move MUST be in UCI (Universal Chess Interface) format. (e.g., 'e2e4', 'g1f3'). For pawn promotion, use 5 characters ONLY, e.g., 'e7e8q'."
    *   Explicitly forbade short algebraic notation (e.g., "Nf3") in prompts.
    *   *Outcome:* Reduced some errors, but AIs sometimes still used short notation or other formats.
3.  **Client-Side Check for Malformed 5-Char Moves (`ChessModeContainer.tsx`):**
    *   Added a check: if a 5-character UCI move is provided, the 5th character *must* be 'q', 'r', 'b', or 'n'.
    *   *Outcome:* Caught specific malformed promotion attempts.
4.  **Lenient Parsing for Algebraic Captures (`ChessModeContainer.tsx`):**
    *   Observed AIs frequently using "x" for captures (e.g., "d5xc6").
    *   Added a secondary regex `MOVE:\s*([a-h][1-8])x([a-h][1-8])\s*` to `makeAIMove`.
    *   If the primary UCI regex fails, this secondary regex attempts to parse the algebraic capture and converts it to UCI (e.g., "d5xc6" -> "d5c6"). A warning is logged.
    *   *Outcome:* Significantly improved game continuation by salvaging these common "slightly off" moves.
5.  **FEN as Sole Source of Truth (Prompt Engineering):**
    *   System prompts heavily re-emphasized: "**IMPORTANT: The board state is ALWAYS provided to you in Forsyth-Edwards Notation (FEN). This FEN string is the SOLE SOURCE OF TRUTH for the current piece positions. Base your move analysis ONLY on this FEN.**"
    *   Warned that moves invalid based on FEN will be rejected.
    *   *Outcome:* Helped, but AI "hallucinations" about piece positions still occurred.
6.  **Basic Castling Logic Implementation (`utils/chessLogic.ts`, `ChessModeContainer.tsx`):**
    *   AI was attempting castling moves (e.g., "e1g1") which `isMoveValid` (basic) initially rejected as an invalid King move pattern.
    *   `isMoveValid` updated to recognize UCI castling strings for a King as *potentially* valid at a basic level.
    *   `applyMoveToBoard` updated to correctly move both the King and the Rook during castling.
    *   `makeAIMove` in `ChessModeContainer` updated to correctly modify FEN castling rights after King/Rook moves or Rook captures.
    *   *Outcome:* Enabled castling moves, but revealed deeper AI state tracking issues.
7.  **Addressing AI Piece Misidentification (Post-Castling Hallucination - Prompt Engineering - Ongoing):**
    *   Symptom: AI (e.g., GEM-Q as White) after castling kingside (King on g1, Rook on f1) would try to move "Rook from g1" (`g1f1`), which is an illegal move as g1 contains the King and f1 its own Rook.
    *   System prompts updated with: "**CRUCIAL PIECE IDENTIFICATION: Before generating your UCI move, internally verify the type and color of the piece on your intended 'from' square using ONLY the provided FEN string. For example, if the FEN ... shows '...R...RFK', the piece on g1 is 'K' (King), and the piece on f1 is 'R' (Rook).**"
    *   Added more explicit examples of FEN interpretation for piece ID in prompts (latest attempts).
    *   *Outcome:* This remains an **ongoing challenge**. While helpful, the AI can still occasionally misinterpret the FEN for specific piece locations, especially in complex or unusual board states or if its internal state tracking diverges. The client-side `isMoveValid` correctly catches the *illegality* of the proposed move (e.g., "Cannot capture own piece at target f1"), but the root cause is AI misinterpretation.
8.  **Invalid Source Square Moves (e.g., "d7d6" when d7 is empty - Prompt Engineering - Ongoing):**
    *   Symptom: AI attempts to move a piece from an empty square.
    *   Prompt Refinement: Further emphasis on FEN as the sole source of truth for piece presence. Added specific instruction: *"Before generating your UCI move, internally verify the type and color of the piece on your intended 'from' square using ONLY the provided FEN string."*
    *   Client-side `isMoveValid`: Catches this by checking if `board[from.row][from.col]` is null.
    *   *Outcome:* Client-side validation prevents illegal moves, but the AI's error indicates a persistent misreading of the FEN.
9.  **Invalid Move "from" and "to" are Same Square (e.g., e5e5):**
    *   Symptom: AI attempts to move a piece to its own square.
    *   Solution: Added an explicit check in `isMoveValid` in `utils/chessLogic.ts` to disallow such moves.
    *   *Outcome:* Client correctly identifies this specific error. AI generation of such moves still points to deeper issues.
10. **Retry Logic for AI Moves (`ChessModeContainer.tsx`):**
    *   Implemented a retry loop in `makeAIMove` allowing the AI up to `MAX_CHESS_RETRY_ATTEMPTS` (currently 2) to provide a valid move if its initial attempt fails parsing or `isMoveValid`.
    *   The AI is re-prompted with information about its previous error.
    *   *Outcome:* Significantly improves game continuity by allowing the AI to self-correct on formatting or basic rule violations, reducing premature game ends.
- **Status**: Iteratively improved. Client-side validation is robust for basic errors. AI's adherence to complex rules and FEN interpretation remains the primary area for ongoing prompt engineering. Retry logic helps mitigate some AI errors.

## 3. Chess Mode Startup Flow & Initial UI Presentation

### Symptom:
- Initially, if Chess mode was selected by default, the UI might not show the `ControlsPanel` for mode switching before the initial "Y/N" prompt was resolved, or it would show a chess-specific loading screen that preempted the main app's Y/N flow. The user desired to always see the main UI layout (Terminal + ControlsPanel) during the initial Y/N prompt for mode discovery.

### Solution (`App.tsx`):
- The main application layout logic in `App.tsx` (`renderAppContent` and the main `div`'s class styling) was adjusted.
- **When `isAwaitingInitialStart` is true**:
    - The `renderAppContent` function now *always* returns a structure that includes both the `TerminalWindow` (for the Y/N prompt) and the `ControlsPanel`.
    - The `TerminalWindow` is displayed in the main content area, and the `ControlsPanel` is visible alongside it.
- This ensures the user can see the selected mode, interact with the `ControlsPanel` to change it if desired, and then respond "Y" or "N" within the full UI context.
- The `ChessModeContainer` only takes over the full view if `currentMode` is `CHESS_SIM_EXE` *and* `isAwaitingInitialStart` is `false`.
- **Status**: Resolved.

## 4. UI Layout & Overlap Issues (Chess Mode)

### Symptom:
- UI panels (Move History, Game Statistics, Game History Archive) in `ChessModeContainer` would overlap at certain browser zoom levels or on smaller screens.

### Solution (`ChessModeContainer.tsx`):
- Adjusted CSS flexbox properties:
    - Game Statistics panel set to `flex-1` to allow it to grow and take available vertical space.
    - Move History and Game History Archive panels given fixed `max-h` (max-height) values and `overflow-y-auto` to enable internal scrolling.
- **Status**: Resolved.

## 5. Missing `CHESS_STRATEGIES` Constant

### Symptom:
- JavaScript runtime error: `CHESS_STRATEGIES` not defined/imported in `ChessModeContainer.tsx`.

### Solution:
- Defined and exported the `CHESS_STRATEGIES` array in `constants.ts`.
- Ensured `ChessModeContainer.tsx` correctly imports this constant.
- **Status**: Resolved.

## 6. TypeScript Errors in `App.tsx` (Early Development)

### Symptoms:
- TypeScript compilation error due to a redundant type comparison in a `useEffect` hook.
- TypeScript compilation error: "Cannot find name 'ControlsPanel'".

### Solutions:
- Removed the redundant type comparison.
- Added `import ControlsPanel from './components/ControlsPanel';`.
- **Status**: Resolved.

## 7. Persona/Color Mix-up in `spiral.exe` Mode

### Symptom:
- In `spiral.exe` mode, AI personas were textually mixed up (GEM-Q speaking as AXIOM, or vice-versa), and AXIOM's messages were sometimes displayed in GEM-Q's color.

### Troubleshooting & Solutions:
- Initial attempts involved modifying `GEM_Q_INITIATION_PROMPT` or having GEM-Q process the Facilitator's message directly. These did not fully resolve the issue.
- **Final Solution**: Changed the turn order for `spiral.exe` mode.
    - AXIOM (AI2) now initiates the dialogue in response to the Facilitator.
    - `SPIRAL_EXE_MODE_START_MESSAGES` in `constants.ts` updated to prompt AXIOM.
    - In `resetAndInitializeForNewMode` (`App.tsx`), `nextAiToSpeakRef.current` is set to `'AI2'` when `spiral.exe` is started fresh.
    - `handleAiTurn` logic adjusted for AXIOM's first turn to correctly process the Facilitator's message.
- **Status**: Resolved. The persona and color misattributions in `spiral.exe` appear to be fixed.

## 8. Terminal Window Sizing in Non-Chess Modes

### Symptom:
- The terminal window (chat interface) in modes other than chess was too narrow by default and only expanded once text filled in.

### Solution (`App.tsx`):
- The `main` HTML element wrapping the `TerminalWindow` was given `flex-grow` to allow it to expand.
- The `className` prop for `TerminalWindow` was updated to include `w-full` to ensure it fills its parent.
- **Status**: Resolved.

## 9. `spiral.exe` Mode Not Auto-Starting Dialogue

### Symptom:
- Unlike other AI-to-AI modes, `spiral.exe` required a "Send Intervention" action to begin the dialogue after the initial "Y" confirmation.

### Solution (`App.tsx`, `constants.ts`):
- `SPIRAL_EXE_MODE_START_MESSAGES` (now prompting AXIOM) ensures a Facilitator message is present.
- `resetAndInitializeForNewMode` processes these messages.
- The main AI turn-handling `useEffect` in `App.tsx` is triggered correctly by the Facilitator's message (as `lastRelevantMessage.sender === FACILITATOR_SENDER_NAME`), which then calls `handleAiTurn` for AXIOM.
- **Status**: Resolved. `spiral.exe` now starts automatically.
