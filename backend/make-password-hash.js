// make-password-hash.js
// Run with: node make-password-hash.js
//
// Generates a bcrypt hash for a new password you choose, so you can paste
// it straight into the users.password_hash column in Supabase.

import bcrypt from "bcryptjs";

// Paste the new password you want to set:
const newPassword = "";

bcrypt.hash(newPassword, 12).then((hash) => {
  console.log("\nNew hash — copy everything between the quotes below:\n");
  console.log(hash);
  console.log("\n");
});
