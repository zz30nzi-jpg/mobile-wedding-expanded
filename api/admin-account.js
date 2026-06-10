const SUPABASE_URL = process.env.SUPABASE_URL || "https://cimyjsqjpenljpywhgso.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_jxY5QiiuKHV-5VSBO1F8Ow_wWeYjcDV";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function isSuperAdmin(request) {
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

module.exports = async function adminAccount(request, response) {
  response.setHeader("Access-Control-Allow-Origin", request.headers.origin || "*");
  response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Vary", "Origin");
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return response.status(405).json({ error: "지원하지 않는 요청입니다." });
  if (!await isSuperAdmin(request)) return response.status(401).json({ error: "슈퍼관리자 로그인 후 이용해 주세요." });
  if (!SUPABASE_SERVICE_ROLE_KEY) return response.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY 환경변수를 등록해 주세요." });

  const { action, userId } = request.body || {};
  if (action !== "deleteUser") return response.status(400).json({ error: "지원하지 않는 작업입니다." });
  if (!userId) return response.status(400).json({ error: "userId가 필요합니다." });

  try {
    const deleteResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const payload = await deleteResponse.json().catch(() => ({}));
      throw new Error(payload.msg || payload.error || "계정 삭제에 실패했습니다.");
    }
    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(500).json({ error: error.message || "계정 삭제 처리에 실패했습니다." });
  }
};
