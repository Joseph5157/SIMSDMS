// Institution branding — set APP_SHORT_NAME / INSTITUTION_NAME in the
// environment when cloning this app for a new department. Read at process
// start (no rebuild needed, unlike the client's Vite-baked equivalent — see
// client/src/utils/branding.js, which these mirror).
const APP_SHORT_NAME = process.env.APP_SHORT_NAME || 'SIMS DMS';
const INSTITUTION_NAME = process.env.INSTITUTION_NAME || 'SIMS College of Pharmacy';

module.exports = { APP_SHORT_NAME, INSTITUTION_NAME };
