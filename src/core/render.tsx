import type ts from 'typescript'
import type { ComponentType } from 'preact'
import type { Ctx, NodeComponent, NodeProps, Resolve, Transform } from './types'
import { CommentText, attachComments } from './comments'
import { nodeId } from './identity'

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

/**
 * The ctx for one file of a program. The file must come from the program:
 * the checker only knows the nodes it bound, so a SourceFile parsed on its
 * own would get no answers.
 */
export function createCtx(program: ts.Program, fileName: string, resolve: Resolve): Ctx {
  const sourceFile = program.getSourceFile(fileName)
  if (!sourceFile) throw new Error(`${fileName} is not in the program`)
  return { sourceFile, comments: attachComments(sourceFile), checker: program.getTypeChecker(), resolve }
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
 * The mark of a reading: a designed component shows the node in a form the
 * source never had, and the reader should be able to tell. The wrapper
 * has no box of its own (`display: contents` in the stylesheet), so it
 * changes no layout; it carries the note that says what the reading is,
 * and the node's identity, so a page can get from the mark back to the
 * node and show what was written. The words inside it that are not in a
 * node span are the component's own, which is what the stylesheet tints.
 */
export function Reading({ node, note, children }: { node: ts.Node; note: string; children?: preact.ComponentChildren }) {
  return (
    <span class="reading" data-reading={note} data-node={nodeId(node)}>
      {children}
    </span>
  )
}

/**
 * The common transform: nodes matching a type guard are rendered by a
 * component typed for that node. Everything else falls through. A
 * `reading` note says, in a line, what the component shows instead of the
 * source (`new Foo(a) reads as Foo.new(a)`), and marks its output as a
 * Reading; a component that only tags or trims the source text has none.
 */
export function claim<N extends ts.Node>(
  is: (node: ts.Node) => node is N,
  Component: ComponentType<NodeProps<N>>,
  reading?: string,
): Transform {
  const Designed: NodeComponent = reading
    ? (props) => (
        <Reading node={props.node} note={reading}>
          <Component {...(props as NodeProps<N>)} />
        </Reading>
      )
    : (Component as NodeComponent)
  return (next) => (node, ctx) => (is(node) ? Designed : next(node, ctx))
}
