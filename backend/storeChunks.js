const qdrant = require("./qdrant");

const embedText =
  require("./embedText");

const {
  COLLECTION_NAME
} = require("./qdrantCollection");

const {
  v4: uuidv4
} = require("uuid");


async function deleteExistingDocument(
  fileName
) {

  await qdrant.delete(
    COLLECTION_NAME,
    {
      filter: {
        must: [
          {
            key: "fileName",
            match: {
              value: fileName
            }
          }
        ]
      }
    }
  );


  console.log(
    `Old chunks removed for ${fileName}`
  );
}


async function storeChunks(
  chunks,
  fileName
) {

  if (
    !chunks ||
    chunks.length === 0
  ) {

    throw new Error(
      "No chunks available to store."
    );
  }


  if (
    !fileName ||
    !fileName.trim()
  ) {

    throw new Error(
      "File name is required."
    );
  }


  console.log(
    `Creating embeddings for ${fileName}...`
  );

  console.log(
    `Total chunks: ${chunks.length}`
  );


  const points = [];


  /*
    Generate ALL embeddings first.

    This prevents us from deleting the
    existing document if embedding fails.
  */

  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {

    console.log(
      `Embedding chunk ${i + 1}/${chunks.length}...`
    );


    const vector =
      await embedText(
        chunks[i]
      );


    points.push({
      id: uuidv4(),

      vector: vector,

      payload: {
        text: chunks[i],

        fileName:
          fileName,

        chunkIndex:
          i
      }
    });
  }


  /*
    Only replace the old document
    after every embedding succeeded.
  */

  await deleteExistingDocument(
    fileName
  );


  console.log(
    `Storing ${points.length} chunks in Qdrant...`
  );


  await qdrant.upsert(
    COLLECTION_NAME,
    {
      wait: true,

      points: points
    }
  );


  console.log(
    `${points.length} chunks stored from ${fileName}`
  );
}


module.exports =
  storeChunks;