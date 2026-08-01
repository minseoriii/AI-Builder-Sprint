(function () {
  "use strict";

  const state = {
    config: null,
    supabase: null,
    accessToken: null,
    userId: null,
    loading: false,
    daily: {
      analysisId: null,
      status: null,
      originalText: null,
      recordedOn: null,
      tags: {},
      missingQuestions: [],
      primaryCategory: null,
      categoryRanking: [],
      lastConfirm: null,
    },
    currentRecommendation: null,
    selectedNorthStarCategories: [],
    northStarAnalysisId: null,
  };

  const $ = (id) => document.getElementById(id);

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function shortUserId(uuid) {
    if (!uuid) return "—";
    return uuid.slice(0, 8) + "…";
  }

  function setAuthMessage(text, type) {
    const el = $("auth-message");
    if (!text) {
      el.classList.add("hidden");
      return;
    }
    el.textContent = text;
    el.className = "message " + (type || "info");
    el.classList.remove("hidden");
  }

  function setLoading(on) {
    state.loading = on;
    $("api-loading").classList.toggle("hidden", !on);
    document.querySelectorAll("button").forEach((btn) => {
      if (btn.dataset.keepEnabled) return;
      btn.disabled = on;
    });
    if (!on) updateAuthButtons();
  }

  function showApiResult(method, path, status, body, errorDetail) {
    const summary = `${method} ${path} → HTTP ${status}`;
    $("api-summary").textContent = summary;
    $("api-debug-body").textContent = JSON.stringify(body, null, 2);

    const errEl = $("api-error");
    if (errorDetail) {
      errEl.textContent = `[${errorDetail.code}] ${errorDetail.message}`;
      errEl.classList.remove("hidden");
    } else {
      errEl.classList.add("hidden");
    }
  }

  function parseErrorBody(body) {
    if (body && body.detail && body.detail.code) {
      return { code: body.detail.code, message: body.detail.message };
    }
    return null;
  }

  async function apiCall(method, path, body, triggerBtn) {
    if (state.loading) return null;
    setLoading(true);

    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (state.accessToken) headers.Authorization = "Bearer " + state.accessToken;

    let response;
    let data = null;
    try {
      response = await fetch(path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
      }
    } catch (err) {
      showApiResult(method, path, "NETWORK", null, {
        code: "NETWORK_ERROR",
        message: err.message || "네트워크 오류",
      });
      setLoading(false);
      return null;
    }

    const errorDetail = response.ok ? null : parseErrorBody(data);
    showApiResult(method, path, response.status, data, errorDetail);

    if (response.status === 401) {
      setAuthMessage("세션이 만료되었습니다. 다시 익명 로그인해 주세요.", "error");
      state.accessToken = null;
      state.userId = null;
      updateAuthUI();
    }

    setLoading(false);

    if (!response.ok) return { ok: false, status: response.status, data, error: errorDetail };
    return { ok: true, status: response.status, data };
  }

  function apiV1(path) {
    return state.config.api_v1_prefix + path;
  }

  async function refreshSystemStatus() {
    const health = await fetch("/health");
    const healthData = health.ok ? await health.json() : null;
    $("status-server").textContent = health.ok ? "OK" : "오류";
    $("status-server").className = health.ok ? "status-ok" : "status-bad";

    const ready = await fetch("/api/v1/ready");
    const readyData = ready.ok ? await ready.json() : null;
    if (readyData) {
      $("status-db").textContent = readyData.database_configured ? "설정됨" : "미설정";
      $("status-db").className = readyData.database_configured ? "status-ok" : "status-warn";
      $("status-supabase").textContent = readyData.supabase_auth_configured ? "설정됨" : "미설정";
      $("status-supabase").className = readyData.supabase_auth_configured ? "status-ok" : "status-warn";
      $("status-upstage").textContent = readyData.upstage_configured ? "설정됨" : "미설정";
      $("status-upstage").className = readyData.upstage_configured ? "status-ok" : "status-warn";
    }
    return { healthData, readyData };
  }

  function updateAuthUI() {
    const loggedIn = Boolean(state.accessToken && state.userId);
    $("status-auth").textContent = loggedIn ? "로그인됨" : "미로그인";
    $("status-auth").className = loggedIn ? "status-ok" : "status-warn";
    $("status-user").textContent = loggedIn ? shortUserId(state.userId) : "—";
    updateAuthButtons();
  }

  function updateAuthButtons() {
    const loggedIn = Boolean(state.accessToken);
    const supabaseReady = Boolean(state.config && state.config.supabase_url && state.config.supabase_publishable_key);
    $("btn-anonymous-login").disabled = state.loading || loggedIn || !supabaseReady;
    $("btn-logout").disabled = state.loading || !loggedIn;
  }

  async function initSupabase() {
    if (!state.config.supabase_url || !state.config.supabase_publishable_key) {
      setAuthMessage("Supabase URL 또는 Publishable Key가 설정되지 않았습니다.", "error");
      return;
    }
    state.supabase = window.supabase.createClient(
      state.config.supabase_url,
      state.config.supabase_publishable_key
    );
    const { data } = await state.supabase.auth.getSession();
    if (data.session) {
      state.accessToken = data.session.access_token;
      state.userId = data.session.user.id;
      setAuthMessage("기존 세션을 복원했습니다.", "info");
    }
    updateAuthUI();
  }

  async function anonymousLogin() {
    if (!state.supabase) return;
    setAuthMessage("", "");
    const { data, error } = await state.supabase.auth.signInAnonymously();
    if (error) {
      setAuthMessage("익명 로그인 실패: " + error.message, "error");
      return;
    }
    state.accessToken = data.session.access_token;
    state.userId = data.session.user.id;
    setAuthMessage("익명 로그인 성공", "info");
    updateAuthUI();
  }

  async function logout() {
    if (state.supabase) await state.supabase.auth.signOut();
    state.accessToken = null;
    state.userId = null;
    setAuthMessage("로그아웃했습니다.", "info");
    updateAuthUI();
  }

  function setupTabs() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        $("tab-" + tab.dataset.tab).classList.add("active");
      });
    });
  }

  function fillCategorySelect(selectEl, selected) {
    selectEl.innerHTML = "";
    state.config.constellation_categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      if (cat === selected) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  function renderChips(container, tags, dimension) {
    container.innerHTML = "";
    (tags || []).forEach((tag, idx) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "×";
      rm.title = "삭제";
      rm.addEventListener("click", () => {
        state.daily.tags[dimension].splice(idx, 1);
        renderTagEditors();
      });
      chip.appendChild(rm);
      container.appendChild(chip);
    });
  }

  function renderTagEditors() {
    const wrap = $("daily-tag-editors");
    wrap.innerHTML = "";
    const limits = state.config;
    $("daily-tag-limits").textContent =
      `태그: 차원당 ${limits.tags_per_dimension_max}개, 전체 ${limits.tags_total_max}개, ` +
      `${limits.tag_min_length}~${limits.tag_max_length}자`;

    state.config.daily_record_dimensions.forEach((dim) => {
      const block = document.createElement("div");
      block.className = "tag-editor";
      const label = state.config.dimension_labels[dim] || dim;
      const h = document.createElement("strong");
      h.textContent = `${dim} / ${label}`;
      block.appendChild(h);

      const mq = state.daily.missingQuestions.find((q) => q.dimension === dim);
      if (mq) {
        const qEl = document.createElement("div");
        qEl.className = "missing-q";
        qEl.textContent = "부족 질문: " + mq.question;
        block.appendChild(qEl);
      }

      const chips = document.createElement("div");
      chips.className = "chip-list";
      block.appendChild(chips);
      if (!state.daily.tags[dim]) state.daily.tags[dim] = [];
      renderChips(chips, state.daily.tags[dim], dim);

      const row = document.createElement("div");
      row.className = "tag-input-row";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "태그 추가";
      input.maxLength = limits.tag_max_length;
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.textContent = "추가";
      addBtn.addEventListener("click", () => {
        const val = input.value.trim();
        if (!val) return;
        if (val.length < limits.tag_min_length) return;
        const arr = state.daily.tags[dim];
        if (arr.includes(val)) return;
        if (arr.length >= limits.tags_per_dimension_max) return;
        const total = Object.values(state.daily.tags).reduce((s, a) => s + a.length, 0);
        if (total >= limits.tags_total_max) return;
        arr.push(val);
        input.value = "";
        renderTagEditors();
      });
      row.appendChild(input);
      row.appendChild(addBtn);
      block.appendChild(row);
      wrap.appendChild(block);
    });
  }

  function showDailyStep(step) {
    const labels = {
      a: "단계 A: 자유 기록 분석",
      b: "단계 B: 태그 수정",
      c: "단계 C: 최종 확인",
      d: "단계 D: 완료",
    };
    $("daily-step-indicator").textContent = labels[step];
    ["a", "b", "c", "d"].forEach((s) => {
      $("daily-step-" + s).classList.toggle("hidden", s !== step);
    });
  }

  async function loadHome() {
    const res = await apiCall("GET", apiV1("/home"), undefined, $("btn-home-refresh"));
    if (!res || !res.ok) return;

    const onboarding = await apiCall("GET", apiV1("/me/onboarding"));
    const onboardingData = onboarding && onboarding.ok ? onboarding.data : null;

    if (onboardingData && !onboardingData.onboarding_completed) {
      $("onboarding-card").classList.remove("hidden");
    } else {
      $("onboarding-card").classList.add("hidden");
    }

    renderHome(res.data);
  }

  function renderHome(data) {
    const el = $("home-content");
    if (!data.north_star_text) {
      el.innerHTML = '<p class="empty">북극성이 아직 없습니다. 위 온보딩 카드에서 설정하세요.</p>';
    } else {
      let html = `<p><strong>북극성 원문</strong><br>${escapeHtml(data.north_star_text)}</p>`;
      html += `<p>총 별: ${data.total_star_count} · 오늘 기록: ${data.today_recorded ? "있음" : "없음"}</p>`;

      if (data.comet_recommendation) {
        const r = data.comet_recommendation;
        html += `<div class="sub-card"><strong>혜성 추천</strong><br>${escapeHtml(r.title)} (${escapeHtml(r.target_category)}, ${r.estimated_minutes}분)</div>`;
      }

      if (!data.constellations || data.constellations.length === 0) {
        html += '<p class="empty">성단별 별이 없습니다.</p>';
      } else {
        data.constellations.forEach((c) => {
          html += `<div class="constellation-block">`;
          html += `<strong>${escapeHtml(c.category)}</strong> `;
          html += c.selected_from_north_star ? "(북극성 성단)" : "(미선택)";
          html += ` · ${c.star_count}개`;
          if (c.stars && c.stars.length) {
            html += "<ul>";
            c.stars.forEach((s) => {
              html += `<li>${escapeHtml(s.preview)} <small>(${s.recorded_on})</small></li>`;
            });
            html += "</ul>";
          }
          html += "</div>";
        });
      }
      el.innerHTML = html;
    }
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function analyzeNorthStar() {
    const text = $("onboarding-text").value.trim();
    if (!text) return;
    const res = await apiCall(
      "POST",
      apiV1("/onboarding/north-star/analyze"),
      { text },
      $("btn-north-star-analyze")
    );
    if (!res || !res.ok) return;
    state.northStarAnalysisId = res.data.analysis_id;
    state.selectedNorthStarCategories = res.data.candidates
      .filter((c) => c.recommended)
      .map((c) => c.category);

    const box = $("onboarding-candidates");
    box.classList.remove("hidden");
    box.innerHTML = "<p>성단 후보 (추천 항목이 기본 선택됨):</p>";
    res.data.candidates.forEach((c) => {
      const div = document.createElement("div");
      div.className = "candidate-item";
      const id = "ns-cat-" + c.category.replace(/\W/g, "");
      const checked = c.recommended ? "checked" : "";
      div.innerHTML = `<label><input type="checkbox" id="${id}" value="${escapeHtml(c.category)}" ${checked}> ${escapeHtml(c.category)} (${c.score.toFixed(2)}) — ${escapeHtml(c.reason)}</label>`;
      box.appendChild(div);
    });
    $("btn-north-star-save").classList.remove("hidden");
  }

  async function saveNorthStar() {
    const selected = [];
    $("onboarding-candidates").querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      selected.push(cb.value);
    });
    if (!selected.length || !state.northStarAnalysisId) return;
    const res = await apiCall(
      "PUT",
      apiV1("/onboarding/north-star"),
      { analysis_id: state.northStarAnalysisId, selected_categories: selected },
      $("btn-north-star-save")
    );
    if (!res || !res.ok) return;
    $("onboarding-card").classList.add("hidden");
    loadHome();
  }

  async function analyzeDaily() {
    const text = $("daily-text").value.trim();
    const recorded_on = $("daily-recorded-on").value;
    if (!text || !recorded_on) return;
    const res = await apiCall(
      "POST",
      apiV1("/daily-records/analyze"),
      { text, recorded_on },
      $("btn-daily-analyze")
    );
    if (!res || !res.ok) return;

    state.daily.analysisId = res.data.analysis_id;
    state.daily.status = res.data.status;
    state.daily.originalText = res.data.original_text;
    state.daily.recordedOn = recorded_on;
    state.daily.tags = JSON.parse(JSON.stringify(res.data.tags || {}));
    state.daily.missingQuestions = res.data.missing_questions || [];

    let html = `<p>analysis_id: ${escapeHtml(res.data.analysis_id)}</p>`;
    html += `<p>상태: ${escapeHtml(res.data.status)}</p>`;
    Object.entries(res.data.tags || {}).forEach(([dim, tags]) => {
      html += `<p><strong>${dim}</strong>: ${(tags || []).map(escapeHtml).join(", ") || "—"}</p>`;
    });
    if (res.data.missing_questions && res.data.missing_questions.length) {
      html += "<p><strong>부족 질문</strong></p><ul>";
      res.data.missing_questions.forEach((q) => {
        html += `<li>${escapeHtml(q.dimension)}: ${escapeHtml(q.question)}</li>`;
      });
      html += "</ul>";
    }
    $("daily-analyze-result").innerHTML = html;

    renderTagEditors();
    showDailyStep("b");
  }

  async function classifyDaily() {
    if (!state.daily.analysisId) return;
    const res = await apiCall(
      "PUT",
      apiV1("/daily-records/analyses/" + state.daily.analysisId + "/details"),
      { tags: state.daily.tags },
      $("btn-daily-classify")
    );
    if (!res || !res.ok) return;

    state.daily.status = res.data.status;
    state.daily.primaryCategory = res.data.primary_category;
    state.daily.categoryRanking = res.data.category_ranking || [];
    state.daily.originalText = res.data.original_text;
    state.daily.recordedOn = res.data.recorded_on;

    let html = `<p><strong>원문</strong><br>${escapeHtml(res.data.original_text)}</p>`;
    html += `<p>기록 날짜: ${res.data.recorded_on}</p>`;
    html += "<p><strong>최종 태그</strong></p>";
    Object.entries(res.data.tags).forEach(([dim, tags]) => {
      html += `<p>${dim}: ${tags.map(escapeHtml).join(", ")}</p>`;
    });
    html += `<p><strong>AI 주 성단</strong>: ${escapeHtml(res.data.primary_category)}</p>`;
    html += "<p><strong>성단 순위</strong></p><ul>";
    res.data.category_ranking.forEach((r) => {
      html += `<li>${escapeHtml(r.category)} (${r.score.toFixed(2)}) — ${escapeHtml(r.reason)}</li>`;
    });
    html += "</ul>";
    $("daily-confirm-preview").innerHTML = html;

    fillCategorySelect($("daily-primary-category"), res.data.primary_category);
    showDailyStep("c");
  }

  async function confirmDaily(isRetry) {
    if (!state.daily.analysisId) return;
    const primary = $("daily-primary-category").value;
    const btn = isRetry ? $("btn-daily-retry-confirm") : $("btn-daily-confirm");
    const res = await apiCall(
      "POST",
      apiV1("/daily-records/analyses/" + state.daily.analysisId + "/confirm"),
      { primary_category: primary },
      btn
    );
    if (!res || !res.ok) return;

    state.daily.lastConfirm = res.data;
    let html = `<p>하루 기록 ID: ${escapeHtml(res.data.daily_record_id)}</p>`;
    html += `<p>별 ID: ${escapeHtml(res.data.star_id)}</p>`;
    html += `<p>최종 성단: ${escapeHtml(res.data.primary_category)}</p>`;
    html += `<p>기록 날짜: ${res.data.recorded_on}</p>`;
    if (isRetry) html += "<p><em>재전송 결과 (멱등 동작 확인)</em></p>";
    $("daily-complete-result").innerHTML = html;
    showDailyStep("d");
  }

  async function getRecommendation() {
    const res = await apiCall("GET", apiV1("/comet-recommendations/current"), undefined, $("btn-rec-get"));
    if (!res || !res.ok) return;
    renderRecommendation(res.data.recommendation);
  }

  async function generateRecommendation() {
    const res = await apiCall("POST", apiV1("/comet-recommendations/generate"), {}, $("btn-rec-generate"));
    if (!res || !res.ok) return;
    renderRecommendation(res.data.recommendation);
    if (res.data.reused) {
      $("rec-display").insertAdjacentHTML("beforeend", "<p><em>기존 추천 재사용</em></p>");
    }
  }

  function renderRecommendation(rec) {
    state.currentRecommendation = rec;
    const display = $("rec-display");
    const actions = $("rec-actions");
    if (!rec) {
      display.innerHTML = '<p class="empty">현재 유효한 추천이 없습니다.</p>';
      actions.classList.add("hidden");
      return;
    }
    display.innerHTML = `
      <p><strong>${escapeHtml(rec.title)}</strong></p>
      <p>목표 성단: ${escapeHtml(rec.target_category)}</p>
      <p>${escapeHtml(rec.description)}</p>
      <p>이유: ${escapeHtml(rec.reason)}</p>
      <p>예상 시간: ${rec.estimated_minutes}분 · 만료: ${escapeHtml(rec.expires_at)}</p>
      <p><small>ID: ${escapeHtml(rec.id)}</small></p>
    `;
    actions.classList.remove("hidden");
  }

  async function acceptRecommendation() {
    if (!state.currentRecommendation) return;
    const res = await apiCall(
      "POST",
      apiV1("/comet-recommendations/" + state.currentRecommendation.id + "/accept"),
      {},
      $("btn-rec-accept")
    );
    if (!res || !res.ok) return;
    $("rec-accepted-comet").innerHTML =
      `<p>수락된 혜성: ${escapeHtml(res.data.title)} (${escapeHtml(res.data.target_category)}) — ID ${escapeHtml(res.data.id)}</p>`;
    state.currentRecommendation = null;
    $("rec-actions").classList.add("hidden");
    loadComets();
  }

  async function rejectRecommendation() {
    if (!state.currentRecommendation) return;
    const res = await apiCall(
      "POST",
      apiV1("/comet-recommendations/" + state.currentRecommendation.id + "/reject"),
      {},
      $("btn-rec-reject")
    );
    if (!res || !res.ok) return;
    $("rec-display").insertAdjacentHTML("beforeend", "<p>추천을 거절했습니다.</p>");
    state.currentRecommendation = null;
    $("rec-actions").classList.add("hidden");
  }

  async function createComet() {
    const title = $("comet-title").value.trim();
    const description = $("comet-description").value.trim() || null;
    const target_category = $("comet-target-category").value;
    if (!title) return;
    const res = await apiCall(
      "POST",
      apiV1("/comets"),
      { title, description, target_category },
      $("btn-comet-create")
    );
    if (!res || !res.ok) return;
    loadComets();
  }

  async function loadComets() {
    const res = await apiCall("GET", apiV1("/comets"), undefined, $("btn-comets-list"));
    if (!res || !res.ok) return;
    const wrap = $("comets-list");
    if (!res.data.items || !res.data.items.length) {
      wrap.innerHTML = '<p class="empty">혜성이 없습니다.</p>';
      return;
    }
    wrap.innerHTML = "";
    res.data.items.forEach((c) => {
      const div = document.createElement("div");
      div.className = "comet-row";
      div.innerHTML = `
        <strong>${escapeHtml(c.title)}</strong>
        <div>출처: ${escapeHtml(c.source_type)} · 성단: ${escapeHtml(c.target_category)} · 상태: ${escapeHtml(c.status)}</div>
        <div>생성: ${escapeHtml(c.created_at)}${c.completed_at ? " · 완료: " + escapeHtml(c.completed_at) : ""}</div>
        ${c.star_id ? `<div>별 ID: ${escapeHtml(c.star_id)}</div>` : ""}
      `;
      if (c.status === "PENDING") {
        const actions = document.createElement("div");
        actions.className = "comet-actions";
        const completeBtn = document.createElement("button");
        completeBtn.type = "button";
        completeBtn.textContent = "완료";
        completeBtn.addEventListener("click", () => completeComet(c.id, completeBtn));
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.textContent = "취소";
        cancelBtn.addEventListener("click", () => cancelComet(c.id, cancelBtn));
        actions.appendChild(completeBtn);
        actions.appendChild(cancelBtn);
        div.appendChild(actions);
      }
      wrap.appendChild(div);
    });
  }

  async function completeComet(cometId, btn) {
    const summary = prompt("활동 요약을 입력하세요 (완료 기록):", "혜성 활동을 완료했습니다");
    if (!summary || !summary.trim()) return;
    const res = await apiCall(
      "POST",
      apiV1("/comets/" + cometId + "/complete"),
      { activity_summary: summary.trim() },
      btn
    );
    if (!res || !res.ok) return;

    const starRes = await apiCall(
      "POST",
      apiV1("/comets/" + cometId + "/create-star"),
      {},
      btn
    );
    if (starRes && starRes.ok) {
      alert(
        `별 생성: ${starRes.data.star_id}\n성단: ${starRes.data.category}\n` +
          `(재호출 시 동일 star_id: ${starRes.data.record_status})`
      );
    }
    loadComets();
  }

  async function cancelComet(cometId, btn) {
    const res = await apiCall("POST", apiV1("/comets/" + cometId + "/cancel"), {}, btn);
    if (!res || !res.ok) return;
    loadComets();
  }

  async function loadGalaxyOverview() {
    const year = $("galaxy-year").value;
    const season = $("galaxy-season").value;
    let path = apiV1("/galaxy/overview");
    const params = [];
    if (year) params.push("year=" + encodeURIComponent(year));
    if (season) params.push("season=" + encodeURIComponent(season));
    if (params.length) path += "?" + params.join("&");

    const res = await apiCall("GET", path, undefined, $("btn-galaxy-overview"));
    if (!res || !res.ok) return;

    const d = res.data;
    let html = `<p>${d.year}년 ${escapeHtml(d.season_label)} (${d.season})</p>`;
    if (d.north_star_text) html += `<p><strong>북극성</strong>: ${escapeHtml(d.north_star_text)}</p>`;
    html += `<p>총 별: ${d.total_star_count} · 관측 성단: ${d.observed_constellation_count} · 활성 북극성 성단: ${d.active_constellation_count}</p>`;
    html += `<p>관측 기간: ${d.observation_days}일 · 미선택 성단 별: ${d.unselected_category_star_count}</p>`;

    if (d.largest_category) {
      html += `<p>가장 큰 성단: ${escapeHtml(d.largest_category.category)} (${d.largest_category.star_count})</p>`;
    }
    if (d.smallest_selected_category) {
      html += `<p>가장 작은 선택 성단: ${escapeHtml(d.smallest_selected_category.category)} (${d.smallest_selected_category.star_count})</p>`;
    }
    if (d.unobserved_selected_categories && d.unobserved_selected_categories.length) {
      html += `<p>미관측 선택 성단: ${d.unobserved_selected_categories.map(escapeHtml).join(", ")}</p>`;
    }

    if (d.constellations && d.constellations.length) {
      html += "<h4>성단별 분포</h4>";
      d.constellations.forEach((c) => {
        const pct = Math.round((c.ratio || 0) * 100);
        html += `<div class="progress-row"><span>${escapeHtml(c.category)}</span><div class="bar-wrap"><div class="bar" style="width:${pct}%"></div></div><span>${c.star_count} (${pct}%)</span></div>`;
      });
    }

    if (d.summary && d.summary.lines) {
      html += '<div class="summary-lines"><h4>AI 세 줄 요약</h4>';
      d.summary.lines.forEach((line) => {
        html += `<p>${escapeHtml(line)}</p>`;
      });
      html += "</div>";
    }

    $("galaxy-overview-result").innerHTML = html;
  }

  async function loadReportsList() {
    const res = await apiCall("GET", apiV1("/galaxy/reports"), undefined, $("btn-reports-list"));
    if (!res || !res.ok) return;
    const wrap = $("reports-list");
    if (!res.data.items || !res.data.items.length) {
      wrap.innerHTML = '<p class="empty">리포트가 없습니다.</p>';
      return;
    }
    let html = "<table><tr><th>ID</th><th>기간</th><th>별 수</th><th>생성</th></tr>";
    res.data.items.forEach((r) => {
      html += `<tr><td><code>${escapeHtml(r.id.slice(0, 8))}…</code></td><td>${r.year} ${escapeHtml(r.season_label)}</td><td>${r.total_star_count}</td><td>${escapeHtml(r.created_at)}</td></tr>`;
    });
    html += "</table>";
    wrap.innerHTML = html;
  }

  async function generateReport() {
    const year = $("report-gen-year").value;
    const season = $("report-gen-season").value;
    if (!year) return;
    const res = await apiCall(
      "POST",
      apiV1("/galaxy/reports/" + year + "/" + season + "/generate"),
      {},
      $("btn-report-generate")
    );
    if (!res || !res.ok) return;
    $("report-detail-id").value = res.data.id;
    renderReportDetail(res.data);
    loadReportsList();
  }

  async function loadReportDetail() {
    const id = $("report-detail-id").value.trim();
    if (!id) return;
    const res = await apiCall("GET", apiV1("/galaxy/reports/" + id), undefined, $("btn-report-detail"));
    if (!res || !res.ok) return;
    renderReportDetail(res.data);
  }

  function renderReportDetail(d) {
    let html = `<p><strong>${d.year}년 ${escapeHtml(d.season_label)}</strong> (${d.season_start} ~ ${d.season_end})</p>`;
    html += `<p>생성 기준: ${d.generated_through} · 생성 시각: ${escapeHtml(d.created_at)}</p>`;

    const stats = d.statistics_snapshot || {};
    if (stats.constellations) {
      html += "<div class='report-section'><h4>성단 분포 (스냅샷)</h4>";
      html += "<pre>" + escapeHtml(JSON.stringify(stats.constellations, null, 2)) + "</pre></div>";
    }

    const ai = d.ai_analysis || {};
    html += "<div class='report-section'><h4>AI 분석</h4>";
    Object.entries(ai).forEach(([k, v]) => {
      html += `<p><strong>${escapeHtml(k)}</strong>: ${escapeHtml(v)}</p>`;
    });
    html += "</div>";

    html += `<p><strong>종합 소감 질문</strong>: ${escapeHtml(d.reflection_question)}</p>`;
    if (d.reflection) {
      html += `<p><strong>사용자 종합 소감</strong>: ${escapeHtml(d.reflection)}</p>`;
    }

    $("report-detail-result").innerHTML = html;
  }

  async function saveReportReflection() {
    const id = $("report-detail-id").value.trim();
    const reflection = $("report-reflection").value.trim();
    if (!id || !reflection) return;
    const res = await apiCall(
      "PUT",
      apiV1("/galaxy/reports/" + id + "/reflection"),
      { reflection },
      $("btn-report-save-reflection")
    );
    if (!res || !res.ok) return;
    renderReportDetail(res.data);
  }

  function bindEvents() {
    $("btn-anonymous-login").addEventListener("click", anonymousLogin);
    $("btn-logout").addEventListener("click", logout);
    $("btn-home-refresh").addEventListener("click", loadHome);
    $("btn-north-star-analyze").addEventListener("click", analyzeNorthStar);
    $("btn-north-star-save").addEventListener("click", saveNorthStar);
    $("btn-daily-analyze").addEventListener("click", analyzeDaily);
    $("btn-daily-classify").addEventListener("click", classifyDaily);
    $("btn-daily-confirm").addEventListener("click", () => confirmDaily(false));
    $("btn-daily-retry-confirm").addEventListener("click", () => confirmDaily(true));
    $("btn-daily-go-home").addEventListener("click", () => {
      document.querySelector('.tab[data-tab="home"]').click();
      loadHome();
    });
    $("btn-rec-get").addEventListener("click", getRecommendation);
    $("btn-rec-generate").addEventListener("click", generateRecommendation);
    $("btn-rec-accept").addEventListener("click", acceptRecommendation);
    $("btn-rec-reject").addEventListener("click", rejectRecommendation);
    $("btn-comet-create").addEventListener("click", createComet);
    $("btn-comets-list").addEventListener("click", loadComets);
    $("btn-galaxy-overview").addEventListener("click", loadGalaxyOverview);
    $("btn-reports-list").addEventListener("click", loadReportsList);
    $("btn-report-generate").addEventListener("click", generateReport);
    $("btn-report-detail").addEventListener("click", loadReportDetail);
    $("btn-report-save-reflection").addEventListener("click", saveReportReflection);
  }

  async function init() {
    setupTabs();
    bindEvents();

    $("daily-recorded-on").value = todayISO();
    $("galaxy-year").value = new Date().getFullYear();
    $("report-gen-year").value = new Date().getFullYear();

    await refreshSystemStatus();

    const cfgRes = await fetch("/demo/config");
    if (!cfgRes.ok) {
      setAuthMessage("데모 설정을 불러올 수 없습니다.", "error");
      return;
    }
    state.config = await cfgRes.json();

    fillCategorySelect($("comet-target-category"), state.config.constellation_categories[0]);
    fillCategorySelect($("daily-primary-category"), state.config.constellation_categories[0]);

    await initSupabase();
  }

  init();
})();
