import ts from 'typescript'
import { claim, type NodeProps } from '../../core'

const strict = (n: ts.Node): n is ts.Token<ts.SyntaxKind.EqualsEqualsEqualsToken | ts.SyntaxKind.ExclamationEqualsEqualsToken> =>
  n.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || n.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken

/**
 * Ruby's `==` is already the strict one, so `===` reads as `==` and
 * `!==` as `!=`. The operator of a binary expression is a node of its
 * own, so this claims the token and the expression around it stays with
 * whoever has it. A TypeScript `==` is left as written: it looks the same,
 * but its mark on hover says nothing was read into it.
 */
export function RubyEquality({ node }: NodeProps<ts.Token<ts.SyntaxKind.EqualsEqualsEqualsToken | ts.SyntaxKind.ExclamationEqualsEqualsToken>>) {
  return <>{node.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ? '==' : '!='}</>
}

export const rubyEquality = claim(strict, RubyEquality, '`===` reads as `==`, `!==` as `!=`')
