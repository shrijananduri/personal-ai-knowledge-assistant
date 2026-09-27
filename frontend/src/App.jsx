import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function Header({ children }) {
  return (
    <header className="app-header">
      <div className="brand">

        <div className="brand-icon">
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3h9l3 3v15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
            <path d="M15 3v4h4" />
            <path d="M8 12h5" />
            <path d="M8 16h6" />
            <path d="M16.5 11.5l.5 1.2 1.2.5-1.2.5-.5 1.3-.5-1.3-1.2-.5 1.2-.5.5-1.2z" />
          </svg>
        </div>

        <div className="brand-text">
          <h1>Knowledge Assistant</h1>
          <p>Personal AI knowledge workspace</p>
        </div>

      </div>

      <div className="header-actions">
        {children}
      </div>
    </header>
  );
}

function Input({ question, setQuestion, onAsk }) {
  function handleChange(event) {
    setQuestion(event.target.value);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onAsk();
    }
  }

  return (
    <input
      className="question-input"
      placeholder="Ask anything about your documents..."
      value={question}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
}

function UploadButton() {
  const [file, setFile] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");

  function handleFileChange(event) {
    const selectedFiles = Array.from(event.target.files);

    if (selectedFiles.length === 0) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    const invalidFile = selectedFiles.find(
      (file) => !allowedTypes.includes(file.type)
    );

    if (invalidFile) {
      setUploadStatus(
        "Only PDF, TXT, and DOCX files are supported."
      );
      return;
    }

    if (selectedFiles.length > 10) {
      setUploadStatus(
        "You can upload a maximum of 10 files."
      );
      return;
    }

    setFile(selectedFiles);

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    setUploadStatus("Uploading...");

    fetch("http://localhost:5000/api/upload", {
      method: "POST",
      body: formData
    })
      .then(async (response) => {
        const message = await response.text();

        if (!response.ok) {
          throw new Error(message);
        }

        return message;
      })
      .then((message) => {
        setUploadStatus(message);
      })
      .catch((error) => {
        setUploadStatus(
          error.message || "Document upload failed."
        );
      });
  }

  async function handleRemoveFile() {
    try {
      const response = await fetch(
        "http://localhost:5000/api/clear-pdf",
        {
          method: "POST"
        }
      );

      const message = await response.text();

      if (!response.ok) {
        setUploadStatus(
          message || "Failed to remove documents."
        );
        return;
      }

      setFile([]);
      setUploadStatus(message);

    } catch (error) {
      setUploadStatus(
        "Failed to remove documents."
      );
    }
  }

  return (
    <div className="upload-wrapper">

      <input
        id="file-upload"
        type="file"
        accept=".pdf,.txt,.docx"
        multiple
        onChange={handleFileChange}
        hidden
      />

      <label
        htmlFor="file-upload"
        className="icon-button"
        title="Upload documents"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </label>

      {file.length > 0 && (
        <button
          onClick={handleRemoveFile}
          className="icon-button danger"
          title="Remove documents"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
          </svg>
        </button>
      )}

      {uploadStatus && (
        <span className="upload-status">
          {uploadStatus}
        </span>
      )}

    </div>
  );
}

function AskButton({ onAsk, loading }) {
  return (
    <button
      className="ask-button"
      onClick={onAsk}
      disabled={loading}
      title="Ask question"
    >
      {loading ? (
        <span className="spinner"></span>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4z" />
        </svg>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">

      <div className="empty-icon">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </svg>
      </div>

      <h2>Ask questions about your documents</h2>

      <p>
        Upload your documents and use natural language
        to search, understand, and explore their content.
      </p>

      <div className="supported-files">
        <span>PDF</span>
        <span>DOCX</span>
        <span>TXT</span>
      </div>

    </div>
  );
}

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleClearChat() {
    setMessages([]);
    setError("");
  }

  function handleAsk() {
    if (!question.trim() || loading) {
      return;
    }

    const currentQuestion = question;

    setError("");
    setLoading(true);

    setMessages([
      ...messages,
      {
        question: currentQuestion,
        answer: ""
      }
    ]);

    fetch("http://localhost:5000/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: currentQuestion,
        messages: messages
      })
    })
      .then(async (response) => {
        const message = await response.text();

        if (!response.ok) {
          throw new Error(message);
        }

        return message;
      })
      .then((data) => {
        setMessages((oldMessages) => {
          const updatedMessages = [...oldMessages];

          updatedMessages[
            updatedMessages.length - 1
          ].answer = data;

          return updatedMessages;
        });

        setLoading(false);
      })
      .catch((error) => {
        setMessages((oldMessages) => {
          const updatedMessages = [...oldMessages];

          if (updatedMessages.length > 0) {
            updatedMessages[
              updatedMessages.length - 1
            ].answer = "";
          }

          return updatedMessages;
        });

        setError(
          error.message ||
          "Failed to answer the question."
        );

        setLoading(false);
      });

    setQuestion("");
  }

  return (
    <div className="app-container">

      <Header>

        <UploadButton />

        <button
          onClick={handleClearChat}
          className="icon-button"
          title="Clear chat"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
          </svg>
        </button>

      </Header>

      <main className="chat-area">

        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className="message-group"
            >

              <div className="user-message">
                <div className="message-avatar user-avatar">
                  You
                </div>

                <div className="message-content">
                  <div className="message-label">
                    You
                  </div>

                  <div className="question">
                    {message.question}
                  </div>
                </div>
              </div>

              {message.answer && (
                <div className="ai-message">

                  <div className="message-avatar ai-avatar">
                    AI
                  </div>

                  <div className="message-content">

                    <div className="message-label">
                      Assistant
                    </div>

                    <div className="answer">
                      <ReactMarkdown>
                        {message.answer}
                      </ReactMarkdown>
                    </div>

                  </div>

                </div>
              )}

            </div>
          ))
        )}

        {loading && (
          <div className="ai-message">

            <div className="message-avatar ai-avatar">
              AI
            </div>

            <div className="message-content">

              <div className="message-label">
                Assistant
              </div>

              <div className="thinking">
                <span></span>
                <span></span>
                <span></span>
              </div>

            </div>

          </div>
        )}

        {error && (
          <div className="error-message">
            <span>!</span>
            {error}
          </div>
        )}

      </main>

      <div className="composer-container">

        <div className="composer">

          <Input
            question={question}
            setQuestion={setQuestion}
            onAsk={handleAsk}
          />

          <AskButton
            onAsk={handleAsk}
            loading={loading}
          />

        </div>

        <p className="composer-hint">
          Press Enter to ask · AI responses are based on your uploaded documents
        </p>

      </div>

    </div>
  );
}

export default App;