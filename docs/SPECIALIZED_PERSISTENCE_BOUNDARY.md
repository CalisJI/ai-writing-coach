# BECOMING Specialized Persistence Boundary — v1.3.3

Batch 5 removes persistence ownership from the specialized learning services while preserving the live SQLite runtime.

Repository-bound services:
- Learning Memory / Learner Profile
- Practice Outcomes
- Vocabulary / Active Recall
- Reading Studio
- Linguistic annotation cache stored in essay module data

Runtime selection remains `SQLiteSpecializedLearningRepository`. `PostgresSpecializedLearningRepository` is implemented and verified but is not selected by the application. No billing or PostgreSQL runtime cutover is enabled.

The shadow verifier compares specialized repository reads for every discovered user/language SQLite source against PostgreSQL after the idempotent shadow refresh.
