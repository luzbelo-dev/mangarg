(function(api, config) {
  var BASE = 'https://manga-oni.com';

  function parseDoc(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function parseDirectoryResults(html) {
    var doc = parseDoc(html);
    var items = doc.querySelectorAll('#article-div a, #article-div > div');
    var results = [];
    items.forEach(function(el) {
      var linkEl = el.tagName === 'A' ? el : el.querySelector('a');
      if (!linkEl) return;
      var href = linkEl.getAttribute('href') || '';
      var slug = href.replace(/\/$/, '').split('/').pop() || '';
      var imgEl = el.querySelector('img');
      var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
      var divs = el.querySelectorAll('div');
      var title = divs.length > 1 ? divs[1].textContent.trim() : (linkEl.textContent.trim() || slug);
      if (!title || title.length > 200) title = slug;
      if (slug && slug !== '#') {
        results.push({ sourceId: 'mangaoni', slug: slug, title: title, coverUrl: cover });
      }
    });
    return results;
  }

  return {
    id: 'mangaoni',
    name: 'MangaOni',
    lang: 'es',
    baseUrl: BASE,
    icon: 'MX',
    iconColor: '#E65100',

    search: async function(query, page) {
      var url = BASE + '/buscar?q=' + encodeURIComponent(query) + '&p=' + (page || 1);
      var html = await api.getText(url);
      var doc = parseDoc(html);
      var items = doc.querySelectorAll('#article-div > div');
      var results = [];
      items.forEach(function(el) {
        var imgEl = el.querySelector('img');
        var cover = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';
        var links = el.querySelectorAll('a');
        var title = ''; var href = '';
        links.forEach(function(a) {
          var t = a.textContent.trim();
          if (t && !title) { title = t; href = a.getAttribute('href') || ''; }
        });
        var slug = href.replace(/\/$/, '').split('/').pop() || '';
        if (slug && title) {
          results.push({ sourceId: 'mangaoni', slug: slug, title: title, coverUrl: cover });
        }
      });
      return results;
    },

    getPopular: async function(page) {
      var url = BASE + '/directorio?genero=false&estado=false&filtro=visitas&tipo=false&adulto=false&orden=desc&p=' + (page || 1);
      var html = await api.getText(url);
      return parseDirectoryResults(html);
    },

    getLatest: async function(page) {
      var url = BASE + '/recientes?p=' + (page || 1);
      var html = await api.getText(url);
      var doc = parseDoc(html);
      var items = doc.querySelectorAll('div._1bJU3, div.page-item-detail');
      var results = [];
      items.forEach(function(el) {
        var linkEl = el.querySelector('a[data-test=latest-update-name], a[href]');
        if (!linkEl) return;
        var href = linkEl.getAttribute('href') || '';
        var slug = href.replace(/\/$/, '').split('/').pop() || '';
        var title = linkEl.textContent.trim();
        var imgEl = el.querySelector('img');
        var cover = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || '') : '';
        if (slug && title) {
          results.push({ sourceId: 'mangaoni', slug: slug, title: title, coverUrl: cover });
        }
      });
      return results;
    },

    getMangaDetail: async function(slug) {
      var html = await api.getText(BASE + '/manga/' + slug);
      var doc = parseDoc(html);
      var titleEl = doc.querySelector('h1');
      var imgEl = doc.querySelector('img[src*=cover]') || doc.querySelector('.summary_image img');
      var descEl = doc.querySelector('div#sinopsis, .description-summary');
      var genres = [];
      doc.querySelectorAll('div#categ a, .genres-content a').forEach(function(a) {
        genres.push(a.textContent.trim());
      });
      var statusEl = doc.querySelector('span:last-child') || doc.querySelector('strong + span');
      var status = '';
      if (statusEl) {
        var st = statusEl.textContent.trim().toLowerCase();
        if (st.includes('desarrollo') || st.includes('publicacion')) status = 'ongoing';
        else if (st.includes('finalizado')) status = 'completed';
      }
      return {
        slug: slug,
        title: titleEl ? titleEl.textContent.trim() : slug,
        coverUrl: imgEl ? (imgEl.getAttribute('src') || '') : '',
        description: descEl ? descEl.textContent.trim() : '',
        status: status,
        genres: genres,
      };
    },

    getChapters: async function(mangaSlug) {
      var html = await api.getText(BASE + '/manga/' + mangaSlug);
      var doc = parseDoc(html);
      var chapters = [];
      doc.querySelectorAll('div#c_list a, .chapter-list a').forEach(function(el) {
        var href = el.getAttribute('href') || '';
        var slug = href.replace(/\/$/, '').split('/').pop() || '';
        var numEl = el.querySelector('span[data-num]');
        var num = numEl ? numEl.getAttribute('data-num') : '';
        var dateEl = el.querySelector('span[datetime]');
        if (!num) {
          var match = el.textContent.match(/[\d.]+/);
          num = match ? match[0] : '0';
        }
        chapters.push({
          id: slug || href.replace(/\/$/, '').split('/').pop() || '',
          sourceId: 'mangaoni',
          mangaSlug: mangaSlug,
          chapterNumber: num || '0',
          title: el.textContent.trim(),
          language: 'es',
          publishDate: dateEl ? dateEl.getAttribute('datetime') : '',
        });
      });
      return chapters.reverse();
    },

    getPages: async function(chapterId) {
      var html = await api.getText(BASE + '/manga/leer/' + chapterId);
      var match = html.match(/unicap\s*[=:]\s*['"]([^'"]+)['"]/);
      if (!match) {
        var doc = parseDoc(html);
        var imgs = doc.querySelectorAll('img.page-image, .reader-area img, #readerarea img');
        var fallback = [];
        imgs.forEach(function(img, idx) {
          var src = (img.getAttribute('data-src') || img.getAttribute('src') || '').trim();
          if (src && src.startsWith('http')) fallback.push({ url: src, index: idx });
        });
        return fallback;
      }
      try {
        var encoded = match[1];
        var trimLen = encoded.length % 4;
        if (trimLen > 0) encoded = encoded.substring(0, encoded.length - trimLen);
        var decoded = atob(encoded);
        var parts = decoded.split('||');
        var basePath = parts[0] || '';
        var rest = parts.slice(1).join('||');
        var arrMatch = rest.match(/\[([^\]]+)\]/);
        if (!arrMatch) return [];
        var files = JSON.parse('[' + arrMatch[1] + ']');
        return files.map(function(f, idx) {
          return { url: basePath + f, index: idx };
        });
      } catch(e) {
        return [];
      }
    },
  };
})
