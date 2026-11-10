/* ==========================================================================
   planner.js — the Study Planner (round 3, plan D49)

   Part 1 (no page needed): checking the content map, building the plan,
   working out the hours notices, writing the calendar file. These parts
   also run in Node, so the build checks can call them directly: load
   content-map.js and this file with a small `window` object and use
   window.Planner.

   Part 2 (the page): the "only inside our course" check, the form, drawing
   the plan, the calendar and print buttons.

   Nothing is saved in the browser. The plan is rebuilt from the three
   answers each time the button is pressed.

   The planning rules are in the round-3 brief (OPUS-M1-planner-build-r3.md
   §2) and the alignment file (psg-offer-planner-alignment.md §5-§6, §9):
   - WHAT is kept: the "ladder" (rank 1 the video course, 2 the Mock Test
     and its results, 3 the review, 4 the practice sims, 5 extra full
     games, 6 smaller extras). Going down, an item that does not fit is
     skipped and the next one tried.
   - WHERE it goes: one layout function (lessons in course order from
     today, practice spread out, Mock day, review day, fix days).
   Each rule is marked below with its number in the brief.
   ========================================================================== */
(function (root) {
  'use strict';

  /* ====================================================================== *
   * PART 1 — RULES AND DATA (no page)
   * ====================================================================== */

  var MODULES = ['Redrock', 'Sea Wolf', 'SFL', 'Mock Test', 'General'];
  var TYPES = ['video', 'guide', 'drill', 'past-questions', 'practice-sim', 'mock-test', 'review', 'other'];
  var CUTS = ['conclusion', 'intro', 'walkthrough', 'theory', 'never'];

  /* The guide appendix Sea Wolf game counts as practice, not as a lesson (2.2). */
  var APPENDIX_ID = 'guide-seawolf-pdf-sim';
  /* "Read your Mock results": kept together with the Mock (2.4 step 2). */
  var RESULTS_ID = 'mock-results';
  /* Fix round 3 (WK, B2): before the Mock, never more than this many practice games on one day. The spread
     and the count of spare days (for fix days) both use it, so fix days never come from cramming practice. */
  var MAX_GAMES_PER_DAY = 3;

  /* How each type is named in the calendar file and the text version. */
  var TYPE_LABELS = {
    'video': 'Video', 'guide': 'Guide', 'drill': 'Drill', 'past-questions': 'Past questions',
    'practice-sim': 'Practice simulation', 'mock-test': 'Mock Test', 'review': 'Review', 'other': 'Read',
    'fix': 'Fix day'
  };

  /* How each game is named in the heading. */
  var GAME_LABELS = { 'SFL': 'SFL (Sustainable Futures Lab)' };
  function gameLabel(g) { return GAME_LABELS[g] || g; }

  /* The phases of a day, as shown on the day cards and the day strip. */
  var PHASE_LABELS = {
    learn: 'Learn', mixed: 'Learn and practise', practise: 'Practise', mock: 'Mock Test',
    review: 'Review', fix: 'Fix day', free: 'Free day', test: 'Test day'
  };

  /* The headers inside a day (§3). */
  var GROUP_LABELS = {
    lessons: 'From the video course: McKinsey Solve Combo',
    practice: 'Practice',
    mock: 'Mock Test',
    review: 'Review and fix'
  };

  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* Every line the candidate reads (brief §3; very simple English). */
  var TEXT = {
    planTitle: 'Your study plan',   /* fix round 5: the top card's title */
    testToday: 'Your test is today. Good luck — there is no time left to plan.',
    pastDate: 'Choose a date from today on.',
    startNow: 'This plan assumes you are starting the course now. Already done some lessons? Skip them and use the time for practice.',
    day1Late: 'If it is late in the day, make your plan again tomorrow.',
    /* the Mock-day line is built from three parts (fix round 3, answers 2 and 3) */
    mockEarly: 'If you can, take it early in the day.',
    mockLessonsFirst: 'Finish the lessons above first, then take the Mock in one sitting.',
    mockSend: 'At the end, download your results file and send it with the \u2018Email us your results\u2019 button on the results page',
    mockSendTomorrow: ', so your review can come back by tomorrow.',
    mockResultsNow: 'If you have time, read your results straight after the Mock.',
    mockSplit: 'Set this time aside: the Mock cannot be split.',
    practiseWait: 'Practise while you wait for your review.',
    practiseLast: 'Practise now: these are your last games before the test.',
    practiseLastOne: 'Practise now: this is your last game before the test.',   /* fix round 4: one game */
    reviewNotHere: 'Review not here yet? Start with your results file and the lessons for your lowest-scoring game.',
    reviewFresh: 'Then play this fresh game to test what your review told you.',
    reviewFreshMany: 'Then play these fresh games to test what your review told you.',
    reviewRest: 'Use the rest of the day to start on what your review says.',
    testDay: 'Test day — only if your test is later in the day. Finish well before it starts.',
    reviewAfterTest: 'Your personal review will come after your test.',
    freeDay: 'Free day — rest, or go back over anything that felt hard.',
    fixTitle: 'Fix day: redo the lessons and practice parts your review points to',
    belowCourseEven10: 'Even at 10 hours a day the video course does not fit before your test. Here is the most it can hold.',
    testDayOnly: 'Your whole video course fits only if you also study on your test day, and there is no time left for the Full Mock Test.',
    testDayOnlyEven10: 'Even at 10 hours a day the course and the Mock do not both fit before your test day. Here is the most your days can hold.',
    someSims: 'When there is not time for every practice game, the plan keeps the ones that teach the most new things; the others are under \u2018If you find spare time\u2019.',
    spareSims: 'Practice games not in your plan',
    spareAnswers: 'Redrock PDF answers (use after the Redrock Simulation PDF)',
    missingHead: 'Missing from your plan',
    spareHead: 'If you find spare time'
  };

  /* ---------------------------------------------------------------------- *
   * Dates. A date is { y, m, d } (m = 1 to 12), always a LOCAL date built
   * from its parts. Whole-day arithmetic uses a "day number" made with
   * Date.UTC, so summer-time changes can never move a day.
   * ---------------------------------------------------------------------- */
  function dayNumber(p) { return Math.round(Date.UTC(p.y, p.m - 1, p.d) / 86400000); }
  function fromDayNumber(n) {
    var t = new Date(n * 86400000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function weekday(p) { return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); }
  /* "2026-11-20" -> { y: 2026, m: 11, d: 20 }, or null if it is not a real date. */
  function parseDate(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || '').trim());
    if (!m) return null;
    var p = { y: +m[1], m: +m[2], d: +m[3] };
    var back = fromDayNumber(dayNumber(p));
    if (back.y !== p.y || back.m !== p.m || back.d !== p.d) return null;
    return p;
  }
  function asDate(v) {
    if (!v) return null;
    if (typeof v === 'string') return parseDate(v);
    if (v instanceof Date) return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate() };
    if (typeof v.y === 'number') return { y: v.y, m: v.m, d: v.d };
    return null;
  }
  function localToday() { return asDate(new Date()); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(p) { return p.y + '-' + pad2(p.m) + '-' + pad2(p.d); }
  function compactDate(p) { return '' + p.y + pad2(p.m) + pad2(p.d); }
  /* "Tue 10 Nov"; the year is added only when it differs from `yearOfToday`. */
  function formatDate(p, yearOfToday) {
    var s = WEEKDAYS[weekday(p)] + ' ' + p.d + ' ' + MONTHS[p.m - 1];
    if (yearOfToday && p.y !== yearOfToday) s += ' ' + p.y;
    return s;
  }

  /* 115 -> "1 h 55 min", 120 -> "2 h", 45 -> "45 min". */
  function formatMinutes(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (h && m) return h + ' h ' + m + ' min';
    if (h) return h + ' h';
    return m + ' min';
  }
  /* 2 -> "2 hours", 1 -> "1 hour", 2.5 -> "2.5 hours". */
  function hoursText(h) {
    if (h === 1) return '1 hour';
    return h + ' hours';
  }
  /* 2 -> "2 h", 2.5 -> "2.5 h" (the notices and the form summary). */
  function hShort(h) { return h + ' h'; }

  /* ---------------------------------------------------------------------- *
   * CHECKING THE CONTENT MAP
   *
   * Returns a list of plain sentences, one per mistake; an empty list means
   * the map is fine. It never throws, whatever is in the file.
   * ---------------------------------------------------------------------- */
  function isPracticeItem(it) { return !!it && (it.type === 'practice-sim' || it.id === APPENDIX_ID); }
  function isLessonItem(it) {
    return !!it && !isPracticeItem(it) && it.type !== 'mock-test' && it.type !== 'review' && it.type !== 'fix';
  }

  function validateMap(map) {
    var errors = [];
    function fail(msg) { errors.push(msg); }
    function q(v) { return '"' + String(v) + '"'; }

    if (!map || typeof map !== 'object') {
      return ['The file content-map.js did not load, or a typing mistake stops it from being read.'];
    }
    if (!Array.isArray(map.items) || !map.items.length) {
      return ['The map has no "items" list.'];
    }
    if (!Array.isArray(map.games) || !map.games.length) {
      fail('The map has no "games" list.');
    }
    var items = map.items, ids = {}, pos = {}, byId = {};

    items.forEach(function (it, i) {
      var where = 'Item ' + (i + 1);
      if (!it || typeof it !== 'object') { fail(where + ' is not written as { ... }.'); return; }
      var id = it.id;
      if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) {
        fail(where + ': the id ' + q(id) + ' may only use small letters, digits and hyphens.');
      } else {
        where = 'Item ' + q(id);
        if (ids[id]) fail('The id ' + q(id) + ' is used twice.');
        ids[id] = true;
        if (!(id in pos)) { pos[id] = i; byId[id] = it; }
      }
      if (typeof it.title !== 'string' || !it.title.trim()) fail(where + ' has no title.');
      if (MODULES.indexOf(it.module) === -1) fail(where + ': module ' + q(it.module) + ' must be one of ' + MODULES.join(', ') + '.');
      if (TYPES.indexOf(it.type) === -1) fail(where + ': type ' + q(it.type) + ' must be one of ' + TYPES.join(', ') + '.');
      if (!(typeof it.minutes === 'number' && it.minutes % 1 === 0 && it.minutes > 0)) fail(where + ': minutes ' + q(it.minutes) + ' must be a whole number above 0.');
      if (!(typeof it.rank === 'number' && it.rank % 1 === 0 && it.rank >= 1 && it.rank <= 6)) fail(where + ': rank ' + q(it.rank) + ' must be a whole number from 1 to 6.');
      if ('priority' in it) fail(where + ': "priority" is no longer used. Use "rank" (1 to 6) instead and delete "priority".');
      if (!Array.isArray(it.after)) fail(where + ': "after" must be a list in [ ], for example after: [].');
      if (isLessonItem(it) && !(typeof it.section === 'string' && it.section.trim())) {
        fail(where + ': a lesson needs a "section" (the course section it sits under, e.g. "3) Redrock Study").');
      }
      if ('section' in it && !(typeof it.section === 'string' && it.section.trim())) fail(where + ': "section" is empty.');
      if (it.rank === 1) {
        if (CUTS.indexOf(it.cut) === -1) fail(where + ': a rank-1 item needs "cut", one of ' + CUTS.map(q).join(', ') + '.');
      } else if ('cut' in it) {
        fail(where + ': "cut" is only for rank-1 items.');
      }
      if ('drop_order' in it) {
        if (it.type !== 'practice-sim') fail(where + ': drop_order is only for practice-sim items.');
        if (!(typeof it.drop_order === 'number' && it.drop_order % 1 === 0 && it.drop_order > 0)) fail(where + ': drop_order ' + q(it.drop_order) + ' must be a whole number above 0.');
      }
      if ('url' in it && !(typeof it.url === 'string' && /^https?:\/\/\S+$/.test(it.url))) {
        fail(where + ': url must start with https:// and have no spaces.');
      }
    });

    /* cut_with and with name an item that exists */
    items.forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      var where = 'Item ' + q(it.id);
      if ('cut_with' in it) {
        var t = byId[it.cut_with];
        if (!t) fail(where + ': "cut_with" names ' + q(it.cut_with) + ', which is not an id in the map.');
        else if (t === it) fail(where + ': "cut_with" names the item itself.');
        else if (it.rank !== 1 || t.rank !== 1 || t.cut === 'never' || 'cut_with' in t) fail(where + ': "cut_with" must join two rank-1 items, and the item named must not be "never" or have its own "cut_with".');
      }
      if ('with' in it) {
        var w = byId[it['with']];
        if (!w) fail(where + ': "with" names ' + q(it['with']) + ', which is not an id in the map.');
        else if (w === it || 'with' in w) fail(where + ': "with" must name another item that has no "with" of its own.');
        else if (w.rank > it.rank) fail(where + ': "with" names ' + q(it['with']) + ', which has a lower rank (a higher number) than this item.');
      }
    });

    /* every `after` exists and comes earlier in the list */
    items.forEach(function (it) {
      if (!it || !Array.isArray(it.after)) return;
      it.after.forEach(function (a) {
        if (!(a in pos)) fail('Item ' + q(it.id) + ': "after" names ' + q(a) + ', which is not an id in the map.');
        else if (a === it.id) fail('Item ' + q(it.id) + ': "after" names the item itself.');
        else if (pos[a] >= pos[it.id]) fail('Item ' + q(it.id) + ': "after" names ' + q(a) + ', which comes later in the list.');
      });
    });

    var mocks = items.filter(function (i) { return i && i.type === 'mock-test'; });
    var results = items.filter(function (i) { return i && i.id === RESULTS_ID; });
    var reviews = items.filter(function (i) { return i && i.type === 'review' && i.id !== RESULTS_ID; });
    if (mocks.length !== 1) fail('There must be exactly one item of type "mock-test"; there are ' + mocks.length + '.');
    if (results.length !== 1 || results[0].type !== 'review') fail('There must be one item with id ' + q(RESULTS_ID) + ' and type "review" (reading the Mock results).');
    if (reviews.length !== 1) fail('There must be exactly one result-review item (type "review", other than ' + q(RESULTS_ID) + '); there are ' + reviews.length + '.');
    if (mocks.length === 1 && results.length === 1 && mocks[0].rank !== results[0].rank) fail('The Mock Test and ' + q(RESULTS_ID) + ' must have the same rank (they are kept together).');
    if (mocks.length === 1 && reviews.length === 1 && !(reviews[0].rank > mocks[0].rank)) fail('The review must have a lower rank (a higher number) than the Mock Test: it needs the Mock.');

    (Array.isArray(map.games) ? map.games : []).forEach(function (g) {
      if (!items.some(function (i) { return i && i.module === g; })) fail('The game ' + q(g) + ' in "games" has no items.');
    });

    /* drop_order distinct within one game. (A game whose sims have no
       drop_order is NOT a mistake: it keeps the highest sim number longest.) */
    (Array.isArray(map.games) ? map.games : []).forEach(function (g) {
      var seen = {};
      items.forEach(function (i) {
        if (i && i.type === 'practice-sim' && i.module === g && typeof i.drop_order === 'number') {
          if (seen[i.drop_order]) fail(g + ': two practice sims have drop_order ' + i.drop_order + '.');
          seen[i.drop_order] = true;
        }
      });
    });

    /* the Mock Test comes after every practice sim; the review and the results after the Mock Test */
    if (mocks.length === 1 && Array.isArray(mocks[0].after)) {
      items.forEach(function (i) {
        if (i && i.type === 'practice-sim' && mocks[0].after.indexOf(i.id) === -1) {
          fail('The mock-test item\u2019s "after" list must name the practice sim ' + q(i.id) + '.');
        }
      });
    }
    results.concat(reviews).forEach(function (r) {
      if (mocks.length === 1 && Array.isArray(r.after) && r.after.indexOf(mocks[0].id) === -1) {
        fail('Item ' + q(r.id) + ': its "after" list must name the mock-test item ' + q(mocks[0].id) + '.');
      }
    });
    return errors;
  }

  /* ---------------------------------------------------------------------- *
   * THE LADDER — the order in which items are tried (brief 2.4)
   *
   * prepare(map, weakGame) works out everything that does not depend on the
   * dates or the hours: which items are lessons and practice, and the
   * "try list": a list of units (one item, or items that are kept and cut
   * together), top of the ladder first.
   * ---------------------------------------------------------------------- */
  function prepare(map, weak) {
    var items = map.items, games = map.games, pos = {}, byId = {};
    items.forEach(function (it, i) { pos[it.id] = i; byId[it.id] = it; });
    var mock = items.filter(function (i) { return i.type === 'mock-test'; })[0];
    var results = byId[RESULTS_ID] || null;
    var review = items.filter(function (i) { return i.type === 'review' && i.id !== RESULTS_ID; })[0];
    var lessons = items.filter(isLessonItem);
    var practice = items.filter(isPracticeItem);
    var appendix = byId[APPENDIX_ID] || null;

    /* the games in course order, and the chosen game first */
    var gameStart = {};
    items.forEach(function (it, i) { if (!(it.module in gameStart)) gameStart[it.module] = i; });
    var courseGames = games.slice().sort(function (a, b) { return gameStart[a] - gameStart[b]; });
    var gameOrder = [weak].concat(courseGames.filter(function (g) { return g !== weak; }));
    function gameRank(m) { var i = gameOrder.indexOf(m); return i === -1 ? gameOrder.length : i; }

    var units = [];
    function unit(list, rank, kind, label) {
      var u = { key: list[0].id, items: list, rank: rank, kind: kind, label: label || kind,
                minutes: list.reduce(function (s, it) { return s + it.minutes; }, 0) };
      units.push(u);
      return u;
    }

    /* ---- rank 1: the video course, in keep order = the cut order turned round (2.4 step 1) ---- */
    var r1 = items.filter(function (it) { return it.rank === 1; });
    var followers = {};      /* main id -> items cut with it */
    r1.forEach(function (it) { if (it.cut_with) (followers[it.cut_with] = followers[it.cut_with] || []).push(it); });
    var r1Units = r1.filter(function (it) { return !it.cut_with; }).map(function (it) {
      var list = [it].concat(followers[it.id] || []).sort(function (a, b) { return pos[a.id] - pos[b.id]; });
      return { main: it, items: list, cut: it.cut };
    });
    /* fix round 3 (coordinator, answer 5): "23. Conclusion" is one unit and the intro group
       (Welcome + videos 1 and 2) is one unit: all items with that `cut` are cut together */
    ['conclusion', 'intro'].forEach(function (c) {
      var group = r1Units.filter(function (u) { return u.cut === c; });
      if (group.length < 2) return;
      var all = [].concat.apply([], group.map(function (u) { return u.items; })).sort(function (a, b) { return pos[a.id] - pos[b.id]; });
      r1Units = r1Units.filter(function (u) { return u.cut !== c; }).concat([{ main: all[0], items: all, cut: c }]);
    });
    function lastFirst(list) { return list.slice().sort(function (a, b) { return pos[b.main.id] - pos[a.main.id]; }); }
    var isWeak = function (u) { return u.main.module === weak; };
    var cutOrder = [].concat(
      lastFirst(r1Units.filter(function (u) { return u.cut === 'conclusion'; })),
      lastFirst(r1Units.filter(function (u) { return u.cut === 'intro'; })),
      lastFirst(r1Units.filter(function (u) { return u.cut === 'walkthrough' && !isWeak(u); })),
      lastFirst(r1Units.filter(function (u) { return u.cut === 'walkthrough' && isWeak(u); })),
      lastFirst(r1Units.filter(function (u) { return u.cut === 'theory' && !isWeak(u); })),
      lastFirst(r1Units.filter(function (u) { return u.cut === 'theory' && isWeak(u); }))
    );
    var never = r1Units.filter(function (u) { return u.cut === 'never'; });
    never.forEach(function (u) { unit(u.items, 1, 'never', 'never cut'); });
    cutOrder.slice().reverse().forEach(function (u) { var x = unit(u.items, 1, 'course', u.cut); x.main = u.main; });

    /* ---- rank 2: the Mock and its results, together or neither (2.4 step 2) ---- */
    var r2 = items.filter(function (it) { return it.rank === 2; });
    if (r2.length) unit(r2, 2, 'mock', 'Mock Test');
    /* ---- rank 3: the review, only with the Mock (2.4 step 3) ---- */
    items.filter(function (it) { return it.rank === 3; }).forEach(function (it) { unit([it], 3, it === review ? 'review' : 'other'); });

    /* ---- rank 4: the sims, keep order (2) (2.4 step 4) ---- */
    function simNumber(s) { var m = /(\d+)$/.exec(s.id); return m ? +m[1] : pos[s.id]; }
    function simsByKeep(g) {
      var sims = items.filter(function (i) { return i.rank === 4 && i.type === 'practice-sim' && i.module === g; });
      var allHave = sims.every(function (s) { return typeof s.drop_order === 'number'; });
      return sims.slice().sort(allHave
        ? function (a, b) { return b.drop_order - a.drop_order; }
        : function (a, b) { return simNumber(b) - simNumber(a); });
    }
    var simLists = gameOrder.map(simsByKeep);
    var rounds4 = Math.max.apply(null, simLists.map(function (l) { return l.length; }).concat([0]));
    for (var r = 0; r < rounds4; r++) simLists.forEach(function (l) { if (l[r]) unit([l[r]], 4, 'sim'); });
    /* rank-4 items that are not sims of a game (none today): after them, course order */
    items.forEach(function (it) { if (it.rank === 4 && !units.some(function (u) { return u.items.indexOf(it) !== -1; })) unit([it], 4, 'other'); });

    /* ---- rank 5: extra full games, round by round; then the answer sheets as one block (2.4 step 5) ---- */
    var r5 = items.filter(function (it) { return it.rank === 5 && !it['with']; });
    var r5Lists = gameOrder.map(function (g) { return r5.filter(function (it) { return it.module === g; }); });
    var r5Other = r5.filter(function (it) { return gameOrder.indexOf(it.module) === -1; });
    var rounds5 = Math.max.apply(null, r5Lists.map(function (l) { return l.length; }).concat([0]));
    for (var r5i = 0; r5i < rounds5; r5i++) r5Lists.forEach(function (l) { if (l[r5i]) unit([l[r5i]], 5, 'extra-game'); });
    r5Other.forEach(function (it) { unit([it], 5, 'extra-game'); });
    /* ---- rank 6: case drills, then past questions, then the guide chapters (2.4 step 6) ---- */
    var r6 = items.filter(function (it) { return it.rank === 6 && !it['with']; });
    var r6Plain = r6.filter(function (it) { return it.type !== 'guide'; });
    var typeOrder = { 'drill': 0, 'past-questions': 1 };
    r6Plain.sort(function (a, b) {
      var ta = a.type in typeOrder ? typeOrder[a.type] : 2, tb = b.type in typeOrder ? typeOrder[b.type] : 2;
      return ta - tb || pos[a.id] - pos[b.id];
    });
    var r6Guides = r6.filter(function (it) { return it.type === 'guide'; })
      .sort(function (a, b) { return gameRank(a.module) - gameRank(b.module) || pos[a.id] - pos[b.id]; });
    /* items with `with` (the seven answer sheets): one block per item named, tried right after the
       rest of their rank (2.4 step 5: "right after the rest of rank 5") */
    function withBlocks(rank) {
      var groups = {}, order = [];
      items.forEach(function (it) {
        if (it.rank === rank && it['with']) {
          if (!groups[it['with']]) { groups[it['with']] = []; order.push(it['with']); }
          groups[it['with']].push(it);
        }
      });
      order.forEach(function (w) { var u = unit(groups[w], rank, 'with', 'kept only with ' + w); u.needs = w; });
    }
    withBlocks(5);
    r6Plain.forEach(function (it) { unit([it], 6, 'small'); });
    r6Guides.forEach(function (it) { unit([it], 6, 'small'); });
    withBlocks(6);
    [1, 2, 3, 4].forEach(function (rk) { /* a `with` item of rank 1-4 (none today): tried at the end of its rank */
      items.forEach(function (it) {
        if (it.rank === rk && it['with'] && !units.some(function (u) { return u.items.indexOf(it) !== -1; })) {
          var u = unit([it], rk, 'with'); u.needs = it['with'];
        }
      });
    });
    units.sort(function (a, b) { return a.rank - b.rank; });   /* stable: keeps the order above within a rank */
    units.forEach(function (u, i) { u.index = i; });
    var unitOf = {};
    units.forEach(function (u) { u.items.forEach(function (it) { unitOf[it.id] = u; }); });

    return {
      items: items, games: games, pos: pos, byId: byId, mock: mock, results: results, review: review,
      lessons: lessons, practice: practice, appendix: appendix, gameOrder: gameOrder, weak: weak,
      units: units, unitOf: unitOf, cutOrder: cutOrder.map(function (u) { return u.items; })
    };
  }

  /* May this unit be tried now? (rules of the ladder that are not about time) */
  function eligible(P, u, kept) {
    if (u.needs && !kept[u.needs]) return false;                                   /* `with` */
    if (u.kind === 'review' && !kept[P.mock.id]) return false;                     /* 2.4 step 3 */
    if (u.rank === 5) {                                                            /* 2.4 step 5 */
      if (!P.items.every(function (it) { return it.rank !== 4 || it.type !== 'practice-sim' || kept[it.id]; })) return false;
    }
    return true;
  }

  /* ---------------------------------------------------------------------- *
   * PLAY ORDER (brief 2.5): round by round, the chosen game first, then the
   * others in course order; within a game sim #1 -> #2 -> #3 (course order)
   * whatever was kept; the guide appendix game right after the last kept
   * Sea Wolf sim.
   * ---------------------------------------------------------------------- */
  function playOrder(P, kept) {
    var byGame = {};
    P.gameOrder.forEach(function (g) { byGame[g] = []; });
    var others = [];
    kept.forEach(function (it) {
      if (it === P.appendix) return;
      if (byGame[it.module]) byGame[it.module].push(it); else others.push(it);
    });
    P.gameOrder.forEach(function (g) { byGame[g].sort(function (a, b) { return P.pos[a.id] - P.pos[b.id]; }); });
    var seq = [];
    for (var r = 0; r < 50; r++) {
      P.gameOrder.forEach(function (g) { if (byGame[g][r]) seq.push(byGame[g][r]); });
    }
    if (P.appendix && kept.indexOf(P.appendix) !== -1) {
      var g = P.appendix.module, at = -1;
      seq.forEach(function (it, i) { if (it.module === g) at = i; });
      if (at === -1) {   /* no sim of its game kept: in that game's first-round place */
        at = seq.filter(function (it, i) { return i < P.gameOrder.length && P.gameOrder.indexOf(it.module) < P.gameOrder.indexOf(g); }).length - 1;
      }
      seq.splice(at + 1, 0, P.appendix);
    }
    return seq.concat(others);
  }

  /* ---------------------------------------------------------------------- *
   * THE LAYOUT of a given set of kept items (brief 2.3). The ladder calls it
   * to ask "does this still fit?".
   *
   * ctx: { n: study days, H: minutes a day, testDayMode: the test day may
   *        take course lessons (2.4 step 1) }
   * kept: { id: true }
   * Returns { ok, why, days (index 1..n+1, n+1 = the test day), mockDay,
   *   reviewDay, fixDays, resultsDay, testDayUsed, beforeMock, afterMock }.
   * ---------------------------------------------------------------------- */
  function layout(P, ctx, kept, aft) {
    aft = aft || {};   /* fix round 2: ids of rank-6 extras placed after the Mock (alignment §9.5, D49(l)) */
    var n = ctx.n, H = ctx.H;
    var isKept = function (it) { return !!kept[it.id]; };
    var L = P.lessons.filter(function (it) { return isKept(it) && !aft[it.id]; });
    /* the extras placed after the Mock, in ladder order */
    var A = [];
    P.units.forEach(function (u) { u.items.forEach(function (it) { if (kept[it.id] && aft[it.id]) A.push(it); }); });
    var Pr = playOrder(P, P.practice.filter(isKept));
    var hasMock = !!kept[P.mock.id], hasResults = !!(P.results && kept[P.results.id]), hasReview = !!kept[P.review.id];
    var days = [], used = [];
    for (var d0 = 0; d0 <= n + 1; d0++) { days.push([]); used.push(0); }
    function put(d, it) { days[d].push(it); used[d] += it.minutes; }
    function no(why) { return { ok: false, why: why }; }
    if (hasReview && !hasMock) return no('review without the Mock');
    if (P.results && hasMock !== hasResults) return no('Mock and results apart');

    /* lessons in course order from day 1; the next lesson that does not fit
       the day starts the next day; nothing jumps ahead (2.3). cap(d) < 0 = no
       such day. Returns the last lesson day (0 = no lessons), or -1. */
    function packLessons(cap) {
      var d = 1, last = 0;
      for (var i = 0; i < L.length; i++) {
        var it = L[i];
        for (;;) {
          var c = cap(d, it);
          if (c === null) return -1;
          if (used[d] + it.minutes <= c) { put(d, it); last = d; break; }
          d++;
        }
      }
      return last;
    }

    /* the practice played before the Mock: the longest start of the play
       order that fits the window [first day practice can start .. lastDay],
       spread as evenly as possible over the window (2.3). Returns how many. */
    function practiceBefore(e, lastDay) {
      if (!Pr.length) return 0;
      var ps = (e >= 1 && e <= lastDay && used[e] + Pr[0].minutes <= H) ? e : Math.max(1, e + 1);
      if (ps > lastDay) return 0;
      var games = days.map(function (list) { return list.filter(isPracticeItem).length; });
      /* how many fit, packed in order (packing in order fits the most); at most MAX_GAMES_PER_DAY a day */
      function packFrom(j, d, usedD, gamesD, upto) {
        var u = used.slice(), g = games.slice(); u[d] = usedD; g[d] = gamesD;
        for (var x = j; x < upto; x++) {
          while (d <= lastDay && (u[d] + Pr[x].minutes > H || g[d] >= MAX_GAMES_PER_DAY)) d++;
          if (d > lastDay) return x;
          u[d] += Pr[x].minutes; g[d]++;
        }
        return upto;
      }
      var k = packFrom(0, ps, used[ps], games[ps], Pr.length);
      if (!k) return 0;
      var W = lastDay - ps + 1, cur = ps;
      for (var j = 0; j < k; j++) {
        var m = Pr[j].minutes;
        var t = k > 1 ? ps + Math.round(j * (W - 1) / (k - 1)) : ps;
        var hi = Math.max(cur, t), pick = -1, dd;
        for (dd = hi; dd >= cur && pick < 0; dd--) {
          if (used[dd] + m <= H && games[dd] < MAX_GAMES_PER_DAY && packFrom(j + 1, dd, used[dd] + m, games[dd] + 1, k) === k) pick = dd;
        }
        for (dd = hi + 1; dd <= lastDay && pick < 0; dd++) {
          if (used[dd] + m <= H && games[dd] < MAX_GAMES_PER_DAY && packFrom(j + 1, dd, used[dd] + m, games[dd] + 1, k) === k) pick = dd;
        }
        if (pick < 0) return -1;          /* cannot happen: packing in order fits k items */
        put(pick, Pr[j]); games[pick]++; cur = pick;
      }
      return k;
    }

    /* ---- no Mock: lessons (the test day only for course lessons, at most half the hours), then practice ---- */
    /* only rank-6 lessons may go after the Mock: never the PDF games or their answer sheets */
    if (A.some(function (it) { return it.rank !== 6 || !isLessonItem(it); })) return no('only rank-6 lessons may go after the Mock');
    if (!hasMock) {
      if (A.length) return no('no Mock to place extras after');
      var e0 = packLessons(function (d, it) {
        if (d <= n) return H;
        if (d === n + 1 && ctx.testDayMode && it.rank === 1) return Math.floor(H / 2);
        return null;
      });
      if (e0 < 0) return no('lessons');
      /* the test day takes only what the course itself needs: no extra (rank 2-6)
         lesson may push course lessons onto it (2.3 "used only by rule 2.4 step 1") */
      if (e0 === n + 1 && L.some(function (it) { return it.rank !== 1; })) return no('extras would push lessons onto the test day');
      if (Pr.length) {
        if (e0 > n) return no('practice after lessons on the test day');
        var k0 = practiceBefore(e0, n);
        if (k0 !== Pr.length) return no('practice');
      }
      return { ok: true, days: days, used: used, mockDay: 0, reviewDay: 0, fixDays: 0, resultsDay: 0,
               testDayUsed: days[n + 1].length > 0, beforeMock: Pr.length, afterMock: 0, F: 0 };
    }

    /* ---- with the Mock ---- */
    var r = hasReview ? 1 : 0;
    /* fix days (2.3): spare = study days - days that lessons + kept practice need when packed - Mock day - review day */
    var D = (function () {
      var u = 0, d = 1, last = 0;
      L.forEach(function (it) { if (u + it.minutes > H) { d++; u = 0; } u += it.minutes; last = d; });
      if (Pr.length) {   /* practice spread first, at most MAX_GAMES_PER_DAY a day (WK, fix round 3 B2) */
        var gm = 0;
        if (!(last >= 1 && u + Pr[0].minutes <= H)) { d = last + 1; u = 0; }
        Pr.forEach(function (it) { if (u + it.minutes > H || gm >= MAX_GAMES_PER_DAY) { d++; u = 0; gm = 0; } u += it.minutes; gm++; });
        last = d;
      }
      return last;
    }());
    var spare = n - D - 1 - r;
    var fix = r && spare >= 1 ? Math.min(2, spare) : 0;
    var F = n - r - fix, R = r ? F + 1 : 0;
    if (F < 1) return no('no day for the Mock');

    /* lessons in days 1..F; on the Mock day only before the Mock and only so far that
       the Mock day is pushed no further over the hours than the Mock alone would push it */
    var e = packLessons(function (d) {
      if (d < F) return H;
      if (d === F) return Math.max(0, H - P.mock.minutes);
      return null;
    });
    if (e < 0) return no('lessons do not fit before the Mock');
    /* the Mock day takes lessons only when the course itself needs it: no extra
       (rank 5-6) lesson may push lessons onto the Mock day (2.3 "only when there is
       no other way to keep the Mock") */
    if (e === F && L.some(function (it) { return it.rank !== 1; })) return no('extras would push lessons onto the Mock day');
    put(F, P.mock);
    var resultsDay = 0;
    if (P.results) {
      if (used[F] + P.results.minutes <= H || !r) { put(F, P.results); resultsDay = F; }
      else resultsDay = R;
    }
    var k = practiceBefore(e, F - 1);
    if (k < 0) return no('practice spread');
    if (r) {
      if (resultsDay === R) put(R, P.results);
      put(R, P.review);
    }
    /* practice that did not fit before the Mock: Mock day -> review day -> fix days, in play order */
    var after = [F];
    if (r) after.push(R);
    for (var f = 1; f <= fix; f++) after.push(R + f);
    var ai = 0;
    for (var j = k; j < Pr.length; j++) {
      while (ai < after.length && used[after[ai]] + Pr[j].minutes > H) ai++;
      if (ai >= after.length) return no('practice does not fit after the Mock');
      put(after[ai], Pr[j]);
    }
    /* fix round 2: rank-6 extras that could not keep their course spot, in ladder order, each on the
       first of: the Mock day (only when "Read your Mock results" is on it), after the results and any
       practice; then the review day, after the review and any practice. (Fix round 3, B1: not on fix days.)
       Practice is already placed, so it never moves; no day goes over. */
    var spots = [];
    if (resultsDay === F) spots.push(F);
    if (r) spots.push(R);
    /* fix days are not offered: the fix task keeps the day's full hours (WK, fix round 3 B1) */
    for (var a = 0; a < A.length; a++) {
      var placed = false;
      for (var si = 0; si < spots.length && !placed; si++) {
        var dd = spots[si];
        if (used[dd] + A[a].minutes <= H) { put(dd, A[a]); placed = true; }
      }
      if (!placed) return no('an extra does not fit after the Mock');
    }
    for (var g = 1; g <= fix; g++) {
      var left = H - used[R + g];
      if (left > 0) put(R + g, { id: 'fix-day-' + g, title: TEXT.fixTitle, type: 'fix', module: 'Mock Test',
                                 minutes: left, rank: 0, after: [], generated: true });
    }
    return { ok: true, days: days, used: used, mockDay: F, reviewDay: R, fixDays: fix, resultsDay: resultsDay,
             testDayUsed: false, beforeMock: k, afterMock: Pr.length - k, F: F, spare: spare, packedDays: D, extrasAfter: A.length };
  }

  /* Does the whole video course fit the study days at H minutes, without the test day? (2.4 step 1) */
  function courseFits(P, n, H) {
    var d = 1, u = 0;
    for (var i = 0; i < P.lessons.length; i++) {
      var it = P.lessons[i];
      if (it.rank !== 1) continue;
      if (u + it.minutes > H) { d++; u = 0; }
      if (it.minutes > H) return false;
      u += it.minutes;
    }
    return d <= n;
  }

  /* ---------------------------------------------------------------------- *
   * THE LADDER (brief 2.4): go down the try list; keep a unit if the plan
   * still fits with it, otherwise skip it and try the next one.
   * ---------------------------------------------------------------------- */
  /* the ids of the practice sims played before the Mock (all of them when there is no Mock) */
  function practiceBeforeMock(run) {
    var ids = {};
    if (!run.ok) return ids;
    run.days.forEach(function (list, d) {
      if (d === 0 || (run.mockDay && d >= run.mockDay)) return;
      list.forEach(function (it) { if (it.type === 'practice-sim') ids[it.id] = true; });
    });
    return ids;
  }
  function stillBefore(before, run) {
    var now = practiceBeforeMock(run);
    return Object.keys(before).every(function (id) { return now[id]; });
  }

  function runLadder(P, ctx) {
    var kept = {}, aft = {}, skipped = [], refilled = [];
    function add(u) { u.items.forEach(function (it) { kept[it.id] = true; }); }
    function drop(u) { u.items.forEach(function (it) { delete kept[it.id]; delete aft[it.id]; }); }
    function tryUnit(u) {
      if (!eligible(P, u, kept)) return false;
      /* fix round 1 (coordinator, answer 2): an extra (rank 5-6) is kept only if every
         sim that sat before the Mock without it still sits before the Mock */
      var before = u.rank >= 5 ? practiceBeforeMock(layout(P, ctx, kept, aft)) : null;
      add(u);
      var r = layout(P, ctx, kept, aft);
      if (r.ok && (!before || stillBefore(before, r))) return true;
      /* fix round 2 (alignment §9.5, D49(l)): a rank-6 lesson that cannot keep its course spot is
         tried after the Mock (never a rank-5 item: the PDF games are tried before the walkthrough or not at all) */
      if (u.rank === 6 && u.items.every(isLessonItem)) {
        u.items.forEach(function (it) { aft[it.id] = true; });
        r = layout(P, ctx, kept, aft);
        if (r.ok && (!before || stillBefore(before, r))) return true;
      }
      drop(u);
      return false;
    }
    /* 2.4 step 1, fix round 3 (coordinator, answer 5): the whole video course is kept; if it does not
       fit (the test day already allowed), whole units are cut in the cut order until it fits, and
       nothing lower in the order is put back. "never" items are never cut. Unused minutes in such very
       poor plans are accepted. */
    P.units.forEach(function (u) { if (u.rank === 1) add(u); });
    var cuts = 0;
    while (!layout(P, ctx, kept, aft).ok && cuts < P.cutOrder.length) {
      P.cutOrder[cuts].forEach(function (it) { delete kept[it.id]; });
      cuts++;
    }
    P.units.forEach(function (u) {
      if (u.rank === 1) return;
      if (!tryUnit(u)) skipped.push(u);
    });
    /* Safety pass, in rank terms: a skipped unit is tried once more, top of the
       ladder first, in case a later choice changed the layout so that it now fits
       (the layout is not guaranteed to be "more items never fit better"). Repeats
       until nothing changes. The checks count how often it adds anything. */
    for (var changed = true, guard = 0; changed && guard < 10; guard++) {
      changed = false;
      for (var i = 0; i < P.units.length; i++) {
        var u = P.units[i];
        if (u.rank === 1 || u.items.every(function (it) { return kept[it.id]; })) continue;
        if (tryUnit(u)) { changed = true; refilled.push(u.key); }
      }
    }
    return { kept: kept, aft: aft, refilled: refilled, cutUnits: cuts, run: layout(P, ctx, kept, aft) };
  }

  /* ---------------------------------------------------------------------- *
   * BUILDING THE PLAN
   *
   * buildPlan(map, { testDate, hoursPerDay, weakGame, today, withHours })
   *   testDate, today: { y, m, d } or "YYYY-MM-DD" (today defaults to the
   *   browser's local date). withHours: false skips the hours search (it
   *   runs the planner again at 1 to 10 hours).
   * ---------------------------------------------------------------------- */
  function buildPlan(map, input) {
    var weak = input.weakGame;
    var today = asDate(input.today) || localToday();
    var test = asDate(input.testDate);
    var hours = Number(input.hoursPerDay);
    var H = Math.round(hours * 60);

    var plan = {
      status: 'ok', today: today, testDate: test, hoursPerDay: hours, weakGame: weak,
      capacity: H, studyDays: 0, days: [], notes: [], missing: [], spare: [], cut: [], refilled: []
    };

    /* 2.1 — study days: today (Day 1) up to the day before the test */
    var first = dayNumber(today);
    var n = test ? dayNumber(test) - first : -1;
    if (!test || n < 0) { plan.status = 'past'; plan.notes.push({ code: 'past', text: TEXT.pastDate }); return plan; }
    if (n === 0) { plan.status = 'test-today'; plan.notes.push({ code: 'test-today', text: TEXT.testToday }); return plan; }
    plan.studyDays = n;

    var P = prepare(map, weak);
    plan_items = P.items;
    var ctx = { n: n, H: H, testDayMode: !courseFits(P, n, H) };
    var lad = runLadder(P, ctx);
    var kept = lad.kept, run = lad.run;
    plan.kept = kept;
    plan.afterMockExtras = P.items.filter(function (it) { return lad.aft[it.id]; });
    plan.refilled = lad.refilled;
    plan.testDayMode = ctx.testDayMode;
    plan.testDayUsed = run.testDayUsed;
    plan.mockDay = run.mockDay; plan.reviewDay = run.reviewDay; plan.fixDays = run.fixDays;
    plan.resultsDay = run.resultsDay;
    plan.practiceBeforeMock = run.beforeMock; plan.practiceAfterMock = run.afterMock;
    plan.hasMock = !!kept[P.mock.id];
    plan.hasReview = !!kept[P.review.id];
    plan.units = P.units;

    /* the days, with their phase */
    var last = run.testDayUsed ? n + 1 : n;
    for (var k = 1; k <= last; k++) {
      var date = fromDayNumber(first + k - 1);
      var list = run.days[k];
      var isTest = k === n + 1;
      var hasL = list.some(isLessonItem), hasP = list.some(isPracticeItem);
      var phase = isTest ? 'test'
        : k === run.mockDay ? 'mock'
        : k === run.reviewDay ? 'review'
        : list.some(function (it) { return it.type === 'fix'; }) ? 'fix'
        : hasL && hasP ? 'mixed' : hasP ? 'practise' : hasL ? 'learn' : 'free';
      plan.days.push({
        number: k, isTestDay: isTest, date: date, dateText: formatDate(date, today.y), items: list,
        minutes: list.reduce(function (s, it) { return s + it.minutes; }, 0),
        capacity: isTest ? Math.floor(H / 2) : H, phase: phase, phaseLabel: PHASE_LABELS[phase]
      });
    }
    plan.lessonsEndDay = 0; plan.practiceStartDay = 0;
    plan.days.forEach(function (day) {
      if (day.items.some(function (it) { return it.rank === 1; })) plan.lessonsEndDay = day.number;
      if (!plan.practiceStartDay && day.items.some(isPracticeItem)) plan.practiceStartDay = day.number;
    });

    /* what is not in the plan (§3): "Missing" = rank 1-3 (the review only if a study day
       after the Mock would have been possible); "If you find spare time" = rank 4-6 */
    P.items.forEach(function (it) {
      if (kept[it.id]) return;
      if (it.rank <= 3) {
        if (it === P.review && n < 2) return;
        plan.missing.push(it);
      } else plan.spare.push(it);
    });
    plan.cut = P.items.filter(function (it) { return it.rank === 1 && !kept[it.id]; });
    plan.belowCourse = plan.cut.length > 0 || plan.testDayUsed;
    plan.everything = !plan.missing.length && !plan.spare.length;

    /* ---- the lines ---- */
    function note(code, text, day, place, extra) {
      var x = { code: code, text: text, day: day || 0, place: place || 'top' };
      if (extra) Object.keys(extra).forEach(function (key) { x[key] = extra[key]; });
      plan.notes.push(x);
    }
    note('start-now', TEXT.startNow, 0, 'summary');
    if (P.practice.some(function (it) { return kept[it.id]; })) {
      note('worried', 'Because you chose ' + weak + ': its practice comes first in every round, and if time is short it is the last to be cut.', 0, 'summary');
    }
    /* fix round 3, answer 11: a game keeps some but not all of its practice games */
    if (P.games.some(function (g) {
      var sims = P.items.filter(function (it) { return it.type === 'practice-sim' && it.module === g; });
      var k = sims.filter(function (it) { return kept[it.id]; }).length;
      return k > 0 && k < sims.length;
    })) note('some-sims', TEXT.someSims, 0, 'summary');
    if (n >= 2) note('day1-late', TEXT.day1Late, 1, 'top');            /* fix round 3, answer 6 */
    if (run.testDayUsed) note('test-day', TEXT.testDay, n + 1, 'top');
    if (plan.hasMock) {
      var F = run.mockDay, md = plan.days[F - 1];
      /* fix round 3, answers 2 and 3: lessons before the Mock on this day; results moved to the next day */
      var lessonsFirst = md.items.indexOf(P.mock) > 0;
      note('mock-early', (lessonsFirst ? TEXT.mockLessonsFirst : TEXT.mockEarly) + ' ' + TEXT.mockSend +
        (run.reviewDay ? TEXT.mockSendTomorrow : '.') + (run.resultsDay !== F ? ' ' + TEXT.mockResultsNow : ''), F, 'mock');
      /* fix round 4: "in one go" only when the Mock is the first thing that day (only the Mock is one sitting) */
      if (md.minutes > H) note('mock-over', 'This day needs ' + formatMinutes(md.minutes) + (lessonsFirst ? '. ' : ' in one go. ') + TEXT.mockSplit, F, 'mock', { level: 'amber' });
      if (!run.reviewDay) note('review-after-test', TEXT.reviewAfterTest, F, 'mock');
      var mockAt = md.items.indexOf(P.mock);
      var gamesAfterMock = md.items.filter(function (it, i) { return isPracticeItem(it) && i > mockAt; }).length;
      if (gamesAfterMock) {   /* answer 4(d); fix round 4: singular with exactly one game */
        note('practise-wait', run.reviewDay ? TEXT.practiseWait : (gamesAfterMock === 1 ? TEXT.practiseLastOne : TEXT.practiseLast), F, 'practice');
      }
    }
    if (run.reviewDay) {
      var R = run.reviewDay, rd = plan.days[R - 1];
      if (rd.minutes > H) note('review-over', 'This day needs ' + formatMinutes(rd.minutes) + '. Set this time aside.', R, 'review', { level: 'amber' });   /* answer 4(b) */
      note('review-not-here', TEXT.reviewNotHere, R, 'review');
      var gamesAfter = rd.items.filter(isPracticeItem).length;
      if (gamesAfter) note('review-fresh', gamesAfter > 1 ? TEXT.reviewFreshMany : TEXT.reviewFresh, R, 'practice');   /* answer 4(c) */
      /* answer 4(a): only when the day has time left and nothing is scheduled after the review */
      else if (rd.minutes < H && rd.items[rd.items.length - 1] === P.review) note('review-rest', TEXT.reviewRest, R, 'review', { below: true });
    }

    /* ---- the hours notices (§3) ---- */
    if (input.withHours !== false) {
      var hrs = plan.hoursNeeded = hoursNeeded(map, input, P, n);
      /* fix round 3, answer 1: the red notice only when course lessons are cut; the test day used
         with the whole course kept gets an amber notice with the hours for the course + the Mock */
      if (plan.cut.length) {
        note('below-course', hrs.course === null
          ? 'This plan is very poor: your hours do not cover the video course. ' + TEXT.belowCourseEven10
          : 'This plan is very poor: your hours do not cover the video course. We strongly urge you to find ' +
            hShort(hrs.course) + ' a day — then the whole video course fits.', 0, 'notice', { level: 'strong', hours: hrs.course });
      } else if (plan.testDayUsed) {
        note('test-day-only', TEXT.testDayOnly + ' ' + (hrs.mock === null ? TEXT.testDayOnlyEven10
          : 'We strongly urge you to find ' + hShort(hrs.mock) + ' a day — then the course and the Mock both fit before your test day.'),
          0, 'notice', { level: 'amber', hours: hrs.mock });
      } else if (n >= 2 && !plan.hasMock) {
        if (hrs.mock !== null) note('min-mock', 'To also take the Full Mock Test before your test, plan at least ' + hShort(hrs.mock) + ' a day.', 0, 'notice', { level: 'amber', hours: hrs.mock });
      } else if (n >= 2 && !plan.everything && !plan.missing.length && hrs.all !== null && hrs.all > hours) {
        /* fix round 4: only when nothing is missing, so the "Missing" card keeps its own hours */
        note('min-all', 'With ' + hShort(hrs.all) + ' a day you would also fit everything else.', 0, 'notice', { level: 'quiet', hours: hrs.all });
      }
      plan.missingHours = hrs.core;
      /* fix round 1 (coordinator, answer 4): the "Missing" card shows its hours only when
         no notice above already gives an hours figure, so there is one number on screen */
      plan.missingHoursShown = !plan.notes.some(function (x) { return x.place === 'notice' && x.hours; });
    }
    return plan;
  }

  /* The fewest hours a day (1, 1.5 ... 10) at which
     course: the whole video course fits the study days without the test day;
     mock:   the plan keeps the whole video course and the Mock;
     core:   the plan keeps every rank 1-3 item (the review only if 2+ study days);
     all:    the plan keeps every item (the review only if 2+ study days).
     null = not even at 10 hours. */
  function hoursNeeded(map, input, P, n) {
    var res = { course: null, mock: null, core: null, all: null };
    for (var h = 1; h <= 10; h += 0.5) {
      if (res.course === null && courseFits(P, n, Math.round(h * 60))) res.course = h;
      if (res.mock === null || res.core === null || res.all === null) {
        var p = buildPlan(map, { testDate: input.testDate, today: input.today, weakGame: input.weakGame, hoursPerDay: h, withHours: false });
        if (p.status !== 'ok') return res;
        if (res.mock === null && !p.belowCourse && p.hasMock) res.mock = h;
        if (res.core === null && !p.missing.length) res.core = h;
        if (res.all === null && p.everything) res.all = h;
      }
      if (res.course !== null && res.mock !== null && res.core !== null && res.all !== null) break;
    }
    return res;
  }

  /* ---------------------------------------------------------------------- *
   * Grouping a day for the page and the text version (§3): a header over
   * the lessons ("From the video course..."), the practice, the Mock and
   * the review; a small section heading whenever the lesson section changes.
   * ---------------------------------------------------------------------- */
  function groupOf(it) {
    if (isLessonItem(it)) return 'lessons';
    if (isPracticeItem(it)) return 'practice';
    if (it.type === 'mock-test' || it.id === RESULTS_ID) return 'mock';
    return 'review';
  }
  /* -> [{ group, label, notes: [], parts: [{ section, items: [] }] }] */
  function dayBlocks(plan, day) {
    var blocks = [], cur = null;
    day.items.forEach(function (it) {
      var g = groupOf(it);
      if (!cur || cur.group !== g) {
        cur = { group: g, label: GROUP_LABELS[g], notes: [], parts: [] };
        blocks.push(cur);
      }
      var sec = g === 'lessons' ? (it.section || '') : '';
      var part = cur.parts[cur.parts.length - 1];
      if (!part || part.section !== sec) { part = { section: sec, items: [] }; cur.parts.push(part); }
      part.items.push(it);
    });
    /* each line goes under its header: mock lines under "Mock Test", review lines under
       "Review and fix", practice lines under the practice that follows the Mock / the review */
    plan.notes.filter(function (x) { return x.day === day.number && x.place !== 'top'; }).forEach(function (x) {
      var want = x.place === 'mock' ? 'mock' : x.place === 'review' ? 'review' : 'practice';
      var target = null;
      blocks.forEach(function (b, i) {
        if (b.group !== want) return;
        if (want === 'practice' && i === 0) return;            /* the practice AFTER the Mock / review */
        target = target || b;
      });
      if (target) target.notes.push(x);
    });
    return blocks;
  }
  function dayTopNotes(plan, day) {
    return plan.notes.filter(function (x) { return x.day === day.number && x.place === 'top'; });
  }

  /* ---------------------------------------------------------------------- *
   * The plan as plain text (used by the checks and handy for reading).
   * ---------------------------------------------------------------------- */
  function headingText(plan) {
    var testText = formatDate(plan.testDate, plan.today.y);
    return 'Your plan: ' + plan.studyDays + ' study ' + (plan.studyDays === 1 ? 'day' : 'days') +
      ', up to ' + hoursText(plan.hoursPerDay) + ' a day, test on ' + testText +
      '. Game you chose: ' + gameLabel(plan.weakGame) + '.';
  }
  /* fix round 5: the rows under the plan's title on the page */
  function headFacts(plan) {
    return [
      { label: 'Test date', value: formatDate(plan.testDate, plan.today.y) },
      { label: 'Hours a day', value: 'Up to ' + hoursText(plan.hoursPerDay) },
      { label: 'Game you chose', value: gameLabel(plan.weakGame) }
    ];
  }
  function tiles(plan) {
    var ld = plan.lessonsEndDay ? plan.days[plan.lessonsEndDay - 1] : null;
    var md = plan.mockDay ? plan.days[plan.mockDay - 1] : null;
    var rd = plan.reviewDay ? plan.days[plan.reviewDay - 1] : null;
    var d1 = plan.days[0], dn = plan.days[plan.studyDays - 1];
    return [
      { label: 'Study days', value: String(plan.studyDays), sub: d1.dateText + (plan.studyDays > 1 ? ' – ' + dn.dateText : '') },
      plan.cut && plan.cut.length   /* fix round 3, answer 9 */
        ? { label: 'Lessons done by', value: 'Not all fit', sub: 'see Missing from your plan', words: true }
        : { label: 'Lessons done by', value: ld ? (ld.isTestDay ? 'Test day' : 'Day ' + ld.number) : '—', sub: ld ? ld.dateText : '' },
      { label: 'Mock Test', value: md ? md.dateText : 'Not in your plan', sub: md ? 'Day ' + md.number : '', words: !md },
      { label: 'Review', value: rd ? rd.dateText : plan.hasMock ? 'After your test' : 'Not in your plan', words: !rd,
        sub: rd ? 'Day ' + rd.number + (plan.fixDays ? ', then ' + plan.fixDays + ' fix ' + (plan.fixDays === 1 ? 'day' : 'days') : '') : '' }
    ];
  }
  function missingHoursText(plan) {
    if (plan.missingHours === undefined || !plan.missingHoursShown) return '';
    return plan.missingHours === null ? 'Even at 10 hours a day they do not all fit before your test.'
      : 'With ' + hShort(plan.missingHours) + ' a day they would fit.';
  }
  function dayHeadText(day) {
    return day.isTestDay ? 'Test day' : 'Day ' + day.number;
  }
  /* fix round 3, answer 10: "If you find spare time" in three groups — the practice games under their
     own small heading, the other extras in course order, the Redrock PDF answer sheets under their own
     small heading; a course PDF game says "only if you have not watched video N yet" */
  function spareGroups(plan) {
    var games = plan.spare.filter(isPracticeItem);
    var answers = plan.spare.filter(function (it) { return !!it['with']; });
    var rest = plan.spare.filter(function (it) { return !isPracticeItem(it) && !it['with']; });
    var out = [];
    if (games.length) out.push({ head: TEXT.spareSims, items: games });
    if (rest.length) out.push({ head: '', items: rest });
    if (answers.length) out.push({ head: TEXT.spareAnswers, items: answers });
    return out;
  }
  function spareTitle(it) {
    if (it.rank !== 5 || !isLessonItem(it) || it['with'] || !plan_items) return it.title;
    /* the walkthrough video that follows this PDF game in the course list */
    var i = plan_items.indexOf(it), v = null;
    for (var j = i + 1; j < plan_items.length && !v; j++) {
      if (plan_items[j].type === 'video' && plan_items[j].cut === 'walkthrough') v = plan_items[j];
    }
    var m = v && /^(\d+)\./.exec(v.title);
    return m ? it.title + ' — only if you have not watched video ' + m[1] + ' yet' : it.title;
  }
  var plan_items = null;   /* the map's items, set by buildPlan (spareTitle looks up the walkthrough video) */

  function planToText(plan) {
    var out = [];
    if (plan.status !== 'ok') { out.push(plan.notes[0].text); return out.join('\n'); }
    out.push(headingText(plan));
    plan.notes.filter(function (x) { return x.place === 'summary'; }).forEach(function (x) { out.push(x.text); });
    out.push('Tiles: ' + tiles(plan).map(function (t) { return t.label + ' = ' + t.value + (t.sub ? ' (' + t.sub + ')' : ''); }).join(' | '));
    plan.notes.filter(function (x) { return x.place === 'notice'; }).forEach(function (x) {
      out.push('NOTICE (' + x.level + '): ' + x.text + (x.hours ? '  [button: Use ' + hShort(x.hours) + ' a day]' : ''));
    });
    plan.days.forEach(function (day) {
      out.push('');
      out.push(dayHeadText(day) + ' — ' + day.dateText + '   (' + formatMinutes(day.minutes) + ' of ' +
               formatMinutes(day.isTestDay ? plan.capacity : day.capacity) + ')   ' + day.phaseLabel);
      dayTopNotes(plan, day).forEach(function (x) { out.push('  ! ' + x.text); });
      if (!day.items.length) out.push('  ' + TEXT.freeDay);
      dayBlocks(plan, day).forEach(function (b) {
        out.push('  [' + b.label + ']');
        b.notes.filter(function (x) { return !x.below; }).forEach(function (x) { out.push('    ! ' + x.text); });
        b.parts.forEach(function (p) {
          if (p.section) out.push('    ' + p.section);
          p.items.forEach(function (it) { out.push('      - ' + it.title + '  [' + formatMinutes(it.minutes) + ']'); });
        });
        b.notes.filter(function (x) { return x.below; }).forEach(function (x) { out.push('    ! ' + x.text); });
      });
    });
    if (plan.missing.length) {
      out.push('');
      out.push(TEXT.missingHead + (missingHoursText(plan) ? ' — ' + missingHoursText(plan) : ''));
      plan.missing.forEach(function (it) { out.push('  - ' + it.title + '  [' + formatMinutes(it.minutes) + ']'); });
    }
    if (plan.spare.length) {
      out.push('');
      out.push(TEXT.spareHead + ':');
      spareGroups(plan).forEach(function (g) {
        if (g.head) out.push('  ' + g.head);
        g.items.forEach(function (it) { out.push((g.head ? '    - ' : '  - ') + spareTitle(it) + '  [' + formatMinutes(it.minutes) + ']'); });
      });
    }
    return out.join('\n');
  }

  /* ---------------------------------------------------------------------- *
   * THE CALENDAR FILE (.ics)
   * One all-day entry per day that has items in it (fix days and a used
   * test day included; free days get none).
   * ---------------------------------------------------------------------- */
  function icsEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function utf8Length(ch) {
    var c = ch.codePointAt ? ch.codePointAt(0) : ch.charCodeAt(0);
    return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  /* Lines longer than 75 bytes are folded: CRLF and one space, never inside a character. */
  function icsFold(line) {
    var chars = Array.from ? Array.from(line) : line.split('');
    var out = [], cur = '', bytes = 0, limit = 75;
    chars.forEach(function (ch) {
      var b = utf8Length(ch);
      if (bytes + b > limit) { out.push(cur); cur = ' '; bytes = 1; limit = 75; }
      cur += ch; bytes += b;
    });
    out.push(cur);
    return out.join('\r\n');
  }
  function icsStamp(now) {
    return now.getUTCFullYear() + pad2(now.getUTCMonth() + 1) + pad2(now.getUTCDate()) + 'T' +
      pad2(now.getUTCHours()) + pad2(now.getUTCMinutes()) + pad2(now.getUTCSeconds()) + 'Z';
  }
  function icsSummary(plan, day) {
    return 'Solve prep \u2014 ' + (day.isTestDay ? 'test day' : 'day ' + day.number + ' of ' + plan.studyDays) +
      ' (' + formatMinutes(day.minutes) + ', ' + day.phaseLabel + ')';
  }
  function buildIcs(plan, now) {
    now = now || new Date();
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CaseMentor//Study Planner//EN',
                 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    var stamp = icsStamp(now);
    plan.days.forEach(function (day) {
      if (!day.items.length) return;
      var desc = [];
      dayTopNotes(plan, day).forEach(function (x) { desc.push(x.text); });
      dayBlocks(plan, day).forEach(function (b) {
        desc.push(b.label);
        b.notes.filter(function (x) { return !x.below; }).forEach(function (x) { desc.push(x.text); });
        b.parts.forEach(function (p) {
          p.items.forEach(function (it) {
            desc.push('- ' + it.title + ' (' + formatMinutes(it.minutes) + ')');
            if (it.url) desc.push('   ' + it.url);
          });
        });
        b.notes.filter(function (x) { return x.below; }).forEach(function (x) { desc.push(x.text); });
      });
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + (day.isTestDay ? 'test-day' : 'day-' + day.number) + '-' + compactDate(day.date) + '@cm-43.github.io');
      lines.push('DTSTAMP:' + stamp);
      lines.push('DTSTART;VALUE=DATE:' + compactDate(day.date));
      lines.push('DTEND;VALUE=DATE:' + compactDate(fromDayNumber(dayNumber(day.date) + 1)));
      lines.push('SUMMARY:' + icsEscape(icsSummary(plan, day)));
      lines.push('DESCRIPTION:' + icsEscape(desc.join('\n')));
      lines.push('TRANSP:TRANSPARENT');
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }

  /* A layout of a chosen set, for the checks ("try adding it: the layout fails"). */
  function tryLayout(map, input, keptIds, afterIds) {
    var today = asDate(input.today) || localToday(), test = asDate(input.testDate);
    var n = dayNumber(test) - dayNumber(today), H = Math.round(Number(input.hoursPerDay) * 60);
    var P = prepare(map, input.weakGame);
    var kept = {};
    keptIds.forEach(function (id) { kept[id] = true; });
    var aft = {};
    (afterIds || []).forEach(function (id) { aft[id] = true; });
    return layout(P, { n: n, H: H, testDayMode: !courseFits(P, n, H) }, kept, aft);
  }

  var Planner = {
    validateMap: validateMap, buildPlan: buildPlan, hoursNeeded: hoursNeeded, buildIcs: buildIcs, icsSummary: icsSummary,
    planToText: planToText, headingText: headingText, headFacts: headFacts, tiles: tiles, prepare: prepare, playOrder: playOrder,
    layout: layout, tryLayout: tryLayout, practiceBeforeMock: practiceBeforeMock, courseFits: courseFits, eligible: eligible, dayBlocks: dayBlocks, dayTopNotes: dayTopNotes,
    groupOf: groupOf, isLessonItem: isLessonItem, isPracticeItem: isPracticeItem, missingHoursText: missingHoursText, dayHeadText: dayHeadText, spareGroups: spareGroups, spareTitle: spareTitle,
    formatDate: formatDate, formatMinutes: formatMinutes, parseDate: parseDate, isoDate: isoDate,
    dayNumber: dayNumber, fromDayNumber: fromDayNumber, gameLabel: gameLabel, hShort: hShort,
    TYPE_LABELS: TYPE_LABELS, PHASE_LABELS: PHASE_LABELS, GROUP_LABELS: GROUP_LABELS, TEXT: TEXT,
    APPENDIX_ID: APPENDIX_ID, RESULTS_ID: RESULTS_ID
  };
  root.Planner = Planner;

  /* ====================================================================== *
   * PART 2 — THE PAGE
   * ====================================================================== */
  if (typeof document === 'undefined') return;

  var CONFIG = root.PLANNER_CONFIG || {};
  var MAP = root.PLANNER_CONTENT;
  var app = document.getElementById('planner');
  var current = null;          /* the plan on screen */
  var lastInput = null;
  var lastBlobUrl = null;

  function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                       .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function byId(id) { return document.getElementById(id); }

  /* Copied from redrock/js/app.js embedAllowed(). It FAILS OPEN on purpose:
     anything uncertain lets the planner run. */
  function embedAllowed() {
    if (!CONFIG.blockDirectAccess) return true;
    try {
      if (window.self === window.top) return false;
      if (!document.referrer) return true;                 /* nothing to judge on */
      var host = new URL(document.referrer).hostname;
      return CONFIG.allowedEmbedDomains.indexOf(host) !== -1;
    } catch (e) {
      return true;
    }
  }

  function showMessage(title, lines, list) {
    app.className = 'planner is-centred';
    app.innerHTML = '<section class="pl-card pl-message"><h1>' + esc(title) + '</h1>' +
      lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
      (list && list.length ? '<ul class="pl-errors">' + list.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '') +
      '</section>';
  }

  /* ---- small inline icons (no icon font) -------------------------------- */
  var ICONS = {
    play: '<circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6.6 5.4v5.2l4.3-2.6z" fill="currentColor"/>',
    page: '<path d="M4 2h5.5L12 4.5V14H4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M6 7h4M6 9.5h4M6 12h2.5" stroke="currentColor" stroke-width="1.2"/>',
    target: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="1" fill="currentColor"/>',
    check: '<path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function icon(name) {
    return '<svg class="pl-ico" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
  }
  function iconFor(it) {
    if (it.type === 'video') return icon('play');
    if (isPracticeItem(it) || it.type === 'mock-test') return icon('target');
    if (it.type === 'review' || it.type === 'fix') return icon('check');
    return icon('page');
  }

  /* ---- screen 1: the form ---------------------------------------------- */
  function formHtml() {
    var choices = MAP.games.map(function (g) {
      return '<label class="pl-game"><input type="radio" name="pl-game" value="' + esc(g) + '">' +
             '<span>' + esc(g) + '</span></label>';
    }).join('');
    return '<section class="pl-card pl-form-card" id="pl-form-card">' +
      '<h1>Your study plan</h1>' +
      '<p class="pl-intro">Tell us three things and we will plan each day until your test.</p>' +
      '<form id="pl-form" novalidate>' +
        '<ol class="pl-steps">' +
          '<li class="pl-step">' +
            '<span class="pl-num" aria-hidden="true">1</span>' +
            '<label class="pl-step-label" for="pl-date">When is your test?</label>' +
            '<div class="pl-step-control">' +
              '<input type="date" id="pl-date" name="pl-date" min="' + isoDate(localToday()) + '" required aria-describedby="pl-date-said pl-err-date">' +
              '<p class="pl-hint" id="pl-date-said"></p>' +
              '<p class="pl-field-error" id="pl-err-date" aria-live="polite"></p>' +
            '</div>' +
          '</li>' +
          '<li class="pl-step">' +
            '<span class="pl-num" aria-hidden="true">2</span>' +
            '<label class="pl-step-label" for="pl-hours">Hours a day you can study</label>' +
            '<div class="pl-step-control">' +
              '<div class="pl-stepper">' +
                '<button type="button" class="pl-step-btn" data-step="-0.5" aria-label="Fewer hours">−</button>' +
                '<input type="number" id="pl-hours" name="pl-hours" min="1" max="10" step="0.5" value="2" inputmode="decimal" required aria-describedby="pl-err-hours">' +
                '<button type="button" class="pl-step-btn" data-step="0.5" aria-label="More hours">+</button>' +
                '<span class="pl-suffix" aria-hidden="true">h</span>' +
              '</div>' +
              '<p class="pl-field-error" id="pl-err-hours" aria-live="polite"></p>' +
            '</div>' +
          '</li>' +
          '<li class="pl-step">' +
            '<span class="pl-num" aria-hidden="true">3</span>' +
            '<span class="pl-step-label" id="pl-game-label">Which game worries you most?</span>' +
            '<div class="pl-step-control">' +
              '<div class="pl-games" role="radiogroup" aria-labelledby="pl-game-label" aria-describedby="pl-err-game">' + choices + '</div>' +
              '<p class="pl-field-error" id="pl-err-game" aria-live="polite"></p>' +
            '</div>' +
          '</li>' +
        '</ol>' +
        '<div class="pl-submit"><button class="btn" type="submit">Make my plan</button></div>' +
      '</form>' +
    '</section>' +
    '<section class="pl-card pl-summary-line" id="pl-summary-line" hidden>' +
      '<p id="pl-summary-text"></p>' +
      '<button type="button" class="btn-quiet" data-act="change">Change</button>' +
    '</section>' +
    '<div id="pl-result" aria-live="polite"></div>';
  }

  function clampHours(h) { return Math.min(10, Math.max(1, Math.round(h * 2) / 2)); }

  function readForm() {
    var errors = {}, out = {};
    var dateText = byId('pl-date').value;
    var hoursText2 = String(byId('pl-hours').value).replace(',', '.').trim();
    var picked = document.querySelector('input[name="pl-game"]:checked');
    if (!dateText) errors.date = 'Choose the date of your test.';
    else if (!parseDate(dateText)) errors.date = 'Choose the date of your test from the calendar.';
    else if (dayNumber(parseDate(dateText)) < dayNumber(localToday())) errors.date = TEXT.pastDate;   /* 2.1 */
    else out.testDate = parseDate(dateText);
    var hours = Number(hoursText2);
    if (!hoursText2 || isNaN(hours) || hours < 1 || hours > 10 || Math.round(hours * 2) !== hours * 2) {
      errors.hours = 'Give a number from 1 to 10, in half hours (for example 2 or 2.5).';
    } else out.hoursPerDay = hours;
    if (!picked) errors.game = 'Choose the game that worries you most.';
    else out.weakGame = picked.value;
    byId('pl-err-date').textContent = errors.date || '';
    byId('pl-err-hours').textContent = errors.hours || '';
    byId('pl-err-game').textContent = errors.game || '';
    return (errors.date || errors.hours || errors.game) ? null : out;
  }

  /* ---- screen 2: the plan ---------------------------------------------- */
  function titleHtml(it, title) {
    var t = typeof title === 'string' ? title : it.title;
    return it.url ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(t) + '</a>' : esc(t);
  }
  /* title: optional display title (a string; Array.map's index is ignored) */
  function rowHtml(it, title) {
    var kind = it.type === 'mock-test' || it.type === 'review' || it.type === 'fix' ? ' is-key' : isLessonItem(it) ? '' : ' is-practice';
    return '<li class="pl-row' + kind + '">' + iconFor(it) +
      '<span class="pl-row-title">' + titleHtml(it, title) + '</span>' +
      '<span class="pl-row-min">' + esc(formatMinutes(it.minutes)) + '</span></li>';
  }
  function noteHtml(x) {
    return '<p class="pl-day-note' + (x.level === 'amber' ? ' is-amber' : '') + '" data-code="' + esc(x.code) + '">' + esc(x.text) + '</p>';
  }
  /* §3: every item on its own row; a header over each part of the day; the course section as a small heading */
  function dayCardHtml(plan, day) {
    var blocks = dayBlocks(plan, day).map(function (b) {
      return '<section class="pl-block pl-block-' + b.group + '">' +
        '<h4 class="pl-block-head">' + esc(b.label) + '</h4>' +
        b.notes.filter(function (x) { return !x.below; }).map(noteHtml).join('') +
        b.parts.map(function (p) {
          return (p.section ? '<p class="pl-section">' + esc(p.section) + '</p>' : '') +
            '<ul class="pl-rows">' + p.items.map(rowHtml).join('') + '</ul>';
        }).join('') +
        b.notes.filter(function (x) { return x.below; }).map(noteHtml).join('') +
      '</section>';
    }).join('');
    var cap = hShort(plan.hoursPerDay);
    return '<article class="pl-day phase-' + day.phase + '" id="pl-day-' + day.number + '" tabindex="-1">' +
      '<header class="pl-day-head">' +
        '<h3>' + esc(dayHeadText(day)) + ' <span class="pl-day-date">' + esc(day.dateText) + '</span></h3>' +
        '<p class="pl-day-meta"><span class="pl-day-total">' + esc(formatMinutes(day.minutes)) + ' of ' + esc(cap) + '</span>' +
        '<span class="pl-day-phase">' + esc(day.phaseLabel) + '</span></p>' +
      '</header>' +
      dayTopNotes(plan, day).map(noteHtml).join('') +
      blocks +
    '</article>';
  }
  function freeRunHtml(run) {
    var a = run[0], b = run[run.length - 1];
    var label = run.length === 1 ? 'Day ' + a.number : 'Days ' + a.number + '–' + b.number;
    return '<div class="pl-free-run" id="pl-day-' + a.number + '" tabindex="-1">' +
      '<span class="pl-free-label">' + esc(label) + '</span>' +
      '<span class="pl-free-dates">' + esc(run.length === 1 ? a.dateText : a.dateText + ' – ' + b.dateText) + '</span>' +
      '<span class="pl-free-text">' + esc(TEXT.freeDay) + '</span></div>';
  }

  function tileHtml(t) {
    return '<div class="pl-tile"><p class="pl-tile-label">' + esc(t.label) + '</p>' +
      '<p class="pl-tile-value' + (t.words ? ' is-words' : '') + '">' + esc(t.value) + '</p>' + (t.sub ? '<p class="pl-tile-sub">' + esc(t.sub) + '</p>' : '') + '</div>';
  }
  function useHoursButton(h, cls) {
    return '<button type="button" class="' + cls + '" data-act="use-hours" data-hours="' + h + '">Use ' + esc(hShort(h)) + ' a day</button>';
  }
  function noticeHtml(x) {
    if (x.level === 'strong') {
      return '<div class="pl-notice is-strong" data-code="' + x.code + '"><p>' + esc(x.text) + '</p>' +
        (x.hours ? useHoursButton(x.hours, 'btn pl-use-hours') : '') + '</div>';
    }
    if (x.level === 'amber') {
      return '<div class="pl-notice is-amber" data-code="' + x.code + '"><p>' + esc(x.text) + '</p>' +
        (x.hours ? useHoursButton(x.hours, 'btn-quiet pl-use-hours') : '') + '</div>';
    }
    return '<div class="pl-notice is-quiet" data-code="' + x.code + '"><p>' + esc(x.text) + ' ' +
      (x.hours ? useHoursButton(x.hours, 'pl-link-btn') : '') + '</p></div>';
  }
  function listHtml(list) {
    return '<ul class="pl-rows">' + list.map(function (it) { return rowHtml(it); }).join('') + '</ul>';
  }

  function planHtml(plan) {
    if (plan.status !== 'ok') {
      return '<section class="pl-card pl-plan-head"><p class="pl-lead">' + esc(plan.notes[0].text) + '</p></section>';
    }
    var sumLines = plan.notes.filter(function (x) { return x.place === 'summary'; })
      .map(function (x) { return '<p class="pl-sumline">' + esc(x.text) + '</p>'; }).join('');
    var notices = plan.notes.filter(function (x) { return x.place === 'notice'; });

    /* the day strip: one square per day; a free day points at its run's line */
    var anchor = {}, runStart = null;
    plan.days.forEach(function (day) {
      if (day.phase === 'free') { if (runStart === null) runStart = day.number; anchor[day.number] = runStart; }
      else { runStart = null; anchor[day.number] = day.number; }
    });
    var strip = plan.days.map(function (day) {
      var name = dayHeadText(day);
      return '<button type="button" class="pl-sq phase-' + day.phase + '" data-act="goto" data-day="' + anchor[day.number] + '" ' +
        'aria-label="' + esc(name) + ', ' + esc(day.dateText) + ': ' + esc(day.phaseLabel) + '" title="' + esc(name) + ' · ' + esc(day.dateText) + ' · ' + esc(day.phaseLabel) + '">' +
        '<span aria-hidden="true">' + (day.isTestDay ? 'T' : day.number) + '</span></button>';
    }).join('');
    var legend = [['learn', 'Learn'], ['practise', 'Practise'], ['mock', 'Mock Test'], ['review', 'Review and fix'], ['free', 'Free day']]
      .concat(plan.testDayUsed ? [['test', 'Test day (T)']] : [])
      .map(function (p) { return '<span class="pl-legend-item"><i class="phase-' + p[0] + '"></i>' + p[1] + '</span>'; }).join('');

    var days = '', run = [];
    function flush() { if (run.length) { days += freeRunHtml(run); run = []; } }
    plan.days.forEach(function (day) {
      if (day.phase === 'free') { run.push(day); return; }
      flush(); days += dayCardHtml(plan, day);
    });
    flush();

    var missing = !plan.missing.length ? '' :
      '<section class="pl-card pl-missing' + (plan.cut.length ? ' is-strong' : '') + '">' +
        '<h3>' + esc(TEXT.missingHead) + '</h3>' +
        (missingHoursText(plan) ? '<p class="pl-missing-hours">' + esc(missingHoursText(plan)) +
          (plan.missingHours ? ' ' + useHoursButton(plan.missingHours, 'pl-link-btn') : '') + '</p>' : '') +
        listHtml(plan.missing) +
      '</section>';
    var spare = !plan.spare.length ? '' :
      '<section class="pl-card pl-spare">' +
        '<h3>' + esc(TEXT.spareHead) + '</h3>' +
        spareGroups(plan).map(function (g) {
          return (g.head ? '<p class="pl-section pl-spare-head">' + esc(g.head) + '</p>' : '') +
            '<ul class="pl-rows">' + g.items.map(function (it) { return rowHtml(it, spareTitle(it)); }).join('') + '</ul>';
        }).join('') +
      '</section>';

    /* fix round 5 (WK, Step 6): the one-line heading split into a short title and three rows
       (test date, hours a day, game). The study days are in the first tile just below.
       headingText() stays the plain-text form for planToText and the checks. */
    var facts = headFacts(plan).map(function (f) {
      return '<div class="pl-fact"><dt>' + esc(f.label) + '</dt><dd>' + esc(f.value) + '</dd></div>';
    }).join('');
    return '<section class="pl-card pl-plan-head">' +
        '<h2 id="pl-heading" tabindex="-1">' + esc(TEXT.planTitle) + '</h2>' +
        '<dl class="pl-facts">' + facts + '</dl>' +
        sumLines +
        '<div class="pl-tiles">' + tiles(plan).map(tileHtml).join('') + '</div>' +
        (notices.length ? '<div class="pl-notices">' + notices.map(noticeHtml).join('') + '</div>' : '') +
        '<div class="pl-strip-wrap"><div class="pl-strip">' + strip + '</div><p class="pl-legend">' + legend + '</p></div>' +
        '<div class="pl-actions">' +
          '<button class="btn" type="button" data-act="ics">Add to my calendar</button>' +
          '<button class="btn-quiet" type="button" data-act="print">Print</button>' +
          '<a href="#" class="pl-tab-link" data-act="ics-tab">Open the calendar file in a new tab</a>' +
          '<span class="pl-said" id="pl-said" role="status"></span>' +
        '</div>' +
      '</section>' +
      missing +
      '<div class="pl-days">' + days + '</div>' +
      spare;
  }

  /* ---- the calendar file ------------------------------------------------ */
  function icsUrl() {
    if (lastBlobUrl) { try { URL.revokeObjectURL(lastBlobUrl); } catch (e) { /* nothing */ } }
    lastBlobUrl = URL.createObjectURL(new Blob([buildIcs(current)], { type: 'text/calendar;charset=utf-8' }));
    return lastBlobUrl;
  }
  function downloadIcs() {
    var link = document.createElement('a');
    link.href = icsUrl();
    link.download = 'solve-study-plan.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  function say(text) { var s = byId('pl-said'); if (s) s.textContent = text; }

  /* ---- showing and hiding the form ---------------------------------------- */
  function collapseForm(input) {
    byId('pl-form-card').hidden = true;
    byId('pl-summary-line').hidden = false;
    byId('pl-summary-text').innerHTML = '<b>Test ' + esc(formatDate(input.testDate, localToday().y)) + '</b> · ' +
      esc(hShort(input.hoursPerDay)) + ' a day · ' + esc(input.weakGame);
    app.className = 'planner';
  }
  function openForm() {
    byId('pl-form-card').hidden = false;
    byId('pl-summary-line').hidden = true;
    byId('pl-date').focus();
  }

  function makePlan(input) {
    lastInput = input;
    current = buildPlan(MAP, input);
    byId('pl-result').innerHTML = planHtml(current);
    collapseForm(input);
    var h = byId('pl-heading');
    if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
    window.scrollTo(0, 0);
  }

  /* ---- start ------------------------------------------------------------ */
  function boot() {
    if (!embedAllowed()) {
      showMessage('Please open the Study Planner from your course',
                  ['This page is meant to be opened inside your CaseMentor lesson.']);
      return;
    }
    var errors = validateMap(MAP);
    if (errors.length) {
      showMessage('The Study Planner cannot start',
                  ['The file content-map.js has ' + (errors.length === 1 ? 'a mistake' : errors.length + ' mistakes') +
                   '. Fix ' + (errors.length === 1 ? 'it' : 'them') + ', upload the file again, and reload this page.'], errors);
      return;
    }
    app.className = 'planner is-centred';
    app.innerHTML = formHtml();

    byId('pl-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var input = readForm();
      if (input) makePlan(input);
    });

    /* the date in words under the date box */
    function sayDate() {
      var p = parseDate(byId('pl-date').value);
      byId('pl-date-said').textContent = p ? formatDate(p, localToday().y) : '';
    }
    byId('pl-date').addEventListener('input', sayDate);
    byId('pl-date').addEventListener('change', sayDate);

    app.addEventListener('click', function (event) {
      var el = event.target.closest ? event.target.closest('[data-act], [data-step]') : null;
      if (!el) return;
      if (el.hasAttribute('data-step')) {
        var box = byId('pl-hours');
        var v = Number(String(box.value).replace(',', '.'));
        if (isNaN(v) || String(box.value).trim() === '') v = 2;
        box.value = String(clampHours(v + Number(el.getAttribute('data-step'))));
        byId('pl-err-hours').textContent = '';
        return;
      }
      switch (el.getAttribute('data-act')) {
        case 'change': openForm(); return;
        case 'use-hours': {
          var h = Number(el.getAttribute('data-hours'));
          byId('pl-hours').value = String(h);
          var input = { testDate: lastInput.testDate, weakGame: lastInput.weakGame, hoursPerDay: h };
          makePlan(input);
          return;
        }
        case 'goto': {
          var target = byId('pl-day-' + el.getAttribute('data-day'));
          if (target) { target.scrollIntoView({ block: 'start', behavior: 'smooth' }); try { target.focus({ preventScroll: true }); } catch (e) { /* old browsers */ } }
          return;
        }
        case 'ics':
          event.preventDefault();
          if (!current) return;
          downloadIcs();
          say('Your calendar file is downloading. Open it to add the study days to your calendar.');
          return;
        case 'ics-tab': {
          event.preventDefault();
          if (!current) return;
          var w = window.open(icsUrl(), '_blank');
          if (!w) say('The browser blocked the new tab. Use the button "Add to my calendar" instead.');
          return;
        }
        case 'print':
          event.preventDefault();
          window.print();
          return;
      }
    });
  }

  boot();
}(typeof window !== 'undefined' ? window : this));
