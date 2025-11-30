import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Film, Star, Play, Plus, ThumbsUp } from 'lucide-react';
import axios from 'axios';
import MovieCard from './MovieCard';

const Modal = ({ movie, onClose, onSelectMovie }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [imgError, setImgError] = useState(false);

    // Dynamic Poster URL
    const posterUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(movie.title + " " + movie.year + " movie poster")}&w=800&h=1200&c=7&rs=1&p=0`;

    useEffect(() => {
        if (movie) {
            setLoading(true);
            const movieId = movie.index !== undefined ? movie.index : movie.id;

            axios.get(`http://localhost:8000/recommend/${movieId}`)
                .then(res => {
                    setRecommendations(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [movie]);

    if (!movie) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-[#181818] w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-[#181818] hover:bg-[#2a2a2a] transition-colors z-20 text-white"
                    >
                        <X size={24} />
                    </button>

                    {/* Hero / Backdrop */}
                    <div className="relative h-[400px] md:h-[500px]">
                        <div className="absolute inset-0">
                            {!imgError ? (
                                <img
                                    src={posterUrl}
                                    alt={movie.title}
                                    className="w-full h-full object-cover object-top"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#181818] via-[#181818]/60 to-transparent" />
                        </div>

                        <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full md:w-2/3 z-10">
                            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-xl leading-tight">
                                {movie.title}
                            </h2>

                            <div className="flex items-center gap-4 text-white/90 text-sm md:text-base mb-6 font-medium">
                                <span className="text-green-400 font-bold">98% Match</span>
                                <span>{movie.year}</span>
                                <span className="border border-gray-500 px-1 rounded text-xs">HD</span>
                                <span>{Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre}</span>
                            </div>

                            <div className="flex gap-3 mb-6">
                                <button className="px-8 py-2.5 bg-white text-black rounded font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors text-lg">
                                    <Play size={24} fill="currentColor" /> Play
                                </button>
                                <button className="px-8 py-2.5 bg-gray-500/40 text-white rounded font-bold flex items-center gap-2 hover:bg-gray-500/60 transition-colors text-lg backdrop-blur-sm">
                                    <Plus size={24} /> My List
                                </button>
                                <button className="p-2.5 border border-gray-500/40 rounded-full hover:border-white transition-colors bg-gray-500/20 backdrop-blur-sm text-white">
                                    <ThumbsUp size={20} />
                                </button>
                            </div>

                            <p className="text-white/90 text-lg leading-relaxed line-clamp-3 md:line-clamp-none max-w-2xl drop-shadow-md">
                                {movie.overview || "No overview available for this movie."}
                            </p>
                        </div>
                    </div>

                    {/* Recommendations Section */}
                    <div className="p-8 md:p-12 bg-[#181818]">
                        <h3 className="text-2xl font-bold text-white mb-6">More Like This</h3>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {recommendations.map((rec, idx) => (
                                    <MovieCard key={idx} movie={rec} onClick={onSelectMovie} />
                                ))}
                                {recommendations.length === 0 && (
                                    <p className="text-gray-500 col-span-full">No recommendations found.</p>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default Modal;
