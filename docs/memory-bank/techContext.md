# Tech Stack and Dependencies

## Frontend
- Framework: Next.js (React)
- Visual Graph UI: React Flow
- Styling: Tailwind CSS
- UI Components: Radix UI / Shadcn UI
- State Management: Zustand

## Backend
- Framework: FastAPI (Python)
- LLM Orchestration: LangChain or LlamaIndex
- Vector DB: ChromaDB (or FAISS for local memory)
- Data Processing: pandas, openpyxl (Excel), pdfplumber/PyPDF2 (PDF), python-docx (Word)
- Database: SQLite (to save Graph states and Brain configurations)

## Security and Performance
- **Caching:** Frequently asked queries and identical node combinations must be cached (Redis or in-memory) to avoid redundant LLM calls.
- **Token Optimization:** The system must strictly prioritize minimal token consumption.