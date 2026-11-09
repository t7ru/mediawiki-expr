export interface EvaluateOptions {
	/**
	 * If true, returns an HTML error string on evaluation failure like MediaWiki.
	 * If false, returns `NaN` on error instead.
	 * Empty success (`""`, `"()"`, whitespace) is `""` even when this is false.
	 * @default true
	 */
	mediawikiErrors?: boolean;
	/**
	 * Called with the plain error message before the error value is returned.
	 * e.g. `"Division by zero."`.
	 */
	onError?: (message: string) => void;
}

/**
 * Success is a JS `number` (including `-0`, `NaN`, `Infinity`)
 * or a `bigint` when the PHP int has more than 14 digits
 * (e.g. `trunc 1e14` -> `100000000000000n`),
 * or `""` for an empty operand stack.
 *
 * Errors are HTML when `mediawikiErrors` is true, otherwise `NaN`.
 */
export declare function evaluateExpr(
	expr: string,
	options?: EvaluateOptions,
): number | bigint | string;

/**
 * Formats a value returned by `evaluateExpr`.
 * This mimics `#expr` formatting in MediaWiki,
 * where it uses PHP's `precision` directive (default 14).
 */
export declare function formatExpr(
	value: number | bigint | "",
	precision?: number,
): string;
