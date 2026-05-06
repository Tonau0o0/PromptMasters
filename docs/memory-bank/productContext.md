# Product Context and User Experience

## Core User Flow
1. The user opens the workspace, featuring a central "Core LLM" node.
2. The user creates new nodes using "Add Data" (e.g., monthly expense table, PDF document) or "Add Feature" (e.g., profit-loss calculation, report template filler) buttons. All UI labels must be in Turkish (e.g., "Veri Ekle", "Özellik Ekle").
3. The user connects these nodes to the central LLM using visual edges (wires).
4. **CRITICAL:** Before sending a prompt from the chat panel, the user must manually toggle (activate/deactivate) the specific data and feature nodes relevant to the current task.
5. The system saves this specific combination as a custom "Brain" (e.g., "Muhasebe Beyni" / Accounting Brain).

## Problems Solved
- Prevents LLMs from being overwhelmed by irrelevant context.
- Provides the user with full transparency and control over which tools and data the AI uses in the background.