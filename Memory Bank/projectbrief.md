# Project Brief: Neuro-Agent Dynamic Knowledge Graph

## Core Vision
A platform where users can build custom, purpose-driven AI "Brains" through a visual, node-based interface (similar to Obsidian or Node-Red). Users connect "Data" (Memory) and "Feature/Function" (Capability) nodes to a central LLM orchestrator.

## Strict Language Rule
**CRITICAL:** While this documentation is in English, the actual application (UI, buttons, chat interface, error messages, backend responses) MUST be developed entirely in **Turkish**. 

## Key Goals
- Enable the visual design of Multi-Agent and RAG systems without writing code.
- Establish strict engineering standards to prevent Token waste and Context Bloat.
- Implement a "Human-in-the-Loop" workflow, allowing users to manually select/activate specific nodes before execution.

## Success Criteria
- The system operates using only the explicitly activated nodes, avoiding unnecessary token consumption.
- Only the schema/metadata of large files (Excel/CSV) is parsed, not the entire file content.
- Successful "Brain" (Graph) combinations can be saved and reloaded.