(function(api, config) {
  var BASE = config.baseUrl;
  var mangaPath = config.mangaPath || 'manga';

  function parseDoc(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function absUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('//')) return 'https:' + path;
    if (path.startsWith('/')) return BASE + path;
    return BASE + '/' + path;
  }

  function dedup(arr) {
    var seen = {};
    return arr.filter(function(m) {
      if (seen[m.slug]) return false;
      seen[m.slug] = true;
      return true;
    });
  }

  function parseMangaList(html) {
    var doc = parseDoc(html);
    var items = doc.querySelectorAll('.page-item-detail, .manga-item, div.badge-pos-1');
    var results = [];
    items.forEach(function(el) {
      var linkEl = el.querySelector('a[href*="/' + mangaPath + '/"], a[href*="/manga/"]') || el.querySelector('a');
      if (!linkEl) return;
      var href = linkEl.getAttribute('href') || '';
      var slug = href.replace(/\/$/, '').split('/').pop() || '';
      var titleEl = el.querySelector('.post-title a, .item-summary a, h3 a, h5 a') || linkEl;
      var title = (titleEl.textContent || '').trim();
      var imgEl = el.querySelector('img');
      var cover = '';
      if (imgEl) {
        cover = imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '';
      }
      if (slug && title) {
        results.push({
          sourceId: config.id,
          slug: slug,
          title: title,
          coverUrl: absUrl(cover),
        });
      }
    });
    return dedup(results);
  }

  return {
    id: config.id,
    name: config.name,
    lang: config.lang || 'es',
    baseUrl: BASE,
    icon: config.icon || config.name.substring(0, 2).toUpperCase(),
    iconColor: config.iconColor || '#6c5ce7',

    search: async function(query, page) {
      var p = page || 1;
      var url = BASE + '/page/' + p + '/?s=' + encodeURIComponent(query) + '&post_type=wp-manga';
      var html = await api.getText(url);
      var doc = parseDoc(html);
      var items = doc.querySelectorAll('.c-tabs-item__content, .row.c-tabs-item__content, div.search-wrap .tab-content-wrap .c-tabs-item .row');
      var results = [];
      items.forEach(function(el) {
        var linkEl = el.querySelector('.post-title a, h3 a, a');
        if (!linkEl) return;
        var href = linkEl.getAttribute('href') || '';
        var slug = href.replace(/\/$/, '').split('/').pop() || '';
        var title = (linkEl.textContent || '').trim();
        var imgEl = el.querySelector('img');
        var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
        if (slug && title) {
          results.push({ sourceId: config.id, slug: slug, title: title, coverUrl: absUrl(cover) });
        }
      });
      if (results.length === 0) {
        results = parseMangaList(html);
      }
      return dedup(results);
    },

    getPopular: async function(page) {
      var p = page || 1;
      var url = BASE + '/' + mangaPath + '/page/' + p + '/?m_orderby=views';
      try {
        var html = await api.getText(url);
        return parseMangaList(html);
      } catch(e) {
        var url2 = BASE + '/' + mangaPath + '/?page=' + p;
        var html2 = await api.getText(url2);
        return parseMangaList(html2);
      }
    },

    getLatest: async function(page) {
      var p = page || 1;
      var url = BASE + '/' + mangaPath + '/page/' + p + '/?m_orderby=latest';
      try {
        var html = await api.getText(url);
        return parseMangaList(html);
      } catch(e) {
        return [];
      }
    },

    getMangaDetail: async function(slug) {
      var url = BASE + '/' + mangaPath + '/' + slug + '/';
      var html = await api.getText(url);
      var doc = parseDoc(html);
      var titleEl = doc.querySelector('.post-title h1, .post-title h3, #manga-title h1');
      var title = titleEl ? titleEl.textContent.trim() : slug;
      var imgEl = doc.querySelector('.summary_image img, .tab-summary img');
      var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
      var descEl = doc.querySelector('.summary__content .manga-excerpt, .description-summary .summary__content, div.summary__content');
      var desc = descEl ? descEl.textContent.trim() : '';
      var genres = [];
      doc.querySelectorAll('.genres-content a, .tags-content a').forEach(function(a) {
        genres.push(a.textContent.trim());
      });
      var authorEl = doc.querySelector('.author-content a, .artist-content a');
      var statusEl = doc.querySelector('.post-status .summary-content, .post-content_item:last-child .summary-content');
      return {
        slug: slug,
        title: title,
        coverUrl: absUrl(cover),
        description: desc,
        status: statusEl ? statusEl.textContent.trim().toLowerCase() : '',
        genres: genres,
        author: authorEl ? authorEl.textContent.trim() : undefined,
      };
    },

    getChapters: async function(mangaSlug) {
      var url = BASE + '/' + mangaPath + '/' + mangaSlug + '/ajax/chapters/';
      try {
        var html = await api.postText(url);
        var doc = parseDoc(html);
        var chapters = [];
        doc.querySelectorAll('.wp-manga-chapter, li.a-h').forEach(function(el) {
          var linkEl = el.querySelector('a');
          if (!linkEl) return;
          var href = linkEl.getAttribute('href') || '';
          var chId = href.replace(/\/$/, '').split('/').pop() || '';
          var text = linkEl.textContent.trim();
          var num = text.match(/[Cc]ap[íi]tulo\s*([\d.]+)|[Cc]hapter\s*([\d.]+)|([\d.]+)/);
          var dateEl = el.querySelector('.chapter-release-date, span.chapter-time');
          chapters.push({
            id: mangaSlug + '/' + chId,
            sourceId: config.id,
            mangaSlug: mangaSlug,
            chapterNumber: num ? (num[1] || num[2] || num[3] || '0') : '0',
            title: text,
            language: 'es',
            publishDate: dateEl ? dateEl.textContent.trim() : '',
          });
        });
        return chapters;
      } catch(e) {
        var fallbackUrl = BASE + '/' + mangaPath + '/' + mangaSlug + '/';
        var html2 = await api.getText(fallbackUrl);
        var doc2 = parseDoc(html2);
        var chapters2 = [];
        doc2.querySelectorAll('.wp-manga-chapter a, .version-chap a').forEach(function(a) {
          var href = a.getAttribute('href') || '';
          var chId = href.replace(/\/$/, '').split('/').pop() || '';
          var text = a.textContent.trim();
          var num = text.match(/[\d.]+/);
          chapters2.push({
            id: mangaSlug + '/' + chId,
            sourceId: config.id,
            mangaSlug: mangaSlug,
            chapterNumber: num ? num[0] : '0',
            title: text,
            language: 'es',
          });
        });
        return chapters2;
      }
    },

    getPages: async function(chapterId) {
      var url = BASE + '/' + mangaPath + '/' + chapterId + '/';
      var html = await api.getText(url);
      var doc = parseDoc(html);
      var pages = [];
      var selectors = 'div.page-break img, .reading-content img, #images_chapter img, .entry-content img[id]';
      doc.querySelectorAll(selectors).forEach(function(img, idx) {
        var src = (img.getAttribute('data-src') || img.getAttribute('src') || '').trim();
        if (src && !src.includes('logo') && !src.includes('banner')) {
          pages.push({ url: absUrl(src), index: idx });
        }
      });
      return pages;
    },
  };
})
