from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import torch
import pandas as pd
import numpy as np
import pickle
import os
from typing import List, Optional
from pydantic import BaseModel

# Import the model class
# We need to make sure backend directory is in path or we import relatively if running from root
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from model import MovieRecommenderNet

app = FastAPI(title="Neural Movie Recommender")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    import json
    try:
        body = await request.body()
        print(f"Request: {request.method} {request.url}")
        if body:
            print(f"Body: {body.decode()}")
    except Exception as e:
        print(f"Error reading body: {e}")
    
    response = await call_next(request)
    return response

# Global variables to hold model and data
model = None
movies_df = None
embeddings = None
tfidf = None
mlb = None
scaler = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

MODEL_DIR = "backend/artifacts"
EMBEDDING_DIM = 64
INPUT_DIM = 0 # Will be inferred from model state or config

from typing import List, Optional, Union

class Movie(BaseModel):
    id: int
    title: str
    year: Optional[Union[str, int, float]] = None
    genre: Optional[Union[List[str], str]] = None
    overview: Optional[str] = None
    industry: Optional[str] = None

    class Config:
        # Allow population by field name (if we rename index to id)
        populate_by_name = True

class PlotRequest(BaseModel):
    overview: str
    year: int = 2024
    genres: List[str] = []
    k: int = 5

@app.on_event("startup")
async def load_artifacts():
    global model, movies_df, embeddings, INPUT_DIM, tfidf, mlb, scaler
    
    print("Loading artifacts...")
    try:
        # Load Metadata/Dataframe
        movies_df = pd.read_pickle(os.path.join(MODEL_DIR, "movies_metadata.pkl"))
        movies_df['overview'] = movies_df['overview'].fillna("")
        
        # Load Embeddings
        with open(os.path.join(MODEL_DIR, "embeddings.pkl"), "rb") as f:
            embeddings = pickle.load(f)
            
        # Load Preprocessors
        with open(os.path.join(MODEL_DIR, "tfidf.pkl"), "rb") as f:
            tfidf = pickle.load(f)
        with open(os.path.join(MODEL_DIR, "mlb.pkl"), "rb") as f:
            mlb = pickle.load(f)
        with open(os.path.join(MODEL_DIR, "scaler.pkl"), "rb") as f:
            scaler = pickle.load(f)
            
        # Load Model
        state_dict = torch.load(os.path.join(MODEL_DIR, "model.pt"), map_location=device)
        INPUT_DIM = state_dict['encoder.0.weight'].shape[1]
        
        model = MovieRecommenderNet(INPUT_DIM, EMBEDDING_DIM).to(device)
        model.load_state_dict(state_dict)
        model.eval()
        
        print("Artifacts loaded successfully!")
    except Exception as e:
        print(f"Error loading artifacts: {e}")
        print("Ensure you have run 'python backend/model.py' first.")

@app.get("/movies", response_model=dict)
async def get_movies(
    page: int = 1, 
    limit: int = 20, 
    search: Optional[str] = None,
    industry: Optional[str] = None
):
    if movies_df is None:
        raise HTTPException(status_code=503, detail="System not ready")
        
    filtered = movies_df.copy()
    
    if search:
        filtered = filtered[filtered['title'].str.contains(search, case=False, na=False)]
        
    if industry:
        filtered = filtered[filtered['industry'].str.contains(industry, case=False, na=False)]
        
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    
    results_df = filtered.iloc[start:end].copy()
    if 'index' in results_df.columns:
        results_df['id'] = results_df['index']
    else:
        results_df['id'] = results_df.index
        
    results = results_df.to_dict(orient='records')
    
    for r in results:
        for k, v in r.items():
            if isinstance(v, float) and np.isnan(v):
                r[k] = None
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": results
    }

@app.get("/recommend_by_title", response_model=List[str])
async def recommend_by_title(title: str, k: int = 5):
    if embeddings is None or movies_df is None:
        raise HTTPException(status_code=503, detail="System not ready")

    # 1. Find the closest match in our local dataset
    import difflib
    
    # Get all titles (ensure strings)
    all_titles = [str(t) for t in movies_df['title'].dropna().tolist()]
    
    # Find close matches
    matches = difflib.get_close_matches(title, all_titles, n=1, cutoff=0.6)
    
    if not matches:
        # Try simple containment if fuzzy fails
        matches = movies_df[movies_df['title'].str.contains(title, case=False, na=False)]['title'].tolist()
        if not matches:
             raise HTTPException(status_code=404, detail=f"Movie '{title}' not found in AI database")
    
    matched_title = matches[0]
    
    # Get the index of the matched movie
    movie_idx = movies_df[movies_df['title'] == matched_title].index[0]
    
    # 2. Run the Neural Network Logic (Cosine Similarity)
    query_vec = embeddings[movie_idx]
    norm_query = np.linalg.norm(query_vec)
    norm_all = np.linalg.norm(embeddings, axis=1)
    dot_products = np.dot(embeddings, query_vec)
    similarities = dot_products / (norm_all * norm_query)
    
    # Top K
    top_k_indices = np.argsort(similarities)[-(k+1):][::-1]
    top_k_indices = [i for i in top_k_indices if i != movie_idx][:k]
    
    # 3. Return only the titles
    recommended_titles = movies_df.iloc[top_k_indices]['title'].tolist()
    
    return recommended_titles

@app.post("/recommend_by_plot", response_model=List[str])
async def recommend_by_plot(request: PlotRequest):
    if model is None or tfidf is None:
        raise HTTPException(status_code=503, detail="System not ready")
        
    # 1. Preprocess Input
    # Genres
    genre_matrix = mlb.transform([request.genres])
    
    # Overview
    overview_matrix = tfidf.transform([request.overview]).toarray()
    
    # Year
    year_matrix = scaler.transform([[request.year]])
    
    # Combine
    features = np.hstack([genre_matrix, overview_matrix, year_matrix])
    
    # 2. Get Embedding from Model
    features_tensor = torch.FloatTensor(features).to(device)
    with torch.no_grad():
        _, query_embedding = model(features_tensor)
        
    query_vec = query_embedding.cpu().numpy()[0]
    
    # 3. Cosine Similarity
    norm_query = np.linalg.norm(query_vec)
    norm_all = np.linalg.norm(embeddings, axis=1)
    dot_products = np.dot(embeddings, query_vec)
    similarities = dot_products / (norm_all * norm_query)
    
    # Top K
    top_k_indices = np.argsort(similarities)[-(request.k):][::-1]
    
    # Return titles
    recommended_titles = movies_df.iloc[top_k_indices]['title'].tolist()
    
    return recommended_titles

@app.get("/recommend/{movie_id}", response_model=List[Movie])
async def recommend(movie_id: int, k: int = 10):
    if embeddings is None or movies_df is None:
        raise HTTPException(status_code=503, detail="System not ready")
        
    if movie_id < 0 or movie_id >= len(movies_df):
        raise HTTPException(status_code=404, detail="Movie not found")
        
    query_vec = embeddings[movie_id]
    
    norm_query = np.linalg.norm(query_vec)
    if norm_query == 0:
        return []
        
    norm_all = np.linalg.norm(embeddings, axis=1)
    dot_products = np.dot(embeddings, query_vec)
    similarities = dot_products / (norm_all * norm_query)
    
    top_k_indices = np.argsort(similarities)[-(k+1):][::-1]
    top_k_indices = [i for i in top_k_indices if i != movie_id][:k]
    
    recommendations_df = movies_df.iloc[top_k_indices].copy()
    
    if 'index' in recommendations_df.columns:
        recommendations_df['id'] = recommendations_df['index']
    else:
        recommendations_df['id'] = recommendations_df.index

    recommendations = recommendations_df.to_dict(orient='records')
    
    for r in recommendations:
        for k, v in r.items():
            if isinstance(v, float) and np.isnan(v):
                r[k] = None
                
    return recommendations

    return recommendations

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    print(f"Global Exception: {exc}")
    traceback.print_exc()
    return await request.app.http_exception_handler(request, exc)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
