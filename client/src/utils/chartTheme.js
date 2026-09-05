// Shared Recharts styling. Chart colours are passed as literal values rather
// than CSS classes, so they can't inherit the palette in index.css - this is
// where they stay in step with it instead of being hardcoded per page.

// Categorical series colours, ordered so neighbouring series stay
// distinguishable. Same restrained system as the rest of the app: gold,
// jade, steel, clay, brass, then lighter variants.
export const CHART_COLORS = [
  "#cfaf66",
  "#58aa85",
  "#6b8ba6",
  "#c9736a",
  "#c29a4c",
  "#8fa9c0",
  "#83c3a3",
  "#da958d",
  "#dec68a",
  "#b0d9c4",
];

// Semantic colours for money in / money out, matching the jade and clay
// ramps used across the UI.
export const CHART_POSITIVE = "#58aa85";
export const CHART_NEGATIVE = "#c9736a";
export const CHART_ACCENT = "#cfaf66";
export const CHART_INFO = "#6b8ba6";

// Axis labels and gridlines sit well back from the data.
export const CHART_AXIS = "#63636d";
export const CHART_GRID = "#2e2e36";

export const TOOLTIP_STYLE = {
  background: "#131318",
  border: "1px solid #2e2e36",
  borderRadius: 12,
  color: "#ededef",
  boxShadow: "0 16px 32px -12px rgba(0,0,0,0.7)",
};
