/* Koleksi Gamepad M2D v2 - 04/06/2026 */
    const body = document.body;
    const desktopSearch = document.getElementById('desktop-search-input');
    const mobileSearch = document.getElementById('mobile-search-input');
    const searchToggle = document.getElementById('search-toggle');
    const sortSelect = document.getElementById('sort-select');
    const mobileSearchbar = document.getElementById('mobile-searchbar');
    const searchClose = document.getElementById('search-close');
    const siteHeader = document.querySelector('.site-header');
    const resultsNote = document.getElementById('results-note');
    const toolbarChipToggle = document.getElementById('toolbar-chip-toggle');
    const toolbarSortToggle = document.getElementById('toolbar-sort-toggle');
    const toolbarSortProxy = document.getElementById('sort-select-mobile-proxy');
    const toolbarSortLabel = document.getElementById('toolbar-sort-label');
    const toolbarSortNote = document.getElementById('toolbar-sort-note');
    const toolbarChipLabel = document.querySelector('.toolbar-chip-label');
    const productList = document.getElementById('product-list');
    const emptyState = document.getElementById('empty-state');
    const entries = Array.from(productList.querySelectorAll('.entry'));
    entries.forEach((entry, index) => {
      entry.dataset.defaultOrder = index;
    });
    const filterChips = Array.from(document.querySelectorAll('.chip[data-filter]'));
    const moreFiltersToggle = document.getElementById('more-filters-toggle');
    const moreFilters = document.getElementById('more-filters');
    const chipDropdown = document.getElementById('chip-dropdown');
    const defaultMoreLabel = '+ More';
    const descModal = document.getElementById('desc-modal');
    const descModalTitle = document.getElementById('desc-modal-title');
    const descModalText = document.getElementById('desc-modal-text');
    let activeFilter = 'all';
    let query = '';

    const setMoreLabel = (label) => {
      if (!moreFiltersToggle) return;
      moreFiltersToggle.textContent = label || defaultMoreLabel;
      moreFiltersToggle.classList.toggle('is-active', !!label);
    };

    const closeMoreFilters = () => {
      moreFilters?.classList.remove('is-open');
      moreFiltersToggle?.setAttribute('aria-expanded', 'false');
    };

    const syncMoreButtonState = () => {
      const activeHiddenChip = moreFilters?.querySelector('.chip.active');
      setMoreLabel(activeHiddenChip ? activeHiddenChip.textContent.trim() : '');
    };

    const syncQuery = (value, source) => {
      query = value.trim().toLowerCase();
      if (source !== desktopSearch) desktopSearch.value = value;
      if (source !== mobileSearch) mobileSearch.value = value;
      runFilterSort();
    };

    const matchesFilter = (entry) => {
      if (activeFilter === 'all') return true;
      return (entry.dataset.tags || '').toLowerCase().includes(activeFilter);
    };

    const matchesQuery = (entry) => {
      if (!query) return true;
      return entry.textContent.toLowerCase().includes(query);
    };

    const applySort = (items) => {
      const mode = sortSelect.value;
      const arr = [...items];

      if (mode === 'latest') {
        arr.sort((a, b) => Number(a.dataset.defaultOrder) - Number(b.dataset.defaultOrder));
      }

      if (mode === 'oldest') {
        arr.sort((a, b) => Number(b.dataset.defaultOrder) - Number(a.dataset.defaultOrder));
      }

      if (mode === 'price-asc') {
        arr.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
      }

      if (mode === 'price-desc') {
        arr.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
      }

      return arr;
    };

    const updateToolbarMeta = (count) => {
      const labels = {
        'latest': 'Terbaru',
        'oldest': 'Terlama',
        'price-desc': 'Termahal',
        'price-asc': 'Termurah'
      };
      const activeChip = filterChips.find(chip => chip.classList.contains('active'));
      if (toolbarChipLabel) toolbarChipLabel.textContent = activeChip ? activeChip.textContent.trim() : 'Filter';
      if (toolbarSortLabel) toolbarSortLabel.textContent = labels[sortSelect.value] || 'Urutkan';
      if (toolbarSortNote) toolbarSortNote.textContent = `${count} item`;
      if (toolbarSortProxy) toolbarSortProxy.value = sortSelect.value;
    };

    const closeMobileToolbarPanels = () => {
      body.classList.remove('mobile-chips-open');
      toolbarChipToggle?.setAttribute('aria-expanded', 'false');
    };

    const closeDescModal = () => {
      if (!descModal) return;
      descModal.hidden = true;
      body.classList.remove('desc-modal-open');
    };

    const openDescModal = (entry, desc) => {
      if (!descModal || !descModalTitle || !descModalText) return;
      const title = entry?.querySelector('.entry-head h3')?.textContent.trim() || 'Deskripsi lengkap';
      descModalTitle.textContent = title;
      descModalText.textContent = desc.dataset.fullDesc || desc.textContent.trim();
      descModal.hidden = false;
      body.classList.add('desc-modal-open');
      descModal.querySelector('.desc-modal-close')?.focus();
    };

    const getDescLineLimit = () => window.matchMedia('(max-width: 640px)').matches ? 3 : 1;

    const fitEntryDescription = (desc) => {
      const textNode = desc.querySelector('.entry-desc-text');
      const button = desc.querySelector('.entry-desc-more');
      const fullText = desc.dataset.fullDesc || textNode?.textContent.trim() || '';
      if (!textNode || !button || !fullText) return;

      const computed = window.getComputedStyle(desc);
      const lineHeight = parseFloat(computed.lineHeight);
      const maxHeight = Math.ceil(lineHeight * getDescLineLimit());

      desc.style.maxHeight = `${maxHeight}px`;
      desc.classList.remove('is-overflowing');
      desc.removeAttribute('role');
      desc.removeAttribute('tabindex');
      button.hidden = true;
      textNode.textContent = fullText;

      // Ukur langsung di elemen asli agar font, lebar card, dan breakpoint yang dipakai
      // sama persis dengan tampilan nyata. Ini mencegah panah muncul terlalu agresif
      // saat teks sebenarnya masih muat dalam batas baris.
      const isActuallyOverflowing = desc.scrollHeight > maxHeight + 1;
      if (!isActuallyOverflowing) return;

      desc.classList.add('is-overflowing');
      desc.setAttribute('role', 'button');
      desc.setAttribute('tabindex', '0');
      button.hidden = false;

      let low = 0;
      let high = fullText.length;
      let best = '';

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        textNode.textContent = fullText.slice(0, mid).trimEnd() + '…';

        if (desc.scrollHeight <= maxHeight + 1) {
          best = textNode.textContent;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      textNode.textContent = best || '…';
    };

    const refreshEntryDescriptions = () => {
      productList.querySelectorAll('.entry-desc').forEach(fitEntryDescription);
    };

    const scheduleRefreshEntryDescriptions = () => {
      window.requestAnimationFrame(() => {
        refreshEntryDescriptions();
        window.setTimeout(refreshEntryDescriptions, 80);
      });
    };

    const setupEntryDescriptions = () => {
      productList.querySelectorAll('.entry-main > p:not(.entry-desc)').forEach((desc) => {
        const entry = desc.closest('.entry');
        const wrap = document.createElement('div');
        wrap.className = 'entry-desc-wrap';
        const fullText = desc.textContent.trim();

        desc.classList.add('entry-desc');
        desc.dataset.fullDesc = fullText;
        desc.textContent = '';
        desc.parentNode.insertBefore(wrap, desc);
        wrap.appendChild(desc);

        const text = document.createElement('span');
        text.className = 'entry-desc-text';
        text.textContent = fullText;
        desc.appendChild(text);

        const button = document.createElement('button');
        button.className = 'entry-desc-more';
        button.type = 'button';
        button.hidden = true;
        button.setAttribute('aria-label', 'Lihat deskripsi lengkap');
        button.setAttribute('aria-haspopup', 'dialog');
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>';
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          openDescModal(entry, desc);
        });

        desc.addEventListener('click', () => {
          if (desc.classList.contains('is-overflowing')) {
            openDescModal(entry, desc);
          }
        });

        desc.addEventListener('keydown', (event) => {
          if (!desc.classList.contains('is-overflowing')) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openDescModal(entry, desc);
          }
        });

        desc.appendChild(button);
        fitEntryDescription(desc);
      });
    };


    const runFilterSort = () => {
      const visible = entries.filter(e => matchesFilter(e) && matchesQuery(e));
      entries.forEach(e => e.style.display = 'none');
      applySort(visible).forEach(e => {
        e.style.display = '';
        productList.appendChild(e);
      });
      resultsNote.textContent = `${visible.length} item`;
      updateToolbarMeta(visible.length);
      emptyState.style.display = visible.length ? 'none' : 'block';
      scheduleRefreshEntryDescriptions();
    };

    desktopSearch.addEventListener('input', (e) => syncQuery(e.target.value, desktopSearch));
    mobileSearch.addEventListener('input', (e) => syncQuery(e.target.value, mobileSearch));
    document.getElementById('mobile-searchbar').addEventListener('submit', (e) => e.preventDefault());
    sortSelect.addEventListener('change', () => {
      runFilterSort();
      if (toolbarSortProxy && toolbarSortProxy.value !== sortSelect.value) toolbarSortProxy.value = sortSelect.value;
    });

    toolbarSortProxy?.addEventListener('change', (e) => {
      sortSelect.value = e.target.value;
      runFilterSort();
    });

    moreFiltersToggle?.addEventListener('click', (e) => {
      if (window.innerWidth <= 720) return;
      e.stopPropagation();
      const open = moreFilters.classList.toggle('is-open');
      moreFiltersToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-desc-close]')) {
        closeDescModal();
        return;
      }

      if (!chipDropdown?.contains(e.target)) closeMoreFilters();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMoreFilters();
        closeDescModal();
      }
    });

    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.filter;
        runFilterSort();

        if (chip.classList.contains('chip-sub')) {
          setMoreLabel(chip.textContent.trim());
          closeMoreFilters();
        } else {
          setMoreLabel('');
          closeMoreFilters();
        }
      });
    });

    document.querySelectorAll('.more-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const more = btn.nextElementSibling;
        const open = more.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? '−' : '+';
      });
    });

    const openMobileSearch = () => {
      body.classList.add('mobile-search-open');
      mobileSearchbar.classList.add('is-open');
      searchToggle.setAttribute('aria-expanded', 'true');
      searchToggle.setAttribute('aria-label', 'Tutup pencarian');
      siteHeader?.classList.remove('is-hidden');
      mobileSearch.focus();
    };

    const closeMobileSearch = () => {
      body.classList.remove('mobile-search-open');
      mobileSearchbar.classList.remove('is-open');
      searchToggle.setAttribute('aria-expanded', 'false');
      searchToggle.setAttribute('aria-label', 'Buka pencarian');
      mobileSearch.blur();
    };

    searchToggle?.addEventListener('click', () => {
      closeMobileToolbarPanels();
      if (body.classList.contains('mobile-search-open')) {
        closeMobileSearch();
      } else {
        openMobileSearch();
      }
    });

    searchClose?.addEventListener('click', closeMobileSearch);

    toolbarChipToggle?.addEventListener('click', () => {
      if (window.innerWidth > 720) return;
      const willOpen = !body.classList.contains('mobile-chips-open');
      body.classList.toggle('mobile-chips-open', willOpen);
      toolbarChipToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    toolbarSortToggle?.addEventListener('click', () => {
      if (window.innerWidth > 720) return;
      toolbarSortProxy?.focus();
      toolbarSortProxy?.click();
    });

    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateHeader = () => {
      const currentY = window.scrollY;
      const nearTop = currentY < 16;
      const scrollingDown = currentY > lastScrollY;

      if (body.classList.contains('mobile-search-open')) {
        siteHeader?.classList.remove('is-hidden');
      } else if (nearTop || !scrollingDown) {
        siteHeader?.classList.remove('is-hidden');
      } else {
        siteHeader?.classList.add('is-hidden');
      }

      lastScrollY = currentY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };

    let descResizeTimer;
    window.addEventListener('resize', () => {
      if (window.innerWidth > 720) {
        closeMobileToolbarPanels();
      } else {
        closeMoreFilters();
      }

      window.clearTimeout(descResizeTimer);
      descResizeTimer = window.setTimeout(scheduleRefreshEntryDescriptions, 80);
    });

    window.addEventListener('orientationchange', scheduleRefreshEntryDescriptions);
    window.addEventListener('load', scheduleRefreshEntryDescriptions);
    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleRefreshEntryDescriptions).catch(() => {});
    }

    setupEntryDescriptions();
    syncMoreButtonState();
    runFilterSort();
    scheduleRefreshEntryDescriptions();
    updateHeader();
    window.addEventListener('scroll', onScroll, { passive: true });