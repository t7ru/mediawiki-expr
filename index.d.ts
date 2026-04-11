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

/**
 * Evaluates MediaWiki #expr syntax and returns the numeric result.
 */
export declare function evaluateExpr(expr: string): number;
