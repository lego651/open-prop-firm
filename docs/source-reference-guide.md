# Source / Citation Reference Guide

This guide covers the `sources` frontmatter array used in every content page under `data/`.

## Schema

Each entry in the `sources` array is a `SourceEntry` (defined in `src/types/content.ts`):

```yaml
sources:
  - url: "https://example.com/official-page"
    label: "Example Firm — Official Rules"
    description: "Primary rule set for the 50k challenge"
    isOfficial: true
  - url: "https://blog.example.com/review"
    label: "Third-Party Review of Example Firm"
```

### Fields

| Field         | Type    | Required | Description                                    |
|---------------|---------|----------|------------------------------------------------|
| `url`         | string  | yes      | Full URL to the source                         |
| `label`       | string  | yes      | Short display name (max ~40 characters)        |
| `description` | string  | no       | One-sentence summary of what the source covers |
| `isOfficial`  | boolean | no       | `true` if this is an official firm source      |

## Authoring Rules

1. **Every page must have at least one source.** The build will fail if `sources` is missing or not an array.
2. **Official sources first.** List entries with `isOfficial: true` before community or third-party sources.
3. **Inline citation syntax.** A future sprint will add inline citation markers (e.g., `[^1]`). For now, the `sources` array in frontmatter is the only citation mechanism.
4. **Keep URLs stable.** Use canonical / permalink URLs when available. Avoid link shorteners.

## Source Labeling Conventions

- **Max ~40 characters** for `label` so it renders cleanly in the source list UI.
- Use the pattern: `Firm Name — Page Title` for official sources.
- For third-party sources, use: `Author or Site — Article Title` (truncated if needed).
- `description` should be a single sentence, no period at the end.

## Examples

### Minimal (backwards-compatible)

```yaml
sources:
  - url: "https://fundednext.com/rules"
    label: "FundedNext — Trading Rules"
```

### Full

```yaml
sources:
  - url: "https://fundednext.com/rules"
    label: "FundedNext — Trading Rules"
    description: "Official rule page for all challenge types"
    isOfficial: true
  - url: "https://trustpilot.com/review/fundednext.com"
    label: "Trustpilot — FundedNext Reviews"
    description: "Aggregated user reviews and ratings"
```
