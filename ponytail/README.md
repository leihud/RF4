# Ponytail Plugin for Qoder

Lazy senior dev mode. Forces the simplest, shortest solution that actually works.

## Source

- **Repository**: https://github.com/DietrichGebert/ponytail
- **Author**: Dietrich Gebert
- **License**: MIT

## Included Skills

| Skill | Description |
|-------|-------------|
| `ponytail` | Main mode - forces the laziest solution that works (lite/full/ultra) |
| `ponytail-review` | Code review focused on over-engineering |
| `ponytail-audit` | Whole-repo audit for over-engineering |
| `ponytail-debt` | Harvest `ponytail:` comments into a debt ledger |
| `ponytail-gain` | Show benchmark impact scoreboard |
| `ponytail-help` | Quick reference for all commands |

## Usage

Invoke via `/ponytail [lite|full|ultra|off]` or any of the skill commands above.

## Omitted Files

- `hooks/qoder-hooks.json` - Requires Node.js lifecycle hooks, not included in this static plugin
- `scripts/` - Build and validation scripts not needed for runtime
- `benchmarks/` - Benchmark data not needed for runtime
