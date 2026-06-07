const API_URL = "https://api.openai.com/v1/responses";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://cimyjsqjpenljpywhgso.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_jxY5QiiuKHV-5VSBO1F8Ow_wWeYjcDV";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;

const designSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    palette: {
      type: "object",
      properties: {
        side: { type: "string" }, background: { type: "string" }, card: { type: "string" }, ink: { type: "string" },
        muted: { type: "string" }, accent: { type: "string" }, label: { type: "string" }, button: { type: "string" }, line: { type: "string" },
      },
      required: ["side", "background", "card", "ink", "muted", "accent", "label", "button", "line"],
      additionalProperties: false,
    },
    heroDecoration: { type: "string", enum: ["none", "doodle_hearts", "organic_heart", "wedding_rings", "poster_card"] },
    heroTextTheme: { type: "string", enum: ["editorial_left", "minimal_center"] },
    sectionIconDirection: { type: "string" },
    backgroundDirection: { type: "string" },
    fontDirection: { type: "string" },
    fontId: { type: "string" },
    fontFamily: { type: "string" },
    fontLicense: { type: "string" },
    galleryFrameDirection: { type: "string" },
    buttonShapeDirection: { type: "string" },
  },
  required: ["name", "palette", "heroDecoration", "heroTextTheme", "sectionIconDirection", "backgroundDirection", "fontDirection", "fontId", "fontFamily", "fontLicense", "galleryFrameDirection", "buttonShapeDirection"],
  additionalProperties: false,
};

const transportSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          text: { type: "string" },
        },
        required: ["title", "text"],
        additionalProperties: false,
      },
    },
    caution: { type: "string" },
  },
  required: ["items", "caution"],
  additionalProperties: false,
};

const venueSchema = {
  type: "object",
  properties: {
    notices: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          text: { type: "string" },
        },
        required: ["title", "text"],
        additionalProperties: false,
      },
    },
    caution: { type: "string" },
  },
  required: ["notices", "caution"],
  additionalProperties: false,
};

function schemaFor(type) {
  if (type === "transportGuide") return transportSchema;
  if (type === "venueGuide") return venueSchema;
  return designSchema;
}

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
  if (adminResponse.ok && (await adminResponse.json()).length > 0) return true;
  const ownerResponse = await fetch(`${SUPABASE_URL}/rest/v1/invitation_sites?select=slug&owner_id=eq.${encodeURIComponent(user.id)}&limit=1`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: authorization },
  });
  return ownerResponse.ok && (await ownerResponse.json()).length > 0;
}

function designPrompt(type, context) {
  const settings = context.settings || {};
  const prompts = settings.prompts || {};
  const refs = String(settings.referenceImages || "").split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const fonts = Array.isArray(context.fonts) ? context.fonts : [];
  const designPromptForType = () => {
    if (type === "palette") return prompts.colorTheme || "";
    if (type === "movie") return prompts.movieTheme || "";
    if (type === "frame") return prompts.frameAsset || "";
    if (type === "textTheme") return prompts.textThemeAsset || "";
    if (type === "sectionIcon" || type === "background") return prompts.iconAsset || "";
    return "";
  };
  const promptHeader = `${prompts.base || ""}
참고 레퍼런스 이미지 URL:
${refs.length ? refs.map((url, index) => `${index + 1}. ${url}`).join("\n") : "없음"}
주의: 참고 이미지는 분위기, 여백, 색감, 구성만 참고하고 특정 이미지를 복제하지 않는다.
사용 가능한 상업적 무료/업로드 폰트:
${fonts.length ? fonts.map((font) => `- ${font.id}: ${font.name || font.family} / family=${font.family || ""} / license=${font.license || ""}`).join("\n") : "- noto-serif-kr: Noto Serif KR / family=Noto Serif KR / license=SIL Open Font License"}`;
  if (type === "transportGuide") {
    return `${promptHeader}
${prompts.transport || ""}
모바일 청첩장의 교통안내 초안을 작성하세요.
예식장명: ${context.venue || ""}
홀 정보: ${context.hall || ""}
주소: ${context.address || ""}
공식홈페이지 URL: ${context.officialUrl || ""}
예식일시: ${context.date || ""}
요구사항:
- 예식장과 가장 가까운 기차역/지하철역 기준 경로를 1개 이상 작성하세요.
- 가장 가까운 버스정류장 기준 경로를 1개 이상 작성하세요.
- 예: 창원중앙역에서 식장까지 차량 몇 분, 버스 몇 번과 몇 분, 지하철/기차 이용 가능 여부, 도보 몇 분을 작성하세요.
- 버스정류장은 정류장 이름을 제목 또는 본문에 명확히 적고, 정류장에서 식장까지 이동 방법을 작성하세요.
- 차량, 버스, 지하철/기차, 도보 소요시간을 알 수 있는 범위에서 간결히 작성하세요.
- 도보는 20분 이하일 때만 적고, 확실하지 않은 정보는 단정하지 말고 확인 필요라고 적으세요.
- 한국어로 작성하고 하객이 바로 이해할 수 있게 제목과 본문으로 나누세요.`;
  }
  if (type === "venueGuide") {
    return `${promptHeader}
${prompts.venue || ""}
모바일 청첩장의 식장 안내사항 초안을 작성하세요.
예식장명: ${context.venue || ""}
홀 정보: ${context.hall || ""}
주소: ${context.address || ""}
공식홈페이지 URL: ${context.officialUrl || ""}
예식일시: ${context.date || ""}
현재 안내사항: ${JSON.stringify(context.notices || [])}
요구사항:
- 주차, 식사/연회, 홀 위치/이동, 사진/축의/화환 등 하객에게 필요한 안내를 2~3개로 정리하세요.
- 기본 안내사항은 반드시 주차 안내와 식사 안내를 포함하세요.
- 식사 안내에는 식권 받는 곳, 연회장 위치, 식사 가능 시간을 알 수 있으면 포함하세요.
- 주차 안내에는 주차권 받는 곳, 주차권 필요 여부, 여러 주차장이 있으면 가능한 주차장 이름을 포함하세요.
- 공식홈페이지 URL이 있으면 공식 안내 기준으로 작성하되, 이 서버가 실제 웹페이지 내용을 가져오지 못하면 확인 필요라고 적으세요.
- 모르는 사실은 지어내지 말고 "확인 후 안내 예정"처럼 안전하게 작성하세요.
- 문장은 짧고 정중하게 작성하세요.`;
  }
  return `${promptHeader}
${designPromptForType()}
모바일 청첩장 디자인 보조 도구입니다. 메인 사진은 절대 교체하지 마세요.
요청 유형: ${type}
사용자 요청: ${context.instruction || context.mood || ""}
영화 또는 컨셉: ${context.concept || ""}
팔레트는 CSS에서 바로 사용할 수 있는 색상으로 제안하고, 프레임과 문구 테마는 제공된 enum 중 하나를 선택하세요.
팔레트의 ink는 본문 글자색이므로 반드시 충분히 어두운 계열로 지정하세요. side는 모바일 청첩장 좌우 빈 여백 색상이며 background보다 연하고 밝아 청첩장 영역과 구분되어야 합니다. accent는 버튼/강조색, label은 영문 섹션 라벨색, button은 연한 버튼 배경색입니다.
폰트 파일이나 새 폰트 생성은 하지 마세요. fontId는 사용 가능한 목록 중 하나만 참고값으로 고르세요.
컬러테마 요청이면 색상 팔레트 추천에 집중하세요.
영화테마 요청이면 실제 영화 포스터, 명장면, 시대감, 조명, 의상/소품, 대표 색감에서 무드를 추출하세요.
표절이나 특정 포스터 복제는 피하고, 그 영화가 연상되는 색상·여백·구도·질감·장면 감정만 재해석하세요.
생성 스타일은 사랑스럽고 키치하며, 드로잉 라인 장식이 많은 모바일 청첩장 디자인을 우선합니다.
메인 이미지 프레임 모양, 갤러리 배치 레이아웃, 갤러리 미리보기 프레임 디자인, 전체 폰트 방향, 메인문구테마가 하나의 영화 무드로 일관되게 보이도록 제안하세요.`;
}

async function callOpenAI(prompt, responseSchema) {
  const openai = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL,
      input: prompt,
      text: { format: { type: "json_schema", name: "wedding_ai_result", strict: true, schema: responseSchema } },
    }),
  });
  const payload = await openai.json();
  if (!openai.ok) throw new Error(payload.error?.message || "OpenAI API 호출에 실패했습니다.");
  return JSON.parse(outputText(payload));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isGeminiBusy(payload = {}) {
  const message = payload.error?.message || "";
  return /high demand|overloaded|quota|rate|429|503/i.test(message);
}

async function callGeminiModel(model, prompt, responseSchema) {
  const gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: responseSchema },
    }),
  });
  const payload = await gemini.json();
  if (!gemini.ok) {
    const error = new Error(payload.error?.message || "Gemini API 호출에 실패했습니다.");
    error.retryable = gemini.status === 429 || gemini.status === 503 || isGeminiBusy(payload);
    throw error;
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";
  if (!text) throw new Error("Gemini 응답 본문이 없습니다.");
  return JSON.parse(text);
}

async function callGemini(prompt, responseSchema) {
  const primary = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const models = [...new Set([primary, "gemini-2.0-flash"])];
  let lastError;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await callGeminiModel(model, prompt, responseSchema);
      } catch (error) {
        lastError = error;
        if (!error.retryable) throw error;
        await sleep(450 + attempt * 700);
      }
    }
  }
  throw new Error(`Gemini가 일시적으로 혼잡합니다. 잠시 후 다시 시도해 주세요. ${lastError?.message || ""}`.trim());
}

module.exports = async function aiDesign(request, response) {
  response.setHeader("Access-Control-Allow-Origin", request.headers.origin || "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Vary", "Origin");
  if (request.method === "OPTIONS") return response.status(204).end();
  if (!await registeredAdmin(request)) return response.status(401).json({ error: "등록된 관리자 로그인 후 이용해 주세요." });
  const provider = request.method === "POST" ? request.body?.provider || "OpenAI" : request.query?.provider || "OpenAI";
  if (request.method === "GET") {
    const configured = provider === "Gemini" ? Boolean(GEMINI_API_KEY) : Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
    return response.status(configured ? 200 : 503).json({ configured, provider, error: configured ? "" : provider === "Gemini" ? "GEMINI_API_KEY 환경변수를 등록해 주세요." : "OPENAI_API_KEY와 OPENAI_MODEL 환경변수를 등록해 주세요." });
  }
  if (request.method !== "POST") return response.status(405).json({ error: "지원하지 않는 요청입니다." });
  if (provider === "Gemini" && !GEMINI_API_KEY) return response.status(503).json({ error: "Gemini 서버 환경변수가 설정되지 않았습니다." });
  if (provider !== "Gemini" && (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)) return response.status(503).json({ error: "OpenAI 서버 환경변수가 설정되지 않았습니다." });

  const { type = "palette", context = {} } = request.body || {};
  const prompt = designPrompt(type, context);
  const responseSchema = schemaFor(type);
  try {
    const result = provider === "Gemini" ? await callGemini(prompt, responseSchema) : await callOpenAI(prompt, responseSchema);
    if (type === "sectionIcon") result.direction = result.sectionIconDirection;
    if (type === "background") result.direction = result.backgroundDirection;
    return response.status(200).json({ ...result, prompt, createdAt: new Date().toISOString() });
  } catch (error) {
    return response.status(500).json({ error: error.message || "AI 응답 처리에 실패했습니다." });
  }
};
