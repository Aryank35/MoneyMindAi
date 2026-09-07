import { motion, useReducedMotion } from "framer-motion";
import {
  FiCreditCard,
  FiShield,
  FiTrendingUp,
  FiSmartphone,
  FiBriefcase,
} from "react-icons/fi";

import { money } from "../../utils/incomeFormulas";

// =========================================================================
// ACCOUNT CARD
//
// One component for every account type, used by both the Accounts page and
// the dashboard. Types are told apart by *shape language*, not just hue:
//
//   Credit Card -> an actual card face: EMV chip, network mark, embossed
//                  digits, and a sheen that sweeps on hover
//   Bank        -> a passbook: ruled header, no chip, account tail
//   Cash        -> flat note stack, no card chrome at all
//   UPI/Wallet  -> app tile with a rounded glyph
//   EPF         -> shield, locked-away treatment
//
// Colour alone would not survive the monochrome palette, and would be
// useless to anyone who cannot distinguish the hues.
// =========================================================================

const TYPES = {
  "Credit Card": {
    face: "card",
    icon: FiCreditCard,
    tint: "from-[#241416] via-[#1a1216] to-[#0d0a0c]",
    edge: "border-red-400/25",
    accent: "text-red-200",
    rule: "bg-red-400/50",
    label: "Credit",
  },
  Bank: {
    face: "passbook",
    icon: FiBriefcase,
    tint: "from-[#111820] via-[#0e1319] to-[#0a0c0f]",
    edge: "border-cyan-400/20",
    accent: "text-cyan-200",
    rule: "bg-cyan-400/50",
    label: "Bank",
  },
  Cash: {
    face: "flat",
    icon: FiBriefcase,
    tint: "from-[#101a15] via-[#0d1512] to-[#0a0d0b]",
    edge: "border-emerald-400/20",
    accent: "text-emerald-200",
    rule: "bg-emerald-400/50",
    label: "Cash",
  },
  UPI: {
    face: "tile",
    icon: FiSmartphone,
    tint: "from-[#151726] via-[#11131d] to-[#0a0b0f]",
    edge: "border-indigo-400/20",
    accent: "text-indigo-200",
    rule: "bg-indigo-400/50",
    label: "UPI",
  },
  Wallet: {
    face: "tile",
    icon: FiSmartphone,
    tint: "from-[#151726] via-[#11131d] to-[#0a0b0f]",
    edge: "border-indigo-400/20",
    accent: "text-indigo-200",
    rule: "bg-indigo-400/50",
    label: "Wallet",
  },
  Investment: {
    face: "tile",
    icon: FiTrendingUp,
    tint: "from-[#1a1726] via-[#14121d] to-[#0b0a0f]",
    edge: "border-indigo-400/20",
    accent: "text-indigo-200",
    rule: "bg-indigo-400/50",
    label: "Investment",
  },
  EPF: {
    face: "shield",
    icon: FiShield,
    tint: "from-[#221a10] via-[#19140d] to-[#0d0a07]",
    edge: "border-amber-400/25",
    accent: "text-amber-200",
    rule: "bg-amber-400/50",
    label: "EPF",
  },
};

const fallback = TYPES.Bank;

// The gold contact pads of an EMV chip. Only credit cards get one - it is
// the fastest way to read "this is a card" at a glance.
function Chip() {
  return (
    <span
      aria-hidden="true"
      className="inline-grid h-7 w-9 grid-cols-3 grid-rows-3 gap-px overflow-hidden rounded-[4px] bg-gradient-to-br from-[#e2ce9c] to-[#a3823d] p-[2px]"
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className="bg-black/15" />
      ))}
    </span>
  );
}

export default function AccountCard({
  account,
  children,
  onClick,
  className = "",
}) {
  const shouldReduceMotion = useReducedMotion();
  const theme = TYPES[account.type] || fallback;
  const Icon = theme.icon;

  const isCard = theme.face === "card";
  const balance = Number(account.balance || 0);

  // A card's balance is negative while money is owed; every other account
  // reads as a plain balance.
  const headline = isCard ? money(Math.abs(balance)) : money(balance);
  const caption = isCard
    ? balance < 0
      ? "outstanding"
      : balance > 0
        ? "in credit"
        : "nothing owed"
    : "available";

  const tail = account.card?.last4 || String(account._id).slice(-4);

  return (
    <motion.div
      onClick={onClick}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`
        group relative overflow-hidden rounded-2xl border ${theme.edge}
        bg-gradient-to-br ${theme.tint} p-5 shadow-xl shadow-black/50
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      {/* Sheen sweep - the animated tell that this is a physical card. */}
      {isCard && !shouldReduceMotion && (
        <span
          aria-hidden="true"
          className="
            pointer-events-none absolute -inset-y-8 -left-1/2 w-1/2 rotate-12
            bg-gradient-to-r from-transparent via-white/10 to-transparent
            transition-transform duration-700 ease-out
            group-hover:translate-x-[260%]
          "
        />
      )}

      {/* Passbook rule - a ledger line instead of a chip. */}
      {theme.face === "passbook" && (
        <span
          aria-hidden="true"
          className={`absolute inset-x-5 top-0 h-px ${theme.rule}`}
        />
      )}

      {/* Shield wash for money locked away. */}
      {theme.face === "shield" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(207,175,102,0.10),transparent_60%)]"
        />
      )}

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <span
            className={`flex items-center gap-2 text-xs uppercase tracking-[0.16em] ${theme.accent}`}
          >
            <Icon size={14} />
            {theme.label}
          </span>

          <div className="flex items-center gap-2">
            {account.isSalaryAccount && (
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                Salary
              </span>
            )}
            {account.isEpfAccount && (
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                EPF
              </span>
            )}
          </div>
        </div>

        <p className="mt-4 truncate text-lg font-semibold">{account.name}</p>

        {isCard ? (
          <>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Chip />
              <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
                {account.card?.network || "Card"}
              </span>
            </div>

            <p className="mt-3 font-mono text-base tracking-[0.28em] text-slate-400">
              ····&nbsp;····&nbsp;····&nbsp;{tail}
            </p>
          </>
        ) : (
          <p className="mt-1 font-mono text-xs tracking-[0.2em] text-slate-500">
            ····{tail}
          </p>
        )}

        <div className="mt-4">
          <p
            className={`break-words text-3xl font-bold ${
              isCard && balance < 0 ? "text-red-300" : "text-white"
            }`}
          >
            {headline}
          </p>
          <p className="text-xs text-slate-500">{caption}</p>
        </div>

        {children}
      </div>
    </motion.div>
  );
}
