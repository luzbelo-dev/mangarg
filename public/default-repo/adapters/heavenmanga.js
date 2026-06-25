(function(api, config) {
  var BASE = 'https://heavenmanga.com';

  function parseDoc(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function parseGrid(html) {
    var doc = parseDoc(html);
    var items = doc.querySelectorAll('div.page-item-detail, div.c-tabs-item__content');
    var results = [];
    items.forEach(function(el) {
      var linkEl = el.querySelector('a[href]');
      if (!linkEl) return;
      var href = linkEl.getAttribute('href') || '';
      var slug = href.replace(/\/$/, '').split('/').pop() || '';
      var titleEl = el.querySelector('.manga-name, h4 a, .post-title a, h3 a');
      var title = titleEl ? titleEl.textContent.trim() : '';
      var imgEl = el.querySelector('img');
      var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
      if (slug && title) {
        results.push({ sourceId: 'heavenmanga', slug: slug, title: title, coverUrl: cover });
      }
    });
    return results;
  }

  return {
    id: 'heavenmanga',
    name: 'HeavenManga',
    lang: 'es',
    baseUrl: BASE,
    icon: 'HV',
    iconColor: '#FF6F00',

    search: async function(query, page) {
      var url = BASE + '/buscar?query=' + encodeURIComponent(query) + '&page=' + (page || 1);
      var html = await api.getText(url);
      return parseGrid(html);
    },

    getPopular: async function(page) {
      var url = BASE + '/top?orderby=views&page=' + (page || 1);
      var html = await api.getText(url);
      return parseGrid(html);
    },

    getLatest: async function(page) {
      var url = page && page > 1 ? BASE + '?page=' + page : BASE;
      var html = await api.getText(url);
      var doc = parseDoc(html);
      var items = doc.querySelectorAll('div.list-group-item, div.page-item-detail');
      var results = [];
      var seen = {};
      items.forEach(function(el) {
        var linkEl = el.querySelector('a[href]');
        if (!linkEl) return;
        var href = linkEl.getAttribute('href') || '';
        var parts = href.replace(/\/$/, '').split('/');
        var slug = '';
        for (var i = parts.length - 1; i >= 0; i--) {
          if (parts[i] && parts[i] !== 'manga' && !parts[i].match(/capitulo|chapter/i)) {
            slug = parts[i]; break;
          }
        }
        if (!slug || seen[slug]) return;
        seen[slug] = true;
        var titleEl = el.querySelector('.captitle, .manga-name, h4 a, a');
        var title = titleEl ? titleEl.textContent.trim() : slug;
        var imgEl = el.querySelector('img');
        var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
        results.push({ sourceId: 'heavenmanga', slug: slug, title: title, coverUrl: cover });
      });
      return results;
    },

    getMangaDetail: async function(slug) {
      var html = await api.getText(BASE + '/manga/' + slug);
      var doc = parseDoc(html);
      var titleEl = doc.querySelector('h1, .post-title h1');
      var imgEl = doc.querySelector('.summary_image img, .tab-summary img');
      var descEl = doc.querySelector('.description-summary p, div.description-summary');
      var genres = [];
      doc.querySelectorAll('.genres-content a, div.tab-summary .genres-content a').forEach(function(a) {
        genres.push(a.textContent.trim());
      });
      return {
        slug: slug,
        title: titleEl ? titleEl.textContent.trim() : slug,
        coverUrl: imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '',
        description: descEl ? descEl.textContent.trim() : '',
        genres: genres,
      };
    },

    getChapters: async function(mangaSlug) {
      var url = BASE + '/manga/' + mangaSlug + '?columns[0][data]=number&columns[0][orderable]=true&columns[1][data]=created_at&columns[1][searchable]=true&order[0][column]=1&order[0][dir]=desc&start=0&length=10000';
      try {
        var res = await api.get(url);
        var data = res.data || [];
        if (!Array.isArray(data)) return [];
        return data.map(function(ch) {
          return {
            id: String(ch.id || ''),
            sourceId: 'heavenmanga',
            mangaSlug: mangaSlug,
            chapterNumber: ch.slug || String(ch.id || '0'),
            title: 'Capitulo ' + (ch.slug || ch.id || '0'),
            language: 'es',
            publishDate: ch.created_at || '',
          };
        }).reverse();
      } catch(e) {
        return [];
      }
    },

    getPages: async function(chapterId) {
      var url = BASE + '/manga/leer/' + chapterId;
      var html = await api.getText(url);
      var match = html.match(/pUrl\s*=\s*(\[[\s\S]*?\])\s*;/);
      if (!match) return [];
      try {
        var cleaned = match[1].replace(/,\s*\]/g, ']');
        var arr = JSON.parse(cleaned);
        return arr.map(function(item, idx) {
          var imgUrl = typeof item === 'string' ? item : (item.imgURL || item.url || '');
          return { url: imgUrl, index: idx };
        }).filter(function(p) { return p.url; });
      } catch(e) {
        return [];
      }
    },
  };
})
