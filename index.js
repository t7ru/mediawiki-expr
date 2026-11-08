export function phpParseNumber(lexeme) {
	const n = Number.parseFloat(lexeme);
	return Number.isNaN(n) ? 0 : n;
}

export function phpToInt(d) {
	// php's (int) cast wraps out-of-range floats mod 2^64 instead of saturating
	return Number.isFinite(d) ? BigInt.asIntN(64, BigInt(Math.trunc(d))) : 0n;
}

function fitsLong(r) {
	return r >= -0x8000000000000000n && r <= 0x7fffffffffffffffn;
}

export function phpAsFloat(v) {
	return typeof v === "bigint" ? Number(v) : v;
}

export function phpTruthy(v) {
	return typeof v === "bigint" ? v !== 0n : v !== 0;
}

export function clampRoundPlaces(digits) {
	const x = typeof digits === "bigint" ? digits : phpToInt(digits);
	if (x > 2147483647n) return 2147483647;
	if (x < -2147483648n) return -2147483648;
	return Number(x);
}

const POWERS = [
	1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11,
	1e12, 1e13, 1e14, 1e15, 1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22,
];

export function phpRound(value, digits) {
	let places = clampRoundPlaces(digits);
	if (typeof value === "bigint") {
		if (places >= 0) return Number(value);
		value = Number(value);
	}
	if (!Number.isFinite(value) || value === 0) return value;
	if (places === 0 && value === Math.trunc(value)) return value;
	if (places < -2147483647) places = -2147483647;

	const absPlaces = places < 0 ? -places : places;
	const exponent = absPlaces > 22 ? Math.pow(10, absPlaces) : POWERS[absPlaces];

	let tmp;
	let tmp2;
	if (value >= 0) {
		tmp = Math.floor(places > 0 ? value * exponent : value / exponent);
		tmp2 = tmp + 1;
	} else {
		tmp = Math.ceil(places > 0 ? value * exponent : value / exponent);
		tmp2 = tmp - 1;
	}
	if ((places > 0 ? tmp2 / exponent : tmp2 * exponent) === value) tmp = tmp2;
	if (Math.abs(tmp) >= 1e16) return value;

	const neg = Object.is(tmp, -0) || tmp < 0;
	const half = neg ? -0.5 : 0.5;
	const edge = places > 0
		? Math.abs((tmp + half) / exponent)
		: Math.abs((tmp + half) * exponent);
	if (Math.abs(value) >= edge) tmp = tmp + (neg ? -1 : 1);

	if (absPlaces < 23) {
		tmp = places > 0 ? tmp / exponent : tmp * exponent;
	} else {
		const converted = Number(`${tmp}e${-places}`);
		if (!Number.isFinite(converted)) return value;
		tmp = converted;
	}
	return tmp;
}

export function phpAdd(a, b) {
	if (typeof a === "bigint" && typeof b === "bigint") {
		const r = a + b;
		if (fitsLong(r)) return r;
		return Number(a) + Number(b);
	}
	return phpAsFloat(a) + phpAsFloat(b);
}

export function phpSub(a, b) {
	if (typeof a === "bigint" && typeof b === "bigint") {
		const r = a - b;
		if (fitsLong(r)) return r;
		return Number(a) - Number(b);
	}
	return phpAsFloat(a) - phpAsFloat(b);
}

export function phpMul(a, b) {
	if (typeof a === "bigint" && typeof b === "bigint") {
		const r = a * b;
		if (fitsLong(r)) return r;
		return Number(a) * Number(b);
	}
	return phpAsFloat(a) * phpAsFloat(b);
}

export function phpDiv(a, b) {
	if (!phpTruthy(b)) throw new Error("Division by zero.");
	if (typeof a === "bigint" && typeof b === "bigint") {
		if (a % b === 0n) {
			const q = a / b;
			if (fitsLong(q)) return q;
		}
		return Number(a) / Number(b);
	}
	return phpAsFloat(a) / phpAsFloat(b);
}

export function phpMod(a, b) {
	const left = typeof a === "bigint" ? a : phpToInt(a);
	const right = typeof b === "bigint" ? b : phpToInt(b);
	if (!phpTruthy(right)) throw new Error("Division by zero.");
	return left % right;
}

export function phpFmod(a, b) {
	a = phpAsFloat(a);
	b = phpAsFloat(b);
	if (!phpTruthy(b)) throw new Error("Division by zero.");
	return a % b;
}

export function phpPow(a, b) {
	if (typeof a === "bigint" && typeof b === "bigint" && b >= 0n) {
		if (b === 0n) return 1n;
		if (a === 0n) return 0n;
		if (a === 1n) return 1n;
		if (a === -1n) return (b & 1n) === 0n ? 1n : -1n;

		let result = 1n;
		let base = a;
		let exp = b;
		while (exp > 0n) {
			if (exp & 1n) {
				const next = result * base;
				if (!fitsLong(next)) {
					return Math.pow(Number(a), Number(b));
				}
				result = next;
			}
			exp >>= 1n;
			if (exp > 0n) {
				const next = base * base;
				if (!fitsLong(next)) {
					return Math.pow(Number(a), Number(b));
				}
				base = next;
			}
		}
		return result;
	}
	return Math.pow(phpAsFloat(a), phpAsFloat(b));
}

export function phpNot(v) {
	return phpTruthy(v) ? 0 : 1;
}

export function phpAnd(a, b) {
	return phpTruthy(a) && phpTruthy(b) ? 1 : 0;
}

export function phpOr(a, b) {
	return phpTruthy(a) || phpTruthy(b) ? 1 : 0;
}

export function phpLn(x) {
	x = phpAsFloat(x);
	if (x <= 0) throw new Error("Invalid argument for ln: less than or equal to 0.");
	return Math.log(x);
}

export function phpAsin(x) {
	x = phpAsFloat(x);
	if (x < -1 || x > 1) {
		throw new Error("Invalid argument for asin: less than -1 or greater than 1.");
	}
	return Math.asin(x);
}

export function phpAcos(x) {
	x = phpAsFloat(x);
	if (x < -1 || x > 1) {
		throw new Error("Invalid argument for acos: less than -1 or greater than 1.");
	}
	return Math.acos(x);
}

export function phpSqrt(x) {
	const result = Math.sqrt(phpAsFloat(x));
	if (Number.isNaN(result)) throw new Error("In sqrt: Result is not a number.");
	return result;
}

export function phpNeg(a) {
	// -PHP_INT_MIN overflows to float
	return a === -0x8000000000000000n ? 9223372036854775808 : -a;
}

export function phpCmp(a, b, op) {
	let cmp;
	if (typeof a === "bigint" && typeof b === "bigint") {
		cmp = a < b ? -1 : a > b ? 1 : 0;
	} else {
		const fa = phpAsFloat(a);
		const fb = phpAsFloat(b);
		if (Number.isNaN(fa) || Number.isNaN(fb)) {
			return op === "<>" ? 1 : 0;
		}
		cmp = fa < fb ? -1 : fa > fb ? 1 : 0;
	}
	switch (op) {
		case "=": return cmp === 0 ? 1 : 0;
		case "<>": return cmp !== 0 ? 1 : 0;
		case "<": return cmp < 0 ? 1 : 0;
		case ">": return cmp > 0 ? 1 : 0;
		case "<=": return cmp <= 0 ? 1 : 0;
		case ">=": return cmp >= 0 ? 1 : 0;
		default: return 0;
	}
}

function normalizeResult(v) {
	return typeof v === "bigint" &&
		v >= -9007199254740991n &&
		v <= 9007199254740991n
		? Number(v)
		: v;
}

const MAX_STACK_SIZE = 100;

const call = (p, f) => ({
	p,           // p = precedence
	n: f.length, // n = arity
	f,           // f = operation
});
const math = (name) => {
	const fn = Math[name];
	return call(9, (x) => fn(phpAsFloat(x)));
};
const cmp = (op) => call(4, (a, b) => phpCmp(a, b, op));

const OPS = Object.assign(Object.create(null), {
	"-u": call(10, phpNeg),
	"+u": call(10, (x) => x),
	e: call(10, (a, b) => phpMul(a, phpPow(10, b))),
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
	trunc: call(9, (x) => phpToInt(phpAsFloat(x))),
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

function doOperation(op, vals) {
	const o = OPS[op];
	if (vals.length < o.n) {
		const name = op === "-u" || op === "+u" ? op[0] : op;
		throw new Error(`Expression error: Missing operand for ${name}.`);
	}
	if (o.n === 1) {
		vals.push(o.f(vals.pop()));
	} else {
		const b = vals.pop();
		vals.push(o.f(vals.pop(), b));
	}
}

function doExpression(expr) {
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
				doOperation(lastOp, vals);
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
			doOperation(lastOp, vals);
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
		doOperation(top, vals);
	}

	if (vals.length === 0) return "";
	return normalizeResult(vals[0]);
}

export function evaluateExpr(expr, { mediawikiErrors = true, onError } = {}) {
	try {
		return doExpression(expr);
	} catch (e) {
		const message = String(e.message);
		onError?.(message);
		if (!mediawikiErrors) {
			return NaN;
		}
		return `<strong class="error">${htmlspecialchars(message)}</strong>`;
	}
}
