import sys
import json
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

try:
    from imdbinfo.services import search_title, get_movie
except ImportError:
    fallback_val = sys.argv[4] if len(sys.argv) > 4 else "7.5"
    print(json.dumps({"error": "imdbinfo library not installed", "rating": fallback_val, "fallback": True}))
    sys.exit(0)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing title argument", "rating": "7.5", "fallback": True}))
        return

    title = sys.argv[1]
    year = None
    if len(sys.argv) > 2 and sys.argv[2] and sys.argv[2] != "null" and sys.argv[2] != "undefined":
        try:
            year = int(sys.argv[2])
        except ValueError:
            pass
            
    media_type = sys.argv[3] if len(sys.argv) > 3 else "movie"
    fallback_rating = sys.argv[4] if len(sys.argv) > 4 else "7.5"

    try:
        # 1. Search for title using imdbinfo
        res = search_title(title)
        if not res or not res.titles:
            print(json.dumps({"rating": fallback_rating, "info": "No results found, returned fallback", "fallback": True}))
            return
            
        matched_movie = None
        
        # 2. Try to find matching result by year & type
        for item in res.titles:
            item_year = item.year
            
            year_match = True
            if year and item_year:
                year_match = abs(item_year - year) <= 1
                
            if year_match:
                matched_movie = item
                break
                
        if not matched_movie:
            matched_movie = res.titles[0]
            
        # 3. Fetch detailed movie info using get_movie()
        imdb_id = matched_movie.imdb_id
        full_id = imdb_id if imdb_id.startswith("tt") else f"tt{imdb_id}"
        
        m = get_movie(full_id)
        rating = m.rating if m else None
        
        if rating is not None:
            print(json.dumps({
                "rating": str(rating),
                "imdbID": full_id,
                "title": m.title if hasattr(m, 'title') else None,
                "year": m.year if hasattr(m, 'year') else None
            }))
        else:
            print(json.dumps({
                "rating": fallback_rating,
                "info": "imdbinfo found movie but no rating, returned fallback",
                "fallback": True
            }))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "rating": fallback_rating,
            "fallback": True
        }))

if __name__ == "__main__":
    main()
