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

  function parseMangaGrid(html) {
    var doc = parseDoc(html);
    var items = doc.querySelectorAll('.bs, .bsx, .utao, div.listupd > div');
    var results = [];
    items.forEach(function(el) {
      var linkEl = el.querySelector('a');
      if (!linkEl) return;
      var href = linkEl.getAttribute('href') || '';
      var slug = href.replace(/\/$/, '').split('/').pop() || '';
      var titleEl = el.querySelector('.tt, .bigor .tt, a[title]');
      var title = '';
      if (titleEl) {
        title = titleEl.textContent.trim() || titleEl.getAttribute('title') || '';
      }
      if (!title) title = linkEl.getAttribute('title') || slug;
      var imgEl = el.querySelector('img');
      var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
      var scoreEl = el.querySelector('.numscore, .rating .num');
      var score = scoreEl ? parseFloat(scoreEl.textContent) : undefined;
      if (slug && title) {
        results.push({
          sourceId: config.id,
          slug: slug,
          title: title,
          coverUrl: absUrl(cover),
          score: score,
        });
      }
    });
    return results;
  }

  return {
    id: config.id,
    name: config.name,
    lang: config.lang || 'es',
    baseUrl: BASE,
    icon: config.icon || config.name.substring(0, 2).toUpperCase(),
    iconColor: config.iconColor || '#e17055',

    search: async function(query, page) {
      var p = page || 1;
      var url = BASE + '/page/' + p + '/?s=' + encodeURIComponent(query);
      var html = await api.getText(url);
      return dedup(parseMangaGrid(html));
    },

    getPopular: async function(page) {
      var p = page || 1;
      var url = BASE + '/' + mangaPath + '/?page=' + p + '&order=popular';
      try {
        var html = await api.getText(url);
        var results = parseMangaGrid(html);
        if (results.length === 0) {
          url = BASE + '/' + mangaPath + '/page/' + p + '/?order=popular';
          html = await api.getText(url);
          results = parseMangaGrid(html);
        }
        return results;
      } catch(e) {
        return [];
      }
    },

    getLatest: async function(page) {
      var p = page || 1;
      var url = BASE + '/' + mangaPath + '/?page=' + p + '&order=update';
      try {
        var html = await api.getText(url);
        return parseMangaGrid(html);
      } catch(e) {
        return [];
      }
    },

    getMangaDetail: async function(slug) {
      var url = BASE + '/' + mangaPath + '/' + slug + '/';
      var html = await api.getText(url);
      var doc = parseDoc(html);
      var titleEl = doc.querySelector('.entry-title, h1.entry-title');
      var title = titleEl ? titleEl.textContent.trim() : slug;
      var imgEl = doc.querySelector('.thumb img, .summary_image img, .info-left img');
      var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
      var descEl = doc.querySelector('.entry-content[itemprop="description"], .summary .wd-full, div.synp .entry-content');
      var desc = descEl ? descEl.textContent.trim() : '';
      var genres = [];
      doc.querySelectorAll('.mgen a, .genre-info a, span.mgen a').forEach(function(a) {
        genres.push(a.textContent.trim());
      });
      var authorEl = doc.querySelector('.author-content a, .fmed:nth-child(2) span, .infotable td:nth-child(2)');
      return {
        slug: slug,
        title: title,
        coverUrl: absUrl(cover),
        description: desc,
        genres: genres,
        author: authorEl ? authorEl.textContent.trim() : undefined,
      };
    },

    getChapters: async function(mangaSlug) {
      var url = BASE + '/' + mangaPath + '/' + mangaSlug + '/';
      var html = await api.getText(url);
      var doc = parseDoc(html);
      var chapters = [];
      doc.querySelectorAll('#chapterlist li, .eplister li, ul.clstyle li').forEach(function(el) {
        var linkEl = el.querySelector('a');
        if (!linkEl) return;
        var href = linkEl.getAttribute('href') || '';
        var chId = href.replace(/\/$/, '').split('/').pop() || '';
        var numEl = el.querySelector('.chapternum, .epl-num, span.chapternum');
        var text = numEl ? numEl.textContent.trim() : linkEl.textContent.trim();
        var num = text.match(/[\d.]+/);
        var dateEl = el.querySelector('.chapterdate, .epl-date');
        chapters.push({
          id: chId,
          sourceId: config.id,
          mangaSlug: mangaSlug,
          chapterNumber: num ? num[0] : '0',
          title: text,
          language: 'es',
          publishDate: dateEl ? dateEl.textContent.trim() : '',
        });
      });
      return chapters.reverse();
    },

    getPages: async function(chapterId) {
      var url = BASE + '/' + chapterId + '/';
      if (!chapterId.startsWith('http')) {
        url = BASE + '/' + chapterId + '/';
      }
      var html = await api.getText(url);
      var pages = [];
      var tsMatch = html.match(/ts_reader\.run\s*\(\s*(\{[\s\S]*?\})\s*\)/);
      if (tsMatch) {
        try {
          var data = JSON.parse(tsMatch[1]);
          var images = data.sources && data.sources[0] ? data.sources[0].images : [];
          images.forEach(function(src, idx) {
            pages.push({ url: src, index: idx });
          });
          return pages;
        } catch(e) {}
      }
      var doc = parseDoc(html);
      doc.querySelectorAll('#readerarea img, .reading-content img').forEach(function(img, idx) {
        var src = (img.getAttribute('data-src') || img.getAttribute('src') || '').trim();
        if (src && !src.includes('logo') && src.length > 20) {
          pages.push({ url: absUrl(src), index: idx });
        }
      });
      return pages;
    },
  };
})
