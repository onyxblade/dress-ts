import ts from 'typescript'
import { Indent, Line, Lines, Render, claim, type Ctx, type NodeProps } from '../../core'
import { Between } from './if'

/** A part's block: its statements in an Indent, the block itself never rendered as a node. */
function Part({ block, ctx }: { block: ts.Block; ctx: Ctx }) {
  return (
    <Indent>
      <Lines nodes={block.statements} within={block} ctx={ctx} />
    </Indent>
  )
}

/**
 * A try laid out from its fields: `begin`, the block, `rescue` with the
 * catch's binding after `=>`, its block, `ensure` and the finally block,
 * `end`. A `catch` with no binding is a bare `rescue`; a binding is the
 * node's, so `catch (e: unknown)` reads as `rescue => e: unknown` and a
 * destructuring `catch ({ message })` as `rescue => { message }`. The
 * comments around the braces between the parts, `} // a` before `catch`,
 * go on the `rescue` or `ensure` line, as an `if`'s go on its `else`.
 */
export function RubyTry({ node, ctx }: NodeProps<ts.TryStatement>) {
  const { tryBlock, catchClause, finallyBlock } = node
  return (
    <>
      <span class="header">begin</span>
      <Part block={tryBlock} ctx={ctx} />
      {catchClause && (
        <>
          <Line>
            rescue
            {catchClause.variableDeclaration && (
              <>
                {' => '}
                <Render node={catchClause.variableDeclaration} ctx={ctx} />
              </>
            )}
            <Between before={tryBlock} after={catchClause} ctx={ctx} />
          </Line>
          <Part block={catchClause.block} ctx={ctx} />
        </>
      )}
      {finallyBlock && (
        <>
          <Line>
            ensure
            <Between before={catchClause ?? tryBlock} after={finallyBlock} ctx={ctx} />
          </Line>
          <Part block={finallyBlock} ctx={ctx} />
        </>
      )}
      <Line>end</Line>
    </>
  )
}

export const rubyTry = claim(
  ts.isTryStatement,
  RubyTry,
  '`try { ... } catch (e) { ... } finally { ... }` reads as `begin ... rescue => e ... ensure ... end`',
)
