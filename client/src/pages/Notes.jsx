import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import DashboardLayout from "../components/layout/DashboardLayout";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import EmptyState from "../components/common/EmptyState";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Skeleton } from "../components/common/Loader";
import { useToast } from "../components/common/Toast";

import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  clearDoneNotes,
} from "../services/noteService";
import { getUserId } from "../utils/auth";

// =========================================================================
// NOTES AND TO-DOS
//
// One list, two kinds. A checklist is a group of to-dos sharing a name, so
// there is nothing extra to learn and any item can join a group later.
// =========================================================================

const UNGROUPED = "__ungrouped__";

const emptyDraft = () => ({
  kind: "todo",
  title: "",
  body: "",
  group: "",
  dueDate: "",
  pinned: false,
});

const toInputDate = (value) =>
  value ? new Date(value).toISOString().split("T")[0] : "";

const formatDue = (value) => {
  const date = new Date(value);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Math.round((date - today) / 86400000);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days <= 7) return `In ${days} days`;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const isOverdue = (item) =>
  !item.done && item.dueDate && new Date(item.dueDate) < new Date();

export default function Notes() {
  const toast = useToast();

  const [notes, setNotes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showClearDone, setShowClearDone] = useState(false);

  // Quick-add: the whole point of a to-do list is that writing one down costs
  // nothing, so the fast path is a single always-focused field.
  const [quick, setQuick] = useState("");
  const quickRef = useRef(null);

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const userId = getUserId();

        if (!userId) return;

        const response = await getNotes(userId);

        if (cancelled) return;

        setNotes(response.data?.notes || []);
        setGroups(response.data?.groups || []);
        setCounts(response.data?.counts || {});
      } catch (error) {
        console.error("Notes error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = () => setReloadToken((value) => value + 1);

  // =====================================================================
  // ACTIONS
  // =====================================================================

  const handleQuickAdd = async (event) => {
    event.preventDefault();

    const title = quick.trim();

    if (!title) return;

    // Cleared immediately: waiting for the round trip to empty the box is
    // what stops people adding three things in a row.
    setQuick("");

    try {
      await createNote({ userId: getUserId(), kind: "todo", title });

      reload();
    } catch (error) {
      console.error(error);

      toast.error("Could not add that");

      setQuick(title);
    } finally {
      quickRef.current?.focus();
    }
  };

  const toggleDone = async (item) => {
    // Flipped locally first; a tick that waits for the server feels broken.
    setNotes((current) =>
      current.map((note) =>
        note._id === item._id ? { ...note, done: !note.done } : note,
      ),
    );

    try {
      await updateNote(item._id, { done: !item.done });

      reload();
    } catch (error) {
      console.error(error);

      toast.error("Could not update that");

      reload();
    }
  };

  const openNew = (kind = "todo", group = "") => {
    setEditing(null);
    setDraft({ ...emptyDraft(), kind, group });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);

    setDraft({
      kind: item.kind,
      title: item.title,
      body: item.body || "",
      group: item.group || "",
      dueDate: toInputDate(item.dueDate),
      pinned: Boolean(item.pinned),
    });

    setShowModal(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error("Give it a title");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        kind: draft.kind,
        title: draft.title.trim(),
        body: draft.body,
        group: draft.group.trim(),
        pinned: draft.pinned,
        dueDate: draft.dueDate || null,
      };

      if (editing) {
        await updateNote(editing._id, payload);

        toast.success("Saved");
      } else {
        await createNote({ ...payload, userId: getUserId() });

        toast.success("Added");
      }

      setShowModal(false);
      setEditing(null);
      reload();
    } catch (error) {
      console.error(error);

      toast.error(error?.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSaving(true);

      await deleteNote(deleteTarget._id);

      toast.success("Deleted");

      setDeleteTarget(null);
      reload();
    } catch (error) {
      console.error(error);

      toast.error("Could not delete");
    } finally {
      setSaving(false);
    }
  };

  const confirmClearDone = async () => {
    try {
      setSaving(true);

      const response = await clearDoneNotes(getUserId());

      toast.success(`Cleared ${response.data?.removed || 0} finished`);

      setShowClearDone(false);
      reload();
    } catch (error) {
      console.error(error);

      toast.error("Could not clear");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================================
  // WHAT IS ON SCREEN
  // =====================================================================

  // The pinned section is hidden on the Done view, and the sections below
  // must agree - otherwise a pinned item would vanish entirely there.
  const showPinnedSection = filter !== "done";

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return notes.filter((note) => {
      if (filter === "open" && note.kind === "todo" && note.done) return false;
      if (filter === "done" && !(note.kind === "todo" && note.done)) return false;
      if (filter === "notes" && note.kind !== "note") return false;

      if (!term) return true;

      return [note.title, note.body, note.group]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [notes, filter, search]);

  const pinned = useMemo(
    () => visible.filter((note) => note.pinned),
    [visible],
  );

  // A checklist's progress is a property of the group, not of what the
  // current filter happens to show. Counting only visible items made every
  // group read "0 of n done" under the To-do filter, which hides the done
  // ones - the exact opposite of what progress is for.
  const groupProgress = useMemo(() => {
    const map = new Map();

    for (const note of notes) {
      if (note.kind !== "todo") continue;

      const key = note.group || UNGROUPED;

      const entry = map.get(key) || { done: 0, todos: 0 };

      entry.todos += 1;

      if (note.done) entry.done += 1;

      map.set(key, entry);
    }

    return map;
  }, [notes]);

  // Grouped, with pinned items surfacing above their group so something
  // marked important is not buried inside a collapsed checklist.
  const sections = useMemo(() => {
    const map = new Map();

    for (const note of visible) {
      // Already shown in the Pinned section above; listing it again in its
      // group made the same item appear twice on one screen.
      if (note.pinned && showPinnedSection) continue;

      const key = note.group || UNGROUPED;

      if (!map.has(key)) map.set(key, []);

      map.get(key).push(note);
    }

    return [...map.entries()]
      .map(([key, items]) => ({
        key,
        label: key === UNGROUPED ? "Everything else" : key,
        items,
        done: groupProgress.get(key)?.done || 0,
        todos: groupProgress.get(key)?.todos || 0,
      }))
      .sort((a, b) => {
        // Named groups first, in name order; loose items last.
        if (a.key === UNGROUPED) return 1;
        if (b.key === UNGROUPED) return -1;

        return a.label.localeCompare(b.label);
      });
  }, [visible, groupProgress, showPinnedSection]);

  const FILTERS = [
    { key: "open", label: "To do", count: counts.open },
    { key: "all", label: "All", count: counts.total },
    { key: "notes", label: "Notes", count: counts.notes },
    { key: "done", label: "Done", count: counts.done },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-20 rounded-2xl" />

        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Notes &amp; to-dos</h1>

          <p className="mt-1 text-slate-400 text-sm">
            {counts.open > 0
              ? `${counts.open} still to do${
                  counts.overdue > 0 ? `, ${counts.overdue} overdue` : ""
                }`
              : "Nothing outstanding"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={FiFileText} onClick={() => openNew("note")}>
            New note
          </Button>

          <Button icon={FiPlus} onClick={() => openNew("todo")}>
            New to-do
          </Button>
        </div>
      </div>

      {/* Quick add - one field, always ready. */}
      <form onSubmit={handleQuickAdd} className="mb-5">
        <div className="flex gap-2">
          <input
            ref={quickRef}
            value={quick}
            onChange={(event) => setQuick(event.target.value)}
            placeholder="Add a to-do and press Enter"
            aria-label="Add a to-do"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none transition-colors focus:border-indigo-500"
          />

          <Button type="submit" icon={FiPlus} disabled={!quick.trim()}>
            Add
          </Button>
        </div>
      </form>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`rounded-xl border px-3 py-2 text-sm transition ${
              filter === option.key
                ? "border-indigo-400/40 bg-indigo-400/10 text-indigo-200"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
            }`}
          >
            {option.label}
            {option.count > 0 && (
              <span className="ml-1.5 text-xs text-slate-500">
                {option.count}
              </span>
            )}
          </button>
        ))}

        <div className="relative ml-auto min-w-0">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            aria-label="Search notes and to-dos"
            className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 pl-9 text-sm outline-none transition-colors focus:border-indigo-500"
          />
        </div>

        {counts.done > 0 && (
          <button
            type="button"
            onClick={() => setShowClearDone(true)}
            className="rounded-xl px-3 py-2 text-xs text-slate-400 transition hover:text-white"
          >
            Clear {counts.done} done
          </button>
        )}
      </div>

      {/* Pinned, lifted out so they are never inside a collapsed group. */}
      {pinned.length > 0 && showPinnedSection && (
        <section className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h2 className="mb-3 text-xs uppercase tracking-wide text-amber-200/70">
            Pinned
          </h2>

          <ul className="space-y-2">
            {pinned.map((item) => (
              <Item
                key={item._id}
                item={item}
                onToggle={toggleDone}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        </section>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={FiFileText}
          title={search ? "Nothing matches" : "Nothing here yet"}
          message={
            search
              ? "Try a different search."
              : filter === "done"
                ? "Finished to-dos will collect here."
                : "Jot something down above — it takes a second."
          }
        />
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const isCollapsed = collapsed[section.key];

            return (
              <section
                key={section.key}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [section.key]: !current[section.key],
                    }))
                  }
                  aria-expanded={!isCollapsed}
                  className="mb-3 flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FiChevronDown
                      className={`shrink-0 text-slate-500 transition ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />

                    <span className="truncate text-sm font-semibold">
                      {section.label}
                    </span>
                  </span>

                  {section.todos > 0 && (
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {section.done} of {section.todos} done
                    </span>
                  )}
                </button>

                {/* A checklist's progress, which is the reason to group. */}
                {section.todos > 0 && !isCollapsed && (
                  <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                      style={{
                        width: `${Math.round((section.done / section.todos) * 100)}%`,
                      }}
                    />
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {section.items.map((item) => (
                        <Item
                          key={item._id}
                          item={item}
                          onToggle={toggleDone}
                          onEdit={openEdit}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      )}

      {/* ===================== EDITOR ===================== */}

      <Modal
        isOpen={showModal}
        onClose={() => (saving ? null : setShowModal(false))}
        title={editing ? "Edit" : draft.kind === "note" ? "New note" : "New to-do"}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            {["todo", "note"].map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setDraft({ ...draft, kind })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm transition ${
                  draft.kind === kind
                    ? "border-indigo-400/50 bg-indigo-400/10 text-indigo-200"
                    : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {kind === "todo" ? "To-do" : "Note"}
              </button>
            ))}
          </div>

          <Input
            label="Title"
            value={draft.title}
            autoFocus
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            placeholder={
              draft.kind === "note" ? "What is worth remembering?" : "What needs doing?"
            }
          />

          <div>
            <label htmlFor="note-body" className="mb-1.5 block text-sm text-slate-400">
              Details
            </label>

            <textarea
              id="note-body"
              rows={draft.kind === "note" ? 6 : 3}
              value={draft.body}
              onChange={(event) =>
                setDraft({ ...draft, body: event.target.value })
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm outline-none transition-colors focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="note-group" className="mb-1.5 block text-sm text-slate-400">
                Group
              </label>

              {/* Typing a new name creates the group; there is nothing to set
                  up first, and an emptied group disappears by itself. */}
              <input
                id="note-group"
                list="note-groups"
                value={draft.group}
                onChange={(event) =>
                  setDraft({ ...draft, group: event.target.value })
                }
                placeholder="e.g. Month-end"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm outline-none transition-colors focus:border-indigo-500"
              />

              <datalist id="note-groups">
                {groups.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
            </div>

            {draft.kind === "todo" && (
              <Input
                label="Due"
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  setDraft({ ...draft, dueDate: event.target.value })
                }
              />
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(event) =>
                setDraft({ ...draft, pinned: event.target.checked })
              }
              className="h-4 w-4 accent-indigo-400"
            />
            Pin to the top
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button onClick={handleSave} loading={saving}>
              {editing ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete this?"
        message={`"${deleteTarget?.title || ""}" will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={saving}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={showClearDone}
        title="Clear finished to-dos?"
        message={`${counts.done} finished to-do${
          counts.done === 1 ? "" : "s"
        } will be removed. Notes are left alone.`}
        confirmLabel="Clear"
        variant="danger"
        loading={saving}
        onConfirm={confirmClearDone}
        onClose={() => setShowClearDone(false)}
      />
    </DashboardLayout>
  );
}

// A single row. Notes have no tick-box - ticking something that was never a
// task is the kind of thing that makes a list untrustworthy.
function Item({ item, onToggle, onEdit, onDelete }) {
  const overdue = isOverdue(item);

  return (
    <li
      className={`group flex items-start gap-3 rounded-xl border p-3 transition ${
        item.done
          ? "border-white/5 bg-black/20"
          : overdue
            ? "border-red-500/25 bg-red-500/5"
            : "border-white/10 bg-black/20 hover:border-white/20"
      }`}
    >
      {item.kind === "todo" ? (
        <button
          type="button"
          onClick={() => onToggle(item)}
          aria-label={item.done ? `Mark ${item.title} not done` : `Mark ${item.title} done`}
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
            item.done
              ? "border-emerald-400 bg-emerald-400 text-slate-950"
              : "border-white/25 hover:border-emerald-400"
          }`}
        >
          {item.done && <FiCheck size={13} />}
        </button>
      ) : (
        <FiFileText className="mt-0.5 shrink-0 text-slate-500" />
      )}

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${
            item.done ? "text-slate-500 line-through" : "text-slate-100"
          }`}
        >
          {item.title}
        </p>

        {item.body && (
          <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-500">
            {item.body}
          </p>
        )}

        {item.dueDate && item.kind === "todo" && (
          <p
            className={`mt-1 text-xs ${
              overdue ? "text-red-300" : "text-slate-500"
            }`}
          >
            {overdue ? "Overdue · " : "Due "}
            {formatDue(item.dueDate)}
          </p>
        )}
      </div>

      {/* Always present on touch, revealed on hover at a pointer. */}
      <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.title}`}
          className="rounded-lg p-2 text-slate-400 transition hover:text-white"
        >
          <FiEdit2 size={14} />
        </button>

        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.title}`}
          className="rounded-lg p-2 text-red-400 transition hover:text-red-300"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    </li>
  );
}
