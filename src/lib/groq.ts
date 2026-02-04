import { Groq } from 'groq-sdk';

class KeyManager {
    private keys: string[] = [];
    private currentIndex: number = 0;
    private clients: Map<string, Groq> = new Map();

    constructor() {
        const keysString = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
        this.keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);

        if (this.keys.length === 0) {
            console.warn("No GROQ_API_KEYS or GROQ_API_KEY found in environment variables.");
        } else {
            console.log(`Loaded ${this.keys.length} Groq API keys.`);
        }
    }

    private getClient(key: string): Groq {
        if (!this.clients.has(key)) {
            this.clients.set(key, new Groq({ apiKey: key }));
        }
        return this.clients.get(key)!;
    }

    public getNextClient(): Groq {
        if (this.keys.length === 0) {
            // Fallback to a dummy client or throw, but better to throw to signal config error
            // However, to prevent crash on init if env is missing, we might return a client that will fail on request
            // But usually we throw here.
            // Let's check if we can just use the default env var GROQ_API_KEY which SDK picks up automatically?
            // The SDK `new Groq()` picks up process.env.GROQ_API_KEY.
            // But our KeyManager supports rotation and multiple keys.
            if (process.env.GROQ_API_KEY && this.keys.length === 0) {
                // Should have been caught in constructor, but if keysString was empty...
                // Let's just return a default client if no keys managed, relying on SDK default behavior
                return new Groq();
            }
            throw new Error("No Groq API keys available.");
        }

        const key = this.keys[this.currentIndex];
        return this.getClient(key);
    }

    public rotateKey() {
        if (this.keys.length <= 1) return;
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        console.log(`Rotating to Groq API Key Index: ${this.currentIndex}`);
    }
}

const keyManager = new KeyManager();

export const getGroqClient = () => {
    return keyManager.getNextClient();
};

export const rotateGroqKey = () => {
    keyManager.rotateKey();
};
