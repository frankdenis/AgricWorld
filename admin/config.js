/* AgricWorld admin credentials.
   Only a salted PBKDF2-SHA256 hash is stored here — the password itself is never in the repo.
   To change it: open /admin/ → "Generate new passphrase hash" (bottom of the sign-in card),
   then paste the values below and commit. */
window.AW_ADMIN = {
  email: 'frankdenis607@gmail.com',
  salt: '21e9bb8f9d0113cb6f0443b4de951230',
  hash: '260d4fabbfc5e82b4697e17c39d19618aee80f41d5c9b4927ee8e26dda7adf80',
  iterations: 120000,
  sessionHours: 8
};
