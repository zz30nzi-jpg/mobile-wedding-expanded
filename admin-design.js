function designData() {
  const data = window.WEDDING_DESIGN.normalize(invitationData);
  window.WEDDING_AI_SETTINGS = () => data.designSystem.aiSettings;
  return data;
}

async function saveDesignData(message, rerender) {
  try {
    await window.RSVP_STORAGE.saveInvitationData(invitationData);
    rerender(message || "저장했습니다.");
  } catch (error) {
    alert(error.message || "저장하지 못했습니다.");
  }
}

function designOptions(items, selected) {
  return items.filter((item) => item.enabled !== false).map((item) =>
    `<option value="${escapeAdminHtml(item.id)}" ${item.id === selected ? "selected" : ""}>${escapeAdminHtml(item.name)}</option>`).join("");
}

function presetOptions(themes, selected) {
  const group = (type, label) => `<optgroup label="${label}">${designOptions(themes.filter((theme) => theme.type === type), selected)}</optgroup>`;
  return `${group("color", "컬러테마")}${group("movie", "영화테마")}`;
}

function presetSelect(name, label, themes, selected) {
  return `<label class="field"><span>${label}</span><select name="${name}">${presetOptions(themes, selected)}</select></label>`;
}

function designFramePicker(frames, selected) {
  const option = (frame) => `<label class="hero-decoration-option">
    <input type="radio" name="heroDecoration" value="${escapeAdminHtml(frame.id)}" ${selected === frame.id ? "checked" : ""}>
    <span class="hero-decoration-preview" data-decoration-preview="${escapeAdminHtml(frame.id)}"><i></i></span>
    <span class="hero-decoration-copy"><strong>${escapeAdminHtml(frame.name)}</strong><small>${frame.id === "inherit" ? "선택한 프리셋의 기본 꾸밈을 사용합니다." : frame.mode === "outer" ? "사진 바깥 프레임" : "사진 위 오버레이"}</small></span>
  </label>`;
  return `<fieldset class="hero-decoration-field"><legend>메인 이미지 꾸밈</legend><div class="hero-decoration-list">${option({ id: "inherit", name: "프리셋 기본값 사용" })}${frames.map(option).join("")}</div><p class="design-scroll-hint">좌우로 밀어 더 보기</p></fieldset>`;
}

function designTextThemePicker(themes, selected) {
  return `<div class="text-theme-choice-grid">${themes.filter((theme) => theme.enabled !== false).map((theme) => `
    <button class="text-theme-choice ${selected === theme.id ? "is-selected" : ""}" type="button" data-design-text-theme="${escapeAdminHtml(theme.id)}">
      ${typeof textThemeSample === "function" ? textThemeSample(theme) : ""}
      <span>${escapeAdminHtml(theme.name || theme.id)}</span>
    </button>`).join("")}</div>`;
}

function textThemeLocksPosition(id) {
  return false;
}

function designSelect(name, label, items, selected, inheritLabel = "") {
  return `<label class="field"><span>${label}</span><select name="${name}">${inheritLabel ? `<option value="inherit" ${selected === "inherit" ? "selected" : ""}>${inheritLabel}</option>` : ""}${designOptions(items, selected)}</select></label>`;
}

function renderDesignApplication(message = "") {
  designData();
  const system = invitationData.designSystem;
  const design = invitationData.appearance.design;
  window.WEDDING_DESIGN.apply(invitationData);
  adminApp.innerHTML = `
    ${adminHeader("design")}
    <section class="admin-card design-studio">
      <div class="admin-toolbar"><div><p class="section-label">Invitation Design</p><h2>디자인 적용</h2></div></div>
      <p class="admin-message">${escapeAdminHtml(message || "프리셋은 메인 사진을 바꾸지 않습니다. 사진 위의 색상, 프레임, 문구 배열, 아이콘과 배경 장식만 변경합니다.")}</p>
      <form class="editor-form design-studio-form" id="design-application-form">
        <fieldset class="design-studio-concept"><legend>청첩장 컨셉</legend>
          ${presetSelect("presetId", "적용할 프리셋", system.themes, design.presetId)}
          <p class="admin-message">컬러테마는 공통 꾸밈을 사용하고 영화테마는 전용 꾸밈을 사용합니다.</p>
        </fieldset>
        <fieldset class="design-studio-workbench"><legend>커스텀 디자인 설정</legend>
          <p class="admin-message">여기에서 고른 값은 현재 청첩장에만 적용됩니다. 프리셋 구성을 그대로 쓰려면 프리셋 기본값 사용을 선택하세요.</p>
          <div class="design-studio-canvas"><div class="design-frame-live-preview" data-design-frame-live-preview></div></div>
          <div class="design-studio-tools">
          <section class="design-custom-group">
            <h3>1. 메인 이미지 꾸밈</h3>
          ${designFramePicker(system.assets.frames, design.heroDecoration)}
          </section>
          <section class="design-custom-group">
            <h3>2. 메인 문구 테마</h3>
          <input type="hidden" name="heroTextTheme" value="${escapeAdminHtml(design.heroTextTheme)}">
          ${designTextThemePicker(system.assets.textThemes, design.heroTextTheme)}
          <p class="design-scroll-hint">좌우로 밀어 문구 테마 더 보기</p>
          <div class="decoration-tint-controls">
            ${input("heroDecorationTint", "꾸밈 색상", design.heroDecorationTint || "#ffffff", "color")}
          </div>
          <div class="hero-copy-toggle-grid">
            <label class="consent"><input type="checkbox" name="heroEyebrowEnabled" ${design.heroEyebrowEnabled !== false ? "checked" : ""}> <span>영문 문구 표시</span></label>
            <label class="consent"><input type="checkbox" name="heroNamesEnabled" ${design.heroNamesEnabled !== false ? "checked" : ""}> <span>메인 문구(이름) 표시</span></label>
            <label class="consent"><input type="checkbox" name="heroDateEnabled" ${design.heroDateEnabled !== false ? "checked" : ""}> <span>날짜 표시</span></label>
          </div>
          ${select("contentPosition", "메인 사진 문구 위치", invitationData.hero.contentPosition || "bottom", [["top", "상단"], ["middle", "중간"], ["bottom", "하단"]])}
          <div class="text-layout-editor">
            <label class="text-layout-control"><span>문구 좌우 위치</span><input name="heroTextXPercent" type="range" min="10" max="90" value="${escapeAdminHtml(design.heroTextXPercent ?? 50)}"><output>${escapeAdminHtml(design.heroTextXPercent ?? 50)}</output></label>
            <label class="text-layout-control"><span>문구 위아래 위치</span><input name="heroTextYPercent" type="range" min="10" max="90" value="${escapeAdminHtml(design.heroTextYPercent ?? 76)}"><output>${escapeAdminHtml(design.heroTextYPercent ?? 76)}</output></label>
          </div>
          </section>
          </div>
        </fieldset>
        <button class="btn btn-primary">디자인 저장</button>
      </form>
    </section>`;
  bindAdminNavigation();
  const form = document.querySelector("#design-application-form");
  const applyDesignPreview = () => {
    const fields = new FormData(form);
    const selected = system.themes.find((theme) => theme.id === fields.get("presetId"));
    invitationData.appearance.design = { presetId: fields.get("presetId"), heroDecoration: fields.get("heroDecoration"), heroDecorationTint: fields.get("heroDecorationTint"), heroTextTheme: fields.get("heroTextTheme"), heroTextXPercent: Number(fields.get("heroTextXPercent")), heroTextYPercent: Number(fields.get("heroTextYPercent")), heroEyebrowEnabled: fields.get("heroEyebrowEnabled") === "on", heroNamesEnabled: fields.get("heroNamesEnabled") === "on", heroDateEnabled: fields.get("heroDateEnabled") === "on" };
    invitationData.appearance.theme = selected?.type === "color" ? selected.id : (invitationData.appearance.theme || "sky");
    invitationData.appearance.movieConcept = selected?.type === "movie" ? selected.id : "none";
    window.WEDDING_DESIGN.apply(invitationData);
    const resolved = window.WEDDING_DESIGN.resolve(invitationData);
    document.querySelector("[data-design-frame-live-preview]").innerHTML = typeof designCombinedHeroPreview === "function" ? designCombinedHeroPreview({ frame: resolved.heroDecorationAsset, textTheme: resolved.heroTextThemeAsset, tintColor: fields.get("heroDecorationTint"), eyebrowEnabled: fields.get("heroEyebrowEnabled") === "on", namesEnabled: fields.get("heroNamesEnabled") === "on", dateEnabled: fields.get("heroDateEnabled") === "on", position: form.elements.contentPosition.value, xPercent: fields.get("heroTextXPercent"), yPercent: fields.get("heroTextYPercent") }) : "";
  };
  const updateContentPositionState = () => {
    const textTheme = form.elements.heroTextTheme.value;
    const locked = textTheme !== "inherit" && textThemeLocksPosition(textTheme);
    form.elements.contentPosition.disabled = locked;
    form.elements.contentPosition.closest(".field").classList.toggle("is-disabled", locked);
  };
  form.querySelectorAll("select").forEach((field) => field.addEventListener("change", () => { updateContentPositionState(); applyDesignPreview(); }));
  form.querySelectorAll('input[name="heroDecoration"]').forEach((field) => field.addEventListener("change", applyDesignPreview));
  form.elements.heroDecorationTint.addEventListener("input", applyDesignPreview);
  form.querySelectorAll('input[name="heroTextXPercent"], input[name="heroTextYPercent"]').forEach((field) => field.addEventListener("input", () => {
    field.nextElementSibling.textContent = field.value;
    applyDesignPreview();
  }));
  form.querySelectorAll("[data-design-text-theme]").forEach((button) => button.addEventListener("click", () => {
    form.elements.heroTextTheme.value = button.dataset.designTextTheme;
    form.querySelectorAll("[data-design-text-theme]").forEach((item) => item.classList.toggle("is-selected", item === button));
    updateContentPositionState();
    applyDesignPreview();
  }));
  form.querySelectorAll(".hero-copy-toggle-grid input").forEach((field) => field.addEventListener("change", applyDesignPreview));
  updateContentPositionState();
  applyDesignPreview();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    invitationData.appearance.design = {
      presetId: fields.get("presetId"),
      heroDecoration: fields.get("heroDecoration"),
      heroDecorationTint: fields.get("heroDecorationTint"),
      heroTextTheme: fields.get("heroTextTheme"),
      heroTextXPercent: Number(fields.get("heroTextXPercent")),
      heroTextYPercent: Number(fields.get("heroTextYPercent")),
      heroEyebrowEnabled: fields.get("heroEyebrowEnabled") === "on",
      heroNamesEnabled: fields.get("heroNamesEnabled") === "on",
      heroDateEnabled: fields.get("heroDateEnabled") === "on",
    };
    invitationData.hero.contentPosition = event.currentTarget.elements.contentPosition.value;
    const selected = system.themes.find((theme) => theme.id === fields.get("presetId"));
    invitationData.appearance.theme = selected?.type === "color" ? selected.id : (invitationData.appearance.theme || "sky");
    invitationData.appearance.movieConcept = selected?.type === "movie" ? selected.id : "none";
    await saveDesignData("디자인을 저장했습니다. 공개 청첩장에 바로 반영됩니다.", renderDesignApplication);
  });
}

function paletteFields(theme = {}) {
  const item = theme.palette || {};
  return `<div class="palette-grid">
    ${input("side", "좌우 여백", item.side || item.background || "#fbf7ee", "color")}
    ${input("background", "청첩장 배경", item.background || "#f7f0e7", "color")}
    ${input("card", "카드/종이색", item.card || "#fffaf4", "color")}
    ${input("ink", "본문 글자색", item.ink || "#463a34", "color")}
    ${input("muted", "서브 텍스트색", item.muted || "#88776e", "color")}
    ${input("accent", "포인트/버튼색", item.accent || "#8d3440", "color")}
    ${input("label", "영문 라벨색", item.label || item.accent || "#8d3440", "color")}
    ${input("button", "연한 버튼색", item.button || item.card || "#fff4df", "color")}
    ${input("line", "라인색", /^#/.test(item.line || "") ? item.line : "#d6bfc1", "color")}
  </div>`;
}

function colorToHex(value = "") {
  const color = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const shortHex = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shortHex) return `#${shortHex.slice(1).map((item) => item + item).join("")}`;
  const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgba) return `#${rgba.slice(1, 4).map((item) => Math.max(0, Math.min(255, Number(item))).toString(16).padStart(2, "0")).join("")}`;
  return "";
}

function themeCards(type) {
  const themes = designData().designSystem.themes.filter((theme) => theme.type === type);
  return themes.map((theme) => `
    <article class="theme-card">
      <div class="theme-preview" style="--preview-bg:${escapeAdminHtml(theme.palette?.background || "#fff")};--preview-accent:${escapeAdminHtml(theme.palette?.accent || "#999")}"></div>
      <div><strong>${escapeAdminHtml(theme.name)}</strong><p>${theme.type === "movie" ? "영화테마" : "컬러테마"} · ${theme.enabled === false ? "비활성" : "사용 중"}</p></div>
      <div class="compact-actions">
        <button class="btn" type="button" data-theme-edit="${escapeAdminHtml(theme.id)}">수정</button>
        <button class="btn" type="button" data-theme-clone="${escapeAdminHtml(theme.id)}">복제</button>
        <button class="btn" type="button" data-theme-toggle="${escapeAdminHtml(theme.id)}">${theme.enabled === false ? "활성화" : "숨김"}</button>
        <button class="btn btn-danger" type="button" data-theme-delete="${escapeAdminHtml(theme.id)}">삭제</button>
      </div>
    </article>`).join("") || '<p class="admin-message">등록된 테마가 없습니다.</p>';
}

function themeListSections(filter) {
  const sections = filter === "all" ? [["color", "컬러테마"], ["movie", "영화테마"]] : [[filter, filter === "movie" ? "영화테마" : "컬러테마"]];
  return sections.map(([type, label]) => `<section class="theme-type-section"><h3>${label}</h3><div class="theme-grid">${themeCards(type)}</div></section>`).join("");
}

function renderThemeManager(message = "", filter = "all") {
  const system = designData().designSystem;
  adminApp.innerHTML = `
    ${adminHeader("themes")}
    <section class="admin-card">
      <div class="admin-toolbar"><div><p class="section-label">Super Admin</p><h2>테마 생성 및 수정</h2></div><button class="btn btn-primary" data-new-theme>새 테마 만들기</button></div>
      <p class="admin-message">${escapeAdminHtml(message || "컬러테마와 영화테마를 한곳에서 관리합니다.")}</p>
      <div class="filter-row"><button class="btn ${filter === "all" ? "btn-primary" : ""}" data-theme-filter="all">전체</button><button class="btn ${filter === "color" ? "btn-primary" : ""}" data-theme-filter="color">컬러테마</button><button class="btn ${filter === "movie" ? "btn-primary" : ""}" data-theme-filter="movie">영화테마</button></div>
      ${themeListSections(filter)}
    </section>
    <section class="admin-card">
      <h2>컬러테마 공통 디자인 설정</h2>
      <p class="admin-message">컬러테마별 팔레트와 별개로, 모든 컬러테마에 공통 적용되는 꾸밈입니다.</p>
      <form class="form-grid" id="color-default-form">
        ${designSelect("heroDecoration", "공통 메인 이미지 꾸밈", system.assets.frames, system.colorDefaults.heroDecoration)}
        ${designSelect("heroTextTheme", "공통 메인 문구 테마", system.assets.textThemes, system.colorDefaults.heroTextTheme)}
        <button class="btn btn-primary">공통 설정 저장</button>
      </form>
    </section>
    <div id="admin-design-modal"></div>`;
  bindAdminNavigation();
  document.querySelectorAll("[data-theme-filter]").forEach((button) => button.addEventListener("click", () => renderThemeManager("", button.dataset.themeFilter)));
  document.querySelector("[data-new-theme]").addEventListener("click", () => openThemeModal());
  document.querySelectorAll("[data-theme-edit]").forEach((button) => button.addEventListener("click", () => openThemeModal(button.dataset.themeEdit)));
  document.querySelectorAll("[data-theme-clone]").forEach((button) => button.addEventListener("click", async () => {
    const source = system.themes.find((theme) => theme.id === button.dataset.themeClone);
    system.themes.push({ ...JSON.parse(JSON.stringify(source)), id: `${source.id}-copy-${Date.now()}`, name: `${source.name} 복제본` });
    await saveDesignData("테마를 복제했습니다.", renderThemeManager);
  }));
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => button.addEventListener("click", async () => {
    const theme = system.themes.find((item) => item.id === button.dataset.themeToggle);
    theme.enabled = theme.enabled === false;
    await saveDesignData("테마 사용 여부를 변경했습니다.", renderThemeManager);
  }));
  document.querySelectorAll("[data-theme-delete]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("이 테마를 삭제할까요? 삭제 후에는 디자인 적용 목록에서 선택할 수 없습니다.")) return;
    const id = button.dataset.themeDelete;
    system.deletedThemeIds ||= [];
    if (!system.deletedThemeIds.includes(id)) system.deletedThemeIds.push(id);
    system.themes = system.themes.filter((theme) => theme.id !== id);
    if (invitationData.appearance.design?.presetId === id) invitationData.appearance.design.presetId = "sky";
    await saveDesignData("테마를 삭제했습니다.", renderThemeManager);
  }));
  document.querySelector("#color-default-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    system.colorDefaults = { heroDecoration: fields.get("heroDecoration"), heroTextTheme: fields.get("heroTextTheme") };
    await saveDesignData("컬러테마 공통 설정을 저장했습니다.", renderThemeManager);
  });
}

function themeModalMarkup(theme = {}) {
  const type = theme.type || "color";
  const assets = designData().designSystem.assets;
  return `<div class="admin-modal-backdrop"><section class="admin-modal">
    <div class="admin-toolbar"><h2>${theme.id ? "테마 수정" : "새 테마 만들기"}</h2><button class="btn" type="button" data-theme-close>닫기</button></div>
    <form class="editor-form" id="theme-form">
      <input type="hidden" name="id" value="${escapeAdminHtml(theme.id || "")}">
      <input type="hidden" name="fontDirection" value="${escapeAdminHtml(theme.fontDirection || "")}">
      <input type="hidden" name="galleryFrameDirection" value="${escapeAdminHtml(theme.galleryFrameDirection || "")}">
      <input type="hidden" name="buttonShapeDirection" value="${escapeAdminHtml(theme.buttonShapeDirection || "")}">
      ${select("type", "테마 유형", type, [["color", "컬러테마"], ["movie", "영화테마"]])}
      <section class="ai-assistant"><h3>AI 디자인 어시스턴트</h3><p class="admin-message">컬러테마는 색상값 중심, 영화테마는 색감·폰트·꾸밈요소·갤러리 프레임·버튼 모양까지 결과를 만듭니다.</p>
        <div class="ai-chat" data-ai-chat><p>AI: 원하는 무드, 참고 영화, 계절감, 색상값을 한 문장으로 알려주세요.</p></div>
        <div class="ai-input-row"><input data-ai-instruction placeholder="예: 맑은 하늘색과 흰색 중심, 단정하고 고급스럽게"><button class="btn" type="button" data-ai-send>결과보기</button></div>
        <div class="ai-progress" data-ai-progress hidden><span></span><i style="width:0%"></i><b>0%</b></div>
        <div data-ai-results></div>
      </section>
      ${input("name", "테마명", theme.name || "")}
      ${paletteFields(theme)}
      <div data-movie-fields>
        ${designSelect("heroDecoration", "영화테마 전용 메인 이미지 꾸밈", assets.frames, theme.heroDecoration || "none")}
        ${designSelect("heroTextTheme", "영화테마 전용 메인 문구 테마", assets.textThemes, theme.heroTextTheme || "auto")}
        ${input("sectionIcon", "섹션 아이콘 SVG/이미지 URL", theme.sectionIcon || "")}
        ${input("backgroundDecoration", "배경 장식 SVG/이미지 URL", theme.backgroundDecoration || "")}
      </div>
      <label class="consent"><input type="checkbox" name="enabled" ${theme.enabled !== false ? "checked" : ""}> <span>사용 가능한 테마로 표시</span></label>
      <button class="btn btn-primary">최종 저장</button>
    </form>
  </section></div>`;
}

function openThemeModal(themeId = "") {
  const system = designData().designSystem;
  const theme = system.themes.find((item) => item.id === themeId) || {};
  document.querySelector("#admin-design-modal").innerHTML = themeModalMarkup(theme);
  const modal = document.querySelector(".admin-modal");
  const form = document.querySelector("#theme-form");
  const updateType = () => modal.querySelectorAll("[data-movie-fields]").forEach((item) => { item.hidden = form.elements.type.value !== "movie"; });
  form.elements.type.addEventListener("change", updateType); updateType();
  document.querySelector("[data-theme-close]").addEventListener("click", () => { document.querySelector("#admin-design-modal").innerHTML = ""; });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const id = fields.get("id") || `${fields.get("type")}-${Date.now()}`;
    const next = {
      id, type: fields.get("type"), name: fields.get("name") || "이름 없는 테마", enabled: fields.get("enabled") === "on",
      concept: fields.get("concept"), mood: fields.get("mood"), heroDecoration: fields.get("heroDecoration"), heroTextTheme: fields.get("heroTextTheme"),
      sectionIcon: fields.get("sectionIcon"), backgroundDecoration: fields.get("backgroundDecoration"),
      fontDirection: fields.get("fontDirection"), galleryFrameDirection: fields.get("galleryFrameDirection"), buttonShapeDirection: fields.get("buttonShapeDirection"),
      palette: Object.fromEntries(["side", "background", "card", "ink", "muted", "accent", "label", "button", "line"].map((key) => [key, fields.get(key)])),
    };
    const index = system.themes.findIndex((item) => item.id === id);
    if (index >= 0) system.themes[index] = next; else system.themes.push(next);
    await saveDesignData("테마를 저장했습니다.", renderThemeManager);
  });
  const runAIWithProgress = async (runner, progressSelector = "[data-ai-progress]") => {
    const progress = document.querySelector(progressSelector);
    const bar = progress?.querySelector("i");
    const label = progress?.querySelector("b");
    let percent = 8;
    if (progress) progress.hidden = false;
    progress?.setAttribute("aria-busy", "true");
    const timer = setInterval(() => {
      percent = Math.min(92, percent + Math.ceil((100 - percent) / 9));
      if (bar) bar.style.width = `${percent}%`;
      if (label) label.textContent = `${percent}%`;
    }, 220);
    try {
      const value = await runner();
      if (bar) bar.style.width = "100%";
      if (label) label.textContent = "100%";
      await new Promise((resolve) => setTimeout(resolve, 180));
      return value;
    } finally {
      clearInterval(timer);
      if (progress) {
        setTimeout(() => {
          progress.hidden = true;
          progress.removeAttribute("aria-busy");
          if (bar) bar.style.width = "0%";
          if (label) label.textContent = "0%";
        }, 260);
      }
    }
  };
  const requestAI = async () => {
    const instruction = document.querySelector("[data-ai-instruction]").value || form.elements.name.value || "고급스럽고 따뜻한 모바일 청첩장 테마";
    const context = { concept: instruction, mood: instruction, instruction, name: form.elements.name.value, settings: invitationData.designSystem.aiSettings, fonts: designData().designSystem.assets.fonts || [] };
    try {
      const aiResult = await runAIWithProgress(() => form.elements.type.value === "movie" ? AI_DESIGN_SERVICE.recommendMovieTheme(context) : AI_DESIGN_SERVICE.recommendColorPalette(context));
      rememberAIResult(aiResult); showAIResult(aiResult, form);
    } catch (error) {
      document.querySelector("[data-ai-results]").innerHTML = `<article class="ai-result-card"><strong>AI 결과 생성 실패</strong><p class="admin-message">${escapeAdminHtml(error.message || "AI 설정을 확인해 주세요.")}</p></article>`;
    }
  };
  document.querySelector("[data-ai-send]").addEventListener("click", () => requestAI());
}

function rememberAIResult(result) {
  const library = designData().designSystem.aiLibrary;
  library.unshift(result);
  if (library.length > 40) library.length = 40;
}

function applyAIResult(result, form, scope = "all") {
  const applyPalette = () => result.palette && Object.entries(result.palette).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    const hex = colorToHex(value);
    if (hex) form.elements[key].value = hex;
  });
  const ensureSelectOption = (selectElement, value, label) => {
    if (!selectElement || !value) return;
    if (![...selectElement.options].some((option) => option.value === value)) selectElement.append(new Option(label || value, value));
    selectElement.value = value;
  };
  const addAsset = (key, item) => {
    const list = designData().designSystem.assets[key] ||= [];
    const existing = list.find((asset) => asset.id === item.id);
    if (existing) Object.assign(existing, item);
    else list.push(item);
  };
  const registerMovieAssets = () => {
    if (form.elements.type.value !== "movie") return;
    const seed = (result.name || result.instruction || `ai-${Date.now()}`).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || `ai-${Date.now()}`;
    const frameId = `ai-frame-${seed}`;
    const textId = `ai-text-${seed}`;
    const iconId = `ai-icon-${seed}`;
    const bgId = `ai-bg-${seed}`;
    const fonts = designData().designSystem.assets.fonts || [];
    const matchedFont = fonts.find((font) => font.id === result.fontId) || fonts.find((font) => font.family === result.fontFamily) || fonts[0];
    addAsset("frames", { id: frameId, name: `${result.name || "AI"} 메인 꾸밈`, mode: "overlay", heroDecoration: result.heroDecoration || "doodle_hearts", direction: result.galleryFrameDirection || result.backgroundDirection || "" });
    addAsset("textThemes", { id: textId, name: `${result.name || "AI"} 문구 테마`, layout: result.heroTextTheme === "minimal_center" ? "center" : "poster-left", heroTextTheme: result.heroTextTheme || "editorial_left", fontId: matchedFont?.id || "noto-serif-kr", align: result.heroTextTheme === "minimal_center" ? "center" : "left", shadow: true, boxEnabled: false, nameSize: 38, dateSize: 12, direction: result.fontDirection || "" });
    addAsset("sectionIcons", { id: iconId, name: `${result.name || "AI"} 섹션 아이콘`, direction: result.sectionIconDirection || "" });
    addAsset("backgrounds", { id: bgId, name: `${result.name || "AI"} 배경 장식`, direction: result.backgroundDirection || "" });
    ensureSelectOption(form.elements.heroDecoration, frameId, `${result.name || "AI"} 메인 꾸밈`);
    ensureSelectOption(form.elements.heroTextTheme, textId, `${result.name || "AI"} 문구 테마`);
    if (form.elements.sectionIcon) form.elements.sectionIcon.value = iconId;
    if (form.elements.backgroundDecoration) form.elements.backgroundDecoration.value = bgId;
    if (form.elements.fontDirection) form.elements.fontDirection.value = result.fontDirection || "";
    if (form.elements.galleryFrameDirection) form.elements.galleryFrameDirection.value = result.galleryFrameDirection || "";
    if (form.elements.buttonShapeDirection) form.elements.buttonShapeDirection.value = result.buttonShapeDirection || "";
  };
  if (result.name && form.elements.name && !form.elements.name.value.trim()) form.elements.name.value = result.name;
  if (scope === "all" || scope === "palette") applyPalette();
  if (scope === "all" && form.elements.type.value === "movie") registerMovieAssets();
  else {
    if ((scope === "all" || scope === "frame") && result.heroDecoration && form.elements.heroDecoration) form.elements.heroDecoration.value = result.heroDecoration;
    if ((scope === "all" || scope === "text") && result.heroTextTheme && form.elements.heroTextTheme) form.elements.heroTextTheme.value = result.heroTextTheme;
  }
}

function aiPalettePreview(palette = {}) {
  const labels = { side: "좌우 여백", background: "청첩장 배경", card: "카드", ink: "본문 글자", muted: "서브 글자", accent: "포인트", label: "영문 라벨", button: "연한 버튼", line: "라인" };
  return `<div class="ai-palette-preview">${Object.entries(labels).map(([key, label]) => `
    <div class="ai-color-chip"><i style="background:${escapeAdminHtml(palette[key] || "#ffffff")}"></i><span>${label}<small>${escapeAdminHtml(palette[key] || "-")}</small></span></div>`).join("")}</div>`;
}

function aiVisualPreview(result) {
  return `<div class="ai-visual-preview">
    ${result.palette ? `<div><strong>추천 컬러 팔레트</strong>${aiPalettePreview(result.palette)}</div>` : ""}
    ${result.heroDecoration ? `<div><strong>추천 프레임</strong><div class="ai-frame-preview"><span class="hero-decoration-preview" data-decoration-preview="${escapeAdminHtml(result.heroDecoration)}"><i></i></span><span>${escapeAdminHtml(result.heroDecoration)}</span></div></div>` : ""}
    ${result.heroTextTheme ? `<div><strong>추천 문구 테마</strong><div class="ai-text-preview" data-ai-text-theme="${escapeAdminHtml(result.heroTextTheme)}">조성호 · 전지연<small>2026. 10. 04</small></div></div>` : ""}
    ${result.sectionIconDirection ? `<div class="ai-direction"><strong>섹션 아이콘 방향</strong><p>${escapeAdminHtml(result.sectionIconDirection)}</p></div>` : ""}
    ${result.backgroundDirection ? `<div class="ai-direction"><strong>배경 장식 방향</strong><p>${escapeAdminHtml(result.backgroundDirection)}</p></div>` : ""}
    ${result.galleryFrameDirection ? `<div class="ai-direction"><strong>갤러리 프레임</strong><p>${escapeAdminHtml(result.galleryFrameDirection)}</p></div>` : ""}
    ${result.buttonShapeDirection ? `<div class="ai-direction"><strong>버튼 모양</strong><p>${escapeAdminHtml(result.buttonShapeDirection)}</p></div>` : ""}
  </div>`;
}

function showAIResult(result, form) {
  const isMovieTheme = form.elements.type.value === "movie";
  const visibleResult = isMovieTheme ? result : { name: result.name, type: result.type, palette: result.palette, instruction: result.instruction };
  document.querySelector("[data-ai-chat]").insertAdjacentHTML("beforeend", `<p>사용자: ${escapeAdminHtml(result.instruction || "추천 요청")}</p><p>AI: 구조화된 디자인 결과를 만들었습니다. 미리보기 후 적용 범위를 선택해 주세요.</p>`);
  document.querySelector("[data-ai-results]").innerHTML = `<article class="ai-result-card">
    <strong>${escapeAdminHtml(result.name || result.type)}</strong>
    ${aiVisualPreview(visibleResult)}
    <div class="compact-actions"><button class="btn" type="button" data-ai-preview>미리보기</button><button class="btn" type="button" data-ai-apply="palette">팔레트 적용</button>${isMovieTheme && result.heroDecoration ? '<button class="btn" type="button" data-ai-apply="frame">프레임 적용</button>' : ""}${isMovieTheme && result.heroTextTheme ? '<button class="btn" type="button" data-ai-apply="text">문구 테마 적용</button>' : ""}${isMovieTheme ? '<button class="btn btn-primary" type="button" data-ai-apply="all">전체 적용</button>' : ""}<button class="btn" type="button" data-ai-regenerate>재생성</button><button class="btn" type="button" data-ai-ignore>무시</button></div>
  </article>`;
  document.querySelectorAll("[data-ai-apply]").forEach((button) => button.addEventListener("click", () => applyAIResult(result, form, button.dataset.aiApply)));
  applyAIResult(result, form, isMovieTheme ? "all" : "palette");
  document.querySelector("[data-ai-preview]").addEventListener("click", () => document.querySelector(".ai-visual-preview").classList.toggle("is-emphasized"));
  document.querySelector("[data-ai-ignore]").addEventListener("click", () => { document.querySelector("[data-ai-results]").innerHTML = ""; });
  document.querySelector("[data-ai-regenerate]").addEventListener("click", async () => {
    try {
      const next = await runAIWithProgress(() => AI_DESIGN_SERVICE.regenerateAIResult(result, document.querySelector("[data-ai-instruction]").value));
      rememberAIResult(next); showAIResult(next, form);
      document.querySelector("[data-ai-chat]")?.insertAdjacentHTML("beforeend", `<p>AI: 재생성이 완료되어 새 결과로 교체했습니다.</p>`);
    } catch (error) {
      document.querySelector("[data-ai-results]")?.insertAdjacentHTML("afterbegin", `<p class="admin-message">재생성에 실패했습니다. ${escapeAdminHtml(error.message || "")}</p>`);
    }
  });
}

const assetCategories = {
  frame: { key: "frames", label: "메인 이미지 꾸밈", guide: "overlay 420x670, outer 480x720 기준 SVG 300KB 이하 권장" },
  textTheme: { key: "textThemes", label: "메인 문구 테마", guide: "문구 위치, 정렬, 크기를 조합하는 레이아웃 소스" },
  font: { key: "fonts", label: "폰트", guide: "상업적 무료 폰트만 등록합니다. WOFF2 권장, TTF/OTF/WOFF도 가능" },
  sectionIcon: { key: "sectionIcons", label: "섹션 아이콘", guide: "512x512, 단색 또는 2색 권장" },
  background: { key: "backgrounds", label: "전체 배경 장식", guide: "청첩장 전체 배경에 깔리는 장식입니다. 1920x1080, 저채도 장식 권장" },
};

function assetPreview(type, item = {}) {
  const previewUrl = window.adminMediaUrl?.(item.url || item.previewUrl) || item.url || item.previewUrl;
  if (previewUrl) return `<div class="asset-source-preview asset-source-image ${type === "background" ? "is-background" : ""}"><img src="${escapeAdminHtml(previewUrl)}" alt="${escapeAdminHtml(item.name || "디자인 소스")} 미리보기"></div>`;
  if (type === "frame") return `<div class="asset-source-preview"><span class="hero-decoration-preview" data-decoration-preview="${escapeAdminHtml(item.heroDecoration || item.id || "none")}"><i></i></span></div>`;
  if (type === "textTheme") {
    const font = (designData().designSystem.assets.fonts || []).find((fontItem) => fontItem.id === item.fontId);
    return `<div class="asset-source-preview"><div class="ai-text-preview" style="font-family:${escapeAdminHtml(font?.family || "Cormorant Garamond")}, 'Noto Serif KR', serif">조성호 · 전지연<small>2026. 10. 04</small></div></div>`;
  }
  if (type === "font") return `<div class="asset-source-preview asset-placeholder-background"><span style="font-family:${escapeAdminHtml(item.family || "serif")}">가나다 Aa</span><small>${escapeAdminHtml(item.license || "상업적 무료 확인 필요")}</small></div>`;
  if (type === "sectionIcon") return `<div class="asset-source-preview asset-placeholder-icon"><span>✦</span><small>${escapeAdminHtml(item.direction || "ICON")}</small></div>`;
  return `<div class="asset-source-preview asset-placeholder-background"><span>${escapeAdminHtml(item.direction || "BACKGROUND")}</span></div>`;
}

function assetLibraryCards(type) {
  const category = assetCategories[type];
  const items = designData().designSystem.assets[category.key] || [];
  return items.length ? items.map((item) => `<article class="asset-library-card">
    ${assetPreview(type, item)}
    <div><strong>${escapeAdminHtml(item.name || item.id)}</strong><p>${escapeAdminHtml(item.mode || item.layout || item.direction || category.label)}</p></div>
    <div class="compact-actions"><button class="btn" type="button" data-asset-library-preview="${escapeAdminHtml(item.id)}">미리보기</button></div>
  </article>`).join("") : '<p class="admin-message">아직 등록된 디자인 소스가 없습니다.</p>';
}

function assetLibrarySections(filter = "all") {
  return Object.entries(assetCategories)
    .filter(([type]) => filter === "all" || type === filter)
    .map(([type, category]) => `<section class="asset-library-section"><div class="admin-toolbar"><div><h3>${category.label}</h3><p>${category.guide}</p></div><span class="badge">${(designData().designSystem.assets[category.key] || []).length}개</span></div><div class="asset-library-grid">${assetLibraryCards(type)}</div></section>`)
    .join("");
}

function renderDesignAssets(message = "", filter = "all") {
  designData();
  adminApp.innerHTML = `${adminHeader("assets")}<section class="admin-card">
    <div class="admin-toolbar"><div><p class="section-label">Super Admin</p><h2>디자인 요소 생성</h2></div><button class="btn btn-primary" type="button" data-new-asset>새 디자인 소스 만들기</button></div>
    <p class="admin-message">${escapeAdminHtml(message || "테마에 연결할 디자인 소스를 카테고리별로 확인하고, 하나의 생성 모달에서 AI 또는 파일 업로드로 추가합니다.")}</p>
    <div class="filter-row"><button class="btn ${filter === "all" ? "btn-primary" : ""}" data-asset-filter="all">전체</button>${Object.entries(assetCategories).map(([type, category]) => `<button class="btn ${filter === type ? "btn-primary" : ""}" data-asset-filter="${type}">${category.label}</button>`).join("")}</div>
    ${assetLibrarySections(filter)}
  </section><div id="asset-create-modal"></div>`;
  bindAdminNavigation();
  document.querySelector("[data-new-asset]").addEventListener("click", () => openAssetCreateModal());
  document.querySelectorAll("[data-asset-filter]").forEach((button) => button.addEventListener("click", () => renderDesignAssets("", button.dataset.assetFilter)));
  document.querySelectorAll("[data-asset-library-preview]").forEach((button) => button.addEventListener("click", () => {
    const item = Object.values(designData().designSystem.assets).flat().find((asset) => asset.id === button.dataset.assetLibraryPreview);
    alert(`${item?.name || "디자인 소스"} 미리보기를 카드에서 확인할 수 있습니다.`);
  }));
}

function assetModalFields(type) {
  const fonts = designData().designSystem.assets.fonts || [];
  return `<div class="asset-modal-fields">
    ${type === "frame" ? '<label class="field"><span>적용 방식</span><select name="assetMode"><option value="overlay">사진 위 오버레이</option><option value="outer">사진 바깥 프레임</option></select></label>' : ""}
    ${type === "textTheme" ? `<label class="field"><span>레이아웃</span><select name="layout"><option value="poster-left">포스터 좌측형</option><option value="center">중앙 오버레이형</option></select></label>${designSelect("fontId", "사용 폰트", fonts, "noto-serif-kr")}<label class="btn image-upload">폰트 파일 업로드<input type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" data-font-upload></label>` : ""}
    ${type === "font" ? '<label class="field"><span>폰트 패밀리명</span><input name="fontFamily" placeholder="예: My Wedding Font"></label><label class="field"><span>라이선스</span><input name="fontLicense" value="상업적 무료 확인 완료"></label><label class="btn image-upload">폰트 파일 업로드<input type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" data-font-upload></label>' : ""}
    ${!["textTheme", "font"].includes(type) ? '<label class="btn image-upload">SVG/이미지 업로드<input type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg" data-asset-modal-upload></label>' : ""}
  </div>`;
}

function assetDraftFromAI(type, result) {
  if (type === "frame") return { heroDecoration: result.heroDecoration, direction: result.heroDecoration };
  if (type === "textTheme") return { heroTextTheme: result.heroTextTheme, layout: result.layout?.position || "poster-left", fontId: result.fontId || "noto-serif-kr", direction: result.fontDirection || "" };
  if (type === "font") return { family: result.fontFamily || "Noto Serif KR", license: result.fontLicense || result.license || "상업적 무료 확인 필요" };
  return { direction: result.direction || result.sectionIconDirection || result.backgroundDirection || "AI 디자인 방향" };
}

function updateAssetModalPreview() {
  const root = document.querySelector("[data-asset-modal-preview]");
  if (root) root.innerHTML = assetPreview(root.dataset.assetModalPreview, window.assetSourceDraft || {});
  const framePreview = document.querySelector("[data-frame-live-preview]");
  if (framePreview && typeof frameEditorSample === "function") framePreview.innerHTML = frameEditorSample(window.assetSourceDraft || {});
}

function renderAssetModalAIResult(type, result) {
  const root = document.querySelector("[data-asset-ai-results]");
  root.innerHTML = `<article class="ai-result-card"><strong>${escapeAdminHtml(result.name || assetCategories[type].label)}</strong>${assetPreview(type, { ...result, ...assetDraftFromAI(type, result) })}
    <div class="compact-actions"><button class="btn btn-primary" type="button" data-asset-ai-accept>미리보기에 적용</button><button class="btn" type="button" data-asset-ai-regenerate>재생성</button><button class="btn" type="button" data-asset-ai-ignore>무시</button></div></article>`;
  const applyDraft = () => {
    window.assetSourceDraft = { ...(window.assetSourceDraft || {}), ...assetDraftFromAI(type, result), aiResult: result };
    rememberAIResult(result); updateAssetModalPreview();
  };
  applyDraft();
  document.querySelector("[data-asset-ai-accept]").addEventListener("click", applyDraft);
  document.querySelector("[data-asset-ai-ignore]").addEventListener("click", () => { root.innerHTML = ""; });
  document.querySelector("[data-asset-ai-regenerate]").addEventListener("click", async () => {
    root.insertAdjacentHTML("afterbegin", `<div class="ai-progress is-inline" data-asset-regenerate-progress><span><i style="width:72%"></i></span><b>생성 중</b></div>`);
    try {
      const next = await AI_DESIGN_SERVICE.regenerateAIResult(result, document.querySelector("[data-asset-ai-instruction]").value);
      rememberAIResult(next); renderAssetModalAIResult(type, next);
      document.querySelector("[data-asset-ai-chat]")?.insertAdjacentHTML("beforeend", `<p>AI: 재생성이 완료되어 새 결과로 교체했습니다.</p>`);
    } catch (error) {
      root.querySelector("[data-asset-regenerate-progress]")?.remove();
      root.insertAdjacentHTML("afterbegin", `<p class="admin-message">재생성에 실패했습니다. ${escapeAdminHtml(error.message || "")}</p>`);
    }
  });
}

function bindAssetModal(type) {
  const form = document.querySelector("#asset-source-form");
  document.querySelector("[data-asset-close]").addEventListener("click", () => { document.querySelector("#asset-create-modal").innerHTML = ""; });
  form.elements.assetType.addEventListener("change", () => openAssetCreateModal(form.elements.assetType.value));
  document.querySelector("[data-asset-modal-upload]")?.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    window.assetSourceDraft = { ...(window.assetSourceDraft || {}), previewUrl: URL.createObjectURL(file) };
    updateAssetModalPreview();
    try {
      window.assetSourceDraft.url = await RSVP_STORAGE.uploadDesignAsset(file, type);
      updateAssetModalPreview();
    } catch (error) { alert(error.message); }
  });
  document.querySelector("[data-font-upload]")?.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const url = await RSVP_STORAGE.uploadDesignAsset(file, "fonts");
      const id = `font-${Date.now()}`;
      const family = form.elements.fontFamily?.value?.trim() || file.name.replace(/\.(woff2?|ttf|otf)$/i, "");
      const fontItem = { id, name: family, family, url, source: "업로드", license: form.elements.fontLicense?.value?.trim() || "상업적 무료 확인 필요", commercialFree: true };
      invitationData.designSystem.assets.fonts ||= [];
      invitationData.designSystem.assets.fonts.push(fontItem);
      window.assetSourceDraft = { ...(window.assetSourceDraft || {}), ...fontItem, fontId: id };
      if (form.elements.fontId) {
        form.elements.fontId.append(new Option(fontItem.name, id));
        form.elements.fontId.value = id;
      }
      updateAssetModalPreview();
      alert("폰트 파일을 업로드하고 폰트 목록에 추가했습니다.");
    } catch (error) {
      alert(`폰트를 업로드하지 못했습니다.\n${error.message || "Storage 정책을 확인해 주세요."}`);
    }
  });
  document.querySelector("[data-asset-ai-send]").addEventListener("click", async () => {
    const methods = { frame: "generateFrameDecoration", textTheme: "generateHeroTextTheme", sectionIcon: "generateSectionIcon", background: "generateBackgroundDecoration", font: "generateHeroTextTheme" };
    const instruction = document.querySelector("[data-asset-ai-instruction]").value;
    document.querySelector("[data-asset-ai-chat]").insertAdjacentHTML("beforeend", `<p>사용자: ${escapeAdminHtml(instruction)}</p><p>AI: 요청에 맞는 미리보기를 만들었습니다.</p>`);
    const progress = document.querySelector("[data-asset-ai-progress]");
    const bar = progress?.querySelector("i");
    const label = progress?.querySelector("b");
    let percent = 10;
    if (progress) progress.hidden = false;
    const timer = setInterval(() => {
      percent = Math.min(92, percent + Math.ceil((100 - percent) / 8));
      if (bar) bar.style.width = `${percent}%`;
      if (label) label.textContent = `${percent}%`;
    }, 220);
    try {
      const result = await AI_DESIGN_SERVICE[methods[type]]({ instruction, settings: invitationData.designSystem.aiSettings, fonts: designData().designSystem.assets.fonts || [] });
      if (bar) bar.style.width = "100%";
      if (label) label.textContent = "100%";
      renderAssetModalAIResult(type, result);
    } catch (error) {
      document.querySelector("[data-asset-ai-results]").innerHTML = `<article class="ai-result-card"><strong>AI 결과 생성 실패</strong><p class="admin-message">${escapeAdminHtml(error.message || "AI 설정을 확인해 주세요.")}</p></article>`;
    } finally {
      clearInterval(timer);
      setTimeout(() => {
        if (progress) progress.hidden = true;
        if (bar) bar.style.width = "0%";
        if (label) label.textContent = "0%";
      }, 260);
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const draft = window.assetSourceDraft || {};
    const item = { id: `${type}-${Date.now()}`, name: fields.get("assetName") || `새 ${assetCategories[type].label}`, url: draft.url || "", direction: draft.direction || "" };
    if (type === "frame") Object.assign(item, { mode: fields.get("assetMode") || "overlay", heroDecoration: draft.heroDecoration || "none" });
    if (type === "textTheme") Object.assign(item, { layout: fields.get("layout") || draft.layout || "poster-left", heroTextTheme: draft.heroTextTheme || "editorial_left", fontId: fields.get("fontId") || draft.fontId || "noto-serif-kr", align: "center", shadow: true, boxEnabled: false, nameSize: 34, dateSize: 12 });
    if (type === "font") Object.assign(item, { family: fields.get("fontFamily") || draft.family || fields.get("assetName"), url: draft.url || "", license: fields.get("fontLicense") || draft.license || "상업적 무료 확인 필요", source: draft.source || "업로드", commercialFree: true });
    invitationData.designSystem.assets[assetCategories[type].key].push(item);
    await saveDesignData("디자인 소스를 저장했습니다.", renderDesignAssets);
  });
}

function openAssetCreateModal(type = "frame") {
  window.assetSourceDraft = {};
  const category = assetCategories[type];
  document.querySelector("#asset-create-modal").innerHTML = `<div class="admin-modal-backdrop"><section class="admin-modal asset-create-modal">
    <div class="admin-toolbar"><h2>새 디자인 소스 만들기</h2><button class="btn" type="button" data-asset-close>닫기</button></div>
    <form class="editor-form" id="asset-source-form">
      ${select("assetType", "디자인 소스 유형", type, Object.entries(assetCategories).map(([value, item]) => [value, item.label]))}
      ${input("assetName", "디자인 소스 이름", "")}
      <p class="admin-message">${category.guide}</p>${assetModalFields(type)}
      <div class="asset-create-preview"><strong>현재 미리보기</strong><div data-asset-modal-preview="${type}">${assetPreview(type)}</div></div>
      <section class="ai-assistant"><h3>AI 디자인 어시스턴트</h3><div class="ai-chat" data-asset-ai-chat><p>AI: 원하는 ${category.label}의 분위기와 형태를 알려주세요.</p></div>
        <div class="ai-input-row"><input data-asset-ai-instruction placeholder="따뜻한 빈티지 필름 느낌으로 만들어줘"><button class="btn" type="button" data-asset-ai-send>결과보기</button></div><div class="ai-progress" data-asset-ai-progress hidden><span></span><i style="width:0%"></i><b>0%</b></div><div data-asset-ai-results></div>
      </section>
      <button class="btn btn-primary" type="submit">디자인 소스 저장</button>
    </form>
  </section></div>`;
  bindAssetModal(type);
}

function renderAISettings(message = "") {
  const settings = designData().designSystem.aiSettings;
  const prompts = settings.prompts || {};
  adminApp.innerHTML = `${adminHeader("ai-settings")}<section class="admin-card"><p class="section-label">Super Admin</p><h2>AI 설정</h2>
    <p class="admin-message">${escapeAdminHtml(message || "API Key는 프론트엔드에 저장하지 않습니다. 현재는 Mock Mode로 동작합니다.")}</p>
    <form class="form-grid" id="ai-settings-form">
      <label class="consent"><input type="checkbox" name="enabled" ${settings.enabled ? "checked" : ""}> <span>AI 사용</span></label>
      <label class="consent"><input type="checkbox" name="mockMode" ${settings.mockMode ? "checked" : ""}> <span>Mock Mode</span></label>
      ${select("provider", "Provider", settings.provider, [["OpenAI", "OpenAI"], ["Gemini", "Google Gemini"], ["future", "기타 확장용"]])}
      ${input("model", "모델명", settings.model)}
      ${input("endpoint", "서버 AI 엔드포인트", settings.endpoint || "/api/ai-design")}
      <fieldset><legend>AI 기본 프롬프트</legend>
        ${textarea("prompts.base", "공통 디자인 프롬프트", prompts.base || "", 5)}
        ${textarea("prompts.colorTheme", "테마생성 - 컬러테마 프롬프트", prompts.colorTheme || "", 4)}
        ${textarea("prompts.movieTheme", "테마생성 - 영화테마 프롬프트", prompts.movieTheme || "", 4)}
        ${textarea("prompts.frameAsset", "디자인요소 - 메인이미지꾸밈 프롬프트", prompts.frameAsset || "", 4)}
        ${textarea("prompts.textThemeAsset", "디자인요소 - 메인문구테마 프롬프트", prompts.textThemeAsset || "", 4)}
        ${textarea("prompts.iconAsset", "디자인요소 - 섹션아이콘 프롬프트", prompts.iconAsset || "", 4)}
        ${textarea("prompts.transport", "교통안내 프롬프트", prompts.transport || "", 4)}
        ${textarea("prompts.venue", "식장안내 프롬프트", prompts.venue || "", 4)}
        <label class="btn image-upload">참고 이미지 첨부<input type="file" accept="image/*" multiple data-ai-reference-upload></label>
        ${textarea("referenceImages", "참고 레퍼런스 이미지 URL", settings.referenceImages || "", 4)}
        <p class="admin-message micro-help">첨부 이미지는 업로드 후 URL로 저장됩니다. 현재 서버는 이미지 파일 자체를 분석하지 않고 URL과 참고 설명을 프롬프트에 함께 전달합니다.</p>
      </fieldset>
      <fieldset><legend>이미지 후처리</legend>
        <label class="consent"><input type="checkbox" name="removeWhiteBackground" ${settings.removeWhiteBackground ? "checked" : ""}> <span>흰색/near-white 배경 제거</span></label>
        ${input("whiteTolerance", "배경 제거 민감도", settings.whiteTolerance, "range")}
        <label class="consent"><input type="checkbox" name="convertSvg" ${settings.convertSvg ? "checked" : ""}> <span>SVG 변환</span></label>
        <label class="consent"><input type="checkbox" name="savePng" ${settings.savePng ? "checked" : ""}> <span>PNG 저장</span></label>
      </fieldset>
      <div class="compact-actions"><button class="btn" type="button" data-ai-test>연결 테스트</button><button class="btn btn-primary">저장</button></div>
    </form></section>`;
  bindAdminNavigation();
  const form = document.querySelector("#ai-settings-form");
  document.querySelector("[data-ai-test]").addEventListener("click", async () => {
    const fields = new FormData(form);
    const draftSettings = {
      ...settings,
      enabled: fields.get("enabled") === "on",
      mockMode: fields.get("mockMode") === "on",
      provider: fields.get("provider"),
      endpoint: fields.get("endpoint") || "/api/ai-design",
    };
    alert((await AI_DESIGN_SERVICE.testAIConnection(draftSettings)).message);
  });
  document.querySelector("[data-ai-reference-upload]")?.addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    try {
      const urls = [];
      for (const file of files) urls.push(await RSVP_STORAGE.uploadDesignAsset(file, "ai-references"));
      const field = form.elements.referenceImages;
      field.value = [field.value.trim(), ...urls].filter(Boolean).join("\n");
      alert(`참고 이미지 ${urls.length}개를 업로드했습니다. 저장을 눌러 AI 설정에 반영하세요.`);
    } catch (error) {
      alert(error.message || "참고 이미지 업로드에 실패했습니다.");
    } finally {
      event.target.value = "";
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); const fields = new FormData(form);
    invitationData.designSystem.aiSettings = {
      enabled: fields.get("enabled") === "on",
      mockMode: fields.get("mockMode") === "on",
      provider: fields.get("provider"),
      model: fields.get("model"),
      endpoint: fields.get("endpoint"),
      removeWhiteBackground: fields.get("removeWhiteBackground") === "on",
      whiteTolerance: Number(fields.get("whiteTolerance")),
      convertSvg: fields.get("convertSvg") === "on",
      savePng: fields.get("savePng") === "on",
      referenceImages: fields.get("referenceImages"),
      prompts: {
        base: fields.get("prompts.base"),
        colorTheme: fields.get("prompts.colorTheme"),
        movieTheme: fields.get("prompts.movieTheme"),
        frameAsset: fields.get("prompts.frameAsset"),
        textThemeAsset: fields.get("prompts.textThemeAsset"),
        iconAsset: fields.get("prompts.iconAsset"),
        transport: fields.get("prompts.transport"),
        venue: fields.get("prompts.venue"),
      },
    };
    await saveDesignData("AI 설정을 저장했습니다.", renderAISettings);
  });
}

function renderAILibrary(message = "") {
  const library = designData().designSystem.aiLibrary;
  adminApp.innerHTML = `${adminHeader("ai-library")}<section class="admin-card"><p class="section-label">Super Admin</p><h2>AI 생성물 라이브러리</h2>
    <p class="admin-message">${escapeAdminHtml(message || "최근 생성 결과를 보관합니다. 테마에 적용하기 전 비교하거나 다시 생성할 수 있습니다.")}</p>
    <div class="library-grid">${library.length ? library.map((item, index) => `<article class="asset-card"><strong>${escapeAdminHtml(item.name || item.type)}</strong><p>${escapeAdminHtml(item.type)} · ${escapeAdminHtml(formatDate(item.createdAt))}</p><div class="compact-actions"><button class="btn" data-library-open="${index}">다시 열기</button><button class="btn" data-library-clone="${index}">복제</button><button class="btn" data-library-regenerate="${index}">재생성</button><button class="btn" data-library-delete="${index}">삭제</button></div></article>`).join("") : '<p class="admin-message">아직 생성 이력이 없습니다.</p>'}</div>
  </section>`;
  bindAdminNavigation();
  document.querySelectorAll("[data-library-open]").forEach((button) => button.addEventListener("click", () => alert(JSON.stringify(library[button.dataset.libraryOpen], null, 2))));
  document.querySelectorAll("[data-library-clone]").forEach((button) => button.addEventListener("click", () => { library.unshift({ ...JSON.parse(JSON.stringify(library[button.dataset.libraryClone])), id: `ai-${Date.now()}`, name: `${library[button.dataset.libraryClone].name} 복제본` }); renderAILibrary("생성물을 복제했습니다."); }));
  document.querySelectorAll("[data-library-regenerate]").forEach((button) => button.addEventListener("click", async () => { library.unshift(await AI_DESIGN_SERVICE.regenerateAIResult(library[button.dataset.libraryRegenerate])); renderAILibrary("새 결과를 만들었습니다. 이전 결과도 유지됩니다."); }));
  document.querySelectorAll("[data-library-delete]").forEach((button) => button.addEventListener("click", () => { library.splice(Number(button.dataset.libraryDelete), 1); renderAILibrary("생성물을 삭제했습니다."); }));
}
