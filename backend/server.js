require("dotenv").config();

const express =
  require("express");

const cors =
  require("cors");

const multer =
  require("multer");

const fs =
  require("fs");

const path =
  require("path");

const mammoth =
  require("mammoth");

const {
  PDFParse
} =
  require("pdf-parse");

const {
  GoogleGenAI
} =
  require("@google/genai");

const qdrant =
  require("./qdrant");

const {
  COLLECTION_NAME,
  createCollection,
  clearCollection
} =
  require("./qdrantCollection");

const chunkText =
  require("./chunkText");

const storeChunks =
  require("./storeChunks");

const retrieveChunks =
  require("./retrieveChunks");

const app =
  express();

app.use(
  cors()
);

app.use(
  express.json()
);

/* =====================================
   GEMINI
===================================== */

const ai =
  new GoogleGenAI({
    apiKey:
      process.env.GEMINI_API_KEY
  });

/* =====================================
   MULTER
===================================== */

const upload =
  multer({
    dest:
      "uploads/",
    limits: {
      files: 10,
      fileSize:
        20 * 1024 * 1024
    }
  });

/* =====================================
   GEMINI ANSWER GENERATION
===================================== */

/*
  Primary model:
  Gemini 3.8 Flash

  Fallback model:
  Gemini 3.5 Flash-Lite

  If the primary model temporarily
  returns 503, the application retries
  and then automatically switches to
  the fallback model.
*/

const ANSWER_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite"
];

async function generateAnswer(
  prompt
) {
  for (
    let modelIndex = 0;
    modelIndex < ANSWER_MODELS.length;
    modelIndex++
  ) {

    const model =
      ANSWER_MODELS[
        modelIndex
      ];

    const maxRetries = 2;

    for (
      let attempt = 1;
      attempt <= maxRetries;
      attempt++
    ) {

      try {

        console.log(
          `Generating answer with ${model}. Attempt ${attempt}/${maxRetries}`
        );

        const response =
          await ai.models.generateContent({
            model:
              model,
            contents:
              prompt
          });

        if (
          !response ||
          !response.text
        ) {
          throw new Error(
            "Gemini returned an empty response."
          );
        }

        console.log(
          `Answer generated successfully using ${model}.`
        );

        return response.text;

      } catch (error) {

        const status =
          error?.status ||
          error?.response?.status;

        console.error(
          `Gemini error using ${model}, attempt ${attempt}:`
        );

        console.error(
          error?.message ||
          error
        );

        /*
          503 means the model is temporarily
          unavailable/high demand.

          Retry the same model once before
          moving to the fallback model.
        */

        if (
          status === 503 &&
          attempt < maxRetries
        ) {

          const delay =
            3000 * attempt;

          console.log(
            `${model} unavailable. Retrying in ${delay / 1000} seconds...`
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                delay
              )
          );

          continue;
        }

        /*
          429 means rate limiting.

          Retry the same model once.
        */

        if (
          status === 429 &&
          attempt < maxRetries
        ) {

          const delay =
            5000 * attempt;

          console.log(
            `${model} rate limited. Retrying in ${delay / 1000} seconds...`
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                delay
              )
          );

          continue;
        }

        /*
          If this model failed after
          retries, move to the next model.
        */

        break;
      }
    }

    /*
      If another model exists,
      automatically use it.
    */

    if (
      modelIndex <
      ANSWER_MODELS.length - 1
    ) {

      const nextModel =
        ANSWER_MODELS[
          modelIndex + 1
        ];

      console.log(
        `Switching from ${model} to fallback model ${nextModel}...`
      );
    }
  }

  throw new Error(
    "All Gemini answer-generation models are currently unavailable."
  );
}

/* =====================================
   HOME
===================================== */

app.get(
  "/",
  (req, res) => {
    res.send(
      "Personal AI Knowledge Assistant backend is running."
    );
  }
);

/* =====================================
   HEALTH CHECK
===================================== */

app.get(
  "/api/health",
  async (req, res) => {
    try {

      const collections =
        await qdrant.getCollections();

      const collectionExists =
        collections.collections.some(
          (collection) =>
            collection.name ===
            COLLECTION_NAME
        );

      res.json({
        server:
          "ok",
        qdrant:
          "connected",
        collection:
          collectionExists
            ? "exists"
            : "missing"
      });

    } catch (error) {

      console.error(
        "Health check failed:",
        error
      );

      res.status(500).json({
        server:
          "ok",
        qdrant:
          "error",
        error:
          error?.message ||
          "Qdrant connection failed."
      });
    }
  }
);

/* =====================================
   ASK QUESTION
===================================== */

app.post(
  "/api/ask",
  async (req, res) => {

    try {

      const {
        question,
        conversation = []
      } =
        req.body;

      if (
        !question ||
        !question.trim()
      ) {

        return res.status(400).json({
          error:
            "Question is required."
        });
      }

      console.log(
        "\n================================"
      );

      console.log(
        "NEW QUESTION:",
        question
      );

      /* =================================
         RETRIEVE
      ================================= */

      const chunks =
        await retrieveChunks(
          question,
          5
        );

      /*
        Do not send an empty context
        to Gemini.
      */

      if (
        chunks.length === 0
      ) {

        console.log(
          "No relevant chunks found."
        );

        return res.json({
          answer:
            "I couldn't find enough information to answer this from the uploaded documents.",
          sources:
            []
        });
      }

      /* =================================
         BUILD CONTEXT
      ================================= */

      const context =
        chunks
          .map(
            (chunk, index) =>
              `Document ${index + 1}:
File: ${chunk.fileName}
Chunk: ${chunk.chunkIndex}
Content:
${chunk.text}`
          )
          .join(
            "\n\n"
          );

      /* =================================
         PREVIOUS CONVERSATION
      ================================= */

      const previousConversation =
        Array.isArray(
          conversation
        )
          ? conversation
              .slice(-6)
              .map(
                (message) =>
                  `${message.role}: ${message.content}`
              )
              .join("\n")
          : "";

      /* =================================
         PROMPT
      ================================= */

      const prompt = `
You are a helpful AI knowledge assistant.

Your job is to answer the user's question using ONLY the retrieved content from the uploaded documents.

STRICT RULES:

1. Use only the retrieved document context.
2. Do NOT use your general knowledge to fill missing information.
3. If the retrieved context does not contain enough information to answer the question, say:
"I couldn't find enough information to answer this from the uploaded documents."
4. If the user asks for a summary, summarize only information present in the retrieved document context.
5. If the user asks for an explanation, explain only what is supported by the retrieved context.
6. Do not make up facts, examples, or details.
7. Do not include a Sources section. The application adds sources separately.

Retrieved document context:

${context}

${
  previousConversation
    ? `Previous conversation:
${previousConversation}`
    : ""
}

Current user question:

${question}
`;

      /* =================================
         GENERATE ANSWER
      ================================= */

      const answer =
        await generateAnswer(
          prompt
        );

      /* =================================
         SOURCES
      ================================= */

      const sources =
        chunks.map(
          (chunk) => ({
            fileName:
              chunk.fileName,
            chunkIndex:
              chunk.chunkIndex,
            score:
              chunk.score,
            keywordScore:
              chunk.keywordScore,
            combinedScore:
              chunk.combinedScore,
            text:
              chunk.text
          })
        );

      console.log(
        "Answer generated successfully."
      );

      console.log(
        "================================\n"
      );

      res.json({
        answer,
        sources
      });

    } catch (error) {

      console.error(
        "\nASK ERROR:"
      );

      console.error(
        error?.message ||
        error
      );

      const status =
        error?.status ||
        error?.response?.status;

      if (
        status === 503
      ) {

        return res.status(503).json({
          error:
            "Gemini is temporarily unavailable. Please try again in a moment."
        });
      }

      if (
        status === 429
      ) {

        return res.status(429).json({
          error:
            "Gemini is temporarily rate-limited. Please try again in a moment."
        });
      }

      if (
        status === 404
      ) {

        return res.status(404).json({
          error:
            "The configured Gemini model is unavailable."
        });
      }

      res.status(500).json({
        error:
          error?.message ||
          "Failed to answer the question."
      });
    }
  }
);

/* =====================================
   UPLOAD DOCUMENTS
===================================== */

app.post(
  "/api/upload",
  upload.array(
    "files",
    10
  ),

  async (req, res) => {

    if (
      !req.files ||
      req.files.length === 0
    ) {

      return res.status(400).json({
        error:
          "No files uploaded."
      });
    }

    const uploadedFiles =
      [];

    const failedFiles =
      [];

    try {

      for (
        const file of req.files
      ) {

        try {

          let extractedText =
            "";

          const extension =
            path
              .extname(
                file.originalname
              )
              .toLowerCase();

          console.log(
            `\nProcessing: ${file.originalname}`
          );

          console.log(
            `MIME type: ${file.mimetype}`
          );

          console.log(
            `Extension: ${extension}`
          );

          /* =================================
             PDF
          ================================= */

          if (
            file.mimetype ===
              "application/pdf" ||
            extension ===
              ".pdf"
          ) {

            console.log(
              "Extracting PDF text..."
            );

            const data =
              fs.readFileSync(
                file.path
              );

            const parser =
              new PDFParse({
                data
              });

            const result =
              await parser.getText();

            extractedText =
              result.text ||
              "";

            await parser.destroy();

          /* =================================
             DOCX
          ================================= */

          } else if (
            file.mimetype ===
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            extension ===
              ".docx"
          ) {

            console.log(
              "Extracting DOCX text..."
            );

            const result =
              await mammoth.extractRawText({
                path:
                  file.path
              });

            extractedText =
              result.value ||
              "";

          /* =================================
             TXT
          ================================= */

          } else if (
            file.mimetype ===
              "text/plain" ||
            extension ===
              ".txt"
          ) {

            console.log(
              "Reading TXT file..."
            );

            extractedText =
              fs.readFileSync(
                file.path,
                "utf8"
              );

          /* =================================
             UNSUPPORTED
          ================================= */

          } else {

            failedFiles.push({
              fileName:
                file.originalname,
              reason:
                "Unsupported file type."
            });

            continue;
          }

          /* =================================
             CLEAN TEXT
          ================================= */

          extractedText =
            extractedText.trim();

          console.log(
            `Extracted characters: ${extractedText.length}`
          );

          /* =================================
             EMPTY CHECK
          ================================= */

          if (
            !extractedText
          ) {

            failedFiles.push({
              fileName:
                file.originalname,
              reason:
                "The document does not contain readable text."
            });

            continue;
          }

          /* =================================
             CHUNK
          ================================= */

          const chunks =
            chunkText(
              extractedText
            );

          console.log(
            `Created ${chunks.length} chunks.`
          );

          if (
            chunks.length === 0
          ) {

            failedFiles.push({
              fileName:
                file.originalname,
              reason:
                "The document could not be divided into readable chunks."
            });

            continue;
          }

          /* =================================
             STORE
          ================================= */

          await storeChunks(
            chunks,
            file.originalname
          );

          uploadedFiles.push(
            file.originalname
          );

          console.log(
            `${file.originalname} indexed successfully.`
          );

        } catch (error) {

          console.error(
            `Error processing ${file.originalname}:`
          );

          console.error(
            error?.message ||
            error
          );

          failedFiles.push({
            fileName:
              file.originalname,
            reason:
              error?.message ||
              "Failed to process the document."
          });

        } finally {

          if (
            fs.existsSync(
              file.path
            )
          ) {

            fs.unlinkSync(
              file.path
            );
          }
        }
      }

      res.json({
        message:
          "Document processing completed.",
        uploaded:
          uploadedFiles,
        failed:
          failedFiles
      });

    } catch (error) {

      console.error(
        "Upload error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to process uploaded documents."
      });
    }
  }
);

/* =====================================
   GET INDEXED DOCUMENTS
===================================== */

app.get(
  "/api/documents",
  async (req, res) => {

    try {

      const result =
        await qdrant.scroll(
          COLLECTION_NAME,
          {
            limit:
              100,
            with_payload:
              true,
            with_vector:
              false
          }
        );

      const documents =
        [
          ...new Set(
            result.points
              .map(
                (point) =>
                  point.payload?.fileName
              )
              .filter(Boolean)
          )
        ];

      res.json(
        documents
      );

    } catch (error) {

      console.error(
        "Error fetching documents:",
        error
      );

      res.status(500).json({
        error:
          "Failed to fetch documents."
      });
    }
  }
);

/* =====================================
   DELETE ONE DOCUMENT
===================================== */

app.delete(
  "/api/documents/:fileName",
  async (req, res) => {

    try {

      const fileName =
        req.params.fileName;

      if (
        !fileName
      ) {

        return res.status(400).json({
          error:
            "File name is required."
        });
      }

      await qdrant.delete(
        COLLECTION_NAME,
        {
          filter: {
            must: [
              {
                key:
                  "fileName",
                match: {
                  value:
                    fileName
                }
              }
            ]
          }
        }
      );

      console.log(
        `Deleted document: ${fileName}`
      );

      res.json({
        message:
          `${fileName} deleted successfully.`
      });

    } catch (error) {

      console.error(
        "Error deleting document:",
        error
      );

      res.status(500).json({
        error:
          "Failed to delete document."
      });
    }
  }
);

/* =====================================
   CLEAR ALL DOCUMENTS
===================================== */

app.post(
  "/api/clear-pdf",
  async (req, res) => {

    try {

      await clearCollection();

      res.json({
        message:
          "Documents cleared successfully!"
      });

    } catch (error) {

      console.error(
        "Error clearing documents:",
        error
      );

      res.status(500).json({
        error:
          "Failed to clear documents."
      });
    }
  }
);

/* =====================================
   START SERVER
===================================== */

async function startServer() {

  try {

    console.log(
      "Starting Personal AI Knowledge Assistant..."
    );

    await createCollection();

    app.listen(
      5000,
      () => {

        console.log(
          "Server is running on port 5000"
        );

        console.log(
          "Health: http://localhost:5000/api/health"
        );
      }
    );

  } catch (error) {

    console.error(
      "Failed to start server:"
    );

    console.error(
      error?.message ||
      error
    );
  }
}

startServer();