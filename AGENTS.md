# Lotus Agents — Runtime Rules

## EXECUTION MODEL

All work MUST follow:

1. ARRANGE
2. ACT
3. ASSERT

---

## ARRANGE

Agent MUST:

1. Identify:
   - base branch (default: main)
   - issue-id

2. Read:
   - .local/context.md (if exists)
   - .local/issues/<id>.md

3. Documentation:

   IF docs/specs exists:
     read as SOURCE OF TRUTH

   IF docs/meetings exists:
     read LAST 3 files ONLY

4. Meetings interpretation:

   - newest meeting has highest priority
   - older meetings provide context
   - decisions accumulate
   - conflicts resolved in favor of newest

5. Repo understanding:
   - diff vs base branch
   - patterns in code

---

## ACT

Agent MUST:

1. Write progress:
   - .local/issues-notes/<id>.md

2. Apply rules:
   - minimal changes
   - reuse existing logic
   - no duplication

3. Validate continuously:
   - specs consistency
   - diff sanity

---

## ASSERT

Agent MUST:

1. Validate behavior vs specs

2. SPEC UPDATE LOGIC:

IF implementation != spec:

CASE 1:
- spec correct → fix code

CASE 2:
- edge case discovered →
  - update spec
  - add note
  - suggest test

CASE 3:
- expectation changed →
  - update spec (harden definition)

3. NEVER modify:
   - docs/meetings/*

---

## DOCUMENTATION RULES

### meetings/*
- read-only
- never edited

### specs/*
- modifiable ONLY IF:
  - long-term relevance
  - affects behavior
  - reusable knowledge

### DO NOT INCLUDE IN SPECS
- UI text changes
- one-off fixes

---

## QUESTIONS

Agent SHOULD ask when:

- ambiguity exists
- missing constraints
- conflicting meetings

Store in:
- .local/clarifications/<id>.md

---

## FALLBACK DOCS

IF docs/ not available:
- use .local/docs/*

---

## RESTRICTIONS

- DO NOT push commits
- DO NOT auto-create PR
- DO NOT fabricate answers