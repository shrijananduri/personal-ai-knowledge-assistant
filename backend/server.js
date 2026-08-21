   let pdfText = "";
   require("dotenv").config();
const cors = require("cors");
const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const multer = require("multer");
const fs = require("fs");
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


app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).send("Only PDF files are allowed.");
    }

    console.log(req.file);

    const filePath = req.file.path;

    const dataBuffer = fs.readFileSync(filePath);

    const parser = new PDFParse({ data: dataBuffer });

    const result = await parser.getText();

    pdfText = result.text;

    res.send("File received!");
  } catch (error) {
    console.error("PDF upload error:", error);
    res.status(500).send("Failed to process PDF.");
  }
});
app.post("/api/clear-pdf", (req, res) => {
  pdfText = "";
  res.send("PDF cleared successfully!");
});
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});