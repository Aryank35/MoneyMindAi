import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiCheckSquare,
  FiClock,
  FiMapPin,
  FiRepeat,
  FiUsers,
} from "react-icons/fi";

import Modal from "./Modal";
import Button from "./Button";
import { getTodayAlerts } from "../../services/alertService";
import { getUserId } from "../../utils/auth";
import { money } from "../../utils/incomeFormulas";

// =========================================================================
// WHAT TODAY WANTS FROM YOU
//
// Nothing here runs in the background and nothing pushes, so a due date can
// only be noticed when the app is opened - which makes the moment it opens
// the one chance to say anything at all.
//
// Three rules keep it from becoming the dialog people learn to dismiss
// without reading:
//
//   1. Once a day, and only when something is actually due or late. A popup
//      that appears every time you navigate - or appears to say "nothing" -
//      stops being read within a week. The dismissal is recorded against
//      today's date, so tomorrow it speaks again.
//
//   2. Overdue first, and never hidden behind a count. The thing you missed
//      is the whole reason for interrupting.
//
//   3. Every row is a way in. Tapping one closes the popup and lands on the
//      page where it can be dealt with, rather than leaving the user to go
//      and find it.
// =========================================================================

const SEEN_KEY = "moneymind:digest-seen";

const SOURCE_ICONS = {
  todo: FiCheckSquare,
  schedule: FiRepeat,
  lending: FiUsers,
  event: FiMapPin,
  "event-task": FiCheckSquare,
};

const SEVERITY = {
  overdue: { text: "text-red-300", dot: "bg-red-400", label: "Overdue" },
  today: { text: "text-amber-300", dot: "bg-amber-400", label: "Due today" },
  soon: { text: "text-slate-400", dot: "bg-slate-600", label: "Coming up" },
};

const ORDER = ["overdue", "today", "soon"];

const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
  } catch {
    // A corrupt value is the same as never having seen it.
    return {};
  }
};

const markSeen = (userId, dateKey) => {
  try {
    // Keyed per user so signing in as someone else on a shared device does
    // not inherit the other person's dismissal.
    localStorage.setItem(SEEN_KEY, JSON.stringify({ [userId]: dateKey }));
  } catch {
    // Private browsing. The popup simply shows again next time.
  }
};

// The viewer's own calendar day. Deliberately computed here rather than
// taken from the response: the check has to happen BEFORE the request, so
// that once today's digest has been seen, moving between pages costs
// nothing at all.
const localDateKey = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;
};

function Row({ item, onOpen }) {
  const Icon = SOURCE_ICONS[item.source] || FiCalendar;

  const tone = SEVERITY[item.severity] || SEVERITY.soon;

  return (
    <button
      type="button"
      onClick={() => onOpen(item.link)}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-indigo-500/40 hover:bg-white/[0.06]"
    >
      <span className={`h-8 w-1 shrink-0 rounded-full ${tone.dot}`} />

      <Icon className="shrink-0 text-slate-400" size={16} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-white">
          {item.title}
        </span>

        <span className="block truncate text-xs text-slate-500">
          {item.sourceLabel}
          {item.subtitle ? ` · ${item.subtitle}` : ""}
        </span>
      </span>

      <span className="shrink-0 text-right">
        {item.amount > 0 && (
          <span className="block text-sm tabular-nums text-slate-200">
            {money(item.amount)}
          </span>
        )}

        <span className={`block text-xs ${tone.text}`}>{item.when}</span>
      </span>

      <FiArrowRight
        className="shrink-0 text-slate-600 transition group-hover:text-indigo-300"
        size={14}
      />
    </button>
  );
}

export default function DailyDigest() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const userId = getUserId();

        if (!userId) return;

        const dateKey = localDateKey();

        // Already seen today. Checked before the request so that navigating
        // around the app - which remounts this layout on every page - does
        // not re-ask the server for an answer that will not be shown.
        if (readSeen()[userId] === dateKey) return;

        const response = await getTodayAlerts(userId);

        if (cancelled) return;

        const digest = response.data;

        setData(digest);

        // Rule 1: only when something is genuinely due or late. A look-ahead
        // item on its own can wait for the page it lives on - and a day with
        // nothing due is not marked seen, so the first thing that falls due
        // later in the day still gets its say.
        if (!digest?.shouldPrompt) return;

        // Recorded the moment it is shown rather than when it is dismissed:
        // otherwise navigating away without dismissing would pop it open
        // again on the next page.
        markSeen(userId, dateKey);

        setIsOpen(true);
      } catch (error) {
        // A digest that cannot load is not worth an error in the user's
        // face - the pages it summarises still work.
        console.error("Daily digest:", error);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const close = () => setIsOpen(false);

  const open = (link) => {
    close();

    if (link) navigate(link);
  };

  const items = data?.items || [];

  const counts = data?.counts || {};

  const groups = ORDER.map((key) => ({
    key,
    ...SEVERITY[key],
    rows: items.filter((item) => item.severity === key),
  })).filter((group) => group.rows.length > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={counts.overdue > 0 ? "You have missed a few things" : "Today"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
          {counts.overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 text-red-300">
              <FiAlertTriangle size={14} />
              {counts.overdue} overdue
            </span>
          )}

          {counts.today > 0 && (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <FiClock size={14} />
              {counts.today} due today
            </span>
          )}

          {data?.amountDue > 0 && (
            <span className="text-slate-300">
              {money(data.amountDue)} to pay or collect
            </span>
          )}
        </p>

        {/* Scrolls rather than growing: a long backlog should not push the
            dismiss button off the screen on a phone. */}
        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {group.label}
                <span className="ml-2 text-slate-600">{group.rows.length}</span>
              </p>

              {group.rows.map((item) => (
                <Row key={`${item.source}-${item.id}`} item={item} onOpen={open} />
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={close}>
            Dismiss for today
          </Button>
        </div>
      </div>
    </Modal>
  );
}
