const API_URL = "https://api.openai.com/v1/responses";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://cimyjsqjpenljpywhgso.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_jxY5QiiuKHV-5VSBO1F8Ow_wWeYjcDV";

const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    palette: {
      type: "object",
      properties: {
        background: { type: "string" }, card: { type: "string" }, ink: { type: "string" },
        muted: { type: "string" }, accent: { type: "string" }, line: { type: "string" },
      },
      required: ["background", "card", "ink", "muted", "accent", "line"],
      additionalProperties: false,
    },
    heroDecoration: { type: "string", enum: ["none", "doodle_hearts", "organic_heart", "wedding_rings", "poster_card"] },
    heroTextTheme: { type: "string", enum: ["editorial_left", "minimal_center"] },
    sectionIconDirection: { type: "string" },
    backgroundDirection: { type: "string" },
  },
  required: ["name", "palette", "heroDecoration", "heroTextTheme", "sectionIconDirection", "backgroundDirection"],
  additionalProperties: false,
};

function outputText(response) {
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text") return content.text;
      if (content.type === "refusal") throw new Error(content.refusal || "요청이 거절되었습니다.");
    }
  }
  throw new Error("AI 응답 본문이 없습니다.");
}

async function registeredAdmin(request) {
  const authorization = request.headers?.authorization || "";
  if (!authorization.startsWith("Bearer ")) return false;
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: authorization } });
  if (!userResponse.ok) return false;
  const user = await userResponse.json();
  const adminResponse = await fetch(`${SUPABASE_URL}/rest/v1/rsvp_admins?select=user_id&user_id=eq.${encodeURIComponent(user.id)}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: authorization },
  });
  return adminResponse.ok && (await adminResponse.json()).length > 0;
}

function designPrompt(type, context) {
  return `모바일 청첩장 디자인 보조 도구입니다. 메인 사진은 절대 교체하지 마세요.
요청 유형: ${type}
사용자 요청: ${context.instruction || context.mood || ""}
영화 또는 컨셉: ${context.concept || ""}
팔레트는 CSS에서 바로 사용할 수 있는 색상으로 제안하고, 프레임과 문구 테마는 제공된 enum 중 하나를 선택하세요.`;
}

async function callOpenAI(prompt) {
  const openai = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL,
      input: prompt,
      text: { format: { type: "json_schema", name: "wedding_design", strict: true, schema } },
    }),
  });
  const payload = await openai.json();
  if (!openai.ok) throw new Error(payload.error?.message || "OpenAI API 호출에 실패했습니다.");
  return JSON.parse(outputText(payload));
}

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema },
    }),
  });
  const payload = await gemini.json();
  if (!gemini.ok) throw new Error(payload.error?.message || "Gemini API 호출에 실패했습니다.");
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";
  if (!text) throw new Error("Gemini 응답 본문이 없습니다.");
  return JSON.parse(text);
}

module.exports = async function aiDesign(request, response) {
  if (!await registeredAdmin(request)) return response.status(401).json({ error: "등록된 관리자 로그인 후 이용해 주세요." });
  const provider = request.method === "POST" ? request.body?.provider || "OpenAI" : request.query?.provider || "OpenAI";
  if (request.method === "GET") {
    const configured = provider === "Gemini" ? Boolean(process.env.GEMINI_API_KEY) : Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
    return response.status(configured ? 200 : 503).json({ configured, provider, error: configured ? "" : provider === "Gemini" ? "GEMINI_API_KEY 환경변수를 등록해 주세요." : "OPENAI_API_KEY와 OPENAI_MODEL 환경변수를 등록해 주세요." });
  }
  if (request.method !== "POST") return response.status(405).json({ error: "지원하지 않는 요청입니다." });
  if (provider === "Gemini" && !process.env.GEMINI_API_KEY) return response.status(503).json({ error: "Gemini 서버 환경변수가 설정되지 않았습니다." });
  if (provider !== "Gemini" && (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)) return response.status(503).json({ error: "OpenAI 서버 환경변수가 설정되지 않았습니다." });

  const { type = "palette", context = {} } = request.body || {};
  const prompt = designPrompt(type, context);
  try {
    const result = provider === "Gemini" ? await callGemini(prompt) : await callOpenAI(prompt);
    if (type === "sectionIcon") result.direction = result.sectionIconDirection;
    if (type === "background") result.direction = result.backgroundDirection;
    return response.status(200).json({ ...result, prompt, createdAt: new Date().toISOString() });
  } catch (error) {
    return response.status(500).json({ error: error.message || "AI 응답 처리에 실패했습니다." });
  }
};
