const parseBase64 = (base64String) => {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 string");
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  const extension = mimeType.split("/")[1] || "jpg";
  const fakeFileName = `upload.${extension}`;

  return { mimeType, buffer, fakeFileName };
};

module.exports = { parseBase64 };
