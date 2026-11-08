export interface EvaluateOptions {
	/**
	 * If true, returns an HTML error string on evaluation failure like MediaWiki.
	 * If false, returns `NaN` on error instead.
	 * Empty success (`""`, `"()"`, whitespace) is `""` even when this is false.
	 * @default true
	 */
	mediawikiErrors?: boolean;
}

/**
 * Success is a JS `number` (including `-0`, `NaN`, `Infinity`)
 * or a `bigint` when the PHP int is outside the JS safe-integer range
 * (e.g. `trunc 1e20` -> `7766279631452241920n`),
 * or `""` for an empty operand stack.
 *
 * Errors are HTML when `mediawikiErrors` is true, otherwise `NaN`.
 */
export declare function evaluateExpr(
	expr: string,
	options?: EvaluateOptions,
): number | bigint | string;
