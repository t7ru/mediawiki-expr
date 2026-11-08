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

const call = (p, f) => ({
	p,                                              // p = precedence
	n: f.length,                                    // n = arity
	f,                                              // f = value fn
	c: (...args) => `${f.name}(${args.join(",")})`, // c = code fn
});
const math = (name) => {
	const fn = Math[name];
	return {
		p: 9,
		n: 1,
		f: (x) => fn(phpAsFloat(x)),
		c: (x) => `Math.${name}(phpAsFloat(${x}))`,
	};
};
const cmp = (op) => ({
	p: 4,
	n: 2,
	f: (a, b) => phpCmp(a, b, op),
	c: (a, b) => `phpCmp(${a},${b},"${op}")`,
});

const OPS = Object.assign(Object.create(null), {
	"-u": call(10, phpNeg),
	"+u": { p: 10, n: 1, f: (x) => x, c: (x) => x },
	e: {
		p: 10,
		n: 2,
		f: (a, b) => phpMul(a, phpPow(10, b)),
		c: (a, b) => `phpMul(${a},phpPow(10,${b}))`,
	},
	sin: math("sin"),
	cos: math("cos"),
	tan: math("tan"),
	asin: call(9, phpAsin),
	acos: call(9, phpAcos),
	atan: math("atan"),
	exp: math("exp"),
	ln: call(9, phpLn),
	abs: math("abs"),
	floor: math("floor"),
	trunc: {
		p: 9,
		n: 1,
		f: (x) => phpToInt(phpAsFloat(x)),
		c: (x) => `phpToInt(phpAsFloat(${x}))`,
	},
	ceil: math("ceil"),
	not: call(9, phpNot),
	sqrt: call(9, phpSqrt),
	"^": call(8, phpPow),
	"*": call(7, phpMul),
	"/": call(7, phpDiv),
	mod: call(7, phpMod),
	fmod: call(7, phpFmod),
	"+": call(6, phpAdd),
	"-": call(6, phpSub),
	round: call(5, phpRound),
	"=": cmp("="),
	"<": cmp("<"),
	">": cmp(">"),
	"<=": cmp("<="),
	">=": cmp(">="),
	"<>": cmp("<>"),
	and: call(3, phpAnd),
	or: call(2, phpOr),
	"(": { p: -1 },
});

const UNESCAPE = { "&lt;": "<", "&gt;": ">", "&minus;": "-", "−": "-" };

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
	return expr.replace(/&lt;|&gt;|&minus;|−/g, (m) => UNESCAPE[m]);
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
	return Object.is(n, -0) ? "-0" : String(n);
}

function normalizeResult(v) {
	return typeof v === "bigint" &&
		v >= -9007199254740991n &&
		v <= 9007199254740991n
		? Number(v)
		: v;
}

function doOperation(op, vals, codes) {
	const o = OPS[op];
	if (!o.f) throw new Error("Expression error: Unknown error ()");
	if (vals.length < o.n) {
		const name = op === "-u" || op === "+u" ? op[0] : op;
		throw new Error(`Expression error: Missing operand for ${name}.`);
	}
	if (o.n === 1) {
		vals.push(o.f(vals.pop()));
		if (codes) codes.push(o.c(codes.pop()));
	} else {
		const b = vals.pop();
		vals.push(o.f(vals.pop(), b));
		if (codes) {
			const cb = codes.pop();
			codes.push(o.c(codes.pop(), cb));
		}
	}
}

function doExpression(expr, codes) {
	const vals = [];
	const operators = [];

	expr = unescapeExpr(expr);

	let p = 0;
	const end = expr.length;
	let expecting = "expression";
	let name = "";
	let op = null;

	while (p < end) {
		if (vals.length > MAX_STACK_SIZE || operators.length > MAX_STACK_SIZE) {
			throw new Error("Expression error: Stack exhausted.");
		}

		const char = expr[p];

		if (isWhite(char)) {
			p++;
			while (p < end && isWhite(expr[p])) p++;
			continue;
		} else if (isNumberChar(char)) {
			if (expecting !== "expression") {
				throw new Error("Expression error: Unexpected number.");
			}
			const start = p;
			while (p < end && isNumberChar(expr[p])) p++;
			const num = phpParseNumber(expr.slice(start, p));
			vals.push(num);
			if (codes) codes.push(emitNumber(num));
			expecting = "operator";
			continue;
		} else if (isAlpha(char)) {
			const start = p;
			while (p < end && isAlpha(expr[p])) p++;
			const word = expr.slice(start, p).toLowerCase();
			if (word === "pi") {
				if (expecting !== "expression") {
					throw new Error("Expression error: Unexpected number.");
				}
				vals.push(Math.PI);
				if (codes) codes.push("Math.PI");
				expecting = "operator";
				continue;
			}
			op = word === "div" ? "/" : word;
			const o = OPS[op];
			if (!o) {
				throw new Error(`Expression error: Unrecognized word "${word}".`);
			}
			if (op === "e" && expecting === "expression") {
				vals.push(Math.E);
				if (codes) codes.push("Math.E");
				expecting = "operator";
				continue;
			}
			if (o.n === 1) {
				if (expecting !== "expression") {
					throw new Error(`Expression error: Unexpected ${word} operator.`);
				}
				operators.push(op);
				continue;
			}
			name = word;
		} else if (char === "(") {
			if (expecting === "operator") {
				throw new Error("Expression error: Unexpected ( operator.");
			}
			operators.push("(");
			p += 1;
			continue;
		} else if (char === ")") {
			let lastOp = operators.at(-1);
			while (lastOp !== undefined && lastOp !== "(") {
				doOperation(lastOp, vals, codes);
				operators.pop();
				lastOp = operators.at(-1);
			}
			if (lastOp === undefined) {
				throw new Error("Expression error: Unexpected closing bracket.");
			}
			operators.pop();
			expecting = "operator";
			p += 1;
			continue;
		} else if (char === "+" || char === "-") {
			p += 1;
			if (expecting === "expression") {
				operators.push(char + "u");
				continue;
			}
			op = char;
		} else {
			const next = expr[p + 1];
			if (char === "<" && (next === "=" || next === ">")) {
				op = char + next;
			} else if (char === ">" && next === "=") {
				op = ">=";
			} else if (char === "!" && next === "=") {
				op = "<>";
			} else if ("*/^=<>".includes(char)) {
				op = char;
			} else {
				const ch = String.fromCodePoint(expr.codePointAt(p));
				throw new Error(
					`Expression error: Unrecognized punctuation character "${ch}".`,
				);
			}
			name = op === "<>" ? char + next : op;
			p += name.length;
		}

		if (expecting === "expression") {
			throw new Error(`Expression error: Unexpected ${name} operator.`);
		}
		const prec = OPS[op].p;
		let lastOp = operators.at(-1);
		while (lastOp !== undefined && prec <= OPS[lastOp].p) {
			doOperation(lastOp, vals, codes);
			operators.pop();
			lastOp = operators.at(-1);
		}
		operators.push(op);
		expecting = "expression";
	}

	while (operators.length) {
		const top = operators.pop();
		if (top === "(") {
			throw new Error("Expression error: Unclosed bracket.");
		}
		doOperation(top, vals, codes);
	}

	if (vals.length === 0) return "";
	return normalizeResult(vals[0]);
}

let prelude;

export function transpileExpr(expr) {
	const codes = [];
	doExpression(expr, codes);
	prelude ??= `${runtimeSource()}; ${normalizeResult.toString()};`;
	return `(()=>{ ${prelude} return normalizeResult(${codes.length ? codes[0] : '""'}); })()`;
}

export function evaluateExpr(expr, { mediawikiErrors = true } = {}) {
	try {
		return doExpression(expr);
	} catch (e) {
		if (!mediawikiErrors) {
			return NaN;
		}
		return `<strong class="error">${htmlspecialchars(String(e.message))}</strong>`;
	}
}
