---
name: pre-commit-check
description: "Optional pre-commit validation checklist for linting, formatting, building, testing, and staging review."
version: "2.0.0"
author: "SublinkPro Team"
user-invocable: true
mandatory: false
enforcement-level: "advisory"
---

# Pre-Commit Check Skill

**Optional validation checklist**

This skill provides a recommended validation workflow before committing. It is
not a repository-enforced gate.

## Recommended Practice

1. Run the applicable validation commands before committing when the local environment supports them.
2. Fix validation failures before merging or releasing.
3. Document what was validated in the commit or PR description.
4. Review staged files before committing.
5. Prefer user verification for broad or risky changes.

## When to Use This Skill

Recommended before:
- Any `git add` command
- Any `git commit` command
- Any `gh pr create` or PR update command
- Declaring work "complete", "done", or "finished"
- User requests a validation pass

This skill is advisory. If local tooling is unavailable, document what could not
be run and rely on CI for the remaining checks.

## Skill Execution Protocol

When this skill is invoked, use this sequence:

### Step 1: Identify Changed Files

```bash
git status --short
git diff --name-only
git diff --cached --name-only
```

Categorize changes:
- [ ] Backend files (*.go)
- [ ] Frontend files (webs/*)
- [ ] Documentation files (*.md)
- [ ] Configuration files (config.yaml, .env.example, etc.)
- [ ] Mixed (multiple categories)

### Step 2: Execute Backend Validation (if .go files changed)

#### 2.1 Format Check
```bash
gofmt -l $(find . -name "*.go" -not -path "./vendor/*" -not -path "./webs/*" -not -path "./.git/*")
```

**If output is not empty**:
```bash
gofmt -w $(find . -name "*.go" -not -path "./vendor/*" -not -path "./webs/*" -not -path "./.git/*")
```

**Verify**:
```bash
gofmt -l $(find . -name "*.go" -not -path "./vendor/*" -not -path "./webs/*" -not -path "./.git/*")
```

Recommended: this should return empty output after formatting.

#### 2.2 Lint Check
```bash
golangci-lint run
```

Recommended: this should exit with status 0.

If it fails, read the errors, fix them, and re-run when possible.

#### 2.3 Test Execution
```bash
go test ./...
```

Recommended: this should exit with status 0 (all tests pass).

If it fails, read the test output, fix the failing tests or code, and re-run when possible.

### Step 3: Execute Frontend Validation (if webs/* files changed)

#### 3.1 Lint Check
```bash
cd webs && yarn run lint
```

Recommended: this should exit with status 0.

**If fails**: Try auto-fix first:
```bash
cd webs && yarn run lint:fix
cd webs && yarn run prettier
```

Then re-run `yarn run lint` when possible.

#### 3.2 Build Check (if applicable)

**Run build if changes affect**:
- Routing configuration (`src/routes/*`)
- Asset paths or imports (`src/assets/*`, `public/*`)
- Base path behavior (`SUBLINK_WEB_BASE_PATH`)
- Build configuration (`vite.config.js`, `package.json`)
- Major UI components (`src/views/*`, `src/layout/*`)

```bash
cd webs && yarn run build
```

Recommended: this should complete successfully.

If it fails, read the build error, fix it, and re-run when possible.

### Step 4: Cross-Layer Sync Verification (if multi-layer change)

**Trigger condition**: Changes affect both backend AND frontend, OR code AND documentation.

**Verification checklist**:
- [ ] Backend API endpoint changed → Frontend API client updated (`webs/src/api/*`)
- [ ] Backend response structure changed → Frontend types/interfaces updated
- [ ] Frontend behavior changed → Backend supports new flow
- [ ] Configuration option added/changed → Code + docs + examples updated

**If complex cross-layer change**: Invoke `.agents/skills/cross-layer-sync/SKILL.md` for detailed verification.

### Step 5: Documentation Sync Verification (if docs should be updated)

**Trigger condition**: Changes affect user-visible behavior, APIs, configuration, or deployment.

**Verification checklist**:
- [ ] User-facing feature changed → `README.md` + `README.zh-CN.md` updated
- [ ] API endpoint changed → `skill-sublinkpro/reference/api.md` updated
- [ ] Configuration changed → `docs/configuration.md` + `.zh-CN.md` updated
- [ ] Deployment changed → `docs/installation.md` + `.zh-CN.md` + `skill-sublinkpro/reference/deploy.md` updated
- [ ] Both language versions updated (bilingual requirement)
- [ ] Links verified (no broken references)

**If complex doc changes**: Invoke `.agents/skills/doc-sync-check/SKILL.md` for detailed verification.

### Step 6: Test Coverage Verification (if key logic changed)

**Trigger condition**: Changes affect business logic, APIs, permissions, migrations, scheduled tasks, or protocol parsing.

**Verification checklist**:
- [ ] New business logic → Tests added
- [ ] Changed behavior → Tests updated
- [ ] Bug fix → Regression test added
- [ ] API handler changed → Handler tests added/updated
- [ ] Permission check changed → Permission tests added/updated

If tests are missing for key logic, add them when practical.

### Step 7: Git Staging Verification

```bash
git status
git diff --cached --stat
git diff --cached --name-only
```

**Verification checklist**:
- [ ] Only intended files staged
- [ ] No `.env` files staged
- [ ] No credential files staged
- [ ] No `db/` directory staged
- [ ] No `logs/` directory staged
- [ ] No `cache/` directory staged
- [ ] No `out/` directory staged
- [ ] No large binary files unintentionally staged
- [ ] No AI agent temporary files staged:
  - No `*_SUMMARY.md` files (e.g., `PRE_COMMIT_ENFORCEMENT_SUMMARY.md`)
  - No `*_REPORT.md` files
  - No `QUICK_REFERENCE.md` files in skill directories
  - No `.claude/projects/`, `.claude/sessions/`, `.claude/plans/` files
  - No agent execution logs or temporary outputs

**If unintended files staged**:
```bash
git reset HEAD <file>  # Unstage unintended files
```

Avoid committing AI agent temporary files:
- These are execution artifacts, not project documentation
- They pollute the repository
- They are regenerated on each execution
- Add them to `.gitignore` if they keep appearing

### Step 8: Commit Message Preparation

Prepare a semantic commit message following this format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`

**Scope**: Component area (e.g., `airports`, `auth`, `theme`, `i18n`)

**Subject**: ≤72 characters, imperative mood, no period

**Body**: What changed, why it changed, how it was validated

**Footer**: Issue references (`Closes #123`, `Fixes #456`)

### Step 9: Report to User

After all validations pass, report results in this format:

```markdown
## ✅ Pre-Commit Validation Complete

### Backend Validation
- ✅ Go format: All files formatted
- ✅ golangci-lint: 0 issues
- ✅ Go tests: All passed

### Frontend Validation
- ✅ ESLint: No errors
- ✅ Build: Successful

### Cross-Layer Sync
- ✅ Backend API changes synchronized with frontend
- ✅ skill-sublinkpro/reference/api.md updated

### Documentation Sync
- ✅ docs/configuration.md + .zh-CN.md updated
- ✅ Links verified

### Test Coverage
- ✅ Tests added for new business logic
- ✅ All tests passing

### Git Staging
- ✅ Only intended files staged
- ✅ No sensitive files included

---

**Ready to commit.** Suggested commit message:

```
<prepared commit message>
```

**Next steps:**
1. Review staged changes: `git diff --cached`
2. Perform manual testing if needed
3. Commit when satisfied: `git commit -m "<message>"`
```

## Validation Failure Handling

If ANY validation fails:

1. **Record** the failed command and error.
2. **Fix** the failure when practical.
3. **Re-run** the failed validation when possible.
4. **Document** any checks that could not be run locally.
5. **Use CI** for checks that depend on unavailable local tooling.

**Example failure response**:

```markdown
## ❌ Pre-Commit Validation Failed

### Backend Validation
- ❌ golangci-lint: 3 errors found
  - api/share.go:45: unused variable 'temp'
  - routers/share.go:23: missing error check
  - services/share.go:67: ineffective assignment

**Suggested next step:** fix the lint errors and re-run validation.
```

Then fix the issues and re-run validation when possible.

## Exit Criteria

✅ **Recommended commit-ready state**:
- All applicable validation commands pass
- Cross-layer sync verified (if applicable)
- Documentation updated (if applicable)
- Tests added/updated (if applicable)
- Only intended files staged
- Commit message prepared
- **Ready to present to user for final verification**

⚠️ **If proceeding with incomplete local validation, document**:
- Which commands failed or could not run locally
- Whether CI is expected to run the missing checks
- Any known risks or follow-up needed

## Frequently Asked Questions

### "The user said to skip validation, should I?"

Validation is recommended, but not repository-enforced. If the maintainer
chooses to rely on CI, document which local checks were skipped or unavailable.
When possible, still run the fastest relevant local checks first.

### "This is a tiny change, can I skip validation?"

Small changes can still benefit from validation:
- Tiny changes can break tests
- Tiny changes can introduce lint errors
- Tiny changes can break builds
- CI can catch issues when local tooling is unavailable

Run validation when practical.

### "Validation failed but the user is insistent"

Document the failed validation and the reason for proceeding. Prefer fixing the
failure first, especially for release or shared-branch work. If the failure is
caused by missing local tooling, note that CI should perform the remaining
checks.

### "I only changed documentation, do I need full validation?"

**Partial validation.** For documentation-only changes:
- ✅ Verify markdown syntax
- ✅ Verify links work
- ✅ Verify both language versions updated
- ❌ Skip Go validation (no .go files changed)
- ❌ Skip frontend validation (no webs/* files changed)

Run applicable documentation checks when practical.

## Quick Reference: Command Matrix

| Changed Files | Commands to Run |
|---|---|
| Any .go files | `gofmt -w`, `gofmt -l`, `golangci-lint run`, `go test ./...` |
| Any webs/* files | `cd webs && yarn run lint`, conditionally `yarn run build` |
| Both backend + frontend | All of the above |
| Documentation only | Verify markdown, links, bilingual updates |
| Configuration files | Verify code + docs + examples updated |

## Related Skills

- `.agents/skills/post-dev-workflow/SKILL.md` - Full post-development workflow orchestration
- `.agents/skills/cross-layer-sync/SKILL.md` - Detailed cross-layer sync guide
- `.agents/skills/doc-sync-check/SKILL.md` - Detailed documentation sync guide
- `.agents/skills/theme-check/SKILL.md` - Theme-specific validation
- `.agents/skills/security-review/SKILL.md` - Security-specific validation
- `.agents/skills/performance-check/SKILL.md` - Performance-specific validation

## Summary

This skill is advisory.

Recommended:
1. Run applicable validations
2. Fix failures when practical
3. Document what was validated or skipped
4. Stage only intended changes
5. Present broad changes to the user for final verification
