(function () {
  const palettes = [
    { background: "#f7f0e7", card: "#fffaf4", ink: "#463a34", muted: "#88776e", accent: "#8d3440", line: "rgba(125,38,51,0.2)" },
    { background: "#f3eee5", card: "#fffdf8", ink: "#4f443d", muted: "#8b7b71", accent: "#a46f5b", line: "rgba(164,111,91,0.22)" },
    { background: "#f4f0df", card: "#fbf7ea", ink: "#37463f", muted: "#718076", accent: "#56725d", line: "rgba(86,114,93,0.18)" },
  ];
  const choose = (items, seed = "") => items[Math.abs([...seed].reduce((sum, char) => sum + char.charCodeAt(0), Date.now())) % items.length];
  const settings = (context = {}) => ({ ...(window.WEDDING_AI_SETTINGS?.() || {}), ...(context.settings || {}) });
  const authHeaders = async () => {
    const client = window.RSVP_STORAGE?.getSupabaseClient?.();
    const { data } = client ? await client.auth.getSession() : { data: {} };
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  };
  const request = async (type, context, mock) => {
    const current = settings(context);
    if (current.mockMode !== false) return mock();
    const response = await fetch(current.endpoint || "/api/ai-design", {
      method: "POST", headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ type, provider: current.provider || "OpenAI", context: { ...context, settings: undefined } }),
    });
    const payload = await response.json();
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
    backgroundDirection: "저채도 종이 질감과 은은한 빛 번짐",
  }));
  const recommendColorPalette = async (context = {}) => request("palette", context, () => result("palette", context, { palette: choose(palettes, context.instruction) }));
  const generateFrameDecoration = async (context = {}) => request("frame", context, () => result("frame", context, { heroDecoration: choose(["doodle_hearts", "organic_heart", "wedding_rings", "poster_card"], context.instruction), postprocess: window.AI_POSTPROCESS.describe(context.settings) }));
  const generateHeroTextTheme = async (context = {}) => request("textTheme", context, () => result("textTheme", context, { heroTextTheme: choose(["editorial_left", "minimal_center"], context.instruction), layout: { position: "poster-left", align: "left", shadow: true, boxEnabled: false, nameSize: 34, dateSize: 12 } }));
  const generateSectionIcon = async (context = {}) => request("sectionIcon", context, () => result("sectionIcon", context, { direction: "단색 또는 2색의 단순한 꽃과 별 조합", postprocess: window.AI_POSTPROCESS.describe(context.settings) }));
  const generateBackgroundDecoration = async (context = {}) => request("background", context, () => result("background", context, { direction: "본문 바깥에 머무르는 저채도 장식", postprocess: window.AI_POSTPROCESS.describe(context.settings) }));
  const regenerateAIResult = async (previous = {}, userInstruction = "") => {
    const context = { ...previous, instruction: userInstruction || previous.instruction };
    if (previous.type === "movie") return recommendMovieTheme(context);
    if (previous.type === "frame") return generateFrameDecoration(context);
    if (previous.type === "textTheme") return generateHeroTextTheme(context);
    if (previous.type === "sectionIcon") return generateSectionIcon(context);
    if (previous.type === "background") return generateBackgroundDecoration(context);
    return recommendColorPalette(context);
  };
  const testAIConnection = async (settings = {}) => {
    if (settings.mockMode !== false) return { ok: Boolean(settings.enabled), mockMode: true, message: "Mock Mode 연결이 정상입니다." };
    const separator = (settings.endpoint || "/api/ai-design").includes("?") ? "&" : "?";
    const response = await fetch(`${settings.endpoint || "/api/ai-design"}${separator}provider=${encodeURIComponent(settings.provider || "OpenAI")}`, { headers: await authHeaders() });
    const payload = await response.json();
    return { ok: response.ok && payload.configured, mockMode: false, message: response.ok && payload.configured ? "OpenAI 서버 연결이 정상입니다." : (payload.error || "서버 환경변수를 확인해 주세요.") };
  };
  window.AI_DESIGN_SERVICE = { recommendColorPalette, recommendMovieTheme, generateFrameDecoration, generateHeroTextTheme, generateSectionIcon, generateBackgroundDecoration, regenerateAIResult, testAIConnection };
})();
