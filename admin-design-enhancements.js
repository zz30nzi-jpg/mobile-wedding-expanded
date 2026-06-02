// Static HTML/JS enhancements for the super-admin design asset library.
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
  const eyebrowSize = Math.max(6, Math.min(24, Number(theme.eyebrowSize) || 10));
  const shadowOpacity = Math.max(0, Math.min(1, Number(theme.shadowOpacity ?? (theme.shadow === false ? 0 : 0.34))));
  const shadowBlur = Math.max(0, Math.min(30, Number(theme.shadowBlur) || 8));
  const cardOpacity = Math.max(0, Math.min(1, Number(theme.cardOpacity) || 0.82));
  const cardColor = theme.cardColor || "#ffffff";
  const cardBorderWidth = Math.max(0, Math.min(10, Number(theme.cardBorderWidth) || 0));
  const cardBorderColor = theme.cardBorderColor || "#ffffff";
  const cardBorderStyle = ["solid", "dashed", "dotted", "double"].includes(theme.cardBorderStyle) ? theme.cardBorderStyle : "solid";
  const cardRadius = Math.max(0, Math.min(40, Number(theme.cardRadius) || 8));
  const previewImage = theme.previewImage || invitationData.hero.image || "";
  return `<div class="text-theme-sample layout-${layout} position-${position} is-free-layout ${theme.boxEnabled ? "has-box" : ""} ${theme.shadow === false ? "no-shadow" : ""}" style="--sample-align:${align};--sample-name-size:${nameSize}px;--sample-date-size:${dateSize}px;--sample-opacity:${opacity};--sample-blend-mode:${blendMode};--sample-x:${xPercent}%;--sample-y:${yPercent}%;--sample-width:${widthPercent}%;--sample-gap:${gap}px;--sample-eyebrow-size:${eyebrowSize}px;--sample-shadow-opacity:${shadowOpacity};--sample-shadow-blur:${shadowBlur}px;--sample-card-opacity:${cardOpacity};--sample-card-color:${cardColor};--sample-card-border-width:${cardBorderWidth}px;--sample-card-border-color:${cardBorderColor};--sample-card-border-style:${cardBorderStyle};--sample-card-radius:${cardRadius}px;${previewImage ? `background-image:url('${escapeAdminHtml(previewImage)}')` : ""}">
    <div class="text-theme-sample-copy"><small>WE ARE GETTING MARRIED</small><strong>조성호 · 전지연</strong><span>2026. 10. 04</span></div>
  </div>`;
}

function frameEditorSample(item = {}) {
  const source = item.url || item.previewUrl || "";
  const opacity = Math.max(0.1, Math.min(1, Number(item.opacity) || 1));
  const blendMode = ["normal", "screen", "multiply", "overlay", "soft-light"].includes(item.blendMode) ? item.blendMode : "normal";
  const xPercent = Math.max(0, Math.min(100, Number(item.xPercent) || 50));
  const yPercent = Math.max(0, Math.min(100, Number(item.yPercent) || 50));
  const sizePercent = Math.max(20, Math.min(140, Number(item.sizePercent) || 100));
  const tintColor = item.tintColor || "#ffffff";
  return `<div class="frame-editor-canvas" style="${invitationData.hero.image ? `background-image:url('${escapeAdminHtml(invitationData.hero.image)}')` : ""}">
    ${source ? `<span class="frame-editor-decoration" style="--frame-opacity:${opacity};--frame-blend-mode:${blendMode};--frame-x:${xPercent}%;--frame-y:${yPercent}%;--frame-size:${sizePercent}%;--frame-tint:${tintColor}"><img src="${escapeAdminHtml(source)}" alt="메인 이미지 꾸밈 미리보기"></span>` : '<span class="frame-editor-empty">이미지를 업로드하거나 AI로 생성해 주세요.</span>'}
  </div>`;
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

function assetPreview(type, item = {}) {
  const previewUrl = item.url || item.previewUrl;
  if (type === "frame" && previewUrl) return `<div class="asset-source-preview asset-frame-preview">${frameEditorSample(item)}</div>`;
  if (previewUrl) return `<div class="asset-source-preview asset-source-image ${type === "background" ? "is-background" : ""}"><img src="${escapeAdminHtml(previewUrl)}" alt="${escapeAdminHtml(item.name || "디자인 소스")} 미리보기"></div>`;
  if (type === "frame") return `<div class="asset-source-preview"><span class="hero-decoration-preview" data-decoration-preview="${escapeAdminHtml(item.heroDecoration || item.id || "none")}"><i></i></span></div>`;
  if (type === "textTheme") return `<div class="asset-source-preview">${textThemeSample(item)}</div>`;
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
  bindAssetLibraryActions(filter);
}

function assetModalFields(type, item = {}) {
  const range = (name, label, value, min, max, step = 1) => `<label class="text-layout-control"><span>${label}</span><input name="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${escapeAdminHtml(value)}"><output data-range-output="${name}">${escapeAdminHtml(value)}</output></label>`;
  return `<div class="asset-modal-fields">
    ${type === "frame" ? `<div class="mobile-frame-editor">
      <div data-frame-live-preview>${frameEditorSample(item)}</div>
      <div class="mobile-tool-tabs frame-tool-tabs"><button class="is-active" type="button">꾸밈 배치</button></div>
      ${select("assetMode", "적용 방식", item.mode || "overlay", [["overlay", "사진 위에 겹치기"], ["outer", "사진 바깥쪽 꾸미기"]])}
      <div class="text-layout-editor">${range("frameXPercent", "좌우 이동", item.xPercent ?? 50, 0, 100)}${range("frameYPercent", "위아래 이동", item.yPercent ?? 50, 0, 100)}${range("frameSizePercent", "꾸밈 크기", item.sizePercent ?? 100, 20, 140)}${range("frameOpacity", "꾸밈 선명도", item.opacity ?? 1, 0.1, 1, 0.05)}</div>
      ${select("frameBlendMode", "사진과 어우러짐", item.blendMode || "normal", [["normal", "기본"], ["screen", "밝게"], ["multiply", "진하게"], ["overlay", "선명하게"], ["soft-light", "은은하게"]])}
      ${input("frameTintColor", "꾸밈 색상", item.tintColor || "#ffffff", "color")}
    </div>` : ""}
    ${type === "textTheme" ? `<div class="mobile-text-editor">
      <div class="mobile-text-canvas" data-text-theme-live-preview>${textThemeSample({ ...item, previewImage: invitationData.hero.image })}</div>
      <div class="mobile-tool-tabs">
        <button class="is-active" type="button" data-text-tool="layout">배치</button><button type="button" data-text-tool="text">글자</button><button type="button" data-text-tool="shadow">그림자</button><button type="button" data-text-tool="card">카드</button>
      </div>
      <div class="mobile-tool-panels">
        <section class="mobile-tool-panel is-active" data-text-panel="layout">${select("layout", "기본 배열", item.layout || "poster-left", [["default", "가운데형"], ["poster-left", "왼쪽 포스터형"], ["center", "중앙 오버레이형"], ["credits", "크레딧형"]])}${select("align", "정렬", item.align || "center", [["left", "왼쪽"], ["center", "가운데"], ["right", "오른쪽"]])}<div class="text-layout-editor">${range("xPercent", "좌우 이동", item.xPercent ?? 50, 10, 90)}${range("yPercent", "위아래 이동", item.yPercent ?? 76, 10, 90)}${range("widthPercent", "문구 영역 너비", item.widthPercent ?? 88, 40, 96)}</div></section>
        <section class="mobile-tool-panel" data-text-panel="text"><div class="text-layout-editor">${range("nameSize", "이름 크기", item.nameSize || 34, 20, 54)}${range("dateSize", "날짜 크기", item.dateSize || 12, 9, 18)}${range("eyebrowSize", "영문 문구 크기", item.eyebrowSize ?? 10, 6, 24)}${range("gap", "문구 사이 간격", item.gap ?? 5, 0, 30)}${range("opacity", "글자 선명도", item.opacity ?? 1, 0.2, 1, 0.05)}</div>${select("blendMode", "사진과 어우러짐", item.blendMode || "normal", [["normal", "기본"], ["screen", "밝게"], ["overlay", "선명하게"], ["soft-light", "은은하게"]])}</section>
        <section class="mobile-tool-panel" data-text-panel="shadow"><label class="consent"><input type="checkbox" name="shadow" ${item.shadow !== false ? "checked" : ""}> <span>그림자 사용</span></label><div class="text-layout-editor">${range("shadowOpacity", "그림자 진하기", item.shadowOpacity ?? (item.shadow === false ? 0 : 0.34), 0, 1, 0.05)}${range("shadowBlur", "그림자 번짐", item.shadowBlur ?? 8, 0, 30)}</div></section>
        <section class="mobile-tool-panel" data-text-panel="card"><label class="consent"><input type="checkbox" name="boxEnabled" ${item.boxEnabled ? "checked" : ""}> <span>카드 배경 사용</span></label><div class="text-layout-editor">${input("cardColor", "카드 색상", item.cardColor || "#ffffff", "color")}${range("cardOpacity", "카드 투명도", item.cardOpacity ?? 0.82, 0, 1, 0.05)}${input("cardBorderColor", "테두리 색상", item.cardBorderColor || "#ffffff", "color")}${range("cardBorderWidth", "테두리 굵기", item.cardBorderWidth ?? 0, 0, 10)}${select("cardBorderStyle", "테두리 모양", item.cardBorderStyle || "solid", [["solid", "실선"], ["dashed", "긴 점선"], ["dotted", "둥근 점선"], ["double", "이중선"]])}${range("cardRadius", "모서리 둥글기", item.cardRadius ?? 8, 0, 40)}</div></section>
      </div>
    </div>` : ""}
    ${type !== "textTheme" ? `<div class="asset-upload-row"><label class="btn image-upload">SVG/이미지 업로드<input type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg" data-asset-modal-upload></label><small>${type === "frame" ? "프레임: SVG 300KB 이하, PNG/WebP/JPG 2MB 이하 · overlay 420x670 / outer 480x720 권장" : type === "sectionIcon" ? "아이콘: SVG 300KB 이하, PNG/WebP/JPG 2MB 이하 · 512x512 권장" : "배경: SVG 300KB 이하, PNG/WebP/JPG 2MB 이하 · 1920x1080 권장"}</small></div>` : ""}
  </div>`;
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
    tintColor: form.elements.frameTintColor.value,
  });
  if (type === "textTheme") Object.assign(window.assetSourceDraft, {
    layout: form.elements.layout.value,
    align: form.elements.align.value,
    nameSize: Number(form.elements.nameSize.value) || 34,
    dateSize: Number(form.elements.dateSize.value) || 12,
    opacity: Math.max(0.2, Math.min(1, Number(form.elements.opacity.value) || 1)),
    blendMode: form.elements.blendMode.value,
    previewPosition: form.elements.previewPosition?.value || window.assetSourceDraft.previewPosition || "bottom",
    xPercent: Math.max(10, Math.min(90, Number(form.elements.xPercent.value) || 50)),
    yPercent: Math.max(10, Math.min(90, Number(form.elements.yPercent.value) || 76)),
    widthPercent: Math.max(40, Math.min(100, Number(form.elements.widthPercent.value) || 88)),
    gap: Math.max(0, Math.min(30, Number(form.elements.gap.value) || 5)),
    eyebrowSize: Math.max(6, Math.min(24, Number(form.elements.eyebrowSize.value) || 10)),
    shadow: form.elements.shadow.checked,
    shadowOpacity: Math.max(0, Math.min(1, Number(form.elements.shadowOpacity.value) || 0)),
    shadowBlur: Math.max(0, Math.min(30, Number(form.elements.shadowBlur.value) || 0)),
    boxEnabled: form.elements.boxEnabled.checked,
    cardColor: form.elements.cardColor.value,
    cardOpacity: Math.max(0, Math.min(1, Number(form.elements.cardOpacity.value) || 0)),
    cardBorderColor: form.elements.cardBorderColor.value,
    cardBorderWidth: Math.max(0, Math.min(10, Number(form.elements.cardBorderWidth.value) || 0)),
    cardBorderStyle: form.elements.cardBorderStyle.value,
    cardRadius: Math.max(0, Math.min(40, Number(form.elements.cardRadius.value) || 0)),
  });
  updateAssetModalPreview();
}

function bindAssetModal(type, assetId = "") {
  const form = document.querySelector("#asset-source-form");
  const applyTextLayoutRules = () => {
    if (type !== "textTheme") return;
    document.querySelector("[data-text-theme-live-preview]").innerHTML = textThemeSample({ ...window.assetSourceDraft, previewImage: invitationData.hero.image });
  };
  const applyFrameRules = () => {
    if (type !== "frame") return;
    document.querySelector("[data-frame-live-preview]").innerHTML = frameEditorSample(window.assetSourceDraft);
  };
  document.querySelector("[data-asset-close]").addEventListener("click", () => { document.querySelector("#asset-create-modal").innerHTML = ""; });
  form.elements.assetType.addEventListener("change", () => openAssetCreateModal(form.elements.assetType.value));
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
  document.querySelector("[data-asset-ai-send]").addEventListener("click", async () => {
    const methods = { frame: "generateFrameDecoration", textTheme: "generateHeroTextTheme", sectionIcon: "generateSectionIcon", background: "generateBackgroundDecoration" };
    const instruction = document.querySelector("[data-asset-ai-instruction]").value;
    document.querySelector("[data-asset-ai-chat]").insertAdjacentHTML("beforeend", `<p>사용자: ${escapeAdminHtml(instruction)}</p><p>AI: 요청에 맞는 미리보기를 만들었습니다.</p>`);
    renderAssetModalAIResult(type, await AI_DESIGN_SERVICE[methods[type]]({ instruction, settings: invitationData.designSystem.aiSettings }));
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
  document.querySelector("#asset-create-modal").innerHTML = `<div class="admin-modal-backdrop"><section class="admin-modal asset-create-modal">
    <div class="admin-toolbar"><h2>${assetId ? "디자인 소스 수정" : "새 디자인 소스 만들기"}</h2><button class="btn" type="button" data-asset-close>닫기</button></div>
    <form class="editor-form" id="asset-source-form">
      <div class="asset-type-tabs">${Object.entries(assetCategories).map(([value, item]) => `<button class="${value === type ? "is-active" : ""}" type="button" data-asset-type-tab="${value}">${item.label}</button>`).join("")}</div>
      <input type="hidden" name="assetType" value="${type}">
      ${input("assetName", "디자인 소스 이름", source.name || "")}
      <section class="ai-assistant"><h3>AI 디자인 어시스턴트</h3><div class="ai-chat" data-asset-ai-chat><p>AI: 원하는 ${category.label}의 분위기와 형태를 알려주세요.</p></div>
        <div class="ai-input-row"><input data-asset-ai-instruction placeholder="따뜻한 빈티지 필름 느낌으로 만들어줘"><button class="btn" type="button" data-asset-ai-send>AI로 생성</button></div><div data-asset-ai-results></div>
      </section>
      <p class="admin-message">${category.guide}</p>${assetModalFields(type, source)}
      ${type !== "textTheme" ? `<div class="asset-create-preview"><strong>현재 미리보기</strong><div data-asset-modal-preview="${type}">${assetPreview(type, source)}</div></div>` : ""}
      <button class="btn btn-primary" type="submit">${assetId ? "수정 내용 저장" : "디자인 소스 저장"}</button>
    </form>
  </section></div>`;
  bindAssetModal(type, assetId);
  document.querySelectorAll("[data-asset-type-tab]").forEach((button) => button.addEventListener("click", () => openAssetCreateModal(button.dataset.assetTypeTab)));
}

const renderDesignApplicationBase = window.renderDesignApplication;
window.renderDesignApplication = function renderDesignApplicationWithTextPreview(message = "") {
  renderDesignApplicationBase(message);
  const form = document.querySelector("#design-application-form");
  const selectField = form?.elements.heroTextTheme;
  if (!form || !selectField) return;
  const previewRoot = document.createElement("div");
  previewRoot.className = "design-text-theme-preview";
  previewRoot.innerHTML = "<strong>메인 문구 테마 미리보기</strong><div class=\"text-theme-choice-grid\" data-design-text-theme-options></div><div class=\"selected-text-theme-preview\"><span>현재 선택</span><div data-design-text-theme-preview></div></div>";
  selectField.closest(".field").insertAdjacentElement("afterend", previewRoot);
  const refresh = () => {
    const system = designData().designSystem;
    const inherited = window.WEDDING_DESIGN.resolve(invitationData).heroTextThemeAsset || { layout: "default", align: "center", nameSize: 34, dateSize: 12 };
    const selected = selectField.value === "inherit"
      ? inherited
      : system.assets.textThemes.find((item) => item.id === selectField.value);
    const position = form.elements.contentPosition.value;
    const positionLabels = { top: "상단", middle: "중앙", bottom: "하단" };
    previewRoot.querySelector(".selected-text-theme-preview > span").textContent = `현재 선택 · ${positionLabels[position] || "하단"}`;
    previewRoot.querySelector("[data-design-text-theme-preview]").innerHTML = textThemeSample({ ...(selected || {}), previewPosition: position });
    previewRoot.querySelector("[data-design-text-theme-options]").innerHTML = [
      { ...(inherited || {}), id: "inherit", name: "프리셋 기본값" },
      ...system.assets.textThemes.filter((item) => item.enabled !== false && item.id !== "default_center"),
    ].map((item) => `<button class="text-theme-choice ${selectField.value === item.id ? "is-selected" : ""}" type="button" data-text-theme-choice="${escapeAdminHtml(item.id)}">
      ${textThemeSample(item)}
      <span>${escapeAdminHtml(item.name || item.id)}</span>
    </button>`).join("");
    previewRoot.querySelectorAll("[data-text-theme-choice]").forEach((button) => button.addEventListener("click", () => {
      selectField.value = button.dataset.textThemeChoice;
      selectField.dispatchEvent(new Event("change", { bubbles: true }));
      refresh();
    }));
  };
  selectField.addEventListener("change", refresh);
  form.elements.contentPosition.addEventListener("change", refresh);
  const presetField = form.elements.presetId;
  let previousPresetId = presetField.value;
  presetField.addEventListener("change", () => {
    if (presetField.value === previousPresetId) return;
    previousPresetId = presetField.value;
    const selectedPreset = designData().designSystem.themes.find((theme) => theme.id === presetField.value);
    const usePresetDefaults = confirm("프리셋을 변경했습니다.\n\n확인: 새 프리셋의 기본 설정을 적용\n취소: 현재 커스텀 디자인 설정을 유지");
    if (!usePresetDefaults) {
      refresh();
      return;
    }
    const inheritDecoration = form.querySelector('input[name="heroDecoration"][value="inherit"]');
    if (inheritDecoration) inheritDecoration.checked = true;
    selectField.value = "inherit";
    if (selectedPreset?.type === "color") {
      form.elements.contentPosition.value = "top";
      invitationData.hero.contentPosition = "top";
    }
    invitationData.appearance.design = {
      presetId: presetField.value,
      heroDecoration: "inherit",
      heroTextTheme: "inherit",
    };
    window.WEDDING_DESIGN.apply(invitationData);
    selectField.dispatchEvent(new Event("change", { bubbles: true }));
    refresh();
  });
  refresh();
};

const renderThemeManagerBase = window.renderThemeManager;
window.renderThemeManager = function renderThemeManagerWithFixedColorDefaults(message = "", filter = "all") {
  renderThemeManagerBase(message, filter);
  const form = document.querySelector("#color-default-form");
  if (!form) return;
  form.querySelectorAll("select, button").forEach((field) => { field.disabled = true; });
  form.insertAdjacentHTML("beforebegin", '<p class="admin-message">컬러테마 공통 디자인은 메인 이미지 꾸밈 없음, 메인 문구 기본형(가운데 정렬)을 사용합니다. 일반관리자는 프리셋 기본값에서 문구 위치를 상단, 중앙, 하단으로 선택할 수 있습니다.</p>');
};
