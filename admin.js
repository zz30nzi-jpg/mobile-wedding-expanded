const adminApp = document.querySelector("#admin-app");
const escapeAdminHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const supabaseClient = window.RSVP_STORAGE.getSupabaseClient();
let invitationData = window.INVITATION_DATA;
const adminArea = document.body.dataset.adminArea === "super" ? "super" : "general";
const themes = ["beige", "sky", "pink", "gray", "black", "white", "green"];
const movieConcepts = ["none", "about_time", "la_la_land", "spirited_away", "you_are_the_apple"];
const heroDecorations = ["none", "doodle_hearts", "organic_heart", "wedding_rings", "poster_card"];
const heroTextThemes = ["auto", "default_center", "editorial_left", "minimal_center"];
let superSearchQuery = "";

function applyTheme(theme) {
  const selected = themes.includes(theme) ? theme : "sky";
  document.body.dataset.theme = selected;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getComputedStyle(document.body).getPropertyValue("--body-bg").trim());
}

function applyMovieConcept(movieConcept) {
  document.body.dataset.movieConcept = movieConcepts.includes(movieConcept) ? movieConcept : "none";
}

function applyHeroDecoration(heroDecoration) {
  document.body.dataset.heroDecoration = normalizedHeroDecoration(heroDecoration);
}

function applyHeroTextTheme(heroTextTheme) {
  document.body.dataset.heroTextTheme = heroTextThemes.includes(heroTextTheme) ? heroTextTheme : "auto";
}

function applyAppearance(appearance = {}) {
  if (adminArea === "super") {
    applyTheme("white");
    applyMovieConcept("none");
    applyHeroDecoration("none");
    applyHeroTextTheme("auto");
    return;
  }
  const legacyPoster = appearance.heroDecoration === "poster";
  applyTheme(appearance.theme);
  applyMovieConcept(appearance.movieConcept);
  applyHeroDecoration(legacyPoster ? "none" : appearance.heroDecoration);
  applyHeroTextTheme(legacyPoster && (!appearance.heroTextTheme || appearance.heroTextTheme === "auto") ? "editorial_left" : appearance.heroTextTheme);
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("ko-KR") : "";
}

function superOverview() {
  const system = invitationData.designSystem || {};
  const assets = system.assets || {};
  const themeCount = (system.themes || []).length;
  const assetCount = Object.values(assets).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0);
  const libraryCount = (system.aiLibrary || []).length;
  return `<section class="super-overview" aria-label="슈퍼관리자 요약">
    <div><strong>${themeCount}</strong><span>등록 테마</span></div>
    <div><strong>${assetCount}</strong><span>디자인 요소</span></div>
    <div><strong>${libraryCount}</strong><span>AI 생성물</span></div>
  </section>`;
}

function adminHeader(active) {
  const generalMenu = `<div class="admin-menu-group"><strong>일반 관리자</strong><nav class="admin-tabs">
      <button class="btn ${active === "editor" ? "btn-primary" : ""}" data-admin-view="editor">기본 설정</button>
      <button class="btn ${active === "design" ? "btn-primary" : ""}" data-admin-view="design">디자인</button>
      <button class="btn ${active === "copy" ? "btn-primary" : ""}" data-admin-view="copy-editor">편집</button>
      <button class="btn ${["content", "photos", "guestbook"].includes(active) ? "btn-primary" : ""}" data-admin-view="content">콘텐츠</button>
      <button class="btn" data-admin-view="share-settings">공유</button>
    </nav></div>`;
  const superMenu = `<div class="admin-menu-group admin-menu-super"><strong>슈퍼관리자</strong><nav class="admin-tabs">
      <button class="btn ${active === "themes" ? "btn-primary" : ""}" data-admin-view="themes">테마 생성 및 수정</button>
      <button class="btn ${active === "assets" ? "btn-primary" : ""}" data-admin-view="assets">디자인 요소 생성</button>
      <button class="btn ${active === "ai-settings" ? "btn-primary" : ""}" data-admin-view="ai-settings">AI 설정</button>
      <button class="btn ${active === "ai-library" ? "btn-primary" : ""}" data-admin-view="ai-library">AI 생성물 라이브러리</button>
    </nav></div>`;
  if (adminArea === "super") return `
    <aside class="super-sidebar">
      <div><p class="section-label">Super Admin</p><strong>Wedding Studio</strong></div>
      ${superMenu}
      <a class="btn" href="./admin.html">일반관리자 화면</a>
    </aside>
    <div class="admin-header super-topbar">
      <div><p class="section-label">Super Admin</p><h1>청첩장 슈퍼관리자</h1></div>
      <label class="super-search"><span>검색</span><input type="search" value="${escapeAdminHtml(superSearchQuery)}" placeholder="테마, 요소, 생성물 검색" data-super-search></label>
      <div class="admin-header-actions">
        <button class="btn" id="admin-logout">로그아웃</button>
      </div>
    </div>
    ${superOverview()}`;
  return `
    <div class="admin-header">
      <div><p class="section-label">Wedding Admin</p><h1>청첩장 일반관리자</h1></div>
      <div class="admin-header-actions">
        <button class="btn" id="admin-logout">로그아웃</button>
      </div>
    </div>
    ${generalMenu}
    ${active === "editor" ? '<button class="admin-floating-save" type="submit" form="invitation-editor"><span>✓</span> 변경사항 저장</button>' : ""}
    ${active === "design" ? '<button class="admin-floating-save" type="submit" form="design-application-form"><span>✓</span> 디자인 저장</button>' : ""}`;
}

function bindAdminNavigation() {
  document.querySelector("#admin-logout")?.addEventListener("click", async () => {
    if (!supabaseClient) return renderEditor("현재는 Supabase 연결 전 미리보기 모드입니다.");
    await supabaseClient.auth.signOut();
    renderLogin();
  });
  document.querySelectorAll("[data-admin-view]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.adminView === "editor") renderEditor();
      else if (button.dataset.adminView === "design") renderDesignApplication();
      else if (button.dataset.adminView === "copy-editor") renderEditor("", "copy");
      else if (button.dataset.adminView === "share-settings") renderEditor("", "share");
      else if (button.dataset.adminView === "content") renderContentHub();
      else if (button.dataset.adminView === "themes") renderThemeManager();
      else if (button.dataset.adminView === "assets") renderDesignAssets();
      else if (button.dataset.adminView === "ai-settings") renderAISettings();
      else if (button.dataset.adminView === "ai-library") renderAILibrary();
      else if (button.dataset.adminView === "photos") renderGuestPhotos();
      else if (button.dataset.adminView === "guestbook") renderGuestbookEntries();
      else renderResponses();
    });
  });
  document.querySelector("[data-super-search]")?.addEventListener("input", (event) => {
    superSearchQuery = event.currentTarget.value.trim().toLowerCase();
    applySuperSearch();
  });
  applySuperSearch();
}

function renderContentHub() {
  adminApp.innerHTML = `${adminHeader("content")}
    <section class="admin-card admin-hub">
      <p class="section-label">Content</p><h2>콘텐츠 관리</h2>
      <p class="admin-message">자주 확인하고 관리하는 콘텐츠를 한곳에 모았습니다.</p>
      <div class="admin-hub-grid">
        <button type="button" data-content-open="gallery"><strong>갤러리</strong><span>청첩장 사진 순서와 확대 방식을 관리합니다.</span></button>
        <button type="button" data-content-open="responses"><strong>참석 현황</strong><span>하객이 전달한 참석 여부와 동행 정보를 확인합니다.</span></button>
        <button type="button" data-content-open="photos"><strong>하객 사진·영상</strong><span>하객이 공유한 원본 파일을 저장하고 정리합니다.</span></button>
        <button type="button" data-content-open="guestbook"><strong>방명록</strong><span>축하 메시지를 확인하고 숨김 처리합니다.</span></button>
      </div>
    </section>`;
  bindAdminNavigation();
  document.querySelectorAll("[data-content-open]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.contentOpen === "gallery") renderEditor("", "gallery");
    else if (button.dataset.contentOpen === "responses") renderResponses();
    else if (button.dataset.contentOpen === "photos") renderGuestPhotos();
    else renderGuestbookEntries();
  }));
}

function applySuperSearch() {
  document.querySelectorAll(".theme-card, .asset-library-card, .asset-card").forEach((card) => {
    card.hidden = Boolean(superSearchQuery && !card.textContent.toLowerCase().includes(superSearchQuery));
  });
}

function renderLogin(message = "") {
  adminApp.innerHTML = `
    <section class="admin-card admin-login">
      <p class="section-label">${adminArea === "super" ? "Super Admin" : "Wedding Admin"}</p>
      <h1>${adminArea === "super" ? "청첩장 슈퍼관리자" : "청첩장 일반관리자"}</h1>
      <p class="admin-message">${escapeAdminHtml(message || "등록된 관리자 계정으로 로그인해 주세요.")}</p>
      <form class="form-grid" id="admin-login-form">
        <label class="field"><span>이메일</span><input name="email" type="email" required autocomplete="username"></label>
        <label class="field"><span>비밀번호</span><input name="password" type="password" required autocomplete="current-password"></label>
        <button class="btn btn-primary">로그인</button>
      </form>
    </section>`;
  document.querySelector("#admin-login-form").addEventListener("submit", login);
}

async function renderSetupNotice() {
  await loadInvitationData();
  if (adminArea === "super") return renderThemeManager();
  renderEditor("현재는 Supabase 연결 전 미리보기 모드입니다. 변경 내용은 이 브라우저에 저장되며 공개 청첩장을 새로고침하면 반영됩니다.");
}

function responsesView(responses, isPreview = false) {
  const attending = responses.filter((response) => response.attendance === "참석");
  const totalGuests = attending.reduce((sum, response) => sum + Number(response.total_count || 0), 0);
  const rooms = attending.filter((response) => response.needs_accommodation === "예").length;
  return `
    <section class="admin-card">
      <div class="admin-toolbar"><h2>${isPreview ? "테스트 응답" : "참석 응답"}</h2></div>
      <div class="admin-summary">
        <div><strong>${responses.length}</strong><span>전체 응답</span></div>
        <div><strong>${totalGuests}</strong><span>예상 참석 인원</span></div>
        <div><strong>${rooms}</strong><span>숙소 요청 건</span></div>
      </div>
      <div class="response-list">
        ${responses.length ? responses.map(responseCard).join("") : '<p class="admin-message">아직 전달된 참석 정보가 없습니다.</p>'}
      </div>
    </section>`;
}

function responseCard(response) {
  const companions = Array.isArray(response.companions) && response.companions.length
    ? response.companions.map((person) => escapeAdminHtml(person)).join(", ")
    : "없음";
  return `
    <article class="response-card">
      <h3>${escapeAdminHtml(response.guest_name)} <span class="badge">${escapeAdminHtml(response.attendance)}</span></h3>
      <p>${escapeAdminHtml(response.phone)}</p>
      ${response.attendance === "참석" ? `<p>출발지: ${escapeAdminHtml(response.origin)} · 이동: ${escapeAdminHtml(response.transport)} · 출발: ${escapeAdminHtml(response.departure_date)}
${response.travel_details ? `기타 이동 정보: ${escapeAdminHtml(response.travel_details)}
` : ""}총 ${escapeAdminHtml(response.total_count)}명 · 동행인: ${companions}
숙소 필요: ${escapeAdminHtml(response.needs_accommodation)}</p>` : ""}
      ${response.notes ? `<p>전달 사항: ${escapeAdminHtml(response.notes)}</p>` : ""}
      <p class="response-meta">${escapeAdminHtml(formatDate(response.created_at))}</p>
    </article>`;
}

function input(name, label, value = "", type = "text") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeAdminHtml(value)}"></label>`;
}

function textarea(name, label, value = "", rows = 3) {
  return `<label class="field"><span>${label}</span><textarea name="${name}" rows="${rows}">${escapeAdminHtml(value)}</textarea></label>`;
}

function select(name, label, value, options) {
  return `<label class="field"><span>${label}</span><select name="${name}">${options.map(([optionValue, text]) => `<option value="${escapeAdminHtml(optionValue)}" ${String(value) === optionValue ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
}

function appearancePresetValue(appearance = {}) {
  return appearance.movieConcept && appearance.movieConcept !== "none"
    ? `movie:${appearance.movieConcept}`
    : `theme:${appearance.theme || "sky"}`;
}

function appearancePresetField(appearance = {}) {
  const value = appearancePresetValue(appearance);
  const option = ([optionValue, text]) => `<option value="${optionValue}" ${value === optionValue ? "selected" : ""}>${text}</option>`;
  return `
    <label class="field concept-preset"><span>전체 디자인 프리셋</span>
      <select name="appearance.preset">
        <optgroup label="기본 컬러 테마">
          ${[["theme:beige", "베이지"], ["theme:sky", "하늘색"], ["theme:pink", "핑크"], ["theme:gray", "연한 회색"], ["theme:black", "블랙"], ["theme:white", "화이트"], ["theme:green", "그린"]].map(option).join("")}
        </optgroup>
        <optgroup label="영화 컨셉">
          ${[["movie:about_time", "어바웃타임"], ["movie:la_la_land", "라라랜드"], ["movie:spirited_away", "지브리 센과 치히로 무드"], ["movie:you_are_the_apple", "그 시절, 우리가 좋아했던 소녀 무드"]].map(option).join("")}
        </optgroup>
      </select>
      <input name="appearance.theme" type="hidden" value="${escapeAdminHtml(appearance.theme || "sky")}">
      <input name="appearance.movieConcept" type="hidden" value="${escapeAdminHtml(appearance.movieConcept || "none")}">
    </label>`;
}

function normalizedHeroDecoration(value = "none") {
  const legacyDecorations = { line_frame: "doodle_hearts", heart_frame: "organic_heart" };
  const selected = legacyDecorations[value] || value;
  return heroDecorations.includes(selected) ? selected : "none";
}

function heroDecorationField(value = "none") {
  const selected = normalizedHeroDecoration(value);
  const decorations = [
    ["none", "꾸밈 없음", "사진을 화면에 가득 채워 깔끔하게 보여줍니다."],
    ["doodle_hearts", "손그림 하트 낙서", "하트와 꽃, 반짝임을 사진 위에 가볍게 흩뿌립니다."],
    ["organic_heart", "유기적 하트 프레임", "손으로 그린 듯한 큰 하트 라인이 사진을 감쌉니다."],
    ["wedding_rings", "웨딩 링 리본", "반지와 리본, 작은 하트로 청첩장다운 테두리를 만듭니다."],
    ["poster_card", "포스터 카드", "여백과 둥근 사진 틀을 사용해 에디토리얼 포스터처럼 표현합니다."],
  ];
  return `
    <fieldset class="hero-decoration-field">
      <legend>메인 이미지 꾸밈</legend>
      <p class="admin-message">사진 위에 더할 웨딩 그래픽을 선택해 주세요. 선택한 꾸밈만 표시됩니다.</p>
      <div class="hero-decoration-list">
        ${decorations.map(([optionValue, label, description]) => `
          <label class="hero-decoration-option">
            <input type="radio" name="appearance.heroDecoration" value="${optionValue}" ${selected === optionValue ? "checked" : ""}>
            <span class="hero-decoration-preview" data-decoration-preview="${optionValue}"><i></i></span>
            <span class="hero-decoration-copy"><strong>${label}</strong><small>${description}</small></span>
          </label>`).join("")}
      </div>
    </fieldset>`;
}

function imageField(name, label, value = "") {
  const isProfile = ["couple.groom.photo", "couple.bride.photo"].includes(name);
  return `
    <div class="image-field ${isProfile ? "image-field-profile" : ""}">
      <input name="${name}" type="hidden" value="${escapeAdminHtml(value)}">
      <div class="image-preview" data-image-preview="${name}">
        ${value ? `<img src="${escapeAdminHtml(value)}" alt="${label} 미리보기">` : '<span>등록된 사진이 없습니다.</span>'}
      </div>
      <div class="image-field-controls">
        <strong>${label}</strong>
        <span class="micro-help">휴대폰 갤러리에서 한 장을 선택해 주세요.</span>
        <div class="image-actions">
          <label class="btn image-upload">${value ? "변경" : "＋ 선택"}<input type="file" accept="image/*" data-image-target="${name}"></label>
          ${isProfile && value ? `<button class="btn" type="button" data-image-crop-edit="${name}">영역 맞추기</button>` : ""}
          <button class="btn" type="button" data-image-remove="${name}">× 제거</button>
        </div>
      </div>
    </div>`;
}

function videoField(name, label, value = "") {
  return `
    <div class="image-field">
      <input name="${name}" type="hidden" value="${escapeAdminHtml(value)}">
      <div class="image-preview" data-video-preview="${name}">
        ${value ? `<video src="${escapeAdminHtml(value)}" muted controls playsinline></video>` : '<span>등록된 영상이 없습니다.</span>'}
      </div>
      <div class="image-field-controls">
        <strong>${label}</strong>
        <span class="micro-help">MP4, WebM 또는 MOV 영상을 선택해 주세요. 영상 로드가 어려운 기기에서는 메인 사진이 대신 표시됩니다.</span>
        <div class="image-actions">
          <label class="btn image-upload">＋ 영상 선택<input type="file" accept="video/mp4,video/webm,video/quicktime" data-video-target="${name}"></label>
          <button class="btn" type="button" data-video-remove="${name}">× 제거</button>
        </div>
      </div>
    </div>`;
}

async function decodeCropImage(file) {
  try {
    if ("createImageBitmap" in window) return await createImageBitmap(file);
  } catch {}
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function cropProfileImage(file) {
  let currentFile = file;
  let bitmap = await decodeCropImage(currentFile);
  let previewUrl = URL.createObjectURL(currentFile);
  const root = document.createElement("div");
  root.className = "image-crop-backdrop";
  root.innerHTML = `<section class="image-crop-modal">
    <h2>대표사진 영역 맞추기</h2>
    <p class="micro-help">사진을 확대하고 보여줄 영역을 맞춘 뒤 적용해 주세요.</p>
    <div class="image-crop-preview" style="--crop-x:50%;--crop-y:50%"><img src="${escapeAdminHtml(previewUrl)}" alt="대표사진 자르기 미리보기"></div>
    <label class="btn image-upload">새 사진 업로드<input type="file" accept="image/*" data-crop-replace></label>
    <label class="field"><span>확대</span><input type="range" min="100" max="220" value="100" data-crop-zoom></label>
    <label class="field"><span>좌우 중심</span><input type="range" min="0" max="100" value="50" data-crop-x></label>
    <label class="field"><span>상하 중심</span><input type="range" min="0" max="100" value="50" data-crop-y></label>
    <div class="modal-actions"><button class="btn" type="button" data-crop-cancel>취소</button><button class="btn btn-primary" type="button" data-crop-apply>적용</button></div>
  </section>`;
  document.body.append(root);
  const preview = root.querySelector(".image-crop-preview");
  const previewImage = preview.querySelector("img");
  const zoom = root.querySelector("[data-crop-zoom]");
  const x = root.querySelector("[data-crop-x]");
  const y = root.querySelector("[data-crop-y]");
  const update = () => {
    preview.style.setProperty("--crop-x", `${x.value}%`);
    preview.style.setProperty("--crop-y", `${y.value}%`);
    preview.style.setProperty("--crop-zoom", Number(zoom.value) / 100);
  };
  zoom.addEventListener("input", update);
  x.addEventListener("input", update);
  y.addEventListener("input", update);
  root.querySelector("[data-crop-replace]").addEventListener("change", async (event) => {
    const replacement = event.currentTarget.files[0];
    if (!replacement) return;
    bitmap.close?.();
    URL.revokeObjectURL(previewUrl);
    currentFile = replacement;
    bitmap = await decodeCropImage(currentFile);
    previewUrl = URL.createObjectURL(currentFile);
    previewImage.src = previewUrl;
    zoom.value = "100";
    x.value = "50";
    y.value = "50";
    update();
  });
  return new Promise((resolve) => {
    const finish = (result) => {
      bitmap.close?.();
      URL.revokeObjectURL(previewUrl);
      root.remove();
      resolve(result);
    };
    root.querySelector("[data-crop-cancel]").addEventListener("click", () => finish(null));
    root.querySelector("[data-crop-apply]").addEventListener("click", async () => {
      const ratio = 4 / 5;
      const sourceRatio = bitmap.width / bitmap.height;
      const scale = Number(zoom.value) / 100;
      const cropWidth = (sourceRatio > ratio ? bitmap.height * ratio : bitmap.width) / scale;
      const cropHeight = (sourceRatio > ratio ? bitmap.height : bitmap.width / ratio) / scale;
      const sourceX = (bitmap.width - cropWidth) * Number(x.value) / 100;
      const sourceY = (bitmap.height - cropHeight) * Number(y.value) / 100;
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 1200;
      canvas.getContext("2d").drawImage(bitmap, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((done) => canvas.toBlob(done, "image/webp", 0.88));
      finish(blob ? new File([blob], `${currentFile.name.replace(/\.[^.]+$/, "")}-crop.webp`, { type: "image/webp" }) : currentFile);
    });
  });
}

function galleryManager(images) {
  const slots = Array.from({ length: 20 }, (_, index) => images[index] || "");
  return `
    <div class="gallery-manager">
      ${slots.map((image, index) => `<input name="gallery.${index}" type="hidden" value="${escapeAdminHtml(image)}">`).join("")}
      <div class="gallery-manager-actions">
        <label class="btn btn-primary image-upload">갤러리 사진 선택<input type="file" accept="image/*" multiple data-gallery-upload></label>
        <button class="btn" type="button" data-gallery-clear>전체 비우기</button>
      </div>
      <p class="admin-message" data-gallery-status>최대 20장을 한 번에 선택할 수 있습니다. 새로 선택하면 기존 갤러리를 교체합니다.</p>
      <div class="gallery-manager-grid" data-gallery-editor-preview>
        ${galleryManagerPreview(slots)}
      </div>
    </div>`;
}

function galleryManagerPreview(images) {
  const photos = images.filter(Boolean);
  return photos.length
    ? photos.map((image, index) => `
      <article class="gallery-manager-item">
        <img src="${escapeAdminHtml(image)}" alt="갤러리 ${index + 1} 미리보기">
        <button class="btn" type="button" data-gallery-remove="${index}">삭제</button>
      </article>`).join("")
    : '<p class="admin-message">등록된 갤러리 사진이 없습니다.</p>';
}

function copyEditorVisual(key) {
  if (key === "invitation") return `<div class="copy-editor-notice">${invitationData.invitation.paragraphs.map((text) => `<p>${escapeAdminHtml(text)}</p>`).join("")}</div>`;
  if (key === "aboutUs") return `<div class="copy-editor-profile-grid">${[invitationData.couple.groom, invitationData.couple.bride].map((person) => `<img src="${escapeAdminHtml(person.photo)}" alt="">`).join("")}</div>`;
  if (key === "gallery") return `<div class="copy-editor-gallery">${invitationData.gallery.filter(Boolean).slice(0, 4).map((photo) => `<img src="${escapeAdminHtml(photo)}" alt="">`).join("")}</div>`;
  if (key === "location") return `<div class="copy-editor-location"><strong>${escapeAdminHtml(invitationData.wedding.venue)}</strong><span>${escapeAdminHtml(invitationData.wedding.hall || "")}</span><small>${escapeAdminHtml(invitationData.wedding.address)}</small></div>`;
  if (key === "weddingDay") return `<p class="copy-editor-date">${escapeAdminHtml(invitationData.wedding.displayDate)}</p>`;
  if (key === "information") return `<div class="copy-editor-notice">${invitationData.notices.filter((notice) => !notice.hidden).slice(0, 1).map((notice) => `<strong>${escapeAdminHtml(notice.title)}</strong><p>${escapeAdminHtml(notice.text)}</p>`).join("")}</div>`;
  if (key === "weddingSnap") return '<div class="copy-editor-notice"><strong>Guest Album</strong><p>예식 당일 함께한 사진과 영상을 공유해 주세요.</p></div>';
  if (key === "attendance") return '<div class="copy-editor-notice"><p>신랑, 신부에게 참석 의사를 미리 전달할 수 있어요.</p></div>';
  if (key === "account") return `<div class="copy-editor-notice">${invitationData.accounts.slice(0, 2).map((account) => `<p><strong>${escapeAdminHtml(account.side)}</strong> ${escapeAdminHtml(account.bank)} ${escapeAdminHtml(account.number)}</p>`).join("")}</div>`;
  if (key === "guestbook") return '<div class="copy-editor-notice"><p>따뜻한 축하 메시지를 남겨 주세요.</p></div>';
  return "";
}

function listText(items, fields) {
  return items.map((item) => fields.map((field) => item[field] || "").join(" | ")).join("\n");
}

function parseList(value, fields) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const values = line.split("|").map((part) => part.trim());
    return Object.fromEntries(fields.map((field, index) => [field, values[index] || ""]));
  });
}

const validSectionIds = ["invitation", "about-us", "wedding-day", "location", "gallery", "wedding-snap", "information", "attendance", "account", "guestbook"];
const sectionLabels = {
  invitation: "초대글",
  "about-us": "두 사람 소개",
  "wedding-day": "예식일",
  location: "오시는 길",
  gallery: "갤러리",
  "wedding-snap": "하객 사진·영상 업로드",
  information: "식장 안내",
  attendance: "참석 여부",
  account: "마음 전하기",
  guestbook: "방명록",
};
const venuePresets = [
  {
    names: ["그랜드 머큐어 앰배서더 창원", "창원 그랜드머큐어 호텔웨딩", "그랜드머큐어 창원"],
    address: "경상남도 창원시 성산구 원이대로 332",
    transport: [
      { title: "지하철 · 기차", text: "KTX 창원중앙역 또는 창원역에서 호텔까지 차량으로 약 10분입니다." },
      { title: "버스", text: "창원고속버스터미널에서 호텔까지 차량으로 약 10분입니다. 버스 노선은 변동될 수 있으니 지도 앱에서 최신 경로를 확인해 주세요." },
      { title: "자가용 · 주차", text: "내비게이션에 '그랜드 머큐어 앰배서더 창원' 또는 주소를 입력해 주세요. 주차 안내는 예식 전 호텔에 확인해 주세요." },
    ],
  },
];
const noticePresets = [
  ["", "직접 입력"],
  ["meal", "식사 안내"],
  ["parking", "주차 안내"],
  ["photo", "사진 촬영 안내"],
  ["flower", "화환 안내"],
];
const noticePresetValues = {
  meal: { title: "식사 안내", text: "예식 전후로 연회장을 편하게 이용해 주세요." },
  parking: { title: "주차 안내", text: "주차 등록은 예식장 로비 키오스크에서 가능합니다." },
  photo: { title: "사진 촬영 안내", text: "예식 중 사진 촬영은 다른 하객의 관람에 방해되지 않도록 부탁드립니다." },
  flower: { title: "화환 안내", text: "축하 화환은 정중히 사양합니다. 따뜻한 마음만 감사히 받겠습니다." },
};
const bankOptions = ["", "국민은행", "신한은행", "우리은행", "하나은행", "농협은행", "기업은행", "카카오뱅크", "토스뱅크", "새마을금고", "부산은행", "경남은행", "직접 입력"];

function sectionOrderText(items = []) {
  return items.join("\n");
}

function parseSectionOrder(value) {
  return value.split("\n")
    .map((item) => item.trim())
    .filter((item, index, items) => validSectionIds.includes(item) && items.indexOf(item) === index);
}

function sectionOrderEditor(name, label, selected = []) {
  const ordered = [...selected.filter((id) => validSectionIds.includes(id)), ...validSectionIds.filter((id) => !selected.includes(id))];
  return `
    <div class="section-order-editor" data-section-order>
      <strong>${label}</strong>
      <input type="hidden" name="${name}" value="${escapeAdminHtml(sectionOrderText(selected))}">
      <div class="section-order-list">
        ${ordered.map((id) => `
          <div class="section-order-item" data-section-id="${id}">
            <label><input type="checkbox" ${selected.includes(id) ? "checked" : ""}> <span>${sectionLabels[id]}</span></label>
            <div>
              <button class="btn" type="button" data-section-move="-1" aria-label="${sectionLabels[id]} 위로 이동">↑</button>
              <button class="btn" type="button" data-section-move="1" aria-label="${sectionLabels[id]} 아래로 이동">↓</button>
            </div>
          </div>`).join("")}
      </div>
    </div>`;
}

function weddingDateInputValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function weddingDateIso(value) {
  return value ? `${value}:00+09:00` : "";
}

function birthdayInputValue(value = "") {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function birthdayDisplayValue(value = "") {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

function weddingDisplayDate(value, format = "long_ko") {
  if (!value) return "";
  const date = new Date(weddingDateIso(value));
  if (Number.isNaN(date.getTime())) return "";
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const day = weekdays[date.getDay()];
  const year = date.getFullYear();
  const shortYear = String(year).slice(2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateOfMonth = String(date.getDate()).padStart(2, "0");
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  const period = hour < 12 ? "오전" : "오후";
  const twelveHour = hour % 12 || 12;
  if (format === "short_ko") return `${shortYear}-${month}-${dateOfMonth} (${day}) ${String(hour).padStart(2, "0")}시 ${minute}분`;
  if (format === "dot_numeric") return `${year}.${month}.${dateOfMonth} (${day}) ${String(hour).padStart(2, "0")}:${minute}`;
  if (format === "english") return `${year}. ${month}. ${dateOfMonth}. ${day}요일 · ${String(hour).padStart(2, "0")}:${minute}`;
  return `${year}. ${month}. ${dateOfMonth}. ${day}요일 ${period} ${twelveHour}시 ${minute}분`;
}

function venueMapSearchUrl(value) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(value)}`;
}

function findVenuePreset(value) {
  const normalized = value.replace(/\s+/g, "").toLowerCase();
  return venuePresets.find((preset) => preset.names.some((name) => normalized.includes(name.replace(/\s+/g, "").toLowerCase())));
}

function mapLinksFor(venue, address) {
  const query = encodeURIComponent(address.trim() || venue.trim());
  return [
    { label: "네이버 지도", url: `https://map.naver.com/p/search/${query}` },
    { label: "카카오맵", url: `https://map.kakao.com/link/search/${query}` },
    { label: "티맵", url: `https://www.tmap.co.kr/tmap2/mobile/route.jsp?name=${query}` },
  ];
}

function parentNames(value = "") {
  return value.split("·").map((item) => item.trim());
}

function quickInput(key, label, value = "", type = "text") {
  return `<label class="field"><span>${label}</span><input type="${type}" value="${escapeAdminHtml(value)}" data-quick="${key}"></label>`;
}

function recommendationEditor(name, label, value, items, isTextarea = false, useModal = false) {
  return `
    <div class="recommendation-editor" data-recommendation-editor>
      ${isTextarea ? textarea(name, label, value, 6) : input(name, label, value)}
      ${useModal
        ? `<button class="btn recommendation-open" type="button" data-recommendation-open>추천 문구 목록에서 선택</button>
          <div class="recommendation-modal" hidden>
            <div class="recommendation-modal-head"><strong>${label} 추천</strong><button class="btn" type="button" data-recommendation-close>닫기</button></div>
            <div class="recommendation-modal-list">${items.map((item) => `<button class="recommendation-modal-option" type="button" data-recommendation="${escapeAdminHtml(item)}">${escapeAdminHtml(item)}</button>`).join("")}</div>
          </div>`
        : `<div class="recommendation-options">
            ${items.map((item, index) => `<button class="recommendation-option ${index > 2 ? "is-extra" : ""}" type="button" data-recommendation="${escapeAdminHtml(item)}">${escapeAdminHtml(item)}</button>`).join("")}
            <button class="recommendation-more" type="button" data-recommendation-more aria-label="${label} 추천 더 보기">＋</button>
          </div>`}
    </div>`;
}

function recommendationSets(groom, bride) {
  return {
    hero: ["our wedding day", "together, always", "a beautiful beginning", "with love, forever", "our favorite day", "the start of us"],
    title: [`${groom.name} ♥ ${bride.name} 결혼합니다`, `${groom.name} · ${bride.name}의 결혼식`, `저희 두 사람, 결혼합니다`, `함께하는 첫날에 초대합니다`, `우리의 새로운 시작`, `소중한 날, 함께해 주세요`],
    invitationTitle: ["소중한 분들을 초대합니다", "저희의 시작을 함께해 주세요", "따뜻한 축복으로 함께해 주세요", "두 사람이 하나 되는 날", "기쁜 날에 모시고 싶습니다", "함께해 주시면 감사하겠습니다"],
    invitationParagraphs: [
      "저희 두 사람이 서로의 가장 가까운 사람이 되어\n새로운 시작을 함께하려 합니다.\n소중한 자리에 함께해 주세요.",
      "서로를 아끼고 사랑하며\n평생의 동반자로 걸어가려 합니다.\n따뜻한 축복을 나누어 주세요.",
      "좋은 날, 좋은 분들과 함께\n저희의 첫걸음을 내딛고 싶습니다.\n귀한 걸음으로 자리를 빛내 주세요.",
      "오랜 시간 곁을 지켜준 두 사람이\n이제 한 가족이 되려 합니다.\n기쁜 마음으로 함께해 주세요.",
      "서로의 하루를 다정히 지켜주며\n평생을 함께 살아가겠습니다.\n저희의 시작을 축복해 주세요.",
      "설레는 마음으로 새로운 계절을 맞이합니다.\n두 사람의 약속이 오래도록 빛날 수 있도록\n함께해 주세요.",
      "각자의 자리에서 서로 다른 시간을 걸어온 저희가\n이제 같은 방향을 바라보며 한 걸음씩 나아가려 합니다.\n저희 두 사람의 새로운 출발을 따뜻한 마음으로 지켜봐 주세요.",
      "처음 만난 날의 설렘과 함께 웃었던 수많은 순간을 간직하며\n서로의 가장 좋은 친구이자 든든한 가족이 되기로 약속했습니다.\n소중한 분들과 이 기쁨을 함께 나누고 싶습니다.",
      "서로의 평범한 하루를 특별하게 만들어 준 두 사람이\n이제 매일의 기쁨과 어려움까지 함께 나누려 합니다.\n귀한 걸음으로 저희의 첫날을 축복해 주세요.",
    ],
  };
}

function noticeEditor(notice = {}, index = 0) {
  return `
    <div class="notice-editor" data-notice-editor>
      <div class="notice-editor-head"><strong>식장 안내 ${index + 1}</strong><button class="icon-btn" type="button" data-notice-remove aria-label="식장 안내 ${index + 1} 삭제">−</button></div>
      ${select(`noticePreset.${index}`, `식장 안내 ${index + 1} 추천`, "", noticePresets)}
      ${input(`notice.${index}.title`, "제목", notice.title || "")}
      ${textarea(`notice.${index}.text`, "내용", notice.text || "", 2)}
      <label class="consent"><input type="checkbox" name="notice.${index}.hidden" ${notice.hidden ? "checked" : ""}> <span>청첩장에서 숨기기</span></label>
    </div>`;
}

function noticeManager(notices = []) {
  return `
    <section class="editor-subsection"><div class="editor-subsection-head"><strong>식장 안내</strong><span>식사, 주차, 촬영 등 하객에게 알릴 내용을 관리합니다.</span></div>
    <div class="notice-manager" data-notice-manager>
      <div class="notice-manager-list" data-notice-list>${notices.slice(0, 3).map(noticeEditor).join("")}</div>
      <button class="btn notice-add" type="button" data-notice-add>＋ 식장 안내 추가</button>
    </div></section>`;
}

function transportEditor(item = {}, index = 0) {
  return `
    <div class="notice-editor" data-transport-editor>
      <div class="notice-editor-head"><strong>교통 안내 ${index + 1}</strong><button class="icon-btn" type="button" data-transport-remove aria-label="교통 안내 ${index + 1} 삭제">×</button></div>
      ${input(`transport.${index}.title`, "제목", item.title || "")}
      ${textarea(`transport.${index}.text`, "내용", item.text || "", 2)}
      <label class="consent"><input type="checkbox" name="transport.${index}.hidden" ${item.hidden ? "checked" : ""}> <span>청첩장에서 숨기기</span></label>
    </div>`;
}

function transportManager(items = []) {
  return `
    <section class="editor-subsection"><div class="editor-subsection-head"><strong>교통 안내</strong><span>대중교통과 주차 정보를 항목별로 수정하거나 숨길 수 있습니다.</span></div>
    <div class="notice-manager" data-transport-manager>
      <div class="notice-manager-list" data-transport-list>${items.map(transportEditor).join("")}</div>
      <button class="btn notice-add" type="button" data-transport-add>＋ 교통 안내 추가</button>
    </div></section>`;
}

function ensureAccountRows(accounts = []) {
  const defaults = window.INVITATION_DATA.accounts || [];
  const ordered = defaults.map((fallback) => ({
    ...fallback,
    ...(accounts.find((account) => account.side === fallback.side && account.name === fallback.name) || {}),
  }));
  const custom = accounts.filter((account) =>
    !defaults.some((fallback) => account.side === fallback.side && account.name === fallback.name));
  return [...ordered, ...custom];
}

function accountManager(accounts = []) {
  const groups = ["신랑측", "신부측"];
  const accountEditor = (account, index, roleIndex) => `
    <div class="account-editor">
      <div class="account-editor-head"><strong>${escapeAdminHtml(account.name)}</strong><span>${roleIndex === 0 ? "당사자" : roleIndex === 1 ? "아버지" : roleIndex === 2 ? "어머니" : "추가 계좌"}</span></div>
      <input type="hidden" name="account.${index}.side" value="${escapeAdminHtml(account.side)}">
      <input type="hidden" name="account.${index}.name" value="${escapeAdminHtml(account.name)}">
      ${select(`account.${index}.bankSelect`, "은행 선택", bankOptions.includes(account.bank) ? account.bank : account.bank ? "직접 입력" : "", bankOptions.map((bank) => [bank, bank || "은행을 선택해 주세요"]))}
      ${input(`account.${index}.bank`, "은행명", account.bank)}
      ${input(`account.${index}.number`, "계좌번호", account.number)}
      ${input(`account.${index}.relation`, "이름 옆 관계", account.relation || "")}
    </div>`;
  return `
    <section class="editor-subsection"><div class="editor-subsection-head"><strong>계좌 안내</strong><span>마음 전하기 섹션에 표시할 계좌 정보를 입력합니다.</span></div>
    <div class="account-manager">
      ${groups.map((side) => `
        <section class="account-side-group">
          <div class="account-side-head"><strong>${side}</strong><span>${side === "신랑측" ? "신랑 가족 계좌" : "신부 가족 계좌"}</span></div>
          <div class="account-side-list">
            ${accounts.map((account, index) => ({ account, index })).filter(({ account }) => account.side === side).map(({ account, index }, roleIndex) => accountEditor(account, index, roleIndex)).join("")}
          </div>
        </section>`).join("")}
    </div></section>`;
}

function renderEditor(message = "", focus = "") {
  window.WEDDING_DESIGN?.normalize(invitationData);
  invitationData.accounts = ensureAccountRows(invitationData.accounts);
  const { groom, bride } = invitationData.couple;
  const [groomFather = "", groomMother = ""] = parentNames(groom.parents);
  const [brideFather = "", brideMother = ""] = parentNames(bride.parents);
  const recommendations = recommendationSets(groom, bride);
  const gallery = Array.from({ length: 20 }, (_, index) => invitationData.gallery[index] || "");
  adminApp.innerHTML = `
    ${adminHeader(focus === "copy" ? "copy" : "editor")}
    <section class="admin-card">
      <div class="admin-editor-intro">
        <div><p class="section-label">Wedding Workspace</p><h2>청첩장 편집</h2></div>
        <span class="admin-mode-badge">모바일 편집</span>
      </div>
      <p class="admin-message">${escapeAdminHtml(message || "수정 후 맨 아래 저장 버튼을 눌러 주세요. 사진은 선택하면 즉시 업로드됩니다.")}</p>
      <nav class="admin-quick-actions" aria-label="빠른 편집">
        <button type="button" data-editor-jump="couple-settings"><strong>기본 정보</strong><span>두 사람과 예식 정보</span></button>
        <button type="button" data-editor-jump="transport-settings"><strong>오시는 길</strong><span>지하철·버스·자가용</span></button>
        <button type="button" data-editor-jump="share-settings"><strong>공유 설정</strong><span>대표 이미지와 SEO</span></button>
      </nav>
      <form class="editor-form" id="invitation-editor">
        <fieldset id="couple-settings"><legend>가장 먼저 입력해 주세요</legend>
          <p class="admin-message">여기에서 입력한 이름, 부모님 성함, 식장과 예식 일시는 아래 세부 설정에 자동으로 반영됩니다.</p>
          <div class="quick-input-grid">
            ${quickInput("couple.groom.name", "신랑 이름", groom.name)}
            ${quickInput("couple.bride.name", "신부 이름", bride.name)}
            ${quickInput("groomFather", "신랑 아버지", groomFather)}
            ${quickInput("brideFather", "신부 아버지", brideFather)}
            ${quickInput("groomMother", "신랑 어머니", groomMother)}
            ${quickInput("brideMother", "신부 어머니", brideMother)}
            ${quickInput("couple.groom.birthday", "신랑 생일", birthdayInputValue(groom.birthday), "date")}
            ${quickInput("couple.bride.birthday", "신부 생일", birthdayInputValue(bride.birthday), "date")}
            ${quickInput("wedding.venue", "식장 이름", invitationData.wedding.venue)}
            ${quickInput("wedding.hall", "홀 정보", invitationData.wedding.hall || "")}
            ${quickInput("wedding.date", "예식 일시", weddingDateInputValue(invitationData.wedding.date), "datetime-local")}
          </div>
        </fieldset>
        <fieldset id="share-settings"><legend>공유와 대표 이미지</legend>
          ${recommendationEditor("hero.eyebrow", "메인 영문 문구", invitationData.hero.eyebrow, recommendations.hero)}
          ${recommendationEditor("meta.title", "페이지 제목", invitationData.meta.title, recommendations.title)}
          ${imageField("hero.image", "메인 사진", invitationData.hero.image)}
          ${videoField("hero.video", "메인 영상 (선택)", invitationData.hero.video || "")}
          ${imageField("meta.shareImage", "카카오톡 공유 대표 이미지 (선택 · 세로 3:4 권장)", invitationData.meta.shareImage || "")}
          <p class="admin-message micro-help">공유 대표 이미지를 등록하지 않으면 메인 사진이 자동으로 동일하게 적용됩니다. 카카오톡 카드에 별도 세로 사진을 사용하려면 600 x 800px 또는 같은 3:4 비율 이미지를 등록해 주세요.</p>
          ${textarea("meta.description", "공유 설명", invitationData.meta.description)}
          <p class="admin-message micro-help">카카오톡으로 링크를 보낼 때 대표 이미지 아래에 함께 표시되는 소개 문구입니다. 청첩장 본문에는 표시되지 않습니다.</p>
        </fieldset>
        <div class="couple-editor-grid">
        <fieldset class="couple-editor-card"><legend>신랑 정보</legend>
          <div class="auto-filled-fields">
          ${input("couple.groom.name", "이름 · 위에서 자동 반영", groom.name)}
          ${input("couple.groom.parents", "부모님 성함 · 위에서 자동 반영", groom.parents)}
          ${input("couple.groom.birthday", "생일 · 위에서 자동 반영", birthdayInputValue(groom.birthday), "date")}
          </div>
          ${input("couple.groom.relation", "부모님 성함 뒤 관계 문구 · 직접 수정", groom.relation)}
          ${input("couple.groom.phone", "연락처", groom.phone)}
          ${input("couple.groom.mbti", "MBTI", groom.mbti)}
          ${input("couple.groom.tags", "태그, 쉼표로 구분", groom.tags.join(", "))}
          ${imageField("couple.groom.photo", "신랑 사진", groom.photo)}
        </fieldset>
        <fieldset class="couple-editor-card"><legend>신부 정보</legend>
          <div class="auto-filled-fields">
          ${input("couple.bride.name", "이름 · 위에서 자동 반영", bride.name)}
          ${input("couple.bride.parents", "부모님 성함 · 위에서 자동 반영", bride.parents)}
          ${input("couple.bride.birthday", "생일 · 위에서 자동 반영", birthdayInputValue(bride.birthday), "date")}
          </div>
          ${input("couple.bride.relation", "부모님 성함 뒤 관계 문구 · 직접 수정", bride.relation)}
          ${input("couple.bride.phone", "연락처", bride.phone)}
          ${input("couple.bride.mbti", "MBTI", bride.mbti)}
          ${input("couple.bride.tags", "태그, 쉼표로 구분", bride.tags.join(", "))}
          ${imageField("couple.bride.photo", "신부 사진", bride.photo)}
        </fieldset>
        </div>
        <fieldset><legend>예식 정보</legend>
          <div class="auto-filled-fields">
          ${input("wedding.date", "예식 일시 · 위에서 자동 반영", weddingDateInputValue(invitationData.wedding.date), "datetime-local")}
          ${input("wedding.venue", "식장 이름 · 위에서 자동 반영", invitationData.wedding.venue)}
          ${input("wedding.hall", "홀 정보 · 식장 이름 아래 줄에 표시", invitationData.wedding.hall || "")}
          </div>
          ${select("wedding.displayDateFormat", "화면 표시 일시 형식", invitationData.wedding.displayDateFormat || "long_ko", [["long_ko", "2026. 10. 04. 일요일 오후 12시 20분"], ["short_ko", "26-10-04 (일) 12시 20분"], ["dot_numeric", "2026.10.04 (일) 12:20"], ["english", "2026. 10. 04. 일요일 · 12:20"], ["custom", "직접 입력"]])}
          ${input("wedding.displayDateCustom", "화면 표시 일시 · 선택 후 수정 가능", invitationData.wedding.displayDateCustom || invitationData.wedding.displayDate)}
          ${input("wedding.address", "주소", invitationData.wedding.address)}
          <div class="venue-actions">
            <a class="btn" href="${escapeAdminHtml(venueMapSearchUrl(invitationData.wedding.venue))}" target="_blank" rel="noopener" data-venue-map>지도에서 확인</a>
            <button class="btn" type="button" data-address-focus>주소 직접 입력</button>
          </div>
          <p class="admin-message" data-venue-status>등록된 식장은 이름을 입력하면 주소가 자동으로 채워집니다. 다른 식장은 지도에서 확인 후 주소를 직접 입력해 주세요.</p>
        </fieldset>
        <fieldset id="transport-settings"><legend>오시는 길</legend>
          <p class="admin-message">공개 청첩장에는 지하철·기차, 버스, 자가용 순서로 표시됩니다. 실제 하객에게 필요한 문구를 항목별로 수정해 주세요.</p>
          ${transportManager(invitationData.transport)}
        </fieldset>
        <div class="copy-editor-overlay" data-copy-editor-overlay hidden>
          <div class="copy-editor-page">
            <div class="copy-editor-toolbar"><strong>문구 수정</strong><button class="btn" type="button" data-copy-editor-close>닫기</button></div>
            <p class="admin-message">공개 청첩장처럼 보이는 화면에서 수정할 영역을 눌러 주세요. 선택한 영역만 편집 도구가 열립니다.</p>
            <header class="copy-editor-hero" style="background-image:url('${escapeAdminHtml(invitationData.hero.image)}')">
              <div><small>${escapeAdminHtml(invitationData.hero.eyebrow || "")}</small><strong>${escapeAdminHtml(groom.name)} · ${escapeAdminHtml(bride.name)}</strong><span>${escapeAdminHtml(invitationData.wedding.displayDate)}</span></div>
            </header>
            <section class="copy-editor-section" data-copy-focus="hero.introEyebrow">
              <p class="section-label">Intro</p><h2>진입 화면</h2>
          ${input("hero.introEyebrow", "진입 화면 영문 문구", invitationData.hero.introEyebrow || invitationData.hero.eyebrow || "")}
          ${input("hero.introDate", "진입 화면 날짜 문구 · 비우면 예식 일시 사용", invitationData.hero.introDate || "")}
            </section>
          ${Object.entries(invitationData.sectionTitles || {}).map(([key, title]) => `
            <section class="copy-editor-section" data-copy-focus="sectionTitles.${escapeAdminHtml(key)}.ko">
              <p class="section-label">${escapeAdminHtml(title.en || key)}</p><h2>${escapeAdminHtml(title.ko || key)}</h2>
              ${copyEditorVisual(key)}
              <div class="quick-input-grid">
              ${input(`sectionTitles.${key}.en`, `${key} 영문 타이틀`, title.en || "")}
              ${input(`sectionTitles.${key}.ko`, `${key} 국문 타이틀`, title.ko || "")}
              </div>
              ${key === "invitation" ? `${recommendationEditor("invitation.title", "초대 문구 제목", invitationData.invitation.title, recommendations.invitationTitle)}
              ${recommendationEditor("invitation.paragraphs", "초대 문구", invitationData.invitation.paragraphs.join("\n\n"), recommendations.invitationParagraphs, true, true)}` : ""}
            </section>`).join("")}
            <section class="copy-editor-section" data-copy-focus="notice.0.text">
              <p class="section-label">Details</p><h2>안내 세부 설정</h2>
          <p class="admin-message micro-help">교통 안내는 항목별로 수정하거나 숨길 수 있습니다. 식장을 바꾸면 등록된 기본 교통 정보로 교체됩니다.</p>
          ${noticeManager(invitationData.notices)}
          <p class="admin-message">식장 안내는 최대 3개까지 표시됩니다. 추천을 고른 뒤 문구를 자유롭게 수정할 수 있습니다.</p>
          ${accountManager(invitationData.accounts)}
          ${textarea("ending.text", "마지막 문구", invitationData.ending.text)}
          ${imageField("ending.image", "마지막 사진", invitationData.ending.image)}
            </section>
            <button class="btn btn-primary editor-save copy-editor-save" type="submit">최종 저장</button>
          </div>
        </div>
        <details class="editor-details" id="gallery-settings"><summary>갤러리</summary><div class="editor-details-body">
          <p class="admin-message">최대 20장까지 등록할 수 있습니다. 공개 화면에는 접속할 때마다 등록 사진 중 무작위 6장이 미리보기로 표시됩니다.</p>
          ${select("galleryDisplayMode", "사진 확대 화면 표시 방식", invitationData.galleryDisplayMode || "portrait", [["portrait", "세로형 화면에 맞추기"], ["original", "원본 사진 비율 유지"]])}
          ${galleryManager(gallery)}
        </div></details>
        <details class="editor-details"><summary>하객 사진·영상 업로드</summary><div class="editor-details-body">
          ${input("guestPhotos.eventDate", "업로드 기능이 열리는 날짜", invitationData.guestPhotos?.eventDate || "2026-10-04", "date")}
          ${select("guestPhotos.previewVisible", "날짜와 관계없이 미리보기 표시", String(invitationData.guestPhotos?.previewVisible ?? true), [["true", "표시"], ["false", "숨김"]])}
        </div></details>
        <details class="editor-details"><summary>섹션 순서와 노출 설정</summary><div class="editor-details-body">
          <p class="admin-message">표시할 섹션을 체크하고 화살표 버튼으로 순서를 정해 주세요.</p>
          <div class="section-order-columns">
            ${sectionOrderEditor("sectionSettings.preWedding", "결혼식 전날까지", invitationData.sectionSettings?.preWedding)}
            ${sectionOrderEditor("sectionSettings.weddingDay", "결혼식 당일 이후", invitationData.sectionSettings?.weddingDay)}
          </div>
          <div class="section-preview-actions">
            <a class="btn" href="./index.html?previewSectionMode=preWedding" target="_blank" rel="noopener">결혼식 전 화면 미리보기</a>
            <a class="btn btn-primary" href="./index.html?previewSectionMode=weddingDay" target="_blank" rel="noopener">결혼식 당일 이후 미리보기</a>
          </div>
          <p class="admin-message micro-help">변경한 순서를 저장한 다음 미리보기 버튼을 눌러 주세요.</p>
        </div></details>
        <button class="btn btn-primary editor-save" id="editor-save">청첩장 저장</button>
      </form>
    </section>`;
  bindAdminNavigation();
  bindEditor();
  if (focus === "copy") {
    document.querySelector("[data-copy-editor-overlay]").hidden = false;
    document.body.classList.add("copy-editor-open");
  }
  if (focus === "share") document.querySelector("#share-settings")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (focus === "gallery") {
    const gallerySettings = document.querySelector("#gallery-settings");
    gallerySettings.open = true;
    gallerySettings.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setNested(target, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const parent = keys.reduce((object, key) => {
    if (!object[key] || typeof object[key] !== "object") object[key] = {};
    return object[key];
  }, target);
  parent[last] = value;
}

function editorData(form) {
  const next = JSON.parse(JSON.stringify(invitationData));
  const fields = new FormData(form);
  for (const [name, value] of fields.entries()) {
    if (name === "appearance.preset" || name.startsWith("notice.") || name.startsWith("noticePreset.") || name.startsWith("account.") || name.startsWith("transport.")) {
      continue;
    }
    if (name === "guestPhotos.previewVisible") {
      setNested(next, name, value === "true");
    } else if (name === "wedding.date") {
      setNested(next, name, weddingDateIso(value));
    } else if (name === "couple.groom.birthday" || name === "couple.bride.birthday") {
      setNested(next, name, birthdayDisplayValue(value));
    } else if (name.startsWith("sectionSettings.")) {
      setNested(next, name, parseSectionOrder(value));
    } else if (name === "couple.groom.tags" || name === "couple.bride.tags") {
      setNested(next, name, value.split(",").map((item) => item.trim()).filter(Boolean));
    } else if (name === "invitation.paragraphs") {
      setNested(next, name, value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean));
    } else if (name === "notices") {
      next.notices = parseList(value, ["title", "text"]);
    } else {
      setNested(next, name, value.trim());
    }
  }
  next.notices = [...form.querySelectorAll("[data-notice-editor]")].map((editor) => ({
    title: editor.querySelector('input[name*=".title"]').value.trim(),
    text: editor.querySelector('textarea[name*=".text"]').value.trim(),
    hidden: editor.querySelector('input[name*=".hidden"]').checked,
  })).filter((notice) => notice.title || notice.text);
  next.transport = [...form.querySelectorAll("[data-transport-editor]")].map((editor) => ({
    title: editor.querySelector('input[name*=".title"]').value.trim(),
    text: editor.querySelector('textarea[name*=".text"]').value.trim(),
    hidden: editor.querySelector('input[name*=".hidden"]').checked,
  })).filter((item) => item.title || item.text);
  next.accounts = invitationData.accounts.map((account, index) => ({
    side: fields.get(`account.${index}.side`)?.trim() || account.side,
    name: fields.get(`account.${index}.name`)?.trim() || account.name,
    bank: fields.get(`account.${index}.bank`)?.trim() || "",
    number: fields.get(`account.${index}.number`)?.trim() || "",
    relation: fields.get(`account.${index}.relation`)?.trim() || "",
  }));
  next.wedding.displayDate = form.elements["wedding.displayDateCustom"].value.trim();
  next.wedding.mapLinks = mapLinksFor(next.wedding.venue, next.wedding.address);
  return next;
}

function bindEditor() {
  const form = document.querySelector("#invitation-editor");
  const copyEditor = form.querySelector("[data-copy-editor-overlay]");
  form.querySelector("[data-copy-editor-close]")?.addEventListener("click", () => {
    copyEditor.hidden = true;
    document.body.classList.remove("copy-editor-open");
  });
  copyEditor.querySelectorAll("[data-copy-focus]").forEach((section) => {
    section.addEventListener("click", (event) => {
      if (event.target.closest("input, textarea, select, button, a, label")) return;
      const target = form.elements[section.dataset.copyFocus];
      if (!target) return;
      copyEditor.querySelectorAll(".is-editing").forEach((item) => item.classList.remove("is-editing"));
      section.classList.add("is-editing");
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  document.querySelectorAll("[data-editor-jump]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector(`#${button.dataset.editorJump}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  const syncParentNames = () => {
    form.elements["couple.groom.parents"].value = `${form.querySelector('[data-quick="groomFather"]').value} · ${form.querySelector('[data-quick="groomMother"]').value}`;
    form.elements["couple.bride.parents"].value = `${form.querySelector('[data-quick="brideFather"]').value} · ${form.querySelector('[data-quick="brideMother"]').value}`;
  };
  form.querySelectorAll("[data-quick]").forEach((quickField) => {
    quickField.addEventListener("input", () => {
      if (["groomFather", "groomMother", "brideFather", "brideMother"].includes(quickField.dataset.quick)) {
        syncParentNames();
        return;
      }
      const target = form.elements[quickField.dataset.quick];
      if (!target) return;
      target.value = quickField.value;
      target.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
  form.querySelectorAll("[data-recommendation-editor]").forEach((editor) => {
    const target = editor.querySelector("input, textarea");
    editor.addEventListener("click", (event) => {
      const recommendation = event.target.closest("[data-recommendation]");
      if (recommendation) {
        target.value = recommendation.dataset.recommendation;
        editor.querySelector(".recommendation-modal")?.setAttribute("hidden", "");
      }
      if (event.target.closest("[data-recommendation-more]")) editor.classList.toggle("show-extra");
      if (event.target.closest("[data-recommendation-open]")) editor.querySelector(".recommendation-modal")?.removeAttribute("hidden");
      if (event.target.closest("[data-recommendation-close]")) editor.querySelector(".recommendation-modal")?.setAttribute("hidden", "");
    });
  });
  form.querySelectorAll(".account-editor").forEach((editor) => {
    const bankSelect = editor.querySelector('select[name*=".bankSelect"]');
    const bankInput = editor.querySelector('input[name*=".bank"]');
    bankSelect.addEventListener("change", () => {
      if (bankSelect.value !== "직접 입력") bankInput.value = bankSelect.value;
      bankInput.focus();
    });
  });
  const noticeManagerElement = form.querySelector("[data-notice-manager]");
  const noticeList = noticeManagerElement.querySelector("[data-notice-list]");
  const noticeAdd = noticeManagerElement.querySelector("[data-notice-add]");
  const noticeItems = () => [...noticeList.querySelectorAll("[data-notice-editor]")].map((editor) => ({
    title: editor.querySelector('input[name*=".title"]').value,
    text: editor.querySelector('textarea[name*=".text"]').value,
    hidden: editor.querySelector('input[name*=".hidden"]').checked,
  }));
  const renderNoticeItems = (items) => {
    noticeList.innerHTML = items.slice(0, 3).map(noticeEditor).join("");
    noticeAdd.disabled = items.length >= 3;
  };
  noticeManagerElement.addEventListener("click", (event) => {
    if (event.target.closest("[data-notice-add]")) {
      const items = noticeItems();
      if (items.length < 3) renderNoticeItems([...items, { title: "", text: "" }]);
    }
    const removeButton = event.target.closest("[data-notice-remove]");
    if (!removeButton) return;
    const items = noticeItems();
    const index = [...noticeList.querySelectorAll("[data-notice-editor]")].indexOf(removeButton.closest("[data-notice-editor]"));
    items.splice(index, 1);
    renderNoticeItems(items);
  });
  noticeManagerElement.addEventListener("change", (event) => {
    const preset = event.target.closest('select[name^="noticePreset."]');
    if (!preset) return;
    const selected = noticePresetValues[preset.value];
    if (!selected) return;
    const editor = preset.closest("[data-notice-editor]");
    editor.querySelector('input[name*=".title"]').value = selected.title;
    editor.querySelector('textarea[name*=".text"]').value = selected.text;
  });
  renderNoticeItems(noticeItems());
  const transportManagerElement = form.querySelector("[data-transport-manager]");
  const transportList = transportManagerElement.querySelector("[data-transport-list]");
  const transportItems = () => [...transportList.querySelectorAll("[data-transport-editor]")].map((editor) => ({
    title: editor.querySelector('input[name*=".title"]').value,
    text: editor.querySelector('textarea[name*=".text"]').value,
    hidden: editor.querySelector('input[name*=".hidden"]').checked,
  }));
  const renderTransportItems = (items) => { transportList.innerHTML = items.map(transportEditor).join(""); };
  transportManagerElement.addEventListener("click", (event) => {
    if (event.target.closest("[data-transport-add]")) renderTransportItems([...transportItems(), { title: "", text: "", hidden: false }]);
    const removeButton = event.target.closest("[data-transport-remove]");
    if (!removeButton) return;
    const items = transportItems();
    items.splice([...transportList.querySelectorAll("[data-transport-editor]")].indexOf(removeButton.closest("[data-transport-editor]")), 1);
    renderTransportItems(items);
  });
  const updateDisplayDate = (force = false) => {
    const format = form.elements["wedding.displayDateFormat"].value;
    if (format === "custom") return;
    if (!force && form.elements["wedding.displayDateCustom"].value.trim()) return;
    form.elements["wedding.displayDateCustom"].value = weddingDisplayDate(form.elements["wedding.date"].value, format);
  };
  form.elements["wedding.date"].addEventListener("change", () => updateDisplayDate(true));
  form.elements["wedding.displayDateFormat"].addEventListener("change", () => updateDisplayDate(true));
  updateDisplayDate();

  const venueInput = form.elements["wedding.venue"];
  const addressInput = form.elements["wedding.address"];
  const venueMap = form.querySelector("[data-venue-map]");
  const venueStatus = form.querySelector("[data-venue-status]");
  const updateVenueMap = () => {
    venueMap.href = venueMapSearchUrl(addressInput.value.trim() || venueInput.value.trim());
  };
  venueInput.addEventListener("change", () => {
    const preset = findVenuePreset(venueInput.value);
    if (preset) {
      addressInput.value = preset.address;
      renderTransportItems(preset.transport);
      venueStatus.textContent = "등록된 식장을 찾았습니다. 주소가 자동으로 입력되었습니다.";
    } else {
      venueStatus.textContent = "자동으로 찾지 못했습니다. 지도에서 확인하거나 주소를 직접 입력해 주세요.";
    }
    updateVenueMap();
  });
  addressInput.addEventListener("input", updateVenueMap);
  form.querySelector("[data-address-focus]").addEventListener("click", () => addressInput.focus());
  updateVenueMap();

  form.querySelectorAll("[data-section-order]").forEach((editor) => {
    const updateSectionOrder = () => {
      editor.querySelector('input[type="hidden"]').value = [...editor.querySelectorAll(".section-order-item")]
        .filter((item) => item.querySelector('input[type="checkbox"]').checked)
        .map((item) => item.dataset.sectionId)
        .join("\n");
    };
    editor.addEventListener("change", updateSectionOrder);
    editor.addEventListener("click", (event) => {
      const button = event.target.closest("[data-section-move]");
      if (!button) return;
      const item = button.closest(".section-order-item");
      const sibling = Number(button.dataset.sectionMove) < 0 ? item.previousElementSibling : item.nextElementSibling;
      if (!sibling) return;
      if (Number(button.dataset.sectionMove) < 0) sibling.before(item);
      else sibling.after(item);
      updateSectionOrder();
    });
    updateSectionOrder();
  });
  form.querySelectorAll("[data-image-target]").forEach((fileInput) => {
    fileInput.addEventListener("change", async () => {
      let file = fileInput.files[0];
      if (!file) return;
      if (["couple.groom.photo", "couple.bride.photo"].includes(fileInput.dataset.imageTarget)) {
        try {
          file = await cropProfileImage(file);
        } catch (error) {
          alert(`대표사진 자르기 화면을 열지 못했습니다.\n${error.message || "다른 이미지 파일로 다시 시도해 주세요."}`);
          return;
        }
        if (!file) return;
      }
      const label = fileInput.closest(".image-upload");
      label.firstChild.textContent = "업로드 중...";
      try {
        const url = await window.RSVP_STORAGE.uploadInvitationImage(file, fileInput.dataset.imageTarget.replace(/\./g, "-"));
        form.elements[fileInput.dataset.imageTarget].value = url;
        const preview = form.querySelector(`[data-image-preview="${fileInput.dataset.imageTarget}"]`);
        preview.innerHTML = `<img src="${escapeAdminHtml(url)}" alt="업로드한 사진 미리보기">`;
        label.firstChild.textContent = "업로드 완료";
      } catch (error) {
        label.firstChild.textContent = "업로드 실패";
        alert(`사진을 업로드하지 못했습니다.\n${error.message || "파일 크기와 Storage 정책을 확인해 주세요."}`);
      }
    });
  });
  form.querySelectorAll("[data-image-crop-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = button.dataset.imageCropEdit;
      const currentUrl = form.elements[target].value;
      if (!currentUrl) return;
      button.disabled = true;
      button.textContent = "불러오는 중...";
      try {
        const response = await fetch(currentUrl);
        if (!response.ok) throw new Error("등록된 사진을 불러오지 못했습니다.");
        const original = await response.blob();
        const file = await cropProfileImage(new File([original], "profile-image", { type: original.type || "image/jpeg" }));
        if (!file) return;
        button.textContent = "업로드 중...";
        const url = await window.RSVP_STORAGE.uploadInvitationImage(file, target.replace(/\./g, "-"));
        form.elements[target].value = url;
        form.querySelector(`[data-image-preview="${target}"]`).innerHTML = `<img src="${escapeAdminHtml(url)}" alt="업로드한 사진 미리보기">`;
      } catch (error) {
        alert(`대표사진 영역을 적용하지 못했습니다.\n${error.message || "잠시 후 다시 시도해 주세요."}`);
      } finally {
        button.disabled = false;
        button.textContent = "영역 맞추기";
      }
    });
  });
  form.querySelectorAll("[data-video-target]").forEach((fileInput) => {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const label = fileInput.closest(".image-upload");
      label.firstChild.textContent = "업로드 중...";
      try {
        const url = await window.RSVP_STORAGE.uploadInvitationMedia(file, fileInput.dataset.videoTarget.replace(/\./g, "-"));
        form.elements[fileInput.dataset.videoTarget].value = url;
        form.querySelector(`[data-video-preview="${fileInput.dataset.videoTarget}"]`).innerHTML = `<video src="${escapeAdminHtml(url)}" muted controls playsinline></video>`;
        label.firstChild.textContent = "업로드 완료";
      } catch (error) {
        label.firstChild.textContent = "업로드 실패";
        alert(`영상을 업로드하지 못했습니다.\n${error.message || "파일 크기와 Storage 정책을 확인해 주세요."}`);
      }
    });
  });
  form.querySelectorAll("[data-video-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.videoRemove;
      form.elements[target].value = "";
      form.querySelector(`[data-video-preview="${target}"]`).innerHTML = "<span>등록된 영상이 없습니다.</span>";
    });
  });
  form.querySelectorAll("[data-image-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.imageRemove;
      form.elements[target].value = "";
      form.querySelector(`[data-image-preview="${target}"]`).innerHTML = "<span>등록된 사진이 없습니다.</span>";
    });
  });
  const galleryValues = () => Array.from({ length: 20 }, (_, index) => form.elements[`gallery.${index}`].value).filter(Boolean);
  const updateGallery = (images) => {
    const slots = Array.from({ length: 20 }, (_, index) => images[index] || "");
    slots.forEach((image, index) => { form.elements[`gallery.${index}`].value = image; });
    form.querySelector("[data-gallery-editor-preview]").innerHTML = galleryManagerPreview(slots);
  };
  const galleryStatus = form.querySelector("[data-gallery-status]");
  form.querySelector("[data-gallery-upload]").addEventListener("change", async (event) => {
    const files = [...event.currentTarget.files];
    if (!files.length) return;
    if (files.length > 20) {
      alert("갤러리 사진은 최대 20장까지 선택할 수 있습니다.");
      event.currentTarget.value = "";
      return;
    }
    if (galleryValues().length && !confirm("기존 갤러리 사진을 새로 선택한 사진으로 교체할까요?")) {
      event.currentTarget.value = "";
      return;
    }
    galleryStatus.textContent = `${files.length}장의 사진을 업로드하고 있습니다. 창을 닫지 말아 주세요.`;
    try {
      const uploaded = [];
      for (let index = 0; index < files.length; index += 1) {
        galleryStatus.textContent = `${files.length}장 중 ${index + 1}장을 업로드하고 있습니다.`;
        uploaded.push(await window.RSVP_STORAGE.uploadInvitationImage(files[index], `gallery-${index + 1}`));
      }
      updateGallery(uploaded);
      galleryStatus.textContent = `${uploaded.length}장의 사진을 등록했습니다. 아래 저장 버튼을 눌러 완료해 주세요.`;
    } catch (error) {
      galleryStatus.textContent = "갤러리 업로드를 완료하지 못했습니다.";
      alert(`사진을 업로드하지 못했습니다.\n${error.message || "파일 크기와 Storage 정책을 확인해 주세요."}`);
    }
    event.currentTarget.value = "";
  });
  form.querySelector("[data-gallery-clear]").addEventListener("click", () => {
    if (galleryValues().length && !confirm("갤러리 사진을 모두 비울까요?")) return;
    updateGallery([]);
    galleryStatus.textContent = "갤러리를 비웠습니다. 아래 저장 버튼을 눌러 완료해 주세요.";
  });
  form.querySelector("[data-gallery-editor-preview]").addEventListener("click", (event) => {
    const button = event.target.closest("[data-gallery-remove]");
    if (!button) return;
    const images = galleryValues();
    images.splice(Number(button.dataset.galleryRemove), 1);
    updateGallery(images);
    galleryStatus.textContent = "사진을 삭제했습니다. 아래 저장 버튼을 눌러 완료해 주세요.";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const buttons = [...document.querySelectorAll('#editor-save, [form="invitation-editor"]')];
    buttons.forEach((button) => {
      button.dataset.defaultLabel = button.textContent;
      button.disabled = true;
      button.textContent = "저장 중...";
    });
    try {
      invitationData = editorData(form);
      applyAppearance(invitationData.appearance);
      await window.RSVP_STORAGE.saveInvitationData(invitationData);
      renderEditor("저장했습니다. 공개 청첩장을 새로고침하면 변경 내용이 표시됩니다.");
    } catch {
      buttons.forEach((button) => {
        button.disabled = false;
        button.textContent = button.dataset.defaultLabel;
      });
      alert("저장하지 못했습니다. 관리자 권한 설정을 확인해 주세요.");
    }
  });
  const floatingSave = document.querySelector('.admin-floating-save[form="invitation-editor"]');
  const bottomSave = document.querySelector("#editor-save");
  if (floatingSave && bottomSave && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      floatingSave.classList.toggle("is-hidden", entry.isIntersecting);
    }, { threshold: 0.2 }).observe(bottomSave);
  }
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (error) return renderLogin("로그인하지 못했습니다. 이메일과 비밀번호를 확인해 주세요.");
  await loadInvitationData();
  if (adminArea === "super") renderThemeManager();
  else renderEditor();
}

async function loadInvitationData() {
  invitationData = await window.RSVP_STORAGE.loadInvitationData(window.INVITATION_DATA);
  applyAppearance(invitationData.appearance);
}

async function renderResponses() {
  if (!supabaseClient) {
    adminApp.innerHTML = `${adminHeader("responses")}${responsesView(window.RSVP_STORAGE.readLocalResponses(), true)}`;
    bindAdminNavigation();
    return;
  }
  const { data, error } = await supabaseClient
    .from("attendance_responses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return renderLogin("응답을 불러오지 못했습니다. 관리자 권한 설정을 확인해 주세요.");
  adminApp.innerHTML = `${adminHeader("responses")}${responsesView(data)}`;
  bindAdminNavigation();
}

const ADMIN_SAVED_GUEST_PHOTOS_KEY = "wedding-admin-saved-guest-photos";
const isGuestVideo = (photo = {}) => /\.(mp4|webm|mov)(?:$|[?#])/i.test(photo.name || photo.path || "");

function savedGuestPhotoPaths() {
  try { return new Set(JSON.parse(localStorage.getItem(ADMIN_SAVED_GUEST_PHOTOS_KEY) || "[]")); }
  catch { return new Set(); }
}

function rememberSavedGuestPhotos(photos) {
  const saved = savedGuestPhotoPaths();
  photos.forEach((photo) => saved.add(photo.path));
  localStorage.setItem(ADMIN_SAVED_GUEST_PHOTOS_KEY, JSON.stringify([...saved]));
}

function guestPhotoCards(photos, saved = false) {
  return photos.length ? photos.map((photo) => `
    <article class="private-photo ${saved ? "is-saved" : "is-new"}">
      <a href="${escapeAdminHtml(photo.signedUrl)}" target="_blank" rel="noopener" download>
      ${isGuestVideo(photo) ? '<span class="private-video-file"><strong>VIDEO</strong><small>저장해서 확인하기</small></span>' : `<img src="${escapeAdminHtml(photo.signedUrl)}" alt="하객이 업로드한 사진" loading="lazy">`}
      <span>${escapeAdminHtml(formatDate(photo.created_at))}</span>
      </a>
      <div class="private-photo-actions">
        <a class="icon-btn" href="${escapeAdminHtml(photo.signedUrl)}" download aria-label="파일 하나 저장" title="저장"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h12l2 2v14H5zM8 4v6h8V4m-7 11h6v5H9z"/></svg></a>
        <button class="icon-btn" type="button" data-admin-remove-photo="${escapeAdminHtml(photo.path)}" aria-label="파일 삭제" title="삭제">×</button>
      </div>
    </article>`).join("") : `<p class="admin-message">${saved ? "아직 저장 처리한 파일이 없습니다." : "새로 저장할 파일이 없습니다."}</p>`;
}

async function downloadGuestPhotos(photos, button) {
  if (!photos.length) return alert("저장할 파일이 없습니다.");
  button.disabled = true;
  const original = button.textContent;
  button.textContent = `${photos.length}개 저장 중...`;
  photos.forEach((photo, index) => {
    setTimeout(() => {
      const link = document.createElement("a");
      link.href = photo.signedUrl;
      link.download = photo.name || `guest-photo-${index + 1}`;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, index * 180);
  });
  rememberSavedGuestPhotos(photos);
  setTimeout(() => renderGuestPhotos(), Math.max(500, photos.length * 180 + 200));
}

async function renderGuestPhotos() {
  adminApp.innerHTML = `
    ${adminHeader("photos")}
    <section class="admin-card">
      <h2>하객 사진·영상</h2>
      <p class="admin-message">하객이 보내준 파일을 불러오고 있습니다.</p>
    </section>`;
  bindAdminNavigation();
  try {
    const photos = await window.RSVP_STORAGE.listGuestPhotos();
    const savedPaths = savedGuestPhotoPaths();
    const newPhotos = photos.filter((photo) => !savedPaths.has(photo.path));
    const savedPhotos = photos.filter((photo) => savedPaths.has(photo.path));
    adminApp.innerHTML = `
      ${adminHeader("photos")}
      <section class="admin-card">
        <div class="admin-toolbar"><h2>하객 사진·영상</h2><span class="badge">${photos.length}개</span></div>
        <p class="admin-message">저장 여부는 이 관리자 브라우저에 기록됩니다. 다른 기기에서는 새 파일로 표시될 수 있습니다.</p>
        <div class="guest-photo-admin-actions">
          <button class="btn btn-primary" type="button" data-download-new-guest-photos>새 파일만 전체 저장 (${newPhotos.length})</button>
          <button class="btn" type="button" data-download-all-guest-photos>모든 파일 전체 저장 (${photos.length})</button>
        </div>
        <section class="guest-photo-admin-group"><h3>새로 업로드된 파일 <span class="badge">${newPhotos.length}개</span></h3><div class="private-photo-grid">${guestPhotoCards(newPhotos)}</div></section>
        <section class="guest-photo-admin-group"><h3>이미 저장한 파일 <span class="badge">${savedPhotos.length}개</span></h3><div class="private-photo-grid">${guestPhotoCards(savedPhotos, true)}</div></section>
      </section>`;
    bindAdminNavigation();
    document.querySelector("[data-download-new-guest-photos]")?.addEventListener("click", (event) => downloadGuestPhotos(newPhotos, event.currentTarget));
    document.querySelector("[data-download-all-guest-photos]")?.addEventListener("click", (event) => downloadGuestPhotos(photos, event.currentTarget));
    document.querySelectorAll("[data-admin-remove-photo]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("이 파일을 삭제할까요?")) return;
        button.disabled = true;
        button.textContent = "…";
        try {
          await window.RSVP_STORAGE.removeGuestPhoto(button.dataset.adminRemovePhoto);
          await renderGuestPhotos();
        } catch {
          button.disabled = false;
          button.textContent = "×";
          alert("파일을 삭제하지 못했습니다.");
        }
      });
    });
  } catch {
    adminApp.innerHTML = `
      ${adminHeader("photos")}
      <section class="admin-card"><p class="admin-message">파일을 불러오지 못했습니다. Storage 정책을 확인해 주세요.</p></section>`;
    bindAdminNavigation();
  }
}

async function renderGuestbookEntries() {
  adminApp.innerHTML = `${adminHeader("guestbook")}<section class="admin-card"><h2>방명록</h2><p class="admin-message">방명록을 불러오고 있습니다.</p></section>`;
  bindAdminNavigation();
  try {
    const entries = await window.RSVP_STORAGE.loadAdminGuestbookEntries();
    adminApp.innerHTML = `${adminHeader("guestbook")}<section class="admin-card">
      <div class="admin-toolbar"><h2>방명록</h2><span class="badge">${entries.length}개</span></div>
      <p class="admin-message micro-help">부적절한 메시지는 숨길 수 있습니다. 숨긴 메시지는 공개 청첩장에서 보이지 않습니다.</p>
      <div class="response-list">${entries.length ? entries.map((entry) => `
        <article class="response-card ${entry.hidden ? "is-muted" : ""}">
          <h3>${escapeAdminHtml(entry.guest_name)} ${entry.hidden ? '<span class="badge">숨김</span>' : ""}</h3>
          <p>${escapeAdminHtml(entry.message)}</p>
          <p class="response-meta">${escapeAdminHtml(formatDate(entry.created_at))}</p>
          <button class="btn" type="button" data-toggle-guestbook="${escapeAdminHtml(entry.id)}" data-hidden="${entry.hidden ? "true" : "false"}">${entry.hidden ? "다시 보이기" : "숨기기"}</button>
        </article>`).join("") : '<p class="admin-message">등록된 방명록이 없습니다.</p>'}</div>
    </section>`;
    bindAdminNavigation();
    document.querySelectorAll("[data-toggle-guestbook]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await window.RSVP_STORAGE.setGuestbookEntryHidden(button.dataset.toggleGuestbook, button.dataset.hidden !== "true");
        await renderGuestbookEntries();
      } catch (error) {
        button.disabled = false;
        alert(error.message || "방명록 상태를 변경하지 못했습니다.");
      }
    }));
  } catch (error) {
    adminApp.innerHTML = `${adminHeader("guestbook")}<section class="admin-card"><p class="admin-message">방명록을 불러오지 못했습니다. 최신 supabase-setup.sql을 다시 실행해 주세요.</p><p class="admin-message micro-help">${escapeAdminHtml(error.message || "방명록 조회 권한을 확인해 주세요.")}</p></section>`;
    bindAdminNavigation();
  }
}

async function start() {
  applyAppearance(invitationData.appearance);
  if (!supabaseClient) return renderSetupNotice();
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) return renderLogin();
  await loadInvitationData();
  if (adminArea === "super") renderThemeManager();
  else renderEditor();
}

start();
