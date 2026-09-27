const qdrant = require("./qdrant");

const COLLECTION_NAME = "personal_ai_documents";

async function createCollection() {
  const collections = await qdrant.getCollections();

  const exists = collections.collections.some(
    (collection) =>
      collection.name === COLLECTION_NAME
  );

  if (!exists) {
    await qdrant.createCollection(
      COLLECTION_NAME,
      {
        vectors: {
          size: 3072,
          distance: "Cosine"
        }
      }
    );

    console.log("Qdrant collection created!");
  } else {
    console.log(
      "Qdrant collection already exists!"
    );
  }
}

async function clearCollection() {
  const collections = await qdrant.getCollections();

  const exists = collections.collections.some(
    (collection) =>
      collection.name === COLLECTION_NAME
  );

  if (exists) {
    await qdrant.deleteCollection(
      COLLECTION_NAME
    );
  }

  await qdrant.createCollection(
    COLLECTION_NAME,
    {
      vectors: {
        size: 3072,
        distance: "Cosine"
      }
    }
  );

  console.log("Qdrant collection cleared!");
}

module.exports = {
  COLLECTION_NAME,
  createCollection,
  clearCollection
};