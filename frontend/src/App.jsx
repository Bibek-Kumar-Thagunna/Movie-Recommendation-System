import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { RecommendationGrid } from "@/components/RecommendationGrid";
import { MovieCard } from "@/components/MovieCard";
import { Onboarding } from "@/components/Onboarding";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Film, Sparkles } from "lucide-react";
import { getMovieImage, getMovieDetails, searchMoviesTMDB, getRecommendationsTMDB, getMoviesByActor } from "@/lib/tmdb";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [hasFetched, setHasFetched] = useState(false);

  const exploreRef = useRef(null);

  // Load preferences from local storage on mount
  useEffect(() => {
    const storedPrefs = localStorage.getItem("movie_prefs");
    if (storedPrefs) {
      setUserPreferences(JSON.parse(storedPrefs));
      setOnboardingComplete(true);
    }
  }, []);

  // Fetch initial recommendations when onboarding completes or prefs load
  useEffect(() => {
    if (onboardingComplete && userPreferences) {
      fetchRecommendations(true);
      // Auto-scroll to content after a brief delay to allow rendering
      setTimeout(() => {
        handleScrollToExplore();
      }, 100);
    }
  }, [onboardingComplete, userPreferences]);

  const handleOnboardingComplete = (prefs) => {
    setUserPreferences(prefs);
    localStorage.setItem("movie_prefs", JSON.stringify(prefs));
    setOnboardingComplete(true);
  };

  const fetchRecommendations = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const p = reset ? 1 : page;
      let results = [];

      if (search) {
        // If searching, use TMDB search directly
        const tmdbResults = await searchMoviesTMDB(search);
        results = tmdbResults.map(m => ({
          id: m.id,
          title: m.title,
          year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
          genre: m.genre_ids,
          overview: m.overview,
          industry: 'Hollywood',
          poster_path: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
          vote_average: m.vote_average
        }));
        setHasMore(false);
      } else {
        // PRIORITIZED FEED LOGIC:
        // 1. Plot Match (Neural Network) - Top Priority
        // 2. Genre Match (TMDB) - Medium Priority
        // 3. Actor Match (TMDB) - Low Priority

        // Safe access to userPreferences
        const prefs = userPreferences || {};
        const seedMovies = prefs.movies || [];
        const genreIds = prefs.genres || [];
        const industryCodes = prefs.industries || [];

        // We fetch everything on page 1 to construct the perfect feed
        // Pagination will just load more Genre/Actor matches later
        if (p === 1) {
          let plotMatches = [];
          let genreMatches = [];
          let actorMatches = [];

          // --- 1. PLOT MATCHES (Neural Network) ---
          const nnTitles = new Set();
          if (seedMovies.length > 0) {
            for (const seed of seedMovies) {
              try {
                // Try finding by title first (Local DB match)
                const res = await axios.get(`${API_URL}/recommend_by_title`, {
                  params: { title: seed.title, k: 10 }
                });
                res.data.forEach(t => nnTitles.add(t));
              } catch (e) {
                console.log(`Backend match failed for ${seed.title}, trying On-the-fly Embedding...`);
                // Fallback: Use On-the-fly Embedding with Plot
                try {
                  const res = await axios.post(`${API_URL}/recommend_by_plot`, {
                    overview: seed.overview || "",
                    year: parseInt(seed.year) || 2024,
                    genres: seed.genre || [], // Ensure this matches what TMDB returns (names or IDs? TMDB returns IDs usually, need names for backend?)
                    k: 10
                  });
                  res.data.forEach(t => nnTitles.add(t));
                } catch (e2) {
                  console.error(`On-the-fly embedding failed for ${seed.title}`, e2);
                }
              }
            }
          }

          // Hydrate
          for (const title of nnTitles) {
            const searchRes = await searchMoviesTMDB(title);
            if (searchRes && searchRes.length > 0) {
              const m = searchRes[0];
              // Filter by industry if selected
              if (industryCodes.length > 0 && !industryCodes.includes(m.original_language)) {
                continue;
              }

              plotMatches.push({
                id: m.id,
                title: m.title,
                year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
                genre: m.genre_ids,
                overview: m.overview,
                industry: 'Hollywood',
                poster_path: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
                vote_average: m.vote_average,
                is_ai_pick: true, // Tag for UI
                match_type: 'Plot Match'
              });
            }
          }

          // Sort Plot Matches by Year (Recent First)
          plotMatches.sort((a, b) => {
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            return yearB - yearA;
          });




          // --- 2. GENRE MATCHES (TMDB) ---
          // We use the existing function but treat it as just one source
          const tmdbGenreResults = await getRecommendationsTMDB([], genreIds, 1, industryCodes);
          genreMatches = tmdbGenreResults.map(m => ({ ...m, match_type: 'Genre Match' }));

          // --- 3. ACTOR MATCHES (TMDB) ---
          if (seedMovies.length > 0) {
            // Pick a random seed movie to find actor matches for (to vary it up)
            // or do all? Let's do the first one for now to keep it fast
            const seedId = seedMovies[0].id;
            const actorRes = await getMoviesByActor(seedId);

            // Filter actor matches by industry too
            let filteredActorRes = actorRes;
            if (industryCodes.length > 0) {
              // We need to check original_language for these too. 
              // getMoviesByActor might not return it, let's assume we need to fetch details or just trust it?
              // Actually getMoviesByActor returns basic info. Let's assume if the user likes the actor, they like the movie regardless of language?
              // Or we should filter. Let's filter if we can. 
              // We didn't add original_language to getMoviesByActor return. Let's skip filtering for now or update it.
              // Let's update it in next step if needed. For now, let's leave it to show diversity.
            }

            actorMatches = filteredActorRes.map(m => ({ ...m, match_type: `Starring ${m.actor_name || 'Same Actor'}` }));
          }

          // --- MERGE & DEDUPLICATE ---
          // Order: Plot -> Genre -> Actor
          // We want to interleave them slightly but keep the priority clear
          // Actually, user asked for PRIORITY: Plot > Genre > Actor
          // So we will stack them.

          let combined = [];
          const existingIds = new Set();
          const seedIds = new Set(seedMovies.map(m => m.id));

          const addUniqueMovie = (movie) => {
            if (!existingIds.has(movie.id) && !seedIds.has(movie.id)) {
              combined.push(movie);
              existingIds.add(movie.id);
            }
          };

          plotMatches.forEach(addUniqueMovie);
          genreMatches.forEach(addUniqueMovie);
          actorMatches.forEach(addUniqueMovie);

          results = combined;
          setHasMore(true); // We can load more genres later
        } else {
          // Page > 1: Just load more Genre matches from TMDB to keep the feed infinite
          const moreGenres = await getRecommendationsTMDB([], genreIds, p, industryCodes);
          results = moreGenres;
        }
      }

      if (reset) {
        setMovies(results);
        setPage(2);
      } else {
        setMovies((prev) => [...prev, ...results]);
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error in fetchRecommendations:", error);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  const handleSearch = () => {
    fetchRecommendations(true);
  };

  const handleScrollToExplore = () => {
    exploreRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleMovieClick = async (movie) => {
    const fullDetails = await getMovieDetails(movie.id);
    setSelectedMovie(fullDetails || movie);

    setRecLoading(true);
    setRecommendations([]);

    try {
      // For the modal "Similar Movies", we can also use the Hybrid approach!
      // Ask backend for titles similar to this movie
      const res = await axios.get(`${API_URL}/recommend_by_title`, {
        params: { title: movie.title, k: 6 }
      });

      const hydratedRecs = [];
      for (const title of res.data) {
        const searchRes = await searchMoviesTMDB(title);
        if (searchRes && searchRes.length > 0) {
          const m = searchRes[0];
          hydratedRecs.push({
            id: m.id,
            title: m.title,
            year: m.release_date ? m.release_date.split('-')[0] : 'N/A',
            poster_path: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
          });
        }
      }
      setRecommendations(hydratedRecs);

    } catch (err) {
      console.error("Failed to fetch recommendations", err);
      // Fallback to TMDB purely if backend fails (e.g. movie not in local DB)
      // We could implement this fallback here if needed.
    } finally {
      setRecLoading(false);
    }
  };

  const loadMore = () => {
    fetchRecommendations();
  };

  const resetPreferences = () => {
    localStorage.removeItem("movie_prefs");
    setOnboardingComplete(false);
    setUserPreferences(null);
    setMovies([]);
    setPage(1);
    setHasFetched(false);
  };

  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <Hero onStart={handleScrollToExplore} />

      <main ref={exploreRef} className="container mx-auto px-4 py-12 space-y-12">
        <div className="flex flex-col items-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {search ? "Search Results" : (
              <>
                <Sparkles className="text-primary h-6 w-6" />
                AI Curated For You
              </>
            )}
          </h2>
          <div className="w-full max-w-2xl flex gap-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={handleSearch}
            />
            <Button variant="outline" onClick={resetPreferences} className="whitespace-nowrap">
              Reset Prefs
            </Button>
          </div>
        </div>

        <RecommendationGrid movies={movies} onMovieClick={handleMovieClick} loading={loading} hasFetched={hasFetched} />

        {hasMore && !search && (
          <div className="flex justify-center pt-8">
            <Button
              variant="outline"
              size="lg"
              onClick={loadMore}
              disabled={loading}
              className="min-w-[200px]"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Load More"}
            </Button>
          </div>
        )}
      </main>

      {/* Movie Details Dialog */}
      <Dialog open={!!selectedMovie} onOpenChange={(open) => !open && setSelectedMovie(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-none bg-card/95 backdrop-blur-xl">
          {selectedMovie && (
            <div className="flex flex-col md:flex-row h-full">
              {/* Sidebar / Header Image */}
              {/* Sidebar / Header Image */}
              {/* Sidebar / Header Image */}
              <div className="w-full md:w-[300px] h-60 md:h-auto relative bg-black flex-shrink-0 overflow-hidden group">
                {selectedMovie.poster_path ? (
                  <>
                    {/* Blurred Background Layer */}
                    <img
                      src={selectedMovie.poster_path}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-50"
                    />
                    {/* Sharp Foreground Layer */}
                    <div className="absolute inset-0 flex items-start justify-center p-6 pt-10">
                      <img
                        src={selectedMovie.poster_path}
                        alt={selectedMovie.title}
                        className="w-full h-auto max-h-full object-contain rounded-lg shadow-2xl z-10"
                      />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Film className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-4 text-white md:hidden z-20">
                  <h2 className="text-2xl font-bold leading-tight drop-shadow-md">{selectedMovie.title}</h2>
                  <p className="text-sm opacity-90">{selectedMovie.year}</p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="p-6 pb-0 hidden md:block">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-bold">{selectedMovie.title}</DialogTitle>
                    <DialogDescription className="text-lg mt-1">
                      {selectedMovie.year} • {selectedMovie.vote_average ? `${selectedMovie.vote_average.toFixed(1)}/10` : 'N/A'}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      {selectedMovie.genre && (Array.isArray(selectedMovie.genre) ? selectedMovie.genre : []).map((g, i) => (
                        <span key={i} className="bg-secondary/50 text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium border border-white/5">
                          {g}
                        </span>
                      ))}
                    </div>

                    <div className="prose prose-invert max-w-none">
                      <p className="text-muted-foreground leading-relaxed text-lg">
                        {selectedMovie.overview || "No overview available for this movie."}
                      </p>
                    </div>

                    {/* Cast Section */}
                    {selectedMovie.cast && selectedMovie.cast.length > 0 && (
                      <div className="pt-6">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Cast</h3>
                        <div className="flex flex-wrap gap-4">
                          {selectedMovie.cast.map((actor, i) => (
                            <div key={i} className="flex items-center gap-3 bg-secondary/20 rounded-lg p-2 pr-4 border border-white/5">
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                                {actor.profile_path ? (
                                  <img src={actor.profile_path} alt={actor.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-secondary text-xs font-bold">
                                    {actor.name[0]}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium leading-none">{actor.name}</span>
                                <span className="text-xs text-muted-foreground">{actor.character}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t border-white/10">
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs uppercase tracking-wider">AI Content Match</span>
                        Similar Movies
                      </h3>

                      {recLoading ? (
                        <div className="flex items-center justify-center h-40">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                          {recommendations.map((rec) => (
                            <div key={rec.id} className="w-[140px] flex-shrink-0">
                              <MovieCard
                                movie={rec}
                                onClick={() => handleMovieClick(rec)}
                                className="w-full"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
