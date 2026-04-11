# mediawiki-expr

Transpile and evaluate MediaWiki `#expr` syntax into JavaScript.

## Install

```
npm i mediawiki-expr
```

## Usage

```js
import { transpileExpr, evaluateExpr } from "mediawiki-expr";

// Transpile to JavaScript
const jsCode = transpileExpr("1 + 2 * 3");
console.log(jsCode); // Outputs: (()=>{...;return ((1) + ((2) * (3)));})()

// Evaluate
const result = evaluateExpr("round(3.14159, 2)");
console.log(result);

// For the more 'nuanced' expression
const value = evaluateExpr("sin(pi / 2) + e ^ 2");
console.log(value);
```

## API

### `transpileExpr(expr: string): string`

- `expr` (string) - A MediaWiki `#expr` expression, e.g. `"1 + 2 * 3"`

Returns a string of JavaScript code that evaluates the expression.

### `evaluateExpr(expr: string, options?: { mediawikiErrors?: boolean }): number | string`

- `expr` (string) - A MediaWiki `#expr` expression
- `options` (object, optional)
  - `mediawikiErrors` (boolean) - If `true` (default), returns a MediaWiki HTML error string on evaluation failure. If `false`, returns `NaN`.

Transpiles and evaluates the expression.

## Notes

- May not match edge cases perfectly because PHP is well, different.
