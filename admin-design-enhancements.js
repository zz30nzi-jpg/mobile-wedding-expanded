// Static HTML/JS enhancements for the super-admin design asset library.
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

async function requestDesignAI(type, context = {}) {
  const settings = invitationData.designSystem.aiSettings || {};
  const client = window.RSVP_STORAGE?.getSupabaseClient?.();
  const session = client ? (await client.auth.getSession()).data.session : null;
  const response = await fetch(settings.endpoint || "/api/ai-design", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      provider: settings.provider || "OpenAI",
      type,
      context: { ...context, settings },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "AI 생성에 실패했습니다.");
  return payload;
}

function dataUrlToFile(dataUrl, name = "ai-design.png") {
  const [meta, data] = String(dataUrl || "").split(",");
  const mime = meta.match(/data:([^;]+)/)?.[1] || "image/png";
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name, { type: mime });
}

if (typeof window.rememberAIResult !== "function") {
  window.rememberAIResult = function rememberAIResultFallback(result = {}) {
    designData().designSystem.aiLibrary ||= [];
    designData().designSystem.aiLibrary.unshift({ ...result, id: result.id || `ai-${Date.now()}`, createdAt: result.createdAt || new Date().toISOString() });
  };
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

function aiSlug(value = "ai") {
  return String(value || "ai").trim().toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "ai";
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
      id: frameId,
      name: result.frameName || `${result.name || "영화"} 메인 이미지 꾸밈`,
      mode: result.frameMode === "outer" ? "outer" : "overlay",
      heroDecoration: frameId,
      direction: result.frameDirection || result.heroDecoration || "영화 무드에 맞춘 신규 메인 이미지 꾸밈",
      opacity: result.frameMode === "outer" ? 1 : 0.82,
      sizePercent: result.frameMode === "outer" ? 112 : 92,
      xPercent: 50,
      yPercent: 50,
      tintColor: result.palette?.accent || "#ffffff",
      enabled: true,
    });
  }
  if (!system.assets.textThemes.some((item) => item.id === textId)) {
    system.assets.textThemes.push({
      id: textId,
      name: result.textThemeName || `${result.name || "영화"} 메인 문구 테마`,
      layout: ["default", "poster-left", "center", "credits"].includes(result.textThemeLayout) ? result.textThemeLayout : "poster-left",
      heroTextTheme: textId,
      fontId: result.fontId || "noto-serif-kr",
      align: "center",
      shadow: true,
      boxEnabled: false,
      nameSize: 34,
      dateSize: 12,
      direction: result.fontDirection || "영화 무드에 맞춘 신규 메인 문구 테마",
      enabled: true,
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
    heroDecoration: refs.heroDecoration,
    heroTextTheme: refs.heroTextTheme,
    fontDirection: result.fontDirection || target.fontDirection || "",
    galleryFrameDirection: result.galleryFrameDirection || target.galleryFrameDirection || "",
    buttonShapeDirection: result.buttonShapeDirection || target.buttonShapeDirection || "",
  });
}

if (typeof window.rememberAIResult === "function") {
  const baseRememberAIResult = window.rememberAIResult;
  window.rememberAIResult = function rememberAIResultWithLatest(result) {
    if (result?.palette) {
      window.latestAIThemeResult = result;
      window.latestThemeAIResult = result;
    }
    return baseRememberAIResult(result);
  };
}

if (typeof window.saveDesignData === "function") {
  const baseSaveDesignData = window.saveDesignData;
  window.saveDesignData = async function saveDesignDataWithMovieAssets(message, rerender) {
    applyPendingMovieThemeAssetsBeforeSave();
    return baseSaveDesignData(message, rerender);
  };
}

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
      <div data-frame-live-preview>${frameEditorSample(item)}</div>
      <h3 class="mobile-tool-title">꾸밈 배치</h3>
      ${select("assetMode", "적용 방식", item.mode || "overlay", [["overlay", "사진 위에 겹치기"], ["outer", "사진 바깥쪽 꾸미기"]])}
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
            () => requestDesignAI("assetImage", {
              instruction,
              assetType: type,
              mode,
              fonts: designData().designSystem.assets.fonts || [],
            }),
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

const renderDesignApplicationBase = window.renderDesignApplication;
window.renderDesignApplication = function renderDesignApplicationWithTextPreview(message = "") {
  renderDesignApplicationBase(message);
  const form = document.querySelector("#design-application-form");
  if (!form) return;
  const selectField = form.elements.heroTextTheme;
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
    selectField.value = "inherit";
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
    selectField.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const renderThemeManagerBase = window.renderThemeManager;
window.renderThemeManager = function renderThemeManagerWithFixedColorDefaults(message = "", filter = "all") {
  renderThemeManagerBase(message, filter);
};
