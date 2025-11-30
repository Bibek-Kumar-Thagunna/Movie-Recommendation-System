import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Hardcoded key as per user request
const API_KEY = "ced9a867f170ded310132ef0f33e436a";

export const getTMDBConfig = () => API_KEY;

export const getMovieImage = async (title, year) => {
    if (!API_KEY) return null;

    try {
        const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
            params: {
                api_key: API_KEY,
                query: title,
                year: year,
                include_adult: false
            }
        });

        if (response.data.results && response.data.results.length > 0) {
            const movie = response.data.results[0];
            if (movie.poster_path) {
                return `${IMAGE_BASE_URL}${movie.poster_path}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Error fetching image from TMDB:", error);
        return null;
    }
};

// --- New Functions for Onboarding & Recommendations ---

export const getGenres = async () => {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/genre/movie/list`, {
            params: { api_key: API_KEY }
        });
        return response.data.genres || [];
    } catch (error) {
        console.error("Error fetching genres:", error);
        return [];
    }
};

export const searchMoviesTMDB = async (query) => {
    if (!query) return [];
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
            params: {
                api_key: API_KEY,
                query: query,
                include_adult: false
            }
        });
        return response.data.results || [];
    } catch (error) {
        console.error("Error searching movies:", error);
        return [];
    }
};

export const getRecommendationsTMDB = async (seedMovieIds, genreIds, page = 1, industryCodes = []) => {
    // TMDB doesn't have a single "complex recommendation" endpoint that takes both easily.
    // We can use 'discover' for genres, or 'recommendations' for a specific movie.
    // Strategy:
    // 1. If we have seed movies, get recommendations for the first one (or random one).
    // 2. If we have genres, use discover.
    // 3. Mix results if possible, or just prioritize one.

    try {
        let results = [];

        // Common params for filtering
        const commonParams = {
            api_key: API_KEY,
            page: page,
            include_adult: false
        };

        if (industryCodes && industryCodes.length > 0) {
            commonParams.with_original_language = industryCodes.join('|');
        }

        // Strategy A: Discover by Genres (if available)
        if (genreIds && genreIds.length > 0) {
            const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
                params: {
                    ...commonParams,
                    with_genres: genreIds.join(','),
                    sort_by: 'popularity.desc',
                }
            });
            results = [...results, ...response.data.results];
        }

        // Strategy B: Recommendations based on Seed Movies
        // We'll fetch for the first seed movie to keep it simple for now, or loop?
        // Let's just do one for now to avoid rate limits or complexity.
        if (seedMovieIds && seedMovieIds.length > 0) {
            const seedId = seedMovieIds[0]; // Just take the first one for now
            const response = await axios.get(`${TMDB_BASE_URL}/movie/${seedId}/recommendations`, {
                params: {
                    api_key: API_KEY,
                    page: page,
                    // Note: recommendations endpoint doesn't support with_original_language directly usually,
                    // but we can filter client side if needed.
                }
            });

            let newRecs = response.data.results;

            // Client-side filter for industry if provided (since endpoint might not support it)
            if (industryCodes && industryCodes.length > 0) {
                newRecs = newRecs.filter(m => industryCodes.includes(m.original_language));
            }

            // Add to results, avoiding duplicates
            const existingIds = new Set(results.map(m => m.id));
            newRecs = newRecs.filter(m => !existingIds.has(m.id));
            results = [...results, ...newRecs];
        }

        // If no genres or seeds, just discover popular movies with industry filter
        if ((!genreIds || genreIds.length === 0) && (!seedMovieIds || seedMovieIds.length === 0)) {
            const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
                params: {
                    ...commonParams,
                    sort_by: 'popularity.desc',
                }
            });
            results = [...results, ...response.data.results];
        }

        // Normalize data structure to match our app's expectation
        return results.map(m => ({
            id: m.id,
            title: m.title,
            year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
            genre: m.genre_ids, // This is an array of IDs, we might need to map it back to names if needed, but for now IDs are ok or we fetch names.
            overview: m.overview,
            industry: 'Hollywood', // Default for TMDB
            poster_path: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : null,
            backdrop_path: m.backdrop_path ? `${IMAGE_BASE_URL}${m.backdrop_path}` : null,
            vote_average: m.vote_average,
            original_language: m.original_language
        }));

    } catch (error) {
        console.error("Error fetching recommendations:", error);
        return [];
    }
};

export const getMovieDetails = async (movieId) => {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, {
            params: {
                api_key: API_KEY,
                append_to_response: 'credits'
            }
        });
        const m = response.data;
        return {
            id: m.id,
            title: m.title,
            year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
            genre: m.genres.map(g => g.name),
            overview: m.overview,
            industry: 'Hollywood',
            poster_path: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : null,
            backdrop_path: m.backdrop_path ? `${IMAGE_BASE_URL}${m.backdrop_path}` : null,
            vote_average: m.vote_average,
            cast: m.credits?.cast?.slice(0, 5).map(c => ({ name: c.name, character: c.character, profile_path: c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : null })) || []
        };
    } catch (error) {
        console.error("Error fetching movie details:", error);
        return null;
    }
}

export const getMoviesByActor = async (seedMovieId) => {
    try {
        // 1. Get credits for the seed movie
        const creditsRes = await axios.get(`${TMDB_BASE_URL}/movie/${seedMovieId}/credits`, {
            params: { api_key: API_KEY }
        });

        if (!creditsRes.data.cast || creditsRes.data.cast.length === 0) return [];

        // 2. Get the lead actor (first in cast)
        const leadActor = creditsRes.data.cast[0];

        // 3. Discover movies by this actor
        const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
            params: {
                api_key: API_KEY,
                with_cast: leadActor.id,
                sort_by: 'popularity.desc',
                include_adult: false
            }
        });

        return response.data.results.map(m => ({
            id: m.id,
            title: m.title,
            year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
            genre: m.genre_ids,
            overview: m.overview,
            industry: 'Hollywood',
            poster_path: m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : null,
            vote_average: m.vote_average,
            actor_name: leadActor.name // Pass actor name for UI context if needed
        })) || [];

    } catch (error) {
        console.error("Error fetching actor movies:", error);
        return [];
    }
};

export const getTrendingMovies = async () => {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/trending/movie/day`, {
            params: { api_key: API_KEY }
        });
        return response.data.results || [];
    } catch (error) {
        console.error("Error fetching trending movies:", error);
        return [];
    }
};
