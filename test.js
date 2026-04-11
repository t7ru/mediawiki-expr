import { evaluateExpr } from "./index.js";

let hasFailures = false;

// MediaWiki #expr uses floats, so we need fuzzy matching for transcendental funcs
// and potential floating point inaccuracies like fmod
function approxEqual(actual, expected, epsilon = 1e-9) {
	if (Number.isNaN(expected)) return Number.isNaN(actual);
	if (!Number.isFinite(expected)) return actual === expected;
	return Math.abs(actual - expected) < epsilon;
}

function check(expr, expected) {
	try {
		const actual = evaluateExpr(expr);
		if (approxEqual(actual, expected)) {
			console.log(`[Pass] ${expr} === ${actual}`);
		} else {
			console.error(`[Fail] ${expr}`);
			console.error(` - Expected: ${expected}`);
			console.error(` - Actual:   ${actual}\n`);
			hasFailures = true;
		}
	} catch (error) {
		console.error(`[Fail] ${expr} threw an error: ${error.message}\n`);
		hasFailures = true;
	}
}

console.log("=== MediaWiki #expr Tests ===\n");

const tests = [
	// numbers
	["123456789", 123456789],
	["123456789.0123456789", 123456789.0123456789],

	// unary
	["+1", 1],
	["+-1", -1],
	["-12", -12],

	// constants
	["pi", Math.PI],
	["e", Math.E],

	// scientific 'e'
	["2e3", 2000],
	["-2.3e-4", -0.00023],
	["1e.5", Math.pow(10, 0.5)],

	// math funcs
	["exp 43", Math.exp(43)],
	["ln 2", Math.log(2)],
	["abs -2", 2],
	["sqrt 4", 2],
	["trunc 1.2", 1],
	["trunc -1.2", -1],
	["floor 1.2", 1],
	["floor -1.2", -2],
	["ceil 1.2", 2],
	["ceil -1.2", -1],
	["sin .1", Math.sin(0.1)],
	["cos .1", Math.cos(0.1)],
	["tan .1", Math.tan(0.1)],
	["asin .1", Math.asin(0.1)],
	["acos .1", Math.acos(0.1)],
	["atan .1", Math.atan(0.1)],

	// logical
	["not 0", 1],
	["not 1", 0],
	["not 2", 0],
	["not -1", 0],

	// binary math
	["2^3", 8],
	["-2^3", -8],
	["2*3", 6],
	["6/3", 2],
	["6 div 3", 2],
	["30 mod 7", 2],
	["-30 mod 7", -2],
	["30.5 mod 7.9", 2],
	["5.7 fmod 1.3", 5.7 % 1.3],
	["2+3", 5],
	["3-2", 1],

	// rounding
	["9.876 round 2", 9.88],
	["4.5 round 0", 5],
	["-4.5 round 0", -5],

	// comparison
	["3.0 = 3", 1],
	["3.1 = 3", 0],
	["3 <> 3", 0],
	["3 <> 4", 1],
	["3 != 4", 1],
	["3 < 4", 1],
	["4 > 3", 1],
	["3 <= 4", 1],
	["4 >= 3", 1],

	// and / or
	["3 and 4", 1],
	["0 and 4", 0],
	["3 or 4", 1],
	["0 or 0", 0],

	// precedence and complex
	["2+3*4", 14],
	["1.234 round 2 - 1", 1.2], // +,- > round. 2-1 = 1, then round 1
	["1 and 2=1", 0], // = > and
	["1 or 1 and 0", 1], // and > or
	["(2+3)*4", 20],
	["-not-not-not0", -1], // not 0 = 1, not 1 = 0, not 0 = 1, -1
	["sin ln 1.1", Math.sin(Math.log(1.1))],
	["3 * 4 mod 10 * 10", 20], // ltr 3*4=12, 12 mod 10=2, 2*10=20
];

for (const [expr, expected] of tests) {
	check(expr, expected);
}

if (hasFailures) {
	console.error("\nSome tests failed!");
	process.exit(1);
}

console.log("\nAll tests completed!");
