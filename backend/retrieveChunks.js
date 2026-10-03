const qdrant =
  require("./qdrant");

const embedText =
  require("./embedText");

const {
  COLLECTION_NAME
} =
  require("./qdrantCollection");


const STOP_WORDS =
  new Set([
    "the",
    "is",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "what",
    "how",
    "why",
    "when",
    "where",
    "who",
    "this",
    "that",
    "are",
    "was",
    "were",
    "be",
    "from",
    "does",
    "do",
    "can",
    "could",
    "would",
    "should"
  ]);


function getKeywords(text) {

  return text
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !STOP_WORDS.has(word)
    );
}


function calculateKeywordScore(
  question,
  text
) {

  const questionKeywords =
    [
      ...new Set(
        getKeywords(question)
      )
    ];


  const textKeywords =
    new Set(
      getKeywords(text)
    );


  if (
    questionKeywords.length === 0
  ) {
    return 0;
  }


  const matchedKeywords =
    questionKeywords.filter(
      (keyword) =>
        textKeywords.has(keyword)
    );


  return (
    matchedKeywords.length /
    questionKeywords.length
  );
}


async function retrieveChunks(
  question,
  limit = 5
) {

  if (
    !question ||
    !question.trim()
  ) {

    return [];
  }


  console.log(
    "\n================================"
  );

  console.log(
    "RAG RETRIEVAL"
  );

  console.log(
    "Question:",
    question
  );


  /*
    Create embedding for the
    user's question.
  */

  const questionVector =
    await embedText(
      question
    );


  console.log(
    "Question embedding generated."
  );


  /*
    Search Qdrant.

    We retrieve more candidates than
    we finally return so that our
    hybrid ranking has more choices.
  */

  const results =
    await qdrant.query(
      COLLECTION_NAME,
      {
        query:
          questionVector,

        limit: 10,

        with_payload: true
      }
    );


  const points =
    results?.points || [];


  console.log(
    `Qdrant returned ${points.length} candidates.`
  );


  if (
    points.length === 0
  ) {

    console.log(
      "NO CHUNKS FOUND."
    );

    console.log(
      "================================\n"
    );

    return [];
  }


  /*
    Hybrid ranking:

    80% semantic similarity
    20% keyword matching
  */

  const candidates =
    points.map(
      (result) => {

        const text =
          result.payload?.text ||
          "";

        const fileName =
          result.payload?.fileName ||
          "Unknown";

        const chunkIndex =
          result.payload?.chunkIndex ??
          0;


        const semanticScore =
          result.score || 0;


        const keywordScore =
          calculateKeywordScore(
            question,
            text
          );


        const combinedScore =
          semanticScore * 0.8 +
          keywordScore * 0.2;


        return {

          text,

          fileName,

          chunkIndex,

          score:
            semanticScore,

          keywordScore,

          combinedScore
        };
      }
    );


  candidates.sort(
    (a, b) =>
      b.combinedScore -
      a.combinedScore
  );


  const finalResults =
    candidates
      .slice(0, limit)
      .map(
        (result) => ({
          text:
            result.text,

          fileName:
            result.fileName,

          chunkIndex:
            result.chunkIndex,

          score:
            result.score,

          keywordScore:
            result.keywordScore,

          combinedScore:
            result.combinedScore
        })
      );


  /*
    Debug information.

    This will make it much easier to
    identify retrieval problems.
  */

  console.log(
    "\nRetrieved chunks:"
  );


  finalResults.forEach(
    (result, index) => {

      console.log(
        `\n--- Result ${index + 1} ---`
      );

      console.log(
        "File:",
        result.fileName
      );

      console.log(
        "Chunk:",
        result.chunkIndex
      );

      console.log(
        "Semantic score:",
        result.score
      );

      console.log(
        "Keyword score:",
        result.keywordScore
      );

      console.log(
        "Combined score:",
        result.combinedScore
      );

      console.log(
        "Text:",
        result.text
      );
    }
  );


  console.log(
    "================================\n"
  );


  return finalResults;
}


module.exports =
  retrieveChunks;