(function () {
  const palette = (background, card, ink, muted, accent, line) => ({ background, card, ink, muted, accent, line });
  const builtInThemes = [
    { id: "beige", name: "베이지", type: "color", enabled: true, palette: palette("#f8f5f1", "#fffdfb", "#453d38", "#83766e", "#a88270", "rgba(148,117,101,0.2)") },
    { id: "sky", name: "하늘색", type: "color", enabled: true, palette: palette("#f7fbfd", "#fdfeff", "#46555d", "#7f929b", "#83adbf", "rgba(131,173,191,0.2)") },
    { id: "pink", name: "핑크", type: "color", enabled: true, palette: palette("#fff8fa", "#fffdfd", "#594a50", "#947d86", "#bd879a", "rgba(189,135,154,0.2)") },
    { id: "gray", name: "연한 회색", type: "color", enabled: true, palette: palette("#f7f8f9", "#ffffff", "#4d5358", "#858d93", "#929da4", "rgba(130,140,147,0.2)") },
    { id: "black", name: "블랙", type: "color", enabled: true, palette: palette("#202529", "#2a3035", "#f1f4f5", "#b2bec4", "#a6b9c2", "rgba(203,216,222,0.2)") },
    { id: "white", name: "화이트", type: "color", enabled: true, palette: palette("#ffffff", "#ffffff", "#454b50", "#848b90", "#92999e", "rgba(120,128,133,0.18)") },
    { id: "green", name: "그린", type: "color", enabled: true, palette: palette("#f6f9f4", "#fcfdfb", "#424f40", "#778574", "#5b7853", "rgba(91,120,83,0.2)") },
    { id: "about_time", name: "어바웃타임", type: "movie", concept: "어바웃타임", mood: "따뜻하고 빈티지한 필름 무드", enabled: true, heroDecoration: "doodle_hearts", heroTextTheme: "editorial_left", palette: palette("#f7f0e7", "#fffaf4", "#463a34", "#88776e", "#8d3440", "rgba(125,38,51,0.2)") },
    { id: "la_la_land", name: "라라랜드", type: "movie", concept: "라라랜드", mood: "밤하늘과 골드 포인트의 시네마 무드", enabled: true, heroDecoration: "poster_card", heroTextTheme: "editorial_left", palette: palette("#faf4e8", "#fffaf0", "#27305a", "#6f7190", "#62478e", "rgba(64,57,116,0.18)") },
    { id: "spirited_away", name: "센과 치히로 무드", type: "movie", concept: "숲과 바람", mood: "차분한 자연과 동화 같은 무드", enabled: true, heroDecoration: "organic_heart", heroTextTheme: "minimal_center", palette: palette("#f4f0df", "#fbf7ea", "#37463f", "#718076", "#56725d", "rgba(86,114,93,0.18)") },
    { id: "you_are_the_apple", name: "그 시절, 우리가 좋아했던 소녀 무드", type: "movie", concept: "청춘 영화", mood: "밝고 담백한 필름 무드", enabled: true, heroDecoration: "wedding_rings", heroTextTheme: "editorial_left", palette: palette("#f7f3e8", "#fffaf0", "#3e5267", "#7d8d98", "#537c91", "rgba(83,124,145,0.18)") },
  ];
  const builtInAssets = {
    frames: [
      { id: "none", name: "꾸밈 없음", mode: "overlay" },
      { id: "doodle_hearts", name: "손그림 하트 낙서", mode: "overlay" },
      { id: "organic_heart", name: "유기적 하트 프레임", mode: "overlay" },
      { id: "wedding_rings", name: "웨딩 링 리본", mode: "overlay" },
      { id: "poster_card", name: "포스터 카드", mode: "outer" },
    ],
    textThemes: [
      { id: "default_center", name: "기본형 (가운데 정렬)", layout: "default", align: "center", shadow: true, boxEnabled: false, nameSize: 34, dateSize: 12 },
      { id: "editorial_left", name: "포스터 좌측형", layout: "poster-left", align: "left", shadow: true, boxEnabled: false, nameSize: 46, dateSize: 13 },
      { id: "minimal_center", name: "중앙 오버레이형", layout: "center", align: "center", shadow: false, boxEnabled: false, opacity: 0.82, blendMode: "screen", nameSize: 35, dateSize: 12 },
    ],
    sectionIcons: [],
    backgrounds: [],
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const legacyTextThemeIds = ["auto", "classic", "caption_card"];
  const migrateTextThemeId = (id) => id === "auto" ? "default_center" : (["classic", "caption_card"].includes(id) ? "editorial_left" : id);
  const mergeUnique = (defaults, saved = []) => [...defaults.map((item) => ({ ...item, ...(saved.find((savedItem) => savedItem.id === item.id) || {}) })), ...saved.filter((item) => !defaults.some((fallback) => fallback.id === item.id))];
  const themePresetId = (appearance = {}) => appearance.movieConcept && appearance.movieConcept !== "none" ? appearance.movieConcept : (appearance.theme || "sky");

  function normalize(data = {}) {
    data.appearance ||= {};
    data.designSystem ||= {};
    const system = data.designSystem;
    system.deletedThemeIds = Array.isArray(system.deletedThemeIds) ? system.deletedThemeIds : [];
    system.deletedAssetIds = Array.isArray(system.deletedAssetIds) ? system.deletedAssetIds : [];
    system.themes = mergeUnique(clone(builtInThemes), Array.isArray(system.themes) ? system.themes : [])
      .filter((theme) => !system.deletedThemeIds.includes(theme.id));
    system.themes.forEach((theme) => { theme.heroTextTheme = migrateTextThemeId(theme.heroTextTheme); });
    system.assets ||= {};
    Object.keys(builtInAssets).forEach((key) => {
      system.assets[key] = mergeUnique(clone(builtInAssets[key]), Array.isArray(system.assets[key]) ? system.assets[key] : [])
        .filter((asset) => !system.deletedAssetIds.includes(asset.id));
    });
    system.assets.textThemes = system.assets.textThemes.filter((asset) => !legacyTextThemeIds.includes(asset.id));
    // Color presets always use the neutral invitation defaults. Movie presets
    // may still provide their own frame and text layout.
    system.colorDefaults = { heroDecoration: "none", heroTextTheme: "default_center", ...(system.colorDefaults || {}) };
    system.aiSettings = { enabled: true, mockMode: true, provider: "OpenAI", model: "server-managed", endpoint: "/api/ai-design", removeWhiteBackground: true, whiteTolerance: 24, convertSvg: false, savePng: true, ...(system.aiSettings || {}) };
    system.aiLibrary = Array.isArray(system.aiLibrary) ? system.aiLibrary : [];
    const legacyCustom = !data.appearance.design && ((data.appearance.heroDecoration && data.appearance.heroDecoration !== "none") || (data.appearance.heroTextTheme && data.appearance.heroTextTheme !== "auto"));
    const previousDesign = data.appearance.design;
    data.appearance.design = {
      presetId: themePresetId(data.appearance),
      ...(previousDesign || {}),
      heroDecoration: previousDesign
        ? (previousDesign.customEnabled === false ? "inherit" : previousDesign.heroDecoration || "inherit")
        : (legacyCustom ? data.appearance.heroDecoration : "inherit"),
      heroTextTheme: previousDesign
        ? (previousDesign.customEnabled === false ? "inherit" : previousDesign.heroTextTheme || "inherit")
        : (legacyCustom ? data.appearance.heroTextTheme : "inherit"),
    };
    data.appearance.design.heroTextTheme = migrateTextThemeId(data.appearance.design.heroTextTheme);
    delete data.appearance.design.customEnabled;
    data.accounts = Array.isArray(data.accounts) ? data.accounts.map((account) => ({ ...account, relation: account.relation || "" })) : [];
    data.galleryDisplayMode = data.galleryDisplayMode === "original" ? "original" : "portrait";
    data.guestPhotos = { eventDate: "2026-10-04", previewVisible: true, uploadSlug: "wedding-day", ...(data.guestPhotos || {}) };
    const sectionTitles = {
      invitation: { en: "Invitation", ko: "" },
      aboutUs: { en: "About Us", ko: "저희를 소개합니다" },
      weddingDay: { en: "Wedding Day", ko: "" },
      location: { en: "Location", ko: "오시는 길" },
      gallery: { en: "Gallery", ko: "갤러리" },
      information: { en: "Information", ko: "식장 안내" },
      attendance: { en: "Rsvp", ko: "참석 의사 전달" },
      weddingSnap: { en: "Guest Album", ko: "예쁘게 빛난 순간, 같이 공유해요!" },
      account: { en: "Account", ko: "마음 전하는 곳" },
      guestbook: { en: "Guestbook", ko: "축하 메시지" },
    };
    data.sectionTitles = Object.fromEntries(Object.entries(sectionTitles).map(([key, value]) => [key, { ...value, ...(data.sectionTitles?.[key] || {}) }]));
    return data;
  }

  function resolve(data = {}) {
    normalize(data);
    const design = data.appearance.design;
    const theme = data.designSystem.themes.find((item) => item.id === design.presetId && item.enabled !== false)
      || data.designSystem.themes.find((item) => item.id === "sky");
    const base = theme.type === "movie"
      ? { heroDecoration: theme.heroDecoration || "none", heroTextTheme: migrateTextThemeId(theme.heroTextTheme || "default_center") }
      : { heroDecoration: data.designSystem.colorDefaults.heroDecoration || "none", heroTextTheme: migrateTextThemeId(data.designSystem.colorDefaults.heroTextTheme || "default_center") };
    const heroDecoration = design.heroDecoration && design.heroDecoration !== "inherit" ? design.heroDecoration : base.heroDecoration;
    const heroTextTheme = design.heroTextTheme && design.heroTextTheme !== "inherit" ? design.heroTextTheme : base.heroTextTheme;
    return {
      theme,
      palette: theme.palette || {},
      heroDecoration,
      heroTextTheme,
      heroDecorationAsset: (() => {
        const asset = data.designSystem.assets.frames.find((item) => item.id === heroDecoration);
        return asset ? { ...asset, tintColor: design.heroDecorationTint || asset.tintColor || "#ffffff" } : asset;
      })(),
      heroTextThemeAsset: data.designSystem.assets.textThemes.find((item) => item.id === heroTextTheme),
      sectionIcon: theme.type === "movie" ? theme.sectionIcon || "" : "",
      backgroundDecoration: theme.type === "movie" ? theme.backgroundDecoration || "" : "",
    };
  }

  function apply(data = {}) {
    const resolved = resolve(data);
    const root = document.body;
    const isSuperAdmin = root.dataset.adminArea === "super";
    const adminPalette = builtInThemes.find((item) => item.id === "white").palette;
    const appliedPalette = isSuperAdmin ? adminPalette : resolved.palette;
    root.dataset.theme = isSuperAdmin ? "white" : (resolved.theme.type === "color" && builtInThemes.some((item) => item.id === resolved.theme.id) ? resolved.theme.id : "sky");
    root.dataset.movieConcept = isSuperAdmin ? "none" : (resolved.theme.type === "movie" ? resolved.theme.id : "none");
    root.dataset.heroDecoration = resolved.heroDecoration || "none";
    root.dataset.heroTextTheme = resolved.heroTextTheme || "auto";
    root.dataset.heroTextLayout = resolved.heroTextThemeAsset?.layout || "default";
    root.classList?.toggle("has-custom-hero-decoration", Boolean(resolved.heroDecorationAsset?.url));
    root.classList?.toggle("custom-decoration-outer", resolved.heroDecorationAsset?.mode === "outer");
    root.classList?.toggle("has-custom-hero-text-theme", Boolean(resolved.heroTextThemeAsset && !builtInAssets.textThemes.some((item) => item.id === resolved.heroTextThemeAsset.id)));
    root.classList?.toggle("custom-hero-no-shadow", resolved.heroTextThemeAsset?.shadow === false);
    root.classList?.toggle("custom-hero-box", Boolean(resolved.heroTextThemeAsset?.boxEnabled));
    root.classList?.toggle("hide-hero-eyebrow", data.appearance.design.heroEyebrowEnabled === false);
    root.classList?.toggle("hide-hero-names", data.appearance.design.heroNamesEnabled === false);
    root.classList?.toggle("hide-hero-date", data.appearance.design.heroDateEnabled === false);
    root.classList?.toggle("custom-hero-positioned", Number.isFinite(Number(resolved.heroTextThemeAsset?.xPercent)) && Number.isFinite(Number(resolved.heroTextThemeAsset?.yPercent)));
    root.classList?.toggle("has-custom-background-decoration", Boolean(resolved.backgroundDecoration));
    const vars = { background: ["--paper", "--body-bg"], card: ["--card"], ink: ["--ink"], muted: ["--muted"], accent: ["--accent", "--accent-dark"], line: ["--line"] };
    Object.entries(vars).forEach(([key, cssVars]) => appliedPalette[key] && cssVars.forEach((cssVar) => root.style.setProperty(cssVar, appliedPalette[key])));
    root.style.setProperty("--design-background-decoration", resolved.backgroundDecoration ? `url("${resolved.backgroundDecoration}")` : "none");
    root.style.setProperty("--design-section-icon", resolved.sectionIcon ? `url("${resolved.sectionIcon}")` : "var(--section-divider)");
    root.style.setProperty("--custom-hero-decoration", resolved.heroDecorationAsset?.url ? `url("${resolved.heroDecorationAsset.url}")` : "none");
    root.style.setProperty("--custom-decoration-opacity", String(resolved.heroDecorationAsset?.opacity ?? 1));
    root.style.setProperty("--custom-decoration-blend-mode", resolved.heroDecorationAsset?.blendMode || "normal");
    root.style.setProperty("--custom-decoration-position", `${resolved.heroDecorationAsset?.xPercent ?? 50}% ${resolved.heroDecorationAsset?.yPercent ?? 50}%`);
    root.style.setProperty("--custom-decoration-size", `${resolved.heroDecorationAsset?.sizePercent ?? 100}% auto`);
    root.style.setProperty("--custom-decoration-tint", resolved.heroDecorationAsset?.tintColor || "transparent");
    root.style.setProperty("--custom-outer-scale", String(Math.max(0.2, Math.min(1.4, Number(resolved.heroDecorationAsset?.sizePercent ?? 100) / 100))));
    root.style.setProperty("--custom-hero-align", resolved.heroTextThemeAsset?.align || "center");
    root.style.setProperty("--custom-hero-name-size", `${resolved.heroTextThemeAsset?.nameSize || 34}px`);
    root.style.setProperty("--custom-hero-date-size", `${resolved.heroTextThemeAsset?.dateSize || 12}px`);
    root.style.setProperty("--custom-hero-opacity", String(resolved.heroTextThemeAsset?.opacity ?? 1));
    root.style.setProperty("--custom-hero-blend-mode", resolved.heroTextThemeAsset?.blendMode || "normal");
    root.style.setProperty("--custom-hero-x", `${resolved.heroTextThemeAsset?.xPercent ?? 50}%`);
    root.style.setProperty("--custom-hero-y", `${resolved.heroTextThemeAsset?.yPercent ?? 76}%`);
    root.style.setProperty("--custom-hero-width", `${resolved.heroTextThemeAsset?.widthPercent ?? 88}%`);
    root.style.setProperty("--custom-hero-gap", `${resolved.heroTextThemeAsset?.gap ?? 5}px`);
    root.style.setProperty("--custom-hero-eyebrow-name-gap", `${resolved.heroTextThemeAsset?.eyebrowNameGap ?? resolved.heroTextThemeAsset?.gap ?? 5}px`);
    root.style.setProperty("--custom-hero-name-date-gap", `${resolved.heroTextThemeAsset?.nameDateGap ?? resolved.heroTextThemeAsset?.gap ?? 5}px`);
    root.style.setProperty("--custom-hero-eyebrow-size", `${resolved.heroTextThemeAsset?.eyebrowSize ?? 10}px`);
    root.style.setProperty("--custom-hero-shadow-opacity", String(resolved.heroTextThemeAsset?.shadowOpacity ?? (resolved.heroTextThemeAsset?.shadow === false ? 0 : 0.34)));
    root.style.setProperty("--custom-hero-shadow-blur", `${resolved.heroTextThemeAsset?.shadowBlur ?? 8}px`);
    root.style.setProperty("--custom-hero-card-color", resolved.heroTextThemeAsset?.cardColor || "#ffffff");
    root.style.setProperty("--custom-hero-card-opacity", String(resolved.heroTextThemeAsset?.cardBackgroundEnabled === false ? 0 : resolved.heroTextThemeAsset?.cardOpacity ?? 0.82));
    root.style.setProperty("--custom-hero-card-border-color", resolved.heroTextThemeAsset?.cardBorderColor || "#ffffff");
    root.style.setProperty("--custom-hero-card-border-width", `${resolved.heroTextThemeAsset?.cardBorderEnabled === false ? 0 : resolved.heroTextThemeAsset?.cardBorderWidth ?? 0}px`);
    root.style.setProperty("--custom-hero-card-border-style", resolved.heroTextThemeAsset?.cardBorderStyle || "solid");
    root.style.setProperty("--custom-hero-card-radius", `${resolved.heroTextThemeAsset?.cardRadius ?? 8}px`);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getComputedStyle(root).getPropertyValue("--body-bg").trim());
    return resolved;
  }

  window.WEDDING_DESIGN = { builtInThemes, builtInAssets, normalize, resolve, apply };
})();
