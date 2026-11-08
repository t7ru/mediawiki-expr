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
console.log(jsCode); // (()=>{ function phpAsFloat(v) {...} ... return phpAdd(1,phpMul(2,3)); })()

// Evaluate
const result = evaluateExpr("3.14159 round 2");
console.log(result); // 3.14

// For the more 'nuanced' expression
const value = evaluateExpr("sin(pi / 2) + e ^ 2");
console.log(value); // 8.389056098930649
```

## API

### `transpileExpr(expr: string): string`

- `expr` (string) - A MediaWiki `#expr` expression, e.g. `"1 + 2 * 3"`

Returns a string of self-contained JavaScript code that evaluates the expression. Only the runtime helpers the expression needs are inlined.

### `evaluateExpr(expr: string, options?: { mediawikiErrors?: boolean }): number | bigint | string`

- `expr` (string) - A MediaWiki `#expr` expression
- `options` (object, optional)
  - `mediawikiErrors` (boolean) - If `true` (default), returns a MediaWiki HTML error string. Syntax errors include the `Expression error:` prefix. Division, `ln`, `asin`, `acos`, and `sqrt` errors do not. If `false`, returns `NaN`.

Returns:

- `""`, `()`, and whitespace return `""`.
- A PHP int outside the safe-integer range returns a `bigint` (`trunc 1e20` -> `7766279631452241920n`).
- Other successes return a `number`, including `-0`, `NaN`, and `Infinity`.

## Notes

- `cos` can differ from PHP by one unit in the last place due to the platform libm.
