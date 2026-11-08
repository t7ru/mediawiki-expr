export function phpParseNumber(lexeme) {
	const n = Number.parseFloat(lexeme);
	return Number.isNaN(n) ? 0 : n;
}

export function phpToInt(d) {
	// php's (int) cast wraps out-of-range floats mod 2^64 instead of saturating
	return Number.isFinite(d) ? BigInt.asIntN(64, BigInt(Math.trunc(d))) : 0n;
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
	const powers = [
		1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11,
		1e12, 1e13, 1e14, 1e15, 1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22,
	];
	const exponent = absPlaces > 22 ? Math.pow(10, absPlaces) : powers[absPlaces];

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
		if (r >= -0x8000000000000000n && r <= 0x7fffffffffffffffn) return r;
		return Number(a) + Number(b);
	}
	return phpAsFloat(a) + phpAsFloat(b);
}

export function phpSub(a, b) {
	if (typeof a === "bigint" && typeof b === "bigint") {
		const r = a - b;
		if (r >= -0x8000000000000000n && r <= 0x7fffffffffffffffn) return r;
		return Number(a) - Number(b);
	}
	return phpAsFloat(a) - phpAsFloat(b);
}

export function phpMul(a, b) {
	if (typeof a === "bigint" && typeof b === "bigint") {
		const r = a * b;
		if (r >= -0x8000000000000000n && r <= 0x7fffffffffffffffn) return r;
		return Number(a) * Number(b);
	}
	return phpAsFloat(a) * phpAsFloat(b);
}

export function phpDiv(a, b) {
	if (!phpTruthy(b)) throw new Error("Division by zero.");
	if (typeof a === "bigint" && typeof b === "bigint") {
		if (a % b === 0n) {
			const q = a / b;
			if (q >= -0x8000000000000000n && q <= 0x7fffffffffffffffn) return q;
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

		const LONG_MIN = -0x8000000000000000n;
		const LONG_MAX = 0x7fffffffffffffffn;
		let result = 1n;
		let base = a;
		let exp = b;
		while (exp > 0n) {
			if (exp & 1n) {
				const next = result * base;
				if (next < LONG_MIN || next > LONG_MAX) {
					return Math.pow(Number(a), Number(b));
				}
				result = next;
			}
			exp >>= 1n;
			if (exp > 0n) {
				const next = base * base;
				if (next < LONG_MIN || next > LONG_MAX) {
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
	if (typeof a === "bigint") {
		if (a === -0x8000000000000000n) return 9223372036854775808;
		return -a;
	}
	return -a;
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

const HELPERS = new Map(
	[
		phpParseNumber,
		phpToInt,
		phpAsFloat,
		phpTruthy,
		clampRoundPlaces,
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
	].map((fn) => [fn.name, fn.toString()]),
);

// textual match meaning helpers must call each other by plain name
function helperRefs(src) {
	const refs = new Set();
	for (const [id] of src.matchAll(/\b[A-Za-z_$][\w$]*/g)) {
		if (HELPERS.has(id)) refs.add(id);
	}
	return refs;
}

const DEPS = new Map([...HELPERS].map(([name, src]) => [name, helperRefs(src)]));

export function runtimeSource(code) {
	if (code === undefined) return [...HELPERS.values()].join("\n");
	const used = new Set();
	const visit = (name) => {
		if (used.has(name)) return;
		used.add(name);
		DEPS.get(name).forEach(visit);
	};
	helperRefs(code).forEach(visit);
	return [...HELPERS].filter(([n]) => used.has(n)).map(([, s]) => s).join("\n");
}
