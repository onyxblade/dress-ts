import type ts from 'typescript'
import type { ComponentType } from 'preact'
import type { Ctx, NodeComponent, NodeProps, Resolve, Transform } from './types'
import { CommentText, attachComments } from './comments'

/**
 * Dispatch only: ask ctx.resolve which component renders this node, and
 * nothing else. For the places that lay a node's comments out themselves:
 * `Verbatim`, whose gap text already holds them, and `Lines`, which gives
 * leading comments lines of their own.
 */
export function Dispatch({ node, ctx }: NodeProps) {
  const Component = ctx.resolve(node, ctx)
  return <Component node={node} ctx={ctx} />
}

/**
 * Render a child where a designed component puts it. The component writes
 * its own tokens around the child, so the comments attached to the child
 * would otherwise go with the tokens; they are emitted here, inline, so a
 * designed component keeps every comment without asking for them.
 */
export function Render({ node, ctx }: NodeProps) {
  const { leading, trailing } = ctx.comments.of(node)
  return (
    <>
      {leading.map((c) => (
        <>
          <CommentText key={c.pos} comment={c} />{' '}
        </>
      ))}
      <Dispatch node={node} ctx={ctx} />
      {trailing.map((c) => (
        <>
          {' '}
          <CommentText key={c.pos} comment={c} />
        </>
      ))}
    </>
  )
}

/**
 * Compose transforms around a base resolver.
 * transforms[0] is outermost, i.e. it gets the first chance to claim a node.
 */
export function compose(base: Resolve, transforms: Transform[]): Resolve {
  return transforms.reduceRight<Resolve>((next, t) => t(next), base)
}

export function createCtx(sourceFile: ts.SourceFile, resolve: Resolve): Ctx {
  return { sourceFile, comments: attachComments(sourceFile), resolve }
}

/**
 * A ctx whose resolver has extra transforms stacked on top. A component
 * passes this to its children to make decisions that apply to its own
 * subtree only. Same mechanism as the global transform list, narrower scope.
 */
export function withTransforms(ctx: Ctx, transforms: Transform[]): Ctx {
  return { ...ctx, resolve: compose(ctx.resolve, transforms) }
}

/**
 * The common transform: nodes matching a type guard are rendered by a
 * component typed for that node. Everything else falls through.
 */
export function claim<N extends ts.Node>(
  is: (node: ts.Node) => node is N,
  Component: ComponentType<NodeProps<N>>,
): Transform {
  return (next) => (node, ctx) => (is(node) ? (Component as NodeComponent) : next(node, ctx))
}
