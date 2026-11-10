window.PLANNER_CONTENT = {
  // HOW TO EDIT THIS FILE (no code needed)
  // - One item per line, in course order. Change a number or a word; keep the quotes, commas and brackets.
  //   The plan shows the lessons in the order of this list, so keep the list in course order.
  // - id:       letters, digits and hyphens; unique. Other items point at it, so do not rename it.
  // - title:    what the candidate sees on the plan and in the calendar; the real course names.
  // - module:   Redrock | Sea Wolf | SFL | Mock Test | General
  // - section:  the course section the lesson sits under; shown as a small heading on the plan.
  //             Every lesson needs one. The practice simulations, the Mock Test and the review have none.
  // - type:     video | guide | drill | past-questions | practice-sim | mock-test | review | other
  // - minutes:  time to complete, whole minutes. Video lengths are the real ones (WK, 9 Nov 2026, rounded up);
  //             the short reads are 2 minutes (WK, 10 Nov); the other items are estimates.
  // - after:    ids that should be done first ([] = none). Checked when the page opens; each one must be higher up the list.
  // - rank:     what the plan keeps first when time is short (plan D49, the "ladder"):
  //               1 = the video course          2 = the Full Mock Test and reading its results
  //               3 = the personal review       4 = the practice simulations
  //               5 = extra full games (kept only when all practice simulations fit)
  //               6 = smaller extras (case drills, past questions, the guide chapters)
  // - cut:      rank-1 items only. When even the video course does not fit, the plan cuts whole groups in this
  //               order until it fits, and puts nothing back: "conclusion" first, then "intro" (all intro items
  //               together), then each "walkthrough" (the other two games first, last in course order first),
  //               then "theory" from the end of each game backwards (the other two games first). "never" = never cut.
  // - cut_with: this item is cut and kept together with the item named (e.g. a walkthrough note with its walkthrough).
  // - with:     this item is kept only if the item named is kept (the Redrock PDF answer sheets with the Redrock PDF game).
  // - url:      add the lesson's address when you have it, e.g.  url: "https://app.casementor.com/...",
  // - skills:   not read by the planner page; tells the result review which lessons teach which Mock skill.
  // - drop_order: practice-sim items only. 1 = the first of its game's sims to be dropped when the plan does not fit
  //              the hours; the highest number is kept longest (plan D44, 9 Nov 2026). Change the numbers, not the code.

  product: "PSG Secrets — full package",
  updated: "2026-11-10",   // 10 Nov (fix round 3: intro and conclusion cut as groups): plan D49 — rank and cut order replace priority; real course names; "What is the McKinsey Solve Game" (an empty heading) removed; Mock Test split into the Mock (95) and "Read your Mock results" (30)

  // The three choices for "the game that worries you most". Must match the items' `module` values.
  games: ["Redrock", "Sea Wolf", "SFL"],

  items: [
    // ---------- 1) Welcome! ----------
    { id: "gen-welcome",          title: "Welcome to the McKinsey Solve Combo",          module: "General", section: "1) Welcome!", type: "other", minutes: 2, after: [], rank: 1, cut: "intro", skills: [] },
    { id: "gen-important-update", title: "IMPORTANT UPDATE - READ THIS",                 module: "General", section: "1) Welcome!", type: "other", minutes: 2, after: [], rank: 1, cut: "never", skills: [] },

    // ---------- 2) Introduction ----------
    { id: "gen-v01-welcome",      title: "1. Welcome",                                   module: "General", section: "2) Introduction", type: "video", minutes: 2, after: [], rank: 1, cut: "intro", skills: [] },
    { id: "gen-v02-structure",    title: "2. The Structure of the Solve Game",           module: "General", section: "2) Introduction", type: "video", minutes: 8, after: [], rank: 1, cut: "intro", skills: [] },

    // ---------- 3) Redrock Study ----------
    { id: "rr-material-overview", title: "Redrock Material Overview",                    module: "Redrock", section: "3) Redrock Study", type: "other", minutes: 2,  after: [],         rank: 1, cut: "theory", skills: [] },
    { id: "rr-v03-intro",         title: "3. Redrock - Introduction",                    module: "Redrock", section: "3) Redrock Study", type: "video", minutes: 4,  after: [],         rank: 1, cut: "theory", skills: [] },
    { id: "rr-v04-phases",        title: "4. The 4 Phases of the Game",                  module: "Redrock", section: "3) Redrock Study", type: "video", minutes: 5,  after: ["rr-v03-intro"],  rank: 1, cut: "theory", skills: [] },
    { id: "rr-v05-investigation-parts", title: "5. Investigation Phase - Key Components", module: "Redrock", section: "3) Redrock Study", type: "video", minutes: 5, after: ["rr-v04-phases"], rank: 1, cut: "theory", skills: ["rr:find-data"] },
    { id: "rr-v06-investigation-info",  title: "6. Investigation Phase - Info to Collect", module: "Redrock", section: "3) Redrock Study", type: "video", minutes: 8, after: ["rr-v05-investigation-parts"], rank: 1, cut: "theory", skills: ["rr:find-data"] },
    { id: "rr-v07-analysis",      title: "7. The Analysis Phase",                        module: "Redrock", section: "3) Redrock Study", type: "video", minutes: 8, after: ["rr-v06-investigation-info"], rank: 1, cut: "theory", skills: ["rr:calc-chain"] },
    { id: "rr-v08-report",        title: "8. The Report Phase",                          module: "Redrock", section: "3) Redrock Study", type: "video", minutes: 9, after: ["rr-v07-analysis"], rank: 1, cut: "theory", skills: ["rr:report-target", "rr:chart-choice"] },
    { id: "rr-v09-cases",         title: "9. The Case Phase",                            module: "Redrock", section: "3) Redrock Study", type: "video", minutes: 9, after: ["rr-v08-report"],   rank: 1, cut: "theory", skills: ["rr:arithmetic", "rr:probability", "rr:stats", "rr:statements", "rr:chart-choice", "rr:formula"] },
    { id: "rr-v10-tips",          title: "10. Final Tips",                               module: "Redrock", section: "3) Redrock Study", type: "video", minutes: 4, after: ["rr-v09-cases"],    rank: 1, cut: "theory", skills: [] },
    { id: "rr-walkthrough-note",  title: "Notes on Redrock Full Simulation Walkthrough",  module: "Redrock", section: "3) Redrock Study", type: "other", minutes: 2,  after: ["rr-v10-tips"],     rank: 1, cut: "walkthrough", cut_with: "rr-v11-walkthrough", skills: [] },
    { id: "rr-pdf-sim",           title: "Redrock Simulation PDF — try it yourself before video 11 (in the course it comes after video 11)", module: "Redrock", section: "3) Redrock Study", type: "drill", minutes: 35, after: ["rr-v10-tips"], rank: 5, skills: ["rr:find-data", "rr:calc-chain", "rr:report-target", "rr:arithmetic", "rr:probability", "rr:stats", "rr:statements", "rr:chart-choice", "rr:formula"] },
    { id: "rr-v11-walkthrough",   title: "11. Redrock - Full Simulation Walkthrough",    module: "Redrock", section: "3) Redrock Study", type: "video", minutes: 32, after: ["rr-v10-tips", "rr-pdf-sim"],     rank: 1, cut: "walkthrough", skills: ["rr:find-data", "rr:calc-chain", "rr:report-target", "rr:arithmetic", "rr:probability", "rr:stats", "rr:statements", "rr:chart-choice", "rr:formula"] },
    { id: "rr-pdf-sol-investigation", title: "PDF Simulation Solution - Investigation",  module: "Redrock", section: "3) Redrock Study", type: "drill", minutes: 5, after: ["rr-v11-walkthrough"],       rank: 5, with: "rr-pdf-sim", skills: ["rr:find-data"] },
    { id: "rr-pdf-sol-analysis-1",    title: "PDF Simulation Solution - Analysis #1",    module: "Redrock", section: "3) Redrock Study", type: "drill", minutes: 5, after: ["rr-pdf-sol-investigation"], rank: 5, with: "rr-pdf-sim", skills: ["rr:calc-chain"] },
    { id: "rr-pdf-sol-analysis-2",    title: "PDF Simulation Solution - Analysis #2",    module: "Redrock", section: "3) Redrock Study", type: "drill", minutes: 5, after: ["rr-pdf-sol-analysis-1"],    rank: 5, with: "rr-pdf-sim", skills: ["rr:calc-chain"] },
    { id: "rr-pdf-sol-analysis-3",    title: "PDF Simulation Solution - Analysis #3",    module: "Redrock", section: "3) Redrock Study", type: "drill", minutes: 5, after: ["rr-pdf-sol-analysis-2"],    rank: 5, with: "rr-pdf-sim", skills: ["rr:calc-chain"] },
    { id: "rr-pdf-sol-analysis-4",    title: "PDF Simulation Solution - Analysis #4",    module: "Redrock", section: "3) Redrock Study", type: "drill", minutes: 5, after: ["rr-pdf-sol-analysis-3"],    rank: 5, with: "rr-pdf-sim", skills: ["rr:calc-chain"] },
    { id: "rr-pdf-sol-report",        title: "PDF Simulation Solution - Report",         module: "Redrock", section: "3) Redrock Study", type: "drill", minutes: 5, after: ["rr-pdf-sol-analysis-4"],    rank: 5, with: "rr-pdf-sim", skills: ["rr:report-target", "rr:chart-choice"] },
    { id: "rr-pdf-sol-cases",         title: "PDF Simulation Solution - Cases",          module: "Redrock", section: "3) Redrock Study", type: "drill", minutes: 5, after: ["rr-pdf-sol-report"],        rank: 5, with: "rr-pdf-sim", skills: ["rr:arithmetic", "rr:probability", "rr:stats", "rr:statements", "rr:chart-choice", "rr:formula"] },
    { id: "rr-past-questions",    title: "BONUS 1: Redrock Past Analysis Questions",     module: "Redrock", section: "3) Redrock Study", type: "past-questions", minutes: 20, after: ["rr-v07-analysis"], rank: 6, skills: ["rr:calc-chain"] },
    { id: "rr-case-drills",       title: "BONUS 2: Redrock Case Drills",                 module: "Redrock", section: "3) Redrock Study", type: "drill", minutes: 30, after: ["rr-v10-tips"],   rank: 6, skills: ["rr:arithmetic", "rr:probability", "rr:stats", "rr:statements", "rr:chart-choice", "rr:formula"] },
    { id: "rr-sim-1",             title: "Redrock simulation #1",                        module: "Redrock", type: "practice-sim", minutes: 50, after: ["rr-v10-tips", "rr-v11-walkthrough"], rank: 4, drop_order: 1, skills: ["rr:find-data", "rr:calc-chain", "rr:report-target", "rr:arithmetic", "rr:stats", "rr:statements", "rr:chart-choice", "rr:formula"] },
    { id: "rr-sim-2",             title: "Redrock simulation #2",                        module: "Redrock", type: "practice-sim", minutes: 50, after: ["rr-sim-1"], rank: 4, drop_order: 2, skills: ["rr:find-data", "rr:calc-chain", "rr:report-target", "rr:arithmetic", "rr:probability", "rr:stats", "rr:statements", "rr:chart-choice", "rr:formula"] },
    { id: "rr-sim-3",             title: "Redrock simulation #3",                        module: "Redrock", type: "practice-sim", minutes: 50, after: ["rr-sim-2"], rank: 4, drop_order: 3, skills: ["rr:find-data", "rr:calc-chain", "rr:report-target", "rr:arithmetic", "rr:stats", "rr:statements", "rr:chart-choice", "rr:formula"] },

    // ---------- 4) Sea Wolf ----------
    { id: "sw-v12-intro",         title: "12. Sea Wolf - Introduction",                  module: "Sea Wolf", section: "4) Sea Wolf", type: "video", minutes: 7,  after: [],               rank: 1, cut: "theory", skills: [] },
    { id: "sw-v13-steps",         title: "13. The 5 Steps of the Game",                  module: "Sea Wolf", section: "4) Sea Wolf", type: "video", minutes: 3,  after: ["sw-v12-intro"], rank: 1, cut: "theory", skills: [] },
    { id: "sw-v14-step1",         title: "14. Step 1 - Choosing the Characteristics",    module: "Sea Wolf", section: "4) Sea Wolf", type: "video", minutes: 11, after: ["sw-v13-steps"], rank: 1, cut: "theory", skills: ["sw:block-traits"] },
    { id: "sw-v15-step2",         title: "15. Step 2 - Categorizing the Microbes",       module: "Sea Wolf", section: "4) Sea Wolf", type: "video", minutes: 8, after: ["sw-v14-step1"], rank: 1, cut: "theory", skills: ["sw:site-fit", "sw:allocate"] },
    { id: "sw-v16-step3",         title: "16. Step 3 - Selecting the 4 Microbes",        module: "Sea Wolf", section: "4) Sea Wolf", type: "video", minutes: 8, after: ["sw-v15-step2"], rank: 1, cut: "theory", skills: ["sw:rank"] },
    { id: "sw-v17-step4",         title: "17. Step 4 - Submitting the Microbes",         module: "Sea Wolf", section: "4) Sea Wolf", type: "video", minutes: 21, after: ["sw-v16-step3"], rank: 1, cut: "theory", skills: ["sw:trio-average"] },
    { id: "sw-excel-solver",      title: "Sea Wolf Excel Solver — use it with video 17 (in the course: BONUS 3, at the end of the Sea Wolf section)", module: "Sea Wolf", section: "4) Sea Wolf", type: "other", minutes: 10, after: ["sw-v17-step4"], rank: 1, cut: "theory", cut_with: "sw-v17-step4", skills: ["sw:trio-average"] },
    { id: "sw-v18-step5",         title: "18. Step 5 - Confirming the Microbes",         module: "Sea Wolf", section: "4) Sea Wolf", type: "video", minutes: 4, after: ["sw-v17-step4"], rank: 1, cut: "theory", skills: ["sw:site-fit"] },
    { id: "sw-walkthrough-note",  title: "Sea Wolf Walkthrough note",                    module: "Sea Wolf", section: "4) Sea Wolf", type: "other", minutes: 2,  after: ["sw-v18-step5"], rank: 1, cut: "walkthrough", cut_with: "sw-v19-walkthrough", skills: [] },
    { id: "sw-pdf-sim",           title: "Sea Wolf PDF Simulation and Answer Key — try it yourself before video 19 (in the course they come after video 19)", module: "Sea Wolf", section: "4) Sea Wolf", type: "drill", minutes: 45, after: ["sw-v18-step5"], rank: 5, skills: ["sw:block-traits", "sw:site-fit", "sw:allocate", "sw:rank", "sw:trio-average"] },
    { id: "sw-v19-walkthrough",   title: "19. Sea Wolf - Simulation Walkthrough",        module: "Sea Wolf", section: "4) Sea Wolf", type: "video", minutes: 17, after: ["sw-v18-step5", "sw-pdf-sim"], rank: 1, cut: "walkthrough", skills: ["sw:block-traits", "sw:site-fit", "sw:allocate", "sw:rank", "sw:trio-average"] },
    { id: "sw-sim-1",             title: "Sea Wolf simulation #1",                       module: "Sea Wolf", type: "practice-sim", minutes: 45, after: ["sw-v18-step5", "sw-v19-walkthrough"], rank: 4, drop_order: 2, skills: ["sw:block-traits", "sw:site-fit", "sw:allocate", "sw:rank", "sw:trio-average"] },
    { id: "sw-sim-2",             title: "Sea Wolf simulation #2",                       module: "Sea Wolf", type: "practice-sim", minutes: 45, after: ["sw-sim-1"], rank: 4, drop_order: 1, skills: ["sw:block-traits", "sw:site-fit", "sw:allocate", "sw:rank", "sw:trio-average"] },
    { id: "sw-sim-3",             title: "Sea Wolf simulation #3",                       module: "Sea Wolf", type: "practice-sim", minutes: 45, after: ["sw-sim-2"], rank: 4, drop_order: 3, skills: ["sw:block-traits", "sw:site-fit", "sw:allocate", "sw:rank", "sw:trio-average"] },
    // ---------- 5) Sustainable Futures Lab ----------
    { id: "sfl-important-update", title: "IMPORTANT UPDATE - NEW SUSTAINABLE FUTURES LAB", module: "SFL", section: "5) Sustainable Futures Lab", type: "other", minutes: 10, after: [], rank: 1, cut: "never", skills: [] },
    { id: "sfl-v20-intro",        title: "20. Sustainable Futures Lab (30-min version) - Introduction", module: "SFL", section: "5) Sustainable Futures Lab", type: "video", minutes: 11,  after: [],                 rank: 1, cut: "theory", skills: [] },
    { id: "sfl-v21-approach",     title: "21. Sustainable Futures Lab (30-min version) - Approach",     module: "SFL", section: "5) Sustainable Futures Lab", type: "video", minutes: 11, after: ["sfl-v20-intro"],   rank: 1, cut: "theory", skills: ["sfl:order-questions", "sfl:spend-questions", "sfl:place-people", "sfl:give-reason", "sfl:eliminate-weak", "sfl:read-mood"] },
    { id: "sfl-v22-walkthrough",  title: "22. Sustainable Futures Lab (30-min version) - Full Simulation Walkthrough", module: "SFL", section: "5) Sustainable Futures Lab", type: "video", minutes: 52, after: ["sfl-v21-approach"], rank: 1, cut: "walkthrough", skills: ["sfl:order-questions", "sfl:spend-questions", "sfl:place-people", "sfl:give-reason", "sfl:eliminate-weak", "sfl:read-mood"] },
    { id: "sfl-sim",              title: "SFL simulation",                               module: "SFL", type: "practice-sim", minutes: 45, after: ["sfl-v21-approach", "sfl-v22-walkthrough"], rank: 4, drop_order: 1, skills: ["sfl:order-questions", "sfl:spend-questions", "sfl:place-people", "sfl:give-reason", "sfl:eliminate-weak", "sfl:read-mood"] },

    // ---------- 6) Conclusion ----------
    { id: "gen-v23-conclusion",   title: "23. Conclusion",                               module: "General", section: "6) Conclusion", type: "video", minutes: 2, after: ["rr-v10-tips", "sw-v18-step5", "sfl-v22-walkthrough"], rank: 1, cut: "conclusion", skills: [] },

    // ---------- BONUS 4: PDF guide "McKinsey Imbellus Solve Game Secrets - 16th Edition" (not core teaching) ----------
    { id: "guide-redrock",        title: "Guide: Redrock pages 22-27, 43-45, 68-69",     module: "Redrock",  section: "BONUS 4: McKinsey Imbellus Solve Game Secrets Guide", type: "guide", minutes: 30, after: [], rank: 6, skills: ["rr:find-data", "rr:calc-chain", "rr:report-target", "rr:arithmetic", "rr:probability", "rr:stats", "rr:statements", "rr:chart-choice", "rr:formula"] },
    { id: "guide-seawolf",        title: "Guide: Sea Wolf pages 28-35, 46-49",           module: "Sea Wolf", section: "BONUS 4: McKinsey Imbellus Solve Game Secrets Guide", type: "guide", minutes: 30,  after: [], rank: 6, skills: ["sw:block-traits", "sw:site-fit", "sw:allocate", "sw:rank", "sw:trio-average"] },
    { id: "guide-tips",           title: "Guide: 6 key tips, page 78",                   module: "General",  section: "BONUS 4: McKinsey Imbellus Solve Game Secrets Guide", type: "guide", minutes: 10,  after: [], rank: 6, skills: ["rr:arithmetic", "rr:calc-chain", "rr:stats", "rr:probability", "rr:chart-choice"] },
    { id: "guide-seawolf-pdf-sim",   title: "Guide appendix: a second Sea Wolf PDF game with answer key (pages 80-149)", module: "Sea Wolf", type: "drill", minutes: 45, after: ["sw-sim-3"], rank: 5, skills: ["sw:block-traits", "sw:site-fit", "sw:allocate", "sw:rank", "sw:trio-average"] },

    // ---------- Mock Test, its results and the result review (not in the course outline) ----------
    { id: "mock-test",            title: "Full Mock Test",                               module: "Mock Test", type: "mock-test", minutes: 95, after: ["rr-sim-1", "rr-sim-2", "rr-sim-3", "sw-sim-1", "sw-sim-2", "sw-sim-3", "sfl-sim"], rank: 2, skills: [] },
    { id: "mock-results",         title: "Read your Mock results (open the results file you downloaded)", module: "Mock Test", type: "review", minutes: 30, after: ["mock-test"], rank: 2, skills: [] },
    { id: "result-review",        title: "Read your personal review and fix what it says", module: "Mock Test", type: "review",    minutes: 60,  after: ["mock-test"], rank: 3, skills: [] }
  ]
};
