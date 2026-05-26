# Security Specification - AI Fitness App

## Data Invariants
1. A UserProfile MUST have the matching `userId` and `email` of the authenticated user.
2. Workouts and Sessions MUST be contained within the authenticated user's `users/{userId}` subcollection hierarchy.
3. Every Workout/Session MUST reference the `userId` in its data, matching the path and the authenticated user.
4. Timestamps (`createdAt`, `updatedAt`, `completedAt`) MUST be strictly validated via `request.time`.
5. String fields MUST have size limits (e.g., 2000 chars for notes, 128 chars for titles).
6. Lists MUST have size limits.
7. Terminal states (e.g., a completed session) MUST be immutable for standard users (TBD if applicable).

## The "Dirty Dozen" Payloads (Denial Tests)

1. **Identity Spoofing (Profile)**: Attempt to create `users/victim_id` while authenticated as `attacker_id`.
2. **Identity Spoofing (Workout)**: Attempt to create `users/attacker_id/workouts/w1` with `userId: "victim_id"` in the payload.
3. **Ghost Field (Malicious Verif)**: Attempt to update `UserProfile` with `isVerified: true` (a field not in schema).
4. **ID Poisoning**: Attempt to create a document with a 1MB junk string as the ID.
5. **Denial of Wallet (Large String)**: Attempt to set a `notes` field to a 1MB string.
6. **Denial of Wallet (Huge List)**: Attempt to set `days` or `logs` to a list with 10,000 items.
7. **Timestamp Spoofing**: Attempt to set `createdAt` to a date in 2030 (not `request.time`).
8. **Invalid Enum**: Attempt to set `gender` to "robot".
9. **Relational Bypass**: Attempt to create a `Session` for a `workoutId` that does not exist (orphaned record).
10. **Shadow Update**: Attempt to update only the `reps` in a log while the user doesn't own the session. (Wait, they own the session, so this is about field-level restriction if tiers existed).
11. **Type Poisoning**: Attempt to set `age` to "30" (string) instead of 30 (int).
12. **PII Blanket Read**: Attempt to list all documents in `/users` collection.

## Test Runner (firestore.rules.test.ts)
(I will generate the rules first, then the tests).
