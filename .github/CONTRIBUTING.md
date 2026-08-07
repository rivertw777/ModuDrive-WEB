# Git Convention

## 1. Issue

### Title

```
[type] short description
```

Types: bug | feature | refactor | docs | chore

Examples:
- `[bug] file list shows files above folders`
- `[feature] add category sidebar filters`
- `[refactor] extract sortEntries helper`

### Rules

- Create an issue before starting any work
- Reference the issue number in the branch name and commit message
- Link the issue in the PR body with `Closes #<issue-number>`

## 2. Branch

```
dev                             # integration branch (default)
feature/<issue-number>-<slug>   # new feature
fix/<issue-number>-<slug>       # bug fix
refactor/<issue-number>-<slug>  # refactoring only
docs/<issue-number>-<slug>      # documentation
chore/<slug>                    # build, deps, config
```

- slug: lowercase kebab-case (e.g. add-category-filters)
- No direct push to `dev`, PR only

## 3. Commit

```
<type>(<scope>): <subject>
```

Types: feat | fix | refactor | chore | docs | style

Scopes:

| scope | target |
|-------|--------|
| `auth` | src/features/auth |
| `drive` | src/features/drive |
| `app` | src/app |
| `ui` | src/components/ui |
| `shared` | src/lib, src/stores, src/utils, src/config, src/types |

- Start with lowercase verb: add, remove, update, fix
- No period at end, under 50 chars
- Add body when the reason for the change is not obvious

## 4. Pull Request

- Title: same format as commit message
- One PR = one purpose
- `feature/* → dev`: Merge commit
