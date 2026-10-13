import ts from 'typescript'
import { Line, Lines, claim, type NodeProps } from '../../core'
import { withoutImports } from './imports'

function TypeScriptSourceFile({ node, ctx }: NodeProps<ts.SourceFile>) {
  const shebang = ts.getShebang(node.text)
  const body = withoutImports(node, ctx)
  return (
    <>
      {shebang && <Line>{shebang}</Line>}
      <Lines nodes={body.statements} within={node} ctx={body.ctx} />
    </>
  )
}

export const typescriptSourceFile = claim(ts.isSourceFile, TypeScriptSourceFile)
