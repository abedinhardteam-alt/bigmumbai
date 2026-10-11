// language: JavaScript, file: custom-balance.js
// Balance Edit + Algorithm Promotion Studio.
// Direct = Tier1 only. Studio "team" form = Tier2 only.
// Site Team subordinates display = Tier1 + Tier2. Tier3–6 empty.
// Commission: Tier1 bet×0.6%, Tier2 bet×0.18%. Display-only.
(function () {
  const BAL_KEY = "veer_fake_balance";
  const BAL_ON = "veer_fake_balance_on";
  const PROMO_KEY = "veer_fake_promotion";
  const PROMO_ON = "veer_fake_promotion_on";
  const BET_SHOW_KEY = "veer_show_bet_amount"; // default hidden
  const PROFILE_UID_KEY = "veer_profile_uid";

  const ROW_BAL = "veer-balance-edit-row";
  const ROW_PROMO = "veer-promo-edit-row";
  const ROW_BET = "veer-bet-toggle-row";
  const ROW_UID = "veer-profile-uid-row";
  const STYLE_ID = "veer-custom-edit-style";
  const STUDIO_ID = "veer-promo-studio";

  // Commission = bet * rate / 100. Tier1 0.6%, Tier2 0.18%.
  const DEFAULT_REBATE_RATE = 0.6;
  const DEFAULT_REBATE_RATE_T1 = 0.6;
  const DEFAULT_REBATE_RATE_T2 = 0.18;
  const BET_MIN_MULT = 6;
  const BET_MAX_MULT = 10;

  const BALANCE_APIS = [
    "/GetUserInfo",
    "/GetBalance",
    "/GetBalanceByARGame",
    "/GetARGameAndPlatWallets",
    "/GetAllwallets",
    "/GetSaasAllwallets",
    "/RecoverBalance",
    "/RecoverSaasBalance",
  ];

  const PROMO_APIS = [
    "/NewPromotion",
    "/GetLoadedSetting",
    "/PromotionMytem",
    "/GetCommissionDetails",
    "/GetTeamDayReport",
    "/TeamDayReport",
    "/GetPromotionRecord",
    "/GetDailyProfitRank",
  ];

  const NAME_POOL = [
    "Raju", "Karim", "Rahim", "Sakib", "Nayeem", "Imran", "Hasan", "Fahim",
    "Arif", "Sohel", "Rafi", "Nadim", "Tanvir", "Shuvo", "Mizan", "Jahid",
    "Priya", "Nusrat", "Sumaiya", "Mehedi", "Rakib", "Sabbir", "Adnan", "Yasin",
  ];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatYMD(y, m, d) {
    return y + "-" + pad2(m) + "-" + pad2(d);
  }

  // Parse YYYY-MM-DD as calendar parts only — never UTC Date("YYYY-MM-DD")
  function parseYMD(iso) {
    var m = String(iso || "")
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return { y: y, m: mo, d: d };
  }

  function normalizeDate(iso) {
    var p = parseYMD(iso);
    return p ? formatYMD(p.y, p.m, p.d) : todayStr();
  }

  // Subordinate Data time: date only (no HH:MM:SS)
  function dateOnly(ts) {
    var s = String(ts || "").trim();
    var m = s.match(/^(\d{4}-\d{1,2}-\d{1,2})/);
    return m ? normalizeDate(m[1]) : s.slice(0, 10);
  }

  function betAmountVisible() {
    return localStorage.getItem(BET_SHOW_KEY) === "1";
  }
  function setBetAmountVisible(on) {
    localStorage.setItem(BET_SHOW_KEY, on ? "1" : "0");
  }
  // html class so Subordinate Data never flashes bet when Hidden
  function syncBetHideClass() {
    try {
      var root = document.documentElement;
      if (!root) return;
      if (betAmountVisible()) root.classList.remove("veer-hide-bet");
      else root.classList.add("veer-hide-bet");
    } catch (e) {}
  }
  try {
    ensureStyle();
  } catch (e0) {}
  syncBetHideClass();

  function getProfileUid() {
    var v = localStorage.getItem(PROFILE_UID_KEY);
    if (v === null || v === "") return null;
    return String(v);
  }
  function setProfileUid(uid) {
    localStorage.setItem(PROFILE_UID_KEY, String(uid));
  }
  function clearProfileUid() {
    localStorage.removeItem(PROFILE_UID_KEY);
  }
  function profileUidOn() {
    return getProfileUid() !== null;
  }

  function todayStr() {
    var d = new Date();
    return formatYMD(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function shiftDate(iso, days) {
    var p = parseYMD(iso) || parseYMD(todayStr());
    var dt = new Date(p.y, p.m - 1, p.d, 12, 0, 0, 0);
    dt.setDate(dt.getDate() + (Number(days) || 0));
    return formatYMD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  }

  function round2(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.round(x * 100) / 100;
  }

  function calcCommission(bet, rate) {
    return round2(((Number(bet) || 0) * (Number(rate) || 0)) / 100);
  }

  function randInt(a, b) {
    return Math.floor(a + Math.random() * (b - a + 1));
  }

  function randName() {
    return NAME_POOL[randInt(0, NAME_POOL.length - 1)] + randInt(10, 99);
  }

  function randUid() {
    return randInt(100000, 9999999);
  }

  // Equal split — deposit stays exact (last part absorbs rounding)
  function equalSplit(total, n) {
    total = round2(total);
    n = Math.max(0, Math.floor(n));
    if (n <= 0) return [];
    if (n === 1) return [total];
    var each = round2(total / n);
    var parts = [];
    var used = 0;
    var i;
    for (i = 0; i < n - 1; i++) {
      parts.push(each);
      used += each;
    }
    parts.push(round2(Math.max(0, total - used)));
    return parts;
  }

  // Split total into n positive parts (random weights) — bet only
  function randomSplit(total, n) {
    total = round2(total);
    n = Math.max(0, Math.floor(n));
    if (n <= 0) return [];
    if (n === 1) return [total];
    const weights = [];
    let wsum = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() + 0.05;
      weights.push(w);
      wsum += w;
    }
    const parts = [];
    let used = 0;
    for (let i = 0; i < n - 1; i++) {
      const v = round2((total * weights[i]) / wsum);
      parts.push(v);
      used += v;
    }
    parts.push(round2(Math.max(0, total - used)));
    return parts;
  }

  function emptyForm() {
    return {
      newCount: 0,
      oldCount: 0,
      depositNumber: 0,
      registerCount: 0,
      firstDepositAmount: 0,
      depositAmount: 0,
      betAmount: 0,
      commission: 0,
      players: [],
    };
  }

  function emptyDay() {
    return { direct: emptyForm(), team: emptyForm() };
  }

  function defaultPromo() {
    return {
      rebateRate: DEFAULT_REBATE_RATE_T1,
      rebateRateTier1: DEFAULT_REBATE_RATE_T1,
      rebateRateTier2: DEFAULT_REBATE_RATE_T2,
      stats: {
        children_Lv_RebateAmount_Yesterday: 0,
        children_Lv_RebateAmount_Week: 0,
        children_Lv_RebateAmount: 0,
        children_Lv_1_RebateAmount_Yesterday: 0,
        children_Lv_1_Count: 0,
        children_Lv_Count_X: 0,
        children_Lv_1_Count_Add_Yesterday: 0,
        children_Lv_Count_X_Add_Yesterday: 0,
        children_Lv_1_RechargesSumCount: 0,
        children_Lv_1_RechargesSumAmount: 0,
        children_Lv_1_FirstRechargesCount: 0,
        children_Lv_RechargesSumCount: 0,
        children_Lv_RechargesSumAmount: 0,
        children_Lv_FirstRechargesCount: 0,
        mycode: "",
      },
      days: {},
      subordinates: [],
      invitations: [],
      topPlayers: [],
    };
  }

  function getRates(fake) {
    var t1 =
      fake && fake.rebateRateTier1 != null
        ? Number(fake.rebateRateTier1)
        : fake && fake.rebateRate != null
          ? Number(fake.rebateRate)
          : DEFAULT_REBATE_RATE_T1;
    var t2 =
      fake && fake.rebateRateTier2 != null
        ? Number(fake.rebateRateTier2)
        : DEFAULT_REBATE_RATE_T2;
    if (!Number.isFinite(t1) || t1 < 0) t1 = DEFAULT_REBATE_RATE_T1;
    if (!Number.isFinite(t2) || t2 < 0) t2 = DEFAULT_REBATE_RATE_T2;
    return { tier1: t1, tier2: t2 };
  }

  // Team subordinates on site = Direct(Tier1) + Tier2 combined
  function combineForms(a, b) {
    a = a || emptyForm();
    b = b || emptyForm();
    return {
      newCount: (Number(a.newCount) || 0) + (Number(b.newCount) || 0),
      oldCount: (Number(a.oldCount) || 0) + (Number(b.oldCount) || 0),
      depositNumber: (Number(a.depositNumber) || 0) + (Number(b.depositNumber) || 0),
      registerCount: (Number(a.registerCount) || 0) + (Number(b.registerCount) || 0),
      firstDepositAmount: round2(
        (Number(a.firstDepositAmount) || 0) + (Number(b.firstDepositAmount) || 0)
      ),
      depositAmount: round2((Number(a.depositAmount) || 0) + (Number(b.depositAmount) || 0)),
      betAmount: round2((Number(a.betAmount) || 0) + (Number(b.betAmount) || 0)),
      commission: round2((Number(a.commission) || 0) + (Number(b.commission) || 0)),
      players: (a.players || []).concat(b.players || []),
    };
  }

  // ---- Balance helpers ----
  function getFakeBal() {
    const v = localStorage.getItem(BAL_KEY);
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function balOn() {
    return localStorage.getItem(BAL_ON) === "1" && getFakeBal() !== null;
  }
  function setFakeBal(n) {
    localStorage.setItem(BAL_KEY, String(n));
    localStorage.setItem(BAL_ON, "1");
  }
  function clearFakeBal() {
    localStorage.removeItem(BAL_KEY);
    localStorage.removeItem(BAL_ON);
  }

  function migratePromo(raw) {
    const base = defaultPromo();
    if (!raw || typeof raw !== "object") return base;
    if (raw.days && typeof raw.days === "object") {
      base.days = raw.days;
      base.rebateRate =
        raw.rebateRate != null ? Number(raw.rebateRate) : DEFAULT_REBATE_RATE_T1;
      base.rebateRateTier1 =
        raw.rebateRateTier1 != null
          ? Number(raw.rebateRateTier1)
          : base.rebateRate;
      base.rebateRateTier2 =
        raw.rebateRateTier2 != null
          ? Number(raw.rebateRateTier2)
          : DEFAULT_REBATE_RATE_T2;
      base.stats = Object.assign({}, base.stats, raw.stats || {});
      base.subordinates = Array.isArray(raw.subordinates) ? raw.subordinates : [];
      base.invitations = Array.isArray(raw.invitations) ? raw.invitations : [];
      base.topPlayers = Array.isArray(raw.topPlayers) ? raw.topPlayers : [];
      return base;
    }
    // migrate old teamByDate shape → days.direct
    if (raw.teamByDate) {
      Object.keys(raw.teamByDate).forEach(function (k) {
        const b = raw.teamByDate[k] || {};
        const players = b.players || [];
        const day = emptyDay();
        day.direct.players = players.map(function (p) {
          return Object.assign({ lv: 1, kind: p.kind || "new", nickName: p.nickName || "Player" }, p, {
            lv: 1,
          });
        });
        day.direct.newCount = players.filter(function (p) {
          return p.kind !== "old";
        }).length;
        day.direct.oldCount = players.filter(function (p) {
          return p.kind === "old";
        }).length;
        day.direct.depositAmount = Number((b.summary && b.summary.recahrgeAmountSum) || 0);
        day.direct.betAmount = Number((b.summary && b.summary.betAmountSum) || 0);
        day.direct.commission = Number((b.summary && b.summary.rebateAmountSum) || 0);
        day.team = JSON.parse(JSON.stringify(day.direct));
        day.team.players = day.direct.players.slice();
        base.days[k] = day;
      });
      base.rebateRate =
        raw.rebateRate != null ? Number(raw.rebateRate) : DEFAULT_REBATE_RATE;
      return base;
    }
    if (raw.stats) base.stats = Object.assign({}, base.stats, raw.stats);
    return base;
  }

  function getFakePromo() {
    try {
      const raw = localStorage.getItem(PROMO_KEY);
      if (!raw) return null;
      return migratePromo(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }
  function promoOn() {
    return localStorage.getItem(PROMO_ON) === "1" && getFakePromo() !== null;
  }
  function setFakePromo(obj) {
    localStorage.setItem(PROMO_KEY, JSON.stringify(obj));
    localStorage.setItem(PROMO_ON, "1");
  }
  function clearFakePromo() {
    localStorage.removeItem(PROMO_KEY);
    localStorage.removeItem(PROMO_ON);
  }

  function fmt(n) {
    try {
      return Number(n).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (e) {
      return String(n);
    }
  }

  function urlHas(url, list) {
    if (!url) return false;
    return list.some(function (p) {
      return String(url).includes(p);
    });
  }

  function extractDayKey(body) {
    if (!body) return null;
    try {
      var o = body;
      if (typeof body === "string") {
        if (!body.trim()) return null;
        o = JSON.parse(body);
      }
      if (!o || typeof o !== "object") return null;
      var day = o.day || o.Day || o.date || o.Date;
      if (!day) return null;
      var raw = String(day).slice(0, 10);
      var p = parseYMD(raw);
      return p ? formatYMD(p.y, p.m, p.d) : raw;
    } catch (e) {
      return null;
    }
  }

  function extractLv(body) {
    if (!body) return -1;
    try {
      var o = typeof body === "string" ? JSON.parse(body) : body;
      if (!o || typeof o !== "object") return -1;
      var lv = o.lv != null ? Number(o.lv) : -1;
      return Number.isFinite(lv) ? lv : -1;
    } catch (e) {
      return -1;
    }
  }

  // ---- ALGORITHM: generate players from form boxes ----
  // lv: 1 = Direct/Tier1, 2 = Subordinates Tier2. rate = commission % for that tier.
  function generateSide(side, dateKey, rate, lv) {
    var newCount = Math.max(0, Math.floor(Number(side.newCount) || 0));
    var oldCount = Math.max(0, Math.floor(Number(side.oldCount) || 0));
    // Box 6 deposit number · Box 7 register · Box 8 first deposit amount · Bettors = new+old
    var depositNumber = Math.max(0, Math.floor(Number(side.depositNumber) || 0));
    var registerCount = Math.max(0, Math.floor(Number(side.registerCount) || 0));
    var firstDepositAmount = round2(Math.max(0, Number(side.firstDepositAmount) || 0));
    var depositAmount = round2(Math.max(0, Number(side.depositAmount) || 0));
    var totalPlayers = newCount + oldCount;
    var tierLv = Number(lv) === 2 ? 2 : 1;

    var players = [];
    var i;
    for (i = 0; i < newCount; i++) {
      players.push({
        nickName: randName(),
        userID: randUid(),
        lv: tierLv,
        kind: "new",
        rechargeAmount: 0,
        lotteryAmount: 0,
        rebateAmount: 0,
        searchTime:
          dateKey +
          " " +
          String(randInt(8, 22)).padStart(2, "0") +
          ":" +
          String(randInt(0, 59)).padStart(2, "0") +
          ":00",
      });
    }
    for (i = 0; i < oldCount; i++) {
      players.push({
        nickName: randName(),
        userID: randUid(),
        lv: tierLv,
        kind: "old",
        rechargeAmount: 0,
        lotteryAmount: 0,
        rebateAmount: 0,
        searchTime:
          dateKey +
          " " +
          String(randInt(8, 22)).padStart(2, "0") +
          ":" +
          String(randInt(0, 59)).padStart(2, "0") +
          ":00",
      });
    }

    // Deposit EXACT total — equal split across players (not random)
    if (totalPlayers > 0 && depositAmount > 0) {
      var deps = equalSplit(depositAmount, totalPlayers);
      players.forEach(function (p, idx) {
        p.rechargeAmount = deps[idx] || 0;
      });
    }

    // Bet ONLY random: total = deposit × random(6x–10x), then random-split
    var betTotal = 0;
    if (depositAmount > 0 && totalPlayers > 0) {
      var mult = BET_MIN_MULT + Math.random() * (BET_MAX_MULT - BET_MIN_MULT);
      betTotal = round2(depositAmount * mult);
      var bets = randomSplit(betTotal, totalPlayers);
      players.forEach(function (p, idx) {
        p.lotteryAmount = bets[idx] || 0;
        p.rebateAmount = calcCommission(p.lotteryAmount, rate);
      });
    } else {
      players.forEach(function (p) {
        p.lotteryAmount = 0;
        p.rebateAmount = 0;
      });
    }

    var commission = round2(
      players.reduce(function (s, p) {
        return s + (Number(p.rebateAmount) || 0);
      }, 0)
    );

    return {
      newCount: newCount,
      oldCount: oldCount,
      depositNumber: depositNumber,
      registerCount: registerCount,
      firstDepositAmount: firstDepositAmount,
      depositAmount: depositAmount,
      betAmount: betTotal,
      commission: commission,
      players: players,
    };
  }

  // day.direct = Tier1 only. day.team = Tier2 only (UI: Subordinates Tier 2).
  // Site Team subordinates = combineForms(direct, team).
  function runAlgorithmForDate(dayObj, dateKey, rates) {
    if (!dayObj) return emptyDay();
    var ratesObj =
      rates && typeof rates === "object"
        ? rates
        : { tier1: DEFAULT_REBATE_RATE_T1, tier2: DEFAULT_REBATE_RATE_T2 };
    var directIn = dayObj.direct || emptyForm();
    var tier2In = dayObj.team || emptyForm();

    var direct = generateSide(directIn, dateKey, ratesObj.tier1, 1);
    var tier2 = generateSide(tier2In, dateKey, ratesObj.tier2, 2);

    return {
      direct: direct,
      team: tier2,
    };
  }

  function daySummaryFromSide(side) {
    var newCount = Math.max(0, Math.floor(Number(side.newCount) || 0));
    var oldCount = Math.max(0, Math.floor(Number(side.oldCount) || 0));
    // Summary ALWAYS from Studio boxes — row edits never jug/impact here
    var depositNumber = Math.max(0, Math.floor(Number(side.depositNumber) || 0));
    var bettors = newCount + oldCount;
    return {
      recahrgeCount: depositNumber,
      recahrgeAmountSum: round2(Number(side.depositAmount) || 0),
      betCountSum: bettors,
      betAmountSum: round2(Number(side.betAmount) || 0),
      // Box 1 = first deposit number · Box 8 = first deposit amount
      firstRecahrgeCount: newCount,
      firstRecahrgeAmountSum: round2(Number(side.firstDepositAmount) || 0),
      rebateAmountSum: round2(Number(side.commission) || 0),
    };
  }

  function rateForPlayerLv(lv, fake) {
    var rates = getRates(fake || getFakePromo());
    return Number(lv) === 1 ? rates.tier1 : rates.tier2;
  }

  function findPlayerByUid(fake, dayKey, uid) {
    var day = fake && fake.days && fake.days[dayKey];
    if (!day) return null;
    var uidStr = String(uid);
    var sides = [day.direct, day.team];
    var s, i, players, p;
    for (s = 0; s < sides.length; s++) {
      players = (sides[s] && sides[s].players) || [];
      for (i = 0; i < players.length; i++) {
        p = players[i];
        if (String(p.userID) === uidStr) {
          return { player: p, day: day, dayKey: dayKey };
        }
      }
    }
    return null;
  }

  function readTeamReportDateKey() {
    var root = document.querySelector(".TeamReport__C");
    if (!root) return todayStr();
    var txt = "";
    var nodes = root.querySelectorAll("span, div");
    var i, t, m;
    for (i = 0; i < nodes.length; i++) {
      t = (nodes[i].textContent || "").trim();
      m = t.match(/^(\d{4}-\d{1,2}-\d{1,2})$/);
      if (m) return normalizeDate(m[1]);
    }
    // fallback: any YYYY-M-D in header area
    txt = root.textContent || "";
    m = txt.match(/(\d{4}-\d{1,2}-\d{1,2})/);
    return m ? normalizeDate(m[1]) : todayStr();
  }

  function syncStatsFromDates(fake) {
    if (!fake.stats) fake.stats = {};
    var rates = getRates(fake);
    fake.rebateRate = rates.tier1;
    fake.rebateRateTier1 = rates.tier1;
    fake.rebateRateTier2 = rates.tier2;

    var y = shiftDate(todayStr(), -1);
    var weekKeys = [];
    var i;
    for (i = 0; i < 7; i++) weekKeys.push(shiftDate(todayStr(), -i));

    function getDay(k) {
      return fake.days && fake.days[k];
    }

    function dayCombined(d) {
      if (!d) return emptyForm();
      return combineForms(d.direct || emptyForm(), d.team || emptyForm());
    }

    var yDay = getDay(y);
    // Yesterday hero: A Direct = Tier1, B Team = Tier1 + Tier2
    if (yDay) {
      var yDirect = yDay.direct || emptyForm();
      var yTeam = dayCombined(yDay);

      // Number of register = Box 7 (Box 1 no longer feeds register)
      fake.stats.children_Lv_1_Count_Add_Yesterday = yDirect.registerCount || 0;
      // Deposit number = Box 6
      fake.stats.children_Lv_1_RechargesSumCount = yDirect.depositNumber || 0;
      fake.stats.children_Lv_1_RechargesSumAmount = yDirect.depositAmount || 0;
      // First deposit = Box 1 (new player). A→Direct, B→adds into Team (T1+T2)
      fake.stats.children_Lv_1_FirstRechargesCount = Number(yDirect.newCount) || 0;
      fake.stats.children_Lv_1_RebateAmount_Yesterday = yDirect.commission || 0;

      var yTier2 = yDay.team || emptyForm();
      fake.stats.children_Lv_Count_X_Add_Yesterday = yTeam.registerCount || 0;
      fake.stats.children_Lv_RechargesSumCount = yTeam.depositNumber || 0;
      fake.stats.children_Lv_RechargesSumAmount = yTeam.depositAmount || 0;
      fake.stats.children_Lv_FirstRechargesCount =
        (Number(yDirect.newCount) || 0) + (Number(yTier2.newCount) || 0);
      fake.stats.children_Lv_RebateAmount_Yesterday = yTeam.commission || 0;
    } else {
      fake.stats.children_Lv_1_Count_Add_Yesterday = 0;
      fake.stats.children_Lv_1_RechargesSumCount = 0;
      fake.stats.children_Lv_1_RechargesSumAmount = 0;
      fake.stats.children_Lv_1_FirstRechargesCount = 0;
      fake.stats.children_Lv_1_RebateAmount_Yesterday = 0;
      fake.stats.children_Lv_Count_X_Add_Yesterday = 0;
      fake.stats.children_Lv_RechargesSumCount = 0;
      fake.stats.children_Lv_RechargesSumAmount = 0;
      fake.stats.children_Lv_FirstRechargesCount = 0;
      fake.stats.children_Lv_RebateAmount_Yesterday = 0;
    }

    // Week + total commission = Tier1 + Tier2 combined per day
    var weekComm = 0;
    weekKeys.forEach(function (k) {
      var d = getDay(k);
      if (!d) return;
      weekComm += Number(dayCombined(d).commission) || 0;
    });
    var totalComm = 0;
    var totalDirectCount = 0;
    var totalTeamCount = 0;
    var subs = [];
    Object.keys(fake.days || {}).forEach(function (k) {
      var d = fake.days[k];
      if (!d) return;
      var combined = dayCombined(d);
      totalComm += Number(combined.commission) || 0;
      // Promotional data: Direct = A Box7, Team total = A Box7 + B Box7
      totalDirectCount += Number(d.direct && d.direct.registerCount) || 0;
      totalTeamCount += Number(combined.registerCount) || 0;
      // New subordinates list from Tier1 new players
      ((d.direct && d.direct.players) || []).forEach(function (p) {
        if (p.kind === "old") return;
        subs.push({
          bindUserName: p.nickName || "Player",
          bindUserID: p.userID || 0,
          bindTime: p.searchTime || k + " 12:00:00",
        });
      });
    });

    fake.stats.children_Lv_RebateAmount_Week = round2(weekComm);
    fake.stats.children_Lv_RebateAmount = round2(totalComm);
    fake.stats.children_Lv_1_Count = totalDirectCount;
    fake.stats.children_Lv_Count_X = totalTeamCount;
    fake.subordinates = subs;
    return fake;
  }

  // ---- API patches ----
  function patchUserProfile(obj) {
    if (obj == null || typeof obj !== "object") return obj;
    var uid = getProfileUid();
    if (!uid) return obj;
    var uidNum = Number(uid);
    var uidVal = Number.isFinite(uidNum) && uidNum > 0 ? uidNum : uid;
    function apply(node) {
      if (!node || typeof node !== "object" || Array.isArray(node)) return;
      if ("userId" in node) node.userId = uidVal;
      if ("userID" in node) node.userID = uidVal;
      if ("uid" in node) node.uid = uidVal;
    }
    if (obj.data && typeof obj.data === "object") apply(obj.data);
    apply(obj);
    return obj;
  }

  function patchBalancePayload(obj) {
    if (obj == null || typeof obj !== "object") return obj;
    if (balOn()) {
      var fake = getFakeBal();
      function applyNode(node) {
        if (!node || typeof node !== "object" || Array.isArray(node)) return;
        if (Array.isArray(node.thidGameBalanceList)) {
          var hit = false;
          node.thidGameBalanceList.forEach(function (row) {
            if (!row || typeof row !== "object") return;
            if (String(row.vendorCode) === "Lottery") {
              row.balance = fake;
              hit = true;
            } else if ("balance" in row) row.balance = 0;
          });
          if (!hit && node.thidGameBalanceList[0]) {
            node.thidGameBalanceList[0].balance = fake;
            for (var i = 1; i < node.thidGameBalanceList.length; i++) {
              if (node.thidGameBalanceList[i] && "balance" in node.thidGameBalanceList[i]) {
                node.thidGameBalanceList[i].balance = 0;
              }
            }
          }
          node.amount = fake;
          return;
        }
        if ("amount" in node && (typeof node.amount === "number" || typeof node.amount === "string")) {
          node.amount = fake;
        }
      }
      if (obj.data && typeof obj.data === "object") applyNode(obj.data);
      applyNode(obj);
    }
    patchUserProfile(obj);
    return obj;
  }

  function ensureListEnvelope(obj) {
    if (!obj || typeof obj !== "object") obj = {};
    if (obj.code == null) obj.code = 0;
    if (!obj.data || typeof obj.data !== "object") obj.data = {};
    return obj;
  }

  function patchPromoPayload(obj, url, reqBody) {
    if (!promoOn() || obj == null || typeof obj !== "object") return obj;
    var fake = syncStatsFromDates(getFakePromo());
    if (!fake) return obj;
    var u = String(url || "");

    function applyStats(node) {
      if (!node || typeof node !== "object") return;
      Object.keys(fake.stats || {}).forEach(function (k) {
        node[k] = fake.stats[k];
      });
    }

    if (u.includes("/NewPromotion") || u.includes("/GetLoadedSetting") || u.includes("/GetCommissionDetails")) {
      if (obj.data && typeof obj.data === "object") applyStats(obj.data);
      applyStats(obj);
      return obj;
    }

    if (u.includes("/GetPromotionRecord")) {
      obj = ensureListEnvelope(obj);
      var list = fake.subordinates || [];
      obj.code = 0;
      obj.data.list = list;
      obj.data.pageNo = 1;
      obj.data.pageSize = Math.max(list.length, 10);
      obj.data.totalCount = list.length;
      obj.data.totalPage = 1;
      return obj;
    }

    if (u.includes("/TeamDayReport") || u.includes("/GetTeamDayReport")) {
      obj = ensureListEnvelope(obj);
      var dayKey = extractDayKey(reqBody) || todayStr();
      var lv = extractLv(reqBody);
      var day = (fake.days && fake.days[dayKey]) || emptyDay();
      var side;
      var players;
      // Tier1 = direct. Tier2 = day.team. Tier3–6 = empty. All = Tier1+Tier2.
      if (lv === 1) {
        side = day.direct || emptyForm();
        players = (side.players || []).slice();
      } else if (lv === 2) {
        side = day.team || emptyForm();
        players = (side.players || []).filter(function (p) {
          return Number(p.lv) === 2;
        });
        side = {
          players: players,
          newCount: day.team ? day.team.newCount : 0,
          oldCount: day.team ? day.team.oldCount : 0,
          depositNumber: day.team ? day.team.depositNumber : 0,
          registerCount: day.team ? day.team.registerCount : 0,
          firstDepositAmount: day.team ? day.team.firstDepositAmount : 0,
          depositAmount: day.team ? day.team.depositAmount : 0,
          betAmount: day.team ? day.team.betAmount : 0,
          commission: day.team ? day.team.commission : 0,
        };
      } else if (lv >= 3 && lv <= 6) {
        side = emptyForm();
        players = [];
      } else {
        // All = Tier1 + Tier2
        side = combineForms(day.direct || emptyForm(), day.team || emptyForm());
        players = (side.players || []).slice();
      }
      var sum = daySummaryFromSide(side || emptyForm());
      var outList = players.map(function (r) {
        return {
          userID: r.userID || 0,
          lv: r.lv != null ? Number(r.lv) : 1,
          rechargeAmount: Number(r.rechargeAmount) || 0,
          lotteryAmount: Number(r.lotteryAmount) || 0,
          rebateAmount: Number(r.rebateAmount) || 0,
          searchTime: dateOnly(r.searchTime || dayKey),
        };
      });
      obj.code = 0;
      obj.data = Object.assign({}, obj.data, sum, {
        data: Object.assign({}, sum),
        list: outList,
        pageNo: 1,
        pageSize: Math.max(outList.length, 10),
        totalCount: outList.length,
        totalPage: 1,
      });
      return obj;
    }

    if (u.includes("/PromotionMytem")) {
      obj = ensureListEnvelope(obj);
      obj.code = 0;
      obj.data.list = [];
      obj.data.pageNo = 1;
      obj.data.totalCount = 0;
      obj.data.totalPage = 1;
      return obj;
    }

    if (u.includes("/GetDailyProfitRank")) {
      obj = ensureListEnvelope(obj);
      var tops = fake.topPlayers || [];
      obj.data.dataList = tops;
      obj.data.penarikanList = tops.slice(0, 3);
      obj.data.list = tops;
      return obj;
    }

    if (obj.data && typeof obj.data === "object") applyStats(obj.data);
    return obj;
  }

  function patchResponseText(text, kind, url, reqBody) {
    if (!text) return text;
    try {
      var json = JSON.parse(text);
      if (kind === "bal") patchBalancePayload(json);
      if (kind === "promo") patchPromoPayload(json, url, reqBody);
      return JSON.stringify(json);
    } catch (e) {
      return text;
    }
  }

  function classifyUrl(url) {
    if (urlHas(url, BALANCE_APIS) && (balOn() || profileUidOn())) return "bal";
    if (urlHas(url, PROMO_APIS) && promoOn()) return "promo";
    return null;
  }

  var _fetch = window.fetch;
  window.fetch = async function (input, init) {
    var url = typeof input === "string" ? input : input && input.url;
    var reqBody = init && init.body;
    var res = await _fetch.apply(this, arguments);
    var kind = classifyUrl(url);
    if (!kind) return res;
    try {
      var text = await res.clone().text();
      var patched = patchResponseText(text, kind, url, reqBody);
      return new Response(patched, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    } catch (e) {
      return res;
    }
  };

  var XO = XMLHttpRequest.prototype.open;
  var XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__veerUrl = url;
    return XO.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    this.__veerBody = body;
    var kind = classifyUrl(this.__veerUrl);
    if (kind) {
      this.addEventListener(
        "readystatechange",
        function () {
          if (this.readyState !== 4) return;
          if (kind === "bal" && !balOn()) return;
          if (kind === "promo" && !promoOn()) return;
          try {
            var desc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, "responseText");
            var raw = desc && desc.get ? desc.get.call(this) : this.responseText;
            var patchedText = patchResponseText(raw, kind, this.__veerUrl, this.__veerBody);
            var patchedObj = patchedText;
            try {
              patchedObj = JSON.parse(patchedText);
            } catch (e2) {}
            Object.defineProperty(this, "responseText", {
              configurable: true,
              get: function () {
                return patchedText;
              },
            });
            Object.defineProperty(this, "response", {
              configurable: true,
              get: function () {
                return patchedObj;
              },
            });
          } catch (e3) {}
        },
        true
      );
    }
    return XS.apply(this, arguments);
  };

  // ---- UI ----
  function ensureStyle() {
    var s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement("style");
      s.id = STYLE_ID;
      document.head.appendChild(s);
    }
    s.textContent =
      /* Keep native settings header (avatar/nickname/UID) fully visible */
      ".userInfo__container.setting-page-container .userInfo__container-setting-center-header{display:flex !important;visibility:visible !important;opacity:1 !important}" +
      ".userInfo__container.setting-page-container .userInfo__container-setting-center-content{visibility:visible !important}" +
      "#veer-settings-tools{margin:10px 12px 14px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:rgba(12,26,42,.92)}" +
      "#veer-settings-tools .veer-tools-title{padding:10px 14px 6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;opacity:.55;font-weight:600}" +
      "#" +
      ROW_BAL +
      ",#" +
      ROW_PROMO +
      ",#" +
      ROW_BET +
      ",#" +
      ROW_UID +
      "{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer;user-select:none;border-bottom:1px solid rgba(255,255,255,.06);background:transparent}" +
      "#" +
      ROW_BAL +
      ":last-child,#" +
      ROW_PROMO +
      ":last-child,#" +
      ROW_BET +
      ":last-child,#" +
      ROW_UID +
      ":last-child{border-bottom:0}" +
      "#" +
      ROW_BAL +
      " h5,#" +
      ROW_PROMO +
      " h5,#" +
      ROW_BET +
      " h5,#" +
      ROW_UID +
      " h5{margin:0;font-size:14px;font-weight:500;color:#fff}" +
      "#" +
      ROW_BAL +
      " .veer-right,#" +
      ROW_PROMO +
      " .veer-right,#" +
      ROW_BET +
      " .veer-right,#" +
      ROW_UID +
      " .veer-right{display:flex;align-items:center;gap:8px;opacity:.9;font-size:13px;color:rgba(255,255,255,.85)}" +
      "#" +
      ROW_BAL +
      ":active,#" +
      ROW_PROMO +
      ":active,#" +
      ROW_BET +
      ":active,#" +
      ROW_UID +
      ":active{background:rgba(255,255,255,.04)}" +
      ".veer-badge{font-size:10px;padding:2px 6px;border-radius:999px;background:rgba(46,204,113,.18);color:#2ecc71}" +
      ".veer-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px}" +
      ".veer-modal{width:min(400px,100%);background:#12263a;color:#fff;border-radius:14px;padding:18px 16px 14px;box-shadow:0 12px 40px rgba(0,0,0,.45)}" +
      ".veer-modal h3{margin:0 0 6px;font-size:16px}.veer-modal p{margin:0 0 12px;font-size:12px;opacity:.75}" +
      ".veer-modal input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.15);background:#0c1a2a;color:#fff;border-radius:10px;padding:12px 14px;font-size:15px;margin-bottom:10px}" +
      ".veer-actions{display:flex;gap:8px;margin-top:8px}" +
      ".veer-modal button,#" +
      STUDIO_ID +
      " button{border:0;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:600;cursor:pointer}" +
      ".veer-save{background:linear-gradient(90deg,#1fa2ff,#12d8fa);color:#062033}" +
      ".veer-reset{background:rgba(255,255,255,.08);color:#fff}" +
      ".veer-cancel{background:transparent;color:#aaa;border:1px solid rgba(255,255,255,.12)}" +
      ".veer-danger{background:rgba(231,76,60,.2);color:#ff8a7a}" +
      ".veer-add{background:rgba(46,204,113,.2);color:#2ecc71}" +
      "#" +
      STUDIO_ID +
      "{position:fixed;inset:0;z-index:100000;background:#0b1724;color:#fff;display:flex;flex-direction:column;font-family:system-ui,sans-serif}" +
      "#" +
      STUDIO_ID +
      " .vs-top{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#12263a;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;z-index:2}" +
      "#" +
      STUDIO_ID +
      " .vs-top h2{margin:0;font-size:16px;flex:1}" +
      "#" +
      STUDIO_ID +
      " .vs-body{flex:1;overflow:auto;padding:12px}" +
      "#" +
      STUDIO_ID +
      " .vs-foot{display:flex;gap:8px;padding:12px;background:#12263a;border-top:1px solid rgba(255,255,255,.08);position:sticky;bottom:0}" +
      "#" +
      STUDIO_ID +
      " .vs-foot button{flex:1;padding:12px}" +
      "#" +
      STUDIO_ID +
      " .card{background:#12263a;border-radius:14px;padding:14px;margin-bottom:12px;border:1px solid rgba(255,255,255,.06)}" +
      "#" +
      STUDIO_ID +
      " .card h3{margin:0 0 8px;font-size:15px}" +
      "#" +
      STUDIO_ID +
      " .hint{font-size:11px;opacity:.7;line-height:1.45;margin:0 0 10px}" +
      "#" +
      STUDIO_ID +
      " .field{margin-bottom:10px}" +
      "#" +
      STUDIO_ID +
      " .field label{display:block;font-size:11px;opacity:.75;margin-bottom:4px}" +
      "#" +
      STUDIO_ID +
      " .field input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.12);background:#091421;color:#fff;border-radius:8px;padding:10px 12px;font-size:14px}" +
      "#" +
      STUDIO_ID +
      " .field input[readonly]{color:#7ee0ff;border-style:dashed;opacity:.95}" +
      "#" +
      STUDIO_ID +
      " .date-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}" +
      "#" +
      STUDIO_ID +
      " .date-bar input[type=date]{flex:1;min-width:150px;background:#0c1a2a;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px;font-size:14px}" +
      "#" +
      STUDIO_ID +
      " .date-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}" +
      "#" +
      STUDIO_ID +
      " .date-chip{padding:6px 10px;border-radius:999px;font-size:11px;cursor:pointer;background:rgba(255,255,255,.08)}" +
      "#" +
      STUDIO_ID +
      " .date-chip.active{background:rgba(31,162,255,.25);color:#7ee0ff}" +
      "#" +
      STUDIO_ID +
      " .forms{display:grid;grid-template-columns:1fr;gap:12px}" +
      "@media(min-width:800px){#" +
      STUDIO_ID +
      " .forms{grid-template-columns:1fr 1fr}}" +
      "#" +
      STUDIO_ID +
      " .form-card{background:#0c1a2a;border-radius:12px;padding:12px;border:1px solid rgba(255,255,255,.08)}" +
      "#" +
      STUDIO_ID +
      " .form-card h4{margin:0 0 8px;font-size:14px;color:#7ee0ff}" +
      "#" +
      STUDIO_ID +
      " .preview{background:rgba(126,224,255,.08);border-radius:10px;padding:10px;font-size:12px;line-height:1.5;margin-top:8px}" +
      "#" +
      STUDIO_ID +
      " .rate-box{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:8px 0}" +
      "#" +
      STUDIO_ID +
      " .rate-box input{width:90px;background:#091421;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px}" +
      ".TeamReport__C-body-item .veer-tap{cursor:pointer;-webkit-tap-highlight-color:transparent}" +
      ".TeamReport__C-body-item .veer-tap:active{opacity:.7}" +
      ".TeamReport__C-body-item .veer-bet-hidden{display:none !important}" +
      /* Settings Hidden → bet never shows on Subordinate Data (no flash on load) */
      "html.veer-hide-bet .TeamReport__C-body-item-detail > div:nth-child(3){display:none !important}" +
      "html.veer-hide-bet .TeamReport__C-body-item .veer-bet-row{display:none !important}" +
      ".veer-edit-backdrop{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px}" +
      ".veer-edit-sheet{width:min(420px,100%);background:#12263a;color:#fff;border-radius:16px 16px 12px 12px;padding:16px;box-shadow:0 -8px 30px rgba(0,0,0,.4)}" +
      ".veer-edit-sheet h3{margin:0 0 8px;font-size:15px}" +
      ".veer-edit-sheet input{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.15);background:#0c1a2a;color:#fff;border-radius:10px;padding:12px;font-size:16px;margin:8px 0 12px}" +
      ".veer-edit-sheet .veer-actions{display:flex;gap:8px}" +
      ".veer-edit-sheet button{flex:1;border:0;border-radius:10px;padding:12px;font-weight:600;cursor:pointer}" +
      ".veer-edit-sheet .veer-save{background:linear-gradient(90deg,#1fa2ff,#12d8fa);color:#062033}" +
      ".veer-edit-sheet .veer-cancel{background:rgba(255,255,255,.08);color:#fff}";
  }

  function onSettingsPage() {
    var h = location.hash || "";
    var p = location.pathname || "";
    return (
      /SettingCenter/i.test(h) ||
      /SettingCenter/i.test(p) ||
      !!document.querySelector(".userInfo__container.setting-page-container")
    );
  }

  function openBalanceModal() {
    if (document.querySelector(".veer-backdrop") || document.getElementById(STUDIO_ID)) return;
    ensureStyle();
    var cur = getFakeBal();
    var backdrop = document.createElement("div");
    backdrop.className = "veer-backdrop";
    backdrop.innerHTML =
      '<div class="veer-modal" role="dialog"><h3>Balance Edit</h3><p>Profile/header local balance.</p>' +
      '<input id="veer-bal-input" type="number" step="0.01" min="0" value="' +
      (cur !== null ? cur : "") +
      '" />' +
      '<div class="veer-actions">' +
      '<button type="button" class="veer-cancel" data-act="cancel">Cancel</button>' +
      '<button type="button" class="veer-reset" data-act="reset">Reset</button>' +
      '<button type="button" class="veer-save" data-act="save">Save</button></div></div>';
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) backdrop.remove();
    });
    backdrop.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-act");
        if (act === "cancel") return backdrop.remove();
        if (act === "reset") {
          clearFakeBal();
          location.reload();
          return;
        }
        if (act === "save") {
          var n = Number((backdrop.querySelector("#veer-bal-input").value || "").trim());
          if (!Number.isFinite(n) || n < 0) return;
          setFakeBal(n);
          location.reload();
        }
      });
    });
  }

  // ---- Studio ----
  var studioState = null;
  var studioDate = todayStr();

  function ensureDay() {
    if (!studioState.days) studioState.days = {};
    if (!studioState.days[studioDate]) studioState.days[studioDate] = emptyDay();
    return studioState.days[studioDate];
  }

  function readForm(root, prefix) {
    function val(suffix) {
      var el = root.querySelector("[data-" + prefix + "-" + suffix + "]");
      return el ? Number(el.value) || 0 : 0;
    }
    return {
      newCount: Math.floor(val("new")),
      oldCount: Math.floor(val("old")),
      depositNumber: Math.floor(val("depnum")),
      registerCount: Math.floor(val("reg")),
      firstDepositAmount: round2(val("firstdep")),
      depositAmount: round2(val("dep")),
      betAmount: 0,
      commission: 0,
      players: [],
    };
  }

  function previewSide(side, rate) {
    var n = Math.max(0, Math.floor(side.newCount || 0));
    var o = Math.max(0, Math.floor(side.oldCount || 0));
    var depNum = Math.max(0, Math.floor(side.depositNumber || 0));
    var reg = Math.max(0, Math.floor(side.registerCount || 0));
    var firstDep = round2(side.firstDepositAmount || 0);
    var dep = round2(side.depositAmount || 0);
    var bettors = n + o;
    var betMin = round2(dep * BET_MIN_MULT);
    var betMax = round2(dep * BET_MAX_MULT);
    var commMin = calcCommission(betMin, rate);
    var commMax = calcCommission(betMax, rate);
    return (
      "Number of register (Box 7): <b>" +
      reg +
      "</b><br/>" +
      "Number of bettors: <b>" +
      bettors +
      "</b> (new " +
      n +
      " + old " +
      o +
      ")<br/>" +
      "Deposit number (Box 6): <b>" +
      depNum +
      "</b> · First deposit number (Box 1): <b>" +
      n +
      "</b><br/>" +
      "First deposit amount (Box 8): <b>" +
      fmt(firstDep) +
      "</b><br/>" +
      "Deposit amount: <b>" +
      fmt(dep) +
      "</b><br/>" +
      "Bet auto: <b>" +
      fmt(betMin) +
      " – " +
      fmt(betMax) +
      "</b> (" +
      BET_MIN_MULT +
      "x–" +
      BET_MAX_MULT +
      "x)<br/>" +
      "Commission auto: <b>" +
      fmt(commMin) +
      " – " +
      fmt(commMax) +
      "</b> (bet × " +
      rate +
      "%)"
    );
  }

  function renderStudio() {
    var day = ensureDay();
    var rates = getRates(studioState);
    var y = shiftDate(todayStr(), -1);
    var saved = Object.keys(studioState.days || {}).sort().reverse();
    var chips = saved.length
      ? saved
          .map(function (d) {
            return (
              '<span class="date-chip' +
              (d === studioDate ? " active" : "") +
              '" data-act="chip" data-date="' +
              d +
              '">' +
              d +
              (d === y ? " (yesterday)" : "") +
              "</span>"
            );
          })
          .join("")
      : '<span class="hint">No saved dates</span>';

    var d = day.direct || emptyForm();
    var t = day.team || emptyForm();
    var combined = combineForms(d, t);

    return (
      '<div class="card"><h3>1) Date select</h3>' +
      '<p class="hint">Website ajker date = <b>' +
      todayStr() +
      "</b>. Yesterday = <b>" +
      y +
      "</b>. Direct = Tier1 (tomar invite). Tier2 = tomar team er maddhome. Site Team subordinates = Tier1 + Tier2.</p>" +
      '<div class="date-bar"><input type="date" data-date value="' +
      studioDate +
      '" />' +
      '<button type="button" class="veer-add" data-act="open-date">Open date</button>' +
      '<button type="button" class="veer-danger" data-act="del-date">Delete date</button></div>' +
      '<div class="date-chips">' +
      chips +
      "</div>" +
      '<div class="rate-box"><span>Tier1 commission %</span>' +
      '<input data-rate-t1 type="number" step="0.01" min="0" value="' +
      rates.tier1 +
      '" />' +
      "<span>Tier2 commission %</span>" +
      '<input data-rate-t2 type="number" step="0.01" min="0" value="' +
      rates.tier2 +
      '" /></div></div>' +
      '<div class="forms">' +
      '<div class="form-card"><h4>A) Direct subordinates (Tier 1)</h4>' +
      '<p class="hint">Tomar maddhome jara add — Tier1. Promotion Direct column + TeamReport Tier1. Commission = bet × ' +
      rates.tier1 +
      "%.</p>" +
      '<div class="field"><label>Box 1 — New player amount</label>' +
      '<input data-direct-new type="number" min="0" step="1" value="' +
      (d.newCount || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 2 — Old player amount</label>' +
      '<input data-direct-old type="number" min="0" step="1" value="' +
      (d.oldCount || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 3 — Deposit amount (total EXACT)</label>' +
      '<input data-direct-dep type="number" min="0" step="0.01" value="' +
      (d.depositAmount || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 4 — Total bet (AUTO random 6x–10x)</label>' +
      '<input readonly value="AUTO" /></div>' +
      '<div class="field"><label>Box 5 — Commission (AUTO bet × ' +
      rates.tier1 +
      "%)</label>" +
      '<input readonly value="AUTO" /></div>' +
      '<div class="field"><label>Box 6 — Deposit number (koyjon deposit korche)</label>' +
      '<input data-direct-depnum type="number" min="0" step="1" value="' +
      (d.depositNumber || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 7 — Number of register</label>' +
      '<input data-direct-reg type="number" min="0" step="1" value="' +
      (d.registerCount || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 8 — First deposit amount</label>' +
      '<input data-direct-firstdep type="number" min="0" step="0.01" value="' +
      (d.firstDepositAmount || 0) +
      '" /></div>' +
      '<p class="hint">Box1 = first deposit number · Box8 = first deposit amount (Tier1) · Box7 = register</p>' +
      '<div class="preview" data-prev-direct>' +
      previewSide(d, rates.tier1) +
      "</div></div>" +
      '<div class="form-card"><h4>B) Subordinates Tier 2</h4>' +
      '<p class="hint">Tomar team er maddhome jara add — Tier2 ONLY. TeamReport Tier2. Site Team column = Tier1 + Tier2. Commission = bet × ' +
      rates.tier2 +
      "%. Tier3–6 empty.</p>" +
      '<div class="field"><label>Box 1 — New player amount</label>' +
      '<input data-team-new type="number" min="0" step="1" value="' +
      (t.newCount || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 2 — Old player amount</label>' +
      '<input data-team-old type="number" min="0" step="1" value="' +
      (t.oldCount || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 3 — Deposit amount (total EXACT)</label>' +
      '<input data-team-dep type="number" min="0" step="0.01" value="' +
      (t.depositAmount || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 4 — Total bet (AUTO random 6x–10x)</label>' +
      '<input readonly value="AUTO" /></div>' +
      '<div class="field"><label>Box 5 — Commission (AUTO bet × ' +
      rates.tier2 +
      "%)</label>" +
      '<input readonly value="AUTO" /></div>' +
      '<div class="field"><label>Box 6 — Deposit number (koyjon deposit korche)</label>' +
      '<input data-team-depnum type="number" min="0" step="1" value="' +
      (t.depositNumber || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 7 — Number of register</label>' +
      '<input data-team-reg type="number" min="0" step="1" value="' +
      (t.registerCount || 0) +
      '" /></div>' +
      '<div class="field"><label>Box 8 — First deposit amount</label>' +
      '<input data-team-firstdep type="number" min="0" step="0.01" value="' +
      (t.firstDepositAmount || 0) +
      '" /></div>' +
      '<p class="hint">Box1 = first deposit number · Box8 = first deposit amount (Tier2) · All = A Box8 + B Box8</p>' +
      '<div class="preview" data-prev-team>' +
      previewSide(t, rates.tier2) +
      "</div></div></div>" +
      '<div class="card"><h3>2) Generate</h3>' +
      '<p class="hint">Deposit exact. Bet random 6x–10x. Tier1 commission ' +
      rates.tier1 +
      "% · Tier2 commission " +
      rates.tier2 +
      "%. Site Team subordinates = Direct + Tier2 jug.</p>" +
      '<button type="button" class="veer-save" data-act="generate" style="width:100%;padding:14px">⚡ Generate algorithm for ' +
      studioDate +
      "</button>" +
      (d.players && d.players.length
        ? '<div class="preview" style="margin-top:10px">Tier1 players <b>' +
          d.players.length +
          "</b> · Tier2 players <b>" +
          ((t.players && t.players.length) || 0) +
          "</b> · Team total (T1+T2) <b>" +
          combined.players.length +
          "</b><br/>Tier1 commission <b>" +
          fmt(d.commission || 0) +
          "</b> · Tier2 commission <b>" +
          fmt(t.commission || 0) +
          "</b> · Team commission <b>" +
          fmt(combined.commission || 0) +
          "</b><br/>Tier1 bet <b>" +
          fmt(d.betAmount || 0) +
          "</b> · Tier2 bet <b>" +
          fmt(t.betAmount || 0) +
          "</b> · Team bet <b>" +
          fmt(combined.betAmount || 0) +
          "</b></div>"
        : "") +
      "</div>"
    );
  }

  function paintStudio() {
    var root = document.getElementById(STUDIO_ID);
    if (!root) return;
    root.querySelector(".vs-body").innerHTML = renderStudio();
  }

  function readRatesFromDom(root) {
    var t1El = root.querySelector("[data-rate-t1]");
    var t2El = root.querySelector("[data-rate-t2]");
    // legacy single rate fallback
    var legacy = root.querySelector("[data-rate]");
    var t1 = t1El
      ? Number(t1El.value)
      : legacy
        ? Number(legacy.value)
        : DEFAULT_REBATE_RATE_T1;
    var t2 = t2El ? Number(t2El.value) : DEFAULT_REBATE_RATE_T2;
    if (!Number.isFinite(t1) || t1 < 0) t1 = DEFAULT_REBATE_RATE_T1;
    if (!Number.isFinite(t2) || t2 < 0) t2 = DEFAULT_REBATE_RATE_T2;
    return { tier1: t1, tier2: t2 };
  }

  function livePreview(root) {
    var rates = readRatesFromDom(root);
    var d = readForm(root, "direct");
    var t = readForm(root, "team");
    var pd = root.querySelector("[data-prev-direct]");
    var pt = root.querySelector("[data-prev-team]");
    if (pd) pd.innerHTML = previewSide(d, rates.tier1);
    if (pt) pt.innerHTML = previewSide(t, rates.tier2);
  }

  function setStudioDate(raw) {
    studioDate = normalizeDate(raw);
    return studioDate;
  }

  function openPromoStudio() {
    if (document.getElementById(STUDIO_ID)) return;
    ensureStyle();
    studioState = getFakePromo() || defaultPromo();
    setStudioDate(todayStr());
    var keys = Object.keys(studioState.days || {});
    if (keys.length && !studioState.days[studioDate]) {
      setStudioDate(keys.sort().reverse()[0]);
    }
    ensureDay();

    var root = document.createElement("div");
    root.id = STUDIO_ID;
    root.innerHTML =
      '<div class="vs-top"><button type="button" class="veer-cancel" data-act="close">←</button>' +
      "<h2>Promotion Studio</h2><span class=\"veer-badge\">AUTO</span></div>" +
      '<div class="vs-body"></div>' +
      '<div class="vs-foot">' +
      '<button type="button" class="veer-cancel" data-act="close">Cancel</button>' +
      '<button type="button" class="veer-reset" data-act="reset">Reset all</button>' +
      '<button type="button" class="veer-save" data-act="save">Save & apply</button></div>';
    document.body.appendChild(root);
    paintStudio();

    root.addEventListener("input", function (e) {
      // Date picker change must stick immediately (jeita dibo setai thakbe)
      var t = e.target;
      if (t && t.matches && t.matches("input[data-date]")) {
        var next = normalizeDate(t.value);
        if (next !== studioDate) {
          setStudioDate(next);
          ensureDay();
          paintStudio();
          return;
        }
        t.value = studioDate;
        return;
      }
      livePreview(root);
    });

    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t && t.matches && t.matches("input[data-date]")) {
        setStudioDate(t.value);
        ensureDay();
        paintStudio();
      }
    });

    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var act = btn.getAttribute("data-act");

      if (act === "close") {
        root.remove();
        return;
      }
      if (act === "reset") {
        clearFakePromo();
        location.reload();
        return;
      }
      if (act === "open-date" || act === "chip") {
        var inp = root.querySelector("[data-date]");
        setStudioDate(
          act === "chip" ? btn.getAttribute("data-date") : (inp && inp.value) || todayStr()
        );
        ensureDay();
        paintStudio();
        return;
      }
      if (act === "del-date") {
        delete studioState.days[studioDate];
        var left = Object.keys(studioState.days);
        setStudioDate(left.length ? left.sort().reverse()[0] : todayStr());
        ensureDay();
        paintStudio();
        return;
      }
      if (act === "generate") {
        // Lock date from the visible picker so Generate always uses what user selected
        var dateInp = root.querySelector("[data-date]");
        if (dateInp && dateInp.value) setStudioDate(dateInp.value);
        var genRates = readRatesFromDom(root);
        studioState.rebateRateTier1 = genRates.tier1;
        studioState.rebateRateTier2 = genRates.tier2;
        studioState.rebateRate = genRates.tier1;
        var day = ensureDay();
        day.direct = readForm(root, "direct");
        day.team = readForm(root, "team");
        var generated = runAlgorithmForDate(day, studioDate, genRates);
        studioState.days[studioDate] = generated;
        syncStatsFromDates(studioState);
        paintStudio();
        return;
      }
      if (act === "save") {
        var dateInp2 = root.querySelector("[data-date]");
        if (dateInp2 && dateInp2.value) setStudioDate(dateInp2.value);
        var saveRates = readRatesFromDom(root);
        studioState.rebateRateTier1 = saveRates.tier1;
        studioState.rebateRateTier2 = saveRates.tier2;
        studioState.rebateRate = saveRates.tier1;
        // If user typed numbers but didn't generate, auto-generate now
        var day2 = ensureDay();
        var typedD = readForm(root, "direct");
        var typedT = readForm(root, "team");
        var needGen =
          !day2.direct.players ||
          !day2.direct.players.length ||
          typedD.newCount !== day2.direct.newCount ||
          typedD.oldCount !== day2.direct.oldCount ||
          typedD.depositNumber !== day2.direct.depositNumber ||
          typedD.registerCount !== day2.direct.registerCount ||
          typedD.firstDepositAmount !== day2.direct.firstDepositAmount ||
          typedD.depositAmount !== day2.direct.depositAmount ||
          typedT.newCount !== day2.team.newCount ||
          typedT.oldCount !== day2.team.oldCount ||
          typedT.depositNumber !== day2.team.depositNumber ||
          typedT.registerCount !== day2.team.registerCount ||
          typedT.firstDepositAmount !== day2.team.firstDepositAmount ||
          typedT.depositAmount !== day2.team.depositAmount;
        if (needGen) {
          day2.direct = typedD;
          day2.team = typedT;
          studioState.days[studioDate] = runAlgorithmForDate(
            day2,
            studioDate,
            saveRates
          );
        }
        syncStatsFromDates(studioState);
        setFakePromo(studioState);
        location.reload();
      }
    });
  }

  function updateRowLabels() {
    var bal = document.getElementById(ROW_BAL);
    if (bal) {
      var span = bal.querySelector(".veer-val");
      var badge = bal.querySelector(".veer-badge");
      if (balOn()) {
        span.textContent = fmt(getFakeBal());
        badge.style.display = "inline-block";
      } else {
        span.textContent = "Edit";
        badge.style.display = "none";
      }
    }
    var promo = document.getElementById(ROW_PROMO);
    if (promo) {
      var span2 = promo.querySelector(".veer-val");
      var badge2 = promo.querySelector(".veer-badge");
      if (promoOn()) {
        var p = syncStatsFromDates(getFakePromo());
        span2.textContent = fmt((p.stats && p.stats.children_Lv_RebateAmount_Yesterday) || 0);
        badge2.style.display = "inline-block";
      } else {
        span2.textContent = "Algorithm";
        badge2.style.display = "none";
      }
    }
    var betRow = document.getElementById(ROW_BET);
    if (betRow) {
      var span3 = betRow.querySelector(".veer-val");
      if (span3) span3.textContent = betAmountVisible() ? "Visible" : "Hidden";
    }
    var uidRow = document.getElementById(ROW_UID);
    if (uidRow) {
      var span4 = uidRow.querySelector(".veer-val");
      var badge4 = uidRow.querySelector(".veer-badge");
      if (span4) span4.textContent = profileUidOn() ? getProfileUid() : "Edit";
      if (badge4) badge4.style.display = profileUidOn() ? "inline-block" : "none";
    }
  }

  function makeRow(id, title) {
    var row = document.createElement("div");
    row.id = id;
    row.setAttribute("data-veer-tool", id);
    row.innerHTML =
      "<h5>" +
      title +
      '</h5><div class="veer-right"><span class="veer-badge" style="display:none">LOCAL</span>' +
      '<span class="veer-val">Edit</span><span style="opacity:.5">›</span></div>';
    return row;
  }

  function toggleBetAmountSetting() {
    setBetAmountVisible(!betAmountVisible());
    syncBetHideClass();
    ensureStyle();
    updateRowLabels();
    applyBetAmountVisibility();
  }

  function openProfileUidEdit() {
    var cur = getProfileUid() || "";
    openRowEditSheet("Edit Profile UID", cur, "number", function (v) {
      var n = Math.floor(Number(v));
      if (!Number.isFinite(n) || n <= 0) {
        clearProfileUid();
      } else {
        setProfileUid(n);
      }
      updateRowLabels();
      location.reload();
    });
  }

  function runToolAction(id) {
    if (id === ROW_BAL) openBalanceModal();
    else if (id === ROW_PROMO) openPromoStudio();
    else if (id === ROW_UID) openProfileUidEdit();
    else if (id === ROW_BET) toggleBetAmountSetting();
  }

  // One capture listener on host — first tap always works (no per-row rebind / DOM move issues)
  var lastToolActionAt = 0;
  function ensureToolsClickDelegation(host) {
    if (!host || host.getAttribute("data-veer-click") === "1") return;
    host.setAttribute("data-veer-click", "1");
    function onToolPointer(e) {
      var row =
        e.target && e.target.closest ? e.target.closest("[data-veer-tool]") : null;
      if (!row || !host.contains(row)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      var now = Date.now();
      if (now - lastToolActionAt < 350) return; // ignore ghost click after touch
      lastToolActionAt = now;
      runToolAction(row.getAttribute("data-veer-tool") || row.id);
    }
    host.addEventListener("pointerup", onToolPointer, true);
    host.addEventListener("click", onToolPointer, true);
  }

  function findNativeUidRow(center) {
    var rows = center.querySelectorAll(".userInfo__container-setting-center-content");
    var i, row, h5, t;
    for (i = 0; i < rows.length; i++) {
      row = rows[i];
      if (row.id && row.id.indexOf("veer-") === 0) continue;
      if (row.closest && row.closest("#veer-settings-tools")) continue;
      h5 = row.querySelector("h5");
      t = h5 ? (h5.textContent || "").trim() : "";
      if (/^UID$/i.test(t)) return row;
    }
    return null;
  }

  function findNativeNickRow(center) {
    var contents = center.querySelectorAll(".userInfo__container-setting-center-content");
    var i, el, h, ht;
    for (i = 0; i < contents.length; i++) {
      el = contents[i];
      if (el.id && el.id.indexOf("veer-") === 0) continue;
      if (el.closest && el.closest("#veer-settings-tools")) continue;
      h = el.querySelector("h5");
      ht = h ? (h.textContent || "").trim() : "";
      if (/nick/i.test(ht)) return el;
    }
    return center.querySelector(
      ".userInfo__container-setting-center-content.ar-1px-b:not([id^='veer-'])"
    );
  }

  function toolsAlreadyReady(host, center) {
    if (!host || !host.parentElement) return false;
    if (!document.getElementById(ROW_BAL)) return false;
    if (!document.getElementById(ROW_PROMO)) return false;
    if (!document.getElementById(ROW_UID)) return false;
    if (!document.getElementById(ROW_BET)) return false;
    var anchor = findNativeUidRow(center) || findNativeNickRow(center);
    if (anchor && host.previousElementSibling !== anchor) return false;
    return true;
  }

  function placeToolsHost(center) {
    var host = document.getElementById("veer-settings-tools");
    if (!host) {
      host = document.createElement("div");
      host.id = "veer-settings-tools";
      host.innerHTML = '<div class="veer-tools-title">Local tools</div>';
    }
    var anchor = findNativeUidRow(center) || findNativeNickRow(center);
    if (anchor) {
      if (host.previousElementSibling !== anchor) anchor.after(host);
    } else if (host.parentElement !== center) {
      center.appendChild(host);
    }
    return host;
  }

  function injectRows() {
    if (!onSettingsPage()) {
      var hostGone = document.getElementById("veer-settings-tools");
      if (hostGone) hostGone.remove();
      return;
    }
    var center = document.querySelector(".userInfo__container-setting-center");
    if (!center) return;
    ensureStyle();

    var host = document.getElementById("veer-settings-tools");
    // Already good — only refresh labels, do NOT move DOM (moving kills clicks)
    if (host && toolsAlreadyReady(host, center)) {
      ensureToolsClickDelegation(host);
      updateRowLabels();
      return;
    }

    host = placeToolsHost(center);
    var specs = [
      [ROW_BAL, "Balance Edit"],
      [ROW_PROMO, "Promotion"],
      [ROW_UID, "Profile UID"],
      [ROW_BET, "Bet amount"],
    ];
    var title = host.querySelector(".veer-tools-title");
    specs.forEach(function (pair) {
      if (!document.getElementById(pair[0])) {
        host.appendChild(makeRow(pair[0], pair[1]));
      } else if (document.getElementById(pair[0]).parentElement !== host) {
        host.appendChild(document.getElementById(pair[0]));
      }
    });
    // order once only when building
    if (title) host.insertBefore(title, host.firstChild);
    specs.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (el && el.parentElement === host) host.appendChild(el);
    });
    ensureToolsClickDelegation(host);
    updateRowLabels();
  }

  function paintDom() {
    if (!balOn()) return;
    var text = fmt(getFakeBal());
    document
      .querySelectorAll(
        ".pc-header .amount, .nologin-header .amount, .wallet-container .amount, .userInfo__container .amount"
      )
      .forEach(function (elNode) {
        if (elNode.closest("#" + STUDIO_ID) || elNode.closest(".veer-modal")) return;
        var parent = elNode.parentElement;
        var isMain =
          elNode.closest(".pc-header") ||
          elNode.closest(".nologin-header") ||
          elNode.closest(".userInfo__container") ||
          (parent && parent.querySelector("img.add, .add, .refresh"));
        if (!isMain) return;
        if (elNode.textContent !== text) elNode.textContent = text;
      });
  }

  // ---- Subordinate Data row tap-edit (list UI only, no summary impact) ----
  function openRowEditSheet(title, value, inputType, onSave) {
    if (document.querySelector(".veer-edit-backdrop")) return;
    ensureStyle();
    var backdrop = document.createElement("div");
    backdrop.className = "veer-edit-backdrop";
    backdrop.innerHTML =
      '<div class="veer-edit-sheet" role="dialog">' +
      "<h3>" +
      title +
      "</h3>" +
      '<input id="veer-row-edit-input" type="' +
      (inputType || "text") +
      '" value="' +
      String(value).replace(/"/g, "&quot;") +
      '" />' +
      '<div class="veer-actions">' +
      '<button type="button" class="veer-cancel" data-act="cancel">Cancel</button>' +
      '<button type="button" class="veer-save" data-act="ok">Save</button></div></div>';
    document.body.appendChild(backdrop);
    var inp = backdrop.querySelector("#veer-row-edit-input");
    setTimeout(function () {
      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 50);
    function close() {
      backdrop.remove();
    }
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector('[data-act="cancel"]').addEventListener("click", close);
    backdrop.querySelector('[data-act="ok"]').addEventListener("click", function () {
      var v = inp ? inp.value : "";
      close();
      onSave(v);
    });
    if (inp) {
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          backdrop.querySelector('[data-act="ok"]').click();
        }
      });
    }
  }

  function paintTeamReportRow(row, player) {
    if (!row || !player) return;
    var title = row.querySelector(".TeamReport__C-body-item-head .title, .title");
    if (title) title.textContent = "UID:" + player.userID;
    var lvSpan = row.querySelector(".TeamReport__C-body-item-detail-lv span");
    if (lvSpan) lvSpan.textContent = String(player.lv != null ? player.lv : 1);
    var detailBlocks = row.querySelectorAll(".TeamReport__C-body-item-detail > div");
    // order: lv, deposit, bet, commission, time
    if (detailBlocks[1]) {
      var depSp = detailBlocks[1].querySelector("span");
      if (depSp) depSp.textContent = String(player.rechargeAmount || 0);
    }
    if (detailBlocks[2]) {
      var betSp = detailBlocks[2].querySelector("span");
      if (betSp) betSp.textContent = String(player.lotteryAmount || 0);
      // default hide bet amount; Settings toggle can show
      if (betAmountVisible()) detailBlocks[2].classList.remove("veer-bet-hidden");
      else detailBlocks[2].classList.add("veer-bet-hidden");
    }
    if (detailBlocks[3]) {
      var comSp = detailBlocks[3].querySelector("span");
      if (comSp) comSp.textContent = String(player.rebateAmount || 0);
    }
    if (detailBlocks[4]) {
      var timeSp = detailBlocks[4].querySelector("span");
      if (timeSp) timeSp.textContent = dateOnly(player.searchTime || timeSp.textContent);
    }
  }

  function applyBetAmountVisibility() {
    syncBetHideClass();
    var show = betAmountVisible();
    document.querySelectorAll(".TeamReport__C-body-item").forEach(function (row) {
      var detailBlocks = row.querySelectorAll(".TeamReport__C-body-item-detail > div");
      if (!detailBlocks[2]) return;
      detailBlocks[2].classList.add("veer-bet-row");
      if (show) detailBlocks[2].classList.remove("veer-bet-hidden");
      else detailBlocks[2].classList.add("veer-bet-hidden");
    });
    // also strip time to date-only on any visible rows
    document.querySelectorAll(".TeamReport__C-body-item-detail-time span").forEach(function (sp) {
      var t = (sp.textContent || "").trim();
      if (t && t.length > 10) sp.textContent = dateOnly(t);
    });
  }

  function savePlayerEdit(uid, patch) {
    var fake = getFakePromo();
    if (!fake || !promoOn()) return null;
    var dayKey = readTeamReportDateKey();
    var hit = findPlayerByUid(fake, dayKey, uid);
    if (!hit) {
      // try all dates if date parse missed
      var keys = Object.keys(fake.days || {});
      var k;
      for (k = 0; k < keys.length && !hit; k++) {
        hit = findPlayerByUid(fake, keys[k], uid);
      }
    }
    if (!hit) return null;
    var p = hit.player;
    if (patch.userID != null) p.userID = patch.userID;
    if (patch.lv != null) p.lv = patch.lv;
    if (patch.rechargeAmount != null) p.rechargeAmount = patch.rechargeAmount;
    if (patch.lotteryAmount != null) p.lotteryAmount = patch.lotteryAmount;
    // commission auto from bet × rate(level) — never manual
    var rate = rateForPlayerLv(p.lv, fake);
    p.rebateAmount = calcCommission(p.lotteryAmount, rate);
    setFakePromo(fake);
    return p;
  }

  function bindTeamReportEdits() {
    if (!promoOn()) return;
    var items = document.querySelectorAll(".TeamReport__C-body-item");
    if (!items.length) return;
    items.forEach(function (row) {
      if (row.getAttribute("data-veer-edit-bound") === "1") return;
      row.setAttribute("data-veer-edit-bound", "1");

      var title = row.querySelector(".TeamReport__C-body-item-head .title, .title");
      var detailBlocks = row.querySelectorAll(".TeamReport__C-body-item-detail > div");
      var lvBlock = detailBlocks[0];
      var depBlock = detailBlocks[1];
      var betBlock = detailBlocks[2];
      // detailBlocks[3] = commission — no edit
      // detailBlocks[4] = time — no edit

      function currentUid() {
        var t = title ? title.textContent || "" : "";
        var m = t.match(/UID\s*:\s*(\d+)/i);
        return m ? m[1] : "";
      }

      function markTap(el) {
        if (!el) return;
        el.classList.add("veer-tap");
      }
      markTap(title);
      markTap(lvBlock);
      markTap(depBlock);
      markTap(betBlock);

      if (title) {
        title.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
            e.stopPropagation();
            var uid = currentUid();
            openRowEditSheet("Edit UID", uid, "number", function (v) {
              var n = Math.floor(Number(v));
              if (!Number.isFinite(n) || n <= 0) return;
              var p = savePlayerEdit(uid, { userID: n });
              if (p) paintTeamReportRow(row, p);
            });
          },
          true
        );
      }

      if (lvBlock) {
        lvBlock.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
            e.stopPropagation();
            var uid = currentUid();
            var cur =
              (lvBlock.querySelector("span") && lvBlock.querySelector("span").textContent) || "1";
            openRowEditSheet("Edit Level (1 or 2)", cur.trim(), "number", function (v) {
              var n = Math.floor(Number(v));
              if (!Number.isFinite(n) || n < 1) return;
              var p = savePlayerEdit(uid, { lv: n });
              if (p) paintTeamReportRow(row, p);
            });
          },
          true
        );
      }

      if (depBlock) {
        depBlock.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
            e.stopPropagation();
            var uid = currentUid();
            var cur =
              (depBlock.querySelector("span") && depBlock.querySelector("span").textContent) || "0";
            openRowEditSheet("Edit Deposit amount", cur.trim(), "number", function (v) {
              var n = round2(Number(v));
              if (!Number.isFinite(n) || n < 0) return;
              var p = savePlayerEdit(uid, { rechargeAmount: n });
              if (p) paintTeamReportRow(row, p);
            });
          },
          true
        );
      }

      if (betBlock) {
        betBlock.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
            e.stopPropagation();
            var uid = currentUid();
            var cur =
              (betBlock.querySelector("span") && betBlock.querySelector("span").textContent) || "0";
            openRowEditSheet("Edit Bet amount", cur.trim(), "number", function (v) {
              var n = round2(Number(v));
              if (!Number.isFinite(n) || n < 0) return;
              var p = savePlayerEdit(uid, { lotteryAmount: n });
              if (p) paintTeamReportRow(row, p);
            });
          },
          true
        );
      }
    });
  }

  function syncTeamReportRowsFromStorage() {
    if (!promoOn()) return;
    var fake = getFakePromo();
    if (!fake) return;
    var dayKey = readTeamReportDateKey();
    document.querySelectorAll(".TeamReport__C-body-item").forEach(function (row) {
      var title = row.querySelector(".TeamReport__C-body-item-head .title, .title");
      if (!title) return;
      var m = (title.textContent || "").match(/UID\s*:\s*(\d+)/i);
      if (!m) return;
      var hit = findPlayerByUid(fake, dayKey, m[1]);
      if (!hit) {
        var keys = Object.keys(fake.days || {});
        var i;
        for (i = 0; i < keys.length && !hit; i++) {
          hit = findPlayerByUid(fake, keys[i], m[1]);
        }
      }
      if (hit) paintTeamReportRow(row, hit.player);
    });
  }

  // Smooth schedule: skip while edit/studio open; don't thrash Settings DOM (kills clicks)
  var scheduled = false;
  var scheduleTimer = null;
  function schedule() {
    if (scheduled) return;
    if (
      document.querySelector(".veer-edit-backdrop") ||
      document.querySelector(".veer-backdrop") ||
      document.getElementById(STUDIO_ID)
    )
      return;
    scheduled = true;
    if (scheduleTimer) clearTimeout(scheduleTimer);
    scheduleTimer = setTimeout(function () {
      scheduled = false;
      scheduleTimer = null;
      injectRows();
      paintDom();
      bindTeamReportEdits();
      applyBetAmountVisibility();
      if (document.querySelector(".TeamReport__C-body-item")) {
        syncTeamReportRowsFromStorage();
      }
    }, 150);
  }

  function start() {
    ensureStyle();
    syncBetHideClass();
    injectRows();
    paintDom();
    bindTeamReportEdits();
    applyBetAmountVisibility();
    new MutationObserver(function (mutations) {
      var i, m, t;
      for (i = 0; i < mutations.length; i++) {
        m = mutations[i];
        t = m.target;
        if (t && t.nodeType === 1 && t.closest) {
          if (
            t.closest(".veer-edit-backdrop") ||
            t.closest(".veer-backdrop") ||
            t.closest("#" + STUDIO_ID) ||
            t.closest("#veer-settings-tools")
          )
            continue;
        }
        // ignore mutations inside our tools host (reorder/label updates)
        if (m.type === "childList") {
          var n;
          for (n = 0; n < m.addedNodes.length; n++) {
            if (
              m.addedNodes[n].id === "veer-settings-tools" ||
              (m.addedNodes[n].closest && m.addedNodes[n].closest("#veer-settings-tools"))
            )
              return;
          }
          schedule();
          return;
        }
      }
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    setInterval(function () {
      if (
        document.querySelector(".veer-edit-backdrop") ||
        document.querySelector(".veer-backdrop") ||
        document.getElementById(STUDIO_ID)
      )
        return;
      // Settings: labels only if tools already ready (no DOM moves)
      if (onSettingsPage()) {
        var center = document.querySelector(".userInfo__container-setting-center");
        var host = document.getElementById("veer-settings-tools");
        if (host && center && toolsAlreadyReady(host, center)) {
          updateRowLabels();
        } else {
          injectRows();
        }
      }
      paintDom();
      bindTeamReportEdits();
      applyBetAmountVisibility();
    }, 2500);
    window.addEventListener("hashchange", function () {
      schedule();
      setTimeout(syncTeamReportRowsFromStorage, 200);
    });
    window.addEventListener("popstate", schedule);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
