(function(api, config) {
  var BASE = 'https://zonatmo.to';
  var API = BASE + '/wp-api/api';
  var CDN = 'https://cdn.zonatmo.to';
  var UPLOADS = BASE + '/wp-content/uploads';

  function mapManga(item) {
    var cover = item.cover || '';
    if (cover && !cover.startsWith('http')) cover = UPLOADS + '/' + cover;
    return {
      sourceId: 'zonatmo',
      slug: item.slug || '',
      title: item.title || '',
      coverUrl: cover,
      description: item.overview || '',
    };
  }

  return {
    id: 'zonatmo',
    name: 'TuMangaOnline',
    lang: 'es',
    baseUrl: BASE,
    icon: 'TM',
    iconColor: '#1976D2',

    search: async function(query, page) {
      var res = await api.get(API + '/listing/manga', { search: query, page: page || 1 });
      var items = res.data?.items || [];
      return items.map(mapManga);
    },

    getPopular: async function(page) {
      if (!page || page === 1) {
        var res = await api.get(API + '/tops/views/month', { postType: 'any', postsPerPage: 50 });
        var items = res.data?.items || [];
        return items.map(mapManga);
      }
      var res2 = await api.get(API + '/listing/manga', { page: page });
      return (res2.data?.items || []).map(mapManga);
    },

    getLatest: async function(page) {
      var res = await api.get(API + '/listing/manga', { page: page || 1 });
      return (res.data?.items || []).map(mapManga);
    },

    getMangaDetail: async function(slug) {
      var res = await api.get(API + '/single/manga/' + slug);
      var d = res.data || {};
      var statusMap = { 12: 'ongoing', 19: 'completed', 174: 'hiatus', 198: 'cancelled' };
      var status = '';
      if (d.status && d.status[0]) status = statusMap[d.status[0]] || '';
      var cover = d.cover || '';
      if (cover && !cover.startsWith('http')) cover = UPLOADS + '/' + cover;
      var genres = (d.genres || []).map(function(g) { return typeof g === 'string' ? g : ''; }).filter(Boolean);
      var authors = (d.author || []).map(function(a) { return a.name || ''; }).filter(Boolean);
      return {
        slug: slug,
        title: d.title || slug,
        coverUrl: cover,
        description: d.overview || '',
        status: status,
        genres: genres,
        author: authors.join(', ') || undefined,
      };
    },

    getChapters: async function(mangaSlug) {
      var allChapters = [];
      var page = 1;
      while (true) {
        var res = await api.get(API + '/single/manga/' + mangaSlug + '/chapters', { page: page, postsPerPage: 50, order: 'asc' });
        var items = res.data?.items || [];
        for (var i = 0; i < items.length; i++) {
          var ch = items[i];
          allChapters.push({
            id: mangaSlug + '/' + (ch.slug || ch.id),
            sourceId: 'zonatmo',
            mangaSlug: mangaSlug,
            chapterNumber: ch.chapter_number || String(ch.id || '0'),
            title: ch.title || '',
            language: 'es',
            publishDate: ch.release_date || '',
          });
        }
        if (!res.data?.pagination?.has_next) break;
        page++;
        if (page > 50) break;
      }
      return allChapters;
    },

    getPages: async function(chapterId) {
      var parts = chapterId.split('/');
      var mangaSlug = parts[0];
      var chapterSlug = parts.slice(1).join('/');
      var res = await api.get(API + '/single/manga/' + mangaSlug + '/' + chapterSlug);
      var chapter = res.data?.chapter || {};
      var jit = chapter.jit || '';
      var images = chapter.images || [];
      return images.map(function(img, idx) {
        var url = CDN + '/manga/' + jit + '/' + (img.image_url || img.url || '');
        return { url: url, index: img.page_number ? img.page_number - 1 : idx };
      });
    },
  };
})
