import ts from 'typescript'
import { CommentText, Render, claim, type Ctx, type Edit } from '../../core'

/**
 * The modifiers the theme reads as noise. Ruby says visibility apart from
 * the method, `private` on a line of its own, and has no `readonly`, so
 * `private readonly x` reads as `x` and `public m()` as `def m()`. Which
 * modifiers a declaration had is in the node as written, on hover.
 *
 * `static`, `abstract`, `override`, `async`, `export` and the rest say
 * something about the declaration a reader wants in the text, and stay.
 */
export const isNoiseModifier = (m: ts.ModifierLike): boolean =>
  m.kind === ts.SyntaxKind.PublicKeyword ||
  m.kind === ts.SyntaxKind.PrivateKeyword ||
  m.kind === ts.SyntaxKind.ProtectedKeyword ||
  m.kind === ts.SyntaxKind.ReadonlyKeyword

/**
 * The modifiers a designed component writes before its keyword: the ones
 * that are not noise, each followed by a space. A skipped modifier is not
 * rendered, so a comment attached to it, `private /* c *​/ m()`, is
 * written here, where the modifier would have been.
 */
export function Modifiers({ nodes, ctx }: { nodes: ts.NodeArray<ts.ModifierLike> | undefined; ctx: Ctx }) {
  return (
    <>
      {nodes?.map((m) => {
        if (!isNoiseModifier(m)) {
          return (
            <>
              <Render key={m.pos} node={m} ctx={ctx} />{' '}
            </>
          )
        }
        const { leading, trailing } = ctx.comments.of(m)
        return [...leading, ...trailing].map((c) => (
          <>
            <CommentText key={c.pos} comment={c} ctx={ctx} />{' '}
          </>
        ))
      })}
    </>
  )
}

const note = '`private readonly x` reads as `x`'

/**
 * The same reading on a node shown verbatim, a parameter property, an
 * interface member, a constructor: the modifier is a child node, so a
 * claim on the modifier itself renders nothing for it, and the rule
 * below, in the theme's fallback, drops the space that followed it, which
 * is gap text of the parent and the only part an edit can reach. A
 * comment after the modifier is in that gap too and stays.
 *
 * Only a modifier in its parent's modifier list is noise. The `readonly`
 * of a mapped type, `{ readonly [K in T]: V }`, is the same token kind in
 * the type's own `readonlyToken` slot, and like the `readonly` of
 * `readonly string[]` it is an operator on the type, which stays.
 */
const isNoiseModifierNode = (node: ts.Node): node is ts.Modifier =>
  ts.isModifier(node) && isNoiseModifier(node) && ts.canHaveModifiers(node.parent) && (ts.getModifiers(node.parent)?.includes(node) ?? false)

export const rubyModifier = claim(isNoiseModifierNode, () => null)

export function droppedModifiers(node: ts.Node, { sourceFile: { text } }: Ctx): Edit[] {
  if (!ts.canHaveModifiers(node)) return []
  return (ts.getModifiers(node) ?? []).filter(isNoiseModifier).map((m) => {
    let to = m.end
    while (to < text.length && /\s/.test(text[to])) to++
    return { from: m.end, to, text: '', note }
  })
}
