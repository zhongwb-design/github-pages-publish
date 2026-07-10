(function (global) {
  "use strict";

  const REPORT_TYPES = {
    weekly: { label: "周报", days: 7 },
    biweekly: { label: "双周报", days: 14 },
    monthly: { label: "月报", days: 30 },
  };

  const FOOD_DB = [
    { aliases: ["蛋白棒"], baseQty: 1, kcal: 210, protein: 20, carbs: 18, fat: 7, unit: "根", kind: "count" },
    { aliases: ["蛋白粉"], baseQty: 1, kcal: 120, protein: 24, carbs: 3, fat: 2, unit: "勺", kind: "count" },
    { aliases: ["牛奶", "纯牛奶"], baseQty: 250, kcal: 155, protein: 8, carbs: 12, fat: 8, unit: "ml", kind: "volume" },
    { aliases: ["酸奶"], baseQty: 200, kcal: 140, protein: 7, carbs: 18, fat: 4, unit: "g", kind: "weight" },
    { aliases: ["鸡蛋", "水煮蛋"], baseQty: 1, kcal: 72, protein: 6, carbs: 0, fat: 5, unit: "个", kind: "count" },
    { aliases: ["米饭", "白饭"], baseQty: 1, kcal: 230, protein: 5, carbs: 50, fat: 1, unit: "碗", kind: "count" },
    { aliases: ["面条", "面"], baseQty: 1, kcal: 420, protein: 14, carbs: 75, fat: 8, unit: "碗", kind: "count" },
    { aliases: ["燕麦"], baseQty: 50, kcal: 190, protein: 7, carbs: 33, fat: 4, unit: "g", kind: "weight" },
    { aliases: ["面包", "吐司"], baseQty: 1, kcal: 90, protein: 3, carbs: 16, fat: 2, unit: "片", kind: "count" },
    { aliases: ["寿司"], baseQty: 1, kcal: 520, protein: 18, carbs: 80, fat: 14, unit: "份", kind: "count" },
    { aliases: ["鸡胸", "鸡胸肉"], baseQty: 100, kcal: 165, protein: 31, carbs: 0, fat: 4, unit: "g", kind: "weight" },
    { aliases: ["牛肉"], baseQty: 100, kcal: 220, protein: 26, carbs: 0, fat: 13, unit: "g", kind: "weight" },
    { aliases: ["鱼", "鱼肉"], baseQty: 100, kcal: 140, protein: 22, carbs: 0, fat: 5, unit: "g", kind: "weight" },
    { aliases: ["虾", "河虾", "炒河虾"], baseQty: 100, kcal: 110, protein: 22, carbs: 2, fat: 2, unit: "g", kind: "weight" },
    { aliases: ["豆腐"], baseQty: 100, kcal: 90, protein: 9, carbs: 3, fat: 5, unit: "g", kind: "weight" },
    { aliases: ["鱼香茄子"], baseQty: 1, kcal: 320, protein: 5, carbs: 28, fat: 21, unit: "份", kind: "count" },
    { aliases: ["沙拉"], baseQty: 1, kcal: 220, protein: 8, carbs: 18, fat: 12, unit: "份", kind: "count" },
    { aliases: ["香蕉"], baseQty: 1, kcal: 105, protein: 1, carbs: 27, fat: 0, unit: "根", kind: "count" },
    { aliases: ["苹果"], baseQty: 1, kcal: 95, protein: 0, carbs: 25, fat: 0, unit: "个", kind: "count" },
    { aliases: ["啤酒"], baseQty: 500, kcal: 215, protein: 2, carbs: 18, fat: 0, unit: "ml", kind: "volume" },
  ];

  const CN_NUMBERS = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    半: 0.5,
  };

  const MEAL_SOURCE_LABELS = {
    lunch: "午餐",
    dinner: "晚餐",
    lateNight: "宵夜",
  };

  const MEAL_SOURCE_VALUES = new Set(["外卖", "外食", "家常"]);

  function todayISO() {
    return toISODate(new Date());
  }

  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDate(iso) {
    const [year, month, day] = String(iso || "").split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  function addDays(iso, days) {
    const date = parseDate(iso);
    if (!date) return todayISO();
    date.setDate(date.getDate() + days);
    return toISODate(date);
  }

  function formatDateCn(iso) {
    const date = parseDate(iso);
    if (!date) return iso || "";
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  }

  function toNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function round(value, digits = 1) {
    if (!Number.isFinite(value)) return null;
    const base = 10 ** digits;
    return Math.round(value * base) / base;
  }

  function average(values, digits = 1) {
    const nums = values.filter((value) => Number.isFinite(value));
    if (!nums.length) return null;
    return round(nums.reduce((sum, value) => sum + value, 0) / nums.length, digits);
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function parseCnNumber(text) {
    const value = String(text || "").trim();
    if (!value) return null;
    if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
    if (value === "半") return 0.5;
    if (value.includes("十")) {
      const [left, right] = value.split("十");
      const tens = left ? CN_NUMBERS[left] || 0 : 1;
      const ones = right ? CN_NUMBERS[right] || 0 : 0;
      return tens * 10 + ones;
    }
    if (Object.prototype.hasOwnProperty.call(CN_NUMBERS, value)) return CN_NUMBERS[value];
    return null;
  }

  function getQuantity(fragment, food, alias) {
    const text = String(fragment || "");
    if (food.kind === "volume") {
      const volumeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ml|毫升)/i);
      if (volumeMatch) return Number(volumeMatch[1]) / food.baseQty;
    }
    if (food.kind === "weight") {
      const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:g|克)/i);
      if (weightMatch) return Number(weightMatch[1]) / food.baseQty;
    }

    const qtyPattern = "([\\d.]+|[一二两三四五六七八九十半]+)";
    const unitPattern = "(?:个|颗|只|份|根|条|块|片|碗|杯|瓶|勺)?";
    const escapedAlias = escapeRegExp(alias);
    const before = text.match(new RegExp(`${qtyPattern}\\s*${unitPattern}\\s*${escapedAlias}`));
    if (before) {
      const parsed = parseCnNumber(before[1]);
      if (parsed !== null) return parsed;
    }
    const after = text.match(new RegExp(`${escapedAlias}\\s*${qtyPattern}\\s*${unitPattern}`));
    if (after) {
      const parsed = parseCnNumber(after[1]);
      if (parsed !== null) return parsed;
    }
    return 1;
  }

  function splitFoodFragments(text) {
    return String(text || "")
      .replace(/\r/g, "\n")
      .split(/[\n,，、;；]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function estimateNutrition(text) {
    const fragments = splitFoodFragments(text);
    const matched = [];
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    fragments.forEach((fragment) => {
      let bestMatch = null;
      for (const food of FOOD_DB) {
        for (const alias of food.aliases) {
          if (!fragment.includes(alias)) continue;
          if (!bestMatch || alias.length > bestMatch.alias.length) {
            bestMatch = { food, alias };
          }
        }
      }
      if (bestMatch) {
        const { food, alias } = bestMatch;
        const quantity = getQuantity(fragment, food, alias);
        totals.calories += food.kcal * quantity;
        totals.protein += food.protein * quantity;
        totals.carbs += food.carbs * quantity;
        totals.fat += food.fat * quantity;
        matched.push({
          name: food.aliases[0],
          quantity: round(quantity, 2),
          unit: food.unit,
          calories: Math.round(food.kcal * quantity),
          protein: round(food.protein * quantity, 1),
        });
      }
    });

    return {
      calories: Math.round(totals.calories),
      protein: round(totals.protein, 1) || 0,
      carbs: round(totals.carbs, 1) || 0,
      fat: round(totals.fat, 1) || 0,
      matched,
      unmatchedCount: Math.max(0, fragments.length - matched.length),
      confidence: fragments.length ? round(matched.length / fragments.length, 2) : 0,
    };
  }

  function parseSetLine(line) {
    const text = String(line || "").trim();
    const weighted = text.match(/^(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)?\s*[x×*]\s*(\d+)(?:\s*[x×*]\s*(\d+))?$/i);
    if (weighted) {
      const weight = Number(weighted[1]);
      const reps = Number(weighted[2]);
      const repeat = weighted[3] ? Number(weighted[3]) : 1;
      return Array.from({ length: Math.max(1, repeat) }, () => ({ weight, reps, volume: weight * reps }));
    }
    const repsOnly = text.match(/^(\d+)\s*(?:次|reps?)?$/i);
    if (repsOnly) {
      const reps = Number(repsOnly[1]);
      return [{ weight: null, reps, volume: 0 }];
    }
    return null;
  }

  function isSessionLabel(line) {
    return /^(push|pull|legs?|upper|lower|full body|胸|背|腿|肩|手臂|有氧|休息)$/i.test(String(line || "").trim());
  }

  function parseWorkout(text) {
    const lines = String(text || "")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const exercises = [];
    const sessionLabels = [];
    let current = null;

    lines.forEach((line) => {
      const sets = parseSetLine(line);
      if (sets && current) {
        current.sets.push(...sets);
        return;
      }
      if (isSessionLabel(line)) {
        sessionLabels.push(line);
        current = null;
        return;
      }
      current = { name: line, sets: [] };
      exercises.push(current);
    });

    const totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    const totalVolume = exercises.reduce(
      (sum, exercise) => sum + exercise.sets.reduce((itemSum, set) => itemSum + (set.volume || 0), 0),
      0
    );

    return {
      sessionLabels,
      exercises: exercises.filter((exercise) => exercise.sets.length || exercise.name),
      totalSets,
      totalVolume: Math.round(totalVolume),
    };
  }

  function setsToText(sets) {
    return sets
      .map((set) => {
        if (Number.isFinite(set.weight)) return `${set.weight}x${set.reps}`;
        return `${set.reps}次`;
      })
      .join(" / ");
  }

  function normalizeMealSources(record) {
    const sources = record.mealSources && typeof record.mealSources === "object" ? record.mealSources : {};
    const normalizeSource = (key, fallbackKey) => {
      const value = sources[key] || record[fallbackKey] || "";
      return MEAL_SOURCE_VALUES.has(value) ? value : "";
    };
    return {
      lunch: normalizeSource("lunch", "lunchSource"),
      dinner: normalizeSource("dinner", "dinnerSource"),
      lateNight: normalizeSource("lateNight", "lateNightSource"),
    };
  }

  function parseLegacyMealTexts(text) {
    const raw = String(text || "").trim();
    const parsed = { lunch: "", dinner: "", lateNight: "" };
    if (!raw) return parsed;

    const mealMap = { 午餐: "lunch", 晚餐: "dinner", 宵夜: "lateNight", 夜宵: "lateNight" };
    const pattern = /(午餐|晚餐|宵夜|夜宵)\s*[：:]\s*([\s\S]*?)(?=\n?\s*(?:午餐|晚餐|宵夜|夜宵)\s*[：:]|$)/g;
    let matched = false;
    let match = pattern.exec(raw);
    while (match) {
      matched = true;
      const key = mealMap[match[1]];
      parsed[key] = [parsed[key], match[2].trim()].filter(Boolean).join("\n");
      match = pattern.exec(raw);
    }
    if (!matched) parsed.dinner = raw;
    return parsed;
  }

  function normalizeMealTexts(record) {
    const texts = record.mealTexts && typeof record.mealTexts === "object" ? record.mealTexts : {};
    const normalizeText = (key, fallbackKey) => String(texts[key] || record[fallbackKey] || "").trim();
    const normalized = {
      lunch: normalizeText("lunch", "lunchText"),
      dinner: normalizeText("dinner", "dinnerText"),
      lateNight: normalizeText("lateNight", "lateNightText"),
    };
    return Object.values(normalized).some(Boolean) ? normalized : parseLegacyMealTexts(record.dietText);
  }

  function composeDietText(mealTexts, fallbackText = "") {
    const normalized = normalizeMealTexts({ mealTexts });
    const lines = Object.entries(MEAL_SOURCE_LABELS)
      .map(([key, label]) => (normalized[key] ? `${label}：${normalized[key]}` : ""))
      .filter(Boolean);
    return lines.length ? lines.join("\n") : String(fallbackText || "").trim();
  }

  function formatMealSources(mealSources, includeEmpty = false) {
    const normalized = normalizeMealSources({ mealSources });
    const entries = Object.entries(MEAL_SOURCE_LABELS)
      .map(([key, label]) => {
        const value = normalized[key];
        if (!value && !includeEmpty) return "";
        return `${label}：${value || "未记录"}`;
      })
      .filter(Boolean);
    return entries.length ? entries.join("，") : "无";
  }

  function normalizeRecord(record) {
    const mealTexts = normalizeMealTexts(record);
    return {
      id: record.id || `${record.date || todayISO()}-${Date.now()}`,
      date: record.date || todayISO(),
      weight: toNumber(record.weight),
      sleepHours: toNumber(record.sleepHours),
      sleepQuality: toNumber(record.sleepQuality),
      dailyStatus: record.dailyStatus || "",
      mealTexts,
      dietText: composeDietText(mealTexts, record.dietText),
      mealSources: normalizeMealSources(record),
      workoutText: record.workoutText || "",
      steps: toNumber(record.steps),
      cardioText: record.cardioText || "",
      feedbackText: record.feedbackText || "",
      noteText: record.noteText || "",
      dietTags: Array.isArray(record.dietTags) ? record.dietTags : [],
      bodyTags: Array.isArray(record.bodyTags) ? record.bodyTags : [],
      hunger: toNumber(record.hunger),
      stress: toNumber(record.stress),
      trainingRpe: toNumber(record.trainingRpe),
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || new Date().toISOString(),
    };
  }

  function sortRecords(records) {
    return records.map(normalizeRecord).sort((a, b) => a.date.localeCompare(b.date));
  }

  function recordsInRange(records, startDate, endDate) {
    return sortRecords(records).filter((record) => record.date >= startDate && record.date <= endDate);
  }

  function rollingWeightAverage(records, endDate, days = 7) {
    const startDate = addDays(endDate, -(days - 1));
    return average(recordsInRange(records, startDate, endDate).map((record) => record.weight), 2);
  }

  function currentStreak(records, endDate = todayISO()) {
    const dates = new Set(sortRecords(records).map((record) => record.date));
    let cursor = endDate;
    let count = 0;
    while (dates.has(cursor)) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  function countBy(items) {
    return items.reduce((map, item) => {
      if (!item) return map;
      map[item] = (map[item] || 0) + 1;
      return map;
    }, {});
  }

  function formatCountMap(map) {
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return "无";
    return entries.map(([key, value]) => `${key}${value}天`).join("，");
  }

  function summarizeRange(records, startDate, endDate) {
    const rangeRecords = recordsInRange(records, startDate, endDate);
    const nutritionList = rangeRecords.map((record) => estimateNutrition(record.dietText));
    const workoutList = rangeRecords.map((record) => ({ record, parsed: parseWorkout(record.workoutText) }));
    const dietTags = rangeRecords.flatMap((record) => record.dietTags);
    const bodyTags = rangeRecords.flatMap((record) => record.bodyTags);
    const exerciseNames = workoutList.flatMap((item) => item.parsed.exercises.map((exercise) => exercise.name));

    return {
      records: rangeRecords,
      expectedDays: Math.round((parseDate(endDate) - parseDate(startDate)) / 86400000) + 1,
      weightAverage: average(rangeRecords.map((record) => record.weight), 2),
      sleepAverage: average(rangeRecords.map((record) => record.sleepHours), 1),
      sleepQualityAverage: average(rangeRecords.map((record) => record.sleepQuality), 1),
      hungerAverage: average(rangeRecords.map((record) => record.hunger), 1),
      stressAverage: average(rangeRecords.map((record) => record.stress), 1),
      trainingRpeAverage: average(rangeRecords.map((record) => record.trainingRpe), 1),
      stepsAverage: Math.round(average(rangeRecords.map((record) => record.steps), 0) || 0) || null,
      nutritionAverage: {
        calories: Math.round(average(nutritionList.map((item) => item.calories), 0) || 0) || null,
        protein: average(nutritionList.map((item) => item.protein), 1),
        carbs: average(nutritionList.map((item) => item.carbs), 1),
        fat: average(nutritionList.map((item) => item.fat), 1),
      },
      workouts: workoutList.filter((item) => item.record.workoutText.trim()).length,
      cardioSessions: rangeRecords.filter((record) => record.cardioText.trim()).length,
      totalSets: workoutList.reduce((sum, item) => sum + item.parsed.totalSets, 0),
      totalVolume: workoutList.reduce((sum, item) => sum + item.parsed.totalVolume, 0),
      dietTagCounts: countBy(dietTags),
      bodyTagCounts: countBy(bodyTags),
      statusCounts: countBy(rangeRecords.map((record) => record.dailyStatus)),
      exerciseCounts: countBy(exerciseNames),
      recentExercises: workoutList
        .flatMap((item) =>
          item.parsed.exercises
            .filter((exercise) => exercise.sets.length)
            .slice(0, 4)
            .map((exercise) => `${exercise.name}: ${setsToText(exercise.sets)}`)
        )
        .slice(-8),
      feedback: rangeRecords
        .filter((record) => record.feedbackText.trim() || record.noteText.trim())
        .map((record) => `${formatDateCn(record.date)}：${[record.feedbackText, record.noteText].filter(Boolean).join("；")}`)
        .slice(-8),
    };
  }

  function valueOrDash(value, suffix = "") {
    if (value === null || value === undefined || value === "") return "--";
    return `${value}${suffix}`;
  }

  function indentRawText(text) {
    return String(text || "")
      .trim()
      .split(/\r?\n/)
      .map((line) => `  ${line}`)
      .join("\n");
  }

  function formatRawEntries(records, field, emptyText) {
    const entries = records
      .filter((record) => String(record[field] || "").trim())
      .map((record) => `- ${formatDateCn(record.date)}：\n${indentRawText(record[field])}`);
    return entries.length ? entries.join("\n") : `- ${emptyText}`;
  }

  function formatMealSourceEntries(records) {
    const entries = records
      .filter((record) => Object.values(record.mealSources || {}).some(Boolean))
      .map((record) => `- ${formatDateCn(record.date)}：${formatMealSources(record.mealSources, true)}`);
    return entries.length ? entries.join("\n") : "- 无饮食场景记录";
  }

  function formatMealTextLine(label, source, text) {
    const sourceText = source ? `（${source}）` : "";
    const lines = String(text || "").trim().split(/\r?\n/);
    if (!lines.length || !lines[0]) return "";
    return [`  ${label}${sourceText}：${lines[0]}`, ...lines.slice(1).map((line) => `    ${line}`)].join("\n");
  }

  function formatMealTextEntries(records) {
    const entries = records
      .filter((record) => String(record.dietText || "").trim())
      .map((record) => {
        const mealLines = Object.entries(MEAL_SOURCE_LABELS)
          .map(([key, label]) => formatMealTextLine(label, record.mealSources?.[key], record.mealTexts?.[key]))
          .filter(Boolean);
        if (mealLines.length) return `- ${formatDateCn(record.date)}：\n${mealLines.join("\n")}`;
        return `- ${formatDateCn(record.date)}：\n${indentRawText(record.dietText)}`;
      });
    return entries.length ? entries.join("\n") : "- 无饮食记录";
  }

  function formatScoreEntries(records, field, suffix = "/10") {
    const entries = records
      .filter((record) => Number.isFinite(record[field]))
      .map((record) => `- ${formatDateCn(record.date)}：${record[field]}${suffix}`);
    return entries.length ? entries.join("\n") : "- 无";
  }

  function generateReport(records, options = {}) {
    const type = REPORT_TYPES[options.type] ? options.type : "weekly";
    const endDate = options.endDate || todayISO();
    const days = REPORT_TYPES[type].days;
    const startDate = addDays(endDate, -(days - 1));
    const summary = summarizeRange(records, startDate, endDate);
    const rollingAverage = rollingWeightAverage(records, endDate, 7);

    return [
      `${formatDateCn(endDate)} ${REPORT_TYPES[type].label}`,
      "",
      `周期：${formatDateCn(startDate)} - ${formatDateCn(endDate)}`,
      `记录天数：${summary.records.length}/${summary.expectedDays}`,
      "",
      "身体与恢复",
      `- 周期平均体重：${valueOrDash(summary.weightAverage, "kg")}`,
      `- 7日体重均值：${valueOrDash(rollingAverage, "kg")}`,
      `- 平均睡眠：${valueOrDash(summary.sleepAverage, "h")}`,
      `- 睡眠质量：${valueOrDash(summary.sleepQualityAverage, "/10")}`,
      `- 今日状态分布：${formatCountMap(summary.statusCounts)}`,
      `- 饥饿感：${valueOrDash(summary.hungerAverage, "/10")}`,
      `- 压力：${valueOrDash(summary.stressAverage, "/10")}`,
      "",
      "饮食原文",
      formatMealTextEntries(summary.records),
      "饮食场景",
      formatMealSourceEntries(summary.records),
      `- 饮食标签：${formatCountMap(summary.dietTagCounts)}`,
      "",
      "训练原文",
      formatRawEntries(summary.records, "workoutText", "无训练记录"),
      "训练强度 RPE 记录",
      formatScoreEntries(summary.records, "trainingRpe"),
      "",
      "活动",
      `- 平均步数：${valueOrDash(summary.stepsAverage, "步")}`,
      `- 有氧次数：${summary.cardioSessions}次`,
      "有氧记录",
      formatRawEntries(summary.records, "cardioText", "无有氧记录"),
      "",
      "身体反馈与备注",
      `- 身体标签：${formatCountMap(summary.bodyTagCounts)}`,
      summary.feedback.length ? summary.feedback.map((item) => `- ${item}`).join("\n") : "- 无",
      "",
      "请 AI 重点评估",
      "- 减脂或增肌速度是否合理",
      "- 根据饮食原文判断热量和蛋白是否需要调整",
      "- 根据训练原文判断训练安排、进步和疲劳是否合理",
      "- 睡眠、压力、疼痛和恢复是否存在风险",
    ].join("\n");
  }

  function generateDailySummary(record) {
    const normalized = normalizeRecord(record);
    const nutrition = estimateNutrition(normalized.dietText);
    const workout = parseWorkout(normalized.workoutText);
    return [
      `${formatDateCn(normalized.date)} 每日记录`,
      `体重：${valueOrDash(normalized.weight, "kg")}`,
      `睡眠：${valueOrDash(normalized.sleepHours, "h")}，质量 ${valueOrDash(normalized.sleepQuality, "/10")}`,
      `状态：${normalized.dailyStatus || "未记录"}`,
      `饮食场景：${formatMealSources(normalized.mealSources, true)}`,
      `饮食内容：\n${indentRawText(normalized.dietText || "无")}`,
      `饮食估算：${nutrition.calories || "--"} kcal，蛋白 ${nutrition.protein || "--"}g，碳水 ${nutrition.carbs || "--"}g，脂肪 ${nutrition.fat || "--"}g`,
      `训练：${workout.totalSets}组，容量 ${workout.totalVolume}kg`,
      `活动：${valueOrDash(normalized.steps, "步")}，${normalized.cardioText || "无有氧记录"}`,
      `快速标签：${[...normalized.dietTags, ...normalized.bodyTags].join("，") || "无"}`,
      `反馈：${normalized.feedbackText || "无"}`,
      `备注：${normalized.noteText || "无"}`,
    ].join("\n");
  }

  const api = {
    REPORT_TYPES,
    FOOD_DB,
    MEAL_SOURCE_LABELS,
    todayISO,
    addDays,
    formatDateCn,
    toNumber,
    round,
    average,
    estimateNutrition,
    parseWorkout,
    setsToText,
    composeDietText,
    formatMealSources,
    normalizeRecord,
    sortRecords,
    recordsInRange,
    rollingWeightAverage,
    currentStreak,
    summarizeRange,
    generateReport,
    generateDailySummary,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.BodyLogCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
