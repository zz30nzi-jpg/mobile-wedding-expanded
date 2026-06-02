(function () {
  const COMMON_PROMPT = "모바일 청첩장 디자인 보조 도구입니다. 메인 사진은 교체하지 않습니다. 이미지 요소는 #FFFFFF 배경으로 생성하고 후처리에서 배경을 제거합니다.";
  const templates = {
    palette: "컬러 팔레트를 배경, 카드, 메인 텍스트, 서브 텍스트, 포인트, 라인 색으로 제안합니다.",
    movie: "영화 또는 컨셉의 무드를 팔레트, 프레임, 문구 테마, 섹션 아이콘, 배경 장식 방향으로 제안합니다.",
    frame: "420x670 세로 프레임입니다. 중앙을 비우고 사진을 가리지 않는 4면 구조로 생성합니다. 정사각형은 금지합니다.",
    textTheme: "이미지가 아니라 position, align, shadow, boxEnabled, nameSize, dateSize를 포함하는 JSON 레이아웃을 제안합니다.",
    sectionIcon: "512x512, 단색 또는 2색, 작은 크기에서도 식별 가능한 섹션 아이콘을 생성합니다.",
    background: "1920x1080, 저채도 저명도, 본문 가독성을 방해하지 않는 배경 장식을 생성합니다.",
  };
  window.AI_PROMPTS = { COMMON_PROMPT, templates, compose: (key) => `${COMMON_PROMPT}\n${templates[key] || ""}` };
})();
