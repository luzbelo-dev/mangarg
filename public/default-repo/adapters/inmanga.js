(function(api, config) {
  var BASE = 'https://inmanga.com';
  var CDN = 'https://cdn1.intomanga.com';

  function parseDoc(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function parseMangaList(html) {
    var doc = parseDoc(html);
    var items = doc.querySelectorAll('body > a');
    var results = [];
    items.forEach(function(el) {
      var href = el.getAttribute('href') || '';
      var slug = href.replace(/\/$/, '').split('/').pop() || '';
      var titleEl = el.querySelector('h4.m0');
      var title = titleEl ? titleEl.textContent.trim() : '';
      var imgEl = el.querySelector('img');
      var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
      if (slug && title) {
        results.push({ sourceId: 'inmanga', slug: slug, title: title, coverUrl: cover });
      }
    });
    return results;
  }

  async function postForm(url, body) {
    var r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body,
    });
    return r.text();
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
      var html = await postForm(BASE + '/manga/getMangasConsultResult', body);
      return parseMangaList(html);
    },

    getPopular: async function(page) {
      var skip = ((page || 1) - 1) * 10;
      var body = 'filter[generes][]=-1&filter[queryString]=&filter[skip]=' + skip + '&filter[take]=10&filter[sortby]=1&filter[broadcastStatus]=0&filter[onlyFavorites]=false&d=';
      var html = await postForm(BASE + '/manga/getMangasConsultResult', body);
      return parseMangaList(html);
    },

    getLatest: async function(page) {
      var skip = ((page || 1) - 1) * 10;
      var body = 'filter[generes][]=-1&filter[queryString]=&filter[skip]=' + skip + '&filter[take]=10&filter[sortby]=3&filter[broadcastStatus]=0&filter[onlyFavorites]=false&d=';
      var html = await postForm(BASE + '/manga/getMangasConsultResult', body);
      return parseMangaList(html);
    },

    getMangaDetail: async function(slug) {
      var html = await api.getText(BASE + '/manga/ver/' + slug);
      var doc = parseDoc(html);
      var titleEl = doc.querySelector('h1') || doc.querySelector('.col-md-9 h1');
      var imgEl = doc.querySelector('.col-md-3 img') || doc.querySelector('.panel img');
      var descEl = doc.querySelector('.col-md-9 .panel-body');
      var statusEl = doc.querySelector('a.list-group-item span');
      var status = '';
      if (statusEl) {
        var st = statusEl.textContent.trim().toLowerCase();
        if (st.includes('emision') || st.includes('publicacion')) status = 'ongoing';
        else if (st.includes('finalizado')) status = 'completed';
      }
      return {
        slug: slug,
        title: titleEl ? titleEl.textContent.trim() : slug,
        coverUrl: imgEl ? (imgEl.getAttribute('src') || '') : '',
        description: descEl ? descEl.textContent.trim() : '',
        status: status,
        genres: [],
      };
    },

    getChapters: async function(mangaSlug) {
      var html = await api.getText(BASE + '/manga/ver/' + mangaSlug);
      var doc = parseDoc(html);
      var idInput = doc.querySelector('input#MangaIdentification') || doc.querySelector('input[name="MangaIdentification"]');
      if (!idInput) {
        var hrefMatch = html.match(/mangaIdentification['"]\s*(?:value|content)\s*=\s*['"]([\w-]+)/i);
        if (!hrefMatch) return [];
        var mangaId = hrefMatch[1];
      } else {
        var mangaId = idInput.getAttribute('value');
      }
      if (!mangaId) return [];

      var res = await api.get(BASE + '/chapter/getall', { mangaIdentification: mangaId });
      var dataStr = typeof res === 'string' ? res : (res.data || '');
      if (typeof dataStr === 'string' && dataStr.startsWith('{')) {
        try { dataStr = JSON.parse(dataStr); } catch(e) {}
      }
      var inner = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
      var result = inner.result || inner.data?.result || [];
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
    },

    getPages: async function(chapterId) {
      var html = await api.getText(BASE + '/chapter/chapterIndexControls', { identification: chapterId });
      var doc = parseDoc(html);
      var mangaIdEl = doc.querySelector('#MangaIdentification') || doc.querySelector('input[name="MangaIdentification"]');
      var chapterIdEl = doc.querySelector('#ChapterIdentification') || doc.querySelector('input[name="ChapterIdentification"]');
      var mangaId = mangaIdEl ? mangaIdEl.getAttribute('value') : '';
      var chapId = chapterIdEl ? chapterIdEl.getAttribute('value') : chapterId;
      var imgs = doc.querySelectorAll('img.ImageContainer, img[id]');
      var pages = [];
      imgs.forEach(function(img, idx) {
        var pageId = img.getAttribute('id') || '';
        if (pageId) {
          pages.push({ url: CDN + '/i/m/' + mangaId + '/c/' + chapId + '/o/' + pageId + '.jpg', index: idx });
        }
      });
      return pages;
    },
  };
})
