export interface Movie {
  id: string;
  title: string;
  year: number;
  posterUrl: string;
  director: string;
  producers: string[];
  cast: string[];
  runtime: number;
  genre: string[];
  rating: number;
  views: string;
  likes: string;
  synopsis: string;
}

export const movies: Movie[] = [
  {
    id: "1",
    title: "Dune: Part Two",
    year: 2024,
    posterUrl: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    director: "Denis Villeneuve",
    producers: ["Mary Parent", "Cale Boyter", "Denis Villeneuve"],
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Josh Brolin"],
    runtime: 166,
    genre: ["Science Fiction", "Adventure"],
    rating: 4.2,
    views: "1.2M",
    likes: "434K",
    synopsis: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family."
  },
  {
    id: "2",
    title: "Oppenheimer",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    director: "Christopher Nolan",
    producers: ["Emma Thomas", "Charles Roven", "Christopher Nolan"],
    cast: ["Cillian Murphy", "Emily Blunt", "Robert Downey Jr.", "Matt Damon"],
    runtime: 180,
    genre: ["Drama", "History"],
    rating: 4.4,
    views: "2.1M",
    likes: "612K",
    synopsis: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb."
  },
  {
    id: "3",
    title: "Poor Things",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
    director: "Yorgos Lanthimos",
    producers: ["Ed Guiney", "Andrew Lowe", "Yorgos Lanthimos"],
    cast: ["Emma Stone", "Mark Ruffalo", "Willem Dafoe", "Ramy Youssef"],
    runtime: 141,
    genre: ["Comedy", "Romance", "Science Fiction"],
    rating: 4.0,
    views: "890K",
    likes: "298K",
    synopsis: "The incredible tale of Bella Baxter, a young woman brought back to life by the brilliant and unorthodox scientist Dr. Godwin Baxter."
  },
  {
    id: "4",
    title: "The Holdovers",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/VHSzNBTwxV8vh7wylo7O9CLdac.jpg",
    director: "Alexander Payne",
    producers: ["Mark Johnson", "Bill Block", "David Hemingson"],
    cast: ["Paul Giamatti", "Da'Vine Joy Randolph", "Dominic Sessa"],
    runtime: 133,
    genre: ["Comedy", "Drama"],
    rating: 4.1,
    views: "567K",
    likes: "187K",
    synopsis: "A cranky history teacher at a remote prep school is forced to remain on campus during Christmas break to babysit a handful of students."
  },
  {
    id: "5",
    title: "Killers of the Flower Moon",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/dB6Krk806zeqd0YNp2ngQ9zXteH.jpg",
    director: "Martin Scorsese",
    producers: ["Dan Friedkin", "Bradley Thomas", "Martin Scorsese"],
    cast: ["Leonardo DiCaprio", "Robert De Niro", "Lily Gladstone", "Jesse Plemons"],
    runtime: 206,
    genre: ["Crime", "Drama", "History"],
    rating: 4.2,
    views: "1.5M",
    likes: "389K",
    synopsis: "Members of the Osage tribe in the United States are murdered under mysterious circumstances in the 1920s, sparking a major FBI investigation."
  },
  {
    id: "6",
    title: "Past Lives",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
    director: "Celine Song",
    producers: ["David Hinojosa", "Christine Vachon", "Pamela Koffler"],
    cast: ["Greta Lee", "Teo Yoo", "John Magaro"],
    runtime: 106,
    genre: ["Drama", "Romance"],
    rating: 4.3,
    views: "723K",
    likes: "312K",
    synopsis: "Two childhood friends are separated when one family emigrates from South Korea. Twenty years later, they are reunited in New York."
  },
  {
    id: "7",
    title: "Anatomy of a Fall",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/kQs6keheMwCxJxrzV83VUwFtHkB.jpg",
    director: "Justine Triet",
    producers: ["Marie-Ange Luciani", "David Thion"],
    cast: ["Sandra Hüller", "Swann Arlaud", "Milo Machado-Graner"],
    runtime: 152,
    genre: ["Drama", "Thriller"],
    rating: 4.1,
    views: "456K",
    likes: "178K",
    synopsis: "A woman is suspected of her husband's murder, and their blind son faces a moral dilemma as the sole witness."
  },
  {
    id: "8",
    title: "The Zone of Interest",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/hUu9zyZmDd8VZegKi1iK1Vk0RYS.jpg",
    director: "Jonathan Glazer",
    producers: ["James Wilson", "Ewa Puszczyńska"],
    cast: ["Christian Friedel", "Sandra Hüller", "Johann Karthaus"],
    runtime: 105,
    genre: ["Drama", "History", "War"],
    rating: 4.0,
    views: "389K",
    likes: "145K",
    synopsis: "The commandant of Auschwitz and his wife strive to build a dream life for their family in a house and garden next to the camp."
  },
  {
    id: "9",
    title: "Barbie",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
    director: "Greta Gerwig",
    producers: ["David Heyman", "Margot Robbie", "Tom Ackerley"],
    cast: ["Margot Robbie", "Ryan Gosling", "America Ferrera", "Kate McKinnon"],
    runtime: 114,
    genre: ["Comedy", "Adventure", "Fantasy"],
    rating: 3.8,
    views: "3.2M",
    likes: "892K",
    synopsis: "Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land."
  },
  {
    id: "10",
    title: "All of Us Strangers",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/pjQ3uGhACGd0Ck7WvOm5zpTrSbz.jpg",
    director: "Andrew Haigh",
    producers: ["Graham Broadbent", "Pete Czernin", "Sarah Harvey"],
    cast: ["Andrew Scott", "Paul Mescal", "Jamie Bell", "Claire Foy"],
    runtime: 105,
    genre: ["Drama", "Fantasy", "Romance"],
    rating: 4.2,
    views: "412K",
    likes: "198K",
    synopsis: "A screenwriter visits his childhood home, where he finds his parents alive, exactly as they were on the day they died 30 years before."
  },
  {
    id: "11",
    title: "The Boy and the Heron",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/nmnkJhEfUwU0OOr5zIdLwNbH5mp.jpg",
    director: "Hayao Miyazaki",
    producers: ["Toshio Suzuki"],
    cast: ["Soma Santoki", "Masaki Suda", "Takuya Kimura"],
    runtime: 124,
    genre: ["Animation", "Adventure", "Drama"],
    rating: 4.1,
    views: "678K",
    likes: "267K",
    synopsis: "A young boy named Mahito yearning for his mother ventures into a world shared by the living and the dead."
  },
  {
    id: "12",
    title: "Saltburn",
    year: 2023,
    posterUrl: "https://image.tmdb.org/t/p/w500/qjhahNLSZ705B5JP92YMEYPocPz.jpg",
    director: "Emerald Fennell",
    producers: ["Emerald Fennell", "Josey McNamara", "Tom Ackerley"],
    cast: ["Barry Keoghan", "Jacob Elordi", "Rosamund Pike", "Richard E. Grant"],
    runtime: 131,
    genre: ["Drama", "Thriller"],
    rating: 3.6,
    views: "1.8M",
    likes: "423K",
    synopsis: "A student at Oxford University finds himself drawn into the world of a charismatic and aristocratic classmate."
  }
];

export function getMovieById(id: string): Movie | undefined {
  return movies.find(movie => movie.id === id);
}

export function searchMovies(query: string): Movie[] {
  const lowerQuery = query.toLowerCase();
  return movies.filter(movie => 
    movie.title.toLowerCase().includes(lowerQuery) ||
    movie.director.toLowerCase().includes(lowerQuery) ||
    movie.genre.some(g => g.toLowerCase().includes(lowerQuery))
  );
}
