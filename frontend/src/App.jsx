import { useEffect, useState } from "react";

import ReactMarkdown from "react-markdown";

import "./App.css";


/* =====================================
   HEADER
===================================== */

function Header({
  children
}) {

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

            <path
              d="M6 3h9l3 3v15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
            />

            <path
              d="M15 3v4h4"
            />

            <path
              d="M8 12h5"
            />

            <path
              d="M8 16h6"
            />

            <path
              d="M16.5 11.5l.5 1.2 1.2.5-1.2.5-.5 1.3-.5-1.3-1.2-.5.5-1.2z"
            />

          </svg>

        </div>


        <div className="brand-text">

          <h1>
            Knowledge Assistant
          </h1>

          <p>
            Personal AI knowledge workspace
          </p>

        </div>

      </div>


      <div className="header-actions">

        {children}

      </div>

    </header>
  );
}


/* =====================================
   INPUT
===================================== */

function Input({
  question,
  setQuestion,
  onAsk
}) {

  function handleChange(
    event
  ) {

    setQuestion(
      event.target.value
    );
  }


  function handleKeyDown(
    event
  ) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

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


/* =====================================
   UPLOAD BUTTON
===================================== */

function UploadButton({
  onDocumentsChanged
}) {

  const [
    file,
    setFile
  ] = useState([]);


  const [
    uploadStatus,
    setUploadStatus
  ] = useState("");


  function handleFileChange(
    event
  ) {

    const selectedFiles =
      Array.from(
        event.target.files
      );


    if (
      selectedFiles.length === 0
    ) {

      return;
    }


    const allowedExtensions =
      [
        ".pdf",
        ".txt",
        ".docx"
      ];


    const invalidFile =
      selectedFiles.find(
        (file) => {

          const name =
            file.name.toLowerCase();

          return !allowedExtensions.some(
            (extension) =>
              name.endsWith(
                extension
              )
          );
        }
      );


    if (
      invalidFile
    ) {

      setUploadStatus(
        "Only PDF, TXT, and DOCX files are supported."
      );

      return;
    }


    if (
      selectedFiles.length > 10
    ) {

      setUploadStatus(
        "You can upload a maximum of 10 files."
      );

      return;
    }


    setFile(
      selectedFiles
    );


    const formData =
      new FormData();


    selectedFiles.forEach(
      (file) => {

        formData.append(
          "files",
          file
        );
      }
    );


    setUploadStatus(
      "Uploading..."
    );


    fetch(
      "http://localhost:5000/api/upload",
      {
        method:
          "POST",

        body:
          formData
      }
    )

      .then(
        async (response) => {

          const data =
            await response.json();


          if (
            !response.ok
          ) {

            throw new Error(
              data.error ||
              data.message ||
              "Document upload failed."
            );
          }


          return data;
        }
      )

      .then(
        (data) => {

          const uploaded =
            data.uploaded ||
            [];

          const failed =
            data.failed ||
            [];


          let status =
            "";


          if (
            uploaded.length > 0 &&
            failed.length === 0
          ) {

            status =
              uploaded.length === 1

                ? `${uploaded[0]} uploaded and indexed successfully.`

                : `${uploaded.length} documents uploaded and indexed successfully.`;

          }

          else if (
            uploaded.length > 0 &&
            failed.length > 0
          ) {

            status =
              `${uploaded.length} document(s) uploaded successfully. ` +
              `${failed.length} document(s) could not be processed.`;

          }

          else if (
            failed.length > 0
          ) {

            status =
              failed
                .map(
                  (item) =>
                    `${item.fileName}: ${item.reason}`
                )
                .join(
                  " "
                );

          }

          else {

            status =
              "Document processing completed.";
          }


          setUploadStatus(
            status
          );


          onDocumentsChanged();
        }
      )

      .catch(
        (error) => {

          setUploadStatus(
            error.message ||
            "Document upload failed."
          );
        }
      );


    event.target.value =
      "";
  }


  async function handleRemoveFile() {

    try {

      const response =
        await fetch(
          "http://localhost:5000/api/clear-pdf",
          {
            method:
              "POST"
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        setUploadStatus(
          data.error ||
          "Failed to remove documents."
        );

        return;
      }


      setFile([]);


      setUploadStatus(
        "All documents cleared successfully."
      );


      onDocumentsChanged();


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
        onChange={
          handleFileChange
        }
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

          <path
            d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
          />

        </svg>

      </label>


      {file.length > 0 && (

        <button
          onClick={
            handleRemoveFile
          }
          className="icon-button danger"
          title="Remove all documents"
        >

          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >

            <path
              d="M3 6h18"
            />

            <path
              d="M8 6V4h8v2"
            />

            <path
              d="M19 6l-1 14H6L5 6"
            />

            <path
              d="M10 11v5"
            />

            <path
              d="M14 11v5"
            />

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


/* =====================================
   ASK BUTTON
===================================== */

function AskButton({
  onAsk,
  loading
}) {

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

          <path
            d="M22 2L11 13"
          />

          <path
            d="M22 2l-7 20-4-9-9-4z"
          />

        </svg>

      )}

    </button>
  );
}


/* =====================================
   EMPTY STATE
===================================== */

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

          <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
          />

          <path
            d="M14 2v6h6"
          />

          <path
            d="M8 13h8"
          />

          <path
            d="M8 17h6"
          />

        </svg>

      </div>


      <h2>
        Ask questions about your documents
      </h2>


      <p>
        Upload your documents and use natural language
        to search, understand, and explore their content.
      </p>


      <div className="supported-files">

        <span>
          PDF
        </span>

        <span>
          DOCX
        </span>

        <span>
          TXT
        </span>

      </div>

    </div>
  );
}


/* =====================================
   DOCUMENTS LIST
===================================== */

function DocumentsList({
  documents,
  onDelete
}) {

  if (
    documents.length === 0
  ) {

    return null;
  }


  return (

    <div className="documents-panel">

      <div className="documents-header">

        <span>
          Indexed documents
        </span>

        <span className="document-count">
          {documents.length}
        </span>

      </div>


      <div className="documents-list">

        {documents.map(
          (document, index) => (

            <div
              className="document-item"
              key={index}
            >

              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >

                <path
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                />

                <path
                  d="M14 2v6h6"
                />

              </svg>


              <span>
                {document}
              </span>


              <button
                className="document-delete-button"
                onClick={() =>
                  onDelete(
                    document
                  )
                }
                title={
                  `Delete ${document}`
                }
              >
                ×
              </button>

            </div>
          )
        )}

      </div>

    </div>
  );
}


/* =====================================
   SOURCE CARD
===================================== */

function SourceCard({
  source
}) {

  const [
    expanded,
    setExpanded
  ] = useState(false);


  return (

    <div className="source-card">

      <div className="source-header">

        <div>

          <strong>
            {source.fileName}
          </strong>

          <span>
            {" "}
            · Chunk {source.chunkIndex}
          </span>

        </div>


        <button
          className="source-toggle"
          onClick={() =>
            setExpanded(
              !expanded
            )
          }
        >

          {expanded
            ? "Hide"
            : "View source"}

        </button>

      </div>


      {expanded && (

        <div className="source-content">

          <ReactMarkdown>
            {source.text}
          </ReactMarkdown>

        </div>

      )}

    </div>
  );
}


/* =====================================
   SOURCES
===================================== */

function Sources({
  sources
}) {

  if (
    !sources ||
    sources.length === 0
  ) {

    return null;
  }


  return (

    <div className="sources-section">

      <div className="sources-title">
        Sources
      </div>


      <div className="sources-list">

        {sources.map(
          (source, index) => (

            <SourceCard
              key={index}
              source={source}
            />

          )
        )}

      </div>

    </div>
  );
}


/* =====================================
   APP
===================================== */

function App() {

  const [
    question,
    setQuestion
  ] = useState("");


  const [
    messages,
    setMessages
  ] = useState([]);


  const [
    loading,
    setLoading
  ] = useState(false);


  const [
    error,
    setError
  ] = useState("");


  const [
    documents,
    setDocuments
  ] = useState([]);


  /* =====================================
     LOAD DOCUMENTS
  ===================================== */

  async function loadDocuments() {

    try {

      const response =
        await fetch(
          "http://localhost:5000/api/documents"
        );


      if (
        !response.ok
      ) {

        throw new Error(
          "Failed to load documents."
        );
      }


      const data =
        await response.json();


      setDocuments(
        data
      );


    } catch (error) {

      console.error(
        "Failed to load documents:",
        error
      );
    }
  }


  /* =====================================
     DELETE DOCUMENT
  ===================================== */

  async function handleDeleteDocument(
    fileName
  ) {

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${fileName}"?`
      );


    if (
      !confirmed
    ) {

      return;
    }


    try {

      const response =
        await fetch(
          `http://localhost:5000/api/documents/${encodeURIComponent(fileName)}`,
          {
            method:
              "DELETE"
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.error ||
          "Failed to delete document."
        );
      }


      setDocuments(
        (oldDocuments) =>
          oldDocuments.filter(
            (document) =>
              document !==
              fileName
          )
      );


    } catch (error) {

      console.error(
        "Failed to delete document:",
        error
      );


      setError(
        error.message ||
        "Failed to delete document."
      );
    }
  }


  /* =====================================
     INITIAL LOAD
  ===================================== */

  useEffect(
    () => {

      loadDocuments();

    },
    []
  );


  /* =====================================
     CLEAR CHAT
  ===================================== */

  function handleClearChat() {

    setMessages([]);

    setError("");
  }


  /* =====================================
     ASK QUESTION
  ===================================== */

  function handleAsk() {

    if (
      !question.trim() ||
      loading
    ) {

      return;
    }


    const currentQuestion =
      question.trim();


    setError("");

    setLoading(true);


    const userMessage = {
      question:
        currentQuestion,

      answer:
        "",

      sources:
        []
    };


    setMessages(
      [
        ...messages,
        userMessage
      ]
    );


    fetch(
      "http://localhost:5000/api/ask",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            question:
              currentQuestion,

            conversation:
              messages
          })
      }
    )

      .then(
        async (response) => {

          const data =
            await response.json();


          if (
            !response.ok
          ) {

            throw new Error(
              data.error ||
              "Failed to answer the question."
            );
          }


          return data;
        }
      )

      .then(
        (data) => {

          const answer =
            data.answer ||
            "";


          const sources =
            data.sources ||
            [];


          setMessages(
            (oldMessages) => {

              const updatedMessages =
                [
                  ...oldMessages
                ];


              if (
                updatedMessages.length >
                0
              ) {

                updatedMessages[
                  updatedMessages.length - 1
                ] = {

                  ...updatedMessages[
                    updatedMessages.length - 1
                  ],

                  answer:
                    answer,

                  sources:
                    sources
                };
              }


              return updatedMessages;
            }
          );


          setLoading(false);
        }
      )

      .catch(
        (error) => {

          setMessages(
            (oldMessages) => {

              const updatedMessages =
                [
                  ...oldMessages
                ];


              if (
                updatedMessages.length >
                0
              ) {

                updatedMessages[
                  updatedMessages.length - 1
                ] = {

                  ...updatedMessages[
                    updatedMessages.length - 1
                  ],

                  answer:
                    "",

                  sources:
                    []
                };
              }


              return updatedMessages;
            }
          );


          setError(
            error.message ||
            "Failed to answer the question."
          );


          setLoading(false);
        }
      );


    setQuestion("");
  }


  /* =====================================
     UI
  ===================================== */

  return (

    <div className="app-container">

      <Header>

        <UploadButton
          onDocumentsChanged={
            loadDocuments
          }
        />


        <button
          onClick={
            handleClearChat
          }
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

            <path
              d="M3 6h18"
            />

            <path
              d="M8 6V4h8v2"
            />

            <path
              d="M19 6l-1 14H6L5 6"
            />

            <path
              d="M10 11v5"
            />

            <path
              d="M14 11v5"
            />

          </svg>

        </button>

      </Header>


      <DocumentsList
        documents={
          documents
        }
        onDelete={
          handleDeleteDocument
        }
      />


      <main className="chat-area">

        {messages.length === 0 ? (

          <EmptyState />

        ) : (

          messages.map(
            (
              message,
              index
            ) => (

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


                      <Sources
                        sources={
                          message.sources
                        }
                      />

                    </div>

                  </div>
                )}

              </div>
            )
          )
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

            <span>
              !
            </span>

            {error}

          </div>
        )}

      </main>


      <div className="composer-container">

        <div className="composer">

          <Input
            question={
              question
            }
            setQuestion={
              setQuestion
            }
            onAsk={
              handleAsk
            }
          />


          <AskButton
            onAsk={
              handleAsk
            }
            loading={
              loading
            }
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