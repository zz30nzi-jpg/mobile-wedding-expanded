const RSVP_LOCAL_KEY = "wedding-attendance-responses";
const GUESTBOOK_LOCAL_KEY = "wedding-guestbook-entries";

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

function normalizeInvitationData(fallback, saved) {
  const merged = mergeInvitationData(fallback, saved);
  const accounts = Array.isArray(merged.accounts) ? merged.accounts : [];
  const defaultAccounts = Array.isArray(fallback.accounts) ? fallback.accounts : [];
  const orderedAccounts = defaultAccounts.map((defaultAccount) => ({
    ...defaultAccount,
    ...(accounts.find((account) => account.side === defaultAccount.side && account.name === defaultAccount.name) || {}),
  }));
  const customAccounts = accounts.filter((account) =>
    !defaultAccounts.some((defaultAccount) => account.side === defaultAccount.side && account.name === defaultAccount.name));
  return window.WEDDING_DESIGN.normalize({ ...merged, accounts: [...orderedAccounts, ...customAccounts] });
}

async function submitAttendanceResponse(response) {
  const client = getSupabaseClient();
  if (!client) {
    saveLocalResponse(response);
    return { isPreview: true };
  }

  const { error } = await client.from("attendance_responses").insert(response);
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
  const { data, error } = await client.from("guestbook_entries").select("*").order("created_at", { ascending: false });
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
  if (!client) {
    const entries = readLocalGuestbookEntries();
    entries.unshift({ ...entry, id: crypto.randomUUID?.() || `preview-${Date.now()}`, created_at: new Date().toISOString() });
    localStorage.setItem(GUESTBOOK_LOCAL_KEY, JSON.stringify(entries.slice(0, 30)));
    return { isPreview: true };
  }
  const { error } = await client.from("guestbook_entries").insert(entry);
  if (error) throw error;
  return { isPreview: false };
}

async function loadInvitationData(fallback) {
  const client = getSupabaseClient();
  if (!client) return window.WEDDING_DESIGN.normalize(fallback);
  const { data, error } = await client
    .from("invitation_settings")
    .select("content")
    .eq("id", "main")
    .maybeSingle();
  if (error || !data?.content) return window.WEDDING_DESIGN.normalize(fallback);
  return normalizeInvitationData(fallback, data.content);
}

async function saveInvitationData(content) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const { error } = await client
    .from("invitation_settings")
    .upsert({ id: "main", content, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function optimizeInvitationImage(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (!("createImageBitmap" in window)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    return blob || file;
  } catch {
    return file;
  }
}

async function uploadInvitationImage(file, slot) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) {
    throw new Error("20MB 이하 이미지 파일만 업로드할 수 있습니다.");
  }
  const optimized = await optimizeInvitationImage(file);
  const extension = optimized.type === "image/webp" ? "webp" : file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${slot}/${Date.now()}-${crypto.randomUUID?.() || "image"}.${extension}`;
  const { error } = await client.storage
    .from("invitation-media")
    .upload(path, optimized, { cacheControl: "31536000", contentType: optimized.type || file.type });
  if (error) throw error;
  return client.storage.from("invitation-media").getPublicUrl(path).data.publicUrl;
}

async function uploadDesignAsset(file, slot = "asset") {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const allowed = ["image/svg+xml", "image/png", "image/webp", "image/jpeg"];
  const limit = file.type === "image/svg+xml" ? 300 * 1024 : 2 * 1024 * 1024;
  if (!allowed.includes(file.type) || file.size > limit) {
    throw new Error("SVG는 300KB 이하, PNG/WebP/JPG는 2MB 이하만 등록할 수 있습니다.");
  }
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `design-assets/${slot}/${Date.now()}-${crypto.randomUUID?.() || "asset"}.${extension}`;
  const { error } = await client.storage.from("invitation-media").upload(path, file, { cacheControl: "3600", contentType: file.type });
  if (error) throw error;
  return client.storage.from("invitation-media").getPublicUrl(path).data.publicUrl;
}

async function uploadGuestPhotos(files) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase가 연결되지 않았습니다.");
  const session = await ensureGuestPhotoSession(client);
  const invitation = await loadInvitationData(window.INVITATION_DATA);
  const uploadSlug = invitation.guestPhotos?.uploadSlug || "wedding-day";
  const uploaded = [];
  for (const file of files) {
    if (!file.type.startsWith("image/") || file.size > 50 * 1024 * 1024) {
      throw new Error("사진은 파일당 50MB 이하 이미지만 업로드할 수 있습니다.");
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${uploadSlug}/${session.user.id}/${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}.${extension}`;
    const { error } = await client.storage
      .from("guest-photos")
      .upload(path, file, { cacheControl: "3600", contentType: file.type });
    if (error) {
      if (/row-level security|rls/i.test(error.message || "")) {
        throw new Error("사진 업로드 권한 정책이 적용되지 않았습니다. Supabase SQL Editor에서 supabase-guest-photo-policy-fix.sql을 실행해 주세요.");
      }
      throw error;
    }
    uploaded.push(path);
  }
  return uploaded;
}

async function ensureGuestPhotoSession(client) {
  const { data } = await client.auth.getSession();
  if (data.session) return data.session;
  const { data: signedIn, error } = await client.auth.signInAnonymously();
  if (error || !signedIn.session) {
    throw new Error("익명 사진 업로드 세션을 만들지 못했습니다. Supabase Authentication > Providers에서 Anonymous Sign-Ins가 활성화되어 있는지 확인해 주세요.");
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
  const photos = (await listGuestPhotoFolder(client)).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
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
  loadInvitationData,
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
};
