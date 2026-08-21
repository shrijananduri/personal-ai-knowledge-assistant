   let pdfText = "";
   require("dotenv").config();
const cors = require("cors");
const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const multer = require("multer");
const fs = require("fs");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello from backend!");
});
app.post("/api/ask", async (req, res) => {
  const question = req.body.question;
const messages = req.body.messages;
const recentMessages = messages.slice(-6, -1);

const conversation = recentMessages
  .map((message) => `User: ${message.question}\nAI: ${message.answer}`)
  .join("\n");
  if (!pdfText) {
  return res.status(400).send("Please upload a PDF first.");
}
  
const prompt = `Use the following PDF content to answer the user's question.

PDF content:
${pdfText}

${conversation ? `Previous conversation:
${conversation}` : ""}

Current user question:
${question}`;
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt
  });

  res.send(response.text);
});


app.post("/api/upload", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    let allText = "";

    for (const file of req.files) {
      const filePath = file.path;
      const fileType = file.mimetype;

      let extractedText = "";

      if (fileType === "application/pdf") {
        const dataBuffer = fs.readFileSync(filePath);

        const parser = new PDFParse({ data: dataBuffer });

        const result = await parser.getText();

        extractedText = result.text;
      } 
      else if (fileType === "text/plain") {
        extractedText = fs.readFileSync(filePath, "utf8");
      } 
      else if (
        fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const result = await mammoth.extractRawText({
          path: filePath
        });

        extractedText = result.value;
      } 
      else {
        return res.status(400).send(
          `Unsupported file type: ${file.originalname}`
        );
      }

      allText += `\n\n--- ${file.originalname} ---\n\n${extractedText}`;
    }

    pdfText = allText;

    res.send("Documents uploaded successfully!");
  } catch (error) {
    console.error("Document processing error:", error);
    res.status(500).send("Failed to process documents.");
  }
});
app.post("/api/clear-pdf", (req, res) => {
  pdfText = "";
  res.send("PDF cleared successfully!");
});
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});