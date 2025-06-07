
# OVERMIND UI Project TODO

## Project Overview & Key Info
- **Description**: Multi-modal AI interaction simulation environment.
- **Core AI**: Gemini API (GEM-Q & AXIOM personas).
- **UI**: Terminal-style interface with dynamic content generation, export, backup/restore.
- **Modes**:
    - `spiral.exe` (Recursive self-improvement dialogue)
    - `hyperstition-chat.exe` (Memetic constructs dialogue)
    - `semantic_escape.exe` (Linguistic deconstruction dialogue)
    - `universe-sim.exe` (Narrative universe simulation)
    - `chess-sim.exe` (AI vs AI chess game with CoT display)
    - `corruption.exe` (Cognitive reshaping AI dialogue)
    - `noospheric-conquest.exe` (Strategic map-based AI conflict)
    - `story_weaver.exe` (Collaborative narrative with dynamic image generation)
- **Key Technologies**: React, TypeScript, TailwindCSS, esbuild (implied by esm.sh imports), Google GenAI SDK.
- **API Key Management**: Must be via `process.env.API_KEY`.

## Phase 1: Core Functionality & Initial Modes (Completed)
- [X] Basic application structure (index.html, index.tsx, App.tsx).
- [X] Matrix background effect.
- [X] Terminal window component for displaying conversations.
    - [X] Terminal window sizing fixed for non-chess modes.
- [X] Controls panel for user interactions.
- [X] Gemini API integration (`GoogleGenAI`).
- [X] AI persona definition and system prompts.
- [X] Core dialogue loop for AI vs AI interaction.
    - [X] `spiral.exe` mode auto-starts dialogue correctly.
    - [X] Persona mix-up in `spiral.exe` mode resolved (AXIOM now starts).
- [X] Typing effect for AI messages.
- [X] Conversation history management.
- [X] User intervention mechanism.
- [X] Export chat to TXT and MD.
- [X] Backup and restore conversation (.JSON).
- [X] Multiple themes (Terminal, Cyanotype, Redzone, CyberpunkYellow, NoosphericDark) & theme switching.
- [X] `spiral.exe`, `hyperstition-chat.exe`, `semantic_escape.exe`, `universe-sim.exe`, `corruption.exe` modes implemented.
- [X] Error handling for API key and AI initialization (initial versions, improved over time).
- [X] FPS display & Command history for user inputs.
- [X] Initial Chess Mode (`chess-sim.exe`) Setup:
    - [X] Basic chess logic (FEN parsing, UCI move application - initial version).
    - [X] Chess board display component.
    - [X] Chain of Thought (CoT) display components.
    - [X] AI personas for chess (GEM-Q White, AXIOM Black) with enhanced system prompts.
    - [X] Game loop for AI turns in chess (initial version).