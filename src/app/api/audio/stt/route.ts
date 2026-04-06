import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { audioContent } = await req.json();

    if (!audioContent) {
      return NextResponse.json(
        { error: "Audio content is required" },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GOOGLE_TTS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY ||
      "AIzaSyBTwWnhGxShFSIrX9z0kHa8vmGc5AGG9Ds";

    // Google Cloud Speech API request
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS", // Browser MediaRecorder standard
            sampleRateHertz: 48000,
            languageCode: "en-US",
          },
          audio: {
            content: audioContent,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google STT API Error:", errorText);
      return NextResponse.json(
        { error: `Google STT API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript =
      data.results
        ?.map((r: any) => r.alternatives?.[0]?.transcript)
        ?.join("\\n") || "";

    return NextResponse.json({ transcript });
  } catch (error: any) {
    console.error("Error in STT API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
