(function(api, config) {
  var BASE = 'https://comick.art';
  var API_BASE = 'https://api.comick.io';
  var COVER_BASE = 'https://meo.comick.pictures';

  function mapManga(item) {
    var coverUrl = item.default_thumbnail || '';
    if (!coverUrl && item.md_covers && item.md_covers[0] && item.md_covers[0].b2key) {
      coverUrl = COVER_BASE + '/' + item.md_covers[0].b2key;
    }
    if (!coverUrl && item.cover_url) coverUrl = item.cover_url;
    return {
      sourceId: 'comick',
      slug: item.slug || item.hid || '',
      title: item.title || '',
      coverUrl: coverUrl,
      description: item.description || item.desc || '',
      score: item.rating ? parseFloat(item.rating) : undefined,
      contentRating: item.content_rating || undefined,
    };
  }

  function unwrap(res) {
    if (res && res.data && Array.isArray(res.data)) return res.data;
    if (Array.isArray(res)) return res;
    return [];
  }

  return {
    id: 'comick',
    name: 'ComicK',
    lang: 'multi',
    baseUrl: 'https://comick.art',
    icon: 'CK',
    iconColor: '#5c6bc0',

    search: async function(query, page) {
      var res = await api.get(BASE + '/api/search', {
        q: query,
        limit: 20,
        type: 'comic',
        page: page || 1,
      });
      return unwrap(res).map(mapManga);
    },

    getPopular: async function(page) {
      var p = page || 1;
      var res = await api.get(BASE + '/api/comics/top', {
        limit: 20,
        page: p,
      });
      return unwrap(res).map(mapManga);
    },

    getLatest: async function(page) {
      var res = await api.get(BASE + '/api/chapters/latest', {
        order: 'new',
        page: page || 1,
      });
      var items = unwrap(res);
      return items.map(function(item) {
        if (item.comic) return mapManga(item.comic);
        if (item.md_comics) return mapManga(item.md_comics);
        return mapManga(item);
      });
    },

    getMangaDetail: async function(slug) {
      try {
        var res = await api.get(BASE + '/api/comics/' + slug + '/chapter-list', { lang: 'en', page: 1 });
        return {
          slug: slug,
          title: slug.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }),
          coverUrl: '',
          description: '',
          status: '',
          genres: [],
        };
      } catch(e) {
        return { slug: slug, title: slug, coverUrl: '', description: '' };
      }
    },

    getChapters: async function(mangaSlug, lang) {
      var allChapters = [];
      var page = 1;
      var maxPages = 10;
      while (page <= maxPages) {
        var res = await api.get(BASE + '/api/comics/' + mangaSlug + '/chapter-list', {
          lang: lang || 'en',
          page: page,
        });
        var chapters = unwrap(res);
        if (chapters.length === 0) break;
        for (var i = 0; i < chapters.length; i++) {
          var ch = chapters[i];
          allChapters.push({
            id: ch.hid,
            sourceId: 'comick',
            mangaSlug: mangaSlug,
            chapterNumber: ch.chap || '0',
            title: ch.title || '',
            language: ch.lang || 'en',
            groupName: ch.group_name && ch.group_name[0] ? ch.group_name[0] : undefined,
            publishDate: ch.created_at || '',
          });
        }
        if (res && res.pagination && page >= res.pagination.last_page) break;
        page++;
      }
      return allChapters;
    },

    getPages: async function(chapterId) {
      try {
        var res = await api.get(API_BASE + '/chapter/' + chapterId);
        var chapter = res.chapter || res;
        var images = chapter.md_images || chapter.images || [];
        return images.map(function(img, index) {
          var url = img.b2key ? COVER_BASE + '/' + img.b2key : (img.url || '');
          return { url: url, index: index };
        });
      } catch(e) {
        return [];
      }
    },
  };
})
