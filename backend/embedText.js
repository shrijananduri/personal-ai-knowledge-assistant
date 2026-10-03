const {
  GoogleGenAI
} = require("@google/genai");


const ai =
  new GoogleGenAI({
    apiKey:
      process.env.GEMINI_API_KEY
  });


async function embedText(text) {

  if (
    !text ||
    !text.trim()
  ) {

    throw new Error(
      "Cannot create embedding for empty text."
    );
  }


  try {

    const response =
      await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: text
      });


    if (
      !response ||
      !response.embeddings ||
      !response.embeddings[0] ||
      !response.embeddings[0].values
    ) {

      throw new Error(
        "Gemini returned an invalid embedding response."
      );
    }


    const vector =
      response.embeddings[0].values;


    console.log(
      `Embedding generated: ${vector.length} dimensions`
    );


    return vector;

  } catch (error) {

    console.error(
      "Embedding generation failed:"
    );

    console.error(
      error?.message ||
      error
    );


    throw error;
  }
}


module.exports = embedText;