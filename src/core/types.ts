import type ts from 'typescript'
import type { ComponentType } from 'preact'

/**
 * Props every node component receives: the AST node it is responsible for,
 * plus the shared rendering context. The node is never mutated.
 */
export interface NodeProps {
  node: ts.Node
  ctx: Ctx
}

export type NodeComponent = ComponentType<NodeProps>

/**
 * Shared context threaded through the whole render.
 * `resolve` is the single extension point: it decides which component
 * renders a given node. Transforms wrap it.
 */
export interface Ctx {
  sourceFile: ts.SourceFile
  resolve: Resolve
}

export type Resolve = (node: ts.Node, ctx: Ctx) => NodeComponent

/**
 * A transform is middleware over `resolve`: it may claim a node by returning
 * its own component, or defer to `next`.
 */
export type Transform = (next: Resolve) => Resolve
