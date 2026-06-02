let data = window.INVITATION_DATA;
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const mediaStyle = (src) => src ? `style="background-image:url('${escapeHtml(src)}')"` : "";
const lazyMediaStyle = (src) => src ? `data-lazy-background="${escapeHtml(src)}"` : "";
const tel = (number) => `tel:${String(number).replace(/[^0-9+]/g, "")}`;
const mapLinksForAddress = (address = "") => {
  const query = encodeURIComponent(address.trim());
  return [
    { label: "네이버 지도", url: `https://map.naver.com/p/search/${query}` },
    { label: "카카오맵", url: `https://map.kakao.com/link/search/${query}` },
    { label: "티맵", url: `https://www.tmap.co.kr/tmap2/mobile/route.jsp?name=${query}` },
  ];
};
let weddingDate;
let guestbookEntries = [];
let galleryPreviewImages = [];
const themes = ["beige", "sky", "pink", "gray", "black", "white", "green"];
const movieConcepts = ["none", "about_time", "la_la_land", "spirited_away", "you_are_the_apple"];
const heroDecorations = ["none", "doodle_hearts", "organic_heart", "wedding_rings", "poster_card"];
const heroTextThemes = ["auto", "default_center", "editorial_left", "minimal_center"];
const defaultSectionSettings = {
  preWedding: ["invitation", "about-us", "wedding-day", "location", "gallery", "wedding-snap", "information", "attendance", "account", "guestbook"],
  weddingDay: ["invitation", "about-us", "wedding-day", "location", "gallery", "wedding-snap", "information", "attendance", "account", "guestbook"],
};

function applyTheme(theme) {
  const selected = themes.includes(theme) ? theme : "sky";
  document.body.dataset.theme = selected;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getComputedStyle(document.body).getPropertyValue("--body-bg").trim());
}

function applyMovieConcept(movieConcept) {
  document.body.dataset.movieConcept = movieConcepts.includes(movieConcept) ? movieConcept : "none";
}

function applyHeroDecoration(heroDecoration) {
  const legacyDecorations = { line_frame: "doodle_hearts", heart_frame: "organic_heart" };
  const selected = legacyDecorations[heroDecoration] || heroDecoration;
  document.body.dataset.heroDecoration = heroDecorations.includes(selected) ? selected : "none";
}

function applyHeroTextTheme(heroTextTheme) {
  document.body.dataset.heroTextTheme = heroTextThemes.includes(heroTextTheme) ? heroTextTheme : "auto";
}

function applyAppearance(appearance = {}) {
  if (window.WEDDING_DESIGN) return window.WEDDING_DESIGN.apply(data);
  const legacyPoster = appearance.heroDecoration === "poster";
  applyTheme(appearance.theme);
  applyMovieConcept(appearance.movieConcept);
  applyHeroDecoration(legacyPoster ? "none" : appearance.heroDecoration);
  applyHeroTextTheme(legacyPoster && (!appearance.heroTextTheme || appearance.heroTextTheme === "auto") ? "editorial_left" : appearance.heroTextTheme);
}

function setMetaProperty(property, content) {
  if (!content) return;
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function updateSocialMeta() {
  const invitationText = data.invitation?.paragraphs?.join(" ") || data.meta.description;
  const description = `${data.wedding.displayDate} · ${data.wedding.venue} · ${invitationText}`.slice(0, 180);
  setMetaProperty("og:title", data.meta.title);
  setMetaProperty("og:description", description);
  setMetaProperty("og:url", location.href);
  setMetaProperty("og:image", data.meta.shareImage || data.hero.image);
}

function sectionHeader(label, title) {
  return `<p class="section-label">${escapeHtml(label)}</p><h2 class="section-title single-line-fit">${escapeHtml(title)}</h2>`;
}

function fitSingleLineText() {
  document.querySelectorAll(".single-line-fit").forEach((element) => {
    element.style.fontSize = "";
    let size = parseFloat(getComputedStyle(element).fontSize);
    while (element.scrollWidth > element.clientWidth && size > 10) {
      size -= 0.5;
      element.style.fontSize = `${size}px`;
    }
  });
}

function renderCalendar() {
  const year = weddingDate.getFullYear();
  const month = weddingDate.getMonth();
  const day = weddingDate.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill("").concat(Array.from({ length: lastDate }, (_, index) => index + 1));
  while (cells.length % 7) cells.push("");
  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return `
    <table class="calendar">
      <caption>${year}. ${String(month + 1).padStart(2, "0")}</caption>
      <thead><tr>${["일", "월", "화", "수", "목", "금", "토"].map((item) => `<th>${item}</th>`).join("")}</tr></thead>
      <tbody>${weeks.map((week) => `<tr>${week.map((item) => `<td class="${item === day ? "wedding-day" : ""}">${item === day ? `<span>${item}</span>` : item}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
}

function renderAccounts(side) {
  const rows = data.accounts.filter((account) => account.side === side);
  if (!rows.length) return "";
  return `
    <details>
      <summary>${escapeHtml(side)} 계좌번호</summary>
      ${rows.map((account) => `
        <div class="account-row">
          <p><strong>${escapeHtml(account.name)}${account.relation ? ` · ${escapeHtml(account.relation)}` : ""}</strong><br>${account.bank && account.number ? `${escapeHtml(account.bank)} ${escapeHtml(account.number)}` : '<span class="account-pending">계좌번호 준비 중</span>'}</p>
          ${account.bank && account.number ? `<button class="btn copy-btn" data-copy="${escapeHtml(account.bank)} ${escapeHtml(account.number)}">복사</button>` : ""}
        </div>`).join("")}
    </details>`;
}

function guestPhotoStatus() {
  const settings = data.guestPhotos || {};
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  return {
    canUpload: settings.previewVisible || today === settings.eventDate,
    showSection: settings.previewVisible || today >= settings.eventDate,
  };
}

function galleryImages() {
  return data.gallery.filter(Boolean).slice(0, 20);
}

function shuffledGalleryPreview(images) {
  const shuffled = [...images];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, 6);
}

function loadLazyBackgrounds() {
  const targets = [...document.querySelectorAll("[data-lazy-background]")];
  const load = (target) => {
    target.style.backgroundImage = `url("${target.dataset.lazyBackground.replace(/"/g, '\\"')}")`;
    delete target.dataset.lazyBackground;
  };
  if (!("IntersectionObserver" in window)) return targets.forEach(load);
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    load(entry.target);
    observer.unobserve(entry.target);
  }), { rootMargin: "240px 0px" });
  targets.forEach((target) => observer.observe(target));
}

function guestbookMarkup() {
  const visibleEntries = guestbookEntries.filter((entry) => !entry.hidden);
  return visibleEntries.length
    ? visibleEntries.map((entry) => `
      <article class="guestbook-entry">
        <div><strong>${escapeHtml(entry.guest_name)}</strong><span>${escapeHtml(new Date(entry.created_at).toLocaleDateString("ko-KR"))}</span></div>
        <p>${escapeHtml(entry.message)}</p>
      </article>`).join("")
    : '<p class="subtle">첫 번째 축하 메시지를 남겨 주세요.</p>';
}

function activeSectionOrder() {
  const previewMode = new URLSearchParams(location.search).get("previewSectionMode");
  if (previewMode === "preWedding" || previewMode === "weddingDay") {
    const previewOrder = data.sectionSettings?.[previewMode];
    return Array.isArray(previewOrder) ? previewOrder : defaultSectionSettings[previewMode];
  }
  const eventDate = data.guestPhotos?.eventDate || "2026-10-04";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const mode = today < eventDate ? "preWedding" : "weddingDay";
  const configured = data.sectionSettings?.[mode];
  const order = Array.isArray(configured) ? configured : defaultSectionSettings[mode];
  return order.includes("guestbook") ? order : [...order, "guestbook"];
}

function applySectionOrder() {
  const article = document.querySelector(".invitation");
  const ending = article.querySelector(".ending");
  const sections = new Map([...article.querySelectorAll(".section[id]")].map((section) => [section.id, section]));
  const order = activeSectionOrder().filter((id, index, items) => sections.has(id) && items.indexOf(id) === index);
  const visible = new Set(order);
  sections.forEach((section, id) => {
    if (!visible.has(id)) section.remove();
  });
  order.forEach((id) => article.insertBefore(sections.get(id), ending));

  const nav = article.querySelector(".quick-nav");
  if (!nav) return;
  const links = new Map([...nav.querySelectorAll("a")].map((link) => [link.getAttribute("href").slice(1), link]));
  links.forEach((link, id) => {
    if (!visible.has(id)) link.remove();
  });
  order.forEach((id) => {
    if (links.has(id)) nav.appendChild(links.get(id));
  });
}

function render() {
  const { groom, bride } = data.couple;
  const guestPhotos = guestPhotoStatus();
  const gallery = galleryImages();
  galleryPreviewImages = shuffledGalleryPreview(gallery);
  app.innerHTML = `
    <article class="invitation">
      <header class="hero">
        <div class="media hero-media" ${mediaStyle(data.hero.image)}></div>
        <div class="hero-content hero-content-${escapeHtml(data.hero.contentPosition || "bottom")}">
          <p class="hero-eyebrow">${escapeHtml(data.hero.eyebrow)}</p>
          <h1 class="hero-names">${escapeHtml(groom.name)} <span>·</span> ${escapeHtml(bride.name)}</h1>
          <p class="hero-date single-line-fit">${escapeHtml(data.wedding.displayDate)}</p>
        </div>
      </header>

      <section class="section" id="invitation">
        ${sectionHeader("Invitation", data.invitation.title)}
        ${data.invitation.paragraphs.map((text) => `<p class="invitation-copy">${escapeHtml(text)}</p>`).join("")}
        <p class="parents">${escapeHtml(groom.parents)} ${escapeHtml(groom.relation)} <strong>${escapeHtml(groom.name)}</strong><br>${escapeHtml(bride.parents)} ${escapeHtml(bride.relation)} <strong>${escapeHtml(bride.name)}</strong></p>
        <div class="contact-row">
          <a class="btn" href="${tel(groom.phone)}">신랑에게 연락</a>
          <a class="btn" href="${tel(bride.phone)}">신부에게 연락</a>
        </div>
      </section>

      <section class="section" id="about-us">
        ${sectionHeader("About Us", "저희를 소개합니다")}
        <div class="profile-grid">
          ${[["신랑", groom], ["신부", bride]].map(([role, person]) => `
            <article class="profile-card">
              <div class="media profile-photo" ${mediaStyle(person.photo)}></div>
              <div class="profile-body">
                <h3 class="profile-name">${role} ${escapeHtml(person.name)}</h3>
                <div>${escapeHtml(person.parents)} ${escapeHtml(person.relation)}</div>
                <div>${escapeHtml(person.birthday)}</div>
                <div>${escapeHtml(person.mbti)}</div>
                <div>${person.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join(" ")}</div>
              </div>
            </article>`).join("")}
        </div>
      </section>

      <section class="section" id="wedding-day">
        ${sectionHeader("Wedding Day", data.wedding.displayDate)}
        ${renderCalendar()}
        <div class="countdown" id="countdown"></div>
        <p class="subtle" id="countdown-message"></p>
      </section>

      <section class="section" id="location">
        ${sectionHeader("Location", "오시는 길")}
        <h3>${escapeHtml(data.wedding.venue)}</h3>
        <p class="location-address">${escapeHtml(data.wedding.address)}</p>
        <div class="map-links">
          <button class="btn copy-btn" data-copy="${escapeHtml(data.wedding.address)}">주소 복사</button>
          ${mapLinksForAddress(data.wedding.address).map((link) => `<a class="btn" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join("")}
        </div>
        <div class="transport">
          ${data.transport.filter((item) => !item.hidden).map((item) => `<div><strong>${escapeHtml(item.title)}</strong>${escapeHtml(item.text)}</div>`).join("")}
        </div>
      </section>

      <section class="section" id="gallery">
        ${sectionHeader("Gallery", "갤러리")}
        <div class="gallery-grid">
          ${galleryPreviewImages.map((image, index) => `<button class="gallery-item" data-gallery="${gallery.indexOf(image)}" aria-label="사진 ${index + 1} 크게 보기"><span class="media" ${lazyMediaStyle(image)}></span></button>`).join("")}
        </div>
        <button class="btn gallery-more" id="gallery-more">사진 더보기</button>
      </section>

      ${guestPhotos.showSection ? `
        <section class="section guest-photo-section" id="wedding-snap">
          ${sectionHeader("Wedding Snap", "오늘의 순간을 보내주세요")}
          <p class="subtle">${guestPhotos.canUpload ? "직접 찍어주신 사진을 신랑 신부에게 선물해 주세요.<br>업로드된 사진은 신랑 신부만 확인할 수 있습니다." : "이 휴대폰에서 보낸 사진을 확인하거나 삭제할 수 있습니다."}</p>
          <div class="guest-photo-actions">
            ${guestPhotos.canUpload ? '<button class="btn btn-primary" id="guest-photo-open">사진 업로드</button>' : ""}
            <button class="btn" id="guest-photo-manage">내가 보낸 사진</button>
          </div>
        </section>` : ""}

      ${(data.notices || []).filter((notice) => !notice.hidden).length ? `<section class="section" id="information">
        ${sectionHeader("Information", "식장 안내")}
        ${data.notices.filter((notice) => !notice.hidden).map((notice) => `<article class="notice"><h3>${escapeHtml(notice.title)}</h3><p>${escapeHtml(notice.text)}</p></article>`).join("")}
      </section>` : ""}

      <section class="section" id="attendance">
        ${sectionHeader("Attendance", "참석 여부 알려주기")}
        <p class="subtle">교통편과 숙소 준비를 위해<br>참석 정보를 남겨 주세요.</p>
        <button class="btn btn-primary" id="attendance-open">참석 정보 입력</button>
      </section>

      <section class="section" id="account">
        ${sectionHeader("Account", "마음 전하는 곳")}
        <p class="subtle">참석이 어려우신 분들을 위해<br>계좌번호를 안내해 드립니다.</p>
        <div class="account-groups">${renderAccounts("신랑측")}${renderAccounts("신부측")}</div>
      </section>

      <section class="section" id="guestbook">
        ${sectionHeader("Guestbook", "축하 메시지")}
        <p class="subtle">따뜻한 마음을 짧게 남겨 주세요.</p>
        <form class="guestbook-form" id="guestbook-form">
          <label class="field"><span>성함</span><input name="guest_name" required maxlength="30" autocomplete="name" placeholder="성함을 입력해 주세요."></label>
          <label class="field"><span>축하 메시지</span><textarea name="message" required maxlength="300" rows="3" placeholder="축하 메시지를 남겨 주세요."></textarea></label>
          <button class="btn btn-primary" id="guestbook-submit">메시지 남기기</button>
        </form>
        <div class="guestbook-list" id="guestbook-list">${guestbookMarkup()}</div>
      </section>

      <section class="ending">
        <div class="media" ${mediaStyle(data.ending.image)}></div>
        <div class="ending-content"><p class="preserve">${escapeHtml(data.ending.text)}</p><p class="ending-names">${escapeHtml(groom.name)} · ${escapeHtml(bride.name)}</p><button class="btn" id="share-button">청첩장 공유하기</button></div>
      </section>
      <footer class="footer"></footer>
      <nav class="bottom-tabbar" aria-label="주요 메뉴">
        <a href="#wedding-day"><span>일정</span></a>
        <a href="#location"><span>장소</span></a>
        <a href="#gallery"><span>사진</span></a>
        <a href="#attendance"><span>참석 여부</span></a>
        <a href="#guestbook"><span>방명록</span></a>
      </nav>
    </article>`;
  applySectionOrder();
}

function updateCountdown() {
  const gap = weddingDate.getTime() - Date.now();
  const passed = gap < 0;
  let rest = Math.abs(gap);
  const days = Math.floor(rest / 86400000); rest %= 86400000;
  const hours = Math.floor(rest / 3600000); rest %= 3600000;
  const minutes = Math.floor(rest / 60000); rest %= 60000;
  const seconds = Math.floor(rest / 1000);
  const countdown = document.querySelector("#countdown");
  const message = document.querySelector("#countdown-message");
  if (!countdown || !message) return;
  countdown.innerHTML = [["DAYS", days], ["HOUR", hours], ["MIN", minutes], ["SEC", seconds]].map(([label, value]) => `<div class="countdown-item"><strong>${value}</strong><small>${label}</small></div>`).join("");
  message.textContent = passed ? `결혼식으로부터 ${days}일이 지났습니다.` : `결혼식까지 ${days}일 남았습니다.`;
}

function openModal(content) {
  modalRoot.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><div class="modal">${content}</div></div>`;
  document.querySelector("#modal-backdrop").addEventListener("click", (event) => {
    if (event.target.id === "modal-backdrop") closeModal();
  });
  document.querySelector("[data-close]")?.addEventListener("click", closeModal);
}
function closeModal() { modalRoot.innerHTML = ""; }

function shareModal() {
  const url = sharePageUrl();
  return `
    <h2>청첩장 공유하기</h2>
    <p class="form-guide">원하는 방법을 선택해 주세요. 휴대폰의 앱 공유를 누르면 설치된 앱 목록이 열립니다.</p>
    <div class="share-choice-grid">
      <button class="share-choice" type="button" data-kakao-share><strong>카카오톡으로 공유</strong><span>세로형 사진 카드로 바로 공유</span></button>
      <button class="share-choice" type="button" data-native-share><strong>앱으로 공유</strong><span>카카오톡·문자·SNS 선택</span></button>
      <button class="share-choice" type="button" data-copy-link><strong>링크 복사</strong><span>청첩장 주소 복사</span></button>
      <a class="share-choice" href="${escapeHtml(`sms:?&body=${encodeURIComponent(`${data.meta.title}\n${url}`)}`)}"><strong>문자로 공유</strong><span>문자 앱 바로 열기</span></a>
    </div>
    <div class="modal-actions"><button class="btn" type="button" data-close>닫기</button></div>`;
}

function initializeKakaoShare() {
  const key = window.KAKAO_SHARE_CONFIG?.javascriptKey?.trim();
  if (!key || !window.Kakao) return false;
  if (!window.Kakao.isInitialized()) window.Kakao.init(key);
  return window.Kakao.isInitialized();
}

function shareWithKakaoTalk() {
  if (!initializeKakaoShare()) return false;

  const shareUrl = location.origin + "/";
  const imageUrl = data.meta.shareImage || data.hero.image;

  if (!imageUrl) {
    throw new Error("카카오톡 공유용 이미지 또는 메인 사진을 먼저 등록해 주세요.");
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: data.meta.title,
      description: `${data.wedding.displayDate}\n${data.wedding.venue}`,
      imageUrl,
      imageWidth: 600,
      imageHeight: 800,
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
    buttons: [
      {
        title: "청첩장 보기",
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      {
        title: "위치 보기",
        link: {
          mobileWebUrl: shareUrl + "#location",
          webUrl: shareUrl + "#location",
        },
      },
    ],
  });

  return true;
}

function sharePageUrl() {
  return `${location.origin}/api/share`;
}

async function copyInvitationLink() {
  await navigator.clipboard.writeText(sharePageUrl());
  closeModal();
  alert("청첩장 주소를 복사했습니다.");
}

function bindShareModal() {
  document.querySelector("[data-kakao-share]")?.addEventListener("click", async () => {
    try {
      if (!shareWithKakaoTalk()) {
        alert("카카오톡 카드 공유를 사용하려면 kakao-config.js에 JavaScript 키를 등록해 주세요. 앱 공유를 대신 열겠습니다.");
        const shareData = { title: data.meta.title, text: data.meta.description, url: sharePageUrl() };
        if (navigator.share) await navigator.share(shareData);
        else await copyInvitationLink();
      }
    } catch (error) {
      alert(error.message || "카카오톡 공유를 열지 못했습니다. Kakao Developers의 JavaScript SDK 도메인과 제품 링크 웹 도메인을 확인해 주세요.");
    }
  });
  document.querySelector("[data-native-share]")?.addEventListener("click", async () => {
    const shareData = { title: data.meta.title, text: data.meta.description, url: sharePageUrl() };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await copyInvitationLink();
    } catch (error) {
      if (error.name !== "AbortError") alert("공유하지 못했습니다. 링크 복사를 이용해 주세요.");
    }
  });
  document.querySelector("[data-copy-link]")?.addEventListener("click", async () => {
    try { await copyInvitationLink(); }
    catch { alert(`청첩장 주소: ${location.href}`); }
  });
}

function attendanceForm() {
  return `
    <h2>참석 정보 입력</h2>
    <p class="form-guide">기차표와 숙소 준비를 위해 필요한 정보입니다.</p>
    <form class="form-grid" id="attendance-form">
      <label class="field"><span>성함</span><input name="guest_name" required maxlength="30" autocomplete="name"></label>
      <label class="field"><span>연락처</span><input name="phone" required maxlength="20" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000"></label>
      <label class="field"><span>참석 여부</span><select name="attendance" id="attendance-status"><option value="참석">참석합니다</option><option value="불참">참석이 어렵습니다</option></select></label>
      <div class="attendance-details" id="attendance-details">
        <label class="field"><span>출발지</span><select name="origin"><option>서울</option><option>창원</option><option>부산</option><option>기타</option></select></label>
        <label class="field"><span>오는 방법</span><select name="transport"><option>자가용</option><option>기차</option><option>버스</option><option>택시</option><option>도보</option><option>기타</option></select></label>
        <label class="field"><span>기타 출발지 또는 이동 방법</span><input name="travel_details" maxlength="100" placeholder="목록에 없는 경우 적어 주세요."></label>
        <label class="field"><span>출발 일자</span><select name="departure_date"><option value="2026-10-04">당일 (10월 4일)</option><option value="2026-10-03">1일 전 (10월 3일)</option><option value="2026-10-02 이전">2일 이상 전</option></select></label>
        <label class="field"><span>함께 오시는 분</span><textarea name="companions" id="companions" rows="4" maxlength="500" placeholder="한 줄에 한 분씩 이름 또는 관계를 적어 주세요.&#10;예: 어머니&#10;예: 홍길동"></textarea></label>
        <p class="attendance-count">예상 참석 인원 <strong id="attendance-count">1명</strong></p>
        <label class="field"><span>숙소 필요 여부</span><select name="needs_accommodation"><option value="아니오">필요하지 않습니다</option><option value="예">필요합니다</option><option value="미정">아직 모르겠습니다</option></select></label>
      </div>
      <label class="field"><span>추가 전달 사항</span><textarea name="notes" rows="3" maxlength="500" placeholder="교통편이나 숙소 관련 요청을 자유롭게 적어 주세요."></textarea></label>
      <label class="consent"><input type="checkbox" required> <span>교통편 및 숙소 준비를 위한 개인정보 수집에 동의합니다.</span></label>
      <div class="modal-actions"><button class="btn" type="button" data-close>취소</button><button class="btn btn-primary" id="attendance-submit">전달하기</button></div>
    </form>`;
}

function companionLines(value) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function gallerySlider(index = 0) {
  const images = galleryImages();
  const safeIndex = Math.max(0, Math.min(index, images.length - 1));
  return `
    <div class="gallery-slider" data-gallery-index="${safeIndex}">
      <div class="gallery-slider-head">
        <h2>Gallery</h2>
        <button class="gallery-close" type="button" data-close aria-label="닫기">×</button>
      </div>
      <div class="gallery-slide">
        <button class="gallery-nav gallery-prev" type="button" data-gallery-move="-1" aria-label="이전 사진">‹</button>
        <div class="gallery-slide-photo ${data.galleryDisplayMode === "original" ? "is-original" : "is-portrait"}">
          <img src="${escapeHtml(images[safeIndex])}" alt="갤러리 사진 ${safeIndex + 1}">
        </div>
        <button class="gallery-nav gallery-next" type="button" data-gallery-move="1" aria-label="다음 사진">›</button>
      </div>
      <p class="gallery-page">${safeIndex + 1} / ${images.length}</p>
    </div>`;
}

function openGallerySlider(index = 0) {
  openModal(gallerySlider(index));
  const slider = document.querySelector(".gallery-slider");
  let touchStartX = 0;
  const move = (step) => {
    const images = galleryImages();
    const current = Number(slider.dataset.galleryIndex);
    const next = (current + step + images.length) % images.length;
    openGallerySlider(next);
  };
  document.querySelectorAll("[data-gallery-move]").forEach((button) => {
    button.addEventListener("click", () => move(Number(button.dataset.galleryMove)));
  });
  slider.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", (event) => {
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1);
  }, { passive: true });
}

function guestPhotoForm() {
  return `
    <h2>결혼식 사진 업로드</h2>
    <p class="form-guide">휴대폰 갤러리에서 사진을 선택해 주세요. 여러 장을 한 번에 선택할 수 있습니다.</p>
    <form class="form-grid" id="guest-photo-form">
      <label class="consent"><input type="checkbox" required> <span>신랑 신부에게 사진을 전달하기 위해 파일을 업로드하는 것에 동의합니다.</span></label>
      <label class="btn guest-photo-picker">
        <span>갤러리에서 사진 선택</span>
        <input type="file" id="guest-photo-files" accept="image/*" multiple required>
      </label>
      <p class="upload-selection" id="guest-photo-selection">선택된 사진이 없습니다.</p>
      <div class="guest-photo-selection-grid" id="guest-photo-selection-grid"></div>
      <div class="modal-actions"><button class="btn" type="button" data-close>취소</button><button class="btn btn-primary" id="guest-photo-submit">업로드</button></div>
    </form>`;
}

function ownGuestPhotoGallery(photos) {
  return `
    <h2>내가 보낸 사진</h2>
    <p class="form-guide">이 휴대폰 브라우저에서 업로드한 사진입니다. 잘못 올린 사진은 삭제할 수 있습니다.</p>
    <div class="own-photo-grid">
      ${photos.length ? photos.map((photo) => `
        <article class="own-photo">
          <a href="${escapeHtml(photo.signedUrl)}" target="_blank" rel="noopener"><img src="${escapeHtml(photo.signedUrl)}" alt="내가 보낸 사진" loading="lazy"></a>
          <button class="btn" type="button" data-remove-guest-photo="${escapeHtml(photo.path)}">삭제</button>
        </article>`).join("") : '<p class="subtle">아직 이 휴대폰에서 보낸 사진이 없습니다.</p>'}
    </div>
    <p class="form-guide">브라우저 데이터 삭제, 시크릿 모드 종료, 휴대폰 변경 후에는 기존 사진을 직접 관리할 수 없습니다.</p>
    <div class="modal-actions"><button class="btn" type="button" data-close>닫기</button></div>`;
}

async function openOwnGuestPhotos() {
  openModal('<h2>내가 보낸 사진</h2><p class="form-guide">사진을 불러오고 있습니다.</p><div class="modal-actions"><button class="btn" type="button" data-close>닫기</button></div>');
  try {
    const photos = await window.RSVP_STORAGE.listOwnGuestPhotos();
    openModal(ownGuestPhotoGallery(photos));
    document.querySelectorAll("[data-remove-guest-photo]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("이 사진을 삭제할까요?")) return;
        button.disabled = true;
        button.textContent = "삭제 중...";
        try {
          await window.RSVP_STORAGE.removeOwnGuestPhoto(button.dataset.removeGuestPhoto);
          await openOwnGuestPhotos();
        } catch {
          button.disabled = false;
          button.textContent = "삭제";
          alert("사진을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      });
    });
  } catch {
    openModal('<h2>내가 보낸 사진</h2><p class="form-guide">사진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p><div class="modal-actions"><button class="btn" type="button" data-close>닫기</button></div>');
  }
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const copyButton = event.target.closest(".copy-btn");
    if (copyButton) {
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        const original = copyButton.textContent;
        copyButton.textContent = "복사 완료";
        setTimeout(() => { copyButton.textContent = original; }, 1200);
      } catch { alert(`복사할 내용: ${copyButton.dataset.copy}`); }
    }
    const galleryButton = event.target.closest("[data-gallery]");
    if (galleryButton) {
      openGallerySlider(Number(galleryButton.dataset.gallery));
    }
  });

  document.querySelector("#gallery-more")?.addEventListener("click", () => openGallerySlider());

  document.querySelector("#attendance-open")?.addEventListener("click", () => {
    openModal(attendanceForm());
    const form = document.querySelector("#attendance-form");
    const status = document.querySelector("#attendance-status");
    const details = document.querySelector("#attendance-details");
    const companions = document.querySelector("#companions");
    const count = document.querySelector("#attendance-count");
    const updateAttendanceForm = () => {
      const isAttending = status.value === "참석";
      details.hidden = !isAttending;
      count.textContent = `${isAttending ? companionLines(companions.value).length + 1 : 0}명`;
    };
    status.addEventListener("change", updateAttendanceForm);
    companions.addEventListener("input", updateAttendanceForm);
    updateAttendanceForm();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = document.querySelector("#attendance-submit");
      const fields = new FormData(form);
      const isAttending = fields.get("attendance") === "참석";
      const companionList = isAttending ? companionLines(fields.get("companions")) : [];
      submitButton.disabled = true;
      submitButton.textContent = "전달 중...";
      try {
        const result = await window.RSVP_STORAGE.submitAttendanceResponse({
          guest_name: fields.get("guest_name").trim(),
          phone: fields.get("phone").trim(),
          attendance: fields.get("attendance"),
          origin: isAttending ? fields.get("origin") : null,
          transport: isAttending ? fields.get("transport") : null,
          departure_date: isAttending ? fields.get("departure_date") : null,
          travel_details: isAttending ? fields.get("travel_details").trim() : "",
          companions: companionList,
          companion_count: companionList.length,
          total_count: isAttending ? companionList.length + 1 : 0,
          needs_accommodation: isAttending ? fields.get("needs_accommodation") : null,
          notes: fields.get("notes").trim(),
        });
        closeModal();
        alert(result.isPreview
          ? "미리보기 모드로 저장했습니다. 실제 수집을 시작하려면 Supabase 설정을 완료해 주세요."
          : "참석 정보를 전달했습니다. 감사합니다.");
      } catch {
        submitButton.disabled = false;
        submitButton.textContent = "전달하기";
        alert("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  });

  document.querySelector("#guest-photo-open")?.addEventListener("click", () => {
    openModal(guestPhotoForm());
    const form = document.querySelector("#guest-photo-form");
    const files = document.querySelector("#guest-photo-files");
    const selection = document.querySelector("#guest-photo-selection");
    const selectionGrid = document.querySelector("#guest-photo-selection-grid");
    let selectedPhotos = [];
    const renderSelectedPhotos = () => {
      const checkedCount = selectedPhotos.filter((photo) => photo.checked).length;
      selection.textContent = selectedPhotos.length
        ? `${selectedPhotos.length}장 중 ${checkedCount}장을 업로드합니다. 제외할 사진은 체크를 해제해 주세요.`
        : "선택된 사진이 없습니다.";
      selectionGrid.innerHTML = selectedPhotos.map((photo, index) => `
        <label class="guest-photo-selection-card">
          <img src="${escapeHtml(photo.previewUrl)}" alt="선택한 사진 ${index + 1} 미리보기">
          <span><input type="checkbox" data-guest-photo-choice="${index}" ${photo.checked ? "checked" : ""}> 업로드 선택</span>
        </label>`).join("");
    };
    files.click();
    files.addEventListener("change", () => {
      selectedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      selectedPhotos = [...files.files].map((file) => ({ file, checked: true, previewUrl: URL.createObjectURL(file) }));
      renderSelectedPhotos();
    });
    selectionGrid.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-guest-photo-choice]");
      if (!checkbox) return;
      selectedPhotos[Number(checkbox.dataset.guestPhotoChoice)].checked = checkbox.checked;
      renderSelectedPhotos();
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const uploadFiles = selectedPhotos.filter((photo) => photo.checked).map((photo) => photo.file);
      if (!uploadFiles.length) {
        alert("업로드할 사진을 한 장 이상 선택해 주세요.");
        return;
      }
      const button = document.querySelector("#guest-photo-submit");
      button.disabled = true;
      button.textContent = "업로드 중...";
      selection.textContent = `${uploadFiles.length}장의 사진을 전송하고 있습니다. 창을 닫지 말아 주세요.`;
      try {
        await window.RSVP_STORAGE.uploadGuestPhotos(uploadFiles);
        selectedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
        closeModal();
        alert("사진을 전달했습니다. 소중한 순간을 남겨주셔서 감사합니다.");
      } catch (error) {
        button.disabled = false;
        button.textContent = "업로드";
        selection.textContent = error.message || "사진을 업로드하지 못했습니다.";
      }
    });
  });

  document.querySelector("#guest-photo-manage")?.addEventListener("click", openOwnGuestPhotos);

  document.querySelector("#guestbook-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = document.querySelector("#guestbook-submit");
    const fields = new FormData(form);
    button.disabled = true;
    button.textContent = "등록 중...";
    try {
      await window.RSVP_STORAGE.submitGuestbookEntry({
        guest_name: fields.get("guest_name").trim(),
        message: fields.get("message").trim(),
      });
      guestbookEntries = await window.RSVP_STORAGE.loadGuestbookEntries();
      document.querySelector("#guestbook-list").innerHTML = guestbookMarkup();
      form.reset();
      button.disabled = false;
      button.textContent = "메시지 남기기";
    } catch {
      button.disabled = false;
      button.textContent = "메시지 남기기";
      alert("메시지를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  });

  document.querySelector("#share-button").addEventListener("click", () => {
    openModal(shareModal());
    bindShareModal();
  });
}

async function start() {
  applyAppearance(data.appearance);
  data = await window.RSVP_STORAGE.loadInvitationData(data);
  try { guestbookEntries = await window.RSVP_STORAGE.loadGuestbookEntries(); }
  catch { guestbookEntries = []; }
  applyAppearance(data.appearance);
  weddingDate = new Date(data.wedding.date);
  document.title = data.meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", data.meta.description);
  updateSocialMeta();
  render();
  fitSingleLineText();
  loadLazyBackgrounds();
  updateCountdown();
  bindEvents();
  setInterval(updateCountdown, 1000);
}

start();
window.addEventListener("resize", fitSingleLineText);
document.fonts?.ready.then(fitSingleLineText);
