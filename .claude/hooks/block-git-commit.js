// PreToolUse hook (Bash and PowerShell): refuses every git command that creates a commit.
// Commits in this repo are made by hand by the user, never by Claude Code.
// Exit code 2 blocks the tool call and sends the stderr message back to Claude.

const COMMIT_COMMANDS = [
  "commit",
  "commit-tree",
  "merge",
  "cherry-pick",
  "revert",
  "rebase",
  "am",
  "add",
];

// `git`, then any global options (`-C <path>`, `-c <key=value>`, `--no-pager`...), then a committing subcommand
const pattern = new RegExp(
  String.raw`\bgit(?:\.exe)?(?:\s+(?:-[Cc]\s+\S+|--?[\w-]+(?:=\S+)?))*\s+(` +
    COMMIT_COMMANDS.join("|") +
    String.raw`)(?![\w-])`,
  "i",
);

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let command = "";
  try {
    command = JSON.parse(input).tool_input?.command ?? "";
  } catch {
    process.exit(0);
  }
  const match = command.match(pattern);
  if (match) {
    process.stderr.write(
      `Blocked: "git ${match[1]}" creates a commit. In this repo, commits are made manually by the user. ` +
        "Leave the changes in the working tree (staging is fine) and give the suggested commit message in the summary.\n",
    );
    process.exit(2);
  }
  process.exit(0);
});
