// @ts-check
/**
 * FoodRank layout rules for comments and members, not covered by the shared ESLint configs.
 * Both rules are auto-fixable: `npm run lint -- --fix`.
 */

/**
 * Leading whitespace of the line where a node or comment starts.
 *
 * @param {import('eslint').SourceCode} sourceCode
 * @param {{ loc?: import('estree').SourceLocation | null }} node
 */
function indentOf(sourceCode, node) {
  const line = sourceCode.lines[(node.loc?.start.line ?? 1) - 1];
  return /^\s*/.exec(line)?.[0] ?? '';
}

/**
 * Doc comments are written on three lines, even when the text fits on one:
 * `/** text *\/` becomes `/**`, ` * text`, ` *\/`.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const multilineDocComment = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: { description: 'Require `/** */` doc comments to span three lines' },
    messages: { singleLine: 'Write the doc comment on three lines: /**, * text, */.' },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          const isDoc = comment.type === 'Block' && comment.value.startsWith('*');
          if (!isDoc || !comment.loc || comment.loc.start.line !== comment.loc.end.line) {
            continue;
          }
          const text = comment.value.slice(1).trim();
          if (!text) {
            continue;
          }
          const indent = indentOf(sourceCode, comment);
          context.report({
            loc: comment.loc,
            messageId: 'singleLine',
            fix: (fixer) =>
              fixer.replaceText(
                /** @type {import('estree').Comment} */ (comment),
                `/**\n${indent} * ${text}\n${indent} */`,
              ),
          });
        }
      },
    };
  },
};

/**
 * Every member of a class, an interface or a multi-line object type is separated from the previous
 * one by an empty line, comments included, so members are never grouped.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const paddedMembers = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: { description: 'Require an empty line between class, interface and object type members' },
    messages: { missingLine: 'Add an empty line before this member and its comment.' },
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * Reports each member not separated from the previous one by an empty line.
     *
     * @param {import('estree').Node[]} members
     */
    function check(members) {
      for (let i = 1; i < members.length; i++) {
        const previous = members[i - 1];
        const member = members[i];
        if (!previous.loc || !member.loc || previous.loc.end.line === member.loc.start.line) {
          continue;
        }
        const previousEnd = previous.loc.end.line;
        const leadingComment = sourceCode
          .getCommentsBefore(member)
          .find((comment) => (comment.loc?.start.line ?? 0) > previousEnd);
        const start = leadingComment ?? member;
        const tokenBefore = sourceCode.getTokenBefore(start, { includeComments: true });
        if (!tokenBefore?.loc || !start.loc) {
          continue;
        }
        if (start.loc.start.line - tokenBefore.loc.end.line < 2) {
          context.report({
            node: member,
            messageId: 'missingLine',
            fix: (fixer) => fixer.insertTextAfter(tokenBefore, '\n'),
          });
        }
      }
    }

    return {
      ClassBody: (node) => check(node.body),
      /** @param {any} node */
      TSInterfaceBody: (node) => check(node.body),
      /** @param {any} node */
      TSTypeLiteral: (node) => check(node.members),
    };
  },
};

module.exports = {
  meta: { name: 'foodrank' },
  rules: {
    'multiline-doc-comment': multilineDocComment,
    'padded-members': paddedMembers,
  },
};
