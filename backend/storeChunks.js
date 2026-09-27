const qdrant = require("./qdrant");
const embedText = require("./embedText");
const { COLLECTION_NAME } = require("./qdrantCollection");

async function storeChunks(chunks, fileName) {
  const points = [];

  for (let i = 0; i < chunks.length; i++) {
    const vector = await embedText(chunks[i]);

    points.push({
      id: Date.now() + i,
      vector: vector,
      payload: {
        text: chunks[i],
        fileName: fileName,
        chunkIndex: i
      }
    });
  }

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points: points
  });

  console.log(`${chunks.length} chunks stored from ${fileName}`);
}

module.exports = storeChunks;