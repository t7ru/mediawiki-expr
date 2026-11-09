import { evaluateExpr, formatExpr } from "./index.js";

let hasFailures = false;

function mwError(message) {
	return `<strong class="error">${message}</strong>`;
}

function check(expr, expected, options = {}, epsilon = 0) {
	try {
		const actual = evaluateExpr(expr, options);
		if (
			typeof actual === "string" &&
			actual.startsWith('<strong class="error">')
		) {
			console.error(`[Fail] ${expr} -> expected value but got error`);
			console.error(` - Actual: ${actual}\n`);
			hasFailures = true;
			return;
		}

		let pass = false;
		if (typeof expected === "bigint") {
			pass = actual === expected;
		} else if (typeof expected === "string") {
			pass = actual === expected;
		} else if (typeof expected === "number") {
			if (Object.is(actual, expected)) {
				pass = true;
			} else if (
				typeof actual === "number" &&
				epsilon > 0 &&
				Number.isFinite(actual) &&
				Number.isFinite(expected) &&
				Math.abs(actual - expected) < epsilon
			) {
				pass = true;
			}
		} else {
			pass = Object.is(actual, expected);
		}

		if (pass) {
			console.log(`[Pass] ${expr} === ${String(actual)}`);
		} else {
			console.error(`[Fail] ${expr}`);
			console.error(` - Expected: ${String(expected)} (${typeof expected})`);
			console.error(` - Actual:   ${String(actual)} (${typeof actual})\n`);
			hasFailures = true;
		}

	} catch (error) {
		console.error(
			`[Fail] ${expr} threw unexpected JS error: ${error.message}\n`,
		);
		hasFailures = true;
	}
}

function checkError(expr, expectedError, options = {}) {
	try {
		const actual = evaluateExpr(expr, options);
		if (options.mediawikiErrors === false) {
			if (typeof actual === "number" && Number.isNaN(actual)) {
				console.log(`[Pass] ${expr} -> NaN`);
			} else {
				console.error(`[Fail] ${expr}`);
				console.error(` - Expected: NaN`);
				console.error(` - Got: ${actual}\n`);
				hasFailures = true;
			}
			return;
		}
		if (actual === expectedError) {
			console.log(`[Pass] ${expr} -> exact error HTML`);
		} else {
			console.error(`[Fail] ${expr}`);
			console.error(` - Expected: ${expectedError}`);
			console.error(` - Got:      ${actual}\n`);
			hasFailures = true;
		}
	} catch (error) {
		console.error(
			`[Fail] ${expr} threw unexpected JS error: ${error.message}\n`,
		);
		hasFailures = true;
	}
}

const LIBM_EPS = 1e-12;

const tests = [
	// numbers
	["123456789", 123456789],
	["123456789.0123456789", 123456789.0123456789],
	[".5", 0.5],
	["5.", 5],
	["010", 10],
	["008", 8],
	["00.5", 0.5],
	["01.20", 1.2],
	["+01.20", 1.2],
	[".", 0],
	["..", 0],
	["1.2.3", 1.2],
	["1..2", 1],
	[".1.2", 0.1],

	// empty
	["", ""],
	["()", ""],
	["   ", ""],

	// unary
	["+1", 1],
	["+-1", -1],
	["-12", -12],

	// constants
	["pi", Math.PI, LIBM_EPS],
	["e", Math.E, LIBM_EPS],

	// e
	["2e3", 2000],
	["-2.3e-4", -0.00023, 1e-9],
	["1e.5", Math.pow(10, 0.5), LIBM_EPS],

	// functions
	["exp 43", Math.exp(43), LIBM_EPS],
	["ln 2", Math.log(2), LIBM_EPS],
	["abs -2", 2],
	["sqrt 4", 2],
	["trunc 1.2", 1],
	["trunc -1.2", -1],
	["trunc -1.9", -1],
	["floor 1.2", 1],
	["floor -1.2", -2],
	["ceil 1.2", 2],
	["ceil -1.2", -1],
	["sin .1", Math.sin(0.1), LIBM_EPS],
	["cos .1", Math.cos(0.1), LIBM_EPS],
	["tan .1", Math.tan(0.1), LIBM_EPS],
	["asin .1", Math.asin(0.1), LIBM_EPS],
	["acos .1", Math.acos(0.1), LIBM_EPS],
	["atan .1", Math.atan(0.1), LIBM_EPS],

	// large trunc
	["trunc 1e13", 10000000000000],
	["trunc 1e14", 100000000000000n],
	["trunc -1e14", -100000000000000n],
	["trunc 1e20", 7766279631452241920n],
	["trunc -1e20", -7766279631452241920n],
	["trunc (2^64)", 0],

	// not
	["not 0", 1],
	["not 1", 0],
	["not 2", 0],
	["not -1", 0],

	// arithmetic
	["2^3", 8],
	["-2^3", -8],
	["2*3", 6],
	["6/3", 2],
	["6 div 3", 2],
	["30 mod 7", 2],
	["-30 mod 7", -2],
	["30.5 mod 7.9", 2],
	["5.7 fmod 1.3", 5.7 % 1.3],
	["-7.5 fmod 2.5", -0],
	["-7.5 fmod -2.5", -0],
	["10.5 fmod 3.2 fmod 1.1", 0.8999999999999995],
	["2+3", 5],
	["3-2", 1],
	["1e20 mod 3", 2],
	["-1e20 mod 3", -2],
	["1e20 mod 7", 6],

	// round
	["9.876 round 2", 9.88],
	["4.5 round 0", 5],
	["-4.5 round 0", -5],
	["1.005 round 2", 1.01],
	["9.995 round 2", 10],
	["-15 round -1", -20],
	["1.23 round -400", 0],

	// compare
	["3.0 = 3", 1],
	["3.1 = 3", 0],
	["3 <> 3", 0],
	["3 <> 4", 1],
	["3 != 4", 1],
	["3 < 4", 1],
	["4 > 3", 1],
	["3 <= 4", 1],
	["4 >= 3", 1],
	["2&lt;3", 1],
	["5&gt;4", 1],

	// and / or
	["3 and 4", 1],
	["0 and 4", 0],
	["1 and 0", 0],
	["3 or 4", 1],
	["0 or 0", 0],

	// precedence
	["2+3*4", 14],
	["1.234 round 2 - 1", 1.2], // +,- > round  -> 1.234 round (2-1) = 1.234 round 1 = 1.2
	["1 and 2=1", 0], // = > and
	["1 or 1 and 0", 1], // and > or
	["(2+3)*4", 20],
	["-not-not-not0", -1], // not 0 = 1, not 1 = 0, not 0 = 1, -1
	["sin ln 1.1", Math.sin(Math.log(1.1)), LIBM_EPS],
	["3 * 4 mod 10 * 10", 20], // ltr 3*4=12, 12 mod 10=2, 2*10=20
];

console.log("-> Success tests (mediawikiErrors = true by default)");
for (const row of tests) {
	const [expr, expected, epsilon = 0] = row;
	check(expr, expected, {}, epsilon);
}

// PHP trunc(2^63) overflows to -2^63, which JS represents exactly
// thus, accept either the number or the bigint
{
	const expr = "trunc (2^63)";
	try {
		const actual = evaluateExpr(expr);
		const pass =
			Object.is(actual, -9223372036854775808) ||
			actual === -9223372036854775808n;
		if (pass) {
			console.log(`[Pass] ${expr} === ${String(actual)}`);
		} else {
			console.error(`[Fail] ${expr}`);
			console.error(
				` - Expected: -9223372036854775808 or -9223372036854775808n`,
			);
			console.error(` - Actual:   ${String(actual)} (${typeof actual})\n`);
			hasFailures = true;
		}
	} catch (error) {
		console.error(
			`[Fail] ${expr} threw unexpected JS error: ${error.message}\n`,
		);
		hasFailures = true;
	}
}

// errors
console.log(
	'\n-> Error tests (should return MediaWiki <strong class="error">...)',
);

checkError("1/0", mwError("Division by zero."));
checkError("5 mod 0", mwError("Division by zero."));
checkError("5 fmod 0", mwError("Division by zero."));
checkError(
	"ln 0",
	mwError("Invalid argument for ln: less than or equal to 0."),
);
checkError(
	"ln -1",
	mwError("Invalid argument for ln: less than or equal to 0."),
);
checkError("sqrt -1", mwError("In sqrt: Result is not a number."));
checkError("sqrt ((-1)^0.5)", mwError("In sqrt: Result is not a number."));
checkError(
	"asin 2",
	mwError("Invalid argument for asin: less than -1 or greater than 1."),
);
checkError(
	"acos 2",
	mwError("Invalid argument for acos: less than -1 or greater than 1."),
);

checkError(
	"foo",
	mwError("Expression error: Unrecognized word &quot;foo&quot;."),
);
checkError(
	"FOO",
	mwError("Expression error: Unrecognized word &quot;foo&quot;."),
);
checkError(
	"1 constructor 2",
	mwError("Expression error: Unrecognized word &quot;constructor&quot;."),
);
checkError(
	"1 + , 2",
	mwError("Expression error: Unrecognized punctuation character &quot;,&quot;."),
);
checkError("1\f2", mwError("Expression error: Unrecognized punctuation character &quot;\f&quot;."));
checkError("(2+3", mwError("Expression error: Unclosed bracket."));
checkError("(", mwError("Expression error: Unclosed bracket."));
checkError("2+3)", mwError("Expression error: Unexpected closing bracket."));
checkError(")", mwError("Expression error: Unexpected closing bracket."));
checkError("e4", mwError("Expression error: Unexpected number."));
checkError("4e", mwError("Expression error: Missing operand for e."));
checkError("1+", mwError("Expression error: Missing operand for +."));
check("not ".repeat(100) + "0", 0);
checkError(
	"not ".repeat(101) + "0",
	mwError("Expression error: Stack exhausted."),
);
checkError(
	"not ".repeat(120) + "0",
	mwError("Expression error: Stack exhausted."),
);

// and/or evaluate both sides
checkError("1 or (1/0)", mwError("Division by zero."));
checkError("0 and (1/0)", mwError("Division by zero."));
checkError("1 and (1/0)", mwError("Division by zero."));

// nan
console.log("\n-> NaN tests (mediawikiErrors = false)");
checkError("1/0", NaN, { mediawikiErrors: false });
checkError("ln 0", NaN, { mediawikiErrors: false });
checkError("sqrt -1", NaN, { mediawikiErrors: false });
checkError("foo", NaN, { mediawikiErrors: false });

// onError
for (const [expr, options, expected] of [
	["1/0", { mediawikiErrors: false }, ["Division by zero."]],
	["foo", {}, ['Expression error: Unrecognized word "foo".']],
	["1+2", {}, []],
	["", { mediawikiErrors: false }, []],
]) {
	const messages = [];
	evaluateExpr(expr, { ...options, onError: (m) => messages.push(m) });
	if (JSON.stringify(messages) === JSON.stringify(expected)) {
		console.log(`[Pass] ${expr} onError -> ${JSON.stringify(messages)}`);
	} else {
		console.error(`[Fail] ${expr} onError`);
		console.error(` - Expected: ${JSON.stringify(expected)}`);
		console.error(` - Got:      ${JSON.stringify(messages)}\n`);
		hasFailures = true;
	}
}

// format
const formatted = [
	["-2.3e-4", "-0.00023"],
	["0.1+0.2", "0.3"],
	["6/7", "0.85714285714286"],
	["1+5e-14", "1"],
	["(1+5e-14)-1", "4.9960036108132E-14"],
	["2^53", "9.007199254741E+15"],
	["trunc (2^53)", "9007199254740992"],
	["1501^5", "7.6190962725075E+15"],
	["1e20", "1.0E+20"],
	["trunc 1e20", "7766279631452241920"],
	["1e-4", "0.0001"],
	["1e-5", "1.0E-5"],
	["1e14", "1.0E+14"],
	["trunc 1e14", "100000000000000"],
	["trunc -1e14", "-100000000000000"],
	["1e15", "1.0E+15"],
	["trunc 1e15", "1000000000000000"],
	["trunc 9007199254740991", "9007199254740991"],
	["-0", "-0"],
	["0", "0"],
	["-7.5 fmod 2.5", "-0"],
	["10.5 fmod 3.2 fmod 1.1", "0.9"],
	["0^-1", "INF"],
	["(-2)^0.5", "NAN"],
	["cos .1", "0.99500416527803"],
	["pi", "3.1415926535898"],
	["2^63", "9.2233720368548E+18"],
	["trunc (2^63)", "-9223372036854775808"],
	["", ""],
	["()", ""],
];
for (const [expr, text] of formatted) {
	const actual = formatExpr(evaluateExpr(expr));
	if (actual === text) console.log(`[Pass] format ${expr} === ${text}`);
	else {
		console.error(`[Fail] format ${expr}`);
		console.error(` - Expected: ${text}`);
		console.error(` - Got:      ${actual}\n`);
		hasFailures = true;
	}
}
for (const [value, precision, text] of [
	[NaN, 14, "NAN"],
	[Infinity, 14, "INF"],
	[-Infinity, 14, "-INF"],
	[1.25, 2, "1.2"],
	[1.35, 2, "1.4"],
	[9.5, 1, "1.0E+1"],
	[1.25, 0, "1"],
	[9.5, 0, "1.0E+1"],
	[1.25, -1, "1.25"],
	[1e-5, -1, "1.0E-5"],
	[-1.25, 2, "-1.2"],
]) {
	const actual = formatExpr(value, precision);
	if (actual === text) console.log(`[Pass] format ${value} precision ${precision} === ${text}`);
	else {
		console.error(`[Fail] format ${value} precision ${precision}`);
		console.error(` - Expected: ${text}`);
		console.error(` - Got:      ${actual}\n`);
		hasFailures = true;
	}
}

// empty stays ""
check("", "", { mediawikiErrors: false });
check("()", "", { mediawikiErrors: false });
check("   ", "", { mediawikiErrors: false });

if (hasFailures) {
	console.error("\nSome tests failed!");
	process.exit(1);
}

console.log("\nAll tests passed!");
