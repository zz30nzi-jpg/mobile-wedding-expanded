(function () {
  function describe(settings = {}) {
    return {
      removeWhiteBackground: settings.removeWhiteBackground !== false,
      whiteTolerance: Number(settings.whiteTolerance ?? 24),
      convertSvg: Boolean(settings.convertSvg),
      savePng: settings.savePng !== false,
      flow: ["흰색 배경 이미지 생성", "near-white 배경 제거", "투명 PNG 또는 SVG 변환", "미리보기", "사용자 수락", "저장"],
    };
  }
  window.AI_POSTPROCESS = { describe };
})();
