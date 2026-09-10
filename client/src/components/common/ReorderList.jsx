import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiMenu } from "react-icons/fi";

import { moveItem } from "../../utils/reorder";

// =========================================================================
// REORDER LIST
//
// Two ways to move an item, on purpose:
//
//   buttons  work everywhere - touch, mouse and keyboard - and are the only
//            reliable option on a phone
//   dragging native HTML5 drag-and-drop, which is pointer-only. It is the
//            nicer gesture on a desktop but does not fire on touch, so it is
//            an addition rather than the mechanism.
//
// Kept dependency-free; a drag-and-drop library would be a lot of weight for
// two lists.
// =========================================================================

export default function ReorderList({ items, onReorder, renderItem, getKey }) {
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const move = (from, to) => onReorder(moveItem(items, from, to));

  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const key = getKey ? getKey(item, index) : index;
        const isDragging = draggingIndex === index;
        const isOver = overIndex === index && draggingIndex !== index;

        return (
          <li
            key={key}
            draggable
            onDragStart={() => setDraggingIndex(index)}
            onDragEnd={() => {
              setDraggingIndex(null);
              setOverIndex(null);
            }}
            onDragOver={(event) => {
              // Without this the drop is never allowed.
              event.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();

              if (draggingIndex !== null) move(draggingIndex, index);

              setDraggingIndex(null);
              setOverIndex(null);
            }}
            className={`flex items-center gap-3 rounded-xl border bg-slate-800/60 p-3 transition ${
              isDragging
                ? "border-indigo-400/50 opacity-50"
                : isOver
                  ? "border-indigo-400/50"
                  : "border-white/10"
            }`}
          >
            <span
              className="hidden shrink-0 cursor-grab text-slate-500 active:cursor-grabbing sm:block"
              aria-hidden="true"
              title="Drag to reorder"
            >
              <FiMenu />
            </span>

            <span className="w-6 shrink-0 text-xs tabular-nums text-slate-500">
              {index + 1}
            </span>

            <span className="min-w-0 flex-1">{renderItem(item, index)}</span>

            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label="Move up"
                className="rounded-lg border border-white/10 p-2.5 text-slate-300 transition active:scale-95 disabled:opacity-30"
              >
                <FiChevronUp />
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === items.length - 1}
                aria-label="Move down"
                className="rounded-lg border border-white/10 p-2.5 text-slate-300 transition active:scale-95 disabled:opacity-30"
              >
                <FiChevronDown />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
