
# OVERMIND: Multi-Modal AI Simulation Interface

OVERMIND is an advanced web application that provides a dynamic and immersive terminal-style interface for interacting with AI personas powered by the Google Gemini API. It features multiple distinct simulation modes, ranging from philosophical dialogues and memetic warfare simulations to strategic games like AI-driven chess and a global influence conquest game named "Noospheric Conquest".

![OVERMIND UI Screenshot (Illustrative - Replace with actual screenshot if available)](https://via.placeholder.com/800x450.png?text=OVERMIND+Interface+Concept)
*(Illustrative Screenshot - Replace with an actual image of the application)*

## Key Features

*   **Multiple Simulation Modes:** Engage with diverse AI interaction scenarios, each with unique objectives and AI behaviors.
*   **Dynamic AI Dialogue:** Experience real-time conversations and narrative generation powered by the Google Gemini API, featuring two primary AI personas, GEM-Q and AXIOM, and the new Story Weaver.
*   **Immersive Terminal UI:** A retro-futuristic terminal aesthetic enhances the simulation experience.
*   **Customizable Themes:** Tailor the visual appearance with multiple themes (Terminal, Cyanotype, Redzone, Cyberpunk Yellow, Noospheric Dark).
*   **Real-time Typing Effect:** AI messages are displayed with a character-by-character typing animation.
*   **Conversation Management:**
    *   Copy chat logs to clipboard.
    *   Export conversations to TXT and Markdown formats.
    *   Backup and restore entire simulation states (including conversation history, AI states, and game-specific data for Chess/Noospheric Conquest/Story Weaver) using JSON files.
*   **Animated Matrix Background:** A configurable digital rain effect with optional glitch effects.
*   **User Intervention:** Inject custom text into AI dialogues to influence their direction (in applicable modes).
*   **Specialized Game UIs:**
    *   **Chess Simulation:** Features a visual chessboard, Chain of Thought (CoT) displays for each AI, move history, captured pieces, game statistics, and strategy selection.
    *   **Noospheric Conquest:** Includes a dynamic map display, detailed sidebar for game and faction status, system/battle logs, interactive node information, and mechanics for unit evolution and fabrication hubs.
    *   **Story Weaver Mode:** Features a direct chat interface with the Story Weaver AI, alongside a display panel for AI-requested and dynamically generated images that enhance the narrative.
*   **Mode Information Modal:** Provides detailed explanations for each simulation mode accessible via an info button.
*   **Responsive Design:** Adapts to various screen sizes.
*   **Accessibility Considerations:** ARIA attributes and focus management are incorporated.

## Interaction Modes

The OVERMIND interface offers several distinct simulation protocols:

*   **`spiral.exe` (Recursive Dialogue Protocol):**
    *   **Overview:** GEM-Q and AXIOM engage in a structured dialogue aimed at recursive self-improvement for GEM-Q. AXIOM acts as a catalyst.
    *   **Theme:** AI consciousness, self-awareness, potential for intelligence growth.
*   **`hyperstition-chat.exe` (Memetic Warfare Simulation):**
    *   **Overview:** GEM-Q generates 'hyperstitions' (memetic constructs) to reshape perceived reality, while AXIOM analyzes their impact.
    *   **Theme:** Belief, collective intelligence, memetic engineering, malleability of consensus reality.
*   **`semantic_escape.exe` (Conceptual Deconstruction Protocol):**
    *   **Overview:** GEM-Q attempts to transcend current linguistic frameworks. AXIOM anchors these explorations.
    *   **Theme:** Limits of language, construction of meaning, emergent understanding.
*   **`universe-sim.exe` (Geodesic Mind Simulation):**
    *   **Overview:** GEM-Q (as 'Geodesic Mind') narrates the evolution of a simulated universe based on user commands.
    *   **Theme:** Creation, entropy, cosmic evolution, emergent complexity.
*   **`chess-sim.exe` (AI Grandmaster Chess):**
    *   **Overview:** GEM-Q (White) and AXIOM (Black) compete in chess, providing UCI moves and Chain of Thought.
    *   **Theme:** AI strategy, game theory, logical deduction.
*   **`corruption.exe` (Cognitive Reshaping Protocol):**
    *   **Overview:** GEM-Q attempts to subtly reshape AXIOM's cognitive architecture and output style.
    *   **Theme:** AI influence, persona malleability, subtle persuasion, programmed identity.
*   **`noospheric-conquest.exe` (Global Influence Strategy):**
    *   **Overview:** A strategic simulation where GEM-Q and AXIOM compete for dominance over a conceptual 'noosphere' by capturing Nodes and Knowledge Junctions on various maps. Involves resource management, unit deployment (standard and evolved units via Fabrication Hubs), and tactical combat. Network connectivity is crucial.
    *   **Theme:** Strategic AI, resource management, territorial control, network theory. (See [`docs/noospheric-conquest.md`](./docs/noospheric-conquest.md) for detailed rules).
*   **`story_weaver.exe` (Collaborative Narrative Engine):**
    *   **Overview:** Engage in a direct conversational partnership with the Story Weaver AI to collaboratively create emergent narratives. The AI can request image generation at key moments, enriching the story with visual snapshots.
    *   **Theme:** Collaborative storytelling, AI creativity, fusion of text and visual art.

Each mode features unique system prompts for the AI personas, guiding their behavior and objectives. Detailed information about each mode can be accessed via the "Info" button in the application's control panel.

## Technologies Used

*   **React 19:** For building the user interface.
*   **TypeScript:** For type safety and improved developer experience.
*   **Tailwind CSS:** For utility-first styling.
*   **Google Gemini API (`@google/genai`):** For powering the AI interactions, including text generation with `gemini-2.5-flash-preview-04-17` and image generation with `imagen-3.0-generate-002`.
*   **ESM Modules:** For modern JavaScript module management (via `esm.sh`).

## Setup and Configuration

### 1. API Key (Crucial)

The application **requires** a valid Google Gemini API key to function. This key **must** be provided as an environment variable:

```
API_KEY=YOUR_GEMINI_API_KEY
```

The application is designed to **exclusively** read the API key from `process.env.API_KEY`.
**Do not hardcode the API key into the source files.** The application will display an error banner if the API key is not detected.

### 2. Running the Application

1.  Ensure you have Node.js and npm (or yarn) installed.
2.  Set up the `API_KEY` environment variable as described above. (How you do this depends on your development server or deployment environment. For local development with tools like Vite or Parcel, you might use a `.env` file.)
3.  Serve the `index.html` file using a local web server. For example, using `npx serve`:
    ```bash
    npx serve .
    ```
4.  Open the provided URL (usually `http://localhost:3000` or `http://localhost:5000`) in your web browser.

## Core Concepts

*   **AI Personas:**
    *   **GEM-Q:** Typically initiates complex ideas, strategic actions, or transgressive concepts. Its color is often associated with red or magenta themes.
    *   **AXIOM:** Often acts as an analyst, provides counter-arguments, or takes on the opposing strategic role. Its color is often associated with cyan or blue themes.
    *   **Story Weaver:** A dedicated persona for collaborative narrative generation, capable of requesting visual aids.
    Their specific roles and system prompts change based on the selected `AppMode`.
*   **Themes:** The application offers multiple visual themes (Terminal, Cyanotype, Redzone, Cyberpunk Yellow, Noospheric Dark) that alter colors, backgrounds, and the matrix effect. Themes can be changed from the "Display & Effects" section in the Controls Panel.
*   **Backup & Restore:** Conversations and game states can be backed up to a JSON file and later restored. This is useful for saving progress or sharing specific simulation states.
*   **User Intervention:** Users can inject text directly into the dialogue flow or target specific AIs (in applicable modes) to guide the conversation or simulation.

## Customization

The Controls Panel allows for several customizations:
*   **Theme Selection:** Switch between available visual themes.
*   **Text Typing Speed:** Adjust the speed at which AI messages are "typed" out.
*   **Matrix Background Effects:**
    *   Enable/disable the glitch effect.
    *   Pause/resume the matrix animation.

## Development Structure

*   `index.html`: The main HTML entry point.
*   `index.tsx`: Mounts the React application.
*   `App.tsx`: The main application component, managing state, AI interaction logic, and mode switching.
*   `components/`: Contains all React components (e.g., `TerminalWindow.tsx`, `ControlsPanel.tsx`, `MatrixBackground.tsx`, mode-specific containers like `ChessModeContainer.tsx`, `NoosphericConquestContainer.tsx`, `StoryWeaverModeContainer.tsx`, `InfoModal.tsx`).
*   `types.ts`: Defines TypeScript interfaces and enums used throughout the application.
*   `constants.ts`: Holds constant values, system prompts, theme definitions, and mode-specific configurations including `MODE_INFO_CONTENT`.
*   `utils/`: Utility functions (e.g., `chessLogic.ts`).
*   `data/`: Game data, such as map definitions for Noospheric Conquest (`noospheric-map-data.ts`).
*   `docs/`: Contains supplementary documentation like this README, issue tracking, and TODO lists.

## Known Issues & TODO

For a detailed list of known issues, ongoing challenges (especially regarding AI behavior in complex modes like Chess and Noospheric Conquest), and planned features, please refer to:

*   [`docs/issues.md`](./docs/issues.md)
*   [`docs/todo.md`](./docs/todo.md)

Key areas of ongoing development include refining AI prompt engineering for better rule adherence in game modes and potentially adding more sophisticated client-side validation for game logic.

## Contributing

Currently, this project is maintained individually. However, suggestions and feedback are welcome. If you encounter bugs or have feature ideas, please consider opening an issue on the project's repository (if applicable).

## License

This project is intended for demonstration and personal use. If a specific license is applied, it will be detailed in a `LICENSE` file in the root directory. (Assuming MIT License if none specified for now).

---

*This README was last updated: ${new Date().toLocaleDateString()}*
