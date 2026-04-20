(() => {
  const body = document.body;
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const backTops = document.querySelectorAll('.back-top-floating');
  const siteHeader = document.querySelector('.site-header');
  const topbar = document.querySelector('.topbar');
  const hashLinks = document.querySelectorAll('a[href^="#"]');

  let lastScrollY = window.scrollY;
  let ticking = false;
  let isAnchoring = false;
  let anchorUnlockTimer = null;

  const threshold = 10;
  const revealOffset = 80;
  const mobileMenuDelay = 320;

  const getHeaderOffset = () => {
    return topbar ? topbar.offsetHeight : (siteHeader ? siteHeader.offsetHeight : 0);
  };

  const getAnchorGap = () => {
    return window.matchMedia('(max-width: 640px)').matches ? 8 : 12;
  };

  const closeMobileMenu = () => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');

    if (siteHeader) {
      siteHeader.classList.remove('is-hidden');
    }
  };

  const lockHeaderForAnchor = () => {
    if (!siteHeader) return;
    isAnchoring = true;
    siteHeader.classList.remove('is-hidden');
    siteHeader.classList.add('is-anchoring');
    clearTimeout(anchorUnlockTimer);
  };

  const scheduleAnchorUnlock = () => {
    clearTimeout(anchorUnlockTimer);
    anchorUnlockTimer = setTimeout(() => {
      isAnchoring = false;
      if (siteHeader) {
        siteHeader.classList.remove('is-anchoring');
      }
      lastScrollY = window.scrollY;
      updateHeader();
    }, 140);
  };

  const scrollToHashTarget = (hash) => {
    const target = document.querySelector(hash);
    if (!target) return;

    lockHeaderForAnchor();

    const headerOffset = getHeaderOffset();
    const extraGap = getAnchorGap();
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - extraGap;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: 'smooth'
    });

    if (history.replaceState) {
      history.replaceState(null, '', hash);
    } else {
      window.location.hash = hash;
    }

    scheduleAnchorUnlock();
  };

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('is-open', !expanded);

      if (siteHeader) {
        siteHeader.classList.remove('is-hidden');
      }
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });
  }

  hashLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) return;

      event.preventDefault();

      if (menu && menu.contains(link)) {
        closeMobileMenu();
        setTimeout(() => {
          scrollToHashTarget(href);
        }, mobileMenuDelay);
      } else {
        scrollToHashTarget(href);
      }
    });
  });

  const updateBackTop = () => {
    backTops.forEach((btn) => {
      btn.classList.toggle('is-visible', window.scrollY > 280);
    });
  };

  const updateHeader = () => {
    if (!siteHeader || isAnchoring) return;

    const currentScrollY = window.scrollY;
    const menuOpen = toggle && toggle.getAttribute('aria-expanded') === 'true';
    const searchOpen = body.classList.contains('mobile-search-open');

    if (menuOpen || searchOpen) {
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

    if (isAnchoring) {
      scheduleAnchorUnlock();
    }

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
    closeMobileMenu,
    updateBackTop,
    updateHeader,
  };
})();
