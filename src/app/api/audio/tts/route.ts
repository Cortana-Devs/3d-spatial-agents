import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, voiceName = "en-US-Journey-F" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey =
      process.env.GOOGLE_TTS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY ||
      "AIzaSyBTwWnhGxShFSIrX9z0kHa8vmGc5AGG9Ds";

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "en-US", name: voiceName },
          audioConfig: { audioEncoding: "MP3" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google TTS API Error:", errorText);
      return NextResponse.json(
        { error: `Google TTS API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ audioContent: data.audioContent });
  } catch (error: any) {
    console.error("Error in TTS API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
