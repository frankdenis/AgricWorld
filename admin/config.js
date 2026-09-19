/* AgricWorld admin credentials.
   Only a salted PBKDF2-SHA256 hash is stored here — the passphrase itself is never in the repo.
   To change it: open /admin/ → "Generate new passphrase hash" (bottom of the sign-in card),
   then paste the values below and commit. */
window.AW_ADMIN = {
  email: 'admin@agricworld.ng',
  salt: '34947713bf473a5f27d0c8215a0a6def',
  hash: 'e35da62762374855a8d2efed8f8bdd79e05d17033b9075f7cedf7bf3edfcf97b',
  iterations: 120000,
  sessionHours: 8
};
