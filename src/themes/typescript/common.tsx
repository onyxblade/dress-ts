import type ts from 'typescript'
import { CommentText, Dispatch, Indent, Lines, Render, type Ctx, type NodeProps } from '../../core'
import { isFoldedModifier } from './bindings'

/** Inline children keep line comments terminated, even when a header is reflowed. */
export function Child({ node, ctx }: NodeProps) {
  const { leading, trailing } = ctx.comments.of(node)
  if ([...leading, ...trailing].every((c) => c.block)) return <Render node={node} ctx={ctx} />
  return (
    <>
      {leading.map((c) => (
        <>
          <CommentText key={c.pos} comment={c} ctx={ctx} />{c.block ? ' ' : '\n'}
        </>
      ))}
      <Dispatch node={node} ctx={ctx} />
      {trailing.map((c) => (
        <>
          {' '}<CommentText key={c.pos} comment={c} ctx={ctx} />{!c.block && '\n'}
        </>
      ))}
    </>
  )
}

export function List({ nodes, ctx }: { nodes: ts.NodeArray<ts.Node>; ctx: Ctx }) {
  return (
    <>
      {nodes.map((node, i) => (
        <>
          {i > 0 && ', '}<Child key={node.pos} node={node} ctx={ctx} />
        </>
      ))}
      {nodes.hasTrailingComma && ','}
    </>
  )
}

export function TypeParameters({ nodes, ctx }: { nodes: ts.NodeArray<ts.TypeParameterDeclaration> | undefined; ctx: Ctx }) {
  return nodes && <>{'<'}<List nodes={nodes} ctx={ctx} />{'>'}</>
}

export function Modifiers({ nodes, ctx }: { nodes: ts.NodeArray<ts.ModifierLike> | undefined; ctx: Ctx }) {
  return <>{nodes?.map((node) => {
    if (!isFoldedModifier(node, ctx)) return <><Child key={node.pos} node={node} ctx={ctx} />{' '}</>
    const { leading, trailing } = ctx.comments.of(node)
    return [...leading, ...trailing].map((comment) => (
      <><CommentText key={comment.pos} comment={comment} ctx={ctx} />{comment.block ? ' ' : '\n'}</>
    ))
  })}</>
}

/** A following keyword aligns with its header after a trailing line comment. */
export function spaceAfter(node: ts.Node, ctx: Ctx): string {
  const trailing = ctx.comments.of(node).trailing
  return trailing.length > 0 && !trailing[trailing.length - 1].block ? '' : ' '
}

/** The closing brace stays inline so a caller can continue with `else`, `)`, or `;`. */
export function Braces({ node, nodes, ctx }: { node: ts.Node; nodes: readonly ts.Node[]; ctx: Ctx }) {
  if (nodes.length === 0 && ctx.comments.of(node).dangling.length === 0) return <>{'{}'}</>
  return (
    <>
      {'{'}
      <Indent><Lines nodes={nodes} within={node} ctx={ctx} /></Indent>
      {'}'}
    </>
  )
}
