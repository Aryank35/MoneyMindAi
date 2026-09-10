// =========================================================================
// ARITHMETIC EXPRESSION EVALUATOR
//
// Lets an amount field accept "20 + 10" or "1200/3" instead of only a plain
// number, and powers the calculator page.
//
// Hand-written recursive-descent parser. Deliberately NOT eval() or
// new Function(): those would execute arbitrary JavaScript from an input
// box, and this one is fed straight from user typing.
//
// Grammar:
//   expression := term (('+' | '-') term)*
//   term       := unary (('*' | '/') unary)*
//   unary      := ('-' | '+')* primary
//   primary    := number ('%')? | '(' expression ')'
//
// Percent follows calculator convention rather than plain division by 100,
// because that is what people mean when adding GST or a tip:
//   1000 + 18%  -> 1180   (18% *of the running total*)
//   1000 - 10%  ->  900
//   1000 * 18%  ->  180
//   50%         ->    0.5
// =========================================================================

const OPERATORS = "+-*/";

// Accepts the characters people actually type on a phone keyboard.
const normalise = (input) =>
  String(input ?? "")
    .replace(/[×xX]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[–—−]/g, "-")
    .replace(/,/g, "")
    .replace(/\s+/g, "");

const tokenise = (text) => {
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (char >= "0" && char <= "9") {
      let number = "";

      while (i < text.length && ((text[i] >= "0" && text[i] <= "9") || text[i] === ".")) {
        number += text[i];
        i += 1;
      }

      if ((number.match(/\./g) || []).length > 1) {
        throw new Error(`Too many decimal points in "${number}"`);
      }

      tokens.push({ type: "number", value: Number(number) });

      continue;
    }

    // A leading ".5" is a number, not an operator.
    if (char === ".") {
      let number = ".";
      i += 1;

      while (i < text.length && text[i] >= "0" && text[i] <= "9") {
        number += text[i];
        i += 1;
      }

      if (number === ".") throw new Error("Stray decimal point");

      tokens.push({ type: "number", value: Number(number) });

      continue;
    }

    if (OPERATORS.includes(char) || char === "(" || char === ")" || char === "%") {
      tokens.push({ type: char });
      i += 1;

      continue;
    }

    throw new Error(`Unexpected character "${char}"`);
  }

  return tokens;
};

// Returns { value, isPercentLiteral } so the additive level can tell
// "1000 + 18%" (18% of 1000) from "1000 + 18" (a flat 18).
const parse = (tokens) => {
  let position = 0;

  const peek = () => tokens[position];
  const next = () => tokens[position++];

  const parsePrimary = () => {
    const token = next();

    if (!token) throw new Error("Expression ends unexpectedly");

    if (token.type === "(") {
      const inner = parseExpression();

      if (!peek() || peek().type !== ")") {
        throw new Error("Missing closing bracket");
      }

      next();

      return { value: inner.value, isPercentLiteral: false };
    }

    if (token.type === "number") {
      if (peek()?.type === "%") {
        next();

        return { value: token.value, isPercentLiteral: true };
      }

      return { value: token.value, isPercentLiteral: false };
    }

    throw new Error("Expected a number");
  };

  const parseUnary = () => {
    if (peek()?.type === "-") {
      next();

      const operand = parseUnary();

      return { value: -operand.value, isPercentLiteral: operand.isPercentLiteral };
    }

    if (peek()?.type === "+") {
      next();

      return parseUnary();
    }

    return parsePrimary();
  };

  const parseTerm = () => {
    let left = parseUnary();

    while (peek()?.type === "*" || peek()?.type === "/") {
      const operator = next().type;
      const right = parseUnary();

      // In a multiplication a percent is simply a hundredth: 1000 * 18% = 180.
      const rightValue = right.isPercentLiteral ? right.value / 100 : right.value;

      if (operator === "/") {
        if (rightValue === 0) throw new Error("Cannot divide by zero");

        left = { value: left.value / rightValue, isPercentLiteral: false };
      } else {
        left = { value: left.value * rightValue, isPercentLiteral: false };
      }
    }

    return left;
  };

  const parseExpression = () => {
    let left = parseTerm();

    while (peek()?.type === "+" || peek()?.type === "-") {
      const operator = next().type;
      const right = parseTerm();

      // A bare percent added or subtracted is taken as a share of the
      // running total, which is what "+ 18%" means on a bill.
      const delta = right.isPercentLiteral
        ? (left.value * right.value) / 100
        : right.value;

      left = {
        value: operator === "+" ? left.value + delta : left.value - delta,
        isPercentLiteral: false,
      };
    }

    return left;
  };

  const result = parseExpression();

  if (position < tokens.length) {
    throw new Error("Could not read the whole expression");
  }

  return result;
};

// Evaluates an expression, or returns null when it is empty or incomplete.
// Never throws - callers use it while the user is mid-type, so a partial
// expression like "20 +" has to be silently unresolved rather than an error.
export const evaluateExpression = (input) => {
  const text = normalise(input);

  if (!text) return { value: null, error: null, isExpression: false };

  const isExpression = /[+\-*/()%]/.test(text.slice(1)) || /[*/()%]/.test(text[0]);

  try {
    const tokens = tokenise(text);

    if (tokens.length === 0) return { value: null, error: null, isExpression };

    const { value: raw, isPercentLiteral } = parse(tokens);

    // A percent with nothing to apply it to is just a hundredth, the way a
    // calculator treats "50 %" on its own.
    const value = isPercentLiteral ? raw / 100 : raw;

    if (!Number.isFinite(value)) {
      return { value: null, error: "That does not work out to a number", isExpression };
    }

    // Money to the paisa; floating point otherwise leaves 0.30000000000000004.
    return {
      value: Math.round(value * 100) / 100,
      error: null,
      isExpression,
    };
  } catch (error) {
    return { value: null, error: error.message, isExpression };
  }
};

// Convenience for a form field: the resolved number, or null.
export const resolveAmount = (input) => evaluateExpression(input).value;
