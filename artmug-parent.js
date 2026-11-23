/* 아트머그 상품 페이지(부모)에서 실행되는 스크립트
   - iframe 높이를 내용에 맞게 늘림
   - 아트머그 기본 '더보기/접기' 버튼 제거
   - 스크롤 위치를 iframe에 전달 (바로가기 리모컨 위치용)
   - 이미지 크게 보기 모달
   iframe 주소에서 출처를 자동으로 읽기 때문에, 페이지를 어디에 올려도 주소를 고칠 필요가 없습니다. */
(function () {
  let lastHeight = 0;
  let viewportTimer = null;

  function getIframe() {
    return document.querySelector('#detailViews [name="am-root"] iframe,[name="am-root"] iframe');
  }
  function iframeOrigin() {
    const f = getIframe();
    try { return f ? new URL(f.src, location.href).origin : ''; } catch (e) { return ''; }
  }

  function injectStyle() {
    if (document.getElementById('tona-artmug-parent-style')) return;
    const style = document.createElement('style');
    style.id = 'tona-artmug-parent-style';
    style.textContent = `
html,body{overflow-x:hidden!important}
#detailViews [name="am-root"],[name="am-root"]{text-align:start!important;padding:0!important;margin:0!important;line-height:normal!important;overflow:visible!important}
[name="am-root"] *{box-sizing:border-box}
[name="stage"]{width:100%!important;overflow:visible!important}
[name="am-root"] iframe{display:block!important;width:100%!important;max-width:1180px!important;min-height:700px;height:700px;margin:0 auto!important;border:0!important;overflow:hidden!important}
.btn_open_btn,.btn_open,.btn_close{display:none!important;visibility:hidden!important;pointer-events:none!important}
.tonaModal{position:fixed!important;inset:0!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:18px!important}
.tonaModal__bg{position:absolute!important;inset:0!important;background:rgba(20,20,22,.7)!important}
.tonaModal__panel{position:relative!important;z-index:1!important;width:min(980px,calc(100vw - 36px))!important;max-height:calc(100vh - 36px)!important;background:#fff!important;border-radius:14px!important;overflow:hidden!important}
.tonaModal__close{position:absolute!important;top:12px!important;right:12px!important;z-index:2!important;width:44px!important;height:44px!important;border:0!important;border-radius:999px!important;background:#fff!important;color:#1d1d20!important;cursor:pointer!important;font-size:20px!important;line-height:44px!important;text-align:center!important}
.tonaModal__img{display:block!important;width:100%!important;height:auto!important;max-height:calc(100vh - 36px)!important;object-fit:contain!important;background:#fff!important}
`;
    document.head.appendChild(style);
  }

  function unlockDetail() {
    const box = document.querySelector('.detailinfo');
    if (!box) return;
    box.classList.remove('showstep1');
    box.style.maxHeight = 'none'; box.style.height = 'auto'; box.style.overflow = 'visible';
    const content = box.querySelector('.showcontent');
    if (content) { content.style.maxHeight = 'none'; content.style.height = 'auto'; content.style.overflow = 'visible'; }
  }
  function removeMoreButtons() {
    document.querySelectorAll('.btn_open_btn,.btn_open,.btn_close').forEach(el => el.remove());
  }

  function sendViewport() {
    const f = getIframe(), origin = iframeOrigin();
    if (!f || !f.contentWindow || !origin) return;
    const r = f.getBoundingClientRect();
    f.contentWindow.postMessage({
      source: 'syura-artmug-parent', type: 'SYURA_PARENT_VIEWPORT',
      iframeTop: r.top, iframeLeft: r.left, iframeWidth: r.width, iframeHeight: r.height,
      viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, scrollY: window.scrollY
    }, origin);
  }
  function queueViewport() { clearTimeout(viewportTimer); viewportTimer = setTimeout(sendViewport, 30); }

  function resizeIframe(h) {
    const f = getIframe(); if (!f) return;
    const next = Math.max(700, Math.ceil(Number(h) || 0));
    if (Math.abs(next - lastHeight) >= 4) { lastHeight = next; f.style.height = next + 'px'; }
    queueViewport();
  }
  function scrollParentTo(y, nav) {
    const f = getIframe(); if (!f) return;
    const top = window.scrollY + f.getBoundingClientRect().top;
    window.scrollTo({ top: Math.max(0, top + Number(y || 0) - Number(nav || 0) - 8), behavior: 'smooth' });
    setTimeout(sendViewport, 80); setTimeout(sendViewport, 350);
  }

  const esc = v => String(v || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  function closeModal() { document.querySelectorAll('.tonaModal').forEach(el => el.remove()); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') closeModal(); }
  function openImage(src, title) {
    if (!src) return;
    closeModal();
    const m = document.createElement('div');
    m.className = 'tonaModal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', title || '이미지 보기');
    m.innerHTML = `<div class="tonaModal__bg" data-close="1"></div><div class="tonaModal__panel"><button class="tonaModal__close" type="button" data-close="1" aria-label="닫기">×</button><img class="tonaModal__img" src="${esc(src)}" alt="${esc(title)}"></div>`;
    m.addEventListener('click', e => { if (e.target.dataset && e.target.dataset.close === '1') closeModal(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(m);
  }

  function bind() {
    if (window.__tonaArtmugBound) return;
    window.__tonaArtmugBound = true;
    window.addEventListener('message', e => {
      if (!e.origin || e.origin !== iframeOrigin()) return;
      const d = e.data || {};
      if (d.source !== 'syura-css') return;
      if (d.type === 'SYURA_IFRAME_HEIGHT') resizeIframe(d.height);
      if (d.type === 'SYURA_IFRAME_READY') { [50, 300, 900].forEach(t => setTimeout(sendViewport, t)); }
      if (d.type === 'SYURA_PARENT_SCROLL_TO') scrollParentTo(d.targetY, d.navHeight);
      if (d.type === 'SYURA_OPEN_IMAGE_MODAL') openImage(d.src, d.title || d.caption);
    });
    window.addEventListener('scroll', queueViewport, { passive: true });
    window.addEventListener('resize', queueViewport);
    window.addEventListener('orientationchange', () => setTimeout(sendViewport, 250));
    new MutationObserver(() => { removeMoreButtons(); unlockDetail(); })
      .observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() { injectStyle(); removeMoreButtons(); unlockDetail(); bind(); queueViewport(); }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
  [300, 1000, 2000].forEach(t => setTimeout(init, t));
})();
