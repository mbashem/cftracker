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
