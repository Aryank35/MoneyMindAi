import { useRef, useState } from "react";
import {
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiImage,
  FiLink,
  FiLoader,
  FiPaperclip,
  FiPlus,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";

import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";
import EmptyState from "../common/EmptyState";
import ConfirmDialog from "../common/ConfirmDialog";
import { useToast } from "../common/Toast";

import {
  approximateBytes,
  formatBytes,
  prepareAttachment,
} from "../../utils/imageFile";

const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const formatWhen = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "";

// =========================================================================
// THE BOARD
//
// Everything about the event that is not money and not a task: what you
// wrote down, what you saved a link to, and the bills and photos.
//
// Attachments arrive here as thumbnails only. The full image is fetched
// when one is opened, which is what keeps an event with thirty receipts
// from costing thirty megabytes to look at.
// =========================================================================

export default function EventBoardTab({
  event,
  attachments,
  onAdd,
  onUpdate,
  onRemove,
  onUploadAttachment,
  onDeleteAttachment,
  onOpenAttachment,
  maxAttachmentBytes,
}) {
  const toast = useToast();
  const fileRef = useRef(null);

  const [noteDraft, setNoteDraft] = useState(null);
  const [linkDraft, setLinkDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [removing, setRemoving] = useState(null);

  const [viewer, setViewer] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  // Receipts and holiday photos want to be looked at in different places, so
  // which pile a file lands in is chosen before picking it rather than
  // guessed from the filename afterwards.
  const [uploadKind, setUploadKind] = useState("bill");

  const bills = attachments.filter((item) => item.kind === "bill");
  const photos = attachments.filter((item) => item.kind === "photo");

  // ---------------------------------------------------------------- notes --
  const saveNote = async () => {
    if (!noteDraft.title.trim() && !noteDraft.body.trim()) {
      toast.error("A note needs a title or some text");

      return;
    }

    try {
      setBusy(true);

      if (noteDraft._id) {
        await onUpdate("notes", noteDraft._id, {
          title: noteDraft.title,
          body: noteDraft.body,
        });
      } else {
        await onAdd("notes", { title: noteDraft.title, body: noteDraft.body });
      }

      setNoteDraft(null);
    } catch (error) {
      console.error(error);

      toast.error("Could not save that note");
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (note) => {
    try {
      await onUpdate("notes", note._id, { pinned: !note.pinned });
    } catch (error) {
      console.error(error);

      toast.error("Could not update that note");
    }
  };

  // ---------------------------------------------------------------- links --
  const saveLink = async () => {
    if (!linkDraft.url.trim()) {
      toast.error("Paste a link");

      return;
    }

    try {
      setBusy(true);

      await onAdd("links", { url: linkDraft.url, title: linkDraft.title });

      setLinkDraft(null);
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not save that link");
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------- uploads --
  const handleFiles = async (event_) => {
    const files = [...(event_.target.files || [])];

    // The input keeps its value, so picking the same file twice in a row
    // would otherwise do nothing the second time.
    event_.target.value = "";

    if (files.length === 0) return;

    setUploading(files.length);

    let saved = 0;

    for (const file of files) {
      try {
        const prepared = await prepareAttachment(file, maxAttachmentBytes);

        await onUploadAttachment({ ...prepared, kind: uploadKind });

        saved += 1;
      } catch (error) {
        console.error(error);

        toast.error(error?.message || `Could not attach ${file.name}`);
      }

      setUploading(files.length - saved);
    }

    setUploading(0);

    if (saved > 0) {
      toast.success(`${saved} file${saved === 1 ? "" : "s"} attached`);
    }
  };

  const openViewer = async (attachment) => {
    setViewer({ ...attachment, dataUrl: null });
    setViewerLoading(true);

    try {
      const full = await onOpenAttachment(attachment._id);

      setViewer(full);
    } catch (error) {
      console.error(error);

      toast.error("Could not open that file");
      setViewer(null);
    } finally {
      setViewerLoading(false);
    }
  };

  const confirmRemove = async () => {
    try {
      setBusy(true);

      if (removing.kind === "attachment") {
        await onDeleteAttachment(removing.item._id);
      } else {
        await onRemove(removing.kind, removing.item._id);
      }

      setRemoving(null);
    } catch (error) {
      console.error(error);

      toast.error("Could not remove that");
    } finally {
      setBusy(false);
    }
  };

  const notes = [...(event.notes || [])].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned),
  );

  return (
    <div className="space-y-8">
      {/* ============ NOTES ============ */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Notes</h3>

          {!noteDraft && (
            <Button
              size="sm"
              icon={FiPlus}
              variant="secondary"
              onClick={() => setNoteDraft({ title: "", body: "" })}
            >
              Add a note
            </Button>
          )}
        </div>

        {noteDraft && (
          <div className="mb-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4">
            <Input
              label="Title"
              placeholder="Packing list"
              value={noteDraft.title}
              onChange={(e) =>
                setNoteDraft({ ...noteDraft, title: e.target.value })
              }
            />

            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor="note-body" className="text-sm text-slate-400">
                Anything you want to remember
              </label>

              <textarea
                id="note-body"
                rows={5}
                value={noteDraft.body}
                onChange={(e) =>
                  setNoteDraft({ ...noteDraft, body: e.target.value })
                }
                placeholder={"- Power bank\n- Chargers\n- Meds"}
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setNoteDraft(null)}
                disabled={busy}
              >
                Cancel
              </Button>

              <Button size="sm" onClick={saveNote} loading={busy}>
                Save
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 && !noteDraft ? (
          <EmptyState
            icon={FiFileText}
            title="No notes"
            message="Packing lists, who is driving, the hotel's cancellation rule — anything you will want later."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {notes.map((note) => (
              <div
                key={note._id}
                className={`rounded-2xl border p-4 transition ${
                  note.pinned
                    ? "border-indigo-500/30 bg-indigo-500/[0.07]"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words font-medium">
                    {note.title || "Untitled"}
                  </p>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => togglePin(note)}
                      aria-label={note.pinned ? "Unpin note" : "Pin note"}
                      title={note.pinned ? "Unpin" : "Pin to the top"}
                      className={`rounded-lg p-1.5 transition hover:bg-white/5 ${
                        note.pinned ? "text-indigo-300" : "text-slate-500"
                      }`}
                    >
                      <FiPaperclip size={14} />
                    </button>

                    <button
                      onClick={() =>
                        setNoteDraft({
                          _id: note._id,
                          title: note.title,
                          body: note.body,
                        })
                      }
                      aria-label="Edit note"
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
                    >
                      <FiFileText size={14} />
                    </button>

                    <button
                      onClick={() => setRemoving({ kind: "notes", item: note })}
                      aria-label="Remove note"
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-red-300"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>

                {note.body && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">
                    {note.body}
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-600">
                  {formatWhen(note.updatedAt || note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============ LINKS ============ */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Links</h3>

          {!linkDraft && (
            <Button
              size="sm"
              icon={FiPlus}
              variant="secondary"
              onClick={() => setLinkDraft({ url: "", title: "" })}
            >
              Paste a link
            </Button>
          )}
        </div>

        {linkDraft && (
          <div className="mb-3 grid gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 md:grid-cols-[2fr_1fr_auto] md:items-end">
            <Input
              label="Link"
              placeholder="https://maps.app.goo.gl/..."
              value={linkDraft.url}
              onChange={(e) => setLinkDraft({ ...linkDraft, url: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveLink();
              }}
            />

            <Input
              label="Call it"
              placeholder="Optional"
              value={linkDraft.title}
              onChange={(e) =>
                setLinkDraft({ ...linkDraft, title: e.target.value })
              }
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setLinkDraft(null)}
                disabled={busy}
              >
                Cancel
              </Button>

              <Button size="sm" onClick={saveLink} loading={busy}>
                Save
              </Button>
            </div>
          </div>
        )}

        {(event.links || []).length === 0 && !linkDraft ? (
          <EmptyState
            icon={FiLink}
            title="No links"
            message="Booking confirmations, a maps pin, the menu, a packing guide."
          />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {(event.links || []).map((link) => (
              <div
                key={link._id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                  <FiLink size={15} />
                </span>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 transition hover:text-indigo-200"
                >
                  <span className="block truncate font-medium">
                    {link.title || domainOf(link.url)}
                  </span>

                  <span className="block truncate text-xs text-slate-500">
                    {domainOf(link.url)}
                  </span>
                </a>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${link.title || link.url}`}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
                >
                  <FiExternalLink size={14} />
                </a>

                <button
                  onClick={() => setRemoving({ kind: "links", item: link })}
                  aria-label="Remove link"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-red-300"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============ FILES ============ */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Bills &amp; pictures</h3>

            <p className="text-xs text-slate-500">
              Photos are shrunk on your device before they are sent — up to{" "}
              {formatBytes(maxAttachmentBytes)} each
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-white/10 p-0.5">
              {[
                { key: "bill", label: "Bill" },
                { key: "photo", label: "Picture" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setUploadKind(option.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    uploadKind === option.key
                      ? "bg-indigo-500/20 text-indigo-100"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="secondary"
              icon={uploading > 0 ? FiLoader : FiUpload}
              onClick={() => fileRef.current?.click()}
              disabled={uploading > 0}
            >
              {uploading > 0 ? `${uploading} to go...` : "Attach files"}
            </Button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
        </div>

        {attachments.length === 0 ? (
          <EmptyState
            icon={FiImage}
            title="Nothing attached"
            message="Snap the bills as you go. Come the settle-up, nobody has to take anyone's word for it."
            action={
              <Button
                size="sm"
                icon={FiUpload}
                onClick={() => fileRef.current?.click()}
              >
                Attach files
              </Button>
            }
          />
        ) : (
          <>
            {[
              { list: bills, label: "Bills & receipts" },
              { list: photos, label: "Pictures" },
            ]
              .filter((group) => group.list.length > 0)
              .map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
                    {group.label} · {group.list.length}
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.list.map((item) => (
                      <div
                        key={item._id}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
                      >
                        <button
                          onClick={() => openViewer(item)}
                          className="block aspect-square w-full"
                          aria-label={`Open ${item.name || "attachment"}`}
                        >
                          {item.thumbUrl ? (
                            <img
                              src={item.thumbUrl}
                              alt={item.caption || item.name || "Attachment"}
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                          ) : (
                            <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                              <FiFileText size={26} />
                              <span className="px-2 text-center text-xs">
                                PDF
                              </span>
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() =>
                            setRemoving({ kind: "attachment", item })
                          }
                          aria-label="Remove attachment"
                          className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-slate-300 opacity-0 transition hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
                        >
                          <FiTrash2 size={13} />
                        </button>

                        <p className="truncate px-2.5 py-2 text-xs text-slate-400">
                          {item.caption || item.name || formatBytes(item.size)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </>
        )}
      </section>

      {/* ============ VIEWER ============ */}
      <Modal
        isOpen={!!viewer}
        onClose={() => setViewer(null)}
        title={viewer?.name || "Attachment"}
        maxWidth="max-w-4xl"
      >
        {viewerLoading || !viewer?.dataUrl ? (
          <div className="flex h-64 items-center justify-center text-slate-400">
            <FiLoader className="animate-spin" size={26} />
          </div>
        ) : viewer.mimeType === "application/pdf" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <FiFileText size={48} className="text-slate-400" />

            <p className="text-sm text-slate-400">
              {viewer.name} · {formatBytes(viewer.size)}
            </p>

            <a
              href={viewer.dataUrl}
              download={viewer.name || "attachment.pdf"}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-400 px-5 py-3 text-sm font-semibold text-slate-950"
            >
              <FiDownload size={15} />
              Open the PDF
            </a>
          </div>
        ) : (
          <>
            <img
              src={viewer.dataUrl}
              alt={viewer.caption || viewer.name || "Attachment"}
              className="max-h-[65vh] w-full rounded-xl object-contain"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {formatBytes(approximateBytes(viewer.dataUrl))} ·{" "}
                {formatWhen(viewer.createdAt)}
              </p>

              <a
                href={viewer.dataUrl}
                download={viewer.name || "attachment.jpg"}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-white/25 hover:text-white"
              >
                <FiDownload size={14} />
                Save
              </a>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        loading={busy}
        title="Remove this?"
        message={
          removing?.kind === "attachment"
            ? "The file will be deleted. If it is the only copy of that bill, it is gone for good."
            : "This will be deleted."
        }
        confirmLabel="Remove"
      />
    </div>
  );
}
