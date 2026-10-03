function chunkText(
  text,
  chunkSize = 1000,
  overlap = 200
) {

  const chunks = [];

  if (!text || !text.trim()) {
    return chunks;
  }


  let start = 0;


  while (start < text.length) {

    const end =
      Math.min(
        start + chunkSize,
        text.length
      );


    const chunk =
      text
        .slice(start, end)
        .trim();


    if (chunk) {
      chunks.push(chunk);
    }


    if (end >= text.length) {
      break;
    }


    start +=
      chunkSize - overlap;
  }


  return chunks;
}


module.exports = chunkText;