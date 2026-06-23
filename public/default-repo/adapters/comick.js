(function(api, config) {
  var BASE = 'https://comick.art';
  var COVER_BASE = 'https://meo.comick.pictures';

  function mapManga(item) {
    var coverKey = item.md_covers && item.md_covers[0] ? item.md_covers[0].b2key : '';
    if (!coverKey && item.cover_url) coverKey = '';
    return {
      sourceId: 'comick',
      slug: item.hid || item.slug || '',
      title: item.title || '',
      coverUrl: coverKey ? COVER_BASE + '/' + coverKey : (item.cover_url || ''),
      description: item.description || item.desc || '',
      score: item.rating ? parseFloat(item.rating) : undefined,
      contentRating: item.content_rating || undefined,
    };
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
      var data = res.data || res;
      if (!Array.isArray(data)) return [];
      return data.map(mapManga);
    },

    getPopular: async function(page) {
      var res = await api.get(BASE + '/api/comics/top', {
        limit: 20,
        page: page || 1,
      });
      var data = res.data || res;
      if (!Array.isArray(data)) return [];
      return data.map(mapManga);
    },

    getLatest: async function(page) {
      var res = await api.get(BASE + '/api/chapters/latest', {
        order: 'new',
        page: page || 1,
      });
      var data = res.data || res;
      if (!Array.isArray(data)) return [];
      return data.map(function(item) {
        if (item.comic) return mapManga(item.comic);
        return mapManga(item);
      });
    },

    getMangaDetail: async function(slug) {
      var res = await api.get(BASE + '/comic/' + slug);
      if (!res || !res.comic) return null;
      var comic = res.comic;
      var coverKey = comic.md_covers && comic.md_covers[0] ? comic.md_covers[0].b2key : '';
      var genres = (res.genres || []).map(function(g) { return g.name || ''; }).filter(Boolean);
      var statusMap = { 1: 'ongoing', 2: 'completed', 3: 'cancelled', 4: 'hiatus' };
      return {
        slug: comic.hid || comic.slug,
        title: comic.title || '',
        coverUrl: coverKey ? COVER_BASE + '/' + coverKey : '',
        description: comic.description || comic.desc || '',
        status: statusMap[comic.status] || '',
        genres: genres,
        author: (res.authors || []).map(function(a) { return a.name; }).join(', ') || undefined,
      };
    },

    getChapters: async function(mangaSlug, lang) {
      var res = await api.get(BASE + '/api/comics/' + mangaSlug + '/chapter-list', {
        lang: lang || 'es',
      });
      var chapters = res.chapters || res.data || res;
      if (!Array.isArray(chapters)) return [];
      return chapters.map(function(ch) {
        return {
          id: ch.hid,
          sourceId: 'comick',
          mangaSlug: mangaSlug,
          chapterNumber: ch.chap || '0',
          title: ch.title || '',
          language: ch.lang || 'es',
          groupName: ch.group_name && ch.group_name[0] ? ch.group_name[0] : undefined,
          publishDate: ch.created_at || '',
        };
      });
    },

    getPages: async function(chapterId) {
      var res = await api.get(BASE + '/chapter/' + chapterId);
      var chapter = res.chapter || res;
      var images = chapter.md_images || chapter.images || [];
      return images.map(function(img, index) {
        var url = img.b2key ? COVER_BASE + '/' + img.b2key : (img.url || '');
        return { url: url, index: index };
      });
    },
  };
})
