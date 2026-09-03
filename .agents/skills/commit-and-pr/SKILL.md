---
name: commit-and-pr
description: CFTracker commit and pull-request conventions. Use whenever Codex creates or amends a commit, or creates or updates a pull request in this repository.
---

# Commits And Pull Requests

## Commits

- Review the status and staged diff before committing, and include only the intended changes.
- Follow the commit-message policy in `CONTRIBUTING.md`; treat it as the source of truth for subject format and type selection.
- Give every Codex-created or Codex-amended commit a concise body describing the meaningful changes, reasons, and relevant verification. A body may use multiple paragraphs when that context is useful; do not impose an artificial short limit, but keep it focused.
- End the commit message, after a blank line, with this trailer:

```text
Co-authored-by: Codex (XX%) <noreply@openai.com>
```

- Replace `XX` with a good-faith whole-number estimate of Codex's contribution to that commit. Estimate the commit itself, not the entire branch or conversation.
- Keep the email address unchanged so GitHub associates the commit with the Codex account.
- Count all requirements, instructions, constraints, design guidance, review feedback, corrections, and manually written or edited code, tests, and documentation as human contribution.
- Count only independent analysis, decisions, implementation, tests, documentation, and verification actually produced by Codex as Codex contribution. Do not estimate authorship from changed-line counts alone or inflate it for formatting, tool execution, staging, or commit mechanics.
- Do not rewrite an existing commit solely to add or alter the trailer unless the user requests an amendment.

## Pull Requests

- Before creating a PR, check whether one already exists for the current branch and update it instead of creating a duplicate.
- For a new PR, use `main` as the base branch and the currently checked-out branch as the head unless the user specifies otherwise.
- Keep the current branch checked out after creating or updating the PR. If a temporary checkout is unavoidable, restore the original branch before finishing.
- Derive the title and description from the complete base-to-head diff. Summarize the behavior, verification, and important operational or review notes rather than describing only the latest commit.
- Include a PR-wide human/Codex contribution estimate in the description. Estimate the complete base-to-head work independently using the same authorship criteria as commits; do not average commit trailers or derive it from changed-line counts. The two whole-number percentages must total 100%.
- Whenever updating an existing PR, recompute the PR-wide contribution estimate from the complete current base-to-head diff, replace the old percentage, and update the squash-message trailer to match. Never carry forward the previous percentage unchanged without reassessing the new work.
- Include a ready-to-use squash commit message in the PR description. Give it one Conventional Commit subject and a focused, sufficiently detailed body that summarizes the net result of the complete base-to-head diff. Concise means relevant and cohesive, not necessarily brief; include the important behavior, rationale, and verification without imposing an artificial length limit. Do not concatenate, enumerate, or lightly rewrite the individual commit messages. End it with the PR-wide `Co-authored-by: Codex (XX%) <noreply@openai.com>` trailer.
- A squash commit message can be set programmatically at merge time. With GitHub CLI use `gh pr merge <number> --squash --subject "..." --body "..."`; with the GitHub API use the pull-request merge endpoint's `merge_method: squash`, `commit_title`, and `commit_message` fields. Supplying the message in the PR description alone does not configure the eventual squash commit.
- Assign the PR to both the requesting human and the repository-configured Codex GitHub identity. Verify that each identity is assignable; if GitHub rejects either one, assign every valid identity and explicitly report the missing assignment without guessing or substituting another account.
