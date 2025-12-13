import { GoogleGenAI } from "@google/genai";

class KeyManager {
    private keys: string[] = [];
    private currentIndex: number = 0;
    private clients: Map<string, GoogleGenAI> = new Map();

    constructor() {
        // Support multiple keys via comma-separated list or single key
        const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
        this.keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);

        if (this.keys.length === 0) {
            console.warn("No GEMINI_API_KEYS or GEMINI_API_KEY found in environment variables.");
        } else {
            console.log(`Loaded ${this.keys.length} Gemini API keys.`);
        }
    }

    private getClient(key: string): GoogleGenAI {
        if (!this.clients.has(key)) {
            this.clients.set(key, new GoogleGenAI({ apiKey: key }));
        }
        return this.clients.get(key)!;
    }

    public getNextClient(): GoogleGenAI {
        if (this.keys.length === 0) {
            throw new Error("No API keys available.");
        }

        // Simple Round Robin for now, but we can be smarter if needed
        const key = this.keys[this.currentIndex];
        return this.getClient(key);
    }

    public rotateKey() {
        if (this.keys.length <= 1) return;
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        console.log(`Rotating to API Key Index: ${this.currentIndex}`);
    }
}

// Singleton instance
const keyManager = new KeyManager();

export const getGeminiClient = () => {
    return keyManager.getNextClient();
};

export const rotateGeminiKey = () => {
    keyManager.rotateKey();
};
