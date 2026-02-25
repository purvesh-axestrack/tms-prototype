---
name: skill-creator
description: Creates and validates Claude Code skills following Anthropic's official best practices. Use when user says "create a skill", "build a skill", "new skill", "make a skill for", "skill for X", or asks to set up a reusable workflow as a skill. Also use when user says "review skill", "validate skill", or "improve skill". Do NOT use when user asks to USE or INVOKE an existing skill by name (e.g. "use db-engineering", "run the deployment skill").
metadata:
  author: TMS Prototype
  version: 1.0.0
---

# Skill Creator

Interactive guide for creating well-structured Claude Code skills. Walks through use case definition, frontmatter, instructions, and validation.

## Instructions

### Step 1: Define the Skill

Before writing anything, establish:

1. **What does the skill do?** One sentence. If it takes more, scope is too broad — split it.
2. **What are 2-3 concrete use cases?** Specific tasks a user would trigger this for.
3. **What trigger phrases would a user say?** List 4-6 natural language phrases.
4. **What tools does it need?** Bash, Read, Grep, WebFetch, MCP tools, scripts?
5. **What category?** Document/Asset Creation, Workflow Automation, or MCP Enhancement.

Ask the user these questions if not already clear from context.

### Step 2: Create the Directory

```
.claude/skills/{skill-name}/
├── SKILL.md
└── references/        # only if needed
```

Rules (non-negotiable):
- Folder name: **kebab-case only**. No spaces, underscores, capitals.
- File: exactly `SKILL.md` (case-sensitive).
- No `README.md` inside the skill folder.
- No "claude" or "anthropic" in the name.

### Step 3: Write the Frontmatter

CRITICAL: The description determines whether Claude loads the skill. Get this right.

```yaml
---
name: {kebab-case-name}
description: {What it does}. Use when user says "{phrase 1}", "{phrase 2}", "{phrase 3}", or asks to "{phrase 4}".
---
```

Consult `references/best-practices.md` for the description field rules. Key points:
- MUST include BOTH what it does AND trigger phrases
- Under 1024 characters
- No XML angle brackets
- Specific, not vague

Add optional fields only when needed:
- `allowed-tools`: if the skill should be scoped to specific tools
- `metadata`: author, version, mcp-server if applicable
- `license`: if open-source
- `compatibility`: if environment requirements exist

### Step 4: Write the Body

Follow this structure:

```markdown
# Skill Name

## Instructions

### Step 1: [Action]
Specific, actionable instruction.

### Step 2: [Action]
(continue)

## Examples

Example 1: [scenario]
User says: "..."
Actions:
1. ...
Result: ...

## Troubleshooting

Error: [message]
Cause: [why]
Solution: [fix]
```

Rules:
- Keep SKILL.md under 5,000 words
- Move detailed reference material to `references/` subdirectory
- Put critical instructions at the top
- Use numbered steps, not prose
- Be specific ("Run `python scripts/validate.py`") not vague ("validate the data")
- Include 2-3 examples with concrete user phrases and expected actions
- Include troubleshooting for likely failure modes
- Reference bundled files explicitly: `consult references/api-guide.md`

### Step 5: Validate

Run through this checklist before finishing:

1. Folder named in kebab-case? Name matches `name` field?
2. `SKILL.md` file exists with exact casing?
3. YAML frontmatter wrapped in `---` delimiters?
4. `name`: kebab-case, no spaces, no capitals?
5. `description`: includes WHAT + WHEN + trigger phrases?
6. No XML tags (`<` `>`) in frontmatter?
7. Instructions are specific and actionable (not vague)?
8. Examples section with 2-3 scenarios?
9. Troubleshooting section present?
10. SKILL.md under 5,000 words? Detail moved to `references/`?
11. No `README.md` in the skill folder?

If any check fails, fix it before presenting to the user.

### Step 6: Test Guidance

Tell the user:
- Skills load at session start. They must start a new Claude Code session to test.
- Type `/` to check if the skill appears in autocomplete.
- Test with obvious trigger phrases AND paraphrased versions.
- Test that it does NOT trigger on unrelated queries.
- Ask Claude: "When would you use the {skill-name} skill?" — Claude will quote the description back.

## Examples

Example 1: Creating a code review skill
User says: "Create a skill for code reviews"
Actions:
1. Ask: What kind of code reviews? (PR reviews, security audits, style checks?)
2. Ask: What trigger phrases? ("review this PR", "check this code", etc.)
3. Create `.claude/skills/code-review/SKILL.md`
4. Write frontmatter with trigger phrases
5. Write step-by-step instructions for the review workflow
6. Add examples and troubleshooting
7. Validate against checklist
Result: Complete skill at `.claude/skills/code-review/SKILL.md`

Example 2: Reviewing an existing skill
User says: "Review my db-engineering skill"
Actions:
1. Read the skill's `SKILL.md`
2. Check against validation checklist (Step 5)
3. Check description for trigger phrases
4. Check body for structure (steps, examples, troubleshooting)
5. Check size (under 5,000 words?)
6. Report issues and suggest fixes
Result: List of issues with specific fixes

Example 3: User has a workflow they repeat
User says: "I keep doing the same deployment steps, can you make a skill for it?"
Actions:
1. Ask user to walk through the workflow once
2. Identify the steps, tools used, and decision points
3. Package into a skill with clear step ordering
4. Add error handling for each step that could fail
5. Validate and present
Result: Deployment skill with steps, rollback instructions, and troubleshooting

## Troubleshooting

Error: Skill doesn't appear after creation
Cause: Skills load at session start, not mid-session
Solution: User must start a new Claude Code session from the project root

Error: Skill triggers on wrong queries
Cause: Description is too broad
Solution: Add negative triggers ("Do NOT use for...") and be more specific about trigger phrases

Error: "Invalid frontmatter" on upload
Cause: Missing `---` delimiters, unclosed quotes, or XML tags
Solution: Verify YAML syntax — must have opening and closing `---`, all strings properly quoted

Error: Skill loads but instructions aren't followed
Cause: Instructions too verbose or buried
Solution: Put critical instructions at top, use numbered lists, move detail to `references/`
