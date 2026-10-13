import type ts from 'typescript'
import { createContext } from 'preact'
import type { Ctx } from './types'
import { Dispatch, Render } from './render'
import { VerbatimScope } from './verbatim'
import { nodeId } from './identity'
import { CommentText, type Comment } from './comments'

/**
 * The layout vocabulary components build from. Layout is HTML structure
 * plus CSS, not whitespace: a Line is a block, an Indent pads its contents.
 * Both start a fresh VerbatimScope so fallback text inside lines up.
 */

/**
 * The node a Line was laid out for, when it was laid out for one. A
 * component rendering that node can tell it has the line to itself (up to
 * trailing comments), which is how the Ruby theme knows a `;` closes a line.
 * The line also carries that node's identity (`data-node`), so a designed
 * component that writes its own markup is still findable by node.
 */
export const LineOwner = createContext<ts.Node | null>(null)

export function Line({
  node = null,
  children,
  ...attrs
}: { node?: ts.Node | null; children?: preact.ComponentChildren } & Record<`data-${string}`, string | undefined>) {
  return (
    <VerbatimScope.Provider value={null}>
      <LineOwner.Provider value={node}>
        <div class="line" data-node={node ? nodeId(node) : undefined} {...attrs}>
          {children}
        </div>
      </LineOwner.Provider>
    </VerbatimScope.Provider>
  )
}

export function Indent({ children }: { children?: preact.ComponentChildren }) {
  return (
    <VerbatimScope.Provider value={null}>
      <div class="indent">{children}</div>
    </VerbatimScope.Provider>
  )
}

/** Render nodes inline with a separator between them: parameters, type arguments. */
export function Join({ nodes, sep, ctx }: { nodes: readonly ts.Node[] | undefined; sep: string; ctx: Ctx }) {
  return (
    <>
      {(nodes ?? []).map((n, i) => (
        <>
          {i > 0 && sep}
          <Render key={n.pos} node={n} ctx={ctx} />
        </>
      ))}
    </>
  )
}

/**
 * What a Line of a list is laid out for: a node with the comments that
 * share its line, or a comment on a line of its own. `start` and `end`
 * bound what the line shows, in the source: a node's reach from its first
 * same-line leading comment to its last trailing one.
 */
type Item =
  | { kind: 'node'; node: ts.Node; inline: readonly Comment[]; trailing: readonly Comment[]; start: number; end: number }
  | { kind: 'comment'; comment: Comment; start: number; end: number }

/**
 * Statement-like nodes, one per Line, with their comments. A leading
 * comment on a line of its own above the node gets a Line of its own; one
 * on the node's line, and a trailing comment, stay on the node's line. A
 * blank line in the source between two lines is kept as a gap, since
 * authors use those to group: between two comments, between a comment and
 * the node under it, between two nodes. The gap is yes or no, not a count,
 * and the first line has none.
 *
 * The order is the caller's, the source positions only decide the gaps.
 * They assume the nodes come in source order; a theme that reorders will
 * need to say what a gap means then.
 *
 * `within` is the node the list is the body of (a block, a class, the
 * file). Comments after its last child dangle from it, in the AST's terms
 * from nothing, and are given lines at the end so they are not lost.
 */
export function Lines({ nodes, within, ctx }: { nodes: readonly ts.Node[]; within?: ts.Node; ctx: Ctx }) {
  const { sourceFile, comments } = ctx
  const lineOf = (pos: number) => sourceFile.getLineAndCharacterOfPosition(pos).line
  const ownLine = (c: Comment): Item => ({ kind: 'comment', comment: c, start: c.pos, end: c.end })

  const items: Item[] = []
  for (const node of nodes) {
    const { leading, trailing } = comments.of(node)
    const start = node.getStart(sourceFile)
    const line = lineOf(start)
    const inline = leading.filter((c) => lineOf(c.end) === line)
    items.push(...leading.filter((c) => lineOf(c.end) < line).map(ownLine))
    items.push({
      kind: 'node',
      node,
      inline,
      trailing,
      start: inline[0]?.pos ?? start,
      end: trailing[trailing.length - 1]?.end ?? node.end,
    })
  }
  if (within) items.push(...comments.of(within).dangling.map(ownLine))

  return (
    <>
      {items.map((item, i) => {
        const prev = items[i - 1]
        const gap = prev !== undefined && lineOf(item.start) - lineOf(prev.end) > 1 ? '' : undefined
        if (item.kind === 'comment') {
          return (
            <Line key={`c${item.comment.pos}`} data-gap={gap}>
              <CommentText comment={item.comment} />
            </Line>
          )
        }
        return (
          <Line key={`n${item.node.pos}`} node={item.node} data-gap={gap}>
            {item.inline.map((c) => (
              <>
                <CommentText key={c.pos} comment={c} />{' '}
              </>
            ))}
            <Dispatch node={item.node} ctx={ctx} />
            {item.trailing.map((c) => (
              <>
                {' '}
                <CommentText key={c.pos} comment={c} />
              </>
            ))}
          </Line>
        )
      })}
    </>
  )
}
