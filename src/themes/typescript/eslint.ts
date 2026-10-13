import * as parser from '@typescript-eslint/parser'
import { ESLintUtils, type TSESLint } from '@typescript-eslint/utils'
import { analyzeSwitch, switchIssues } from './switchAnalysis.ts'

const switchReading = ESLintUtils.RuleCreator(() =>
  'https://github.com/onyxblade/dress-ts/blob/main/src/themes/typescript/README.md#switch-reading',
)({
  name: 'switch-reading',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require switches supported by the TypeScript theme’s independent-arm reading.' },
    schema: [],
    messages: switchIssues,
  },
  defaultOptions: [],
  create(context) {
    // This contract is syntactic; a type-aware parser project is unnecessary.
    const services = ESLintUtils.getParserServices(context, true)
    return {
      SwitchStatement(node) {
        const analysis = analyzeSwitch(services.esTreeNodeToTSNodeMap.get(node))
        if (analysis.supported) return
        for (const issue of analysis.issues) {
          context.report({
            node: services.tsNodeToESTreeNodeMap.get(issue.node),
            messageId: issue.kind,
          })
        }
      },
    }
  },
})

/** Opt in per project or file set; importing the theme does not enable lint. */
export const plugin = { rules: { 'switch-reading': switchReading } }

export const switchReadingConfig = {
  name: 'dress/typescript-switch-reading',
  languageOptions: { parser },
  plugins: { dress: plugin },
  rules: { 'dress/switch-reading': 'error' as const },
}

/** The theme's complete opt-in contract; the renderer also checks each reading. */
export const typescriptReadingConfig: TSESLint.FlatConfig.Config = {
  ...switchReadingConfig,
  name: 'dress/typescript-reading',
  rules: {
    ...switchReadingConfig.rules,
    eqeqeq: ['error', 'always', { null: 'always' }],
  },
}

export default plugin
