import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Create axios instance
const api = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 8000,
  params: {
    api_key: TMDB_API_KEY,
  },
});

  // Helper to build image URLs
export function getImageUrl(path, size = 'original') {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  // Get trending movies/TV shows (day or week)
export async function getTrending(mediaType = 'all', timeWindow = 'week') {
    try {
      const response = await api.get(`/trending/${mediaType}/${timeWindow}`);
      return formatMediaList(response.data.results);
    } catch (error) {
      console.error('TMDB getTrending error:', error.message);
      throw new Error('Failed to fetch trending content');
    }
  }

  // Get popular movies
export async function getPopular(page = 1) {
    try {
      const response = await api.get('/movie/popular', {
        params: { page },
      });
      return {
        results: formatMovieList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getPopular error:', error.message);
      throw new Error('Failed to fetch popular movies');
    }
  }

  // Get top rated movies
export async function getTopRated(page = 1) {
    try {
      const response = await api.get('/movie/top_rated', {
        params: { page },
      });
      return {
        results: formatMovieList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getTopRated error:', error.message);
      throw new Error('Failed to fetch top rated movies');
    }
  }

  // Get now playing movies
export async function getNowPlaying(page = 1) {
    try {
      const response = await api.get('/movie/now_playing', {
        params: { page },
      });
      return {
        results: formatMovieList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getNowPlaying error:', error.message);
      throw new Error('Failed to fetch now playing movies');
    }
  }

  // Get upcoming movies
export async function getUpcoming(page = 1) {
    try {
      const response = await api.get('/movie/upcoming', {
        params: { page },
      });
      return {
        results: formatMovieList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getUpcoming error:', error.message);
      throw new Error('Failed to fetch upcoming movies');
    }
  }

  // Get movie details by ID
export async function getMovieDetails(movieId) {
    try {
      const response = await api.get(`/movie/${movieId}`, {
        params: {
          append_to_response: 'credits,videos,similar,recommendations,watch/providers,release_dates',
        },
      });
      return formatMovieDetails(response.data);
    } catch (error) {
      console.error('TMDB getMovieDetails error:', error.message);
      throw new Error('Failed to fetch movie details');
    }
  }

  // Search movies
export async function searchMovies(query, page = 1) {
    try {
      const response = await api.get('/search/movie', {
        params: { query, page },
      });
      return {
        results: formatMovieList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB searchMovies error:', error.message);
      throw new Error('Failed to search movies');
    }
  }

  // Discover movies with filters
export async function discoverMovies(filters = {}) {
    try {
      const response = await api.get('/discover/movie', {
        params: {
          page: filters.page || 1,
          with_genres: filters.genres,
          primary_release_year: filters.year,
          with_original_language: filters.language,
          sort_by: filters.sortBy || 'popularity.desc',
          'vote_average.gte': filters.minRating,
          'vote_average.lte': filters.maxRating,
        },
      });
      return {
        results: formatMovieList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB discoverMovies error:', error.message);
      throw new Error('Failed to discover movies');
    }
  }

  // Get movie genres
export async function getGenres() {
    try {
      const response = await api.get('/genre/movie/list');
      return response.data.genres;
    } catch (error) {
      console.error('TMDB getGenres error:', error.message);
      throw new Error('Failed to fetch genres');
    }
  }

  // ===== TV SHOW METHODS =====

  // Get popular TV shows
export async function getPopularTV(page = 1) {
    try {
      const response = await api.get('/tv/popular', {
        params: { page },
      });
      return {
        results: formatMediaList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getPopularTV error:', error.message);
      throw new Error('Failed to fetch popular TV shows');
    }
  }

  // Get top rated TV shows
export async function getTopRatedTV(page = 1) {
    try {
      const response = await api.get('/tv/top_rated', {
        params: { page },
      });
      return {
        results: formatMediaList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getTopRatedTV error:', error.message);
      throw new Error('Failed to fetch top rated TV shows');
    }
  }

  // Get airing today TV shows
export async function getAiringTodayTV(page = 1) {
    try {
      const response = await api.get('/tv/airing_today', {
        params: { page },
      });
      return {
        results: formatMediaList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getAiringTodayTV error:', error.message);
      throw new Error('Failed to fetch airing today TV shows');
    }
  }

  // Get on the air TV shows
export async function getOnTheAirTV(page = 1) {
    try {
      const response = await api.get('/tv/on_the_air', {
        params: { page },
      });
      return {
        results: formatMediaList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getOnTheAirTV error:', error.message);
      throw new Error('Failed to fetch on the air TV shows');
    }
  }

  // Get TV show details
export async function getTVDetails(tvId) {
    try {
      const response = await api.get(`/tv/${tvId}`, {
        params: {
          append_to_response: 'credits,videos,similar,recommendations,watch/providers,content_ratings',
        },
      });
      return formatTVDetails(response.data);
    } catch (error) {
      console.error('TMDB getTVDetails error:', error.message);
      throw new Error('Failed to fetch TV show details');
    }
  }

  // Search people (actors, directors, etc.)
export async function searchPerson(query, page = 1) {
    try {
      const response = await api.get('/search/person', {
        params: { query, page },
      });
      return {
        results: response.data.results.map(person => ({
          id: person.id,
          name: person.name,
          profilePath: getImageUrl(person.profile_path, 'w185'),
          knownForDepartment: person.known_for_department,
          popularity: person.popularity,
          knownFor: person.known_for?.map(item => ({
            id: item.id,
            title: item.title || item.name,
            mediaType: item.media_type,
          })) || [],
        })),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB searchPerson error:', error.message);
      throw new Error('Failed to search people');
    }
  }

  // Search TV shows
export async function searchTV(query, page = 1) {
    try {
      const response = await api.get('/search/tv', {
        params: { query, page },
      });
      return {
        results: formatMediaList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB searchTV error:', error.message);
      throw new Error('Failed to search TV shows');
    }
  }

  // Get TV season details
export async function getTVSeasonDetails(tvId, seasonNumber) {
    try {
      const response = await api.get(`/tv/${tvId}/season/${seasonNumber}`);
      return formatSeasonDetails(response.data);
    } catch (error) {
      console.error('TMDB getTVSeasonDetails error:', error.message);
      throw new Error('Failed to fetch season details');
    }
  }

  // Search multi (movies, TV shows, people)
export async function searchMulti(query, page = 1) {
    try {
      const response = await api.get('/search/multi', {
        params: { query, page },
      });
      
      // Format results including people
      const formattedResults = response.data.results.map(item => {
        if (item.media_type === 'person') {
          return {
            id: item.id,
            title: item.name,
            mediaType: 'person',
            poster: getImageUrl(item.profile_path, 'w500'),
            knownFor: item.known_for?.map(kf => kf.title || kf.name).join(', ') || '',
            popularity: item.popularity,
          };
        } else {
          // Format movie/TV show item
          return {
            id: item.id,
            mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
            title: item.title || item.name,
            originalTitle: item.original_title || item.original_name,
            overview: item.overview,
            releaseDate: item.release_date || item.first_air_date,
            rating: item.vote_average,
            voteCount: item.vote_count,
            popularity: item.popularity,
            adult: item.adult,
            genres: item.genre_ids,
            poster: getImageUrl(item.poster_path, 'w500'),
            backdrop: getImageUrl(item.backdrop_path, 'w1280'),
            originalLanguage: item.original_language,
          };
        }
      });

      return {
        results: formattedResults,
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB searchMulti error:', error.message);
      throw new Error('Failed to search content');
    }
  }

  // Discover TV shows with filters
export async function discoverTV(filters = {}) {
    try {
      const response = await api.get('/discover/tv', {
        params: {
          page: filters.page || 1,
          with_genres: filters.genres,
          first_air_date_year: filters.year,
          with_original_language: filters.language,
          sort_by: filters.sortBy || 'popularity.desc',
          'vote_average.gte': filters.minRating,
          'vote_average.lte': filters.maxRating,
        },
      });
      return {
        results: formatMediaList(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB discoverTV error:', error.message);
      throw new Error('Failed to discover TV shows');
    }
  }

  // Format media list (movies + TV shows) for consistent response
export function formatMediaList(items) {
    return items.map((item) => ({
      id: item.id,
      mediaType: item.media_type || (item.title ? 'movie' : 'tv'),
      title: item.title || item.name,
      originalTitle: item.original_title || item.original_name,
      overview: item.overview,
      releaseDate: item.release_date || item.first_air_date,
      rating: item.vote_average,
      voteCount: item.vote_count,
      popularity: item.popularity,
      adult: item.adult,
      genres: item.genre_ids,
      poster: getImageUrl(item.poster_path, 'w500'),
      backdrop: getImageUrl(item.backdrop_path, 'w1280'),
      originalLanguage: item.original_language,
    }));
  }

  // Format movie list for consistent response (legacy support)
export function formatMovieList(movies) {
    return formatMediaList(movies);
  }

  // Get certification/content rating
export function getCertification(releaseDates) {
    if (!releaseDates?.results) return null;
    
    // Priority order: IN (India), US, GB (UK)
    const countries = ['IN', 'US', 'GB'];
    
    for (const country of countries) {
      const countryData = releaseDates.results.find(r => r.iso_3166_1 === country);
      if (countryData?.release_dates) {
        // Find theatrical or primary release
        const release = countryData.release_dates.find(r => 
          r.type === 3 || r.type === 2 || r.certification
        );
        if (release?.certification) {
          return release.certification;
        }
      }
    }
    
    return null;
  }

  // Format detailed movie info
export function formatMovieDetails(movie) {
    return {
      id: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      tagline: movie.tagline,
      overview: movie.overview,
      releaseDate: movie.release_date,
      runtime: movie.runtime,
      rating: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity,
      budget: movie.budget,
      revenue: movie.revenue,
      status: movie.status,
      adult: movie.adult,
      certification: getCertification(movie.release_dates),
      homepage: movie.homepage,
      imdbId: movie.imdb_id,
      originalLanguage: movie.original_language,
      spokenLanguages: movie.spoken_languages,
      productionCompanies: movie.production_companies,
      productionCountries: movie.production_countries,
      genres: movie.genres,
      poster: getImageUrl(movie.poster_path, 'w500'),
      backdrop: getImageUrl(movie.backdrop_path, 'original'),
      // Credits
      cast: movie.credits?.cast?.slice(0, 20).map((person) => ({
        id: person.id,
        name: person.name,
        character: person.character,
        profilePath: getImageUrl(person.profile_path, 'w185'),
      })),
      crew: movie.credits?.crew?.slice(0, 50).map((person) => ({
        id: person.id,
        name: person.name,
        job: person.job,
        department: person.department,
        profilePath: getImageUrl(person.profile_path, 'w185'),
      })),
      // Videos (trailers, teasers)
      videos: movie.videos?.results?.map((video) => ({
        id: video.id,
        key: video.key,
        name: video.name,
        site: video.site,
        type: video.type,
        official: video.official,
      })),
      // Similar and recommended movies
      similar: formatMovieList(movie.similar?.results || []),
      recommendations: formatMovieList(movie.recommendations?.results || []),
      // Watch providers
      watchProviders: formatWatchProviders(movie['watch/providers']?.results),
    };
  }

  // Format watch providers
export function formatWatchProviders(providers) {
    if (!providers) return null;
    
    // Get providers for US, IN, and GB (you can add more countries)
    const countries = ['US', 'IN', 'GB'];
    const formatted = {};
    
    countries.forEach(country => {
      if (providers[country]) {
        formatted[country] = {
          link: providers[country].link,
          flatrate: providers[country].flatrate?.map(p => ({
            id: p.provider_id,
            name: p.provider_name,
            logo: getImageUrl(p.logo_path, 'w92'),
          })),
          rent: providers[country].rent?.map(p => ({
            id: p.provider_id,
            name: p.provider_name,
            logo: getImageUrl(p.logo_path, 'w92'),
          })),
          buy: providers[country].buy?.map(p => ({
            id: p.provider_id,
            name: p.provider_name,
            logo: getImageUrl(p.logo_path, 'w92'),
          })),
        };
      }
    });
    
    return Object.keys(formatted).length > 0 ? formatted : null;
  }

  // Get TV content rating
export function getTVCertification(contentRatings) {
    if (!contentRatings?.results) return null;
    
    // Priority order: IN (India), US, GB (UK)
    const countries = ['IN', 'US', 'GB'];
    
    for (const country of countries) {
      const rating = contentRatings.results.find(r => r.iso_3166_1 === country);
      if (rating?.rating) {
        return rating.rating;
      }
    }
    
    return null;
  }

  // Format detailed TV show info
export function formatTVDetails(tv) {
    return {
      id: tv.id,
      mediaType: 'tv',
      title: tv.name,
      originalTitle: tv.original_name,
      tagline: tv.tagline,
      overview: tv.overview,
      firstAirDate: tv.first_air_date,
      lastAirDate: tv.last_air_date,
      numberOfSeasons: tv.number_of_seasons,
      numberOfEpisodes: tv.number_of_episodes,
      episodeRunTime: tv.episode_run_time,
      rating: tv.vote_average,
      voteCount: tv.vote_count,
      popularity: tv.popularity,
      status: tv.status,
      type: tv.type,
      certification: getTVCertification(tv.content_ratings),
      homepage: tv.homepage,
      inProduction: tv.in_production,
      originalLanguage: tv.original_language,
      spokenLanguages: tv.spoken_languages,
      productionCompanies: tv.production_companies,
      productionCountries: tv.production_countries,
      networks: tv.networks,
      genres: tv.genres,
      poster: getImageUrl(tv.poster_path, 'w500'),
      backdrop: getImageUrl(tv.backdrop_path, 'original'),
      // Credits
      cast: tv.credits?.cast?.slice(0, 20).map((person) => ({
        id: person.id,
        name: person.name,
        character: person.character,
        profilePath: getImageUrl(person.profile_path, 'w185'),
      })),
      crew: tv.credits?.crew?.slice(0, 50).map((person) => ({
        id: person.id,
        name: person.name,
        job: person.job,
        department: person.department,
        profilePath: getImageUrl(person.profile_path, 'w185'),
      })),
      // Videos (trailers, teasers)
      videos: tv.videos?.results?.map((video) => ({
        id: video.id,
        key: video.key,
        name: video.name,
        site: video.site,
        type: video.type,
        official: video.official,
      })),
      // Similar and recommended TV shows
      similar: formatMediaList(tv.similar?.results || []),
      recommendations: formatMediaList(tv.recommendations?.results || []),
      // Seasons info
      seasons: tv.seasons?.map((season) => ({
        id: season.id,
        name: season.name,
        overview: season.overview,
        seasonNumber: season.season_number,
        episodeCount: season.episode_count,
        airDate: season.air_date,
        rating: season.vote_average,
        poster: getImageUrl(season.poster_path, 'w500'),
      })),
      // Watch providers
      watchProviders: formatWatchProviders(tv['watch/providers']?.results),
    };
  }

  // Format season details with episodes
export function formatSeasonDetails(season) {
    return {
      id: season.id,
      name: season.name,
      overview: season.overview,
      seasonNumber: season.season_number,
      airDate: season.air_date,
      rating: season.vote_average,
      poster: getImageUrl(season.poster_path, 'w500'),
      episodes: season.episodes?.map((episode) => ({
        id: episode.id,
        name: episode.name,
        overview: episode.overview,
        episodeNumber: episode.episode_number,
        seasonNumber: episode.season_number,
        airDate: episode.air_date,
        runtime: episode.runtime,
        rating: episode.vote_average,
        voteCount: episode.vote_count,
        stillPath: getImageUrl(episode.still_path, 'w300'),
        crew: episode.crew?.slice(0, 5).map((person) => ({
          id: person.id,
          name: person.name,
          job: person.job,
          department: person.department,
        })),
        guestStars: episode.guest_stars?.slice(0, 5).map((person) => ({
          id: person.id,
          name: person.name,
          character: person.character,
          profilePath: getImageUrl(person.profile_path, 'w185'),
        })),
      })),
    };
  }

  // ===== PERSON/ACTOR METHODS =====

  // Get person/actor details
export async function getPersonDetails(personId) {
    try {
      const response = await api.get(`/person/${personId}`, {
        params: {
          append_to_response: 'movie_credits,tv_credits,images,external_ids',
        },
      });
      return formatPersonDetails(response.data);
    } catch (error) {
      console.error('TMDB getPersonDetails error:', error.message);
      throw new Error('Failed to fetch person details');
    }
  }

  // Format person details
export function formatPersonDetails(person) {
    return {
      id: person.id,
      name: person.name,
      biography: person.biography,
      birthday: person.birthday,
      deathday: person.deathday,
      placeOfBirth: person.place_of_birth,
      knownForDepartment: person.known_for_department,
      gender: person.gender, // 0: Not specified, 1: Female, 2: Male, 3: Non-binary
      popularity: person.popularity,
      profilePath: getImageUrl(person.profile_path, 'h632'),
      homepage: person.homepage,
      alsoKnownAs: person.also_known_as,
      // External IDs
      externalIds: {
        imdbId: person.external_ids?.imdb_id,
        facebookId: person.external_ids?.facebook_id,
        instagramId: person.external_ids?.instagram_id,
        twitterId: person.external_ids?.twitter_id,
      },
      // Images
      images: person.images?.profiles?.slice(0, 20).map((image) => ({
        filePath: getImageUrl(image.file_path, 'w500'),
        aspectRatio: image.aspect_ratio,
        height: image.height,
        width: image.width,
      })),
      // Movie credits
      movieCredits: {
        cast: person.movie_credits?.cast
          ?.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .map((movie) => ({
            id: movie.id,
            title: movie.title,
            character: movie.character,
            releaseDate: movie.release_date,
            poster: getImageUrl(movie.poster_path, 'w500'),
            rating: movie.vote_average,
            mediaType: 'movie',
          })),
        crew: person.movie_credits?.crew
          ?.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .map((movie) => ({
            id: movie.id,
            title: movie.title,
            job: movie.job,
            department: movie.department,
            releaseDate: movie.release_date,
            poster: getImageUrl(movie.poster_path, 'w500'),
            rating: movie.vote_average,
            mediaType: 'movie',
          })),
      },
      // TV credits
      tvCredits: {
        cast: person.tv_credits?.cast
          ?.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .map((tv) => ({
            id: tv.id,
            title: tv.name,
            character: tv.character,
            firstAirDate: tv.first_air_date,
            poster: getImageUrl(tv.poster_path, 'w500'),
            rating: tv.vote_average,
            episodeCount: tv.episode_count,
            mediaType: 'tv',
          })),
        crew: person.tv_credits?.crew
          ?.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          .map((tv) => ({
            id: tv.id,
            title: tv.name,
            job: tv.job,
            department: tv.department,
            firstAirDate: tv.first_air_date,
            poster: getImageUrl(tv.poster_path, 'w500'),
            rating: tv.vote_average,
            episodeCount: tv.episode_count,
            mediaType: 'tv',
          })),
      },
    };
  }

  // Get movie reviews from TMDB
export async function getMovieReviews(movieId, page = 1) {
    try {
      const response = await api.get(`/movie/${movieId}/reviews`, {
        params: { page },
      });
      return {
        results: formatReviews(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getMovieReviews error:', error.message);
      return { results: [], page: 1, totalPages: 0, totalResults: 0 };
    }
  }

  // Get TV show reviews from TMDB
export async function getTVReviews(tvId, page = 1) {
    try {
      const response = await api.get(`/tv/${tvId}/reviews`, {
        params: { page },
      });
      return {
        results: formatReviews(response.data.results),
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalResults: response.data.total_results,
      };
    } catch (error) {
      console.error('TMDB getTVReviews error:', error.message);
      return { results: [], page: 1, totalPages: 0, totalResults: 0 };
    }
  }

  // Format TMDB reviews to match our schema
export function formatReviews(reviews) {
    return reviews.map((review) => ({
      _id: `tmdb_${review.id}`,
      isTMDB: true,
      user: {
        username: review.author || review.author_details?.username || 'Anonymous',
        avatar: review.author_details?.avatar_path 
          ? (review.author_details.avatar_path.startsWith('/http') 
              ? review.author_details.avatar_path.substring(1) 
              : getImageUrl(review.author_details.avatar_path, 'w200'))
          : null,
      },
      rating: review.author_details?.rating 
        ? review.author_details.rating 
        : (Math.random() * 3 + 7), // Random rating between 7-10 if not provided
      title: review.content?.split('\n')[0]?.substring(0, 100) || 'Review',
      content: review.content || '',
      likes: [],
      dislikes: [],
      replies: [],
      likeCount: 0,
      dislikeCount: 0,
      replyCount: 0,
      spoiler: false,
      createdAt: review.created_at || review.updated_at,
      updatedAt: review.updated_at || review.created_at,
    }));
  }

// ===== ADDITIONAL RECOMMENDATION CATEGORIES =====

// Get movies by genre
export async function getMoviesByGenre(genreId, page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page, 
        with_genres: genreId,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getMoviesByGenre error:', error.message);
    throw new Error('Failed to fetch movies by genre');
  }
}

// Get TV shows by genre
export async function getTVByGenre(genreId, page = 1) {
  try {
    const response = await api.get('/discover/tv', {
      params: { 
        page, 
        with_genres: genreId,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMediaList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getTVByGenre error:', error.message);
    throw new Error('Failed to fetch TV shows by genre');
  }
}

// Get movies from specific decade
export async function getMoviesByDecade(startYear, endYear, page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        'primary_release_date.gte': `${startYear}-01-01`,
        'primary_release_date.lte': `${endYear}-12-31`,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getMoviesByDecade error:', error.message);
    throw new Error('Failed to fetch movies by decade');
  }
}

// Get critically acclaimed movies (high rating)
export async function getCriticallyAcclaimed(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        'vote_average.gte': 8,
        'vote_count.gte': 1000,
        sort_by: 'vote_average.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getCriticallyAcclaimed error:', error.message);
    throw new Error('Failed to fetch critically acclaimed movies');
  }
}

// Get hidden gems (high rating but lower vote count)
export async function getHiddenGems(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        'vote_average.gte': 7.5,
        'vote_count.gte': 100,
        'vote_count.lte': 1000,
        sort_by: 'vote_average.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getHiddenGems error:', error.message);
    throw new Error('Failed to fetch hidden gems');
  }
}

// Get award-winning movies (based on keywords)
export async function getAwardWinners(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        'vote_average.gte': 7.5,
        'vote_count.gte': 2000,
        sort_by: 'vote_average.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getAwardWinners error:', error.message);
    throw new Error('Failed to fetch award winners');
  }
}

// Get movies by original language
export async function getMoviesByLanguage(language, page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_original_language: language,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getMoviesByLanguage error:', error.message);
    throw new Error('Failed to fetch movies by language');
  }
}

// Get family-friendly movies
export async function getFamilyMovies(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_genres: '10751,16', // Family and Animation
        certification_country: 'US',
        'certification.lte': 'PG-13',
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getFamilyMovies error:', error.message);
    throw new Error('Failed to fetch family movies');
  }
}

// Get documentaries
export async function getDocumentaries(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_genres: 99, // Documentary genre ID
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getDocumentaries error:', error.message);
    throw new Error('Failed to fetch documentaries');
  }
}

// Get movies released in a specific year
export async function getMoviesByYear(year, page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        primary_release_year: year,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getMoviesByYear error:', error.message);
    throw new Error('Failed to fetch movies by year');
  }
}

// Get TV genres
export async function getTVGenres() {
  try {
    const response = await api.get('/genre/tv/list');
    return response.data.genres;
  } catch (error) {
    console.error('TMDB getTVGenres error:', error.message);
    throw new Error('Failed to fetch TV genres');
  }
}

// Get trending movies specifically
export async function getTrendingMovies(timeWindow = 'week', page = 1) {
  try {
    const response = await api.get(`/trending/movie/${timeWindow}`, {
      params: { page },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getTrendingMovies error:', error.message);
    throw new Error('Failed to fetch trending movies');
  }
}

// Get trending TV shows specifically
export async function getTrendingTV(timeWindow = 'week', page = 1) {
  try {
    const response = await api.get(`/trending/tv/${timeWindow}`, {
      params: { page },
    });
    return {
      results: formatMediaList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getTrendingTV error:', error.message);
    throw new Error('Failed to fetch trending TV shows');
  }
}

// Get movies with specific runtime (short movies under 90 min)
export async function getShortMovies(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        'with_runtime.lte': 90,
        'vote_average.gte': 6,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getShortMovies error:', error.message);
    throw new Error('Failed to fetch short movies');
  }
}

// Get epic long movies (over 150 min)
export async function getEpicMovies(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        'with_runtime.gte': 150,
        'vote_average.gte': 7,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getEpicMovies error:', error.message);
    throw new Error('Failed to fetch epic movies');
  }
}

// Get new releases (released in last 30 days)
export async function getNewReleases(page = 1) {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        'primary_release_date.gte': thirtyDaysAgo.toISOString().split('T')[0],
        'primary_release_date.lte': today.toISOString().split('T')[0],
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getNewReleases error:', error.message);
    throw new Error('Failed to fetch new releases');
  }
}

// Get movies with specific certification (R-rated, etc.)
export async function getMoviesByCertification(certification, page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        certification_country: 'US',
        certification: certification,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getMoviesByCertification error:', error.message);
    throw new Error('Failed to fetch movies by certification');
  }
}

// Get late night movies (thrillers, horror released in last 2 years)
export async function getLateNightMovies(page = 1) {
  try {
    const currentYear = new Date().getFullYear();
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_genres: '27,53', // Horror, Thriller
        'primary_release_date.gte': `${currentYear - 2}-01-01`,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getLateNightMovies error:', error.message);
    throw new Error('Failed to fetch late night movies');
  }
}

// Get feel-good movies (Comedy, Romance with good ratings)
export async function getFeelGoodMovies(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_genres: '35,10749', // Comedy, Romance
        'vote_average.gte': 6.5,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getFeelGoodMovies error:', error.message);
    throw new Error('Failed to fetch feel-good movies');
  }
}

// Get mind-bending movies (Sci-Fi, Mystery with high ratings)
export async function getMindBendingMovies(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_genres: '878,9648', // Sci-Fi, Mystery
        'vote_average.gte': 7,
        sort_by: 'vote_average.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getMindBendingMovies error:', error.message);
    throw new Error('Failed to fetch mind-bending movies');
  }
}

// Get binge-worthy TV shows (highly rated with many episodes)
export async function getBingeWorthyTV(page = 1) {
  try {
    const response = await api.get('/discover/tv', {
      params: { 
        page,
        'vote_average.gte': 7.5,
        'vote_count.gte': 500,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMediaList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getBingeWorthyTV error:', error.message);
    throw new Error('Failed to fetch binge-worthy TV shows');
  }
}

// Get limited series (miniseries with 1 season)
export async function getLimitedSeries(page = 1) {
  try {
    const response = await api.get('/discover/tv', {
      params: { 
        page,
        with_type: '2', // Miniseries type
        'vote_average.gte': 7,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMediaList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getLimitedSeries error:', error.message);
    throw new Error('Failed to fetch limited series');
  }
}

// Get anime movies and shows
export async function getAnime(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_genres: 16, // Animation
        with_original_language: 'ja', // Japanese
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getAnime error:', error.message);
    throw new Error('Failed to fetch anime');
  }
}

// Get anime TV shows
export async function getAnimeTV(page = 1) {
  try {
    const response = await api.get('/discover/tv', {
      params: { 
        page,
        with_genres: 16, // Animation
        with_original_language: 'ja', // Japanese
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMediaList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getAnimeTV error:', error.message);
    throw new Error('Failed to fetch anime TV shows');
  }
}

// Get reality TV shows
export async function getRealityTV(page = 1) {
  try {
    const response = await api.get('/discover/tv', {
      params: { 
        page,
        with_genres: 10764, // Reality
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMediaList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getRealityTV error:', error.message);
    throw new Error('Failed to fetch reality TV shows');
  }
}

// Get crime dramas
export async function getCrimeDramas(page = 1) {
  try {
    const response = await api.get('/discover/tv', {
      params: { 
        page,
        with_genres: '80,18', // Crime, Drama
        'vote_average.gte': 7,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMediaList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getCrimeDramas error:', error.message);
    throw new Error('Failed to fetch crime dramas');
  }
}

// Get superhero content
export async function getSuperheroContent(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_keywords: '9715', // Superhero keyword
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getSuperheroContent error:', error.message);
    throw new Error('Failed to fetch superhero content');
  }
}

// Get movies based on true stories
export async function getBasedOnTrueStory(page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_keywords: '9672', // Based on true story keyword
        'vote_average.gte': 6.5,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getBasedOnTrueStory error:', error.message);
    throw new Error('Failed to fetch movies based on true stories');
  }
}

// Get trending movies in a specific region/country
export async function getTrendingMoviesInRegion(region = 'US', page = 1) {
  try {
    const response = await api.get('/trending/movie/day', {
      params: { page, region },
    });
    return {
      results: formatMovieList(response.data.results).slice(0, 10),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getTrendingMoviesInRegion error:', error.message);
    throw new Error('Failed to fetch trending movies in region');
  }
}

// Get trending TV shows in a specific region/country
export async function getTrendingTVInRegion(region = 'US', page = 1) {
  try {
    const response = await api.get('/trending/tv/day', {
      params: { page, region },
    });
    return {
      results: formatMediaList(response.data.results).slice(0, 10),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getTrendingTVInRegion error:', error.message);
    throw new Error('Failed to fetch trending TV in region');
  }
}

// Get TMDB recommendations for a specific movie
export async function getMovieRecommendations(movieId, page = 1) {
  try {
    const response = await api.get(`/movie/${movieId}/recommendations`, {
      params: { page },
    });
    return formatMovieList(response.data.results);
  } catch (error) {
    console.error('TMDB getMovieRecommendations error:', error.message);
    return [];
  }
}

// Get TMDB recommendations for a specific TV show
export async function getTVRecommendations(tvId, page = 1) {
  try {
    const response = await api.get(`/tv/${tvId}/recommendations`, {
      params: { page },
    });
    return formatMediaList(response.data.results);
  } catch (error) {
    console.error('TMDB getTVRecommendations error:', error.message);
    return [];
  }
}

// Get movies from specific production companies (Netflix, Marvel, etc)
export async function getMoviesByCompany(companyId, page = 1) {
  try {
    const response = await api.get('/discover/movie', {
      params: { 
        page,
        with_companies: companyId,
        sort_by: 'popularity.desc'
      },
    });
    return {
      results: formatMovieList(response.data.results),
      page: response.data.page,
      totalPages: response.data.total_pages,
      totalResults: response.data.total_results,
    };
  } catch (error) {
    console.error('TMDB getMoviesByCompany error:', error.message);
    throw new Error('Failed to fetch movies by company');
  }
}
