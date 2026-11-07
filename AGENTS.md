# Blank-line spacing

Keep at most one consecutive blank line in code files, including tests and scripts. Lines containing only spaces or tabs count as blank. This rule does not apply to documentation, prose, or skill instruction files.

# Remote server work is guided only

For remote VPS/backend server work, provide instructions for the user to execute
and interpret the results they share. Do not directly connect to, inspect, modify,
or verify the server. This includes read-only SSH commands, SCP/transfers,
database backup or restore, deployments, service/configuration changes, and remote
health checks. Streaming a backup to the user's computer is also user-executed.

Give one manageable stage at a time, explain risks and expected results, and wait
for the user's output before dependent steps. Local repository inspection and
authoring scripts/documentation remain allowed. Network permission alone does
not change this guidance-only boundary. Apply this rule to every agent and
subagent, including workflows outside the deployment skill.

# Show diffs after edits

After every task that edits files, provide an explicit way to review the diff.
Use `apply_patch` for text edits when possible so the app can surface changes.
Prefer the app's native diff view when available; otherwise provide a patch link
or a concise inline diff. Include newly created files and keep the displayed diff
scoped to the task's edits. Never claim a diff button is available without evidence.

# Task delegation

Whenever the commit-and-pr skill applies, delegate the commit, push, and pull-request
work to a subagent using `gpt-6-luna` with `medium` reasoning effort. The subagent
must read and follow `.agents/skills/commit-and-pr/SKILL.md`.

Keep implementation and validation with the parent agent. Once the changes are
ready, pass the intended files, change summary, validation results, target branch,
and the user's authorized commit, push, and PR scope to the subagent. Use a focused
handoff rather than a full-history fork so the requested model and reasoning
settings can be selected explicitly.

The subagent owns the authorized commit, push, and PR work and returns the commit hash,
push result, PR URL, or blockers. If the requested model is unavailable, report the blocker
rather than silently assigning this work to another model.

# Independent PR reviews

Whenever the user requests a PR review:

- Spawn a new reviewer subagent with `fork_turns="none"`.
- Use `gpt-6-astra` with `medium` reasoning effort unless the user specifies
  another model. If the requested model is unavailable, report the blocker
  rather than silently substituting another model.
- Never reuse an implementation, commit, or previous review agent.
- Pass only the repository location, PR number or URL, base/head commit SHAs,
  and any explicit review constraints from the user.
- Do not pass conversation history, implementation explanations, previous
  findings, or the parent agent's conclusions.
- Review the committed PR diff in an isolated checkout at the head SHA,
  excluding uncommitted workspace changes.
- Read applicable repository instructions and inspect surrounding code and
  tests independently.
- Form initial findings before reading the PR description or existing review
  comments, to reduce anchoring.
- Report actionable defects with severity, file/line references, a concrete
  failure scenario, and supporting evidence.
- Do not invent findings to satisfy a quota. Explicitly report when no
  actionable defects are found.
- Keep the review read-only. Return findings to the parent; do not post to
  GitHub unless the user explicitly requests publication.
- Present the review scope, reviewed head SHA, findings, and verification
  limits to the user.
