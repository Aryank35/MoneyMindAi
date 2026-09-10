import { useState } from "react";

import { moveItem } from "./reorder";

// =========================================================================
// DRAG REORDER
//
// Native HTML5 drag-and-drop, kept dependency-free like ReorderList. Being
// pointer-driven it does not fire on touch at all, so it is always an
// addition to buttons that work everywhere - never the only way to move
// something.
//
// `requireHandle` (the default) turns `draggable` on only while a grip is
// held. Rows carrying text inputs need that: a permanently draggable row
// swallows selection inside its own fields, because the browser starts
// dragging the row instead of letting the caret sweep through the text.
// =========================================================================

export const useDragReorder = ({ items, onReorder, requireHandle = true }) => {
  const [armedIndex, setArmedIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const clear = () => {
    setArmedIndex(null);
    setDraggingIndex(null);
    setOverIndex(null);
  };

  return {
    isDragging: (index) => draggingIndex === index,

    // The row being dragged is not its own drop target, so it never draws
    // the incoming-drop highlight against itself.
    isOver: (index) => overIndex === index && draggingIndex !== index,

    // Spread onto the grip. Arming on pointer-down is the whole trick that
    // keeps the row's own inputs usable the rest of the time.
    handleProps: (index) => ({
      onPointerDown: (event) => {
        // Only a primary button press arms a drag.
        if (event.button === 0) setArmedIndex(index);
      },
      onPointerUp: () => setArmedIndex(null),
    }),

    rowProps: (index) => ({
      draggable: requireHandle ? armedIndex === index : true,

      onDragStart: (event) => {
        setDraggingIndex(index);

        event.dataTransfer.effectAllowed = "move";

        // Firefox will not begin a drag unless some data is attached.
        event.dataTransfer.setData("text/plain", String(index));
      },

      onDragOver: (event) => {
        // Without preventDefault the drop is never allowed to happen.
        event.preventDefault();

        event.dataTransfer.dropEffect = "move";

        setOverIndex(index);
      },

      onDragLeave: () =>
        setOverIndex((current) => (current === index ? null : current)),

      onDrop: (event) => {
        event.preventDefault();

        if (draggingIndex !== null) {
          onReorder(moveItem(items, draggingIndex, index));
        }

        clear();
      },

      onDragEnd: clear,
    }),
  };
};
