// check-password.js
// Run with: node check-password.js
//
// Tests whether a password you remember matches a bcrypt hash stored in the
// database. This does NOT decode the hash — it re-hashes your candidate
// password and compares, which is the only way bcrypt can be checked.

import bcrypt from "bcryptjs";

// 1. Paste the password you want to test:
const candidatePassword = "Moses2005.,";

// 2. Paste the hash from the users.password_hash column in Supabase
//    (Table Editor → users → find the row → copy the password_hash value).
//    It should look like: $2a$12$abcdefghijklmnopqrstuv...
const storedHash = "$2a$12$NrlRGApv7FSFN2OIS5/Kq.GUPt5lUGQIx6bePRD8QJ0UHxmS8h3ym";

bcrypt.compare(candidatePassword, storedHash).then((matches) => {
  console.log(matches ? "✅ MATCH — this is the correct password" : "❌ NO MATCH");
});
