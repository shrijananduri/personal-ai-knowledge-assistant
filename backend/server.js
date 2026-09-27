require("dotenv").config();

const cors = require("cors");
const express = require("express");
const qdrant = require("./qdrant");
const chunkText = require("./chunkText");
const storeChunks = require("./storeChunks");
const retrieveChunks = require("./retrieveChunks");

const {
  createCollection,
  clearCollection
} = require("./qdrantCollection");

const { GoogleGenAI } = require("@google/genai");
const multer = require("multer");
const fs = require("fs");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});


// ------------------------------------
// GEMINI RETRY HANDLER
// ------------------------------------

async function generateAnswer(prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });

    } catch (error) {

      const isTemporaryError =
        error.status === 503 ||
        error.status === 429;

      if (
        !isTemporaryError ||
        attempt === maxRetries
      ) {
        throw error;
      }

      console.log(
        `Gemini temporarily unavailable. Retrying (${attempt}/${maxRetries})...`
      );

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          1500 * attempt
        )
      );
    }
  }
}


const app = express();

const upload = multer({
  dest: "uploads/"
});

app.use(cors());
app.use(express.json());


// ------------------------------------
// QDRANT CONNECTION
// ------------------------------------

qdrant
  .getCollections()
  .then(() => {
    console.log(
      "Qdrant connected successfully!"
    );
  })
  .catch((error) => {
    console.error(
      "Qdrant connection failed:",
      error.message
    );
  });


// ------------------------------------
// QDRANT COLLECTION SETUP
// ------------------------------------

createCollection()
  .then(() => {
    console.log(
      "Qdrant collection setup complete!"
    );
  })
  .catch((error) => {
    console.error(
      "Collection setup failed:",
      error.message
    );
  });


// ------------------------------------
// HOME ROUTE
// ------------------------------------

app.get("/", (req, res) => {
  res.send("Hello from backend!");
});


// ------------------------------------
// ASK AI
// ------------------------------------

app.post("/api/ask", async (req, res) => {
  try {

    const question = req.body.question;
    const messages = req.body.messages || [];

    if (!question) {
      return res.status(400).send(
        "Please enter a question."
      );
    }


    // -------------------------------
    // PREVIOUS CONVERSATION
    // -------------------------------

    const recentMessages =
      messages.slice(-6, -1);

    const conversation =
      recentMessages
        .map(
          (message) =>
            `User: ${message.question}\nAI: ${message.answer}`
        )
        .join("\n");


    // -------------------------------
    // RETRIEVE DOCUMENT CHUNKS
    // -------------------------------

    const relevantChunks =
      await retrieveChunks(
        question,
        5
      );


    // -------------------------------
    // NO RELEVANT INFORMATION
    // -------------------------------

    if (
      !relevantChunks ||
      relevantChunks.length === 0
    ) {
      return res.status(404).send(
        "I couldn't find enough information to answer this from the uploaded documents."
      );
    }


    // -------------------------------
    // BUILD CONTEXT
    // -------------------------------

    const context =
      relevantChunks
        .map(
          (chunk, index) =>
            `[Source ${index + 1}]
File: ${chunk.fileName}
Chunk: ${chunk.chunkIndex}

Content:
${chunk.text}`
        )
        .join("\n\n");


    // -------------------------------
    // GEMINI PROMPT
    // -------------------------------

    const prompt = `You are a helpful AI knowledge assistant.

Your job is to answer the user's question using ONLY the retrieved content from the uploaded documents.

STRICT RULES:

1. Use only the retrieved document context.
2. Do NOT use your general knowledge to fill missing information.
3. If the retrieved context does not contain enough information to answer the question, say:
"I couldn't find enough information to answer this from the uploaded documents."
4. If the user asks for a summary, summarize the information present in the retrieved document context.
5. If the user asks for an explanation, explain only what is supported by the retrieved context.
6. Do not make up facts, examples, or details that are not supported by the retrieved context.
7. Do not include a Sources section. The application will add the sources separately.

Retrieved document context:

${context}

${
  conversation
    ? `Previous conversation:
${conversation}`
    : ""
}

Current user question:

${question}`;


    // -------------------------------
    // GEMINI RESPONSE WITH RETRIES
    // -------------------------------

    const response =
      await generateAnswer(prompt);


    // -------------------------------
    // SOURCES
    // -------------------------------

    const sources =
  relevantChunks
    .map(
      (chunk) =>
        `- ${chunk.fileName} · Chunk ${chunk.chunkIndex}`
    )
    .join("\n");

const finalResponse =
  `${response.text}\n\n### Sources\n${sources}`;

    res.send(finalResponse);

  } catch (error) {

    console.error(
      "Question answering error:",
      error
    );


    // -------------------------------
    // USER-FRIENDLY GEMINI ERROR
    // -------------------------------

    if (
      error.status === 503
    ) {
      return res.status(503).send(
        "Gemini is temporarily unavailable due to high demand. Please try again in a moment."
      );
    }

    if (
      error.status === 429
    ) {
      return res.status(429).send(
        "Gemini is temporarily rate-limited. Please try again in a moment."
      );
    }


    res.status(500).send(
      "Failed to answer the question."
    );
  }
});


// ------------------------------------
// UPLOAD DOCUMENTS
// ------------------------------------

app.post(
  "/api/upload",
  upload.array("files", 10),
  async (req, res) => {

    try {

      if (
        !req.files ||
        req.files.length === 0
      ) {
        return res.status(400).send(
          "No files uploaded."
        );
      }


      // -------------------------------
      // PROCESS EACH FILE
      // -------------------------------

      for (const file of req.files) {

        const filePath = file.path;
        const fileType = file.mimetype;

        let extractedText = "";


        // -----------------------------
        // PDF
        // -----------------------------

        if (
          fileType === "application/pdf"
        ) {

          const dataBuffer =
            fs.readFileSync(filePath);

          const parser =
            new PDFParse({
              data: dataBuffer
            });

          const result =
            await parser.getText();

          extractedText =
            result.text;
        }


        // -----------------------------
        // TXT
        // -----------------------------

        else if (
          fileType === "text/plain"
        ) {

          extractedText =
            fs.readFileSync(
              filePath,
              "utf8"
            );
        }


        // -----------------------------
        // DOCX
        // -----------------------------

        else if (
          fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {

          const result =
            await mammoth.extractRawText({
              path: filePath
            });

          extractedText =
            result.value;
        }


        // -----------------------------
        // UNSUPPORTED FILE
        // -----------------------------

        else {

          return res.status(400).send(
            `Unsupported file type: ${file.originalname}`
          );
        }


        // -----------------------------
        // CHUNK DOCUMENT
        // -----------------------------

        const chunks =
          chunkText(extractedText);


        // -----------------------------
        // STORE CHUNKS IN QDRANT
        // -----------------------------

        await storeChunks(
          chunks,
          file.originalname
        );


        // -----------------------------
        // DELETE TEMPORARY FILE
        // -----------------------------

        fs.unlinkSync(filePath);
      }


      res.send(
        "Documents uploaded and indexed successfully!"
      );

    } catch (error) {

      console.error(
        "Document processing error:",
        error
      );

      res.status(500).send(
        "Failed to process documents."
      );
    }
  }
);


// ------------------------------------
// CLEAR DOCUMENTS
// ------------------------------------

app.post(
  "/api/clear-pdf",
  async (req, res) => {

    try {

      await clearCollection();

      res.send(
        "Documents cleared successfully!"
      );

    } catch (error) {

      console.error(
        "Error clearing documents:",
        error
      );

      res.status(500).send(
        "Failed to clear documents."
      );
    }
  }
);


// ------------------------------------
// START SERVER
// ------------------------------------

app.listen(5000, () => {
  console.log(
    "Server is running on port 5000"
  );
});