// ========== СКРЫТИЕ/ПОКАЗ HEADER ПРИ СКРОЛЛЕ ==========
let lastScrollTop = 0;
const header = document.querySelector('.header');
let scrollTicking = false;

function syncHeaderWithScroll() {
  scrollTicking = false;
  if (!header) return;

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // The welcome heading is now in document flow. Hiding it would shorten the
  // page, reset scrolling and immediately show it again, moving menu buttons.
  if (document.getElementById('levelsScreen')?.classList.contains('active')) {
    header.classList.remove('hidden');
    lastScrollTop = scrollTop;
    return;
  }

  // Если скроллим вниз и прошли больше 100px
  if (scrollTop > lastScrollTop && scrollTop > 100) {
    header.classList.add('hidden');
  }
  // Если скроллим вверх
  else if (scrollTop < lastScrollTop) {
    header.classList.remove('hidden');
  }

  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}

window.addEventListener('scroll', function () {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(syncHeaderWithScroll);
}, { passive: true });
