import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getTrendingMovies } from "@/lib/tmdb";

export function Hero({ onStart }) {
    const [posters, setPosters] = useState([]);

    useEffect(() => {
        const loadTrending = async () => {
            const movies = await getTrendingMovies();
            // Duplicate the list to ensure smooth infinite scrolling
            setPosters([...movies, ...movies, ...movies]);
        };
        loadTrending();
    }, []);

    return (
        <section className="relative h-[80vh] w-full overflow-hidden flex items-center justify-center bg-background">
            {/* Marquee Background */}
            <div className="absolute inset-0 z-0 opacity-20 select-none pointer-events-none grayscale-[50%]">
                <div className="flex flex-col gap-4 -rotate-6 scale-110">
                    {/* Row 1 - Left to Right */}
                    <motion.div
                        className="flex gap-4 min-w-max"
                        animate={{ x: [0, -1000] }}
                        transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
                    >
                        {posters.map((movie, i) => (
                            <div key={`r1-${i}`} className="w-[200px] h-[300px] rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </motion.div>

                    {/* Row 2 - Right to Left */}
                    <motion.div
                        className="flex gap-4 min-w-max"
                        animate={{ x: [-1000, 0] }}
                        transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
                    >
                        {posters.map((movie, i) => (
                            <div key={`r2-${i}`} className="w-[200px] h-[300px] rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </motion.div>
                    {/* Row 3 - Left to Right */}
                    <motion.div
                        className="flex gap-4 min-w-max"
                        animate={{ x: [0, -1000] }}
                        transition={{ repeat: Infinity, duration: 50, ease: "linear" }}
                    >
                        {posters.map((movie, i) => (
                            <div key={`r3-${i}`} className="w-[200px] h-[300px] rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background z-1" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent z-1" />

            <div className="container relative z-10 flex flex-col items-center text-center gap-6 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4 inline-block backdrop-blur-sm">
                        AI-Powered Recommendations
                    </span>
                </motion.div>

                <motion.h1
                    className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground drop-shadow-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                >
                    Discover Your Next <br />
                    Favorite Movie
                </motion.h1>

                <motion.p
                    className="text-xl text-muted-foreground max-w-[600px] drop-shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                >
                    Our advanced neural network analyzes thousands of films to find the perfect match for your taste.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                >
                    <Button size="lg" className="text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/20" onClick={onStart}>
                        Start Exploring
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
