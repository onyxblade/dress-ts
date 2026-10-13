import type ts from 'typescript'
import type { ComponentType } from 'preact'
import type { CommentMap } from './comments'

/**
 * Props every node component receives: the AST node it is responsible for,
 * plus the shared rendering context. The node is never mutated.
 */
export interface NodeProps<N extends ts.Node = ts.Node> {
  node: N
  ctx: Ctx
}

export type NodeComponent = ComponentType<NodeProps>

/**
 * Shared context threaded through the whole render.
 * `resolve` is the single extension point: it decides which component
 * renders a given node. Transforms wrap it. `comments` is where each
 * comment of the file was attached, since the AST does not carry them.
 * `checker` answers semantic questions (what does this name refer to, what
 * is its type) that the syntax tree cannot; it reads, never writes.
 */
export interface Ctx {
  sourceFile: ts.SourceFile
  comments: CommentMap
  checker: ts.TypeChecker
  resolve: Resolve
}

export type Resolve = (node: ts.Node, ctx: Ctx) => NodeComponent

/**
 * A transform is middleware over `resolve`: it may claim a node by returning
 * its own component, or defer to `next`.
 */
export type Transform = (next: Resolve) => Resolve

/**
 * A theme is a self-contained set of rendering decisions. Themes live in
 * their own folders under src/themes and are not meant to be merged; pick
 * one. Shared building blocks go in src/core instead.
 */
export interface Theme {
  name: string
  transforms: Transform[]
}
