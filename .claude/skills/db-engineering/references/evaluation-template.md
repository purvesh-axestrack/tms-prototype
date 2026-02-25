# Evaluation Report Template

Output this format when evaluating any database:

```
## Database Evaluation: [name]

### Scores
| Criteria | Score | Issues |
|---|---|---|
| NOT NULL discipline | ? | [count] unnecessary nullables |
| CHECK constraints | ? | [count] unprotected enums |
| FK ON DELETE | ? | [count]/[total] FKs missing ON DELETE |
| Indexing | ? | [count] FK columns without index |
| UNIQUE constraints | ? | [count] missing natural key constraints |
| Timestamps | ? | updated_at trigger: yes/no |
| PK consistency | ? | [types used] |
| Naming | ? | [violations found] |
| Security | ? | [issues] |
| Lookup tables | ? | OTLT: yes/no |
| Denormalization | ? | [redundancies found] |
| Domain coverage | ? | [missing concepts for the domain] |
| Domain structure | ? | [normalization issues] |

### Critical Issues (must fix)
1. ...

### Major Issues (should fix)
1. ...

### Minor Issues (nice to fix)
1. ...
```

## Scoring Discipline

- **Domain coverage** and **Domain structure** are ALWAYS scored separately. Never combine into one "domain modeling" score.
- Domain coverage = are the right real-world concepts modeled? (tables exist)
- Domain structure = are they normalized correctly? (tables are well-designed)
- Apply identical criteria definitions when comparing two databases. Never shift definitions mid-evaluation.
- Never grade on a curve or favor your own work.
