import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Star } from "lucide-react";
import { getMovieImage } from "@/lib/tmdb";

export function MovieCard({ movie, onClick }) {
  const [imageUrl, setImageUrl] = useState(movie.poster_path || null);

  // Generate a deterministic gradient based on the movie ID or title
  const gradients = [
    "from-pink-500 to-rose-500",
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-indigo-500",
    "from-green-500 to-emerald-500",
    "from-orange-500 to-amber-500",
  ];
  const gradient = gradients[movie.id % gradients.length] || gradients[0];

  useEffect(() => {
    // If we already have a poster path (from TMDB direct), use it.
    if (movie.poster_path) {
      setImageUrl(movie.poster_path);
      return;
    }

    // Fallback: fetch if not present (legacy support or if data is partial)
    let mounted = true;
    const fetchImage = async () => {
      if (movie.title) {
        const url = await getMovieImage(movie.title, movie.year);
        if (mounted && url) {
          setImageUrl(url);
        }
      }
    };

    if (!imageUrl) {
      fetchImage();
    }
    return () => { mounted = false; };
  }, [movie.title, movie.year, movie.poster_path]);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="h-full"
    >
      <Card
        className="overflow-hidden border-0 bg-card/50 backdrop-blur-sm cursor-pointer group h-full shadow-lg hover:shadow-xl transition-shadow flex flex-col"
        onClick={onClick}
      >
        <div className={`aspect-[2/3] w-full relative overflow-hidden bg-gradient-to-br ${gradient}`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={movie.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col justify-end p-6 bg-black/10 group-hover:bg-black/20 transition-colors">
              <h3 className="relative z-10 text-white text-2xl font-bold leading-tight line-clamp-3 drop-shadow-md">
                {movie.title}
              </h3>
            </div>
          )}

          {/* Overlay gradient for text readability if image exists */}
          {imageUrl && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          )}

          {movie.is_ai_pick && (
            <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 backdrop-blur-md border border-white/20">
              <Star className="w-3 h-3 fill-current" />
              AI PICK
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-2 flex-1 flex flex-col justify-end">
          <h3 className="font-semibold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{movie.year || "N/A"}</span>
            </div>
            {movie.vote_average && (
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-foreground">{movie.vote_average.toFixed(1)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
