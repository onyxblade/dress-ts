import ts from 'typescript'
import { kindName } from './kind'

/**
 * The identity of a node across renders of the same file: its kind and its
 * range. Two readings of one file can be lined up by it, node for node,
 * even when their lines no longer correspond. It goes into the DOM as
 * `data-node`, and comes back out through `parseNodeId` and `nodeById`,
 * so a page that has only an element can get to the node.
 */
export function nodeId(node: ts.Node): string {
  return `${kindName(node.kind)}@${node.pos}-${node.end}`
}

export interface NodeRange {
  kind: string
  pos: number
  end: number
}

/** The range back out of an identity. */
export function parseNodeId(id: string): NodeRange | undefined {
  const m = /^(\w+)@(\d+)-(\d+)$/.exec(id)
  return m ? { kind: m[1], pos: Number(m[2]), end: Number(m[3]) } : undefined
}

/** The node of a file with this identity, found by walking down into whatever contains its range. */
export function nodeById(sourceFile: ts.SourceFile, id: string): ts.Node | undefined {
  const r = parseNodeId(id)
  if (!r) return undefined
  const find = (n: ts.Node): ts.Node | undefined => {
    if (r.pos < n.pos || n.end < r.end) return undefined
    if (n.pos === r.pos && n.end === r.end && kindName(n.kind) === r.kind) return n
    return ts.forEachChild(n, find)
  }
  return find(sourceFile)
}
