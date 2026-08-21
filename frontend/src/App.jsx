import { useState } from "react";
import "./Header.css";

function Header(props) {
  return <h1>{props.title}</h1>;
}

function Subtitle() {
  return <p className="subtitle">Upload your PDF and ask AI anything.</p>;
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
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");

  function handleFileChange(event) {
    const selectedFile = event.target.files[0];

  if (!selectedFile) {
    return;
  }

  if (selectedFile.type !== "application/pdf") {
    setUploadStatus("Please select a PDF file. ❌");
    return;
  }

  setFile(selectedFile);
    const formData = new FormData();
    formData.append("file", event.target.files[0]);

    setUploadStatus("Uploading... ⏳");

    fetch("http://localhost:5000/api/upload", {
      method: "POST",
      body: formData
    })
      .then((response) => response.text())
      .then((data) => {
        setUploadStatus("PDF uploaded successfully! ✅");
      })
      .catch((error) => {
        setUploadStatus("PDF upload failed. ❌");
      });
  }
  async function handleRemoveFile() {
  const response = await fetch("http://localhost:5000/api/clear-pdf", {
    method: "POST"
  });

  if (response.ok) {
    setFile(null);
    setUploadStatus("");
  }
}

  return (
    <>
      <input
        id="file-upload"
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
      />

      <label htmlFor="file-upload" className="button">
        Upload PDF
      </label>

      {file && <p>Selected file: {file.name}</p>}
{file && (
  <button onClick={handleRemoveFile}>
    Remove PDF
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
    >
      Ask AI
    </button>
  );
}
function Question(props) {
  return (
    <div className="question">
      {props.text}
    </div>
  );
}

function Footer() {
  return <p className="footer">Made by Shrija ❤️</p>;
}


function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  

  function handleAsk() {
  if (!question.trim()) {
    return;
  }
  setError("");
setLoading(true);
  setMessages([...messages, { question: question, answer: "" }]);

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
  .then((response) => {
  if (!response.ok) {
    throw new Error("Please upload a PDF first.");
  }

  return response.text();
})
  .then((data) => {
    setMessages((oldMessages) => {
      const updatedMessages = [...oldMessages];
      updatedMessages[updatedMessages.length - 1].answer = data;
      return updatedMessages;
    });

    setLoading(false);
    
  })
  .catch((error) => {
  setError(error.message);
  setLoading(false);
});
    
  setQuestion("");
}

  return (
    <>
      <Header title="Personal AI Knowledge Assistant" />
      <Subtitle />

      <Input
  question={question}
  setQuestion={setQuestion}
  onAsk={handleAsk}
/>

      <AskButton onAsk={handleAsk} />

      {messages.map((message, index) => (
  <div key={index} className="message">
    <p className="question">You: {message.question}</p>

    {message.answer && (
      <p className="answer">AI: {message.answer}</p>
    )}
  </div>
))}
{loading && <p>Thinking... ⏳</p>}
{error && <p>{error}</p>}
      <Footer />
      <UploadButton />
      
    </>
    
  );
}

export default App;