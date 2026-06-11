(function () {
  const palettes = [
    { side: "#fbf7ee", background: "#f7f0e7", card: "#fffaf4", ink: "#463a34", muted: "#88776e", accent: "#8d3440", label: "#6c8baf", button: "#fff4df", line: "#d8c8bd" },
    { side: "#faf5ef", background: "#f3eee5", card: "#fffdf8", ink: "#4f443d", muted: "#8b7b71", accent: "#a46f5b", label: "#8d7568", button: "#f7eadf", line: "#dcc7bc" },
    { side: "#faf8ea", background: "#f4f0df", card: "#fbf7ea", ink: "#37463f", muted: "#718076", accent: "#56725d", label: "#647b6b", button: "#edf1df", line: "#d4d8c5" },
  ];
  const choose = (items, seed = "") => items[Math.abs([...seed].reduce((sum, char) => sum + char.charCodeAt(0), Date.now())) % items.length];
  const svgDataUrl = (svg) => `data:image/svg+xml;base64,${btoa(svg)}`;
  const ASSET_IMAGE_SVG = {
    frame: {
      overlay: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 670"><g fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M50 60c-9-13 9-23 17-11c4-9 21-5 15 8c-4 9-21 17-32 3z"/><path d="M362 76c8-12-7-21-15-9c-4-9-19-4-13 7c4 9 19 13 28 2z"/><path d="M46 596c-8-12 9-21 15-9c2-9 19-5 13 6c-4 9-19 13-28 3z"/><path d="M372 610c9-9-6-21-13-11c-2-9-17-5-13 5c2 9 17 13 26 6z"/><path d="M34 330c19-6 32 8 25 25"/><path d="M386 348c-19-6-32 8-25 25"/></g></svg>',
      outer: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 670"><rect x="14" y="14" width="392" height="642" rx="26" fill="none" stroke="#ffffff" stroke-width="16"/><rect x="38" y="38" width="344" height="594" rx="14" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="8 10"/></svg>',
    },
    sectionIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g fill="none" stroke="#8d3440" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><path d="M256 100c38 60 112 76 150 76c-22 54-22 136 0 190c-38 0-112 16-150 76c-38-60-112-76-150-76c22-54 22-136 0-190c38 0 112-16 150-76z"/></g></svg>',
    background: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><g fill="none" stroke="#d8c8bd" stroke-width="2" opacity="0.6"><circle cx="220" cy="220" r="140"/><circle cx="1680" cy="240" r="180"/><circle cx="960" cy="900" r="240"/><path d="M0 540h1920" stroke-dasharray="6 18"/></g></svg>',
  };
  const settings = (context = {}) => ({ ...(window.WEDDING_AI_SETTINGS?.() || {}), ...(context.settings || {}) });
  const isLocalPage = () => ["localhost", "127.0.0.1", ""].includes(window.location.hostname) || window.location.protocol === "file:";
  const configuredEndpoint = () => window.RSVP_CONFIG?.aiEndpoint || "/api/ai-design";
  const normalizeEndpoint = (endpoint = "") => {
    const value = String(endpoint || "").trim();
    const fallback = isLocalPage() ? configuredEndpoint() : "/api/ai-design";
    if (!value || value === "undefined" || value === "null") return fallback;
    if (/^https?:\/\/localhost(?::\d+)?\/api\/ai-design/i.test(value)) return fallback;
    if (/^https?:\/\/127\.0\.0\.1(?::\d+)?\/api\/ai-design/i.test(value)) return fallback;
    try {
      const url = new URL(value, window.location.origin);
      if (url.pathname === "/api/ai-design") {
        if (url.origin !== window.location.origin) return url.href;
        return isLocalPage() ? configuredEndpoint() : `/api/ai-design${url.search}`;
      }
    } catch {}
    return fallback;
  };
  const storedAccessToken = () => {
    try {
      const projectRef = new URL(window.RSVP_CONFIG?.supabaseUrl || "").hostname.split(".")[0];
      const keys = projectRef ? [`sb-${projectRef}-auth-token`] : [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith("sb-") && key.endsWith("-auth-token") && !keys.includes(key)) keys.push(key);
      }
      for (const key of keys) {
        const session = JSON.parse(localStorage.getItem(key) || "null");
        const token = session?.access_token || session?.currentSession?.access_token;
        if (token) return token;
      }
    } catch {}
    return "";
  };
  const authHeaders = async () => {
    const client = window.RSVP_STORAGE?.getSupabaseClient?.();
    try {
      const { data } = client ? await client.auth.getSession() : { data: {} };
      if (data.session?.access_token) return { Authorization: `Bearer ${data.session.access_token}` };
    } catch {}
    const token = storedAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const request = async (type, context, mock) => {
    const current = settings(context);
    if (current.mockMode !== false) return mock();
    const promptSettings = { prompts: current.prompts || {}, referenceImages: current.referenceImages || "" };
    const endpoint = normalizeEndpoint(current.endpoint);
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ type, provider: current.provider || "OpenAI", context: { ...context, settings: promptSettings } }),
      });
    } catch (error) {
      throw new Error(`AI 서버에 연결하지 못했습니다. 현재 요청 주소: ${endpoint}. 배포 사이트에서는 /api/ai-design, 로컬 테스트에서는 ${configuredEndpoint()} 를 사용해야 합니다. (${error.message || "Failed to fetch"})`);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok && /혼잡|high demand|overloaded|temporarily|일시/i.test(payload.error || "")) {
      return { ...mock(), fallbackReason: payload.error || "AI 서버가 일시적으로 혼잡해 임시 결과를 사용했습니다." };
    }
    if (!response.ok) throw new Error(payload.error || "AI 서버 호출에 실패했습니다.");
    return { ...payload, id: payload.id || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, createdAt: payload.createdAt || new Date().toISOString() };
  };
  const result = (type, context = {}, extras = {}) => ({
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type, name: context.name || context.concept || `AI ${type}`,
    createdAt: new Date().toISOString(), prompt: window.AI_PROMPTS.compose(type === "movie" ? "movie" : type),
    instruction: context.instruction || context.mood || "", ...extras,
  });
  const recommendMovieTheme = async (context = {}) => request("movie", context, () => result("movie", context, {
    palette: choose(palettes, `${context.concept}${context.mood}`), heroDecoration: choose(["doodle_hearts", "organic_heart", "poster_card"], context.mood),
    heroTextTheme: choose(["editorial_left", "minimal_center"], context.concept), sectionIconDirection: "작은 별과 필름 라인의 2색 아이콘",
    backgroundDirection: "저채도 종이 질감과 은은한 빛 번짐", fontDirection: "명조 계열의 영화 포스터 같은 큰 이름 글자", fontId: "noto-serif-kr", fontFamily: "Noto Serif KR", fontLicense: "SIL Open Font License", galleryFrameDirection: "얇은 필름 테두리", buttonShapeDirection: "둥근 캡슐형 버튼",
  }));
  const recommendColorPalette = async (context = {}) => request("palette", context, () => result("palette", context, { palette: choose(palettes, context.instruction) }));
  const generateFrameDecoration = async (context = {}) => request("frame", context, () => result("frame", context, { heroDecoration: choose(["doodle_hearts", "organic_heart", "wedding_rings", "poster_card"], context.instruction), postprocess: window.AI_POSTPROCESS.describe(context.settings) }));
  const generateHeroTextTheme = async (context = {}) => request("textTheme", context, () => result("textTheme", context, { heroTextTheme: choose(["editorial_left", "minimal_center"], context.instruction), fontDirection: "상업적 무료 명조 계열 폰트", fontId: "noto-serif-kr", fontFamily: "Noto Serif KR", fontLicense: "SIL Open Font License", layout: { position: "poster-left", align: "left", shadow: true, boxEnabled: false, nameSize: 34, dateSize: 12 } }));
  const generateSectionIcon = async (context = {}) => request("sectionIcon", context, () => result("sectionIcon", context, { direction: "단색 또는 2색의 단순한 꽃과 별 조합", postprocess: window.AI_POSTPROCESS.describe(context.settings) }));
  const generateBackgroundDecoration = async (context = {}) => request("background", context, () => result("background", context, { direction: "본문 바깥에 머무르는 저채도 장식", postprocess: window.AI_POSTPROCESS.describe(context.settings) }));
  const generateAssetImage = async (context = {}) => request("assetImage", context, () => {
    const mode = context.mode === "outer" ? "outer" : "overlay";
    const svg = context.assetType === "frame" ? ASSET_IMAGE_SVG.frame[mode] : ASSET_IMAGE_SVG[context.assetType] || ASSET_IMAGE_SVG.sectionIcon;
    return result("assetImage", context, { imageDataUrl: svgDataUrl(svg), direction: context.instruction || "AI 이미지 생성" });
  });
  const generateTransportGuide = async (context = {}) => request("transportGuide", context, () => ({
    ...result("transportGuide", context),
    items: [
      { title: "가까운 역에서 오시는 길", text: `${context.venue || "예식장"} 인근 주요 역에서 택시 또는 대중교통 이용을 권장합니다. 정확한 노선은 예식 전 다시 확인해 주세요.` },
      { title: "가까운 정류장에서 오시는 길", text: "가장 가까운 버스정류장에서 하차 후 도보 이동 시간을 확인해 안내해 주세요. 도보 20분 이상이면 차량 이동을 권장합니다." },
    ],
    caution: "Mock Mode 결과입니다.",
  }));
  const generateVenueGuide = async (context = {}) => request("venueGuide", context, () => ({
    ...result("venueGuide", context),
    notices: [
      { title: "주차 안내", text: "주차 가능 여부와 등록 위치를 식장에 확인 후 안내해 주세요." },
      { title: "식사 안내", text: "연회장 위치와 식사 시간을 확인 후 하객에게 안내해 주세요." },
      { title: "홀 안내", text: `${context.hall || "예식홀"} 위치는 식장 안내 표지 또는 로비 안내 데스크를 확인해 주세요.` },
    ],
    caution: "Mock Mode 결과입니다.",
  }));
  const searchBasedPalette = async (context = {}) => request("imageSearch", context, () => ({
    ...result("movie", context, {
      palette: choose(palettes, `${context.concept || ""}${context.instruction || ""}`),
      heroDecoration: choose(["doodle_hearts", "organic_heart", "poster_card"], context.instruction),
      heroTextTheme: choose(["editorial_left", "minimal_center"], context.concept),
      sectionIconDirection: "작은 별과 필름 라인의 2색 아이콘",
      backgroundDirection: "저채도 종이 질감과 은은한 빛 번짐",
      fontDirection: "명조 계열의 영화 포스터 같은 큰 이름 글자", fontId: "noto-serif-kr", fontFamily: "Noto Serif KR", fontLicense: "SIL Open Font License",
      galleryFrameDirection: "얇은 필름 테두리", buttonShapeDirection: "둥근 캡슐형 버튼",
    }),
    type: "imageSearch",
    imageUrls: [],
    searchConfigured: false,
  }));
  const generateLayoutTemplate = async (context = {}) => request("layout", context, () => result("layout", context, {
    name: context.instruction ? `${context.instruction.slice(0, 4)} 레이아웃` : "AI 레이아웃",
    description: context.instruction ? `${context.instruction} 무드의 청첩장 레이아웃` : "AI가 제안하는 새 레이아웃 구성입니다.",
    previewBg: "#f5f0ea",
    previewAccent: "#8d3440",
    baseLayout: "classic",
    concept: "세로 스크롤 기반 카드형 레이아웃",
  }));
  const regenerateAIResult = async (previous = {}, userInstruction = "") => {
    const instruction = userInstruction || previous.instruction || previous.concept || previous.prompt || "";
    const context = { ...previous, instruction, concept: instruction };
    if (previous.type === "movie") return recommendMovieTheme(context);
    if (previous.type === "frame") return generateFrameDecoration(context);
    if (previous.type === "textTheme") return generateHeroTextTheme(context);
    if (previous.type === "sectionIcon") return generateSectionIcon(context);
    if (previous.type === "background") return generateBackgroundDecoration(context);
    if (previous.type === "imageSearch") return searchBasedPalette(context);
    return recommendColorPalette(context);
  };
  const testAIConnection = async (settings = {}) => {
    if (settings.mockMode !== false) return { ok: Boolean(settings.enabled), mockMode: true, message: "Mock Mode 연결이 정상입니다." };
    const endpoint = normalizeEndpoint(settings.endpoint);
    const separator = endpoint.includes("?") ? "&" : "?";
    let response;
    try {
      response = await fetch(`${endpoint}${separator}provider=${encodeURIComponent(settings.provider || "OpenAI")}`, { headers: await authHeaders() });
    } catch (error) {
      return { ok: false, mockMode: false, message: `AI 서버에 연결하지 못했습니다. 현재 요청 주소: ${endpoint}. 배포 사이트에서는 /api/ai-design, 로컬 테스트에서는 ${configuredEndpoint()} 를 사용해야 합니다. (${error.message || "Failed to fetch"})` };
    }
    const payload = await response.json().catch(() => ({}));
    const providerName = settings.provider === "Gemini" ? "Gemini" : "OpenAI";
    return { ok: response.ok && payload.configured, mockMode: false, message: response.ok && payload.configured ? `${providerName} 서버 연결이 정상입니다.` : (payload.error || "서버 환경변수를 확인해 주세요.") };
  };
  window.AI_DESIGN_SERVICE = { recommendColorPalette, recommendMovieTheme, searchBasedPalette, generateFrameDecoration, generateHeroTextTheme, generateSectionIcon, generateBackgroundDecoration, generateAssetImage, generateTransportGuide, generateVenueGuide, generateLayoutTemplate, regenerateAIResult, testAIConnection };
})();
