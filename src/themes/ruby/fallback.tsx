import { Verbatim, type NodeProps, type Transform } from '../../core'
import { closingSemicolon } from './semicolon'
import { squareTypeLists } from './generics'

/**
 * The theme's fallback for the kinds it has not designed: the node's text
 * as written, as `Verbatim` shows it, with the theme's edits applied to
 * the text between children. Each edit is a rule of its own, answering
 * with the ranges it would change on this node; one fallback applies them
 * all, since a node can need several at once, `type Pair<T> = [T, T];`.
 *
 * Goes last, so designed components claim first. It leaves no Reading
 * mark: the text is still the source's, trimmed or respelled in place.
 */
export function RubyVerbatim({ node, ctx }: NodeProps) {
  return <Verbatim node={node} ctx={ctx} edits={[...closingSemicolon(node, ctx), ...squareTypeLists(node, ctx)]} />
}

export const rubyFallback: Transform = () => () => RubyVerbatim
