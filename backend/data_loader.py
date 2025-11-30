import pandas as pd
import requests
import io
import os

# Configuration
DATA_DIR = "backend/data"
OUTPUT_FILE = os.path.join(DATA_DIR, "movies.csv")

# GitHub Raw URLs from Simatwa/movies-dataset
URLS = {
    "Action": "https://raw.githubusercontent.com/Simatwa/movies-dataset/main/data/action.csv",
    "Comedy": "https://raw.githubusercontent.com/Simatwa/movies-dataset/main/data/comedy.csv",
    "Drama": "https://raw.githubusercontent.com/Simatwa/movies-dataset/main/data/drama.csv",
    "Horror": "https://raw.githubusercontent.com/Simatwa/movies-dataset/main/data/horror.csv",
    "Sci-Fi": "https://raw.githubusercontent.com/Simatwa/movies-dataset/main/data/sci-fi.csv",
    "Romance": "https://raw.githubusercontent.com/Simatwa/movies-dataset/main/data/romance.csv"
}

# Augmentation Data: South Indian & Recent 2024/2025 Movies
# Structure: title, year, genre, overview, industry
AUGMENTED_DATA = [
    # South Indian (Telugu, Tamil, Kannada, Malayalam) - Mix of Classics and Recent
    {"title": "Baahubali: The Beginning", "year": 2015, "genre": "Action, Drama", "overview": "In ancient India, an adventurous and daring man becomes involved in a decades-old feud between two warring people.", "industry": "Tollywood"},
    {"title": "Baahubali 2: The Conclusion", "year": 2017, "genre": "Action, Drama", "overview": "When Shiva, the son of Bahubali, learns about his heritage, he begins to look for answers. His story is juxtaposed with past events that unfolded in the Mahishmati Kingdom.", "industry": "Tollywood"},
    {"title": "RRR", "year": 2022, "genre": "Action, Drama", "overview": "A fictitious story about two legendary revolutionaries and their journey away from home before they started fighting for their country in 1920s.", "industry": "Tollywood"},
    {"title": "Kantara", "year": 2022, "genre": "Action, Thriller", "overview": "When greed paves the way for betrayal, scheming and murder, a young tribal reluctantly dons the traditions of his ancestors to seek justice.", "industry": "Sandalwood"},
    {"title": "K.G.F: Chapter 1", "year": 2018, "genre": "Action, Crime", "overview": "In the 1970s, a gangster goes undercover as a slave to assassinate the owner of a notorious gold mine.", "industry": "Sandalwood"},
    {"title": "K.G.F: Chapter 2", "year": 2022, "genre": "Action, Crime", "overview": "In the blood-soaked Kolar Gold Fields, Rocky's name strikes fear into his foes. His allies look up to him, the government sees him as a threat to law and order.", "industry": "Sandalwood"},
    {"title": "Vikram", "year": 2022, "genre": "Action, Thriller", "overview": "A special investigator discovers a case of serial killings is not what it seems to be, and leading down this path is only going to end in a war between everyone involved.", "industry": "Kollywood"},
    {"title": "Ponniyin Selvan: I", "year": 2022, "genre": "Action, Drama, History", "overview": "Vandiyathevan sets out to cross the Chola land to deliver a message from the Crown Prince Aditha Karikalan. Kundavai attempts to establish political peace.", "industry": "Kollywood"},
    {"title": "Leo", "year": 2023, "genre": "Action, Thriller", "overview": "Parthiban is a mild-mannered cafe owner in Kashmir, who fends off a gang of murderous thugs and gains attention from a drug cartel claiming he was once a part of them.", "industry": "Kollywood"},
    {"title": "Jailer", "year": 2023, "genre": "Action, Comedy, Crime", "overview": "A retired jailer goes on a manhunt to find his son's killers. But the road leads him to a familiar, albeit a bit darker place.", "industry": "Kollywood"},
    {"title": "Salaar: Part 1 - Ceasefire", "year": 2023, "genre": "Action, Thriller", "overview": "A gang leader tries to keep a promise made to his dying friend and takes on the other criminal gangs.", "industry": "Tollywood"},
    {"title": "Pushpa: The Rise", "year": 2021, "genre": "Action, Crime, Drama", "overview": "A labourer rises through the ranks of a red sandal smuggling syndicate, making some powerful enemies in the process.", "industry": "Tollywood"},
    {"title": "Drishyam", "year": 2013, "genre": "Crime, Drama, Thriller", "overview": "A man goes to extreme lengths to save his family from punishment after the family commits an accidental crime.", "industry": "Mollywood"},
    {"title": "Manjummel Boys", "year": 2024, "genre": "Adventure, Drama, Thriller", "overview": "A group of friends get into a daring rescue mission to save their friend from Guna Caves, a perilously deep pit from where nobody has ever been brought back.", "industry": "Mollywood"},
    
    # Bollywood (Recent & Classics)
    {"title": "Jawan", "year": 2023, "genre": "Action, Thriller", "overview": "A high-octane action thriller which outlines the emotional journey of a man who is set to rectify the wrongs in the society.", "industry": "Bollywood"},
    {"title": "Pathaan", "year": 2023, "genre": "Action, Thriller", "overview": "An Indian agent races against a doomsday clock as a ruthless mercenary, with a bitter vendetta, mounts an apocalyptic attack against the country.", "industry": "Bollywood"},
    {"title": "Animal", "year": 2023, "genre": "Action, Crime, Drama", "overview": "A son undergoes a remarkable transformation as the bond with his father begins to fracture, and he becomes consumed by a quest for vengeance.", "industry": "Bollywood"},
    {"title": "Dangal", "year": 2016, "genre": "Action, Biography, Drama", "overview": "Former wrestler Mahavir Singh Phogat and his two wrestler daughters struggle towards glory at the Commonwealth Games in the face of societal oppression.", "industry": "Bollywood"},
    {"title": "3 Idiots", "year": 2009, "genre": "Comedy, Drama", "overview": "Two friends are searching for their long lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently.", "industry": "Bollywood"},
    {"title": "Sholay", "year": 1975, "genre": "Action, Adventure, Comedy", "overview": "After his family is murdered by a notorious and ruthless bandit, a former police officer enlists the services of two outlaws to capture him.", "industry": "Bollywood"},
    {"title": "Dilwale Dulhania Le Jayenge", "year": 1995, "genre": "Drama, Romance", "overview": "When Raj meets Simran in Europe, it isn't love at first sight but when Simran moves to India for an arranged marriage, love makes its presence felt.", "industry": "Bollywood"},

    # 2024/2025 Anticipated/Released (Global)
    {"title": "Dune: Part Two", "year": 2024, "genre": "Action, Adventure, Sci-Fi", "overview": "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.", "industry": "Hollywood"},
    {"title": "Deadpool & Wolverine", "year": 2024, "genre": "Action, Comedy, Sci-Fi", "overview": "Wolverine is recovering from his injuries when he crosses paths with the loudmouth, Deadpool. They team up to defeat a common enemy.", "industry": "Hollywood"},
    {"title": "Furiosa: A Mad Max Saga", "year": 2024, "genre": "Action, Adventure, Sci-Fi", "overview": "The origin story of renegade warrior Furiosa before her encounter and teamup with Mad Max.", "industry": "Hollywood"},
    {"title": "Kalki 2898 AD", "year": 2024, "genre": "Action, Sci-Fi, Drama", "overview": "A modern-day avatar of Vishnu, a Hindu god, who is believed to have descended to earth to protect the world from evil forces.", "industry": "Tollywood"},
    {"title": "Pushpa 2: The Rule", "year": 2024, "genre": "Action, Crime, Drama", "overview": "The clash continues as Pushpa Raj and Bhanwar Singh Shekhawat lock horns in this intense sequel.", "industry": "Tollywood"},
    {"title": "Fighter", "year": 2024, "genre": "Action, Thriller", "overview": "Top IAF aviators come together in the face of imminent danger, to form Air Dragons. Fighter unfolds their camaraderie, brotherhood and battles, internal and external.", "industry": "Bollywood"},
    {"title": "Superman: Legacy", "year": 2025, "genre": "Action, Adventure, Sci-Fi", "overview": "Follows Superman as he reconciles his heritage with his human upbringing. He is the embodiment of truth, justice and the American way in a world that views kindness as old-fashioned.", "industry": "Hollywood"},
    {"title": "The Batman Part II", "year": 2025, "genre": "Action, Crime, Drama", "overview": "A sequel to The Batman (2022).", "industry": "Hollywood"},
    {"title": "Avatar 3", "year": 2025, "genre": "Action, Adventure, Fantasy", "overview": "The third installment in the Avatar franchise.", "industry": "Hollywood"}
]

def download_and_merge():
    all_movies = []
    
    print("Downloading datasets...")
    for genre, url in URLS.items():
        try:
            print(f"Fetching {genre}...")
            # These CSVs usually have columns like: index, movie_name, year, rating, runtime, genre, sid, description
            df = pd.read_csv(url)
            
            # Standardize columns
            # The Simatwa dataset columns might vary, let's inspect or assume common ones based on repo
            # Usually: movie_name, year, genre, description
            
            # Let's rename to standard keys
            # Note: We might need to adjust this after seeing the actual CSV structure if it fails.
            # But based on typical structure:
            if 'movie_name' in df.columns:
                df = df.rename(columns={'movie_name': 'title', 'description': 'overview'})
            
            # Add industry tag (Default to Hollywood for these English datasets, though they might contain others)
            df['industry'] = 'Hollywood' 
            
            # Select only relevant columns
            cols = ['title', 'year', 'genre', 'overview', 'industry']
            # Filter for existing cols only
            existing_cols = [c for c in cols if c in df.columns]
            df = df[existing_cols]
            
            all_movies.append(df)
            
        except Exception as e:
            print(f"Error downloading {genre}: {e}")

    if not all_movies:
        print("Failed to download any data. Creating empty base.")
        base_df = pd.DataFrame(columns=['title', 'year', 'genre', 'overview', 'industry'])
    else:
        base_df = pd.concat(all_movies, ignore_index=True)

    print(f"Downloaded {len(base_df)} movies.")

    # Augment with South Indian & Recent
    print("Augmenting data...")
    aug_df = pd.DataFrame(AUGMENTED_DATA)
    
    # Combine
    final_df = pd.concat([base_df, aug_df], ignore_index=True)
    
    # Cleaning
    print("Cleaning data...")
    # Drop duplicates by title
    final_df = final_df.drop_duplicates(subset=['title'], keep='last')
    # Fill NA
    final_df['overview'] = final_df['overview'].fillna('')
    final_df['genre'] = final_df['genre'].fillna('Unknown')
    final_df['year'] = final_df['year'].astype(str).str.extract(r'(\d{4})').fillna('2000')
    
    # Save
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    final_df.to_csv(OUTPUT_FILE, index=False)
    print(f"Saved {len(final_df)} movies to {OUTPUT_FILE}")
    print("Sample:")
    print(final_df.tail())

if __name__ == "__main__":
    download_and_merge()
