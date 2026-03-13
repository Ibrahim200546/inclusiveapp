// ========== СКРЫТИЕ/ПОКАЗ HEADER ПРИ СКРОЛЛЕ ==========
let lastScrollTop = 0;
const header = document.querySelector('.header');

window.addEventListener('scroll', function () {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Если скроллим вниз и прошли больше 100px
  if (scrollTop > lastScrollTop && scrollTop > 100) {
    header.classList.add('hidden');
  }
  // Если скроллим вверх
  else if (scrollTop < lastScrollTop) {
    header.classList.remove('hidden');
  }

  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}, false);
