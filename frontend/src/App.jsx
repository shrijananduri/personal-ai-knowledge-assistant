import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./Header.css";

function Header(props) {
  return <h1>{props.title}</h1>;
}

function Subtitle() {
  return (
    <p className="subtitle">
      Upload your documents and ask AI anything.
    </p>
  );
}

function Input(props) {
  function handleChange(event) {
    props.setQuestion(event.target.value);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      props.onAsk();
    }
  }

  return (
    <input
      className="input"
      placeholder="Ask your question..."
      value={props.question}
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
        "Please select only PDF, TXT, or DOCX files. ❌"
      );
      return;
    }

    if (selectedFiles.length > 10) {
      setUploadStatus(
        "You can upload a maximum of 10 files. ❌"
      );
      return;
    }

    setFile(selectedFiles);

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    setUploadStatus("Uploading... ⏳");

    fetch("http://localhost:5000/api/upload", {
      method: "POST",
      body: formData
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((message) => {
            throw new Error(message);
          });
        }

        return response.text();
      })
      .then((message) => {
        setUploadStatus(message + " ✅");
      })
      .catch((error) => {
        setUploadStatus(
          error.message || "Document upload failed. ❌"
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
        setUploadStatus(message || "Failed to remove documents. ❌");
        return;
      }

      setFile([]);
      setUploadStatus(message + " ✅");
    } catch (error) {
      setUploadStatus(
        "Failed to remove documents. ❌"
      );
    }
  }

  return (
    <>
      <input
        id="file-upload"
        type="file"
        accept=".pdf,.txt,.docx"
        multiple
        onChange={handleFileChange}
      />

      <label htmlFor="file-upload" className="button">
        Upload Documents
      </label>

      {file.length > 0 && (
        <div className="file-name">
          {file.map((item, index) => (
            <p key={index}>📄 {item.name}</p>
          ))}
        </div>
      )}

      {file.length > 0 && (
        <button
          onClick={handleRemoveFile}
          className="remove-button"
        >
          Remove Documents
        </button>
      )}

      {uploadStatus && <p>{uploadStatus}</p>}
    </>
  );
}

function AskButton(props) {
  function handleClick() {
    props.onAsk();
  }

  return (
    <button
      className="button"
      onClick={handleClick}
      disabled={props.loading}
    >
      {props.loading ? "Thinking... ⏳" : "Ask AI"}
    </button>
  );
}

function Footer() {
  return (
    <p className="footer">
      © Made by Shrija ❤️
    </p>
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
    if (!question.trim()) {
      return;
    }

    setError("");
    setLoading(true);

    setMessages([
      ...messages,
      {
        question: question,
        answer: ""
      }
    ]);

    fetch("http://localhost:5000/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: question,
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

      <Header title="Personal AI Knowledge Assistant" />

      <Subtitle />

      <Input
        question={question}
        setQuestion={setQuestion}
        onAsk={handleAsk}
      />

      <AskButton
        onAsk={handleAsk}
        loading={loading}
      />

      {messages.map((message, index) => (
        <div key={index} className="message">

          <p className="question">
            You: {message.question}
          </p>

          {message.answer && (
            <div className="answer">
              <strong>AI:</strong>

              <ReactMarkdown>
                {message.answer}
              </ReactMarkdown>
            </div>
          )}

        </div>
      ))}

      {loading && (
        <p>Thinking... ⏳</p>
      )}

      {error && (
  <p className="error-message">
    {error}
  </p>
)}

      <Footer />

      <UploadButton />

      <button
        onClick={handleClearChat}
        className="clear-chat-button"
      >
        Clear Chat
      </button>

    </div>
  );
}

export default App;