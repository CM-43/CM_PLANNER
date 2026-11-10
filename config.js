/* ==========================================================================
   config.js — the Study Planner's settings

   The one file you may edit to change where the planner is allowed to run.
   Change a setting, save the file, upload it to GitHub, and the change is
   live. Nothing else has to be touched.
   ========================================================================== */

window.PLANNER_CONFIG = {
  /* The planner only runs inside a lesson of our course. It blocks when it
     is the top window; it runs when the page that holds it is on one of these
     hosts; and it FAILS OPEN when the browser hides where it was opened from —
     a candidate who cannot open their planner is worse than a stranger who
     finds it. localhost and 127.0.0.1 are there so the checks can run. */
  blockDirectAccess: true,
  allowedEmbedDomains: ["app.casementor.com", "casementor.spayee.com", "localhost", "127.0.0.1"]
};
