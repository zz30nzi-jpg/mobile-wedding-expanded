const RSVP_LOCAL_KEY = "wedding-attendance-responses";
const GUESTBOOK_LOCAL_KEY = "wedding-guestbook-entries";
const INVITATION_LOCAL_KEY = "wedding-invitation-preview-draft";
const DEFAULT_INVITATION_ID = "main";
let activeInvitationSlug = "";

function getSupabaseClient() {
  const config = window.RSVP_CONFIG || {};
  if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase) return null;
  return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

function readLocalResponses() {
  return JSON.parse(localStorage.getItem(RSVP_LOCAL_KEY) || "[]");
}

function saveLocalResponse(response) {
  const responses = readLocalResponses();
  const id = crypto.randomUUID?.() || `preview-${Date.now()}`;
  responses.unshift({ ...response, id, created_at: new Date().toISOString() });
  localStorage.setItem(RSVP_LOCAL_KEY, JSON.stringify(responses));
}

function mergeInvitationData(fallback, saved) {
  if (Array.isArray(saved)) return saved;
  if (!saved || typeof saved !== "object") return saved ?? fallback;
  const merged = { ...(fallback || {}) };
  for (const [key, value] of Object.entries(saved)) {
    merged[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergeInvitationData(fallback?.[key], value)
      : value;
  }
  return merged;
}

function normalizeInvitationData(fallback, saved, library = null) {
  const merged = mergeInvitationData(fallback, saved);
  const legacyTransport = new Set([
    "창원중앙역에서 호텔까지 차량으로 약 15분",
    "호텔 인근 정류장과 예식 당일 셔틀 운행 여부를 확인해 주세요.",
    "내비게이션에 호텔명 또는 주소를 입력해 주세요.",
  ]);
  merged.transport = (merged.transport || fallback.transport || []).map((item) => {
    if (!legacyTransport.has(item.text)) return item;
    const keyword = item.title.includes("버스") ? "버스" : item.title.includes("자가용") ? "자가용" : "지하철";
    return fallback.transport.find((fallbackItem) => fallbackItem.title.includes(keyword)) || item;
  });
  const accounts = Array.isArray(merged.accounts) ? merged.accounts : [];
  const defaultAccounts = Array.isArray(fallback.accounts) ? fallback.accounts : [];
  const orderedAccounts = defaultAccounts.map((defaultAccount) => ({
    ...defaultAccount,
    ...(accounts.find((account) => account.side === defaultAccount.side && account.name === defaultAccount.name) || {}),
  }));
  const customAccounts = accounts.filter((account) =>
    !defaultAccounts.some((defaultAccount) => account.side === defaultAccount.side && account.name === defaultAccount.name));
  return window.WEDDING_DESIGN.normalize({ ...merged, accounts: [...orderedAccounts, ...customAccounts] }, library);
}

function normalizeSlug(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function fallbackSlug(seed = "") {
  return normalizeSlug(seed) || `card-${Date.now().toString(36)}`;
}

function dateOnly(value = "") {
  return String(value || "").slice(0, 10);
}

function getUrlInvitationSlug() {
  if (window.__FORCE_CARD_SLUG) return normalizeSlug(window.__FORCE_CARD_SLUG);
  const params = new URLSearchParams(location.search);
  return normalizeSlug(params.get("card") || params.get("invitation") || "");
}

function setActiveInvitationSlug(slug) {
  activeInvitationSlug = normalizeSlug(slug) || DEFAULT_INVITATION_ID;
  return activeInvitationSlug;
}

function getActiveInvitationSlug() {
  return activeInvitationSlug || getUrlInvitationSlug() || DEFAULT_INVITATION_ID;
}

function invitationLocalKey(slug = getActiveInvitationSlug()) {
  return slug && slug !== DEFAULT_INVITATION_ID ? `${INVITATION_LOCAL_KEY}:${slug}` : INVITATION_LOCAL_KEY;
}

const isStoragePath = (value = "") => /^invitations\/[^/]+\//.test(String(value || ""));

function mediaPublicUrl(path = "") {
  const value = String(path || "");
  if (!isStoragePath(value)) return value;
  const client = getSupabaseClient();
  return client ? client.storage.from("invitation-media").getPublicUrl(value).data.publicUrl : "";
}

function mediaRoleFromSlot(slot = "") {
  const value = String(slot || "");
  if (value === "hero-image") return { folder: "hero", filename: "hero.webp" };
  if (value === "ending-image") return { folder: "ending", filename: "ending.webp" };
  if (value === "meta-shareImage") return { folder: "share", filename: "og-image.webp" };
  const gallery = value.match(/^gallery-(\d+)$/);
  if (gallery) return { folder: "gallery", filename: `${String(gallery[1]).padStart(3, "0")}.webp` };
  return { folder: "design-assets", filename: `${value || "image"}-${Date.now()}.webp` };
}

function emptyMediaInvitation(fallback, { slug = "", groomName = "", brideName = "", groomBirthday = "", brideBirthday = "", weddingDate = "", weddingVenue = "", weddingHall = "", publicOpenDate = "", publicCloseDate = "" } = {}, library = null) {
  const next = normalizeInvitationData(fallback, JSON.parse(JSON.stringify(fallback)), library);
  next.hero = { ...(next.hero || {}), image: "", video: "", activeMedia: "image", introName: [groomName, brideName].filter(Boolean).join(" · "), introDate: "" };
  next.couple = {
    ...(next.couple || {}),
    groom: { ...(next.couple?.groom || {}), name: groomName || "", birthday: groomBirthday || "", parents: "", phone: "", photo: "", tags: [] },
    bride: { ...(next.couple?.bride || {}), name: brideName || "", birthday: brideBirthday || "", parents: "", phone: "", photo: "", tags: [] },
  };
  next.wedding = {
    ...(next.wedding || {}),
    date: weddingDate ? `${weddingDate}:00+09:00` : "",
    venue: weddingVenue || "",
    hall: weddingHall || "",
    address: "",
    officialUrl: "",
    mapLinks: [],
  };
  next.accounts = [];
  next.gallery = Array.from({ length: 30 }, () => "");
  next.transport = [];
  next.ending = { ...(next.ending || {}), image: "" };
  next.meta = {
    ...(next.meta || {}),
    title: [groomName, brideName].filter(Boolean).join(" ♥ ") + ([groomName, brideName].some(Boolean) ? " 결혼합니다" : ""),
    description: "",
    shareImage: "",
  };
  next.guestPhotos = { ...(next.guestPhotos || {}), eventDate: dateOnly(weddingDate), uploadSlug: slug || next.guestPhotos?.uploadSlug || "wedding-day" };
  next.publicPeriod = { ...(next.publicPeriod || {}), openDate: publicOpenDate || "", closeDate: publicCloseDate || "" };
  const normalized = window.WEDDING_DESIGN.normalize(next, library);
  normalized.accounts = [];
  return normalized;
}

async function currentUserInvitationSite(client) {
  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;
  const { data, error } = await client
    .from("invitation_sites")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error?.code === "42P01") return null;
  if (error) throw error;
  return data;
}

async function getCurrentInvitationSite() {
  const client = getSupabaseClient();
  if (!client) return null;
  return currentUserInvitationSite(client);
}

async function ensureInvitationForCurrentUser(fallback = window.INVITATION_DATA, profile = {}) {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;
  const existing = await currentUserInvitationSite(client);
  if (existing?.slug) {
    setActiveInvitationSlug(existing.slug);
    return existing;
  }
  const meta = user.user_metadata || {};
  const groomName = profile.groomName || meta.groom_name || "";
  const brideName = profile.brideName || meta.bride_name || "";
  const weddingDate = profile.weddingDate || meta.wedding_date || "";
  const weddingVenue = profile.weddingVenue || meta.wedding_venue || "";
  if (!groomName || !brideName || !weddingDate || !weddingVenue) return null;
  const slug = fallbackSlug(profile.cardSlug || meta.card_slug || `${groomName}-${brideName}` || user.email?.split("@")[0]);
  const title = [groomName, brideName].filter(Boolean).join(" · ") || user.email || "새 청첩장";
  const library = await loadDesignLibrary();
  const { data: defaultSettings } = await client
    .from("invitation_settings")
    .select("content")
    .eq("id", DEFAULT_INVITATION_ID)
    .maybeSingle();
  const baseContent = defaultSettings?.content ? normalizeInvitationData(fallback, defaultSettings.content, library) : fallback;
  const content = emptyMediaInvitation(baseContent, {
    slug,
    groomName,
    brideName,
    groomBirthday: profile.groomBirthday || meta.groom_birthday || "",
    brideBirthday: profile.brideBirthday || meta.bride_birthday || "",
    weddingDate,
    weddingVenue,
    weddingHall: profile.weddingHall || meta.wedding_hall || "",
    publicOpenDate: profile.publicOpenDate || meta.public_open_date || "",
    publicCloseDate: profile.publicCloseDate || meta.public_close_date || "",
  }, library);
  const { data: site, error: siteError } = await client
    .from("invitation_sites")
    .insert({ slug, owner_id: user.id, title, groom_name: groomName, bride_name: brideName, signup_email: user.email })
    .select("*")
    .single();
  if (siteError) throw siteError;
  const { error: settingsError } = await client
    .from("invitation_settings")
    .upsert({ id: slug, content, updated_at: new Date().toISOString() });
  if (settingsError) throw settingsError;
  setActiveInvitationSlug(slug);
  return site;
}

async function submitAttendanceResponse(response) {
  const client = getSupabaseClient();
  const payload = { ...response, invitation_id: getActiveInvitationSlug() };
  if (!client) {
    saveLocalResponse(payload);
    return { isPreview: true };
  }

  const { error } = await client.from("attendance_responses").insert(payload);
  if (error) throw error;
  return { isPreview: false };
}

function readLocalGuestbookEntries() {
  return JSON.parse(localStorage.getItem(GUESTBOOK_LOCAL_KEY) || "[]");
}

async function loadGuestbookEntries() {
  const client = getSupabaseClient();
  if (!client) return readLocalGuestbookEntries();
  const { data, error } = await client
    .from("guestbook_entries")
    .select("*")
    .eq("invitation_id", getActiveInvitationSlug())
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error?.code === "42703") {
    const legacy = await client.from("guestbook_entries").select("*").order("created_at", { ascending: false }).limit(30);
    if (legacy.error) throw legacy.error;
    return legacy.data.map((entry) => ({ ...entry, hidden: false }));
  }
  if (error) throw error;
  return data;
}

async function loadAdminGuestbookEntries() {
  const client = getSupabaseClient();
  if (!client) return readLocalGuestbookEntries();
  const { data, error } = await client.from("guestbook_entries").select("*").eq("invitation_id", getActiveInvitationSlug()).order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((entry) => ({ hidden: false, ...entry }));
}

async function setGuestbookEntryHidden(id, hidden) {
  const client = getSupabaseClient();
  if (!client) {
    const entries = readLocalGuestbookEntries().map((entry) => entry.id === id ? { ...entry, hidden } : entry);
    localStorage.setItem(GUESTBOOK_LOCAL_KEY, JSON.stringify(entries));
    return;
  }
  const { error } = await client.from("guestbook_entries").update({ hidden }).eq("id", id);
  if (error) throw error;
}

async function submitGuestbookEntry(entry) {
  const client = getSupabaseClient();
  const payload = { ...entry, invitation_id: getActiveInvitationSlug() };
  if (!client) {
    const entries = readLocalGuestbookEntries();
    entries.unshift({ ...payload, id: crypto.randomUUID?.() || `preview-${Date.now()}`, created_at: new Date().toISOString() });
    localStorage.setItem(GUESTBOOK_LOCAL_KEY, JSON.stringify(entries.slice(0, 30)));
    return { isPreview: true };
  }
  const { error } = await client.from("guestbook_entries").insert(payload);
  if (error) throw error;
  return { isPreview: false };
}

const INVITATION_CACHE_TTL = 60 * 60 * 1000; // 1시간 (밀리초)

function invitationCacheKey(slug) {
  return `wedding-inv-cache:${slug || DEFAULT_INVITATION_ID}`;
}

function readInvitationCache(slug) {
  try {
    const raw = localStorage.getItem(invitationCacheKey(slug));
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    if (!data || Date.now() - cachedAt > INVITATION_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function writeInvitationCache(slug, data) {
  try {
    localStorage.setItem(invitationCacheKey(slug), JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {}
}

function clearInvitationCache(slug) {
  try { localStorage.removeItem(invitationCacheKey(slug)); } catch {}
}

const DESIGN_LIBRARY_ID = "_design_library";
const DESIGN_LIBRARY_CACHE_KEY = "wedding-design-library-cache";
const DESIGN_LIBRARY_FIELDS = ["themes", "assets", "layoutTemplates", "deletedThemeIds", "deletedAssetIds", "colorDefaults", "fontDefaults", "aiSettings", "aiLibrary"];

function extractDesignLibrary(system = {}) {
  const library = {};
  DESIGN_LIBRARY_FIELDS.forEach((key) => { if (system[key] !== undefined) library[key] = system[key]; });
  return library;
}

function readDesignLibraryCache() {
  try {
    const raw = localStorage.getItem(DESIGN_LIBRARY_CACHE_KEY);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    if (!data || Date.now() - cachedAt > INVITATION_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function writeDesignLibraryCache(data) {
  try { localStorage.setItem(DESIGN_LIBRARY_CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() })); } catch {}
}

async function fetchDesignLibrary(client) {
  const { data, error } = await client.from("invitation_settings").select("content").eq("id", DESIGN_LIBRARY_ID).maybeSingle();
  if (!error && data?.content) return data.content;
  // _design_library가 아직 없으면 "main" 청첩장의 designSystem을 1회성 마이그레이션 소스로 사용
  const { data: mainData } = await client.from("invitation_settings").select("content").eq("id", DEFAULT_INVITATION_ID).maybeSingle();
  return mainData?.content?.designSystem ? extractDesignLibrary(mainData.content.designSystem) : null;
}

async function loadDesignLibrary() {
  const client = getSupabaseClient();
  if (!client) return readDesignLibraryCache();
  const cached = readDesignLibraryCache();
  if (cached) {
    fetchDesignLibrary(client).then((fresh) => { if (fresh) writeDesignLibraryCache(fresh); }).catch(() => {});
    return cached;
  }
  const fresh = await fetchDesignLibrary(client);
  if (fresh) writeDesignLibraryCache(fresh);
  return fresh;
}

async function saveDesignLibrary(content) {
  const library = extractDesignLibrary(content?.designSystem || content || {});
  const client = getSupabaseClient();
  if (!client) {
    writeDesignLibraryCache(library);
    return;
  }
  const { error } = await client.from("invitation_settings").upsert({ id: DESIGN_LIBRARY_ID, content: library, updated_at: new Date().toISOString() });
  if (error) throw error;
  writeDesignLibraryCache(library);
}

async function fetchAndCacheInvitation(client, fallback, slug, library) {
  const { data, error } = await client
    .from("invitation_settings")
    .select("content")
    .eq("id", slug)
    .maybeSingle();
  if (error || !data?.content) return null;
  writeInvitationCache(slug, data.content);
  return normalizeInvitationData(fallback, data.content, library);
}

async function loadInvitationData(fallback) {
  const client = getSupabaseClient();
  const urlSlug = getUrlInvitationSlug();
  if (!client) {
    setActiveInvitationSlug(urlSlug || activeInvitationSlug || DEFAULT_INVITATION_ID);
    const saved = JSON.parse(localStorage.getItem(invitationLocalKey()) || "null");
    return normalizeInvitationData(fallback, saved);
  }
  // 로그인한 사용자가 있으면 소유한 사이트로 분기 (관리자 페이지용)
  const ownedSite = urlSlug ? null : await currentUserInvitationSite(client);
  const slug = setActiveInvitationSlug(urlSlug || ownedSite?.slug || DEFAULT_INVITATION_ID);
  const library = await loadDesignLibrary();

  // 캐시에서 즉시 반환 후 백그라운드에서 최신 데이터 갱신 (stale-while-revalidate)
  const cached = readInvitationCache(slug);
  if (cached) {
    // 백그라운드에서 갱신 (화면은 이미 렌더됨)
    fetchAndCacheInvitation(client, fallback, slug, library).then((fresh) => {
      if (fresh) window.__invitationFreshData = fresh;
    }).catch(() => {});
    return normalizeInvitationData(fallback, cached, library);
  }

  // 캐시 없으면 직접 fetch
  const result = await fetchAndCacheInvitation(client, fallback, slug, library);
  return result || window.WEDDING_DESIGN.normalize(fallback, library);
}

async function saveInvitationData(content) {
  const client = getSupabaseClient();
  const slug = getActiveInvitationSlug();
  if (!client) {
    localStorage.setItem(invitationLocalKey(slug), JSON.stringify(content));
    return;
  }
  const { error } = await client
    .from("invitation_settings")
    .upsert({ id: slug, content, updated_at: new Date().toISOString() });
  if (error) throw error;
  clearInvitationCache(slug); // 저장 후 캐시 즉시 무효화
  await client.from("invitation_sites").update({
    title: `${content.couple?.groom?.name || ""} · ${content.couple?.bride?.name || ""}`.trim() || "청첩장",
    groom_name: content.couple?.groom?.name || "",
    bride_name: content.couple?.bride?.name || "",
    updated_at: new Date().toISOString(),
  }).eq("slug", slug);
}

async function signUpInvitationAdmin({ email, password, groomName = "", brideName = "", groomBirthday = "", brideBirthday = "", weddingDate = "", weddingVenue = "", weddingHall = "", publicOpenDate = "", publicCloseDate = "", agreeTerms, agreePrivacy, agreeMarketing = false }) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  if (!agreeTerms || !agreePrivacy) throw new Error("필수 약관에 동의해 주세요.");
  const slug = groomName && brideName ? fallbackSlug(`${groomName}-${brideName}`) : "";
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "general_admin",
        groom_name: groomName,
        bride_name: brideName,
        groom_birthday: groomBirthday,
        bride_birthday: brideBirthday,
        wedding_date: weddingDate,
        wedding_venue: weddingVenue,
        wedding_hall: weddingHall,
        public_open_date: publicOpenDate,
        public_close_date: publicCloseDate,
        ...(slug ? { card_slug: slug } : {}),
        agree_terms: Boolean(agreeTerms),
        agree_privacy: Boolean(agreePrivacy),
        agree_marketing: Boolean(agreeMarketing),
      },
    },
  });
  if (error) throw error;
  if (!data.session) return { needsConfirmation: true, slug };
  const site = await ensureInvitationForCurrentUser();
  return { needsConfirmation: false, slug: site?.slug || slug };
}

async function signInWithProvider(provider) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const redirectTo = `${location.origin}${location.pathname}`;
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("소셜 로그인 이동 URL을 받지 못했습니다.");
  location.assign(data.url);
}

async function listInvitationSites() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const { data, error } = await client
    .from("invitation_sites")
    .select("slug,title,groom_name,bride_name,signup_email,disabled,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const sites = data || [];
  if (!sites.length) return [];
  const slugs = sites.map((site) => site.slug).filter(Boolean);
  const { data: settings } = await client
    .from("invitation_settings")
    .select("id,content")
    .in("id", slugs);
  const contentBySlug = new Map((settings || []).map((row) => [row.id, row.content || {}]));
  return Promise.all(sites.map(async (site) => {
    const content = contentBySlug.get(site.slug) || {};
    const guestSlug = content.guestPhotos?.uploadSlug || site.slug || "wedding-day";
    const [invitationFiles, guestFiles] = await Promise.all([
      listStorageFolder(client, "invitation-media", `invitations/${site.slug}`).catch(() => []),
      listStorageFolder(client, "guest-photos", guestSlug).catch(() => []),
    ]);
    const invitationBytes = storageBytes(invitationFiles);
    const guestBytes = storageBytes(guestFiles);
    return {
      ...site,
      weddingDate: content.wedding?.date || "",
      publicPeriod: content.publicPeriod || {},
      guestPhotos: content.guestPhotos || {},
      invitationBytes,
      guestBytes,
      totalBytes: invitationBytes + guestBytes,
    };
  }));
}

function storageBytes(files = []) {
  return files.reduce((total, file) => total + Number(file.metadata?.size || file.metadata?.contentLength || file.metadata?.content_length || file.size || 0), 0);
}

async function listStorageFolder(client, bucket, folder = "") {
  const { data: entries, error } = await client.storage
    .from(bucket)
    .list(folder, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;
  const files = (entries || []).filter((entry) => entry.id).map((entry) => ({ ...entry, path: folder ? `${folder}/${entry.name}` : entry.name }));
  const folders = (entries || []).filter((entry) => !entry.id);
  const nested = await Promise.all(folders.map((entry) => listStorageFolder(client, bucket, folder ? `${folder}/${entry.name}` : entry.name)));
  return files.concat(...nested);
}

async function setInvitationSiteDisabled(slug, disabled) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const { error } = await client
    .from("invitation_sites")
    .update({ disabled: Boolean(disabled), updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) throw error;
}

async function removeInvitationSite(slug) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const { data: setting } = await client
    .from("invitation_settings")
    .select("content")
    .eq("id", slug)
    .maybeSingle();
  const guestSlug = setting?.content?.guestPhotos?.uploadSlug || slug;
  const [invitationFiles, guestFiles] = await Promise.all([
    listStorageFolder(client, "invitation-media", `invitations/${slug}`).catch(() => []),
    listStorageFolder(client, "guest-photos", guestSlug).catch(() => []),
  ]);
  const invitationPaths = invitationFiles.map((file) => file.path);
  const guestPaths = guestFiles.map((file) => file.path);
  if (invitationPaths.length) await client.storage.from("invitation-media").remove(invitationPaths);
  if (guestPaths.length) await client.storage.from("guest-photos").remove(guestPaths);
  const { error: settingsError } = await client.from("invitation_settings").delete().eq("id", slug);
  if (settingsError) throw settingsError;
  const { error: siteError } = await client.from("invitation_sites").delete().eq("slug", slug);
  if (siteError) throw siteError;
}

async function optimizeInvitationImage(file) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.");
  }
  if (!("createImageBitmap" in window)) throw new Error("이 브라우저에서는 이미지 최적화를 지원하지 않습니다.");
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1200;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
    if (!blob) throw new Error("이미지를 WebP로 변환하지 못했습니다.");
    return blob;
  } catch {
    throw new Error("이미지를 최적화하지 못했습니다. JPG, PNG, WEBP 이미지를 다시 선택해 주세요.");
  }
}

async function uploadInvitationImage(file, slot) {
  const client = getSupabaseClient();
  if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) {
    throw new Error("20MB 이하 이미지 파일만 업로드할 수 있습니다.");
  }
  const optimized = await optimizeInvitationImage(file);
  if (!client) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("미리보기 이미지를 읽지 못했습니다."));
      reader.readAsDataURL(optimized);
    });
  }
  const role = mediaRoleFromSlot(slot);
  const path = `invitations/${getActiveInvitationSlug()}/${role.folder}/${role.filename}`;
  const { error } = await client.storage
    .from("invitation-media")
    .upload(path, optimized, { cacheControl: "31536000", contentType: "image/webp", upsert: true });
  if (error) throw error;
  return path;
}

async function uploadInvitationMedia(file, slot) {
  if (file.type.startsWith("image/")) return uploadInvitationImage(file, slot);
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type) || file.size > 50 * 1024 * 1024) {
    throw new Error("50MB 이하 MP4, WebM 또는 MOV 영상만 업로드할 수 있습니다.");
  }
  const extension = file.type === "video/webm" ? "webm" : file.type === "video/quicktime" ? "mov" : "mp4";
  const path = `invitations/${getActiveInvitationSlug()}/hero/hero-video.${extension}`;
  const { error } = await client.storage.from("invitation-media").upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: true });
  if (error) {
    if (/mime type|not supported/i.test(error.message || "")) {
      throw new Error("영상 MIME 정책이 적용되지 않았습니다. Supabase SQL Editor에서 supabase-guest-photo-policy-fix.sql을 다시 실행해 주세요.");
    }
    throw error;
  }
  return path;
}

async function uploadDesignAsset(file, slot = "asset") {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const fontTypes = ["font/woff", "font/woff2", "application/font-woff", "application/font-woff2", "application/x-font-woff", "application/x-font-woff2", "font/ttf", "font/otf", "application/x-font-ttf", "application/x-font-otf"];
  const inferredFontType = /\.(woff2?)$/i.test(file.name || "") ? `font/${file.name.split(".").pop().toLowerCase()}` : /\.(ttf|otf)$/i.test(file.name || "") ? `font/${file.name.split(".").pop().toLowerCase()}` : "";
  const contentType = file.type || inferredFontType;
  const allowed = ["image/svg+xml", "image/png", "image/webp", "image/jpeg", ...fontTypes];
  const isFont = fontTypes.includes(file.type) || /\.(woff2?|ttf|otf)$/i.test(file.name || "");
  const limit = isFont ? 4 * 1024 * 1024 : file.type === "image/svg+xml" ? 300 * 1024 : 2 * 1024 * 1024;
  if (!allowed.includes(contentType) || file.size > limit) {
    throw new Error("SVG는 300KB 이하, PNG/WebP/JPG는 2MB 이하, 폰트는 4MB 이하만 등록할 수 있습니다.");
  }
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `${slot}-${Date.now()}-${crypto.randomUUID?.() || "asset"}.${extension}`.replace(/[^a-z0-9가-힣._-]/gi, "-");
  const path = `invitations/${getActiveInvitationSlug()}/design-assets/${filename}`;
  const { error } = await client.storage.from("invitation-media").upload(path, file, { cacheControl: "3600", contentType, upsert: true });
  if (error) throw error;
  return path;
}

async function uploadGuestPhotos(files, onProgress = () => {}) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const session = await ensureGuestPhotoSession(client);
  const invitation = await loadInvitationData(window.INVITATION_DATA);
  const uploadSlug = invitation.guestPhotos?.uploadSlug || "wedding-day";
  const uploaded = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const isSupported = file.type.startsWith("image/") || ["video/mp4", "video/webm", "video/quicktime"].includes(file.type);
    if (!isSupported || file.size > 50 * 1024 * 1024) {
      throw new Error("사진 또는 영상은 파일당 50MB 이하 이미지, MP4, WebM, MOV만 업로드할 수 있습니다.");
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${uploadSlug}/${session.user.id}/${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${extension}`;
    const { error } = await client.storage
      .from("guest-photos")
      .upload(path, file, { cacheControl: "3600", contentType: file.type });
    if (error) {
      if (/row-level security|rls|mime type|not supported/i.test(error.message || "")) {
        throw new Error("사진·영상 업로드 권한 정책이 적용되지 않았습니다. Supabase SQL Editor에서 supabase-guest-photo-policy-fix.sql을 실행해 주세요.");
      }
      throw error;
    }
    uploaded.push(path);
    onProgress({ completed: index + 1, total: files.length, percent: Math.round(((index + 1) / files.length) * 100), path });
  }
  return uploaded;
}

async function ensureGuestPhotoSession(client) {
  const { data } = await client.auth.getSession();
  if (data.session) return data.session;
  const { data: signedIn, error } = await client.auth.signInAnonymously();
  if (error || !signedIn.session) {
    throw new Error("익명 파일 업로드 세션을 만들지 못했습니다. Supabase Authentication > Providers에서 Anonymous Sign-Ins가 활성화되어 있는지 확인해 주세요.");
  }
  return signedIn.session;
}

async function signedGuestPhotos(client, paths, files, expiresIn = 3600) {
  if (!paths.length) return [];
  const { data, error } = await client.storage.from("guest-photos").createSignedUrls(paths, expiresIn);
  if (error) throw error;
  return files.map((file, index) => ({ ...file, path: paths[index], signedUrl: data[index].signedUrl }));
}

async function listOwnGuestPhotos() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const session = await ensureGuestPhotoSession(client);
  const invitation = await loadInvitationData(window.INVITATION_DATA);
  const folder = `${invitation.guestPhotos?.uploadSlug || "wedding-day"}/${session.user.id}`;
  const folders = [folder, session.user.id];
  const results = await Promise.all(folders.map(async (target) => {
    const { data: files, error } = await client.storage
      .from("guest-photos")
      .list(target, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;
    return files.filter((file) => file.id).map((photo) => ({ ...photo, path: `${target}/${photo.name}` }));
  }));
  const photos = results.flat().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return signedGuestPhotos(client, photos.map((photo) => photo.path), photos);
}

async function listGuestPhotoFolder(client, folder = "") {
  const { data: entries, error } = await client.storage
    .from("guest-photos")
    .list(folder, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  if (error) throw error;
  const files = entries.filter((entry) => entry.id).map((entry) => ({ ...entry, path: folder ? `${folder}/${entry.name}` : entry.name }));
  const folders = entries.filter((entry) => !entry.id);
  const nested = await Promise.all(folders.map((entry) => listGuestPhotoFolder(client, folder ? `${folder}/${entry.name}` : entry.name)));
  return files.concat(...nested);
}

async function listGuestPhotos() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const invitation = await loadInvitationData(window.INVITATION_DATA);
  const folder = invitation.guestPhotos?.uploadSlug || getActiveInvitationSlug() || "wedding-day";
  const photos = (await listGuestPhotoFolder(client, folder)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return signedGuestPhotos(client, photos.map((photo) => photo.path), photos, 30 * 24 * 60 * 60);
}

async function removeOwnGuestPhoto(path) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  await ensureGuestPhotoSession(client);
  const { error } = await client.storage.from("guest-photos").remove([path]);
  if (error) throw error;
}

async function removeGuestPhoto(path) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const { error } = await client.storage.from("guest-photos").remove([path]);
  if (error) throw error;
}

window.RSVP_STORAGE = {
  getSupabaseClient,
  mediaPublicUrl,
  getActiveInvitationSlug,
  setActiveInvitationSlug,
  getCurrentInvitationSite,
  ensureInvitationForCurrentUser,
  signUpInvitationAdmin,
  signInWithProvider,
  listInvitationSites,
  setInvitationSiteDisabled,
  removeInvitationSite,
  loadInvitationData,
  loadDesignLibrary,
  saveDesignLibrary,
  loadGuestbookEntries,
  loadAdminGuestbookEntries,
  readLocalResponses,
  saveInvitationData,
  submitAttendanceResponse,
  submitGuestbookEntry,
  setGuestbookEntryHidden,
  listGuestPhotos,
  listOwnGuestPhotos,
  removeGuestPhoto,
  removeOwnGuestPhoto,
  uploadGuestPhotos,
  uploadDesignAsset,
  uploadInvitationImage,
  uploadInvitationMedia,
};
