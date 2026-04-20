(() => {
  const body = document.body;
  const searchToggle = document.querySelector('.search-toggle');
  const searchBar = document.getElementById('mobile-search-form');
  const searchClose = document.querySelector('.search-close');
  const featuredSection = document.getElementById('featured-section');
  const heroSection = document.querySelector('.hero');
  const desktopSearchForm = document.querySelector('.desktop-search');
  const mobileSearchForm = document.getElementById('mobile-search-form');
  const desktopSearchInput = document.getElementById('desktop-search-input');
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const searchStatusWrap = document.getElementById('search-status-wrap');
  const searchStatus = document.getElementById('search-status');
  const noResults = document.getElementById('no-results');

  const closeMobileSearch = ({ clear = false } = {}) => {
    if (!searchToggle || !searchBar) return;

    searchToggle.setAttribute('aria-expanded', 'false');
    searchBar.classList.remove('is-open');
    body.classList.remove('mobile-search-open');

    if (clear) {
      if (desktopSearchInput) {
        desktopSearchInput.value = '';
      }
      if (mobileSearchInput) {
        mobileSearchInput.value = '';
      }
      runSearch('');
    }

    if (window.M2DShared && typeof window.M2DShared.updateHeader === 'function') {
      window.M2DShared.updateHeader();
    }
  };

  if (searchToggle && searchBar) {
    searchToggle.addEventListener('click', () => {
      if (window.M2DShared && typeof window.M2DShared.closeMobileMenu === 'function') {
        window.M2DShared.closeMobileMenu();
      }

      const expanded = searchToggle.getAttribute('aria-expanded') === 'true';
      searchToggle.setAttribute('aria-expanded', String(!expanded));
      searchBar.classList.toggle('is-open', !expanded);
      body.classList.toggle('mobile-search-open', !expanded);

      if (!expanded && mobileSearchInput) {
        mobileSearchInput.focus();
      }

      if (window.M2DShared && typeof window.M2DShared.updateHeader === 'function') {
        window.M2DShared.updateHeader();
      }
    });
  }

  if (searchClose) {
    searchClose.addEventListener('click', () => {
      closeMobileSearch({ clear: true });
      if (mobileSearchInput) {
        mobileSearchInput.blur();
      }
    });
  }

  const searchableItems = Array.from(document.querySelectorAll('.resource-list li')).map((item) => {
    const group = item.closest('.resource-group');
    const section = item.closest('.section');
    const subtitle = group ? group.querySelector('.resource-subtitle') : null;
    const sectionTitle = section ? section.querySelector('.section-head h2') : null;

    const searchableText = [
      item.textContent,
      subtitle ? subtitle.textContent : '',
      sectionTitle ? sectionTitle.textContent : ''
    ].join(' ').toLowerCase();

    return { item, searchableText };
  });

  const normalizeQuery = (value) => value.toLowerCase().trim().replace(/\s+/g, ' ');
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\]/g, '\$&');

  const clearHighlights = (root) => {
    root.querySelectorAll('mark.search-hit').forEach((mark) => {
      const textNode = document.createTextNode(mark.textContent);
      mark.replaceWith(textNode);
    });
    root.normalize();
  };

  const highlightInElement = (root, query) => {
    if (!query) return;

    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('.inline-links')) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('mark')) return NodeFilter.FILTER_REJECT;
        if (!regex.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        regex.lastIndex = 0;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      textNodes.push(currentNode);
    }

    textNodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      const parts = node.nodeValue.split(regex);

      parts.forEach((part) => {
        if (!part) return;

        if (part.toLowerCase() === query.toLowerCase()) {
          const mark = document.createElement('mark');
          mark.className = 'search-hit';
          mark.textContent = part;
          frag.appendChild(mark);
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });

      node.parentNode.replaceChild(frag, node);
    });
  };

  const updateSearchUI = (query, matchCount) => {
    if (!searchStatusWrap || !searchStatus || !noResults) return;

    if (!query) {
      searchStatusWrap.hidden = true;
      noResults.hidden = true;
      return;
    }

    searchStatusWrap.hidden = false;
    searchStatus.textContent = `${matchCount} hasil untuk "${query}"`;
    noResults.hidden = matchCount !== 0;
  };

  function runSearch(rawQuery) {
    const query = normalizeQuery(rawQuery);
    let matchCount = 0;

    if (heroSection) {
      heroSection.hidden = !!query;
    }

    if (featuredSection) {
      featuredSection.hidden = !!query;
    }

    searchableItems.forEach(({ item, searchableText }) => {
      clearHighlights(item);

      const matched = !query || searchableText.includes(query);
      item.hidden = !matched;

      if (matched) {
        matchCount++;
        if (query) {
          highlightInElement(item, query);
        }
      }
    });

    document.querySelectorAll('.resource-group').forEach((group) => {
      const visibleItems = Array.from(group.querySelectorAll('.resource-list li'))
        .some((item) => !item.hidden);

      group.hidden = !visibleItems;
    });

    document.querySelectorAll('.section').forEach((section) => {
      if (featuredSection && section === featuredSection) {
        return;
      }

      const hasLists = !!section.querySelector('.resource-list');

      if (!hasLists) {
        section.hidden = false;
        return;
      }

      const visibleItems = Array.from(section.querySelectorAll('.resource-list li'))
        .some((item) => !item.hidden);

      section.hidden = !visibleItems;
    });

    updateSearchUI(query, query ? matchCount : 0);
  }

  const syncSearchInputs = (source, value) => {
    if (source !== desktopSearchInput && desktopSearchInput) {
      desktopSearchInput.value = value;
    }
    if (source !== mobileSearchInput && mobileSearchInput) {
      mobileSearchInput.value = value;
    }
  };

  const handleSearchInput = (event) => {
    const value = event.target.value || '';
    syncSearchInputs(event.target, value);
    runSearch(value);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const input = form.querySelector('input[type="search"]');
    const value = input ? input.value : '';

    syncSearchInputs(input, value);
    runSearch(value);
  };

  const preventEnterKeySubmit = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const value = event.target.value || '';
      syncSearchInputs(event.target, value);
      runSearch(value);
    }
  };

  if (desktopSearchInput) {
    desktopSearchInput.addEventListener('input', handleSearchInput);
    desktopSearchInput.addEventListener('keydown', preventEnterKeySubmit);
  }

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', handleSearchInput);
    mobileSearchInput.addEventListener('keydown', preventEnterKeySubmit);
    mobileSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMobileSearch();
        mobileSearchInput.blur();
      }
    });
  }

  if (desktopSearchForm) {
    desktopSearchForm.addEventListener('submit', handleSearchSubmit);
  }

  if (mobileSearchForm) {
    mobileSearchForm.addEventListener('submit', handleSearchSubmit);
  }

  runSearch('');
})();
