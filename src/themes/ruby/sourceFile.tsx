import ts from 'typescript'
import { Lines, claim, type NodeProps } from '../../core'

/** Top-level statements, one per line, comments (to the end of the file) and blank-line groups kept. */
function RubySourceFile({ node, ctx }: NodeProps<ts.SourceFile>) {
  return <Lines nodes={node.statements} within={node} ctx={ctx} />
}

export const rubySourceFile = claim(ts.isSourceFile, RubySourceFile)
