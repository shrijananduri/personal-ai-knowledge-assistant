# Personal AI Knowledge Assistant

An AI-powered PDF assistant that allows users to upload a PDF and ask questions about its content using natural language.

## ✨ Features

- 📄 Upload PDF documents
- 🤖 Ask questions about uploaded PDFs
- 💬 Maintain conversation context
- 📝 Markdown-formatted AI responses
- 🗑️ Remove uploaded PDFs
- 🧹 Clear chat history
- 🚫 Prevent empty questions
- ✅ Validate PDF file uploads
- ⏳ Loading state while AI generates responses
- 📱 Responsive UI for desktop and mobile
- ⚠️ Frontend and backend error handling

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
- PDF text extraction

### AI
- Google Gemini API

## 🏗️ Project Structure

```text
Personal-AI/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── Header.css
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md