import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, Search, Plus, X, Loader2 } from "lucide-react";
import { getGenres, searchMoviesTMDB } from "@/lib/tmdb";

export function Onboarding({ onComplete }) {
    const [step, setStep] = useState(0); // 0: Industries, 1: Genres, 2: Movies
    const [industries, setIndustries] = useState([]);
    const [genres, setGenres] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedMovies, setSelectedMovies] = useState([]);
    const [loading, setLoading] = useState(false);

    const AVAILABLE_INDUSTRIES = [
        { id: 'en', name: 'Hollywood (English)', emoji: '🇺🇸' },
        { id: 'hi', name: 'Bollywood (Hindi)', emoji: '🇮🇳' },
        { id: 'te', name: 'Tollywood (Telugu)', emoji: '🎥' },
        { id: 'ta', name: 'Kollywood (Tamil)', emoji: '🎬' },
        { id: 'ml', name: 'Mollywood (Malayalam)', emoji: '🌴' },
        { id: 'ko', name: 'K-Drama (Korean)', emoji: '🇰🇷' },
        { id: 'ja', name: 'Anime (Japanese)', emoji: '🇯🇵' },
        { id: 'es', name: 'Spanish', emoji: '🇪🇸' },
        { id: 'fr', name: 'French', emoji: '🇫🇷' },
    ];

    useEffect(() => {
        const loadGenres = async () => {
            const g = await getGenres();
            setGenres(g);
        };
        loadGenres();
    }, []);

    const toggleIndustry = (id) => {
        if (industries.includes(id)) {
            setIndustries(prev => prev.filter(i => i !== id));
        } else {
            setIndustries(prev => [...prev, id]);
        }
    };

    const toggleGenre = (id) => {
        if (selectedGenres.includes(id)) {
            setSelectedGenres(prev => prev.filter(g => g !== id));
        } else {
            setSelectedGenres(prev => [...prev, id]);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 2) {
            setLoading(true);
            const results = await searchMoviesTMDB(query);
            setSearchResults(results.slice(0, 5));
            setLoading(false);
        } else {
            setSearchResults([]);
        }
    };

    const addMovie = (movie) => {
        if (!selectedMovies.find(m => m.id === movie.id)) {
            setSelectedMovies(prev => [...prev, movie]);
        }
        setSearchQuery("");
        setSearchResults([]);
    };

    const removeMovie = (id) => {
        setSelectedMovies(prev => prev.filter(m => m.id !== id));
    };

    const handleFinish = () => {
        onComplete({
            industries: industries,
            genres: selectedGenres,
            movies: selectedMovies
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-2xl p-8 bg-card/50 backdrop-blur-xl border-primary/10 shadow-2xl">
                <div className="space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {step === 0 && "Select your Industries"}
                            {step === 1 && "What do you like?"}
                            {step === 2 && "Tell us your favorites"}
                        </h1>
                        <p className="text-muted-foreground">
                            {step === 0 && "Pick the film industries you want to see movies from."}
                            {step === 1 && "Select a few genres to help us understand your taste."}
                            {step === 2 && "Search and add 3-5 movies you absolutely love."}
                        </p>
                    </div>

                    {step === 0 && (
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-3 justify-center">
                                {AVAILABLE_INDUSTRIES.map((ind) => (
                                    <motion.button
                                        key={ind.id}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => toggleIndustry(ind.id)}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border flex items-center gap-2 ${industries.includes(ind.id)
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-secondary/50 text-secondary-foreground border-transparent hover:bg-secondary"
                                            }`}
                                    >
                                        <span className="text-lg">{ind.emoji}</span>
                                        {ind.name}
                                        {industries.includes(ind.id) && <Check className="h-4 w-4 ml-1" />}
                                    </motion.button>
                                ))}
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button
                                    onClick={() => setStep(1)}
                                    disabled={industries.length === 0}
                                    size="lg"
                                >
                                    Next Step
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-3 justify-center">
                                {genres.map((genre) => (
                                    <motion.button
                                        key={genre.id}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => toggleGenre(genre.id)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${selectedGenres.includes(genre.id)
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-secondary/50 text-secondary-foreground border-transparent hover:bg-secondary"
                                            }`}
                                    >
                                        {genre.name}
                                        {selectedGenres.includes(genre.id) && <Check className="inline-block ml-2 h-3 w-3" />}
                                    </motion.button>
                                ))}
                            </div>
                            <div className="flex justify-between pt-4">
                                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                                <Button
                                    onClick={() => setStep(2)}
                                    disabled={selectedGenres.length === 0}
                                    size="lg"
                                >
                                    Next Step
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search movies..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchResults.length > 0) {
                                            addMovie(searchResults[0]);
                                        }
                                    }}
                                />
                                {loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}

                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-popover border rounded-md shadow-lg overflow-hidden max-h-[300px] overflow-y-auto">
                                        {searchResults.map(movie => (
                                            <div
                                                key={movie.id}
                                                className="p-2 hover:bg-accent cursor-pointer flex items-center gap-3"
                                                onClick={() => addMovie(movie)}
                                            >
                                                <div className="h-12 w-8 bg-muted rounded overflow-hidden flex-shrink-0">
                                                    {movie.poster_path ? (
                                                        <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt={movie.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-secondary" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">{movie.title}</div>
                                                    <div className="text-xs text-muted-foreground">{movie.release_date?.split('-')[0]}</div>
                                                </div>
                                                <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-h-[100px] p-4 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/20">
                                {selectedMovies.length === 0 && (
                                    <div className="col-span-full text-center text-muted-foreground text-sm py-8">
                                        No movies added yet.
                                    </div>
                                )}
                                {selectedMovies.map(movie => (
                                    <div key={movie.id} className="relative group overflow-hidden rounded-md border bg-card flex items-center gap-2 pr-2">
                                        <div className="h-16 w-12 bg-muted flex-shrink-0">
                                            {movie.poster_path ? (
                                                <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt={movie.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-secondary" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 py-1">
                                            <div className="text-sm font-medium truncate" title={movie.title}>{movie.title}</div>
                                            <div className="text-xs text-muted-foreground">{movie.release_date?.split('-')[0]}</div>
                                        </div>
                                        <button
                                            onClick={() => removeMovie(movie.id)}
                                            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                                <Button
                                    onClick={handleFinish}
                                    disabled={selectedMovies.length === 0}
                                    size="lg"
                                >
                                    Finish & Explore
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
