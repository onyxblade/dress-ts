/**
 * Arithmetic read into a tree and back out as a number: a tokenizer over
 * the characters, a precedence-climbing parser over the tokens, an
 * evaluator over the tree. Every stage switches over a union.
 */
export type Operator = '+' | '-' | '*' | '/'

export type Token =
  | { kind: 'number'; value: number }
  | { kind: 'op'; op: Operator }
  | { kind: 'paren'; open: boolean }

export type Expr =
  | { kind: 'literal'; value: number }
  | { kind: 'negate'; operand: Expr }
  | { kind: 'binary'; op: Operator; left: Expr; right: Expr }

const PRECEDENCE: Record<Operator, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const c = source[i]
    switch (c) {
      case ' ':
      case '\t':
      case '\n':
        i++
        break
      case '+':
      case '-':
      case '*':
      case '/':
        tokens.push({ kind: 'op', op: c })
        i++
        break
      case '(':
      case ')':
        tokens.push({ kind: 'paren', open: c === '(' })
        i++
        break
      default: {
        if (c < '0' || c > '9') throw new SyntaxError(`unexpected ${JSON.stringify(c)} at ${i}`)
        let j = i
        while (j < source.length && /[0-9.]/.test(source[j])) j++
        tokens.push({ kind: 'number', value: Number(source.slice(i, j)) })
        i = j
      }
    }
  }
  return tokens
}

class Parser {
  private at = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): Expr {
    const expr = this.expression(0)
    if (this.at < this.tokens.length) throw new SyntaxError(`trailing input at token ${this.at}`)
    return expr
  }

  private peek(): Token | undefined {
    return this.tokens[this.at]
  }

  private next(): Token {
    const token = this.tokens[this.at++]
    if (token === undefined) throw new SyntaxError('unexpected end of input')
    return token
  }

  /** An operand, then every operator that binds at least as tightly as `min`. */
  private expression(min: number): Expr {
    let left = this.unary()
    for (;;) {
      const token = this.peek()
      if (token?.kind !== 'op' || PRECEDENCE[token.op] < min) break
      this.next()
      const right = this.expression(PRECEDENCE[token.op] + 1)
      left = { kind: 'binary', op: token.op, left, right }
    }
    return left
  }

  private unary(): Expr {
    const token = this.next()
    switch (token.kind) {
      case 'number':
        return { kind: 'literal', value: token.value }
      case 'op':
        if (token.op === '-') return { kind: 'negate', operand: this.unary() }
        throw new SyntaxError(`unexpected ${token.op}`)
      case 'paren': {
        if (!token.open) throw new SyntaxError('unexpected )')
        const inner = this.expression(0)
        const close = this.next()
        if (close.kind !== 'paren' || close.open) throw new SyntaxError('expected )')
        return inner
      }
    }
  }
}

export function evaluate(expr: Expr): number {
  switch (expr.kind) {
    case 'literal':
      return expr.value
    case 'negate':
      return -evaluate(expr.operand)
    case 'binary': {
      const l = evaluate(expr.left)
      const r = evaluate(expr.right)
      switch (expr.op) {
        case '+':
          return l + r
        case '-':
          return l - r
        case '*':
          return l * r
        case '/':
          return l / r
      }
      throw new Error(`unreachable: ${JSON.stringify(expr)}`)
    }
    default:
      return unreachable(expr)
  }
}

/** The checker's way to say a switch covers its union: whatever is left is `never`. */
function unreachable(x: never): never {
  throw new Error(`unreachable: ${JSON.stringify(x)}`)
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

/** `source` as a number, or the SyntaxError it earned; any other error is a bug and escapes. */
export function calc(source: string): Result<number, SyntaxError> {
  try {
    return { ok: true, value: evaluate(new Parser(tokenize(source)).parse()) }
  } catch (e) {
    if (e instanceof SyntaxError) return { ok: false, error: e }
    throw e
  }
}
