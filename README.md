# mediawiki-expr

Evaluate MediaWiki's ParserFunctions `#expr` syntax in JavaScript.

## Install

```
npm i mediawiki-expr
```

## Usage

```js
import { evaluateExpr, formatExpr } from "mediawiki-expr";

const result = evaluateExpr("3.14159 round 2");
console.log(result); // 3.14

const value = evaluateExpr("sin(pi / 2) + e ^ 2");
console.log(value); // 8.389056098930649

// Format to a specific PHP precision
// Most MediaWiki instances will use 14
// Which is also our default precision
const raw = evaluateExpr("-2.3e-4");
console.log(raw); // -0.00022999999999999998
console.log(formatExpr(raw)); // -0.00023
```

## API

### `evaluateExpr(expr: string, options?: { mediawikiErrors?: boolean, onError?: (message: string) => void }): number | bigint | string`

- `expr` (string) - A MediaWiki `#expr` expression
- `options` (object, optional)
  - `mediawikiErrors` (boolean) - If `true` (default), returns a MediaWiki HTML error string. Syntax errors include the `Expression error:` prefix. Division, `ln`, `asin`, `acos`, and `sqrt` errors do not. If `false`, returns `NaN`.
  - `onError` (function) - Called with the plain error message (`1/0` -> `Division by zero.`), in either mode.

Returns:

- `""`, `()`, and whitespace return `""`.
- A PHP int with more than 14 digits returns a `bigint` (`trunc 1e14` -> `100000000000000n`).
- Other successes return a `number`, including `-0`, `NaN`, and `Infinity`.

### `formatExpr(value: number | bigint | "", precision?: number): string`

- `value` (number | bigint | "") - An `evaluateExpr` success
- `precision` (number, optional) - Significant digits. Default `14`.

Returns:

- `""` returns `""`, while a `bigint` returns every digit.
- `-0` returns `"-0"`, `NaN` returns `"NAN"`, and infinities return `"INF"` and `"-INF"`.

## Notes

- `cos` can differ from PHP by one unit in the last place due to the platform libm.
