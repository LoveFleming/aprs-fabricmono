# 🚀 Release & Fail-Fast Rules

## Errors must be caught at:

| Stage | Method |
|-------|--------|
| `startup` | Schema validation |
| `pre-prod` | Smoke test |
| `canary` | Initial traffic |

## Must support:

- Blue/green deployment
- Canary release
- Auto rollback

## ⚡ Principle

> **Fail First, never fail in full production.**
