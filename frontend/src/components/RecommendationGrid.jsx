import { MovieCard } from "./MovieCard";

import { Skeleton } from "@/components/ui/skeleton";

export function RecommendationGrid({ movies, onMovieClick, loading, hasFetched }) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                        <Skeleton className="h-[300px] w-full rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[80%]" />
                            <Skeleton className="h-3 w-[50%]" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!movies || movies.length === 0) {
        if (!hasFetched) return null; // Don't show anything if we haven't fetched yet
        return (
            <div className="text-center py-20 text-muted-foreground">
                No movies found. Try a different search.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {movies.map((movie) => (
                <MovieCard
                    key={movie.id}
                    movie={movie}
                    onClick={() => onMovieClick(movie)}
                />
            ))}
        </div>
    );
}
