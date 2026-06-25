(function(api, config) {
  var BASE = 'https://inmanga.com';
  var CDN = 'https://cdn1.intomanga.com';

  function parseDoc(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function parseMangaList(html) {
    var doc = parseDoc(html);
    var items = doc.querySelectorAll('a[href*="/ver/manga/"]');
    var results = [];
    items.forEach(function(el) {
      var href = el.getAttribute('href') || '';
      var match = href.match(/\/ver\/manga\/(.+)/);
      if (!match) return;
      var slug = match[1].replace(/\/$/, '');
      var titleEl = el.querySelector('h4.m0, .m0');
      var title = titleEl ? titleEl.textContent.trim() : '';
      var imgEl = el.querySelector('img');
      var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
      if (cover && cover.includes('loading')) cover = '';
      if (slug && title) {
        results.push({ sourceId: 'inmanga', slug: slug, title: title, coverUrl: cover });
      }
    });
    return results;
  }

  function getUuidFromSlug(slug) {
    var parts = slug.split('/');
    return parts[parts.length - 1] || slug;
  }

  return {
    id: 'inmanga',
    name: 'InManga',
    lang: 'es',
    baseUrl: BASE,
    icon: 'IM',
    iconColor: '#00695C',

    search: async function(query, page) {
      var skip = ((page || 1) - 1) * 10;
      var body = 'filter[generes][]=-1&filter[queryString]=' + encodeURIComponent(query) + '&filter[skip]=' + skip + '&filter[take]=10&filter[sortby]=1&filter[broadcastStatus]=0&filter[onlyFavorites]=false&d=';
      var r = await fetch(BASE + '/manga/getMangasConsultResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
        body: body,
      });
      var html = await r.text();
      return parseMangaList(html);
    },

    getPopular: async function(page) {
      var skip = ((page || 1) - 1) * 10;
      var body = 'filter[generes][]=-1&filter[queryString]=&filter[skip]=' + skip + '&filter[take]=10&filter[sortby]=1&filter[broadcastStatus]=0&filter[onlyFavorites]=false&d=';
      var r = await fetch(BASE + '/manga/getMangasConsultResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
        body: body,
      });
      var html = await r.text();
      return parseMangaList(html);
    },

    getLatest: async function(page) {
      var skip = ((page || 1) - 1) * 10;
      var body = 'filter[generes][]=-1&filter[queryString]=&filter[skip]=' + skip + '&filter[take]=10&filter[sortby]=3&filter[broadcastStatus]=0&filter[onlyFavorites]=false&d=';
      var r = await fetch(BASE + '/manga/getMangasConsultResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
        body: body,
      });
      var html = await r.text();
      return parseMangaList(html);
    },

    getMangaDetail: async function(slug) {
      var html = await api.getText(BASE + '/ver/manga/' + slug);
      var doc = parseDoc(html);
      var titleEl = doc.querySelector('h1') || doc.querySelector('.col-md-9 h1');
      var imgEl = doc.querySelector('.col-md-3 img, .panel img, img.ImageContainer');
      var descEl = doc.querySelector('.col-md-9 .panel-body, .description');
      var statusEl = doc.querySelector('.label-success, .label-danger, .label-warning');
      var status = '';
      if (statusEl) {
        var st = statusEl.textContent.trim().toLowerCase();
        if (st.includes('emisi') || st.includes('publicacion')) status = 'ongoing';
        else if (st.includes('finalizado')) status = 'completed';
      }
      var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
      if (cover && cover.includes('loading')) cover = '';
      return {
        slug: slug,
        title: titleEl ? titleEl.textContent.trim() : slug.split('/')[0].replace(/-/g, ' '),
        coverUrl: cover,
        description: descEl ? descEl.textContent.trim() : '',
        status: status,
        genres: [],
      };
    },

    getChapters: async function(mangaSlug) {
      var mangaId = getUuidFromSlug(mangaSlug);
      try {
        var res = await api.get(BASE + '/chapter/getall', { mangaIdentification: mangaId });
        var dataStr = typeof res === 'object' && res.data ? res.data : res;
        if (typeof dataStr === 'string') {
          try { dataStr = JSON.parse(dataStr); } catch(e) {}
        }
        var result = [];
        if (typeof dataStr === 'object') {
          result = dataStr.result || dataStr.data?.result || [];
          if (typeof result === 'string') {
            try { result = JSON.parse(result); } catch(e) { result = []; }
          }
        }
        if (!Array.isArray(result)) return [];

        return result.sort(function(a, b) { return (a.Number || 0) - (b.Number || 0); }).map(function(ch) {
          return {
            id: ch.Identification || ch.identification || '',
            sourceId: 'inmanga',
            mangaSlug: mangaSlug,
            chapterNumber: String(ch.FriendlyChapterNumber || ch.Number || '0'),
            title: 'Capitulo ' + (ch.FriendlyChapterNumber || ch.Number || '0'),
            language: 'es',
            publishDate: ch.RegistrationDate || '',
          };
        });
      } catch(e) {
        return [];
      }
    },

    getPages: async function(chapterId) {
      try {
        var html = await api.getText(BASE + '/chapter/chapterIndexControls', { identification: chapterId });
        var doc = parseDoc(html);
        var mangaIdEl = doc.querySelector('#MangaIdentification, input[name="MangaIdentification"]');
        var chapterIdEl = doc.querySelector('#ChapterIdentification, input[name="ChapterIdentification"]');
        var mangaId = mangaIdEl ? mangaIdEl.getAttribute('value') : '';
        var chapId = chapterIdEl ? chapterIdEl.getAttribute('value') : chapterId;
        var imgs = doc.querySelectorAll('img.ImageContainer, img[id]');
        var pages = [];
        imgs.forEach(function(img, idx) {
          var pageId = img.getAttribute('id') || '';
          if (pageId && pageId.length > 10) {
            pages.push({ url: CDN + '/i/m/' + mangaId + '/c/' + chapId + '/o/' + pageId + '.jpg', index: idx });
          }
        });
        return pages;
      } catch(e) {
        return [];
      }
    },
  };
})
