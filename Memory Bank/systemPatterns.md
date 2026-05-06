# System Architecture and Design Patterns

## Frontend Architecture
- **React Flow:** For visual representation of nodes and edges, and state management of the graph.
- **Zustand / Redux:** To maintain the state of "activated nodes" and append them as payloads to LLM requests dynamically.

## Backend (FastAPI / Python) & LLM Architecture
- **Code Interpreter Pattern:** When Excel (.xlsx) or CSV files are uploaded, use `pandas` to extract ONLY column names, data types, and the first 5 rows (Schema/Metadata). The full file is NEVER sent to the LLM. The LLM generates Python code based on this schema, which is executed securely in the backend.
- **RAG (Retrieval-Augmented Generation):** PDF and Word files must be chunked and stored in a Vector Database. Only the chunks semantically matching the user's query are sent to the model.
- **Strict JSON & Function Calling:** Prevent LLM "Chain-of-Thought" verbosity. Provide all feature nodes to the model strictly as Function Calling schemas.

## Data Model Draft
- `Node`: id, type (llm, data, feature), label, metadata (file_path, schema, tool_description), isActive.
- `Edge`: source, target.
- `Brain`: id, name, nodes[], edges[].