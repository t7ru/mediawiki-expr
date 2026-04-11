export type TokenType = "number" | "word" | "op" | "paren" | "eof";

export type Token = {
	type: TokenType;
	value: string;
};

export type Node =
	| { type: "number"; value: string }
	| { type: "constant"; name: "pi" | "e" }
	| { type: "unary"; op: string; arg: Node }
	| { type: "binary"; op: string; left: Node; right: Node };

/**
 * Transpiles MediaWiki #expr syntax into valid JavaScript.
 */
export declare function transpileExpr(expr: string): string;

export interface EvaluateOptions {
	/**
	 * If true, returns an HTML error string on evaluation failure like MediaWiki.
	 * If false, returns `NaN` on error instead.
	 * @default true
	 */
	mediawikiErrors?: boolean;
}

/**
 * Evaluates MediaWiki #expr syntax.
 */
export declare function evaluateExpr(
	expr: string,
	options?: EvaluateOptions,
): number | string;
