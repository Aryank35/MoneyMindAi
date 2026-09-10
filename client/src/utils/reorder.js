// Kept out of ReorderList.jsx so that file exports only a component - a file
// mixing components with other exports breaks React fast refresh in dev.

// Returns a new list with the item at `from` moved to `to`. Out-of-range
// targets return the list untouched, so callers can pass index ± 1 without
// bounds-checking first.
export const moveItem = (list, from, to) => {
  if (to < 0 || to >= list.length || from === to) return list;

  const next = [...list];
  const [moved] = next.splice(from, 1);

  next.splice(to, 0, moved);

  return next;
};
