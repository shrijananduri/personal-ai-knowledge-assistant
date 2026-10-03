# Personal AI Knowledge Assistant

A document-grounded AI assistant that allows users to upload PDF, DOCX, and TXT files and ask questions about their content.

The application uses Retrieval-Augmented Generation (RAG) with Gemini embeddings and Qdrant vector search to retrieve relevant document chunks before generating an answer. The assistant uses the uploaded documents as its knowledge source and provides the retrieved sources along with each response.

## ✨ Features

- 📄 Upload PDF, DOCX, and TXT documents
- 📚 Upload multiple documents
- ✂️ Extract and chunk document text
- 🧠 Generate embeddings using Gemini
- 🗄️ Store document embeddings in Qdrant
- 🔎 Semantic vector search
- 🔀 Hybrid semantic + keyword retrieval
- 💬 Maintain conversation context
- 🤖 Document-grounded AI responses
- 📚 Source citations for generated answers
- 👀 View retrieved source chunks
- 🗑️ Delete individual documents
- 🧹 Clear all indexed documents
- 🧼 Clear chat history
- 🚫 Prevent empty questions
- ⚠️ Frontend and backend error handling
- 🔄 Automatic Gemini model fallback
- 📱 Responsive user interface

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- React Markdown

### Backend

- Node.js
- Express.js
- Multer

### AI

- Google Gemini API
- Gemini Embeddings

### Vector Database

- Qdrant

### Document Processing

- PDF text extraction
- Mammoth for DOCX text extraction
- TXT text processing

## 🧠 RAG Architecture

The application uses Retrieval-Augmented Generation (RAG) to answer questions using information from uploaded documents.

```text
                Document Upload
                       ↓
                Text Extraction
                       ↓
                    Chunking
                       ↓
              Gemini Embeddings
                       ↓
                Qdrant Vector DB
                       ↓
                User Question
                       ↓
             Question Embedding
                       ↓
              Hybrid Retrieval
                       ↓
              Relevant Chunks
                       ↓
             Gemini Generation
                       ↓
                Answer + Sources
