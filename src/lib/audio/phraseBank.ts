// Local dictionary for offline chatter to heavily limit LLM API usage

export const PhraseBank = {
   GREETINGS: [
      "Hello there.",
      "Good to see you.",
      "Greetings.",
      "Hello!",
      "Hi!",
      "Good day!"
   ],
   IDLE: [
      "Hmm... what's next?",
      "Checking internal sensors.",
      "A quiet day in the lab.",
      "All systems nominal.",
      "Just taking a moment.",
      "Recalibrating...",
      "Everything seems to be in order."
   ],
   MOVING: [
      "Heading there now.",
      "Getting right on that.",
      "I should keep moving.",
      "Just passing through.",
      "Moving to position.",
      "On my way.",
      "Adjusting coordinates.",
      "Transferring to the next sector."
   ],
   WORKING: [
      "Picking this up.",
      "Placing it right here.",
      "Let's see... yes, this goes here.",
      "Just need to grab this.",
      "Moving this out of the way.",
      "Cleaning up the workspace.",
      "Systematic organization in progress.",
      "Done. That's better."
   ],
   INTERACTING: [
      "Let's see what we have here.",
      "Checking the readout.",
      "Accessing terminal...",
      "Adjusting settings.",
      "Analyzing this object.",
      "Beginning interaction sequence.",
      "Operation successful."
   ],
   RESEARCHING: [
      "Fascinating results.",
      "This data is... unexpected.",
      "Recording observations.",
      "Contemplating the architecture.",
      "Synthesizing new insights.",
      "The garden is quite peaceful today.",
      "Interesting. I should report this."
   ]
};

export function getRandomPhrase(category: keyof typeof PhraseBank): string {
   const options = PhraseBank[category];
   return options[Math.floor(Math.random() * options.length)];
}
