import { spawnSync } from "node:child_process";
import {
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
	phpCmp,
	runtimeSource,
} from "./runtime.js";

let passed = 0;
let failed = 0;

function fail(msg) {
	failed++;
	console.error("FAIL:", msg);
}

function pass() {
	passed++;
}

function same(a, b) {
	if (typeof a === "bigint" || typeof b === "bigint") return a === b;
	if (Number.isNaN(a) && Number.isNaN(b)) return true;
	return Object.is(a, b);
}

function assertSame(actual, expected, label) {
	if (same(actual, expected)) pass();
	else fail(`${label}: got ${fmt(actual)}, expected ${fmt(expected)}`);
}

function fmt(v) {
	if (typeof v === "bigint") return v.toString() + "n";
	if (Object.is(v, -0)) return "-0";
	if (typeof v === "number") return String(v);
	return JSON.stringify(v);
}

const phpScript = `<?php
error_reporting(E_ALL & ~E_WARNING & ~E_DEPRECATED);
ini_set("display_errors", "0");
function enc($v) {
	if (is_int($v)) return ["t" => "i", "v" => (string)$v];
	if (is_float($v)) {
		if (is_nan($v)) return ["t" => "d", "v" => "NAN"];
		if (is_infinite($v)) return ["t" => "d", "v" => $v > 0 ? "INF" : "-INF"];
		if ($v == 0.0) {
			$neg = (pack("E", $v) !== pack("E", 0.0));
			return ["t" => "d", "v" => $neg ? "-0" : "0"];
		}
		return ["t" => "d", "v" => sprintf("%.17g", $v)];
	}
	if (is_bool($v)) return ["t" => "b", "v" => $v];
	return ["t" => "s", "v" => (string)$v];
}
$out = [];
$out["int_1_9"] = enc((int)1.9);
$out["int_m1_9"] = enc((int)-1.9);
$out["int_m0"] = enc((int)(-0.0));
$out["int_1e20"] = enc((int)1e20);
$out["int_m1e20"] = enc((int)-1e20);
$out["int_2_63"] = enc((int)(2**63));
$out["int_m2_63"] = enc((int)(-(2**63)));
$out["int_2_64"] = enc((int)(2**64));
$out["int_2_1023"] = enc((int)(2**1023));
$out["int_inf"] = enc((int)INF);
$out["int_nan"] = enc((int)NAN);
$out["int_1_5_2_64"] = enc((int)(1.5 * 2**64));
$out["int_2_64_p4096"] = enc((int)(2**64 + 4096));
$out["round_1_005_2"] = enc(round(1.005, 2));
$out["round_9_995_2"] = enc(round(9.995, 2));
$out["round_1_23_m400"] = enc(round(1.23, -400));
$out["round_m4_5_0"] = enc(round(-4.5, 0));
$out["round_m15_m1"] = enc(round(-15, -1));
$out["round_1_23_400"] = enc(round(1.23, 400));
$out["round_m1_005_2"] = enc(round(-1.005, 2));
$out["round_0_2"] = enc(round(0, 2));
$out["round_inf_2"] = enc(round(INF, 2));
$out["round_1_23_0"] = enc(round(1.23, 0));
$out["round_m0_2"] = enc(round(-0.0, 2));
$out["round_15_m1"] = enc(round(15, -1));
$out["round_1_5_0"] = enc(round(1.5, 0));
$out["round_2_5_0"] = enc(round(2.5, 0));
$out["round_m2_5_0"] = enc(round(-2.5, 0));
$out["round_places_1e20"] = enc(round(1.5, (int)1e20));
$out["round_places_m1e20"] = enc(round(1.5, (int)-1e20));
$out["mod_1e20_3"] = enc(((int)1e20) % 3);
$out["mod_m1e20_3"] = enc(((int)-1e20) % 3);
$out["mod_1e20_7"] = enc(((int)1e20) % 7);
$out["mod_5_m3"] = enc(5 % -3);
$out["mod_m5_3"] = enc((-5) % 3);
try { $x = 5 % 0; $out["mod_5_0"] = enc($x); }
catch (Throwable $e) { $out["mod_5_0"] = ["t" => "e", "v" => "div0"]; }
$out["add_overflow"] = enc(9223372036854775807 + 1);
$out["mul_overflow"] = enc(4611686018427387904 * 2);
$out["pow_0_0_int"] = enc(pow(0, 0));
$out["pow_0_0_float"] = enc(pow(0.0, 0.0));
$out["pow_2_3"] = enc(pow(2, 3));
$out["pow_2_63"] = enc(pow(2, 63));
$out["pow_m2_63"] = enc(pow(-2, 63));
$out["pow_3_39"] = enc(pow(3, 39));
$out["pow_3_40"] = enc(pow(3, 40));
$out["pow_m2_3_5"] = enc(pow(-2, 3.5));
$out["div_10_2"] = enc(10 / 2);
$out["div_7_2"] = enc(7 / 2);
$out["div_longmin_m1"] = enc((-9223372036854775807-1) / -1);
$out["neg_longmin"] = enc(-(-9223372036854775807-1));
$out["fmod_5_7_1_3"] = enc(fmod(5.7, 1.3));
$out["fmod_m5_7_1_3"] = enc(fmod(-5.7, 1.3));
$out["truthy_nan"] = enc((bool)NAN);
$out["truthy_m0"] = enc((bool)(-0.0));
$out["float_1_2_3"] = enc((float)"1.2.3");
$out["float_010"] = enc((float)"010");
$out["float_dot"] = enc((float)".");
$out["float_dotdot"] = enc((float)"..");
$out["float_empty"] = enc((float)"");
$out["float_00_5"] = enc((float)"00.5");
$out["float_5dot"] = enc((float)"5.");
$out["float_dot5"] = enc((float)".5");
echo json_encode($out, JSON_UNESCAPED_SLASHES);
`;

const phpRun = spawnSync("php", ["-d", "display_errors=0"], {
	input: phpScript,
	encoding: "utf8",
	maxBuffer: 1024 * 1024,
});

if (phpRun.status !== 0) {
	console.error("php probe failed:", phpRun.stderr || phpRun.stdout);
	process.exit(1);
}

let phpOut;
try {
	phpOut = JSON.parse(phpRun.stdout);
} catch (e) {
	console.error("bad php json:", phpRun.stdout, phpRun.stderr);
	process.exit(1);
}

function fromPhp(enc) {
	if (enc.t === "i") return BigInt(enc.v);
	if (enc.t === "d") {
		if (enc.v === "NAN") return NaN;
		if (enc.v === "INF") return Infinity;
		if (enc.v === "-INF") return -Infinity;
		if (enc.v === "-0") return -0;
		if (enc.v === "0") return 0;
		return Number(enc.v);
	}
	if (enc.t === "b") return enc.v;
	if (enc.t === "e") return enc.v;
	return enc.v;
}

function assertPhp(actual, key, label) {
	const expected = fromPhp(phpOut[key]);
	assertSame(actual, expected, label ?? key);
}

// parse
assertSame(phpParseNumber("1.2.3"), 1.2, "parse 1.2.3");
assertSame(phpParseNumber("010"), 10, "parse 010");
assertSame(phpParseNumber("."), 0, "parse .");
assertSame(phpParseNumber(".."), 0, "parse ..");
assertSame(phpParseNumber(""), 0, "parse empty");
assertSame(phpParseNumber("00.5"), 0.5, "parse 00.5");
assertSame(phpParseNumber("5."), 5, "parse 5.");
assertSame(phpParseNumber(".5"), 0.5, "parse .5");
assertSame(phpParseNumber("..."), 0, "parse ...");
assertPhp(phpParseNumber("1.2.3"), "float_1_2_3");
assertPhp(phpParseNumber("010"), "float_010");
assertPhp(phpParseNumber("."), "float_dot");
assertPhp(phpParseNumber(".."), "float_dotdot");
assertPhp(phpParseNumber(""), "float_empty");
assertPhp(phpParseNumber("00.5"), "float_00_5");
assertPhp(phpParseNumber("5."), "float_5dot");
assertPhp(phpParseNumber(".5"), "float_dot5");

// toInt
assertPhp(phpToInt(1.9), "int_1_9");
assertPhp(phpToInt(-1.9), "int_m1_9");
assertPhp(phpToInt(-0), "int_m0");
assertPhp(phpToInt(1e20), "int_1e20");
assertPhp(phpToInt(-1e20), "int_m1e20");
assertPhp(phpToInt(2 ** 63), "int_2_63");
assertPhp(phpToInt(-(2 ** 63)), "int_m2_63");
assertPhp(phpToInt(2 ** 64), "int_2_64");
assertPhp(phpToInt(2 ** 1023), "int_2_1023");
assertPhp(phpToInt(Infinity), "int_inf");
assertPhp(phpToInt(NaN), "int_nan");
assertPhp(phpToInt(1.5 * 2 ** 64), "int_1_5_2_64");
assertPhp(phpToInt(2 ** 64 + 4096), "int_2_64_p4096");

// truthy
assertSame(phpTruthy(NaN), true, "truthy NaN");
assertSame(phpTruthy(-0), false, "truthy -0");
assertSame(phpTruthy(0), false, "truthy 0");
assertSame(phpTruthy(0n), false, "truthy 0n");
assertSame(phpTruthy(1n), true, "truthy 1n");
assertSame(phpTruthy(Infinity), true, "truthy Inf");
assertPhp(phpTruthy(NaN), "truthy_nan");
assertPhp(phpTruthy(-0), "truthy_m0");

// asFloat
assertSame(phpAsFloat(1n), 1, "asFloat 1n");
assertSame(phpAsFloat(-0), -0, "asFloat -0");
assertSame(phpAsFloat(NaN), NaN, "asFloat NaN");

// round
assertPhp(phpRound(1.005, 2), "round_1_005_2");
assertPhp(phpRound(9.995, 2), "round_9_995_2");
assertPhp(phpRound(1.23, -400), "round_1_23_m400");
assertPhp(phpRound(-4.5, 0), "round_m4_5_0");
assertPhp(phpRound(-15, -1), "round_m15_m1");
assertPhp(phpRound(1.23, 400), "round_1_23_400");
assertPhp(phpRound(-1.005, 2), "round_m1_005_2");
assertPhp(phpRound(0, 2), "round_0_2");
assertPhp(phpRound(Infinity, 2), "round_inf_2");
assertPhp(phpRound(1.23, 0), "round_1_23_0");
assertPhp(phpRound(-0, 2), "round_m0_2");
assertPhp(phpRound(15n, -1), "round_15_m1");
assertPhp(phpRound(1.5, 0), "round_1_5_0");
assertPhp(phpRound(2.5, 0), "round_2_5_0");
assertPhp(phpRound(-2.5, 0), "round_m2_5_0");
assertPhp(phpRound(1.5, 1e20), "round_places_1e20");
assertPhp(phpRound(1.5, -1e20), "round_places_m1e20");
assertSame(phpRound(5n, 2), 5, "round long places>=0");
assertSame(clampRoundPlaces(1e20), 2147483647, "clamp places 1e20");
assertSame(clampRoundPlaces(-1e20), -2147483648, "clamp places -1e20");

// mod
assertPhp(phpMod(1e20, 3), "mod_1e20_3");
assertPhp(phpMod(-1e20, 3), "mod_m1e20_3");
assertPhp(phpMod(1e20, 7), "mod_1e20_7");
assertPhp(phpMod(5, -3), "mod_5_m3");
assertPhp(phpMod(-5, 3), "mod_m5_3");
try {
	phpMod(5, 0);
	fail("phpMod(5,0) should throw");
} catch (e) {
	assertSame(e.message, "Division by zero.", "phpMod div0 message");
}

// add
assertPhp(phpAdd(9223372036854775807n, 1n), "add_overflow");
assertPhp(phpMul(4611686018427387904n, 2n), "mul_overflow");
assertSame(phpAdd(1n, 2n), 3n, "add ints");
assertSame(phpSub(5n, 3n), 2n, "sub ints");

// div
assertPhp(phpDiv(10n, 2n), "div_10_2");
assertPhp(phpDiv(7n, 2n), "div_7_2");
assertPhp(phpDiv(-9223372036854775808n, -1n), "div_longmin_m1");
try {
	phpDiv(1, 0);
	fail("phpDiv(1,0) should throw");
} catch (e) {
	assertSame(e.message, "Division by zero.", "phpDiv div0 message");
}
try {
	phpDiv(1, -0);
	fail("phpDiv(1,-0) should throw");
} catch (e) {
	assertSame(e.message, "Division by zero.", "phpDiv -0 message");
}
assertSame(Number.isNaN(phpDiv(1, NaN)), true, "phpDiv by NaN is NaN");

// fmod
assertPhp(phpFmod(5.7, 1.3), "fmod_5_7_1_3");
assertPhp(phpFmod(-5.7, 1.3), "fmod_m5_7_1_3");
try {
	phpFmod(5, 0);
	fail("phpFmod(5,0) should throw");
} catch (e) {
	assertSame(e.message, "Division by zero.", "phpFmod div0 message");
}

// pow
assertPhp(phpPow(0, 0), "pow_0_0_float");
assertPhp(phpPow(0n, 0n), "pow_0_0_int");
assertPhp(phpPow(2n, 3n), "pow_2_3");
assertPhp(phpPow(2n, 63n), "pow_2_63");
assertPhp(phpPow(-2n, 63n), "pow_m2_63");
assertPhp(phpPow(3n, 39n), "pow_3_39");
assertPhp(phpPow(3n, 40n), "pow_3_40");
assertPhp(phpPow(-2, 3.5), "pow_m2_3_5");

// neg
assertPhp(phpNeg(-9223372036854775808n), "neg_longmin");
assertSame(phpNeg(5n), -5n, "neg 5n");
assertSame(phpNeg(-0), 0, "neg -0");

// cmp
assertSame(phpCmp(1n, 2n, "<"), 1, "cmp 1<2");
assertSame(phpCmp(2n, 1n, ">"), 1, "cmp 2>1");
assertSame(phpCmp(1n, 1n, "="), 1, "cmp 1=1");
assertSame(phpCmp(1n, 2n, "<>"), 1, "cmp 1<>2");
assertSame(phpCmp(1.5, 1n, ">"), 1, "cmp mixed");
assertSame(phpCmp(1n, 1.0, "="), 1, "cmp 1n=1.0");
assertSame(typeof phpCmp(1, 2, "<"), "number", "cmp returns number");
assertSame(phpCmp(NaN, NaN, "="), 0, "cmp NaN=NaN");
assertSame(phpCmp(NaN, NaN, "<>"), 1, "cmp NaN<>NaN");
assertSame(phpCmp(NaN, 1, "<"), 0, "cmp NaN<1");
assertSame(phpCmp(NaN, 1, "<="), 0, "cmp NaN<=1");
assertSame(phpCmp(1, NaN, ">="), 0, "cmp 1>=NaN");

// runtimeSource
const embedded = new Function(runtimeSource() + "; return phpToInt(1e20);")();
assertSame(embedded, 7766279631452241920n, "runtimeSource phpToInt(1e20)");

const embeddedRound = new Function(
	runtimeSource() + "; return phpRound(1.005, 2);",
)();
assertSame(embeddedRound, 1.01, "runtimeSource phpRound");

const shaken = runtimeSource("phpRound(1, 2)");
assertSame(shaken.includes("function clampRoundPlaces("), true, "runtimeSource pulls transitive deps");
assertSame(shaken.includes("function phpAdd("), false, "runtimeSource drops unused helpers");

if (failed) {
	console.error(`${passed} passed, ${failed} failed`);
	process.exit(1);
}
console.log(`${passed} passed`);
