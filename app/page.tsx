"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseText(""); // Clear previous response
    setError(null); // Clear previous error
    setLoading(true);

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        // Try to read error message from API if possible
        let errorMsg = `Network response was not ok (Status: ${res.status})`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) {
          console.error("Could not parse error JSON:", jsonError);
        }
        throw new Error(errorMsg);
      }

      if (!res.body) {
        throw new Error("ReadableStream not yet supported in this browser.");
      }

      // Process the streaming response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setResponseText((prev) => prev + chunk);
        }
      }
    } catch (err) {
      console.error("Error fetching response:", err);
      setResponseText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Web Search & Ask
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Textarea
            placeholder="Ask anything... The AI will search the web for context."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
            rows={4}
            disabled={loading}
          />
          <Button
            type="submit"
            className="self-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !query.trim()}
          >
            {loading ? "Searching & Thinking..." : "Submit"}
          </Button>
        </form>

        {loading && (
          <div className="mt-6 text-center flex justify-center items-center gap-2 text-gray-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span>Loading response...</span>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p>{error}</p>
          </div>
        )}

        {responseText && !error && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-2xl font-semibold mb-3 text-gray-700">
              Response
            </h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-[400px] overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-800">
                {responseText}
              </pre>
            </div>
          </div>
        )}
      </div>
      <footer className="text-center mt-8 text-gray-500 text-xs">
        Powered by Noether Technologies
      </footer>
    </div>
  );
}
