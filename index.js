const WORD_OPERATORS = new Set([
	"mod",
	"fmod",
	"and",
	"or",
	"not",
	"round",
	"div",
	"e",
	"sin",
	"cos",
	"tan",
	"asin",
	"acos",
	"atan",
	"exp",
	"ln",
	"abs",
	"trunc",
	"floor",
	"ceil",
	"pi",
	"sqrt",
]);

const PREFIX_OPERATORS = new Set([
	"+",
	"-",
	"not",
	"sin",
	"cos",
	"tan",
	"asin",
	"acos",
	"atan",
	"exp",
	"ln",
	"abs",
	"trunc",
	"floor",
	"ceil",
	"sqrt",
]);

const PRECEDENCE = {
	"+u": 10,
	"-u": 10,
	e: 10,
	sin: 9,
	cos: 9,
	tan: 9,
	asin: 9,
	acos: 9,
	atan: 9,
	exp: 9,
	ln: 9,
	abs: 9,
	floor: 9,
	trunc: 9,
	ceil: 9,
	not: 9,
	sqrt: 9,
	"^": 8,
	"*": 7,
	"/": 7,
	div: 7,
	mod: 7,
	fmod: 7,
	"+": 6,
	"-": 6,
	round: 5,
	"=": 4,
	"<": 4,
	">": 4,
	"<=": 4,
	">=": 4,
	"<>": 4,
	"!=": 4,
	and: 3,
	or: 2,
};

function mwNot(v) {
	return `(__mwBool(${v}) ? 0 : 1)`;
}
function mwAnd(a, b) {
	return `((__mwBool(${a}) && __mwBool(${b})) ? 1 : 0)`;
}
function mwOr(a, b) {
	return `((__mwBool(${a}) || __mwBool(${b})) ? 1 : 0)`;
}
function mwEq(a, b) {
	return `(((${a}) == (${b})) ? 1 : 0)`;
}
function mwNe(a, b) {
	return `(((${a}) != (${b})) ? 1 : 0)`;
}
function mwLt(a, b) {
	return `(((${a}) < (${b})) ? 1 : 0)`;
}
function mwGt(a, b) {
	return `(((${a}) > (${b})) ? 1 : 0)`;
}
function mwLe(a, b) {
	return `(((${a}) <= (${b})) ? 1 : 0)`;
}
function mwGe(a, b) {
	return `(((${a}) >= (${b})) ? 1 : 0)`;
}
function mwRound(a, b) {
	return `__mwRound((${a}), (${b}))`;
}
function mwMod(a, b) {
	return `__mwMod((${a}), (${b}))`;
}
function mwFmod(a, b) {
	return `__mwFmod((${a}), (${b}))`;
}
function mwDiv(a, b) {
	return `__mwDiv((${a}), (${b}))`;
}
function mwExp10(a, b) {
	return `((${a}) * Math.pow(10, (${b})))`;
}

function tokenize(expr) {
	const tokens = [];
	const input = expr
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&minus;|−/g, "-");
	let i = 0;
	const peek = () => {
		var _a;
		return (_a = input[i]) !== null && _a !== void 0 ? _a : "";
	};
	const next = () => {
		var _a;
		return (_a = input[i++]) !== null && _a !== void 0 ? _a : "";
	};
	while (i < input.length) {
		const ch = peek();
		if (/\s/.test(ch)) {
			i++;
			continue;
		}
		if (/[0-9.]/.test(ch)) {
			let num = "";
			let dots = 0;
			while (i < input.length) {
				const c = peek();
				if (c === ".") {
					if (++dots > 1) break;
				}
				if (!/[0-9.]/.test(c)) break;
				num += next();
			}
			tokens.push({ type: "number", value: num });
			continue;
		}
		if (/[A-Za-z]/.test(ch)) {
			let word = "";
			while (i < input.length && /[A-Za-z]/.test(peek())) {
				word += next();
			}
			const lower = word.toLowerCase();
			if (!WORD_OPERATORS.has(lower)) {
				throw new Error(`Unrecognized word "${word}"`);
			}
			tokens.push({ type: "word", value: lower });
			continue;
		}
		const two = input.slice(i, i + 2);
		if (two === "<=" || two === ">=" || two === "<>" || two === "!=") {
			tokens.push({ type: "op", value: two });
			i += 2;
			continue;
		}
		if ("+-*/^=<>".includes(ch)) {
			tokens.push({ type: "op", value: next() });
			continue;
		}
		if (ch === "(" || ch === ")") {
			tokens.push({ type: "paren", value: next() });
			continue;
		}
		throw new Error(`Unrecognized punctuation character "${ch}"`);
	}
	tokens.push({ type: "eof", value: "" });
	return tokens;
}

class Parser {
	constructor(expr) {
		this.pos = 0;
		this.tokens = tokenize(expr);
	}
	parse() {
		const node = this.parseExpression(0);
		if (this.current().type !== "eof") {
			throw new Error(`Unexpected token "${this.current().value}"`);
		}
		return node;
	}
	current() {
		return this.tokens[this.pos];
	}
	advance() {
		return this.tokens[this.pos++];
	}
	parseExpression(minPrec) {
		let left = this.parsePrefix();
		while (true) {
			const tok = this.current();
			const op = this.getBinaryOp(tok);
			if (!op) break;
			const prec = PRECEDENCE[op];
			if (prec < minPrec) break;
			this.advance();
			const right = this.parseExpression(prec + 1);
			left = {
				type: "binary",
				op,
				left,
				right,
			};
		}
		return left;
	}
	parsePrefix() {
		const tok = this.current();
		if (tok.type === "op" && (tok.value === "+" || tok.value === "-")) {
			this.advance();
			const arg = this.parseExpression(PRECEDENCE[`${tok.value}u`]);
			return {
				type: "unary",
				op: `${tok.value}u`,
				arg,
			};
		}
		if (tok.type === "word") {
			const word = tok.value;
			if (word === "pi") {
				this.advance();
				return { type: "constant", name: "pi" };
			}
			if (word === "e") {
				this.advance();
				return { type: "constant", name: "e" };
			}
			if (PREFIX_OPERATORS.has(word)) {
				this.advance();
				const arg = this.parseExpression(PRECEDENCE[word]);
				return {
					type: "unary",
					op: word,
					arg,
				};
			}
		}
		if (tok.type === "number") {
			this.advance();
			return { type: "number", value: tok.value };
		}
		if (tok.type === "paren" && tok.value === "(") {
			this.advance();
			const inner = this.parseExpression(0);
			const close = this.current();
			if (close.type !== "paren" || close.value !== ")") {
				throw new Error("Unclosed bracket");
			}
			this.advance();
			return inner;
		}
		throw new Error(`Unexpected token: ${tok.value}`);
	}
	getBinaryOp(tok) {
		if (tok.type === "op") {
			if (tok.value in PRECEDENCE) return tok.value;
			return null;
		}
		if (tok.type === "word") {
			if (
				tok.value === "mod" ||
				tok.value === "fmod" ||
				tok.value === "and" ||
				tok.value === "or" ||
				tok.value === "round" ||
				tok.value === "div" ||
				tok.value === "e"
			) {
				return tok.value;
			}
		}
		return null;
	}
}

function emit(node) {
	switch (node.type) {
		case "number":
			return node.value;
		case "constant":
			return node.name === "pi" ? "Math.PI" : "Math.E";
		case "unary": {
			const arg = emit(node.arg);
			switch (node.op) {
				case "+u":
					return `(+(${arg}))`;
				case "-u":
					return `(-(${arg}))`;
				case "not":
					return mwNot(arg);
				case "sin":
					return `Math.sin(${arg})`;
				case "cos":
					return `Math.cos(${arg})`;
				case "tan":
					return `Math.tan(${arg})`;
				case "asin":
					return `__mwAsin(${arg})`;
				case "acos":
					return `__mwAcos(${arg})`;
				case "atan":
					return `Math.atan(${arg})`;
				case "exp":
					return `Math.exp(${arg})`;
				case "ln":
					return `__mwLn(${arg})`;
				case "abs":
					return `Math.abs(${arg})`;
				case "floor":
					return `Math.floor(${arg})`;
				case "ceil":
					return `Math.ceil(${arg})`;
				case "trunc":
					return `__mwTrunc(${arg})`;
				case "sqrt":
					return `__mwSqrt(${arg})`;
				default:
					throw new Error(`Unsupported unary operator: ${node.op}`);
			}
		}
		case "binary": {
			const left = emit(node.left);
			const right = emit(node.right);
			switch (node.op) {
				case "+":
					return `((${left}) + (${right}))`;
				case "-":
					return `((${left}) - (${right}))`;
				case "*":
					return `((${left}) * (${right}))`;
				case "/":
				case "div":
					return mwDiv(left, right);
				case "^":
					return `Math.pow((${left}), (${right}))`;
				case "mod":
					return mwMod(left, right);
				case "fmod":
					return mwFmod(left, right);
				case "round":
					return mwRound(left, right);
				case "=":
					return mwEq(left, right);
				case "<>":
				case "!=":
					return mwNe(left, right);
				case "<":
					return mwLt(left, right);
				case ">":
					return mwGt(left, right);
				case "<=":
					return mwLe(left, right);
				case ">=":
					return mwGe(left, right);
				case "and":
					return mwAnd(left, right);
				case "or":
					return mwOr(left, right);
				case "e":
					return mwExp10(left, right);
				default:
					throw new Error(`Unsupported binary operator: ${node.op}`);
			}
		}
	}
}

function buildHelpers() {
	return `
const __mwBool = (x) => x !== 0;

const __mwTrunc = (x) => x < 0 ? Math.ceil(x) : Math.floor(x);

const __mwDiv = (a, b) => {
  if (b === 0) throw new Error("Division by zero.");
  return a / b;
};

const __mwMod = (a, b) => {
  const left = __mwTrunc(a);
  const right = __mwTrunc(b);
  if (right === 0) throw new Error("Division by zero.");
  return left % right;
};

const __mwFmod = (a, b) => {
  if (b === 0) throw new Error("Division by zero.");
  return a % b;
};

const __mwLn = (x) => {
  if (x <= 0) throw new Error("Invalid argument for ln: less than or equal to 0.");
  return Math.log(x);
};

const __mwSqrt = (x) => {
  if (x < 0) throw new Error("In sqrt: Result is not a number.");
  return Math.sqrt(x);
};

const __mwAsin = (x) => {
  if (x < -1 || x > 1) throw new Error("Invalid argument for asin: less than -1 or greater than 1.");
  return Math.asin(x);
};

const __mwAcos = (x) => {
  if (x < -1 || x > 1) throw new Error("Invalid argument for acos: less than -1 or greater than 1.");
  return Math.acos(x);
};

const __mwRound = (value, digitsRaw) => {
  const digits = __mwTrunc(digitsRaw);
  const factor = Math.pow(10, digits);
  if (!Number.isFinite(factor) || factor === 0) return value;
  const scaled = value * factor;
  if (!Number.isFinite(scaled)) return value;
  const rounded = scaled < 0 ? -Math.round(Math.abs(scaled)) : Math.round(scaled);
  const result = rounded / factor;
  return Number.isFinite(result) ? result : value;
};
`.trim();
}

/**
 * Transpiles MediaWiki #expr syntax into valid JavaScript.
 */
export function transpileExpr(expr) {
	const parser = new Parser(expr);
	const ast = parser.parse();
	return `(()=>{${buildHelpers()};return ${emit(ast)};})()`;
}

/**
 * Evaluates MediaWiki #expr syntax.
 * @param {string} expr
 * @param {object} [options]
 * @param {boolean} [options.mediawikiErrors=true] If false, returns NaN on error instead
 */
export function evaluateExpr(expr, { mediawikiErrors = true } = {}) {
	try {
		const code = transpileExpr(expr);
		const result = new Function(`return ${code}`)();
		return result;
	} catch (e) {
		if (!mediawikiErrors) {
			return NaN;
		}
		let msg = e.message;
		if (!msg.startsWith("Expression error:")) {
			msg = `Expression error: ${msg}`;
		}
		return `<strong class="error">${msg}</strong>`;
	}
}
