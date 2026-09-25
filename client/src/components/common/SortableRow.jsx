import { Reorder, useDragControls } from "framer-motion";
import { FiMenu } from "react-icons/fi";

// =========================================================================
// SORTABLE ROW
//
// Rows that get out of the way as you drag, rather than swapping only once
// you let go. Built on framer-motion's Reorder, which is already a
// dependency: it reorders live and springs every other row to its new place,
// which is the whole difference between "it moved" and "it feels right".
//
// Two things it fixes over the native HTML5 version:
//
//   - Native drag never fires on a touchscreen. Pointer events do, so this
//     works on a phone without a separate code path.
//   - Native drag only tells you which row you are over. This reorders as
//     you move, so what you see while dragging is what you get on release.
//
// The handle is the only place a drag starts. These rows carry text inputs,
// and a row that is draggable anywhere swallows the caret when you try to
// select inside one of its own fields.
// =========================================================================

export default function SortableRow({
  value,
  children,
  className = "",
  handleClassName = "",
  disabled = false,
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={value}
      // Reorder.Item renders an <li> by default. The group here is a <div>,
      // so an <li> inside it would be invalid markup - and these rows are a
      // form layout, not a list of bullets.
      as="div"
      dragListener={false}
      dragControls={controls}
      // Springy but short: long enough to read as movement, short enough
      // that a quick reshuffle never feels like waiting.
      transition={{ type: "spring", stiffness: 600, damping: 40 }}
      // Lifts above its neighbours while held, so it reads as picked up.
      whileDrag={{
        scale: 1.01,
        zIndex: 30,
        boxShadow: "0 18px 40px -12px rgba(0,0,0,0.75)",
        cursor: "grabbing",
      }}
      style={{ position: "relative" }}
      className={className}
    >
      <span
        // Pointer events rather than a `draggable` attribute: this is what
        // makes the gesture work on touch as well as with a mouse.
        onPointerDown={(event) => {
          if (disabled) return;

          // Stops the browser scrolling the page instead of dragging the row.
          event.preventDefault();

          controls.start(event);
        }}
        role="button"
        tabIndex={-1}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className={`shrink-0 touch-none cursor-grab text-slate-500 transition-colors hover:text-slate-300 active:cursor-grabbing ${
          disabled ? "pointer-events-none opacity-40" : ""
        } ${handleClassName}`}
      >
        <FiMenu />
      </span>

      {children}
    </Reorder.Item>
  );
}
