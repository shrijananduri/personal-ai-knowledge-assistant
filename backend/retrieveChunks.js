const qdrant = require("./qdrant");
const embedText = require("./embedText");
const { COLLECTION_NAME } = require("./qdrantCollection");

async function retrieveChunks(question, limit = 5) {
  const questionVector = await embedText(question);

  const results = await qdrant.query(COLLECTION_NAME, {
    query: questionVector,
    limit: limit,
    with_payload: true
  });

  const relevantResults = results.points;

  return relevantResults.map((result) => ({
    text: result.payload.text,
    fileName: result.payload.fileName,
    chunkIndex: result.payload.chunkIndex,
    score: result.score
  }));
}

module.exports = retrieveChunks;