(function(api, config) {
  var BASE = 'https://api.mangadex.org';

  function coverUrl(manga) {
    var cover = (manga.relationships || []).find(function(r) { return r.type === 'cover_art'; });
    if (cover && cover.attributes && cover.attributes.fileName) {
      return 'https://uploads.mangadex.org/covers/' + manga.id + '/' + cover.attributes.fileName + '.256.jpg';
    }
    return '';
  }

  function mapManga(item) {
    var attrs = item.attributes || {};
    var title = attrs.title || {};
    return {
      sourceId: 'mangadex',
      slug: item.id,
      title: title.en || title['ja-ro'] || title.ja || Object.values(title)[0] || '',
      coverUrl: coverUrl(item),
      description: attrs.description ? (attrs.description.en || '') : '',
      status: attrs.status || '',
      score: attrs.rating ? attrs.rating.bayesian : undefined,
      contentRating: attrs.contentRating || undefined,
    };
  }

  function mapChapter(ch) {
    var attrs = ch.attributes || {};
    var group = (ch.relationships || []).find(function(r) { return r.type === 'scanlation_group'; });
    return {
      id: ch.id,
      sourceId: 'mangadex',
      mangaSlug: '',
      chapterNumber: attrs.chapter || '0',
      title: attrs.title || '',
      language: attrs.translatedLanguage || 'en',
      groupName: group && group.attributes ? group.attributes.name : undefined,
      publishDate: attrs.publishAt || attrs.createdAt || '',
    };
  }

  return {
    id: 'mangadex',
    name: 'MangaDex',
    lang: 'multi',
    baseUrl: 'https://mangadex.org',
    icon: 'MD',
    iconColor: '#ff6740',

    search: async function(query, page) {
      var offset = ((page || 1) - 1) * 20;
      var res = await api.get(BASE + '/manga', {
        title: query,
        limit: 20,
        offset: offset,
        'includes[]': 'cover_art',
        'availableTranslatedLanguage[]': 'en',
        'order[relevance]': 'desc',
      });
      return (res.data || []).map(mapManga);
    },

    getPopular: async function(page) {
      var offset = ((page || 1) - 1) * 20;
      var res = await api.get(BASE + '/manga', {
        limit: 20,
        offset: offset,
        'includes[]': 'cover_art',
        'availableTranslatedLanguage[]': 'en',
        'order[followedCount]': 'desc',
        'contentRating[]': 'safe',
      });
      return (res.data || []).map(mapManga);
    },

    getLatest: async function(page) {
      var offset = ((page || 1) - 1) * 20;
      var res = await api.get(BASE + '/manga', {
        limit: 20,
        offset: offset,
        'includes[]': 'cover_art',
        'availableTranslatedLanguage[]': 'en',
        'order[latestUploadedChapter]': 'desc',
        'contentRating[]': 'safe',
      });
      return (res.data || []).map(mapManga);
    },

    getMangaDetail: async function(slug) {
      var res = await api.get(BASE + '/manga/' + slug, {
        'includes[]': 'cover_art',
      });
      if (!res || !res.data) return null;
      var manga = mapManga(res.data);
      var attrs = res.data.attributes || {};
      var tags = (attrs.tags || []).map(function(t) {
        return t.attributes && t.attributes.name ? (t.attributes.name.en || '') : '';
      }).filter(Boolean);
      return {
        slug: manga.slug,
        title: manga.title,
        coverUrl: manga.coverUrl,
        description: manga.description,
        status: manga.status,
        genres: tags,
        author: ((res.data.relationships || []).find(function(r) { return r.type === 'author'; }) || {}).attributes
          ? ((res.data.relationships || []).find(function(r) { return r.type === 'author'; })).attributes.name
          : undefined,
        score: manga.score,
      };
    },

    getChapters: async function(mangaSlug, lang) {
      var allChapters = [];
      var offset = 0;
      var limit = 500;
      while (true) {
        var res = await api.get(BASE + '/manga/' + mangaSlug + '/feed', {
          'translatedLanguage[]': lang || 'en',
          'order[chapter]': 'asc',
          'includes[]': 'scanlation_group',
          limit: limit,
          offset: offset,
          includeFuturePublishAt: 0,
        });
        var chapters = (res.data || []).map(function(ch) {
          var mapped = mapChapter(ch);
          mapped.mangaSlug = mangaSlug;
          return mapped;
        });
        allChapters = allChapters.concat(chapters);
        if (chapters.length < limit) break;
        offset += limit;
      }
      return allChapters;
    },

    getPages: async function(chapterId) {
      var res = await api.get(BASE + '/at-home/server/' + chapterId);
      var baseUrl = res.baseUrl;
      var hash = res.chapter.hash;
      var files = res.chapter.data || [];
      return files.map(function(filename, index) {
        return {
          url: baseUrl + '/data/' + hash + '/' + filename,
          index: index,
        };
      });
    },
  };
})
