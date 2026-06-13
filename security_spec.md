# Security Specification: Storyboard Firestore Collection

## 1. Data Invariants
1. **Ownership Invariant**: A storyboard document can only be read, created, updated, or deleted by its authenticated creator.
2. **Identity Integrity**: The user cannot spoof the `userId` field to match another user's UID. It must strictly match `request.auth.uid`.
3. **Data Type and Size Saturation Limits**: Storyboard titles, concepts, and formats must be length-limited strings to prevent DoS attacks.
4. **Scenes Schema Integrity**: The `scenes` lists must be smaller than 100 entries, and each entry must be a map structure containing narrative parameters.
5. **Verified Users Constraint**: All write operations require a Google Authenticated user with a verified email address (`request.auth.token.email_verified == true`).

---

## 2. The "Dirty Dozen" Payloads (Adversarial Tests)

1. **The Spoofed Owner**: A storyboard payload specifying a `userId` belonging to User-B, written by User-A.
2. **Unauthenticated Write**: Creating a storyboard without any `request.auth` object.
3. **Unverified Email Write**: Signing up with a spoofed or unverified email token (`email_verified = false`) and attempting a write.
4. **Junk Document ID Poisoning**: Attempting to create a storyboard using a 2KB junk character string `$$%&$^%&*$%^` as the document ID.
5. **No-Size String Exhaustion (Title)**: A payload where the `title` is a 5MB blank string designed to bloat Firestore storage.
6. **No-Size String Exhaustion (Concept)**: A payload where the `concept` exceeds 10,000 characters.
7. **Type Coercion (Concept)**: An upload where the `concept` field is set to a boolean `true` instead of a string to cause system deserialization errors.
8. **Missing Required Fields**: A payload containing only the `title` and `timestamp` but missing `scenes` and `userId`.
9. **Unbounded List Overflow**: A payload containing a list of 1,000 blank scene blocks, exceeding the 100 scene limit.
10. **Shadow Field Injection**: Creating a storyboard with helper attributes like `isAdmin: true` or `featured: true` which are not part of the schema.
11. **Malicious Sibling Read (Scraping)**: One user attempting to execute a list query to retrieve storyboards belonging to all users.
12. **Malicious Sibling Update**: User-B attempting to change the visual `style` or scenes of User-A's storyboard.

---

## 3. Adversarial Test Runner Specification (Logical Assertions)

- **Scenario 1 (CREATE Storyboard)**:
  - Input: Auth(uid="user_123", email_verified=true) + Payload(userId="user_123", title="Val", ...)
  - Result: ALLOW
- **Scenario 2 (CREATE Storyboard Spoofed)**:
  - Input: Auth(uid="user_123", email_verified=true) + Payload(userId="attacker_xyz", title="Val", ...)
  - Result: DENY
- **Scenario 3 (LIST Storyboards)**:
  - Target: List query for `/storyboards` matching `resource.data.userId == "user_123"`
  - Result: ALLOW
- **Scenario 4 (LIST Storyboards - Scraper)**:
  - Target: List query for `/storyboards` with no user filters or matching another user's UID
  - Result: DENY
