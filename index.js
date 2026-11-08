import {
	phpParseNumber,
	phpToInt,
	phpAsFloat,
	phpRound,
	phpAdd,
	phpSub,
	phpMul,
	phpDiv,
	phpMod,
	phpFmod,
	phpPow,
	phpNeg,
	phpNot,
	phpAnd,
	phpOr,
	phpLn,
	phpAsin,
	phpAcos,
	phpSqrt,
	phpCmp,
	runtimeSource,
} from "./runtime.js";

const MAX_STACK_SIZE = 100;

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
	and: 3,
	or: 2,
	"(": -1,
};

const NAMES = {
	"-u": "-",
	"+u": "+",
	not: "not",
	"*": "*",
	"/": "/",
	mod: "mod",
	fmod: "fmod",
	"+": "+",
	"-": "-",
	round: "round",
	"=": "=",
	"<": "<",
	">": ">",
	"<=": "<=",
	">=": ">=",
	"<>": "<>",
	and: "and",
	or: "or",
	e: "e",
	sin: "sin",
	cos: "cos",
	tan: "tan",
	asin: "asin",
	acos: "acos",
	atan: "atan",
	ln: "ln",
	exp: "exp",
	abs: "abs",
	floor: "floor",
	trunc: "trunc",
	ceil: "ceil",
	"^": "^",
	sqrt: "sqrt",
};

const WORDS = {
	mod: "mod",
	fmod: "fmod",
	and: "and",
	or: "or",
	not: "not",
	round: "round",
	div: "/",
	e: "e",
	sin: "sin",
	cos: "cos",
	tan: "tan",
	asin: "asin",
	acos: "acos",
	atan: "atan",
	exp: "exp",
	ln: "ln",
	abs: "abs",
	trunc: "trunc",
	floor: "floor",
	ceil: "ceil",
	pi: "pi",
	sqrt: "sqrt",
};

function htmlspecialchars(s) {
	return s
		.toWellFormed()
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function unescapeExpr(expr) {
	let out = "";
	for (let i = 0; i < expr.length; ) {
		if (expr.startsWith("&lt;", i)) {
			out += "<";
			i += 4;
			continue;
		}
		if (expr.startsWith("&gt;", i)) {
			out += ">";
			i += 4;
			continue;
		}
		if (expr.startsWith("&minus;", i)) {
			out += "-";
			i += 7;
			continue;
		}
		if (expr[i] === "\u2212") {
			out += "-";
			i += 1;
			continue;
		}
		out += expr[i];
		i += 1;
	}
	return out;
}

function isWhite(ch) {
	return ch === " " || ch === "\t" || ch === "\r" || ch === "\n";
}

function isNumberChar(ch) {
	return (ch >= "0" && ch <= "9") || ch === ".";
}

function isAlpha(ch) {
	return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z");
}

function emitNumber(n) {
	if (Object.is(n, -0)) return "-0";
	if (Number.isNaN(n)) return "NaN";
	if (n === Infinity) return "Infinity";
	if (n === -Infinity) return "-Infinity";
	return String(n);
}

function normalizeResult(v) {
	if (typeof v === "bigint") {
		const n = Number(v);
		if (Number.isSafeInteger(n) && BigInt(n) === v) return n;
		return v;
	}
	return v;
}

function missingOperand(op) {
	throw new Error(`Expression error: Missing operand for ${NAMES[op]}.`);
}

function doOperation(op, operands) {
	switch (op) {
		case "-u": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({ v: phpNeg(arg.v), c: `phpNeg(${arg.c})` });
			break;
		}
		case "+u": {
			if (operands.length < 1) missingOperand(op);
			break;
		}
		case "*": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpMul(left.v, right.v),
				c: `phpMul(${left.c},${right.c})`,
			});
			break;
		}
		case "/": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpDiv(left.v, right.v),
				c: `phpDiv(${left.c},${right.c})`,
			});
			break;
		}
		case "mod": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpMod(left.v, right.v),
				c: `phpMod(${left.c},${right.c})`,
			});
			break;
		}
		case "fmod": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpFmod(left.v, right.v),
				c: `phpFmod(${left.c},${right.c})`,
			});
			break;
		}
		case "+": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpAdd(left.v, right.v),
				c: `phpAdd(${left.c},${right.c})`,
			});
			break;
		}
		case "-": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpSub(left.v, right.v),
				c: `phpSub(${left.c},${right.c})`,
			});
			break;
		}
		case "and": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpAnd(left.v, right.v),
				c: `phpAnd(${left.c},${right.c})`,
			});
			break;
		}
		case "or": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpOr(left.v, right.v),
				c: `phpOr(${left.c},${right.c})`,
			});
			break;
		}
		case "=": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpCmp(left.v, right.v, "="),
				c: `phpCmp(${left.c},${right.c},"=")`,
			});
			break;
		}
		case "not": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: phpNot(arg.v),
				c: `phpNot(${arg.c})`,
			});
			break;
		}
		case "round": {
			if (operands.length < 2) missingOperand(op);
			const digits = operands.pop();
			const value = operands.pop();
			operands.push({
				v: phpRound(value.v, digits.v),
				c: `phpRound(${value.c},${digits.c})`,
			});
			break;
		}
		case "<": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpCmp(left.v, right.v, "<"),
				c: `phpCmp(${left.c},${right.c},"<")`,
			});
			break;
		}
		case ">": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpCmp(left.v, right.v, ">"),
				c: `phpCmp(${left.c},${right.c},">")`,
			});
			break;
		}
		case "<=": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpCmp(left.v, right.v, "<="),
				c: `phpCmp(${left.c},${right.c},"<=")`,
			});
			break;
		}
		case ">=": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpCmp(left.v, right.v, ">="),
				c: `phpCmp(${left.c},${right.c},">=")`,
			});
			break;
		}
		case "<>": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpCmp(left.v, right.v, "<>"),
				c: `phpCmp(${left.c},${right.c},"<>")`,
			});
			break;
		}
		case "e": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpMul(left.v, phpPow(10, right.v)),
				c: `phpMul(${left.c},phpPow(10,${right.c}))`,
			});
			break;
		}
		case "sin": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: Math.sin(phpAsFloat(arg.v)),
				c: `Math.sin(phpAsFloat(${arg.c}))`,
			});
			break;
		}
		case "cos": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: Math.cos(phpAsFloat(arg.v)),
				c: `Math.cos(phpAsFloat(${arg.c}))`,
			});
			break;
		}
		case "tan": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: Math.tan(phpAsFloat(arg.v)),
				c: `Math.tan(phpAsFloat(${arg.c}))`,
			});
			break;
		}
		case "asin": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: phpAsin(arg.v),
				c: `phpAsin(${arg.c})`,
			});
			break;
		}
		case "acos": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: phpAcos(arg.v),
				c: `phpAcos(${arg.c})`,
			});
			break;
		}
		case "atan": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: Math.atan(phpAsFloat(arg.v)),
				c: `Math.atan(phpAsFloat(${arg.c}))`,
			});
			break;
		}
		case "exp": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: Math.exp(phpAsFloat(arg.v)),
				c: `Math.exp(phpAsFloat(${arg.c}))`,
			});
			break;
		}
		case "ln": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: phpLn(arg.v),
				c: `phpLn(${arg.c})`,
			});
			break;
		}
		case "abs": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: Math.abs(phpAsFloat(arg.v)),
				c: `Math.abs(phpAsFloat(${arg.c}))`,
			});
			break;
		}
		case "floor": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: Math.floor(phpAsFloat(arg.v)),
				c: `Math.floor(phpAsFloat(${arg.c}))`,
			});
			break;
		}
		case "trunc": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: phpToInt(phpAsFloat(arg.v)),
				c: `phpToInt(phpAsFloat(${arg.c}))`,
			});
			break;
		}
		case "ceil": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: Math.ceil(phpAsFloat(arg.v)),
				c: `Math.ceil(phpAsFloat(${arg.c}))`,
			});
			break;
		}
		case "^": {
			if (operands.length < 2) missingOperand(op);
			const right = operands.pop();
			const left = operands.pop();
			operands.push({
				v: phpPow(left.v, right.v),
				c: `phpPow(${left.c},${right.c})`,
			});
			break;
		}
		case "sqrt": {
			if (operands.length < 1) missingOperand(op);
			const arg = operands.pop();
			operands.push({
				v: phpSqrt(arg.v),
				c: `phpSqrt(${arg.c})`,
			});
			break;
		}
		default:
			throw new Error("Expression error: Unknown error ()");
	}
}

function shuntBinary(op, operators, operands) {
	let lastOp = operators.length ? operators[operators.length - 1] : null;
	while (lastOp && PRECEDENCE[op] <= PRECEDENCE[lastOp]) {
		doOperation(lastOp, operands);
		operators.pop();
		lastOp = operators.length ? operators[operators.length - 1] : null;
	}
	operators.push(op);
}

function doExpression(expr) {
	const operands = [];
	const operators = [];

	expr = unescapeExpr(expr);

	let p = 0;
	const end = expr.length;
	let expecting = "expression";
	let name = "";
	let op = null;

	while (p < end) {
		if (operands.length > MAX_STACK_SIZE || operators.length > MAX_STACK_SIZE) {
			throw new Error("Expression error: Stack exhausted.");
		}

		const char = expr[p];
		const char2 = expr.slice(p, p + 2);

		if (isWhite(char)) {
			while (p < end && isWhite(expr[p])) p++;
			continue;
		} else if (isNumberChar(char)) {
			if (expecting !== "expression") {
				throw new Error("Expression error: Unexpected number.");
			}
			const start = p;
			while (p < end && isNumberChar(expr[p])) p++;
			const num = phpParseNumber(expr.slice(start, p));
			operands.push({ v: num, c: emitNumber(num) });
			expecting = "operator";
			continue;
		} else if (isAlpha(char)) {
			const start = p;
			while (p < end && isAlpha(expr[p])) p++;
			const word = expr.slice(start, p).toLowerCase();
			if (!(word in WORDS)) {
				throw new Error(
					`Expression error: Unrecognized word "${word}".`,
				);
			}
			op = WORDS[word];
			switch (op) {
				case "e":
					if (expecting === "expression") {
						operands.push({ v: Math.E, c: "Math.E" });
						expecting = "operator";
						continue;
					}
					break;
				case "pi":
					if (expecting !== "expression") {
						throw new Error("Expression error: Unexpected number.");
					}
					operands.push({ v: Math.PI, c: "Math.PI" });
					expecting = "operator";
					continue;
				case "not":
				case "sin":
				case "cos":
				case "tan":
				case "asin":
				case "acos":
				case "atan":
				case "exp":
				case "ln":
				case "abs":
				case "floor":
				case "trunc":
				case "ceil":
				case "sqrt":
					if (expecting !== "expression") {
						throw new Error(
							`Expression error: Unexpected ${word} operator.`,
						);
					}
					operators.push(op);
					continue;
			}
			name = word;
		} else if (char2 === "<=") {
			name = char2;
			op = "<=";
			p += 2;
		} else if (char2 === ">=") {
			name = char2;
			op = ">=";
			p += 2;
		} else if (char2 === "<>" || char2 === "!=") {
			name = char2;
			op = "<>";
			p += 2;
		} else if (char === "+") {
			p += 1;
			if (expecting === "expression") {
				operators.push("+u");
				continue;
			}
			op = "+";
		} else if (char === "-") {
			p += 1;
			if (expecting === "expression") {
				operators.push("-u");
				continue;
			}
			op = "-";
		} else if (char === "*") {
			name = char;
			op = "*";
			p += 1;
		} else if (char === "/") {
			name = char;
			op = "/";
			p += 1;
		} else if (char === "^") {
			name = char;
			op = "^";
			p += 1;
		} else if (char === "(") {
			if (expecting === "operator") {
				throw new Error("Expression error: Unexpected ( operator.");
			}
			operators.push("(");
			p += 1;
			continue;
		} else if (char === ")") {
			let lastOp = operators.length ? operators[operators.length - 1] : null;
			while (lastOp && lastOp !== "(") {
				doOperation(lastOp, operands);
				operators.pop();
				lastOp = operators.length ? operators[operators.length - 1] : null;
			}
			if (lastOp) {
				operators.pop();
			} else {
				throw new Error("Expression error: Unexpected closing bracket.");
			}
			expecting = "operator";
			p += 1;
			continue;
		} else if (char === "=") {
			name = char;
			op = "=";
			p += 1;
		} else if (char === "<") {
			name = char;
			op = "<";
			p += 1;
		} else if (char === ">") {
			name = char;
			op = ">";
			p += 1;
		} else {
			const cp = expr.codePointAt(p);
			const ch = String.fromCodePoint(cp);
			throw new Error(
				`Expression error: Unrecognized punctuation character "${ch}".`,
			);
		}

		if (expecting === "expression") {
			throw new Error(`Expression error: Unexpected ${name} operator.`);
		}
		shuntBinary(op, operators, operands);
		expecting = "expression";
	}

	while (operators.length) {
		const top = operators.pop();
		if (top === "(") {
			throw new Error("Expression error: Unclosed bracket.");
		}
		doOperation(top, operands);
	}

	if (operands.length === 0) {
		return { value: "", code: '""' };
	}
	const top = operands[0];
	return { value: normalizeResult(top.v), code: top.c };
}

export function transpileExpr(expr) {
	const { code } = doExpression(expr);
	return `(()=>{ ${runtimeSource()}; ${normalizeResult.toString()}; return normalizeResult(${code}); })()`;
}

export function evaluateExpr(expr, { mediawikiErrors = true } = {}) {
	try {
		return doExpression(expr).value;
	} catch (e) {
		if (!mediawikiErrors) {
			return NaN;
		}
		return `<strong class="error">${htmlspecialchars(String(e.message))}</strong>`;
	}
}
