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
 *
 * An entry may be a group of nodes laid out as one line: a run of `case`
 * labels sharing a body, `case 'a': case 'b': ...`. The first is the one
 * dispatched, and its component must know the group; the line carries
 * its identity. The leading comments of every member are the line's,
 * those on the first member's line inline and the rest on lines of their
 * own above it. The comments trailing the members are the component's
 * to place, since it lays the run out as it sees fit, a header line and
 * a body of lines of its own, and only it knows which line each is on.
 * A gap is a blank line in the source between two lines, so the lines
 * the later members took do not count as one.
 */
export type LineEntry = ts.Node | readonly ts.Node[]

export function Lines({ nodes, within, ctx }: { nodes: readonly LineEntry[]; within?: ts.Node; ctx: Ctx }) {
  const { sourceFile, comments } = ctx
  const lineOf = (pos: number) => sourceFile.getLineAndCharacterOfPosition(pos).line
  const ownLine = (c: Comment): Item => ({ kind: 'comment', comment: c, start: c.pos, end: c.end })

  const items: Item[] = []
  for (const entry of nodes) {
    const group: readonly ts.Node[] = Array.isArray(entry) ? entry : [entry as ts.Node]
    const node = group[0]
    const last = group[group.length - 1]
    const leading = group.flatMap((n) => comments.of(n).leading)
    const trailing = group.length === 1 ? comments.of(node).trailing : []
    const start = node.getStart(sourceFile)
    const line = lineOf(start)
    const inline = leading.filter((c) => lineOf(c.end) === line)
    items.push(...leading.filter((c) => lineOf(c.end) !== line).map(ownLine))
    items.push({
      kind: 'node',
      node,
      inline,
      trailing,
      start: inline[0]?.pos ?? start,
      end: trailing[trailing.length - 1]?.end ?? last.end,
    })
  }
  if (within) items.push(...comments.of(within).dangling.map(ownLine))

  return (
    <>
      {items.map((item, i) => {
        const prev = items[i - 1]
        const gap = prev !== undefined && /\n[ \t]*\r?\n/.test(sourceFile.text.slice(prev.end, item.start)) ? '' : undefined
        if (item.kind === 'comment') {
          return (
            <Line key={`c${item.comment.pos}`} data-gap={gap}>
              <CommentText comment={item.comment} ctx={ctx} />
            </Line>
          )
        }
        return (
          <Line key={`n${item.node.pos}`} node={item.node} data-gap={gap}>
            {item.inline.map((c) => (
              <>
                <CommentText key={c.pos} comment={c} ctx={ctx} />{' '}
              </>
            ))}
            <Dispatch node={item.node} ctx={ctx} />
            {item.trailing.map((c) => (
              <>
                {' '}
                <CommentText key={c.pos} comment={c} ctx={ctx} />
              </>
            ))}
          </Line>
        )
      })}
    </>
  )
}
