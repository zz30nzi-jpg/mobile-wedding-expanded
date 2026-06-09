async function runAIWithProgress(methodOrName, payload = {}, progressRoot) {
  const service = window.AI_DESIGN_SERVICE || (typeof AI_DESIGN_SERVICE !== "undefined" ? AI_DESIGN_SERVICE : null);
  const method = typeof methodOrName === "function" ? methodOrName : service?.[methodOrName];
  if (typeof method !== "function") throw new Error("AI 실행 메서드를 찾지 못했습니다.");
  const progress = progressRoot || document.querySelector("[data-ai-progress], [data-asset-ai-progress]");
  const bar = progress?.querySelector("i");
  const label = progress?.querySelector("b");
  let percent = 12;
  if (progress) progress.hidden = false;
  const timer = setInterval(() => {
    percent = Math.min(94, percent + Math.ceil((100 - percent) / 7));
    if (bar) bar.style.width = `${percent}%`;
    if (label) label.textContent = `${percent}%`;
  }, 220);
  try {
    const result = await method.call(service || null, payload);
    if (bar) bar.style.width = "100%";
    if (label) label.textContent = "100%";
    return result;
  } catch (error) {
    if (/high demand|overloaded|temporarily|혼잡|429|503/i.test(error.message || "")) {
      throw new Error("AI 서버가 일시적으로 혼잡해서 자동 재시도했지만 완료하지 못했습니다. Mock Mode를 켜거나 잠시 후 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    clearInterval(timer);
    setTimeout(() => {
      if (progress) progress.hidden = true;
      if (bar) bar.style.width = "0%";
      if (label) label.textContent = "0%";
    }, 260);
  }
}

function dataUrlToFile(dataUrl, name = "ai-design.png") {
  const [meta, data] = String(dataUrl || "").split(",");
  const mime = meta.match(/data:([^;]+)/)?.[1] || "image/png";
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name, { type: mime });
}

function aiSlug(value = "ai") {
  return String(value || "ai").trim().toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "ai";
}

function designData() {
  const data = window.WEDDING_DESIGN.normalize(invitationData);
  window.WEDDING_AI_SETTINGS = () => data.designSystem.aiSettings;
  return data;
}

async function saveDesignData(message, rerender) {
  applyPendingMovieThemeAssetsBeforeSave();
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
      ${textThemeSample(theme)}
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
    document.querySelector("[data-design-frame-live-preview]").innerHTML = designCombinedHeroPreview({ frame: resolved.heroDecorationAsset, textTheme: resolved.heroTextThemeAsset, tintColor: fields.get("heroDecorationTint"), eyebrowEnabled: fields.get("heroEyebrowEnabled") === "on", namesEnabled: fields.get("heroNamesEnabled") === "on", dateEnabled: fields.get("heroDateEnabled") === "on", position: form.elements.contentPosition.value, xPercent: fields.get("heroTextXPercent"), yPercent: fields.get("heroTextYPercent") });
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
  const presetField = form.elements.presetId;
  let previousPresetId = presetField.value;
  presetField.addEventListener("change", () => {
    if (presetField.value === previousPresetId) return;
    previousPresetId = presetField.value;
    const selectedPreset = designData().designSystem.themes.find((theme) => theme.id === presetField.value);
    const usePresetDefaults = confirm("프리셋을 변경했습니다.\n\n확인: 새 프리셋의 기본 설정을 적용\n취소: 현재 커스텀 디자인 설정을 유지");
    if (!usePresetDefaults) return;
    const inheritDecoration = form.querySelector('input[name="heroDecoration"][value="inherit"]');
    if (inheritDecoration) inheritDecoration.checked = true;
    form.elements.heroTextTheme.value = "inherit";
    if (selectedPreset?.type === "color") {
      form.elements.contentPosition.value = "top";
      invitationData.hero.contentPosition = "top";
    }
    invitationData.appearance.design = {
      presetId: presetField.value,
      heroDecoration: "inherit",
      heroDecorationTint: form.elements.heroDecorationTint?.value || "#ffffff",
      heroTextTheme: "inherit",
    };
    window.WEDDING_DESIGN.apply(invitationData);
    form.elements.heroTextTheme.dispatchEvent(new Event("change", { bubbles: true }));
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
        <div class="ai-mode-tabs"><button class="ai-mode-tab is-active" type="button" data-ai-mode="generate">AI 생성</button><button class="ai-mode-tab" type="button" data-ai-mode="search">🔍 이미지 검색 기반</button></div>
        <div data-ai-generate-panel>
          <div class="ai-chat" data-ai-chat><p>AI: 원하는 무드, 참고 영화, 계절감, 색상값을 한 문장으로 알려주세요.</p></div>
          <div class="ai-input-row"><input data-ai-instruction placeholder="예: 맑은 하늘색과 흰색 중심, 단정하고 고급스럽게"><button class="btn" type="button" data-ai-send>결과보기</button></div>
        </div>
        <div data-ai-search-panel hidden>
          <p class="admin-message">영화명, 드라마, 브랜드명을 입력하면 실제 이미지에서 색상을 추출합니다.<br><small>예: 디즈니 모아나 / 오징어게임 / 티파니앤코</small></p>
          <div class="ai-input-row"><input data-ai-search-query placeholder="예: 디즈니 모아나"><button class="btn" type="button" data-ai-search-send>색상 추출</button></div>
          <div data-ai-search-images hidden class="ai-search-image-row"></div>
        </div>
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
  // AI 모드 탭 전환
  document.querySelectorAll("[data-ai-mode]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-ai-mode]").forEach((t) => t.classList.toggle("is-active", t === tab));
      const mode = tab.dataset.aiMode;
      const generatePanel = document.querySelector("[data-ai-generate-panel]");
      const searchPanel = document.querySelector("[data-ai-search-panel]");
      if (generatePanel) generatePanel.hidden = mode !== "generate";
      if (searchPanel) searchPanel.hidden = mode !== "search";
    });
  });
  // 검색 기반 AI 팔레트 추출
  const runSearch = async () => {
    const query = document.querySelector("[data-ai-search-query]")?.value?.trim();
    if (!query) return;
    try {
      const context = { instruction: query, concept: query, settings: invitationData.designSystem?.aiSettings };
      const aiResult = await runAIWithProgress(() => AI_DESIGN_SERVICE.searchBasedPalette(context), {}, document.querySelector("[data-ai-progress]"));
      // 참조 이미지 썸네일 표시
      const imgRow = document.querySelector("[data-ai-search-images]");
      if (imgRow && aiResult.imageUrls?.length) {
        imgRow.hidden = false;
        imgRow.innerHTML = aiResult.imageUrls.map((url) => `<img src="${escapeAdminHtml(url)}" alt="참조 이미지" class="ai-search-thumb" loading="lazy">`).join("");
      }
      if (!aiResult.searchConfigured) {
        const chat = document.querySelector("[data-ai-chat]");
        if (chat) chat.insertAdjacentHTML("beforeend", `<p class="admin-message">💡 Google Search API가 연결되지 않아 AI 지식 기반으로 생성했습니다.</p>`);
      }
      rememberAIResult(aiResult); showAIResult(aiResult, form);
    } catch (error) {
      const resultsEl = document.querySelector("[data-ai-results]");
      if (resultsEl) resultsEl.innerHTML = `<article class="ai-result-card"><strong>검색 실패</strong><p class="admin-message">${escapeAdminHtml(error.message || "다시 시도해 주세요.")}</p></article>`;
    }
  };
  document.querySelector("[data-ai-search-send]")?.addEventListener("click", (e) => { e.stopPropagation(); runSearch(); });
  // ENTER 키로 검색 실행 (폼 제출 방지)
  document.querySelector("[data-ai-search-query]")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); runSearch(); }
  });
  const requestAI = async () => {
    const instruction = document.querySelector("[data-ai-instruction]")?.value || form.elements.name.value || "고급스럽고 따뜻한 모바일 청첩장 테마";
    const context = { concept: instruction, mood: instruction, instruction, name: form.elements.name.value, settings: invitationData.designSystem?.aiSettings, fonts: designData().designSystem.assets.fonts || [] };
    try {
      const aiResult = await runAIWithProgress(
        () => form.elements.type.value === "movie" ? AI_DESIGN_SERVICE.recommendMovieTheme(context) : AI_DESIGN_SERVICE.recommendColorPalette(context),
        {},
        document.querySelector("[data-ai-progress]")
      );
      rememberAIResult(aiResult); showAIResult(aiResult, form);
    } catch (error) {
      const el = document.querySelector("[data-ai-results]");
      if (el) el.innerHTML = `<article class="ai-result-card"><strong>AI 결과 생성 실패</strong><p class="admin-message">${escapeAdminHtml(error.message || "AI 설정을 확인해 주세요.")}</p></article>`;
    }
  };
  document.querySelector("[data-ai-send]")?.addEventListener("click", (e) => { e.stopPropagation(); requestAI(); });
  document.querySelector("[data-ai-instruction]")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); requestAI(); }
  });
}

function rememberAIResult(result = {}) {
  if (result?.palette) {
    window.latestAIThemeResult = result;
    window.latestThemeAIResult = result;
  }
  const library = designData().designSystem.aiLibrary;
  library.unshift({ ...result, id: result.id || `ai-${Date.now()}`, createdAt: result.createdAt || new Date().toISOString() });
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
  const textTheme = result.heroTextTheme
    ? window.WEDDING_DESIGN.builtInAssets.textThemes.find((item) => item.id === result.heroTextTheme) || { heroTextTheme: result.heroTextTheme }
    : null;
  return `<div class="ai-visual-preview">
    ${result.palette ? `<div><strong>추천 컬러 팔레트</strong>${aiPalettePreview(result.palette)}</div>` : ""}
    ${result.heroDecoration ? `<div><strong>추천 프레임</strong><div class="ai-frame-preview"><span class="hero-decoration-preview" data-decoration-preview="${escapeAdminHtml(result.heroDecoration)}"><i></i></span><span>${escapeAdminHtml(result.heroDecoration)}</span></div></div>` : ""}
    ${textTheme ? `<div><strong>추천 문구 테마</strong>${textThemeSample(textTheme)}</div>` : ""}
    ${result.sectionIconDirection ? `<div class="ai-direction"><strong>섹션 아이콘 방향</strong><p>${escapeAdminHtml(result.sectionIconDirection)}</p></div>` : ""}
    ${result.backgroundDirection ? `<div class="ai-direction"><strong>배경 장식 방향</strong><p>${escapeAdminHtml(result.backgroundDirection)}</p></div>` : ""}
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
      const next = await runAIWithProgress(
        () => AI_DESIGN_SERVICE.regenerateAIResult(result, document.querySelector("[data-ai-instruction]").value),
        {},
        document.querySelector("[data-ai-progress]")
      );
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

function textThemeSample(item = {}) {
  const linkedTheme = item.heroTextTheme
    ? window.WEDDING_DESIGN.builtInAssets.textThemes.find((theme) => theme.id === item.heroTextTheme)
    : null;
  const theme = { ...(linkedTheme || {}), ...item };
  const layout = ["default", "poster-left", "center", "credits"].includes(theme.layout) ? theme.layout : "default";
  const align = ["left", "center", "right"].includes(theme.align) ? theme.align : "center";
  const position = ["top", "middle", "bottom"].includes(theme.previewPosition) ? theme.previewPosition : "bottom";
  const nameSize = Math.max(20, Math.min(54, Number(theme.nameSize) || 34));
  const dateSize = Math.max(9, Math.min(18, Number(theme.dateSize) || 12));
  const opacity = Math.max(0.2, Math.min(1, Number(theme.opacity) || 1));
  const blendMode = ["normal", "screen", "overlay", "soft-light"].includes(theme.blendMode) ? theme.blendMode : "normal";
  const xPercent = Math.max(10, Math.min(90, Number(theme.xPercent) || 50));
  const yPercent = Math.max(10, Math.min(90, Number(theme.yPercent) || (position === "top" ? 24 : position === "middle" ? 50 : 76)));
  const widthPercent = Math.max(40, Math.min(100, Number(theme.widthPercent) || 88));
  const gap = Math.max(0, Math.min(30, Number(theme.gap) || 5));
  const eyebrowNameGap = Math.max(0, Math.min(40, Number(theme.eyebrowNameGap ?? gap)));
  const nameDateGap = Math.max(0, Math.min(40, Number(theme.nameDateGap ?? gap)));
  const eyebrowSize = Math.max(6, Math.min(24, Number(theme.eyebrowSize) || 10));
  const shadowOpacity = Math.max(0, Math.min(1, Number(theme.shadowOpacity ?? (theme.shadow === false ? 0 : 0.34))));
  const shadowBlur = Math.max(0, Math.min(30, Number(theme.shadowBlur) || 8));
  const cardOpacity = Math.max(0, Math.min(1, Number(theme.cardOpacity) || 0.82));
  const cardColor = theme.cardColor || "#ffffff";
  const cardBorderWidth = Math.max(0, Math.min(10, Number(theme.cardBorderWidth) || 0));
  const cardBorderColor = theme.cardBorderColor || "#ffffff";
  const cardBorderStyle = ["solid", "dashed", "dotted", "double"].includes(theme.cardBorderStyle) ? theme.cardBorderStyle : "solid";
  const cardRadius = Math.max(0, Math.min(40, Number(theme.cardRadius) || 8));
  const font = (designData().designSystem.assets.fonts || []).find((fontItem) => fontItem.id === theme.fontId);
  return `<div class="text-theme-sample layout-${layout} position-${position} is-free-layout ${theme.boxEnabled ? "has-box" : ""} ${theme.shadow === false ? "no-shadow" : ""}" style="--sample-align:${align};--sample-name-size:${nameSize}px;--sample-date-size:${dateSize}px;--sample-opacity:${opacity};--sample-blend-mode:${blendMode};--sample-x:${xPercent}%;--sample-y:${yPercent}%;--sample-width:${widthPercent}%;--sample-gap:${gap}px;--sample-eyebrow-name-gap:${eyebrowNameGap}px;--sample-name-date-gap:${nameDateGap}px;--sample-eyebrow-size:${eyebrowSize}px;--sample-shadow-opacity:${shadowOpacity};--sample-shadow-blur:${shadowBlur}px;--sample-card-opacity:${theme.cardBackgroundEnabled === false ? 0 : cardOpacity};--sample-card-color:${cardColor};--sample-card-border-width:${theme.cardBorderEnabled === false ? 0 : cardBorderWidth}px;--sample-card-border-color:${cardBorderColor};--sample-card-border-style:${cardBorderStyle};--sample-card-radius:${cardRadius}px;--sample-font-family:'${escapeAdminHtml(font?.family || "Cormorant Garamond")}','Noto Serif KR',serif;">
    <div class="text-theme-sample-copy"><small>WE ARE GETTING MARRIED</small><strong>조성호 · 전지연</strong><span>2026. 10. 04</span></div>
  </div>`;
}

function frameEditorSample(item = {}) {
  const source = window.adminMediaUrl?.(item.url || item.previewUrl) || item.url || item.previewUrl || "";
  const opacity = Math.max(0.1, Math.min(1, Number(item.opacity) || 1));
  const blendMode = ["normal", "screen", "multiply", "overlay", "soft-light"].includes(item.blendMode) ? item.blendMode : "normal";
  const xPercent = Math.max(0, Math.min(100, Number(item.xPercent) || 50));
  const yPercent = Math.max(0, Math.min(100, Number(item.yPercent) || 50));
  const sizePercent = Math.max(20, Math.min(140, Number(item.sizePercent) || 100));
  const tintColor = item.tintColor || "#ffffff";
  return `<div class="frame-editor-canvas mode-${item.mode === "outer" ? "outer" : "overlay"}">
    ${source ? `<span class="frame-editor-decoration" style="--frame-opacity:${opacity};--frame-blend-mode:${blendMode};--frame-x:${xPercent}%;--frame-y:${yPercent}%;--frame-size:${sizePercent}%;--frame-tint:${tintColor};--frame-image:url('${escapeAdminHtml(source)}')"><img src="${escapeAdminHtml(source)}" alt="메인 이미지 꾸밈 미리보기"></span>` : '<span class="frame-editor-empty">이미지를 업로드하거나 AI로 생성해 주세요.</span>'}
  </div>`;
}

function designCombinedHeroPreview({ frame = {}, textTheme = {}, tintColor = "#ffffff", eyebrowEnabled = true, namesEnabled = true, dateEnabled = true, position = "bottom", xPercent, yPercent } = {}) {
  const source = frame?.url || frame?.previewUrl || "";
  const align = ["left", "center", "right"].includes(textTheme?.align) ? textTheme.align : "center";
  const nameSize = Math.max(20, Math.min(54, Number(textTheme?.nameSize) || 34));
  const dateSize = Math.max(9, Math.min(18, Number(textTheme?.dateSize) || 12));
  const eyebrowSize = Math.max(6, Math.min(24, Number(textTheme?.eyebrowSize) || 10));
  const hasFreePosition = Number.isFinite(Number(xPercent)) && Number.isFinite(Number(yPercent));
  const positionClass = hasFreePosition ? "is-free-position" : `position-${escapeAdminHtml(position)}`;
  const freePositionStyle = hasFreePosition
    ? `;left:${Number(xPercent)}%;right:auto;top:${Number(yPercent)}%;width:${Number(textTheme?.widthPercent || 88)}%;transform:translate(-50%,-50%)`
    : "";
  return `<div class="design-combined-preview mode-${frame?.mode === "outer" ? "outer" : "overlay"}">
    ${source ? `<span class="frame-editor-decoration" style="--frame-opacity:${frame.opacity ?? 1};--frame-blend-mode:${frame.blendMode || "normal"};--frame-x:${frame.xPercent ?? 50}%;--frame-y:${frame.yPercent ?? 50}%;--frame-size:${frame.sizePercent ?? 100}%;--frame-tint:${tintColor};--frame-image:url('${escapeAdminHtml(source)}')"><img src="${escapeAdminHtml(source)}" alt=""></span>` : ""}
    <div class="design-combined-copy ${positionClass}" style="text-align:${align};--combined-name-size:${nameSize}px;--combined-date-size:${dateSize}px;--combined-eyebrow-size:${eyebrowSize}px${freePositionStyle}">
      ${eyebrowEnabled ? `<small>${escapeAdminHtml(invitationData.hero.eyebrow || "our wedding day")}</small>` : ""}
      ${namesEnabled ? `<strong>${escapeAdminHtml(invitationData.couple.groom.name)} · ${escapeAdminHtml(invitationData.couple.bride.name)}</strong>` : ""}
      ${dateEnabled ? `<span>${escapeAdminHtml(invitationData.wedding.displayDate)}</span>` : ""}
    </div>
  </div>`;
}

function assetPreview(type, item = {}) {
  const previewUrl = window.adminMediaUrl?.(item.url || item.previewUrl) || item.url || item.previewUrl;
  if (type === "frame" && previewUrl) return `<div class="asset-source-preview asset-frame-preview">${frameEditorSample(item)}</div>`;
  if (previewUrl) return `<div class="asset-source-preview asset-source-image ${type === "background" ? "is-background" : ""}"><img src="${escapeAdminHtml(previewUrl)}" alt="${escapeAdminHtml(item.name || "디자인 소스")} 미리보기"></div>`;
  if (type === "frame") return `<div class="asset-source-preview"><span class="hero-decoration-preview" data-decoration-preview="${escapeAdminHtml(item.heroDecoration || item.id || "none")}"><i></i></span></div>`;
  if (type === "textTheme") return `<div class="asset-source-preview">${textThemeSample(item)}</div>`;
  if (type === "font") return `<div class="asset-source-preview asset-placeholder-background"><span style="font-family:${escapeAdminHtml(item.family || "serif")}">가나다 Aa</span><small>${escapeAdminHtml(item.license || "상업적 무료 확인 필요")}</small></div>`;
  if (type === "sectionIcon") return `<div class="asset-source-preview asset-placeholder-icon"><span>◇</span><small>${escapeAdminHtml(item.direction || "ICON")}</small></div>`;
  return `<div class="asset-source-preview asset-placeholder-background"><span>${escapeAdminHtml(item.direction || "BACKGROUND")}</span></div>`;
}

function assetLibraryCards(type) {
  const category = assetCategories[type];
  const items = designData().designSystem.assets[category.key] || [];
  return items.length ? items.map((item) => `<article class="asset-library-card ${item.enabled === false ? "is-hidden" : ""}">
    ${assetPreview(type, item)}
    <div><strong>${escapeAdminHtml(item.name || item.id)}</strong><p>${escapeAdminHtml(item.mode || item.layout || item.direction || category.label)}${item.enabled === false ? " · 숨김" : ""}</p></div>
    <div class="compact-actions">
      <button class="btn" type="button" data-asset-library-preview="${escapeAdminHtml(item.id)}">미리보기</button>
      <button class="btn" type="button" data-asset-edit="${escapeAdminHtml(item.id)}" data-asset-type="${type}">수정</button>
      <button class="btn" type="button" data-asset-clone="${escapeAdminHtml(item.id)}" data-asset-type="${type}">복제</button>
      <button class="btn" type="button" data-asset-toggle="${escapeAdminHtml(item.id)}" data-asset-type="${type}">${item.enabled === false ? "표시" : "숨김"}</button>
      <button class="btn btn-danger" type="button" data-asset-delete="${escapeAdminHtml(item.id)}" data-asset-type="${type}">삭제</button>
    </div>
  </article>`).join("") : '<p class="admin-message">아직 등록된 디자인 소스가 없습니다.</p>';
}

function designAssetLibrarySections(filter = "all") {
  return Object.entries(assetCategories)
    .filter(([type]) => type !== "font" && (filter === "all" || filter === type))
    .map(([type, category]) => `<section class="asset-library-section"><div class="admin-toolbar"><div><h3>${category.label}</h3><p>${category.guide}</p></div><span class="badge">${(designData().designSystem.assets[category.key] || []).length}개</span></div><div class="asset-library-grid">${assetLibraryCards(type)}</div></section>`)
    .join("");
}

function renderDesignAssets(message = "", filter = "all") {
  designData();
  adminApp.innerHTML = `${adminHeader("assets")}<section class="admin-card">
    <div class="admin-toolbar"><div><p class="section-label">Super Admin</p><h2>디자인 요소 생성</h2></div><button class="btn btn-primary" type="button" data-new-asset>새 디자인 소스 만들기</button></div>
    <p class="admin-message">${escapeAdminHtml(message || "테마에 연결할 디자인 소스를 카테고리별로 확인하고, 하나의 생성 모달에서 AI 또는 파일 업로드로 추가합니다.")}</p>
    <div class="filter-row"><button class="btn ${filter === "all" ? "btn-primary" : ""}" data-asset-filter="all">전체</button>${Object.entries(assetCategories).filter(([type]) => type !== "font").map(([type, category]) => `<button class="btn ${filter === type ? "btn-primary" : ""}" data-asset-filter="${type}">${category.label}</button>`).join("")}</div>
    ${designAssetLibrarySections(filter)}
  </section><div id="asset-create-modal"></div>`;
  bindAdminNavigation();
  document.querySelector("[data-new-asset]").addEventListener("click", () => openAssetCreateModal());
  document.querySelectorAll("[data-asset-filter]").forEach((button) => button.addEventListener("click", () => renderDesignAssets("", button.dataset.assetFilter)));
  bindAssetLibraryActions(filter);
}

function assetModalFields(type, item = {}) {
  const fonts = designData().designSystem.assets.fonts || [];
  const range = (name, label, value, min, max, step = 1) => `<label class="text-layout-control"><span>${label}</span><input name="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${escapeAdminHtml(value)}"><output data-range-output="${name}">${escapeAdminHtml(value)}</output></label>`;
  return `<div class="asset-modal-fields">
    ${type === "frame" ? `<div class="mobile-frame-editor">
      <div class="frame-mode-picker">
        <button class="frame-mode-btn ${(item.mode || "overlay") !== "outer" ? "is-active" : ""}" type="button" data-mode-pick="overlay">
          <span class="frame-mode-icon">🖼</span><span class="frame-mode-label">사진 위에 겹치기</span><small>얇은 선·드로잉·코너 포인트</small>
        </button>
        <button class="frame-mode-btn ${item.mode === "outer" ? "is-active" : ""}" type="button" data-mode-pick="outer">
          <span class="frame-mode-icon">🪟</span><span class="frame-mode-label">사진 바깥 액자</span><small>액자·필름 테두리·화환 프레임</small>
        </button>
        <input type="hidden" name="assetMode" value="${item.mode === "outer" ? "outer" : "overlay"}">
      </div>
      <div data-frame-live-preview>${frameEditorSample(item)}</div>
      <h3 class="mobile-tool-title">꾸밈 배치</h3>
      <section class="frame-position-section"><strong>위치 조정</strong><div class="frame-align-buttons"><button class="btn" type="button" data-frame-align="20">좌측</button><button class="btn" type="button" data-frame-align="50">중앙</button><button class="btn" type="button" data-frame-align="80">우측</button></div>
      <div class="text-layout-editor">${range("frameXPercent", "좌우 이동", item.xPercent ?? 50, 0, 100)}${range("frameYPercent", "위아래 이동", item.yPercent ?? 50, 0, 100)}</div></section>
      <div class="text-layout-editor">${range("frameSizePercent", item.mode === "outer" ? "전체 액자 크기" : "이미지 크기", item.sizePercent ?? 100, 20, 140)}${range("frameOpacity", "꾸밈 선명도", item.opacity ?? 1, 0.1, 1, 0.05)}</div>
      ${select("frameBlendMode", "사진과 어우러짐", item.blendMode || "normal", [["normal", "기본"], ["screen", "밝게"], ["multiply", "진하게"], ["overlay", "선명하게"], ["soft-light", "은은하게"]])}
    </div>` : ""}
    ${type === "textTheme" ? `<div class="mobile-text-editor">
      ${designSelect("fontId", "사용 폰트", fonts, item.fontId || "noto-serif-kr")}
      <label class="btn image-upload">폰트 파일 업로드<input type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" data-font-upload></label>
      <div class="mobile-text-canvas" data-text-theme-live-preview>${textThemeSample(item)}</div>
      <div class="mobile-tool-tabs">
        <button class="is-active" type="button" data-text-tool="layout">배치</button><button type="button" data-text-tool="text">글자</button><button type="button" data-text-tool="shadow">그림자</button><button type="button" data-text-tool="card">카드</button>
      </div>
      <div class="mobile-tool-panels">
        <section class="mobile-tool-panel is-active" data-text-panel="layout">${select("layout", "기본 배열", item.layout || "poster-left", [["default", "가운데형"], ["poster-left", "왼쪽 포스터형"], ["center", "중앙 오버레이형"], ["credits", "크레딧형"]])}${select("align", "정렬", item.align || "center", [["left", "왼쪽"], ["center", "가운데"], ["right", "오른쪽"]])}<div class="text-layout-editor">${range("xPercent", "좌우 이동", item.xPercent ?? 50, 10, 90)}${range("yPercent", "위아래 이동", item.yPercent ?? 76, 10, 90)}${range("widthPercent", "문구 영역 너비", item.widthPercent ?? 88, 40, 96)}</div></section>
        <section class="mobile-tool-panel" data-text-panel="text"><div class="text-layout-editor">${range("nameSize", "이름 크기", item.nameSize || 34, 20, 54)}${range("dateSize", "날짜 크기", item.dateSize || 12, 9, 18)}${range("eyebrowSize", "영문 문구 크기", item.eyebrowSize ?? 10, 6, 24)}${range("eyebrowNameGap", "영문 ↔ 이름 간격", item.eyebrowNameGap ?? item.gap ?? 5, 0, 40)}${range("nameDateGap", "이름 ↔ 날짜 간격", item.nameDateGap ?? item.gap ?? 5, 0, 40)}${range("opacity", "글자 선명도", item.opacity ?? 1, 0.2, 1, 0.05)}</div>${select("blendMode", "사진과 어우러짐", item.blendMode || "normal", [["normal", "기본"], ["screen", "밝게"], ["overlay", "선명하게"], ["soft-light", "은은하게"]])}</section>
        <section class="mobile-tool-panel" data-text-panel="shadow"><label class="consent"><input type="checkbox" name="shadow" ${item.shadow !== false ? "checked" : ""}> <span>그림자 사용</span></label><div class="text-layout-editor">${range("shadowOpacity", "그림자 진하기", item.shadowOpacity ?? (item.shadow === false ? 0 : 0.34), 0, 1, 0.05)}${range("shadowBlur", "그림자 번짐", item.shadowBlur ?? 8, 0, 30)}</div></section>
        <section class="mobile-tool-panel" data-text-panel="card"><label class="consent"><input type="checkbox" name="boxEnabled" ${item.boxEnabled ? "checked" : ""}> <span>카드 영역 사용</span></label><label class="consent"><input type="checkbox" name="cardBackgroundEnabled" ${item.cardBackgroundEnabled !== false ? "checked" : ""}> <span>카드 배경색 사용</span></label><label class="consent"><input type="checkbox" name="cardBorderEnabled" ${item.cardBorderEnabled !== false ? "checked" : ""}> <span>카드 획 사용</span></label><div class="text-layout-editor">${input("cardColor", "카드 색상", item.cardColor || "#ffffff", "color")}${range("cardOpacity", "카드 투명도", item.cardOpacity ?? 0.82, 0, 1, 0.05)}${input("cardBorderColor", "테두리 색상", item.cardBorderColor || "#ffffff", "color")}${range("cardBorderWidth", "테두리 굵기", item.cardBorderWidth ?? 0, 0, 10)}${select("cardBorderStyle", "테두리 모양", item.cardBorderStyle || "solid", [["solid", "실선"], ["dashed", "긴 점선"], ["dotted", "둥근 점선"], ["double", "이중선"]])}${range("cardRadius", "모서리 둥글기", item.cardRadius ?? 8, 0, 40)}</div></section>
      </div>
    </div>` : ""}
    ${type === "font" ? `<label class="field"><span>폰트 패밀리명</span><input name="fontFamily" value="${escapeAdminHtml(item.family || "")}" placeholder="예: My Wedding Font"></label><label class="field"><span>라이선스</span><input name="fontLicense" value="${escapeAdminHtml(item.license || "상업적 무료 확인 완료")}"></label><label class="btn image-upload">폰트 파일 업로드<input type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" data-font-upload></label>` : ""}
  </div>`;
}

function assetUploadFields(type) {
  return !["textTheme", "font"].includes(type) ? `<div class="asset-upload-row"><label class="btn image-upload">SVG/이미지 업로드<input type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg" data-asset-modal-upload></label><button class="btn" type="button" data-asset-upload-remove>업로드 이미지 삭제</button><small>${type === "frame" ? "프레임: SVG 300KB 이하, PNG/WebP/JPG 2MB 이하 · 블랙 디자인, 투명 배경 권장" : type === "sectionIcon" ? "아이콘: SVG 300KB 이하, PNG/WebP/JPG 2MB 이하 · 512x512 권장" : "배경: SVG 300KB 이하, PNG/WebP/JPG 2MB 이하 · 1920x1080 권장"}</small></div>` : "";
}

function assetDraftFromAI(type, result) {
  if (result?.imageDataUrl || result?.url || result?.previewUrl) {
    const base = {
      url: result.url || window.assetSourceDraft?.url || result.imageDataUrl || "",
      previewUrl: result.previewUrl || result.imageDataUrl || result.url || "",
      direction: result.direction || result.prompt || window.assetSourceDraft?.direction || "AI 이미지 생성 결과",
    };
    if (type === "frame") return { ...base, mode: window.assetSourceDraft?.mode || "overlay", heroDecoration: "custom_image" };
    return base;
  }
  if (type === "frame") return { heroDecoration: result.heroDecoration || "custom_image", direction: result.frameDirection || result.heroDecoration || "AI 메인 이미지 꾸밈" };
  if (type === "textTheme") return { heroTextTheme: result.heroTextTheme, layout: result.layout?.position || result.textThemeLayout || "poster-left", fontId: result.fontId || "noto-serif-kr", direction: result.fontDirection || "" };
  if (type === "font") return { family: result.fontFamily || "Noto Serif KR", license: result.fontLicense || result.license || "상업적 무료 확인 필요" };
  return { direction: result.direction || result.sectionIconDirection || result.backgroundDirection || "AI 디자인 방향" };
}

function updateAssetModalPreview() {
  const root = document.querySelector("[data-asset-modal-preview]");
  if (root) root.innerHTML = assetPreview(root.dataset.assetModalPreview, window.assetSourceDraft || {});
  const framePreview = document.querySelector("[data-frame-live-preview]");
  if (framePreview) framePreview.innerHTML = frameEditorSample(window.assetSourceDraft || {});
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

function syncAssetDraftFromForm(type, form) {
  window.assetSourceDraft ||= {};
  if (type === "frame") Object.assign(window.assetSourceDraft, {
    mode: form.elements.assetMode?.value || "overlay",
    xPercent: Math.max(0, Math.min(100, Number(form.elements.frameXPercent.value) || 50)),
    yPercent: Math.max(0, Math.min(100, Number(form.elements.frameYPercent.value) || 50)),
    sizePercent: Math.max(20, Math.min(140, Number(form.elements.frameSizePercent.value) || 100)),
    opacity: Math.max(0.1, Math.min(1, Number(form.elements.frameOpacity.value) || 1)),
    blendMode: form.elements.frameBlendMode.value,
    tintColor: window.assetSourceDraft.tintColor || "#ffffff",
  });
  if (type === "textTheme") Object.assign(window.assetSourceDraft, {
    layout: form.elements.layout.value,
    fontId: form.elements.fontId?.value || window.assetSourceDraft.fontId || "noto-serif-kr",
    align: form.elements.align.value,
    nameSize: Number(form.elements.nameSize.value) || 34,
    dateSize: Number(form.elements.dateSize.value) || 12,
    opacity: Math.max(0.2, Math.min(1, Number(form.elements.opacity.value) || 1)),
    blendMode: form.elements.blendMode.value,
    previewPosition: form.elements.previewPosition?.value || window.assetSourceDraft.previewPosition || "bottom",
    xPercent: Math.max(10, Math.min(90, Number(form.elements.xPercent.value) || 50)),
    yPercent: Math.max(10, Math.min(90, Number(form.elements.yPercent.value) || 76)),
    widthPercent: Math.max(40, Math.min(100, Number(form.elements.widthPercent.value) || 88)),
    eyebrowNameGap: Math.max(0, Math.min(40, Number(form.elements.eyebrowNameGap.value) || 0)),
    nameDateGap: Math.max(0, Math.min(40, Number(form.elements.nameDateGap.value) || 0)),
    eyebrowSize: Math.max(6, Math.min(24, Number(form.elements.eyebrowSize.value) || 10)),
    shadow: form.elements.shadow.checked,
    shadowOpacity: Math.max(0, Math.min(1, Number(form.elements.shadowOpacity.value) || 0)),
    shadowBlur: Math.max(0, Math.min(30, Number(form.elements.shadowBlur.value) || 0)),
    boxEnabled: form.elements.boxEnabled.checked,
    cardBackgroundEnabled: form.elements.cardBackgroundEnabled.checked,
    cardBorderEnabled: form.elements.cardBorderEnabled.checked,
    cardColor: form.elements.cardColor.value,
    cardOpacity: Math.max(0, Math.min(1, Number(form.elements.cardOpacity.value) || 0)),
    cardBorderColor: form.elements.cardBorderColor.value,
    cardBorderWidth: Math.max(0, Math.min(10, Number(form.elements.cardBorderWidth.value) || 0)),
    cardBorderStyle: form.elements.cardBorderStyle.value,
    cardRadius: Math.max(0, Math.min(40, Number(form.elements.cardRadius.value) || 0)),
  });
  if (type === "font") Object.assign(window.assetSourceDraft, {
    family: form.elements.fontFamily?.value?.trim() || window.assetSourceDraft.family || "",
    license: form.elements.fontLicense?.value?.trim() || window.assetSourceDraft.license || "상업적 무료 확인 필요",
    source: window.assetSourceDraft.source || "업로드",
    commercialFree: true,
  });
  updateAssetModalPreview();
}

function bindAssetModal(type, assetId = "") {
  const form = document.querySelector("#asset-source-form");
  const applyTextLayoutRules = () => {
    if (type !== "textTheme") return;
    document.querySelector("[data-text-theme-live-preview]").innerHTML = textThemeSample(window.assetSourceDraft);
  };
  const applyFrameRules = () => {
    if (type !== "frame") return;
    document.querySelector("[data-frame-live-preview]").innerHTML = frameEditorSample(window.assetSourceDraft);
  };
  document.querySelector("[data-asset-close]").addEventListener("click", () => { document.querySelector("#asset-create-modal").innerHTML = ""; });
  form.elements.assetType.addEventListener("change", () => openAssetCreateModal(form.elements.assetType.value));
  // 프레임 모드 피커 (overlay / outer)
  document.querySelectorAll("[data-mode-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const picked = btn.dataset.modePick;
      document.querySelectorAll("[data-mode-pick]").forEach((b) => b.classList.toggle("is-active", b.dataset.modePick === picked));
      const modeInput = form.querySelector("input[name='assetMode']");
      if (modeInput) { modeInput.value = picked; modeInput.dispatchEvent(new Event("change")); }
    });
  });
  form.querySelectorAll("select, input").forEach((field) => {
    if (field.type !== "file") field.addEventListener(field.type === "range" ? "input" : "change", () => {
      document.querySelector(`[data-range-output="${field.name}"]`)?.replaceChildren(field.value);
      syncAssetDraftFromForm(type, form);
      applyTextLayoutRules();
      applyFrameRules();
    });
  });
  applyTextLayoutRules();
  document.querySelectorAll("[data-text-tool]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-text-tool], [data-text-panel]").forEach((item) => item.classList.toggle("is-active", item.dataset.textTool === button.dataset.textTool || item.dataset.textPanel === button.dataset.textTool));
  }));
  document.querySelector("[data-asset-modal-upload]")?.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    window.assetSourceDraft = { ...(window.assetSourceDraft || {}), previewUrl: URL.createObjectURL(file) };
    updateAssetModalPreview();
    applyFrameRules();
    try {
      window.assetSourceDraft.url = await window.RSVP_STORAGE.uploadDesignAsset(file, type);
      updateAssetModalPreview();
      applyFrameRules();
    } catch (error) { alert(error.message); }
  });
  document.querySelector("[data-asset-upload-remove]")?.addEventListener("click", () => {
    delete window.assetSourceDraft.url;
    delete window.assetSourceDraft.previewUrl;
    updateAssetModalPreview();
    applyFrameRules();
  });
  document.querySelectorAll("[data-frame-align]").forEach((button) => button.addEventListener("click", () => {
    form.elements.frameXPercent.value = button.dataset.frameAlign;
    form.elements.frameXPercent.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelectorAll("[data-frame-align]").forEach((item) => item.classList.toggle("is-active", item === button));
  }));
  document.querySelector("[data-font-upload]")?.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const url = await window.RSVP_STORAGE.uploadDesignAsset(file, "fonts");
      const id = `font-${Date.now()}`;
      const family = form.elements.fontFamily?.value?.trim() || file.name.replace(/\.(woff2?|ttf|otf)$/i, "");
      const fontItem = { id, name: family, family, url, source: "업로드", license: form.elements.fontLicense?.value?.trim() || "상업적 무료 확인 필요", commercialFree: true };
      invitationData.designSystem.assets.fonts ||= [];
      invitationData.designSystem.assets.fonts.push(fontItem);
      window.assetSourceDraft = { ...(window.assetSourceDraft || {}), ...fontItem, fontId: id };
      updateAssetModalPreview();
      alert("폰트 파일을 업로드하고 폰트 목록에 추가했습니다.");
    } catch (error) {
      alert(`폰트를 업로드하지 못했습니다.\n${error.message || "Storage 정책을 확인해 주세요."}`);
    }
  });
  document.querySelector("[data-asset-ai-send]")?.addEventListener("click", async () => {
    const methods = { frame: "generateFrameDecoration", textTheme: "generateHeroTextTheme", sectionIcon: "generateSectionIcon", background: "generateBackgroundDecoration", font: "generateHeroTextTheme" };
    const mode = form.elements.assetMode?.value || window.assetSourceDraft?.mode || "overlay";
    const modeGuide = type === "frame"
      ? mode === "outer"
        ? "적용방식: 사진바깥쪽 꾸미기. 사진을 감싸는 액자/필름 프레임/코너 장식 형태로 만들고 중앙 사진 영역은 비워 둔다."
        : "적용방식: 사진 위에 겹치기. 인물 얼굴을 가리지 않는 얇은 선, 작은 드로잉, 코너 포인트, 반투명 오버레이 중심으로 만든다."
      : "";
    const instruction = [document.querySelector("[data-asset-ai-instruction]").value, modeGuide].filter(Boolean).join("\n");
    document.querySelector("[data-asset-ai-chat]").insertAdjacentHTML("beforeend", `<p>사용자: ${escapeAdminHtml(instruction)}</p><p>AI: 요청에 맞는 미리보기를 만들었습니다.</p>`);
    try {
      const result = ["frame", "sectionIcon", "background"].includes(type)
        ? await runAIWithProgress(
            () => AI_DESIGN_SERVICE.generateAssetImage({ instruction, assetType: type, mode, fonts: designData().designSystem.assets.fonts || [] }),
            {},
            document.querySelector("[data-asset-ai-progress]")
          )
        : await runAIWithProgress(methods[type], { instruction, settings: invitationData.designSystem.aiSettings, fonts: designData().designSystem.assets.fonts || [] }, document.querySelector("[data-asset-ai-progress]"));
      const finalResult = await persistAIImageResult(type, result);
      renderAssetModalAIResult(type, finalResult);
      if (finalResult.uploadError) document.querySelector("[data-asset-ai-chat]")?.insertAdjacentHTML("beforeend", `<p>AI: 이미지는 만들었지만 업로드 저장은 실패했습니다. 저장 시 임시 이미지로 반영됩니다.</p>`);
    } catch (error) {
      document.querySelector("[data-asset-ai-results]").innerHTML = `<article class="ai-result-card"><strong>AI 결과 생성 실패</strong><p class="admin-message">${escapeAdminHtml(error.message || "AI 설정을 확인해 주세요.")}</p></article>`;
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    syncAssetDraftFromForm(type, form);
    const fields = new FormData(form);
    const category = assetCategories[type];
    const item = {
      ...(window.assetSourceDraft || {}),
      id: assetId || `${type}-${Date.now()}`,
      name: fields.get("assetName") || `새 ${category.label}`,
      enabled: window.assetSourceDraft?.enabled !== false,
    };
    delete item.previewUrl;
    delete item.aiResult;
    const items = invitationData.designSystem.assets[category.key];
    const index = items.findIndex((entry) => entry.id === item.id);
    if (index >= 0) items[index] = item; else items.push(item);
    await saveDesignData(assetId ? "디자인 소스를 수정했습니다." : "디자인 소스를 저장했습니다.", renderDesignAssets);
  });
}

function openAssetCreateModal(type = "frame", assetId = "") {
  const source = assetId ? findAsset(type, assetId) || {} : {};
  window.assetSourceDraft = JSON.parse(JSON.stringify(source));
  const category = assetCategories[type];
  document.querySelector("#asset-create-modal").innerHTML = `<div class="admin-modal-backdrop asset-studio-backdrop"><section class="admin-modal asset-create-modal asset-studio">
    <div class="admin-toolbar asset-studio-topbar"><h2>${assetId ? "디자인 소스 수정" : "새 디자인 소스 만들기"}</h2><button class="btn" type="button" data-asset-close>닫기</button></div>
    <form class="editor-form asset-studio-form" id="asset-source-form">
      <div class="asset-type-tabs">${Object.entries(assetCategories).map(([value, item]) => `<button class="${value === type ? "is-active" : ""}" type="button" data-asset-type-tab="${value}">${item.label}</button>`).join("")}</div>
      <input type="hidden" name="assetType" value="${type}">
      ${input("assetName", "디자인 소스 이름", source.name || "")}
      ${type !== "font" ? `<section class="ai-assistant"><h3>AI 디자인 어시스턴트</h3><div class="ai-chat" data-asset-ai-chat><p>AI: 원하는 ${category.label}의 분위기와 형태를 알려주세요.</p></div>
        <div class="ai-input-row"><input data-asset-ai-instruction placeholder="따뜻한 빈티지 필름 느낌으로 만들어줘"><button class="btn" type="button" data-asset-ai-send>AI로 생성</button></div><div data-asset-ai-results></div>
      </section>` : ""}
      ${assetUploadFields(type)}
      <p class="admin-message">${category.guide}</p>${assetModalFields(type, source)}
      <button class="btn btn-primary" type="submit">${assetId ? "수정 내용 저장" : "디자인 소스 저장"}</button>
    </form>
  </section></div>`;
  bindAssetModal(type, assetId);
  document.querySelectorAll("[data-asset-type-tab]").forEach((button) => button.addEventListener("click", () => openAssetCreateModal(button.dataset.assetTypeTab)));
}

function findAsset(type, id) {
  const category = assetCategories[type];
  return category ? designData().designSystem.assets[category.key].find((item) => item.id === id) : null;
}

function clearAssetReferences(type, id) {
  const system = designData().designSystem;
  const field = type === "frame" ? "heroDecoration" : type === "textTheme" ? "heroTextTheme" : "";
  if (!field) return;
  const fallback = type === "frame" ? "none" : "default_center";
  if (system.colorDefaults[field] === id) system.colorDefaults[field] = fallback;
  system.themes.forEach((theme) => { if (theme[field] === id) theme[field] = fallback; });
  if (invitationData.appearance.design?.[field] === id) invitationData.appearance.design[field] = "inherit";
}

function bindAssetLibraryActions(filter) {
  const rerender = (message) => renderDesignAssets(message, filter);
  document.querySelectorAll("[data-asset-library-preview]").forEach((button) => button.addEventListener("click", () => {
    button.closest(".asset-library-card").classList.toggle("is-preview-focused");
  }));
  document.querySelectorAll("[data-asset-edit]").forEach((button) => button.addEventListener("click", () => openAssetCreateModal(button.dataset.assetType, button.dataset.assetEdit)));
  document.querySelectorAll("[data-asset-clone]").forEach((button) => button.addEventListener("click", async () => {
    const category = assetCategories[button.dataset.assetType];
    const source = findAsset(button.dataset.assetType, button.dataset.assetClone);
    if (!source) return;
    invitationData.designSystem.assets[category.key].push({ ...JSON.parse(JSON.stringify(source)), id: `${source.id}-copy-${Date.now()}`, name: `${source.name} 복제본`, enabled: true });
    await saveDesignData("디자인 소스를 복제했습니다.", rerender);
  }));
  document.querySelectorAll("[data-asset-toggle]").forEach((button) => button.addEventListener("click", async () => {
    const item = findAsset(button.dataset.assetType, button.dataset.assetToggle);
    if (!item) return;
    item.enabled = item.enabled === false;
    await saveDesignData("디자인 소스 표시 여부를 변경했습니다.", rerender);
  }));
  document.querySelectorAll("[data-asset-delete]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("이 디자인 소스를 삭제할까요? 삭제 후 적용 목록에서도 제거됩니다.")) return;
    const system = designData().designSystem;
    const category = assetCategories[button.dataset.assetType];
    const id = button.dataset.assetDelete;
    system.deletedAssetIds ||= [];
    if (!system.deletedAssetIds.includes(id)) system.deletedAssetIds.push(id);
    system.assets[category.key] = system.assets[category.key].filter((item) => item.id !== id);
    clearAssetReferences(button.dataset.assetType, id);
    await saveDesignData("디자인 소스를 삭제했습니다.", rerender);
  }));
}

function fontDefaultSettingsMarkup() {
  const system = designData().designSystem;
  const fonts = system.assets.fonts || [];
  const defaults = system.fontDefaults || {};
  const fontSelect = (name, label, value) => designSelect(`fontDefaults.${name}`, label, fonts, value || "noto-serif-kr");
  return `<section class="asset-library-section font-management-section">
    <div class="admin-toolbar"><div><h3>폰트 기본값 설정</h3><p>등록된 폰트를 확인하고, 영역별 기본 폰트를 지정합니다.</p></div><span class="badge">${fonts.length}개</span></div>
    <form class="font-default-form" data-font-default-form>
      <div class="quick-input-grid">
        ${fontSelect("englishTitle", "영문 타이틀", defaults.englishTitle)}
        ${fontSelect("koreanTitle", "국문 타이틀", defaults.koreanTitle)}
        ${fontSelect("koreanBody", "국문 설명", defaults.koreanBody)}
        ${fontSelect("subTitle", "서브 제목", defaults.subTitle)}
        ${fontSelect("subText", "서브 텍스트", defaults.subText)}
      </div>
      <div class="compact-actions">
        <label class="btn image-upload">폰트 파일 업로드<input type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" data-font-direct-upload></label>
        <button class="btn btn-primary" type="submit">폰트 기본값 저장</button>
      </div>
    </form>
  </section>`;
}

function renderFontManager(message = "") {
  designData();
  const fonts = invitationData.designSystem.assets.fonts || [];
  adminApp.innerHTML = `${adminHeader("fonts")}<section class="admin-card">
    <div class="admin-toolbar"><div><p class="section-label">Super Admin</p><h2>폰트 목록</h2></div><button class="btn btn-primary" type="button" data-font-open-upload>폰트 업로드</button></div>
    <p class="admin-message">${escapeAdminHtml(message || "현재 등록된 상업적 무료/업로드 폰트를 확인합니다. 영역별 기본값은 기본값 설정 메뉴에서 지정합니다.")}</p>
    <div class="asset-library-grid">
      ${fonts.map((font) => `<article class="asset-library-card ${font.enabled === false ? "is-hidden" : ""}">
        ${assetPreview("font", font)}
        <div><strong>${escapeAdminHtml(font.name || font.family || font.id)}</strong><p>${escapeAdminHtml(font.source || "등록 폰트")} · ${escapeAdminHtml(font.license || "라이선스 확인 필요")}</p></div>
        <div class="compact-actions">
          <button class="btn" type="button" data-asset-edit="${escapeAdminHtml(font.id)}" data-asset-type="font">수정</button>
          <button class="btn" type="button" data-asset-toggle="${escapeAdminHtml(font.id)}" data-asset-type="font">${font.enabled === false ? "표시" : "숨김"}</button>
        </div>
      </article>`).join("") || '<p class="admin-message">등록된 폰트가 없습니다.</p>'}
    </div>
  </section><div id="asset-create-modal"></div>`;
  bindAdminNavigation();
  document.querySelector("[data-font-open-upload]")?.addEventListener("click", () => openAssetCreateModal("font"));
  bindAssetLibraryActions("font");
}

function renderAISettings(message = "") {
  const settings = designData().designSystem.aiSettings;
  const prompts = settings.prompts || {};
  const statusBadge = settings.mockMode !== false
    ? '<span class="ai-status-badge is-mock">Mock Mode</span>'
    : settings.enabled
      ? '<span class="ai-status-badge is-connected">연결됨</span>'
      : '<span class="ai-status-badge is-disabled">비활성</span>';
  adminApp.innerHTML = `${adminHeader("ai-settings")}<section class="admin-card">
    <div class="ai-settings-header">
      <div><p class="section-label">Super Admin</p><h2>AI 설정</h2></div>
      ${statusBadge}
    </div>
    ${message ? `<p class="admin-message">${escapeAdminHtml(message)}</p>` : ""}
    <div class="ai-test-result" id="ai-test-result" hidden></div>
    <form class="form-grid" id="ai-settings-form">
      <div class="ai-mode-toggles">
        <label class="ai-toggle-card ${settings.enabled ? "is-on" : ""}">
          <input type="checkbox" name="enabled" ${settings.enabled ? "checked" : ""}>
          <strong>AI 사용</strong>
          <span>AI 기능 전체 활성화</span>
        </label>
        <label class="ai-toggle-card ai-toggle-mock ${settings.mockMode !== false ? "is-on" : ""}">
          <input type="checkbox" name="mockMode" ${settings.mockMode !== false ? "checked" : ""}>
          <strong>Mock Mode</strong>
          <span>실제 API 호출 없이 테스트 데이터 사용</span>
        </label>
      </div>
      ${select("provider", "Provider", settings.provider, [["OpenAI", "OpenAI"], ["Gemini", "Google Gemini"], ["future", "기타 확장용"]])}
      ${input("model", "모델명", settings.model)}
      ${input("endpoint", "서버 AI 엔드포인트", settings.endpoint || "/api/ai-design")}
      <div class="compact-actions" style="margin-top:0">
        <button class="btn" type="button" data-ai-test>연결 테스트</button>
        <span class="micro-help" style="align-self:center">현재 입력값으로 테스트합니다</span>
      </div>
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
      <button class="btn btn-primary editor-save">저장</button>
    </form></section>`;
  bindAdminNavigation();
  const form = document.querySelector("#ai-settings-form");
  const testResultEl = document.querySelector("#ai-test-result");
  form.querySelectorAll(".ai-toggle-card input").forEach((cb) => {
    cb.addEventListener("change", () => cb.closest(".ai-toggle-card").classList.toggle("is-on", cb.checked));
  });
  document.querySelector("[data-ai-test]").addEventListener("click", async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true; btn.textContent = "테스트 중…";
    testResultEl.hidden = true; testResultEl.className = "ai-test-result";
    try {
      const fields = new FormData(form);
      const draftSettings = { ...settings, enabled: fields.get("enabled") === "on", mockMode: fields.get("mockMode") === "on", provider: fields.get("provider"), endpoint: fields.get("endpoint") || "/api/ai-design" };
      const result = await AI_DESIGN_SERVICE.testAIConnection(draftSettings);
      testResultEl.textContent = result.message;
      testResultEl.classList.add(result.ok ? "is-ok" : "is-error");
    } catch (error) {
      testResultEl.textContent = error.message || "테스트 실패";
      testResultEl.classList.add("is-error");
    } finally {
      testResultEl.hidden = false;
      btn.disabled = false; btn.textContent = "연결 테스트";
    }
  });
  document.querySelector("[data-ai-reference-upload]")?.addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    try {
      const urls = [];
      for (const file of files) urls.push(await RSVP_STORAGE.uploadDesignAsset(file, "ai-references"));
      const field = form.elements.referenceImages;
      field.value = [field.value.trim(), ...urls].filter(Boolean).join("\n");
      testResultEl.textContent = `참고 이미지 ${urls.length}개를 업로드했습니다. 저장을 눌러 AI 설정에 반영하세요.`;
      testResultEl.className = "ai-test-result is-ok"; testResultEl.hidden = false;
    } catch (error) {
      testResultEl.textContent = error.message || "참고 이미지 업로드에 실패했습니다.";
      testResultEl.className = "ai-test-result is-error"; testResultEl.hidden = false;
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
  const typeLabel = { palette: "컬러 팔레트", movie: "영화 테마", frame: "메인이미지 꾸밈", textTheme: "메인문구 테마", sectionIcon: "섹션 아이콘", background: "배경 장식", assetImage: "AI 이미지" };
  const paletteChips = (item) => {
    const pal = item.palette;
    if (!pal) return "";
    const chips = [pal.background, pal.card, pal.accent, pal.ink, pal.label].filter(Boolean);
    return `<div class="ai-palette-chips">${chips.map((c) => `<span class="ai-palette-chip" style="background:${escapeAdminHtml(c)}" title="${escapeAdminHtml(c)}"></span>`).join("")}</div>`;
  };
  const cardMarkup = (item, index) => {
    const label = typeLabel[item.type] || item.type;
    const hasApply = ["palette", "movie"].includes(item.type);
    const hasSave = ["frame", "textTheme", "sectionIcon", "background"].includes(item.type);
    return `<article class="library-card">
      <div class="library-card-head">
        <span class="library-type-badge">${escapeAdminHtml(label)}</span>
        <time class="library-card-date">${escapeAdminHtml(formatDate(item.createdAt))}</time>
      </div>
      <strong class="library-card-name">${escapeAdminHtml(item.name || label)}</strong>
      ${paletteChips(item)}
      ${item.direction ? `<p class="library-card-direction">${escapeAdminHtml(item.direction)}</p>` : ""}
      <div class="library-card-actions">
        ${hasApply ? `<button class="btn btn-primary" data-library-apply="${index}">테마에 적용</button>` : ""}
        ${hasSave ? `<button class="btn" data-library-save-asset="${index}">에셋으로 저장</button>` : ""}
        <button class="btn" data-library-regenerate="${index}">재생성</button>
        <button class="btn" data-library-clone="${index}">복제</button>
        <button class="btn" data-library-delete="${index}">삭제</button>
      </div>
    </article>`;
  };
  adminApp.innerHTML = `${adminHeader("ai-library")}<section class="admin-card">
    <div class="ai-settings-header">
      <div><p class="section-label">Super Admin</p><h2>AI 생성물 라이브러리</h2></div>
      <span class="library-count-badge">${library.length}개</span>
    </div>
    ${message ? `<p class="admin-message">${escapeAdminHtml(message)}</p>` : ""}
    <div class="library-grid">${library.length ? library.map(cardMarkup).join("") : '<p class="admin-message">아직 생성 이력이 없습니다.</p>'}</div>
  </section>`;
  bindAdminNavigation();
  document.querySelectorAll("[data-library-apply]").forEach((button) => button.addEventListener("click", () => {
    const item = library[Number(button.dataset.libraryApply)];
    if (!item) return;
    window.latestAIThemeResult = item;
    window.latestThemeAIResult = item;
    renderAILibrary("라이브러리 결과를 선택했습니다. 테마 생성 화면에서 적용 버튼을 눌러 반영하세요.");
  }));
  document.querySelectorAll("[data-library-save-asset]").forEach((button) => button.addEventListener("click", () => {
    const item = library[Number(button.dataset.librarySaveAsset)];
    if (!item) return;
    const system = designData().designSystem;
    const map = { frame: "frames", textTheme: "textThemes", sectionIcon: "sectionIcons", background: "backgrounds" };
    const listKey = map[item.type];
    if (!listKey) return;
    system.assets[listKey] = system.assets[listKey] || [];
    if (!system.assets[listKey].some((a) => a.id === item.id)) system.assets[listKey].push({ ...item });
    saveDesignData("에셋으로 저장했습니다.", renderAILibrary);
  }));
  document.querySelectorAll("[data-library-clone]").forEach((button) => button.addEventListener("click", () => {
    const src = library[Number(button.dataset.libraryClone)];
    library.unshift({ ...JSON.parse(JSON.stringify(src)), id: `ai-${Date.now()}`, name: `${src.name} 복제본` });
    renderAILibrary("생성물을 복제했습니다.");
  }));
  document.querySelectorAll("[data-library-regenerate]").forEach((button) => button.addEventListener("click", async () => {
    library.unshift(await AI_DESIGN_SERVICE.regenerateAIResult(library[Number(button.dataset.libraryRegenerate)]));
    renderAILibrary("새 결과를 만들었습니다. 이전 결과도 유지됩니다.");
  }));
  document.querySelectorAll("[data-library-delete]").forEach((button) => button.addEventListener("click", () => {
    library.splice(Number(button.dataset.libraryDelete), 1);
    renderAILibrary("생성물을 삭제했습니다.");
  }));
}

function layoutThumbnail(tpl) {
  // 실제 레이아웃을 축소한 라이브 미리보기 썸네일
  const slug = window.RSVP_STORAGE?.getActiveInvitationSlug?.() || "main";
  const url = `./index.html?card=${encodeURIComponent(slug)}&__layout=${encodeURIComponent(tpl.id)}&__thumb=1`;
  const bg = escapeAdminHtml(tpl.previewBg || "#f5f0ea");
  return `<div class="ltp-thumb ltp-live" style="background:${bg}">
    <iframe class="ltp-frame" src="${escapeAdminHtml(url)}" loading="lazy" scrolling="no" tabindex="-1" aria-hidden="true" title="${escapeAdminHtml(tpl.name)} 미리보기"></iframe>
  </div>`;
}

function renderLayoutTemplates(message = "") {
  const system = designData().designSystem;
  const templates = system.layoutTemplates || [];
  const active = system.activeLayoutId || "classic";
  const cardSlug = window.RSVP_STORAGE?.getActiveInvitationSlug?.() || "main";
  const previewUrl = (id) => `./index.html?card=${encodeURIComponent(cardSlug)}&__layout=${encodeURIComponent(id)}`;

  const previewCard = (tpl) => {
    const isActive = tpl.id === active;
    const isCustom = !tpl.builtIn;
    return `<article class="layout-template-card ${isActive ? "is-active" : ""}" data-layout-id="${escapeAdminHtml(tpl.id)}">
      ${layoutThumbnail(tpl)}
      <div class="layout-template-info">
        <div class="ltp-info-row">
          <strong>${escapeAdminHtml(tpl.name)}</strong>
          ${isActive ? '<span class="layout-active-badge">적용 중</span>' : ""}
          ${isCustom ? '<span class="ltp-ai-badge">AI</span>' : ""}
        </div>
        <p class="ltp-desc">${escapeAdminHtml(tpl.description)}</p>
        <div class="ltp-actions">
          <button class="btn ltp-btn-preview" data-layout-preview="${escapeAdminHtml(tpl.id)}" data-preview-url="${escapeAdminHtml(previewUrl(tpl.id))}">미리보기</button>
          <button class="btn ltp-btn-edit" data-layout-edit="${escapeAdminHtml(tpl.id)}">편집</button>
          ${isActive ? "" : `<button class="btn btn-primary ltp-btn-apply" data-layout-apply="${escapeAdminHtml(tpl.id)}">적용</button>`}
        </div>
      </div>
    </article>`;
  };

  adminApp.innerHTML = `${adminHeader("layouts")}
  <section class="admin-card">
    <div class="admin-toolbar">
      <div><p class="section-label">Super Admin</p><h2>레이아웃 템플릿</h2></div>
      <button class="btn" id="ltp-ai-toggle">✦ AI 생성</button>
    </div>
    <p class="admin-message micro-help" style="margin-top:6px">청첩장 전체 구조(섹션 배치·여백·타이포그래피)를 선택합니다. 색상·폰트·에셋은 모든 레이아웃에 공통 적용됩니다.</p>
    ${message ? `<p class="admin-message" style="margin-top:8px;color:var(--save)">${escapeAdminHtml(message)}</p>` : ""}
    <div class="ltp-ai-panel" id="ltp-ai-panel" hidden>
      <p class="section-label" style="margin-bottom:4px">AI 레이아웃 생성</p>
      <div class="field"><span>원하는 레이아웃 분위기나 컨셉을 설명해주세요</span><input type="text" id="ltp-ai-input" placeholder="예: 모던하고 여백이 넓은 미니멀 디자인"></div>
      <div id="ltp-ai-progress" class="ai-progress" hidden><span><i style="width:0%"></i></span><b>생성 중...</b><button class="btn" style="min-height:28px;padding:4px 10px;font-size:11px" id="ltp-ai-cancel">취소</button></div>
      <div id="ltp-ai-result" class="ltp-ai-result-preview" hidden></div>
      <button class="btn btn-primary" id="ltp-ai-generate">생성하기</button>
    </div>
    <div class="layout-template-grid" id="ltp-grid">${templates.map(previewCard).join("")}</div>
  </section>
  <div class="ltp-preview-modal" id="ltp-preview-modal" hidden>
    <div class="ltp-preview-backdrop" id="ltp-preview-backdrop"></div>
    <div class="ltp-preview-panel">
      <div class="ltp-preview-topbar">
        <strong id="ltp-preview-title">레이아웃 미리보기</strong>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary ltp-btn-apply" id="ltp-preview-apply" style="display:none" data-layout-apply="">적용</button>
          <button class="btn" id="ltp-preview-close">닫기</button>
        </div>
      </div>
      <div class="ltp-preview-iframe-wrap">
        <iframe id="ltp-preview-iframe" class="ltp-preview-iframe" src="about:blank" title="레이아웃 미리보기"></iframe>
      </div>
    </div>
  </div>
  <div class="ltp-edit-panel" id="ltp-edit-panel" hidden>
    <div class="ltp-preview-backdrop" id="ltp-edit-backdrop"></div>
    <div class="ltp-preview-panel">
      <div class="ltp-preview-topbar">
        <strong>레이아웃 편집</strong>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary" id="ltp-edit-save">저장</button>
          <button class="btn" id="ltp-edit-close">닫기</button>
          <button class="btn" id="ltp-edit-delete" style="color:#c44;border-color:#c44">삭제</button>
        </div>
      </div>
      <div class="ltp-edit-form">
        <input type="hidden" id="ltp-edit-id">
        <div class="field"><span>레이아웃 이름</span><input type="text" id="ltp-edit-name" maxlength="20"></div>
        <div class="field"><span>설명</span><textarea id="ltp-edit-desc" rows="2" maxlength="100"></textarea></div>
        <div class="field"><span>기반 레이아웃 (CSS 구조)</span><select id="ltp-edit-base">
          <option value="classic">클래식 (세로 스크롤 카드형)</option>
          <option value="split">스플릿 (다크 상단 + 라이트 하단)</option>
          <option value="editorial">에디토리얼 (큰 타이포, 잡지형)</option>
        </select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="field"><span>배경색</span><input type="color" id="ltp-edit-bg"></div>
          <div class="field"><span>강조색</span><input type="color" id="ltp-edit-accent"></div>
        </div>
        <div id="ltp-edit-thumb-preview" style="margin-top:8px"></div>
        <hr style="border:none;border-top:1px solid var(--line);margin:6px 0">
        <p class="admin-message" style="margin:0 0 10px">▼ 배경 이미지 · 텍스트 크기 (선택)</p>
        <div class="field">
          <span>히어로 배경 이미지 URL</span>
          <input type="url" id="ltp-edit-bg-image" placeholder="https://... (프레임 뒤 배경에 표시됩니다)">
          <small class="admin-message" style="margin-top:4px;display:block">아치·하트 프레임처럼 배경이 비는 레이아웃에서 사용합니다. Supabase Storage URL도 가능.</small>
        </div>
        <div class="field">
          <span>전체 텍스트 크기 배율 (<span id="ltp-edit-textscale-val">100</span>%)</span>
          <input type="range" id="ltp-edit-textscale" min="80" max="120" step="2" value="100" style="width:100%">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted)"><span>80%</span><span>기본 100%</span><span>120%</span></div>
        </div>
      </div>
    </div>
  </div>`;

  bindAdminNavigation();

  const panel = document.getElementById("ltp-ai-panel");
  document.getElementById("ltp-ai-toggle").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });

  let aiAbortController = null;
  let pendingAILayout = null;

  const progressEl = document.getElementById("ltp-ai-progress");
  const resultEl = document.getElementById("ltp-ai-result");
  const progressBar = progressEl?.querySelector("i");

  document.getElementById("ltp-ai-generate").addEventListener("click", async () => {
    const input = document.getElementById("ltp-ai-input").value.trim();
    progressEl.hidden = false;
    resultEl.hidden = true;
    if (progressBar) progressBar.style.width = "20%";
    try {
      const aiResult = await window.AI_DESIGN_SERVICE.generateLayoutTemplate({ instruction: input });
      if (progressBar) progressBar.style.width = "100%";
      pendingAILayout = {
        id: `ai_layout_${Date.now()}`,
        name: aiResult.name || "AI 레이아웃",
        description: aiResult.description || "",
        previewBg: aiResult.previewBg || "#f5f0ea",
        previewAccent: aiResult.previewAccent || "#8d3440",
        baseLayout: aiResult.baseLayout || "classic",
        concept: aiResult.concept || "",
        builtIn: false,
      };
      resultEl.innerHTML = `<div class="ltp-ai-result-card">
        ${layoutThumbnail(pendingAILayout)}
        <div style="padding:8px 0"><strong style="color:var(--ink)">${escapeAdminHtml(pendingAILayout.name)}</strong>
        <p style="color:var(--muted);font-size:11px;margin:3px 0">${escapeAdminHtml(pendingAILayout.description)}</p>
        <p style="color:var(--muted);font-size:10px">${escapeAdminHtml(pendingAILayout.concept || "")}</p></div>
        <button class="btn btn-primary" style="width:100%" id="ltp-ai-add">이 레이아웃 추가</button>
      </div>`;
      resultEl.hidden = false;
      progressEl.hidden = true;
      document.getElementById("ltp-ai-add").addEventListener("click", async () => {
        system.layoutTemplates = system.layoutTemplates || [];
        system.layoutTemplates.push(pendingAILayout);
        await saveDesignData(`"${pendingAILayout.name}" 레이아웃이 추가되었습니다.`, renderLayoutTemplates);
      });
    } catch (err) {
      if (progressBar) progressBar.style.width = "0%";
      progressEl.hidden = true;
      resultEl.innerHTML = `<p class="admin-message" style="color:#c44">생성 실패: ${escapeAdminHtml(err.message || "알 수 없는 오류")}</p>`;
      resultEl.hidden = false;
    }
  });

  document.getElementById("ltp-ai-cancel")?.addEventListener("click", () => {
    progressEl.hidden = true;
    resultEl.hidden = true;
  });

  const previewModal = document.getElementById("ltp-preview-modal");
  const previewIframe = document.getElementById("ltp-preview-iframe");
  const previewTitle = document.getElementById("ltp-preview-title");
  const previewApplyBtn = document.getElementById("ltp-preview-apply");

  document.querySelectorAll("[data-layout-preview]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.layoutPreview;
      const tpl = templates.find((t) => t.id === id);
      previewTitle.textContent = tpl ? `미리보기 — ${tpl.name}` : "미리보기";
      previewIframe.src = btn.dataset.previewUrl;
      if (id !== active) {
        previewApplyBtn.style.display = "";
        previewApplyBtn.dataset.layoutApply = id;
      } else {
        previewApplyBtn.style.display = "none";
      }
      previewModal.hidden = false;
    });
  });

  const closePreview = () => {
    previewModal.hidden = true;
    previewIframe.src = "about:blank";
  };
  document.getElementById("ltp-preview-close").addEventListener("click", closePreview);
  document.getElementById("ltp-preview-backdrop").addEventListener("click", closePreview);

  const editPanel = document.getElementById("ltp-edit-panel");
  const editClose = () => { editPanel.hidden = true; };
  document.getElementById("ltp-edit-close").addEventListener("click", editClose);
  document.getElementById("ltp-edit-backdrop").addEventListener("click", editClose);

  document.querySelectorAll("[data-layout-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.layoutEdit;
      const tpl = templates.find((t) => t.id === id);
      if (!tpl) return;
      document.getElementById("ltp-edit-id").value = id;
      document.getElementById("ltp-edit-name").value = tpl.name;
      document.getElementById("ltp-edit-desc").value = tpl.description || "";
      document.getElementById("ltp-edit-base").value = tpl.baseLayout || tpl.id;
      document.getElementById("ltp-edit-bg").value = tpl.previewBg || "#f5f0ea";
      document.getElementById("ltp-edit-accent").value = tpl.previewAccent || "#8d3440";
      document.getElementById("ltp-edit-bg-image").value = tpl.heroBgImage || "";
      const scaleVal = Math.round((tpl.textScale || 1) * 100);
      document.getElementById("ltp-edit-textscale").value = scaleVal;
      document.getElementById("ltp-edit-textscale-val").textContent = scaleVal;
      updateEditThumb();
      editPanel.hidden = false;
    });
  });

  const updateEditThumb = () => {
    const thumbEl = document.getElementById("ltp-edit-thumb-preview");
    if (!thumbEl) return;
    thumbEl.innerHTML = layoutThumbnail({
      id: document.getElementById("ltp-edit-base")?.value || "classic",
      baseLayout: document.getElementById("ltp-edit-base")?.value || "classic",
      previewBg: document.getElementById("ltp-edit-bg")?.value || "#f5f0ea",
      previewAccent: document.getElementById("ltp-edit-accent")?.value || "#8d3440",
    });
  };
  ["ltp-edit-base", "ltp-edit-bg", "ltp-edit-accent"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateEditThumb);
  });
  // 텍스트 크기 슬라이더 실시간 레이블
  document.getElementById("ltp-edit-textscale")?.addEventListener("input", (e) => {
    const label = document.getElementById("ltp-edit-textscale-val");
    if (label) label.textContent = e.target.value;
  });

  document.getElementById("ltp-edit-save").addEventListener("click", async () => {
    const id = document.getElementById("ltp-edit-id").value;
    system.layoutTemplates = system.layoutTemplates || [];
    let idx = system.layoutTemplates.findIndex((t) => t.id === id);
    const textScaleRaw = parseInt(document.getElementById("ltp-edit-textscale")?.value || "100", 10);
    const patch = {
      id,
      name: document.getElementById("ltp-edit-name").value.trim(),
      description: document.getElementById("ltp-edit-desc").value.trim(),
      baseLayout: document.getElementById("ltp-edit-base").value,
      previewBg: document.getElementById("ltp-edit-bg").value,
      previewAccent: document.getElementById("ltp-edit-accent").value,
      heroBgImage: document.getElementById("ltp-edit-bg-image")?.value?.trim() || "",
      textScale: textScaleRaw !== 100 ? textScaleRaw / 100 : 1,
    };
    if (idx >= 0) {
      system.layoutTemplates[idx] = { ...system.layoutTemplates[idx], ...patch };
    } else {
      // built-in 레이아웃은 저장된 목록에 없을 수 있으므로 추가
      system.layoutTemplates.push({ builtIn: true, ...patch });
    }
    await saveDesignData("레이아웃을 수정했습니다.", renderLayoutTemplates);
  });

  document.getElementById("ltp-edit-delete").addEventListener("click", async () => {
    const id = document.getElementById("ltp-edit-id").value;
    const tplToDelete = (system.layoutTemplates || []).find((t) => t.id === id);
    const msg = tplToDelete?.builtIn
      ? "기본 제공 레이아웃의 커스텀 설정(배경이미지·텍스트 크기)을 초기화하시겠습니까?"
      : "이 레이아웃을 삭제하시겠습니까? (현재 적용 중이면 classic으로 대체됩니다.)";
    if (!confirm(msg)) return;
    if (tplToDelete?.builtIn) {
      // built-in은 삭제 대신 커스텀 속성만 초기화
      const idx = system.layoutTemplates.findIndex((t) => t.id === id);
      if (idx >= 0) {
        const { heroBgImage: _bg, textScale: _ts, ...rest } = system.layoutTemplates[idx];
        system.layoutTemplates[idx] = rest;
      }
      await saveDesignData("레이아웃 커스텀 설정을 초기화했습니다.", renderLayoutTemplates);
    } else {
      system.layoutTemplates = (system.layoutTemplates || []).filter((t) => t.id !== id);
      if (system.activeLayoutId === id) system.activeLayoutId = "classic";
      await saveDesignData("레이아웃을 삭제했습니다.", renderLayoutTemplates);
    }
  });

  document.querySelectorAll("[data-layout-apply]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.layoutApply;
      if (!id) return;
      designData().designSystem.activeLayoutId = id;
      previewModal.hidden = true;
      previewIframe.src = "about:blank";
      await saveDesignData("레이아웃을 변경했습니다.", renderLayoutTemplates);
    });
  });
}

function ensureMovieThemeAssets(result = {}) {
  const system = designData().designSystem;
  system.assets.frames ||= [];
  system.assets.textThemes ||= [];
  system.assets.sectionIcons ||= [];
  system.assets.backgrounds ||= [];
  const stamp = Date.now();
  const frameId = result.heroDecoration && !["none", "doodle_hearts", "organic_heart", "wedding_rings", "poster_card"].includes(result.heroDecoration)
    ? result.heroDecoration
    : `movie_frame_${aiSlug(result.name)}_${stamp}`;
  const textId = result.heroTextTheme && !["auto", "default_center", "editorial_left", "minimal_center"].includes(result.heroTextTheme)
    ? result.heroTextTheme
    : `movie_text_${aiSlug(result.name)}_${stamp}`;
  const iconId = `movie_icon_${aiSlug(result.name)}_${stamp}`;
  const backgroundId = `movie_bg_${aiSlug(result.name)}_${stamp}`;
  if (!system.assets.frames.some((item) => item.id === frameId)) {
    system.assets.frames.push({
      id: frameId, name: result.frameName || `${result.name || "영화"} 메인 이미지 꾸밈`,
      mode: result.frameMode === "outer" ? "outer" : "overlay", heroDecoration: frameId,
      direction: result.frameDirection || result.heroDecoration || "영화 무드에 맞춘 신규 메인 이미지 꾸밈",
      opacity: result.frameMode === "outer" ? 1 : 0.82, sizePercent: result.frameMode === "outer" ? 112 : 92,
      xPercent: 50, yPercent: 50, tintColor: result.palette?.accent || "#ffffff", enabled: true,
    });
  }
  if (!system.assets.textThemes.some((item) => item.id === textId)) {
    system.assets.textThemes.push({
      id: textId, name: result.textThemeName || `${result.name || "영화"} 메인 문구 테마`,
      layout: ["default", "poster-left", "center", "credits"].includes(result.textThemeLayout) ? result.textThemeLayout : "poster-left",
      heroTextTheme: textId, fontId: result.fontId || "noto-serif-kr", align: "center",
      shadow: true, boxEnabled: false, nameSize: 34, dateSize: 12,
      direction: result.fontDirection || "영화 무드에 맞춘 신규 메인 문구 테마", enabled: true,
    });
  }
  if (!system.assets.sectionIcons.some((item) => item.id === iconId)) {
    system.assets.sectionIcons.push({ id: iconId, name: result.iconName || `${result.name || "영화"} 섹션 아이콘`, direction: result.sectionIconDirection || "영화 무드의 신규 섹션 아이콘", enabled: true });
  }
  if (!system.assets.backgrounds.some((item) => item.id === backgroundId)) {
    system.assets.backgrounds.push({ id: backgroundId, name: result.backgroundName || `${result.name || "영화"} 전체 배경 장식`, direction: result.backgroundDirection || "영화 무드의 신규 전체 배경 장식", enabled: true });
  }
  return { heroDecoration: frameId, heroTextTheme: textId, sectionIcon: iconId, backgroundDecoration: backgroundId };
}

function pendingMovieThemeResult() {
  const result = window.latestThemeAIResult || window.latestAIThemeResult;
  return result && result.palette ? result : null;
}

function applyPendingMovieThemeAssetsBeforeSave() {
  const result = pendingMovieThemeResult();
  if (!result) return;
  const form = document.querySelector("#theme-form");
  if (!form || form.elements.type?.value !== "movie") return;
  const system = designData().designSystem;
  const refs = ensureMovieThemeAssets(result);
  const formId = form.elements.id?.value;
  const formName = form.elements.name?.value;
  const target = [...(system.themes || [])].reverse().find((theme) =>
    theme.type === "movie" && ((formId && theme.id === formId) || (formName && theme.name === formName) || theme.name === result.name)
  ) || [...(system.themes || [])].reverse().find((theme) => theme.type === "movie");
  if (!target) return;
  Object.assign(target, refs, {
    heroDecoration: refs.heroDecoration, heroTextTheme: refs.heroTextTheme,
    fontDirection: result.fontDirection || target.fontDirection || "",
    galleryFrameDirection: result.galleryFrameDirection || target.galleryFrameDirection || "",
    buttonShapeDirection: result.buttonShapeDirection || target.buttonShapeDirection || "",
  });
}

async function persistAIImageResult(type, result = {}) {
  if (!result.imageDataUrl) return result;
  const draft = { ...(window.assetSourceDraft || {}) };
  draft.previewUrl = result.imageDataUrl;
  draft.direction = result.direction || draft.direction || result.prompt || "";
  try {
    const file = dataUrlToFile(result.imageDataUrl, `${type}-${Date.now()}.png`);
    draft.url = await window.RSVP_STORAGE.uploadDesignAsset(file, type);
  } catch (error) {
    draft.url = result.imageDataUrl;
    draft.uploadError = error.message || "이미지를 업로드하지 못해 data URL로 임시 저장했습니다.";
  }
  window.assetSourceDraft = draft;
  return { ...result, previewUrl: draft.previewUrl, url: draft.url };
}
