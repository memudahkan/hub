const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const backTop = document.querySelector('.back-top-floating');
  const siteHeader = document.querySelector('.site-header');

  let lastScrollY = window.scrollY;
  let ticking = false;
  const threshold = 10;
  const revealOffset = 80;

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('is-open', !expanded);

      if (siteHeader) {
        siteHeader.classList.remove('is-hidden');
      }
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');

        if (siteHeader) {
          siteHeader.classList.remove('is-hidden');
        }
      });
    });
  }

  const updateBackTop = () => {
    if (!backTop) return;
    if (window.scrollY > 280) {
      backTop.classList.add('is-visible');
    } else {
      backTop.classList.remove('is-visible');
    }
  };

  const updateHeader = () => {
    if (!siteHeader) return;

    const currentScrollY = window.scrollY;
    const menuOpen = toggle && toggle.getAttribute('aria-expanded') === 'true';

    if (menuOpen) {
      siteHeader.classList.remove('is-hidden');
      lastScrollY = currentScrollY;
      return;
    }

    if (currentScrollY <= 0 || currentScrollY < revealOffset) {
      siteHeader.classList.remove('is-hidden');
    } else if (currentScrollY > lastScrollY + threshold) {
      siteHeader.classList.add('is-hidden');
    } else if (currentScrollY < lastScrollY - threshold) {
      siteHeader.classList.remove('is-hidden');
    }

    lastScrollY = currentScrollY;
  };

  const onScroll = () => {
    updateBackTop();

    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateHeader();
        ticking = false;
      });
      ticking = true;
    }
  };

  updateBackTop();
  updateHeader();
  window.addEventListener('scroll', onScroll, { passive: true });
window.M2DShared = {
  closeMobileMenu: () => {
    const toggle = document.querySelector('.menu-toggle');
    const menu = document.getElementById('mobile-menu');
    const siteHeader = document.querySelector('.site-header');
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    if (siteHeader) siteHeader.classList.remove('is-hidden');
  },
  updateHeader: () => {
    window.dispatchEvent(new Event('scroll'));
  }
};
