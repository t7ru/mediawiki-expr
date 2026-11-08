# mediawiki-expr

Evaluate MediaWiki `#expr` syntax in JavaScript.

## Install

```
npm i mediawiki-expr
```

## Usage

```js
import { evaluateExpr } from "mediawiki-expr";

// Evaluate
const result = evaluateExpr("3.14159 round 2");
console.log(result); // 3.14

// For the more 'nuanced' expression
const value = evaluateExpr("sin(pi / 2) + e ^ 2");
console.log(value); // 8.389056098930649
```

## API

### `evaluateExpr(expr: string, options?: { mediawikiErrors?: boolean, onError?: (message: string) => void }): number | bigint | string`

- `expr` (string) - A MediaWiki `#expr` expression
- `options` (object, optional)
  - `mediawikiErrors` (boolean) - If `true` (default), returns a MediaWiki HTML error string. Syntax errors include the `Expression error:` prefix. Division, `ln`, `asin`, `acos`, and `sqrt` errors do not. If `false`, returns `NaN`.
  - `onError` (function) - Called with the plain error message (`1/0` -> `Division by zero.`), in either mode.

Returns:

- `""`, `()`, and whitespace return `""`.
- A PHP int outside the safe-integer range returns a `bigint` (`trunc 1e20` -> `7766279631452241920n`).
- Other successes return a `number`, including `-0`, `NaN`, and `Infinity`.

## Notes

- `cos` can differ from PHP by one unit in the last place due to the platform libm.
