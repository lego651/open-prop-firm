# OpenPropFirm — /data Directory

This directory contains all prop firm content for OpenPropFirm. It is licensed under [CC-BY-NC-SA-4.0](./LICENSE).

## Using in Obsidian

Clone this repository and open the `/data` folder as your Obsidian vault:

1. Clone: `git clone https://github.com/[owner]/open-prop-firm.git`
2. In Obsidian: Open folder as vault → select `/data`
3. All `[[wikilinks]]` resolve correctly within the vault

## Content Structure

```
firms/
  cfd/               # CFD prop firms
    funded-next/
    funding-pips/
  futures/           # Futures prop firms
    apex-funding/
    lucid-trading/
_templates/          # Templates for community contributions
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) (coming in Sprint 6) for how to submit content updates via GitHub PR.

Every content file requires:

- A `last_verified` timestamp
- At least one `sources` entry with a URL
- Correct YAML frontmatter (see `_templates/` for schema)

## License

Content in this directory is licensed under [CC-BY-NC-SA-4.0](./LICENSE).
Source code in `/src` is licensed under AGPL-3.0 (see root `LICENSE`).
