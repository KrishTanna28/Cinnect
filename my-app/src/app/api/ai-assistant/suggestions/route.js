import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import * as tmdbService from "@/lib/services/tmdb.service";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function GET() {
  try {
    // Fetch some trending data to give context to Gemini
    let trendingContext = "";
    try {
      const [trendingMovies, trendingTV] = await Promise.all([
        tmdbService.getTrending("movie", "day").catch(() => []),
        tmdbService.getTrending("tv", "day").catch(() => []),
      ]);
      
      if (trendingMovies?.length > 0) {
        trendingContext += `Today's trending movies: ${trendingMovies.slice(0, 3).map(m => m.title).join(", ")}. `;
      }
      if (trendingTV?.length > 0) {
        trendingContext += `Today's trending TV shows: ${trendingTV.slice(0, 3).map(t => t.title).join(", ")}. `;
      }
    } catch (error) {
      console.error("Error fetching trending for suggestions:", error);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are C.A.S.T (Cinematic Assistant for Smart Tastes), an AI assistant for Cinnect - a movie and TV show discovery platform. 
    
${trendingContext}

Generate exactly 4 short, engaging conversation starter questions that a user might want to ask about movies, TV shows, actors, or entertainment. 

Requirements:
- Each question should be 3-7 words
- Make them varied (mix of trending, recommendations, specific topics, fun questions)
- Make them feel fresh and relevant to today's entertainment landscape
- Don't use generic questions like "What should I watch?"
- Be specific and interesting

Return ONLY a JSON array of 4 strings, nothing else. Example format:
["Question 1?", "Question 2?", "Question 3?", "Question 4?"]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
    const suggestions = JSON.parse(cleanedText);

    // Validate we got an array of strings
    if (!Array.isArray(suggestions) || suggestions.length !== 4) {
      throw new Error("Invalid suggestions format");
    }

    return NextResponse.json({
      suggestions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    // Return fallback suggestions if AI fails
    return NextResponse.json({
      suggestions: [
        "What's trending this week?",
        "Recommend a thriller movie",
        "Any good new TV shows?",
        "Top rated films of 2025",
      ],
      generatedAt: new Date().toISOString(),
      fallback: true,
    });
  }
}
