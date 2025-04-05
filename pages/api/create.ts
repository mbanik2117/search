// pages/api/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { search, SafeSearchType } from "duck-duck-scrape";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper function to fetch HTML and extract text using Cheerio and Regex
async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch ${url}: ${res.statusText}`);
      return "";
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements that contain non-content text
    $("script, style, noscript").remove();

    // Get the text content from the body element
    let text = $("body").text();

    // Use regex to remove any inline CSS patterns that may remain
    // This regex attempts to remove CSS-like patterns between braces.
    text = text.replace(/\{[^}]*\}/g, " ");

    // Clean up extra whitespace and newlines
    text = text.replace(/\s+/g, " ").trim();
    return text;
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    return "";
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: "Query is missing." });
      return;
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      res.status(500).json({ error: "Gemini API key is not configured." });
      return;
    }

    // Perform a DuckDuckGo safe search using ddgs API
    const searchResults = await search(query, {
      safeSearch: SafeSearchType.STRICT,
    });

    let combinedText = "";
    const maxWords = 10000;

    // Iterate over each search result and fetch page text
    for (const result of searchResults.results) {
      if (!result.url) continue;
      const pageText = await fetchPageText(result.url);
      combinedText += " " + pageText;

      // Check word count and trim if necessary
      const words = combinedText.trim().split(/\s+/);
      if (words.length >= maxWords) {
        combinedText = words.slice(0, maxWords).join(" ");
        break;
      }
    }
    console.log(combinedText);

    // Build the prompt with an instruction not to reference the source/context.
    const prompt = `Context: ${combinedText}\n\nQuestion: ${query}\n\nPlease generate a comprehensive answer without mentioning the provided context or its source.`;

    // Initialize Gemini via the GoogleGenerativeAI package
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const resultStream = await model.generateContentStream(prompt);

    // Collect the stream output into a single string
    let resultText = "";
    for await (const chunk of resultStream.stream) {
      resultText += chunk.text();
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "no-cache");
    res.status(200).send(resultText);
  } catch (error) {
    console.error("Failed to fetch answer:", error);
    res.status(500).json({ error: "Failed to fetch answer." });
  }
}