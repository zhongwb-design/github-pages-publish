(function () {
  "use strict";

  const core = window.BodyLogCore;
  const STORAGE_KEY = "bodylog.v1.records";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    records: [],
    activeTab: "today",
    toastTimer: null,
  };

  function loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.records = raw ? JSON.parse(raw).map(core.normalizeRecord) : [];
    } catch (error) {
      state.records = [];
      showToast("本地数据读取失败，已使用空记录");
    }
  }

  function persistRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(core.sortRecords(state.records)));
  }

  function upsertRecord(record) {
    const normalized = core.normalizeRecord({ ...record, updatedAt: new Date().toISOString() });
    const index = state.records.findIndex((item) => item.date === normalized.date);
    if (index >= 0) {
      state.records[index] = { ...state.records[index], ...normalized };
    } else {
      state.records.push(normalized);
    }
    persistRecords();
  }

  function deleteRecord(date) {
    state.records = state.records.filter((record) => record.date !== date);
    persistRecords();
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function setTab(tab) {
    state.activeTab = tab;
    $$(".tab").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
    $$(".view").forEach((view) => view.classList.toggle("is-active", view.id === `view-${tab}`));
    if (tab === "history") renderHistory();
    if (tab === "report") ensureReportDefaults();
  }

  function recordForDate(date) {
    return state.records.find((record) => record.date === date) || null;
  }

  function collectChecked(name) {
    return $$(`input[name="${name}"]:checked`).map((input) => input.value);
  }

  function setChecked(name, values) {
    const selected = new Set(values || []);
    $$(`input[name="${name}"]`).forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function getOptionalScore(name) {
    const row = $(`.optional-score[data-score="${name}"]`);
    return row.dataset.active === "true" ? Number($("input", row).value) : null;
  }

  function setOptionalScore(name, value) {
    const row = $(`.optional-score[data-score="${name}"]`);
    const input = $("input", row);
    const output = $("output", row);
    if (Number.isFinite(value)) {
      row.dataset.active = "true";
      input.value = String(value);
      output.textContent = String(value);
    } else {
      row.dataset.active = "false";
      input.value = "5";
      output.textContent = "未记录";
    }
  }

  function collectForm() {
    return core.normalizeRecord({
      date: $("#date").value || core.todayISO(),
      weight: $("#weight").value,
      sleepHours: $("#sleepHours").value,
      sleepQuality: $("#sleepQuality").value,
      dailyStatus: $("#dailyStatus").value,
      mealTexts: {
        lunch: $("#lunchText").value,
        dinner: $("#dinnerText").value,
        lateNight: $("#lateNightText").value,
      },
      mealSources: {
        lunch: $("#lunchSource").value,
        dinner: $("#dinnerSource").value,
        lateNight: $("#lateNightSource").value,
      },
      workoutText: $("#workoutText").value.trim(),
      steps: $("#steps").value,
      cardioText: $("#cardioText").value.trim(),
      feedbackText: $("#feedbackText").value.trim(),
      noteText: $("#noteText").value.trim(),
      dietTags: collectChecked("dietTags"),
      bodyTags: collectChecked("bodyTags"),
      hunger: getOptionalScore("hunger"),
      stress: getOptionalScore("stress"),
      trainingRpe: getOptionalScore("trainingRpe"),
    });
  }

  function fillForm(record) {
    const normalized = core.normalizeRecord(record || { date: core.todayISO(), sleepQuality: 5 });
    $("#date").value = normalized.date;
    $("#weight").value = normalized.weight ?? "";
    $("#sleepHours").value = normalized.sleepHours ?? "";
    $("#sleepQuality").value = normalized.sleepQuality ?? 5;
    $("#sleepQualityValue").textContent = String(normalized.sleepQuality ?? 5);
    $("#dailyStatus").value = normalized.dailyStatus;
    $("#lunchText").value = normalized.mealTexts.lunch;
    $("#dinnerText").value = normalized.mealTexts.dinner;
    $("#lateNightText").value = normalized.mealTexts.lateNight;
    $("#lunchSource").value = normalized.mealSources.lunch;
    $("#dinnerSource").value = normalized.mealSources.dinner;
    $("#lateNightSource").value = normalized.mealSources.lateNight;
    $("#workoutText").value = normalized.workoutText;
    $("#steps").value = normalized.steps ?? "";
    $("#cardioText").value = normalized.cardioText;
    $("#feedbackText").value = normalized.feedbackText;
    $("#noteText").value = normalized.noteText;
    setChecked("dietTags", normalized.dietTags);
    setChecked("bodyTags", normalized.bodyTags);
    setOptionalScore("hunger", normalized.hunger);
    setOptionalScore("stress", normalized.stress);
    setOptionalScore("trainingRpe", normalized.trainingRpe);
    updateLiveEstimates();
  }

  function updateMetrics() {
    const today = core.todayISO();
    const weightAvg = core.rollingWeightAverage(state.records, today, 7);
    const startWeek = core.addDays(today, -6);
    const weekSummary = core.summarizeRange(state.records, startWeek, today);
    $("#todayPill").textContent = core.formatDateCn(today);
    $("#weightAverage").textContent = weightAvg ? `${weightAvg}kg` : "--";
    $("#streakCount").textContent = `${core.currentStreak(state.records, today)}天`;
    $("#weekWorkouts").textContent = `${weekSummary.workouts}次`;
  }

  function updateLiveEstimates() {
    const dietText = core.composeDietText({
      lunch: $("#lunchText").value,
      dinner: $("#dinnerText").value,
      lateNight: $("#lateNightText").value,
    });
    const nutrition = core.estimateNutrition(dietText);
    const matched = nutrition.matched.slice(0, 4).map((item) => item.name).join("、");
    $("#nutritionEstimate").textContent = nutrition.matched.length
      ? `估算 ${nutrition.calories} kcal，蛋白 ${nutrition.protein}g，碳水 ${nutrition.carbs}g，脂肪 ${nutrition.fat}g。已识别：${matched}${nutrition.unmatchedCount ? `；未识别 ${nutrition.unmatchedCount} 项` : ""}`
      : "输入饮食后自动估算热量和宏量营养。";

    const workout = core.parseWorkout($("#workoutText").value);
    const exerciseText = workout.exercises
      .filter((exercise) => exercise.sets.length)
      .slice(0, 3)
      .map((exercise) => `${exercise.name} ${exercise.sets.length}组`)
      .join("，");
    $("#workoutEstimate").textContent = workout.exercises.length
      ? `解析 ${workout.exercises.length} 个动作，${workout.totalSets} 组，估算容量 ${workout.totalVolume}kg${exerciseText ? `。${exerciseText}` : ""}`
      : "输入训练后自动解析动作、组数和容量。";
  }

  function renderHistory() {
    const list = $("#historyList");
    const records = core.sortRecords(state.records).reverse();
    if (!records.length) {
      list.innerHTML = `<div class="empty-state">暂无记录</div>`;
      return;
    }
    list.innerHTML = records
      .map((record) => {
        const nutrition = core.estimateNutrition(record.dietText);
        const workout = core.parseWorkout(record.workoutText);
        const chips = [
          record.weight ? `${record.weight}kg` : "",
          record.sleepHours ? `${record.sleepHours}h睡眠` : "",
          nutrition.calories ? `${nutrition.calories}kcal` : "",
          workout.totalSets ? `${workout.totalSets}组训练` : "",
          Object.values(record.mealSources || {}).some(Boolean) ? core.formatMealSources(record.mealSources) : "",
          ...record.dietTags,
          ...record.bodyTags,
        ].filter(Boolean);
        return `
          <article class="history-card">
            <div class="history-card-head">
              <div>
                <h3>${core.formatDateCn(record.date)}</h3>
                <p>${record.dailyStatus || "未记录状态"}${record.cardioText ? ` · ${escapeHtml(record.cardioText)}` : ""}</p>
              </div>
              <div class="history-actions">
                <button class="secondary small" type="button" data-edit="${record.date}">编辑</button>
                <button class="secondary small danger" type="button" data-delete="${record.date}">删除</button>
              </div>
            </div>
            <div class="chip-list">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("") || `<span class="chip">无摘要</span>`}</div>
          </article>
        `;
      })
      .join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }

  async function copyText(text, successMessage) {
    if (!text.trim()) {
      showToast("没有可复制的内容");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (error) {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
      showToast(successMessage);
    }
  }

  function ensureReportDefaults() {
    if (!$("#reportEndDate").value) $("#reportEndDate").value = core.todayISO();
    if (!$("#reportOutput").value.trim()) generateReport();
  }

  function generateReport() {
    const report = core.generateReport(state.records, {
      type: $("#reportType").value,
      endDate: $("#reportEndDate").value || core.todayISO(),
    });
    $("#reportOutput").value = report;
  }

  function exportRecords() {
    const blob = new Blob([JSON.stringify(core.sortRecords(state.records), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `body-log-${core.todayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importRecords(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(String(reader.result));
        if (!Array.isArray(incoming)) throw new Error("Invalid JSON");
        const map = new Map(state.records.map((record) => [record.date, record]));
        incoming.map(core.normalizeRecord).forEach((record) => map.set(record.date, record));
        state.records = Array.from(map.values());
        persistRecords();
        updateMetrics();
        renderHistory();
        showToast("导入完成");
      } catch (error) {
        showToast("导入失败，请检查 JSON 文件");
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    $$(".tab").forEach((button) => {
      button.addEventListener("click", () => setTab(button.dataset.tab));
    });

    $("#newTodayBtn").addEventListener("click", () => {
      fillForm(recordForDate(core.todayISO()) || { date: core.todayISO(), sleepQuality: 5 });
    });

    $("#date").addEventListener("change", () => {
      fillForm(recordForDate($("#date").value) || { date: $("#date").value, sleepQuality: 5 });
    });

    $("#sleepQuality").addEventListener("input", () => {
      $("#sleepQualityValue").textContent = $("#sleepQuality").value;
    });

    ["lunchText", "dinnerText", "lateNightText", "workoutText"].forEach((id) => {
      $(`#${id}`).addEventListener("input", updateLiveEstimates);
    });

    $$(".optional-score").forEach((row) => {
      const input = $("input", row);
      const output = $("output", row);
      input.addEventListener("input", () => {
        row.dataset.active = "true";
        output.textContent = input.value;
      });
      $("button", row).addEventListener("click", () => {
        row.dataset.active = "false";
        input.value = "5";
        output.textContent = "未记录";
      });
    });

    $("#recordForm").addEventListener("submit", (event) => {
      event.preventDefault();
      upsertRecord(collectForm());
      updateMetrics();
      renderHistory();
      showToast("已保存");
    });

    $("#copyTodayBtn").addEventListener("click", () => {
      const record = collectForm();
      copyText(core.generateDailySummary(record), "今日摘要已复制");
    });

    $("#historyList").addEventListener("click", (event) => {
      const editDate = event.target.dataset.edit;
      const deleteDate = event.target.dataset.delete;
      if (editDate) {
        const record = recordForDate(editDate);
        if (record) {
          fillForm(record);
          setTab("today");
        }
      }
      if (deleteDate && confirm(`删除 ${core.formatDateCn(deleteDate)} 的记录？`)) {
        deleteRecord(deleteDate);
        updateMetrics();
        renderHistory();
        showToast("已删除");
      }
    });

    $("#generateReportBtn").addEventListener("click", generateReport);
    $("#copyReportBtn").addEventListener("click", () => copyText($("#reportOutput").value, "报告已复制"));
    $("#reportType").addEventListener("change", generateReport);
    $("#reportEndDate").addEventListener("change", generateReport);
    $("#exportBtn").addEventListener("click", exportRecords);
    $("#importFile").addEventListener("change", (event) => importRecords(event.target.files[0]));
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    }
  }

  function init() {
    loadRecords();
    bindEvents();
    fillForm(recordForDate(core.todayISO()) || { date: core.todayISO(), sleepQuality: 5 });
    $("#reportEndDate").value = core.todayISO();
    updateMetrics();
    registerServiceWorker();
  }

  init();
})();
