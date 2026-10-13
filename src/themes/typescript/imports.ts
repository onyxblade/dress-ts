import type ts from 'typescript'
import { isStaticImport, type Comment, type Ctx } from '../../core'

/** Hide top-level import declarations, carrying every comment forward to the next visible line. */
export function withoutImports(node: ts.SourceFile, ctx: Ctx): { statements: ts.Statement[]; ctx: Ctx } {
  const statements: ts.Statement[] = []
  const leading = new Map<ts.Node, Comment[]>()
  let pending: Comment[] = []
  for (const statement of node.statements) {
    if (isStaticImport(statement)) {
      const attached = ctx.comments.of(statement)
      pending.push(
        ...attached.leading,
        ...ctx.comments.all.filter((c) => statement.getStart(node) <= c.pos && c.end <= statement.end),
        ...attached.trailing,
      )
    } else {
      statements.push(statement)
      if (pending.length > 0) {
        leading.set(statement, [...pending, ...ctx.comments.of(statement).leading].sort((a, b) => a.pos - b.pos))
        pending = []
      }
    }
  }
  const dangling = [...pending, ...ctx.comments.of(node).dangling].sort((a, b) => a.pos - b.pos)
  return {
    statements,
    ctx: {
      ...ctx,
      comments: {
        all: ctx.comments.all,
        of: (child) => {
          const attached = ctx.comments.of(child)
          if (child === node) return { ...attached, dangling }
          const moved = leading.get(child)
          return moved ? { ...attached, leading: moved } : attached
        },
      },
    },
  }
}
