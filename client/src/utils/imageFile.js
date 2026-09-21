// =========================================================================
// IMAGE PREPARATION
//
// A phone camera produces 4-8MB JPEGs. Posting one of those at full size
// would be slow on mobile data, would blow past the server's per-file
// ceiling, and would store far more detail than a receipt needs.
//
// Everything picked is therefore re-encoded in the browser before it is
// sent: a readable full copy, and a small square thumbnail so a gallery of
// twenty bills renders from one response.
//
// PDFs pass through untouched - there is nothing to downscale, and the size
// check is what protects the request.
// =========================================================================

const FULL_MAX_EDGE = 1600;
const THUMB_MAX_EDGE = 320;
const FULL_QUALITY = 0.82;
const THUMB_QUALITY = 0.7;

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("That file could not be read"));

    reader.readAsDataURL(file);
  });

const loadImage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be opened"));

    image.src = dataUrl;
  });

// Draws the source into a canvas no larger than maxEdge on its longest side.
// Never scales up - a small receipt photo stays exactly as it is.
const resize = (image, maxEdge, quality) => {
  const scale = Math.min(maxEdge / Math.max(image.width, image.height), 1);

  const canvas = document.createElement("canvas");

  canvas.width = Math.max(Math.round(image.width * scale), 1);
  canvas.height = Math.max(Math.round(image.height * scale), 1);

  const context = canvas.getContext("2d");

  // Receipts are usually photographed against a dark surface; JPEG has no
  // alpha, so anything transparent would otherwise come out black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", quality);
};

export const approximateBytes = (dataUrl) => {
  const base64 = String(dataUrl || "").split(",")[1] || "";

  return Math.floor((base64.length * 3) / 4);
};

export const formatBytes = (bytes) => {
  const value = Number(bytes || 0);

  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;

  if (value >= 1024) return `${Math.round(value / 1024)} KB`;

  return `${value} B`;
};

export const prepareAttachment = async (file, maxBytes) => {
  if (file.type === "application/pdf") {
    const dataUrl = await readAsDataUrl(file);

    if (approximateBytes(dataUrl) > maxBytes) {
      throw new Error(
        `${file.name} is ${formatBytes(file.size)}, which is over the limit.`,
      );
    }

    return {
      name: file.name,
      mimeType: file.type,
      dataUrl,
      thumbUrl: "",
    };
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only images and PDFs can be attached");
  }

  const original = await readAsDataUrl(file);
  const image = await loadImage(original);

  let dataUrl = resize(image, FULL_MAX_EDGE, FULL_QUALITY);

  // A dense photo can still be large after one pass. Rather than fail, drop
  // the long edge and try again - a legible bill beats a rejected upload.
  for (
    let edge = FULL_MAX_EDGE;
    approximateBytes(dataUrl) > maxBytes && edge > 600;
    edge = Math.round(edge * 0.75)
  ) {
    dataUrl = resize(image, edge, FULL_QUALITY);
  }

  if (approximateBytes(dataUrl) > maxBytes) {
    throw new Error(`${file.name} is too large even after compressing`);
  }

  return {
    name: file.name,
    mimeType: "image/jpeg",
    dataUrl,
    thumbUrl: resize(image, THUMB_MAX_EDGE, THUMB_QUALITY),
  };
};
