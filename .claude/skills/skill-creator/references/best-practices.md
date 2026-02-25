# Skill Best Practices

Source: The Complete Guide to Building Skills for Claude (Anthropic, 2026)

## File Structure

```
skill-name/
├── SKILL.md              # Required. Main instructions with YAML frontmatter.
├── scripts/              # Optional. Executable code (Python, Bash, etc.)
├── references/           # Optional. Detailed docs loaded on demand.
└── assets/               # Optional. Templates, fonts, icons used in output.
```

## Critical Rules

- `SKILL.md` must be exactly `SKILL.md` (case-sensitive). No `skill.md`, `SKILL.MD`, etc.
- Folder name: kebab-case only. No spaces, underscores, or capitals.
- No `README.md` inside the skill folder. All docs go in `SKILL.md` or `references/`.
- No XML angle brackets (`<` or `>`) anywhere in frontmatter.
- No "claude" or "anthropic" in the skill name (reserved).

## YAML Frontmatter

### Required Fields

```yaml
---
name: skill-name-in-kebab-case
description: What it does and when to use it. Include trigger phrases.
---
```

### Optional Fields

```yaml
license: MIT
allowed-tools: "Bash(python:*) Bash(npm:*) WebFetch"
compatibility: "Requires Node.js 18+, PostgreSQL"
metadata:
  author: Your Name
  version: 1.0.0
  mcp-server: server-name
  category: productivity
  tags: [automation, database]
```

### Field Rules

- `name`: kebab-case, no spaces, no capitals, must match folder name
- `description`: MUST include BOTH what it does AND when to use it (trigger conditions). Under 1024 characters. Include specific phrases users would say.
- `allowed-tools`: scope what tools the skill can use
- `metadata`: any custom key-value pairs (author, version, mcp-server suggested)

## Description Field — Most Important Part

The description is how Claude decides whether to load the skill. Structure:

`[What it does] + [When to use it] + [Key capabilities]`

### Good Descriptions

```yaml
# Specific, includes triggers
description: Analyzes Figma design files and generates developer handoff documentation. Use when user uploads .fig files, asks for "design specs", "component documentation", or "design-to-code handoff".

# Includes action phrases
description: Manages Linear project workflows including sprint planning, task creation, and status tracking. Use when user mentions "sprint", "Linear tasks", "project planning", or asks to "create tickets".

# Clear value proposition
description: End-to-end customer onboarding workflow for PayFlow. Handles account creation, payment setup, and subscription management. Use when user says "onboard new customer", "set up subscription", or "create PayFlow account".
```

### Bad Descriptions

```yaml
# Too vague
description: Helps with projects.

# Missing triggers
description: Creates sophisticated multi-page documentation systems.

# Too technical, no user triggers
description: Implements the Project entity model with hierarchical relationships.
```

## Progressive Disclosure (Three Levels)

1. **Level 1 — YAML frontmatter**: Always loaded. Just enough for Claude to know when to use the skill.
2. **Level 2 — SKILL.md body**: Loaded when Claude thinks the skill is relevant. Full instructions.
3. **Level 3 — Linked files**: `references/`, `scripts/`, `assets/`. Claude reads only when needed.

Keep SKILL.md under 5,000 words. Move detailed docs to `references/`.

## Writing Effective Instructions

### Do:
- Be specific and actionable
- Use numbered steps
- Reference bundled resources clearly: `consult references/api-patterns.md`
- Include error handling
- Include examples
- Use `## Important` or `## Critical` headers for key instructions
- Put critical instructions at the top

### Don't:
- Be vague ("validate the data before proceeding")
- Bury critical instructions
- Use ambiguous language
- Put everything in SKILL.md (use references/ for detail)

## Recommended SKILL.md Structure

```markdown
---
name: your-skill
description: [...]
---

# Your Skill Name

## Instructions

### Step 1: [First Major Step]
Clear explanation of what happens.

### Step 2: [Next Step]
(continue as needed)

## Examples

Example 1: [common scenario]
User says: "..."
Actions:
1. ...
2. ...
Result: ...

## Troubleshooting

Error: [Common error message]
Cause: [Why it happens]
Solution: [How to fix]
```

## Skill Categories

1. **Document & Asset Creation**: Creating consistent output (docs, code, designs)
2. **Workflow Automation**: Multi-step processes with consistent methodology
3. **MCP Enhancement**: Workflow guidance on top of MCP tool access

## Testing Checklist

Before considering a skill done:

- [ ] Folder named in kebab-case
- [ ] `SKILL.md` exists (exact spelling)
- [ ] YAML frontmatter has `---` delimiters
- [ ] `name` field: kebab-case, no spaces, no capitals
- [ ] `description` includes WHAT and WHEN with trigger phrases
- [ ] No XML tags anywhere
- [ ] Instructions are clear and actionable
- [ ] Error handling included
- [ ] Examples provided
- [ ] References clearly linked
- [ ] SKILL.md under 5,000 words
- [ ] Tested triggering on obvious tasks
- [ ] Tested triggering on paraphrased requests
- [ ] Verified doesn't trigger on unrelated topics

## Common Mistakes

| Mistake | Fix |
|---|---|
| Vague description | Add specific trigger phrases |
| Everything in SKILL.md | Move detail to `references/` |
| No examples | Add 2-3 concrete scenarios |
| No error handling | Add troubleshooting section |
| Over-triggering | Add negative triggers ("Do NOT use for...") |
| Under-triggering | Add more keyword variations to description |
| Too long | Progressive disclosure — use references/ |
| Missing `---` delimiters | Frontmatter MUST be wrapped in `---` |
