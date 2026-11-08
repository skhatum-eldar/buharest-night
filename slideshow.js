const resource = './resources/';
const pages = [
  { title: 'Приглашение', alt: 'Ночь в Бухаресте. Зубы за один день. Бунэ сяра, ромалэ! С наступающим! Приглашаем на новогоднюю тусовку.' },
  { title: 'Где и когда', alt: 'Где и когда. 19 декабря 2026, 18:00–01:00. Ресторан Партизано. Дресс-код строго обязателен. Стиль: цыганский шик.' },
  { title: 'Программа ночи', alt: 'Программа ночи. Знакомимся с козой, гадаем на таро, пробуем сливовую водку, кочуем между локациями, танцуем под Disko Partizani. И радуем барона: за счастье и деньги в 2027-м!' },
  { title: 'Для неё', alt: 'Для неё. Корсеты и длинные юбки. Платки, бархат и кружева. Крупные украшения. Два женских образа и детали аксессуаров.' },
  { title: 'Для него', alt: 'Для него. Свободные рубашки и жилеты. Широкие брюки, платки и пояса. Цепи, кольца, браслеты. Два мужских образа и детали аксессуаров.' }
];

const note = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M13 23V9l13-3v14M13 13l13-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="8.8" cy="24" rx="4.3" ry="3" stroke="currentColor" stroke-width="1.7"/><ellipse cx="21.8" cy="21" rx="4.3" ry="3" stroke="currentColor" stroke-width="1.7"/><path class="mute-slash" d="M4 3l25 26" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`;
const carpet = '<div class="rug-surface"><div class="rug-border"></div></div>';

document.querySelector('#app').innerHTML = `
  <main id="deck" class="deck" tabindex="-1" aria-label="Приглашение, страница 1 из 5" aria-roledescription="постраничное приглашение" aria-hidden="true" inert data-page="1">
    <div id="ambient" class="ambient" aria-hidden="true"></div>
    <div id="slide-track" class="slide-track">
      ${pages.map((page, i) => `
        <section class="slide${i === 0 ? ' is-current' : ''}" style="--position:${i}" role="group" aria-roledescription="слайд" aria-label="${i + 1} из 5. ${page.title}" aria-hidden="${i !== 0}">
          <img id="page-${i + 1}" class="page-image" ${i === 0 ? `src="${resource}slide-1.png" fetchpriority="high"` : `data-src="${resource}slide-${i + 1}.png"`} width="941" height="1672" alt="${page.alt}" draggable="false" decoding="async">
        </section>
      `).join('')}
    </div>
    <div id="swipe-hint" class="swipe-hint" aria-hidden="true"><span>Листайте вверх</span><svg viewBox="0 0 28 28" fill="none"><path d="M7 17l7-7 7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
  </main>

  <section id="gate" class="gate" aria-label="Ковёр. Вход в приглашение">
    <div class="gate-half gate-left" aria-hidden="true">${carpet}</div>
    <div class="gate-half gate-right" aria-hidden="true">${carpet}</div>
    <div class="carpet-seam" aria-hidden="true"></div>
    <div class="gate-action">
      <button id="enter" class="enter-button" aria-label="Открыть приглашение"><span>Нажмите сюда</span><small>открыть приглашение</small></button>
      <p id="entry-status" class="entry-status" aria-live="polite">Со звуком</p>
    </div>
  </section>

  <button id="sound-toggle" class="sound-toggle is-muted" type="button" aria-label="Включить музыку" aria-pressed="false" title="Включить музыку" hidden>${note}</button>
  <audio id="soundtrack" preload="auto" loop playsinline src="${resource}disco-partizani.mp3"></audio>
  <p id="page-announcement" class="sr-only" aria-live="polite" aria-atomic="true"></p>
  <p id="notice" class="notice" role="status" aria-live="polite" hidden></p>
`;

const deck = document.querySelector('#deck');
const track = document.querySelector('#slide-track');
const slides = [...document.querySelectorAll('.slide')];
const images = [...document.querySelectorAll('.page-image')];
const ambient = document.querySelector('#ambient');
const gate = document.querySelector('#gate');
const enterButton = document.querySelector('#enter');
const entryStatus = document.querySelector('#entry-status');
const soundButton = document.querySelector('#sound-toggle');
const soundtrack = document.querySelector('#soundtrack');
const swipeHint = document.querySelector('#swipe-hint');
const announcement = document.querySelector('#page-announcement');
const notice = document.querySelector('#notice');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const loads = new Map();
let entered = false;
let opening = false;
let navigating = false;
let current = 0;
let pointer = null;
let wheelUsed = false;
let wheelDelta = 0;
let wheelTimer;
let noticeTimer;
let gestureVersion = 0;
let wantsAudio = false;

soundtrack.volume = 0.65;

function showNotice(message) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.hidden = false;
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 4200);
}

function updateSound() {
  const playing = !soundtrack.paused && !soundtrack.ended && !soundtrack.error;
  soundButton.classList.toggle('is-muted', !playing);
  soundButton.classList.toggle('is-playing', playing);
  soundButton.setAttribute('aria-pressed', String(playing));
  const label = playing ? 'Выключить музыку' : 'Включить музыку';
  soundButton.setAttribute('aria-label', label);
  soundButton.title = label;
}

function playSound() {
  wantsAudio = true;
  if (soundtrack.error) soundtrack.load();
  const request = soundtrack.play();
  if (request) request.catch(() => {
    updateSound();
    if (wantsAudio) showNotice('Нажмите на ноту, чтобы включить музыку.');
  });
}

soundtrack.addEventListener('playing', updateSound);
soundtrack.addEventListener('pause', updateSound);
soundtrack.addEventListener('ended', updateSound);
soundtrack.addEventListener('error', () => {
  updateSound();
  if (entered && wantsAudio) showNotice('Музыка не загрузилась. Нажмите на ноту для повтора.');
});

soundButton.addEventListener('click', event => {
  event.stopPropagation();
  if (!soundtrack.paused) {
    wantsAudio = false;
    soundtrack.pause();
  } else {
    playSound();
  }
});

function loadPage(index) {
  if (index < 0 || index >= pages.length) return Promise.resolve(false);
  const image = images[index];
  if (image.complete && image.naturalWidth > 0) return Promise.resolve(true);
  if (loads.has(index)) return loads.get(index);

  const pending = new Promise(resolve => {
    let done = false;
    let timer;
    const finish = success => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
      if (!success) loads.delete(index);
      resolve(success);
    };
    const onLoad = () => {
      if (image.decode) image.decode().then(() => finish(true)).catch(() => finish(image.naturalWidth > 0));
      else finish(true);
    };
    const onError = () => finish(false);
    image.addEventListener('load', onLoad, { once: true });
    image.addEventListener('error', onError, { once: true });
    timer = setTimeout(() => finish(false), 18000);
    if (image.dataset.src) {
      image.src = image.dataset.src;
      delete image.dataset.src;
    } else if (image.complete && image.naturalWidth === 0) {
      image.src = `${resource}slide-${index + 1}.png`;
    }
    if (image.complete && image.naturalWidth > 0) onLoad();
  });
  loads.set(index, pending);
  return pending;
}

function prefetch(index) {
  if (index >= 0 && index < pages.length) loadPage(index);
}

function updatePage() {
  track.style.transform = `translate3d(0, -${current * 100}%, 0)`;
  deck.dataset.page = String(current + 1);
  deck.setAttribute('aria-label', `Приглашение, страница ${current + 1} из ${pages.length}`);
  slides.forEach((slide, index) => {
    const active = index === current;
    slide.classList.toggle('is-current', active);
    slide.setAttribute('aria-hidden', String(!active));
  });
  ambient.style.backgroundImage = `url('${resource}slide-${current + 1}.png')`;
  announcement.textContent = `${current + 1} из ${pages.length}. ${pages[current].title}`;
  prefetch(current + 1);
  prefetch(current - 1);
}

async function goTo(index) {
  if (!entered || opening || navigating || index < 0 || index >= pages.length || index === current) return;
  navigating = true;
  swipeHint.classList.add('is-dismissed');
  const available = await loadPage(index);
  if (!available) {
    navigating = false;
    showNotice('Страница не загрузилась. Свайпните ещё раз для повтора.');
    return;
  }
  current = index;
  updatePage();
  setTimeout(() => { navigating = false; }, reducedMotion.matches ? 0 : 620);
}

enterButton.addEventListener('click', async () => {
  if (entered || opening) return;
  opening = true;
  enterButton.disabled = true;
  entryStatus.textContent = 'Открываем…';
  // Called inside the tap handler, before awaiting image decoding, for iOS audio activation.
  playSound();
  const available = await loadPage(0);
  if (!available) {
    opening = false;
    enterButton.disabled = false;
    entryStatus.textContent = 'Не удалось загрузить страницу. Нажмите ещё раз.';
    wantsAudio = false;
    soundtrack.pause();
    return;
  }

  entered = true;
  deck.inert = false;
  deck.setAttribute('aria-hidden', 'false');
  updatePage();
  gate.classList.add('is-opening');
  gate.inert = true;

  setTimeout(() => {
    gate.hidden = true;
    opening = false;
    soundButton.hidden = false;
    updateSound();
    deck.focus({ preventScroll: true });
    swipeHint.classList.add('is-visible');
    setTimeout(() => swipeHint.classList.add('is-dismissed'), 4200);
    // Only one image is required for entry; the rest warm up quietly after the rug opens.
    pages.forEach((_, index) => setTimeout(() => prefetch(index), index * 250));
  }, reducedMotion.matches ? 0 : 1050);
});

deck.addEventListener('pointerdown', event => {
  if (!entered || opening || !event.isPrimary || event.button !== 0) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, version: gestureVersion };
  try { deck.setPointerCapture(event.pointerId); } catch { /* The gesture can still complete inside the stage. */ }
});

deck.addEventListener('pointerup', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const start = pointer;
  pointer = null;
  try { deck.releasePointerCapture(event.pointerId); } catch { /* Capture may already have ended. */ }
  if (start.version !== gestureVersion) return;
  const dy = event.clientY - start.y;
  const dx = event.clientX - start.x;
  const threshold = Math.max(42, Math.min(80, deck.clientHeight * 0.07));
  if (Math.abs(dy) < threshold || Math.abs(dy) < Math.abs(dx) * 1.2) return;
  goTo(current + (dy < 0 ? 1 : -1));
});

deck.addEventListener('pointercancel', () => { pointer = null; });

deck.addEventListener('wheel', event => {
  if (!entered || opening || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  event.preventDefault();
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => { wheelUsed = false; wheelDelta = 0; }, 220);
  if (wheelUsed) return;
  const amount = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? deck.clientHeight : 1);
  wheelDelta += amount;
  if (Math.abs(wheelDelta) < 35) return;
  wheelUsed = true;
  goTo(current + (wheelDelta > 0 ? 1 : -1));
}, { passive: false });

window.addEventListener('keydown', event => {
  if (!entered || opening || event.altKey || event.metaKey || event.ctrlKey) return;
  if (event.target.closest('button, a, input, textarea, select')) return;
  const action = {
    ArrowDown: () => goTo(current + 1),
    PageDown: () => goTo(current + 1),
    ArrowUp: () => goTo(current - 1),
    PageUp: () => goTo(current - 1),
    Home: () => goTo(0),
    End: () => goTo(pages.length - 1),
    ' ': () => goTo(current + (event.shiftKey ? -1 : 1))
  }[event.key];
  if (action) { event.preventDefault(); action(); }
});

window.addEventListener('resize', () => {
  gestureVersion += 1;
  pointer = null;
});

ambient.style.backgroundImage = `url('${resource}slide-1.png')`;
loadPage(0).then(success => { if (success) prefetch(1); });
updateSound();
