import { useMemo, useState } from "react";
import {
  FiCheck,
  FiCheckSquare,
  FiClock,
  FiList,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";

import Button from "../common/Button";
import Input from "../common/Input";
import EmptyState from "../common/EmptyState";
import ConfirmDialog from "../common/ConfirmDialog";
import { useToast } from "../common/Toast";

const formatDue = (value) => {
  if (!value) return null;

  const due = new Date(value);
  const today = new Date();

  const days = Math.round(
    (new Date(due.getFullYear(), due.getMonth(), due.getDate()) -
      new Date(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  );

  if (days === 0) return { label: "due today", tone: "text-amber-300" };
  if (days === 1) return { label: "due tomorrow", tone: "text-amber-300" };

  if (days < 0) {
    return {
      label: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} late`,
      tone: "text-red-300",
    };
  }

  return { label: `in ${days} days`, tone: "text-slate-500" };
};

// =========================================================================
// TASKS
//
// The part of organising that is not money. Kept deliberately plain - a
// title, optionally who is doing it and by when - because a checklist that
// takes effort to fill in does not get filled in.
// =========================================================================

export default function EventTasksTab({
  event,
  onAdd,
  onUpdate,
  onRemove,
  onSeedChecklist,
}) {
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [showDone, setShowDone] = useState(true);

  const progress = event.taskProgress;

  const { open, done } = useMemo(() => {
    const sorted = [...(event.tasks || [])].sort((a, b) => {
      // Anything with a deadline outranks anything without; the soonest
      // deadline is what you should be looking at.
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);

      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      return 0;
    });

    return {
      open: sorted.filter((task) => !task.done),
      done: sorted.filter((task) => task.done),
    };
  }, [event.tasks]);

  const add = async () => {
    if (!title.trim()) {
      toast.error("Give this task a title");

      return;
    }

    try {
      setBusy(true);

      await onAdd("tasks", {
        title,
        assignedTo,
        dueDate: dueDate || null,
      });

      setTitle("");
      setAssignedTo("");
      setDueDate("");
    } catch (error) {
      console.error(error);

      toast.error("Could not add that task");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (task) => {
    try {
      await onUpdate("tasks", task._id, { done: !task.done });
    } catch (error) {
      console.error(error);

      toast.error("Could not update that task");
    }
  };

  const confirmRemove = async () => {
    try {
      setBusy(true);

      await onRemove("tasks", removing._id);

      setRemoving(null);
    } catch (error) {
      console.error(error);

      toast.error("Could not remove that task");
    } finally {
      setBusy(false);
    }
  };

  const renderTask = (task) => {
    const due = task.done ? null : formatDue(task.dueDate);

    return (
      <div
        key={task._id}
        className={`flex items-start gap-3 rounded-2xl border p-3 transition ${
          task.done
            ? "border-white/5 bg-white/[0.01]"
            : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <button
          onClick={() => toggle(task)}
          aria-label={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
            task.done
              ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
              : "border-white/20 hover:border-indigo-400"
          }`}
        >
          {task.done && <FiCheck size={12} />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`break-words ${
              task.done ? "text-slate-500 line-through" : ""
            }`}
          >
            {task.title}
          </p>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {task.assignedTo && (
              <span className="text-slate-400">{task.assignedTo}</span>
            )}

            {due && (
              <span className={`inline-flex items-center gap-1 ${due.tone}`}>
                <FiClock size={11} />
                {due.label}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setRemoving(task)}
          aria-label={`Remove ${task.title}`}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-red-300"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ---- progress ---- */}
      {progress.total > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-lg font-semibold">
              {progress.done} of {progress.total} done
            </p>

            <p className="text-sm text-slate-400">
              {progress.overdue > 0 ? (
                <span className="text-amber-300">
                  {progress.overdue} past its date
                </span>
              ) : progress.done === progress.total ? (
                <span className="text-emerald-300">All clear</span>
              ) : (
                `${progress.total - progress.done} to go`
              )}
            </p>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* ---- add ---- */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <Input
            label="What needs doing"
            placeholder="Book the cab"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-owner" className="text-sm text-slate-400">
              Who
            </label>

            <input
              id="task-owner"
              list="task-owners"
              placeholder="Anyone"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />

            <datalist id="task-owners">
              {(event.participants || []).map((person) => (
                <option key={person.name} value={person.name} />
              ))}
            </datalist>
          </div>

          <Input
            label="By when"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <Button
            icon={FiPlus}
            onClick={add}
            loading={busy}
            className="mb-[1px] h-[46px]"
          >
            Add
          </Button>
        </div>
      </div>

      {/* ---- lists ---- */}
      {progress.total === 0 ? (
        <EmptyState
          icon={FiCheckSquare}
          title="No tasks yet"
          message={`Add your own above, or start from the standard ${event.typeMeta?.label?.toLowerCase()} checklist.`}
          action={
            <Button size="sm" icon={FiList} onClick={onSeedChecklist}>
              Use the {event.typeMeta?.label?.toLowerCase()} checklist
            </Button>
          }
        />
      ) : (
        <>
          {open.length > 0 && <div className="space-y-2">{open.map(renderTask)}</div>}

          {open.length === 0 && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center text-sm text-emerald-200">
              Everything on the list is done.
            </div>
          )}

          {done.length > 0 && (
            <div>
              <button
                onClick={() => setShowDone(!showDone)}
                className="mb-2 text-sm text-slate-400 transition hover:text-white"
              >
                {showDone ? "Hide" : "Show"} {done.length} completed
              </button>

              {showDone && <div className="space-y-2">{done.map(renderTask)}</div>}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        loading={busy}
        title="Remove this task?"
        message={removing ? `"${removing.title}" will be deleted.` : ""}
        confirmLabel="Remove"
      />
    </div>
  );
}
