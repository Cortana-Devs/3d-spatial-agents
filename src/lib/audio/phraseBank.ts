// Local dictionary for offline chatter to heavily limit LLM API usage

export const PhraseBank = {
   GREETINGS: [
      "Hello there.",
      "Good to see you.",
      "Hey.",
      "Greetings.",
      "Hi. Let me know if you need anything.",
      "Hello. I'm busy right now but how can I help?"
   ],
   IDLE: [
      "Hmm... what's next?",
      "Need to make sure everything is in order.",
      "A quiet day in the lab.",
      "All systems nominal.",
      "Just taking a moment.",
      "Let's see what else needs doing."
   ],
   MOVING: [
      "Heading there now.",
      "Getting right on that.",
      "I should keep moving.",
      "Just passing through.",
      "Excuse me.",
      "On my way."
   ],
   WORKING: [
      "Picking this up.",
      "Placing it right here.",
      "Let's see... yes, this goes here.",
      "Just need to grab this.",
      "Moving this out of the way.",
      "Okay, done."
   ]
};

export function getRandomPhrase(category: keyof typeof PhraseBank): string {
   const options = PhraseBank[category];
   return options[Math.floor(Math.random() * options.length)];
}
