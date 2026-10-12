import type ts from 'typescript'
import type { Ctx, NodeProps, Resolve, Transform } from './types'

/** Dispatch: ask ctx.resolve which component should render this node. */
export function Render({ node, ctx }: NodeProps) {
  const Component = ctx.resolve(node, ctx)
  return <Component node={node} ctx={ctx} />
}

/**
 * Compose transforms around a base resolver.
 * transforms[0] is outermost, i.e. it gets the first chance to claim a node.
 */
export function compose(base: Resolve, transforms: Transform[]): Resolve {
  return transforms.reduceRight<Resolve>((next, t) => t(next), base)
}

export function createCtx(sourceFile: ts.SourceFile, resolve: Resolve): Ctx {
  return { sourceFile, resolve }
}

/**
 * A ctx whose resolver has extra transforms stacked on top. A component
 * passes this to its children to make decisions that apply to its own
 * subtree only. Same mechanism as the global transform list, narrower scope.
 */
export function withTransforms(ctx: Ctx, transforms: Transform[]): Ctx {
  return { ...ctx, resolve: compose(ctx.resolve, transforms) }
}
