const qdrant = require("./qdrant");

const COLLECTION_NAME = "personal_ai_documents";

const VECTOR_SIZE = 3072;

async function ensurePayloadIndex() {
  try {
    await qdrant.createPayloadIndex(
      COLLECTION_NAME,
      {
        field_name: "fileName",
        field_schema: "keyword"
      }
    );

    console.log(
      "Qdrant fileName index ready!"
    );

  } catch (error) {

    // Qdrant can return an error when
    // the index already exists.
    const message =
      error?.message || "";

    if (
      message.toLowerCase().includes("already exists") ||
      message.toLowerCase().includes("exists")
    ) {
      console.log(
        "Qdrant fileName index already exists!"
      );

    } else {
      throw error;
    }
  }
}


async function createCollection() {

  const collections =
    await qdrant.getCollections();

  const exists =
    collections.collections.some(
      (collection) =>
        collection.name ===
        COLLECTION_NAME
    );


  if (!exists) {

    await qdrant.createCollection(
      COLLECTION_NAME,
      {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine"
        }
      }
    );

    console.log(
      "Qdrant collection created!"
    );

  } else {

    console.log(
      "Qdrant collection already exists!"
    );
  }


  await ensurePayloadIndex();

  console.log(
    "Qdrant collection setup complete!"
  );
}


async function clearCollection() {

  const collections =
    await qdrant.getCollections();

  const exists =
    collections.collections.some(
      (collection) =>
        collection.name ===
        COLLECTION_NAME
    );


  if (exists) {

    await qdrant.deleteCollection(
      COLLECTION_NAME
    );

    console.log(
      "Old Qdrant collection deleted!"
    );
  }


  await qdrant.createCollection(
    COLLECTION_NAME,
    {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine"
      }
    }
  );


  await ensurePayloadIndex();


  console.log(
    "Qdrant collection cleared!"
  );
}


module.exports = {
  COLLECTION_NAME,
  createCollection,
  clearCollection
};