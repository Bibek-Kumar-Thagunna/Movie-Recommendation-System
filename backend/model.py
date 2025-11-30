import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MultiLabelBinarizer, MinMaxScaler
from torch.utils.data import DataLoader, TensorDataset

# Configuration
DATA_PATH = "backend/data/movies.csv"
MODEL_DIR = "backend/artifacts"
EMBEDDING_DIM = 64
EPOCHS = 5
BATCH_SIZE = 64

class MovieRecommenderNet(nn.Module):
    def __init__(self, input_dim, embedding_dim):
        super(MovieRecommenderNet, self).__init__()
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 512),
            nn.ReLU(),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, embedding_dim), # Latent space (Embedding)
        )
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(embedding_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 512),
            nn.ReLU(),
            nn.Linear(512, input_dim)
        )

    def forward(self, x):
        embedding = self.encoder(x)
        reconstructed = self.decoder(embedding)
        return reconstructed, embedding

    def get_embedding(self, x):
        with torch.no_grad():
            return self.encoder(x)

def train_model():
    print("Loading data...")
    if not os.path.exists(DATA_PATH):
        print("Data file not found!")
        return

    df = pd.read_csv(DATA_PATH)
    
    # Preprocessing
    print("Preprocessing features...")
    
    # 1. Genres (Multi-hot)
    df['genre'] = df['genre'].astype(str).apply(lambda x: x.split(', '))
    mlb = MultiLabelBinarizer()
    genre_matrix = mlb.fit_transform(df['genre'])
    
    # 2. Overview (TF-IDF)
    # Limit features to keep model small and fast
    tfidf = TfidfVectorizer(max_features=2000, stop_words='english')
    overview_matrix = tfidf.fit_transform(df['overview'].fillna('')).toarray()
    
    # 3. Year (Normalized)
    scaler = MinMaxScaler()
    # Handle non-numeric years if any slipped through
    df['year'] = pd.to_numeric(df['year'], errors='coerce').fillna(2000)
    year_matrix = scaler.fit_transform(df[['year']])
    
    # Combine features
    # Input vector = [Genre_Multi_Hot, Overview_TFIDF, Year_Norm]
    features = np.hstack([genre_matrix, overview_matrix, year_matrix])
    input_dim = features.shape[1]
    
    print(f"Input feature dimension: {input_dim}")
    
    # Convert to Tensor
    dataset = TensorDataset(torch.FloatTensor(features))
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    # Initialize Model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on {device}...")
    
    model = MovieRecommenderNet(input_dim, EMBEDDING_DIM).to(device)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    # Training Loop
    model.train()
    for epoch in range(EPOCHS):
        total_loss = 0
        for batch in dataloader:
            inputs = batch[0].to(device)
            
            optimizer.zero_grad()
            reconstructed, _ = model(inputs)
            loss = criterion(reconstructed, inputs)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{EPOCHS}, Loss: {total_loss/len(dataloader):.4f}")
        
    # Save Artifacts
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
        
    print("Saving model and artifacts...")
    torch.save(model.state_dict(), os.path.join(MODEL_DIR, "model.pt"))
    
    # Generate Embeddings for all movies
    model.eval()
    all_features_tensor = torch.FloatTensor(features).to(device)
    _, embeddings = model(all_features_tensor)
    embeddings_np = embeddings.cpu().detach().numpy()
    
    # Save Embeddings and Metadata
    with open(os.path.join(MODEL_DIR, "embeddings.pkl"), "wb") as f:
        pickle.dump(embeddings_np, f)
        
    # Save Preprocessors
    print("Saving preprocessors...")
    with open(os.path.join(MODEL_DIR, "tfidf.pkl"), "wb") as f:
        pickle.dump(tfidf, f)
    with open(os.path.join(MODEL_DIR, "mlb.pkl"), "wb") as f:
        pickle.dump(mlb, f)
    with open(os.path.join(MODEL_DIR, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
        
    # Save Preprocessing objects for inference on new data (if needed)
    # For this app, we mostly recommend from existing database, so we just need the IDs map
    # But let's save the dataframe index map
    df.reset_index(inplace=True)
    df.to_pickle(os.path.join(MODEL_DIR, "movies_metadata.pkl"))
    
    print("Training complete!")

if __name__ == "__main__":
    train_model()
