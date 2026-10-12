import ts from 'typescript'
import { NodeSpan, spliceChildren, type NodeProps, type Transform } from '../../core'
import { bracesAsEnd } from './braces'

/** A class's braces are its own direct children, so no body node to go through. */
function RubyClass({ node, ctx }: NodeProps) {
  return <NodeSpan node={node}>{spliceChildren(node, ctx, bracesAsEnd)}</NodeSpan>
}

/** `class A { ... }` reads as `class A ... end`. */
export const rubyClass: Transform = (next) => (node, ctx) =>
  ts.isClassLike(node) ? RubyClass : next(node, ctx)
