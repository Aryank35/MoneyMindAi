import mongoose from "mongoose";

// =========================================================================
// EVENT ATTACHMENT
//
// A bill photo, a screenshot of a booking, or a picture from the day.
//
// The file is held inline as a data URL rather than in object storage,
// because the app has no bucket and adding one would mean credentials,
// signed URLs and a second thing to deploy. The client downscales before
// upload, and the sizes below are enforced again here - a caller that
// skips the client cannot post a 12MB original.
//
// Two copies are kept:
//
//   thumbUrl  a small square, always returned with the list so a gallery
//             renders in one request
//   dataUrl   the full image, fetched only when something is opened
//
// Listing endpoints must select("-dataUrl"). Without that, opening an
// event with twenty bills would ship twenty full images to draw twenty
// thumbnails.
// =========================================================================

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const attachmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // "bill" is called out separately from "photo" so the money view can
    // show receipts without the group selfies in the way.
    kind: {
      type: String,
      enum: ["bill", "photo"],
      default: "bill",
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    caption: {
      type: String,
      default: "",
      trim: true,
    },

    mimeType: {
      type: String,
      default: "image/jpeg",
    },

    // Size of the stored copy, not of whatever the user originally picked.
    size: {
      type: Number,
      default: 0,
    },

    dataUrl: {
      type: String,
      required: true,
    },

    thumbUrl: {
      type: String,
      default: "",
    },

    // Optionally ties a receipt to the expense it proves.
    splitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Split",
      default: null,
    },
  },
  { timestamps: true },
);

attachmentSchema.index({ eventId: 1, createdAt: -1 });

export default mongoose.model("EventAttachment", attachmentSchema);
