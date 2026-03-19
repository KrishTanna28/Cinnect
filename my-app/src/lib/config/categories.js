export const CATEGORY_COLORS = {
  general: "slate",       // General Discussion
  reviews: "blue",        // Reviews and Ratings
  plot: "indigo",         // Plot and Story
  scenes: "purple",       // Scene-Based
  characters: "pink",     // Characters
  theories: "orange",     // Fan Theory
  details: "amber",       // Hidden Details
  recommendations: "green",// Recommendations
  genres: "cyan",         // Genres
  franchises: "sky",      // Franchises
  technical: "teal",      // Technical / Filmmaking
  people: "rose",         // Actors and Directors
  industry: "red",        // Industry
  media: "yellow",        // Media Content
  fandom: "fuchsia",      // Fandom
  engagement: "lime",     // Community Engagement
  special: "zinc",        // Moderation/Special
  other: "gray"           // Custom/Other
};

export const CATEGORY_COLOR_STYLES = {
  slate: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  pink: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  green: "bg-green-500/10 text-green-500 border-green-500/20",
  cyan: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  sky: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  teal: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  red: "bg-red-500/10 text-red-500 border-red-500/20",
  yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20",
  lime: "bg-lime-500/10 text-lime-500 border-lime-500/20",
  zinc: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  gray: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export const MOVIE_CATEGORIES = [
  {
    group: "General Movie Discussion",
    color: CATEGORY_COLORS.general,
    items: [
      { id: "debates_general", label: "Debates" },
      { id: "first_impressions", label: "First Impressions" },
      { id: "general", label: "General" },
      { id: "hot_takes", label: "Hot Takes" },
      { id: "initial_reactions", label: "Initial Reactions" },
      { id: "movie_comparisons", label: "Movie Comparisons" },
      { id: "movie_opinions", label: "Movie Opinions" },
      { id: "movie_talk", label: "Movie Talk" },
      { id: "movie_vs_book", label: "Movie vs Book" },
      { id: "movie_vs_movie", label: "Movie vs Movie" },
      { id: "movie_vs_original", label: "Movie vs Original" },
      { id: "movie_vs_remake", label: "Movie vs Remake" },
      { id: "movie_vs_series", label: "Movie vs Series" },
      { id: "overrated_movies_discussion", label: "Overrated Movies Discussion" },
      { id: "prequel_discussions", label: "Prequel Discussions" },
      { id: "rewatch_discussions", label: "Rewatch Discussions" },
      { id: "sequel_discussions", label: "Sequel Discussions" },
      { id: "spin_off_discussions", label: "Spin-off Discussions" },
      { id: "standalone_movies", label: "Standalone Movies" },
      { id: "underrated_movies_discussion", label: "Underrated Movies Discussion" },
      { id: "unpopular_opinions", label: "Unpopular Opinions" }
    ]
  },
  {
    group: "Movie Reviews and Ratings",
    color: CATEGORY_COLORS.reviews,
    items: [
      { id: "audience_reactions", label: "Audience Reactions" },
      { id: "critic_vs_audience_discussion", label: "Critic vs Audience Discussion" },
      { id: "detailed_reviews", label: "Detailed Reviews" },
      { id: "first_watch_reviews", label: "First Watch Reviews" },
      { id: "movie_reviews", label: "Movie Reviews" },
      { id: "personal_rankings", label: "Personal Rankings" },
      { id: "pros_and_cons", label: "Pros and Cons" },
      { id: "quick_reviews", label: "Quick Reviews" },
      { id: "rating_discussions", label: "Rating Discussions" },
      { id: "rewatch_reviews", label: "Rewatch Reviews" },
      { id: "rotten_tomatoes_discussion", label: "Rotten Tomatoes Discussion" },
      { id: "star_ratings_discussion", label: "Star Ratings Discussion" },
      { id: "user_rating_breakdown", label: "User Rating Breakdown" },
      { id: "viewer_score_analysis", label: "Viewer Score Analysis" }
    ]
  },
  {
    group: "Plot and Story Discussion",
    color: CATEGORY_COLORS.plot,
    items: [
      { id: "alternate_ending_discussion", label: "Alternate Ending Discussion" },
      { id: "backstory_discussion", label: "Backstory Discussion" },
      { id: "confusing_scenes_discussion", label: "Confusing Scenes Discussion" },
      { id: "ending_discussion", label: "Ending Discussion" },
      { id: "movie_lore_discussion", label: "Movie Lore Discussion" },
      { id: "narrative_analysis", label: "Narrative Analysis" },
      { id: "plot_discussion", label: "Plot Discussion" },
      { id: "plot_explanation", label: "Plot Explanation" },
      { id: "plot_holes", label: "Plot Holes" },
      { id: "plot_summary", label: "Plot Summary" },
      { id: "plot_twist_discussion", label: "Plot Twist Discussion" },
      { id: "story_analysis", label: "Story Analysis" },
      { id: "story_structure_analysis", label: "Story Structure Analysis" },
      { id: "storyline_discussion", label: "Storyline Discussion" },
      { id: "timeline_explanation", label: "Timeline Explanation" }
    ]
  },
  {
    group: "Scene-Based Discussions",
    color: CATEGORY_COLORS.scenes,
    items: [
      { id: "action_scenes", label: "Action Scenes" },
      { id: "climax_scene_discussion", label: "Climax Scene Discussion" },
      { id: "deleted_scenes", label: "Deleted Scenes" },
      { id: "dialogue_scenes", label: "Dialogue Scenes" },
      { id: "emotional_scenes", label: "Emotional Scenes" },
      { id: "favorite_scenes", label: "Favorite Scenes" },
      { id: "fight_scenes", label: "Fight Scenes" },
      { id: "final_scene_discussion", label: "Final Scene Discussion" },
      { id: "funny_scenes", label: "Funny Scenes" },
      { id: "iconic_scenes", label: "Iconic Scenes" },
      { id: "opening_scene_discussion", label: "Opening Scene Discussion" },
      { id: "romantic_scenes", label: "Romantic Scenes" },
      { id: "sad_scenes", label: "Sad Scenes" },
      { id: "scene_breakdown", label: "Scene Breakdown" },
      { id: "scene_discussion", label: "Scene Discussion" },
      { id: "scary_scenes", label: "Scary Scenes" },
      { id: "suspense_scenes", label: "Suspense Scenes" },
      { id: "transformation_scenes", label: "Transformation Scenes" },
      { id: "underrated_scenes", label: "Underrated Scenes" },
      { id: "visual_symbolism_scenes", label: "Visual Symbolism Scenes" }
    ]
  },
  {
    group: "Character Discussions",
    color: CATEGORY_COLORS.characters,
    items: [
      { id: "anti_hero_discussion", label: "Anti-Hero Discussion" },
      { id: "best_characters", label: "Best Characters" },
      { id: "character_analysis", label: "Character Analysis" },
      { id: "character_arcs", label: "Character Arcs" },
      { id: "character_deaths", label: "Character Deaths" },
      { id: "character_development", label: "Character Development" },
      { id: "character_discussion", label: "Character Discussion" },
      { id: "character_introductions", label: "Character Introductions" },
      { id: "character_motivations", label: "Character Motivations" },
      { id: "character_relationships", label: "Character Relationships" },
      { id: "character_rivalries", label: "Character Rivalries" },
      { id: "hero_discussion", label: "Hero Discussion" },
      { id: "side_character_appreciation", label: "Side Character Appreciation" },
      { id: "supporting_characters", label: "Supporting Characters" },
      { id: "villain_discussion", label: "Villain Discussion" },
      { id: "worst_characters", label: "Worst Characters" }
    ]
  },
  {
    group: "Fan Theory and Interpretation",
    color: CATEGORY_COLORS.theories,
    items: [
      { id: "alternate_interpretations", label: "Alternate Interpretations" },
      { id: "conspiracy_theories_in_movies", label: "Conspiracy Theories in Movies" },
      { id: "fan_theories", label: "Fan Theories" },
      { id: "hidden_meanings", label: "Hidden Meanings" },
      { id: "movie_interpretations", label: "Movie Interpretations" },
      { id: "speculation_posts", label: "Speculation Posts" },
      { id: "symbolism_in_movies", label: "Symbolism in Movies" },
      { id: "theory_debates", label: "Theory Debates" },
      { id: "unanswered_questions", label: "Unanswered Questions" }
    ]
  },
  {
    group: "Hidden Details and Easter Eggs",
    color: CATEGORY_COLORS.details,
    items: [
      { id: "background_details", label: "Background Details" },
      { id: "callbacks", label: "Callbacks" },
      { id: "continuity_errors", label: "Continuity Errors" },
      { id: "easter_eggs", label: "Easter Eggs" },
      { id: "foreshadowing_discussions", label: "Foreshadowing Discussions" },
      { id: "hidden_details", label: "Hidden Details" },
      { id: "mistakes_in_movies", label: "Mistakes in Movies" },
      { id: "production_mistakes", label: "Production Mistakes" },
      { id: "references_to_other_movies", label: "References to Other Movies" }
    ]
  },
  {
    group: "Movie Recommendations",
    color: CATEGORY_COLORS.recommendations,
    items: [
      { id: "beginner_movie_lists", label: "Beginner Movie Lists" },
      { id: "best_movies_by_actor", label: "Best Movies by Actor" },
      { id: "best_movies_by_decade", label: "Best Movies by Decade" },
      { id: "best_movies_by_director", label: "Best Movies by Director" },
      { id: "best_movies_by_genre", label: "Best Movies by Genre" },
      { id: "best_movies_of_all_time", label: "Best Movies of All Time" },
      { id: "comfort_movies", label: "Comfort Movies" },
      { id: "hidden_gems", label: "Hidden Gems" },
      { id: "movie_recommendations", label: "Movie Recommendations" },
      { id: "movies_for_a_specific_mood", label: "Movies for a Specific Mood" },
      { id: "movies_similar_to_another_movie", label: "Movies Similar To Another Movie" },
      { id: "underrated_movies", label: "Underrated Movies" },
      { id: "weekend_movie_picks", label: "Weekend Movie Picks" },
      { id: "what_should_i_watch", label: "What Should I Watch" }
    ]
  },
  {
    group: "Genre Discussions",
    color: CATEGORY_COLORS.genres,
    items: [
      { id: "action_movies", label: "Action Movies" },
      { id: "adventure_movies", label: "Adventure Movies" },
      { id: "animation_movies", label: "Animation Movies" },
      { id: "anime_movies", label: "Anime Movies" },
      { id: "biographical_movies", label: "Biographical Movies" },
      { id: "comedy_movies", label: "Comedy Movies" },
      { id: "crime_movies", label: "Crime Movies" },
      { id: "cyberpunk_movies", label: "Cyberpunk Movies" },
      { id: "dark_comedy", label: "Dark Comedy" },
      { id: "documentaries", label: "Documentaries" },
      { id: "drama_movies", label: "Drama Movies" },
      { id: "family_movies", label: "Family Movies" },
      { id: "fantasy_movies", label: "Fantasy Movies" },
      { id: "historical_movies", label: "Historical Movies" },
      { id: "horror_movies", label: "Horror Movies" },
      { id: "musicals", label: "Musicals" },
      { id: "mystery_movies", label: "Mystery Movies" },
      { id: "noir_movies", label: "Noir Movies" },
      { id: "psychological_horror", label: "Psychological Horror" },
      { id: "psychological_thriller", label: "Psychological Thriller" },
      { id: "romance_movies", label: "Romance Movies" },
      { id: "sci_fi_movies", label: "Sci-Fi Movies" },
      { id: "space_movies", label: "Space Movies" },
      { id: "superhero_movies", label: "Superhero Movies" },
      { id: "teen_movies", label: "Teen Movies" },
      { id: "thriller_movies", label: "Thriller Movies" },
      { id: "war_movies", label: "War Movies" },
      { id: "western_movies", label: "Western Movies" }
    ]
  },
  {
    group: "Franchise and Cinematic Universe Discussions",
    color: CATEGORY_COLORS.franchises,
    items: [
      { id: "avatar_universe", label: "Avatar Universe" },
      { id: "batman_universe", label: "Batman Universe" },
      { id: "dc_universe", label: "DC Universe" },
      { id: "fast_and_furious", label: "Fast and Furious" },
      { id: "harry_potter", label: "Harry Potter" },
      { id: "james_bond", label: "James Bond" },
      { id: "jurassic_park_world", label: "Jurassic Park / Jurassic World" },
      { id: "lord_of_the_rings", label: "Lord of the Rings" },
      { id: "marvel_cinematic_universe", label: "Marvel Cinematic Universe" },
      { id: "mission_impossible", label: "Mission Impossible" },
      { id: "spider_man_universe", label: "Spider-Man Universe" },
      { id: "star_wars", label: "Star Wars" },
      { id: "transformers", label: "Transformers" },
      { id: "x_men_universe", label: "X-Men Universe" }
    ]
  },
  {
    group: "Filmmaking and Technical Discussions",
    color: CATEGORY_COLORS.technical,
    items: [
      { id: "acting", label: "Acting" },
      { id: "aspect_ratio_discussions", label: "Aspect Ratio Discussions" },
      { id: "background_score", label: "Background Score" },
      { id: "camera_angles", label: "Camera Angles" },
      { id: "camera_movement", label: "Camera Movement" },
      { id: "casting_choices", label: "Casting Choices" },
      { id: "casting_rumors", label: "Casting Rumors" },
      { id: "cinematography", label: "Cinematography" },
      { id: "color_grading", label: "Color Grading" },
      { id: "costume_design", label: "Costume Design" },
      { id: "directing", label: "Directing" },
      { id: "film_editing", label: "Film Editing" },
      { id: "lighting_techniques", label: "Lighting Techniques" },
      { id: "makeup_and_prosthetics", label: "Makeup and Prosthetics" },
      { id: "practical_effects", label: "Practical Effects" },
      { id: "production_design", label: "Production Design" },
      { id: "screenwriting", label: "Screenwriting" },
      { id: "set_design", label: "Set Design" },
      { id: "shot_composition", label: "Shot Composition" },
      { id: "sound_design", label: "Sound Design" },
      { id: "sound_mixing", label: "Sound Mixing" },
      { id: "soundtracks", label: "Soundtracks" },
      { id: "visual_effects_vfx", label: "Visual Effects (VFX)" }
    ]
  },
  {
    group: "Actor and Director Discussions",
    color: CATEGORY_COLORS.people,
    items: [
      { id: "actor_discussions", label: "Actor Discussions" },
      { id: "best_performances", label: "Best performances" },
      { id: "casting_discussions", label: "Casting Discussions" },
      { id: "director_discussions", label: "Director Discussions" },
      { id: "director_filmography", label: "Director Filmography" },
      { id: "dream_cast_discussions", label: "Dream Cast Discussions" },
      { id: "favorite_directors", label: "Favorite Directors" },
      { id: "legendary_directors", label: "Legendary Directors" },
      { id: "method_acting", label: "Method Acting" },
      { id: "overrated_performances", label: "Overrated Performances" },
      { id: "rising_directors", label: "Rising Directors" },
      { id: "underrated_directors", label: "Underrated Directors" },
      { id: "underrated_performances", label: "Underrated Performances" }
    ]
  },
  {
    group: "Movie Industry Discussions",
    color: CATEGORY_COLORS.industry,
    items: [
      { id: "awards_discussions", label: "Awards Discussions" },
      { id: "box_office_analysis", label: "Box Office Analysis" },
      { id: "box_office_performance", label: "Box Office Performance" },
      { id: "box_office_predictions", label: "Box Office Predictions" },
      { id: "casting_announcements", label: "Casting Announcements" },
      { id: "film_festivals", label: "Film Festivals" },
      { id: "industry_news", label: "Industry News" },
      { id: "industry_trends", label: "Industry Trends" },
      { id: "ott_releases", label: "OTT Releases" },
      { id: "production_updates", label: "Production Updates" },
      { id: "streaming_releases", label: "Streaming Releases" },
      { id: "teaser_discussions", label: "Teaser Discussions" },
      { id: "trailer_discussions", label: "Trailer Discussions" },
      { id: "upcoming_movies", label: "Upcoming Movies" }
    ]
  },
  {
    group: "Media Content Types",
    color: CATEGORY_COLORS.media,
    items: [
      { id: "behind_the_scenes_photos", label: "Behind the Scenes Photos" },
      { id: "behind_the_scenes_videos", label: "Behind the Scenes Videos" },
      { id: "dialogue_clips", label: "Dialogue Clips" },
      { id: "fan_edits_media", label: "Fan Edits" },
      { id: "gifs", label: "GIFs" },
      { id: "interview_clips", label: "Interview Clips" },
      { id: "memes", label: "Memes" },
      { id: "movie_clips", label: "Movie Clips" },
      { id: "movie_posters", label: "Movie Posters" },
      { id: "movie_scenes", label: "Movie Scenes" },
      { id: "screenshots", label: "Screenshots" },
      { id: "soundtrack_clips", label: "Soundtrack Clips" },
      { id: "teaser_clips", label: "Teaser Clips" },
      { id: "trailer_clips", label: "Trailer Clips" },
      { id: "video_edits", label: "Video Edits" }
    ]
  },
  {
    group: "Fandom and Community Content",
    color: CATEGORY_COLORS.fandom,
    items: [
      { id: "cosplay", label: "Cosplay" },
      { id: "fan_art", label: "Fan Art" },
      { id: "fan_casting", label: "Fan Casting" },
      { id: "fan_edits_fandom", label: "Fan Edits" },
      { id: "fan_made_trailers", label: "Fan Made Trailers" },
      { id: "fan_posters", label: "Fan Posters" },
      { id: "fan_theories_fandom", label: "Fan Theories" },
      { id: "tribute_videos", label: "Tribute Videos" }
    ]
  },
  {
    group: "Community Engagement",
    color: CATEGORY_COLORS.engagement,
    items: [
      { id: "community_challenges", label: "Community Challenges" },
      { id: "debates_engagement", label: "Debates" },
      { id: "guess_the_movie", label: "Guess the Movie" },
      { id: "movie_quizzes", label: "Movie Quizzes" },
      { id: "movie_trivia", label: "Movie Trivia" },
      { id: "polls", label: "Polls" },
      { id: "ranking_posts", label: "Ranking Posts" },
      { id: "top_10_lists", label: "Top 10 Lists" },
      { id: "watch_party_discussions", label: "Watch Party Discussions" },
      { id: "weekly_movie_discussion", label: "Weekly Movie Discussion" }
    ]
  },
  {
    group: "Custom",
    color: CATEGORY_COLORS.other,
    items: [
      { id: "other", label: "Other" }
    ]
  }
];

export const FLAT_CATEGORIES = MOVIE_CATEGORIES.flatMap(group => 
  group.items.map(item => ({ ...item, group: group.group, color: group.color }))
);

export const MODERATION_TAGS = [
  { id: "adult_content", label: "Adult Content", flag: "adult_content" },
  { id: "disturbing_content", label: "Disturbing Content", flag: "sensitive" },
  { id: "graphic_scenes", label: "Graphic Scenes", flag: "sensitive" },
  { id: "sensitive_scenes", label: "Sensitive Scenes", flag: "sensitive" },
  { id: "spoiler_content", label: "Spoiler Content", flag: "spoiler" },
  { id: "violence", label: "Violence", flag: "sensitive" }
];
