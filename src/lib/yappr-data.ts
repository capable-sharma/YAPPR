export type Tab = "topics" | "interview" | "vocab";

export const TOPIC_CATEGORIES = [
  "India & Politics",
  "Bollywood",
  "Cricket",
  "Tech Trends",
  "Gen-Z Culture",
  "Startups",
] as const;

export const TOPICS: Record<string, string[]> = {
  "India & Politics": [
    "Should voting be made mandatory in India?",
    "Free electricity schemes: empowerment or vote-bank politics?",
    "Should India shift to a presidential system?",
    "Regional parties are crucial for true federalism.",
    "Lateral entry into IAS will fix bureaucracy.",
  ],
  "Bollywood": [
    "South Indian cinema has officially out-shadowed Bollywood.",
    "Nepotism in Bollywood is overrated as a debate.",
    "OTT killed the theatrical experience in India.",
    "Item songs need to be banned from mainstream cinema.",
  ],
  "Cricket": [
    "IPL has destroyed the spirit of Test cricket.",
    "Impact Player rule is ruining T20 strategy.",
    "Indian cricketers are paid disproportionately to other sports.",
    "Captaincy should rotate across formats.",
  ],
  "Tech Trends": [
    "AI will create more jobs than it destroys in India.",
    "UPI's success makes India ready to export digital infrastructure.",
    "WFH is a long-term net negative for fresh graduates.",
    "India should ban crypto outright.",
  ],
  "Gen-Z Culture": [
    "Influencer culture is corroding professional ambition.",
    "Dating apps have killed real romance in metro cities.",
    "Hustle culture is overrated.",
    "Anonymous apps do more harm than good on campus.",
  ],
  "Startups": [
    "Indian startups should focus on profitability over GMV.",
    "ESOPs are overrated as a wealth creation tool.",
    "Bharat-first startups will outperform India-first ones.",
    "Edtech in India is a bubble waiting to pop.",
  ],
};

export const INTERVIEW_CATEGORIES = [
  "Behavioral (Top 50)",
  "Product Management",
  "Consulting Guesstimates",
  "Engineering / Tech",
  "MBA Admissions",
] as const;

export const INTERVIEW_QUESTIONS: Record<string, string[]> = {
  "Behavioral (Top 50)": [
    "Tell me about a time you led a team through conflict.",
    "Describe your biggest failure and what you learned.",
    "Why should we hire you over someone with more experience?",
    "Tell me about a time you disagreed with a manager.",
    "Walk me through your resume in 90 seconds.",
  ],
  "Product Management": [
    "How would you improve Instagram Reels for India?",
    "Design a product for daily-wage workers in India.",
    "Estimate the market size of food delivery in Tier-2 cities.",
    "Your favorite product and how you'd 10x it.",
  ],
  "Consulting Guesstimates": [
    "How many auto-rickshaws operate in Mumbai daily?",
    "Estimate the annual revenue of a single Starbucks in Bengaluru.",
    "How many WhatsApp messages are sent in India per second?",
    "Size the market for online tutoring in India.",
  ],
  "Engineering / Tech": [
    "Explain a complex technical project to a non-technical person.",
    "How do you prioritize tech debt vs new features?",
    "Walk me through how you'd debug a production outage.",
  ],
  "MBA Admissions": [
    "Why MBA, why now, why this school?",
    "Describe a time you demonstrated leadership outside work.",
    "What is your long-term career vision?",
  ],
};

export const FRAMEWORKS = [
  {
    id: "star",
    name: "STAR",
    color: "bg-yappr-yellow",
    steps: [
      { k: "S", t: "Situation", d: "Set the scene in 1 sentence." },
      { k: "T", t: "Task", d: "What needed to be done? Your responsibility." },
      { k: "A", t: "Action", d: "Specific steps YOU took. Use 'I', not 'we'." },
      { k: "R", t: "Result", d: "Quantified outcome. Numbers, %, impact." },
    ],
  },
  {
    id: "prep",
    name: "PREP",
    color: "bg-yappr-blue",
    steps: [
      { k: "P", t: "Point", d: "State your core argument upfront." },
      { k: "R", t: "Reason", d: "Why is this point true?" },
      { k: "E", t: "Example", d: "One concrete example or data point." },
      { k: "P", t: "Point", d: "Restate the original point, sharper." },
    ],
  },
  {
    id: "ppf",
    name: "PPF",
    color: "bg-yappr-magenta",
    steps: [
      { k: "P", t: "Past", d: "Historical context — how did we get here?" },
      { k: "P", t: "Present", d: "Current state — what's happening now?" },
      { k: "F", t: "Future", d: "Where this is going + your stance." },
    ],
  },
] as const;

export const VOCAB_DECKS = [
  "GRE Power Words",
  "Corporate Boardroom",
  "SAT Essentials",
  "Consulting Lingo",
] as const;

export const VOCAB_WORDS: Record<string, { word: string; ipa: string; pos: string; def: string; ex: string }[]> = {
  "GRE Power Words": [
    { word: "Ubiquitous", ipa: "/juːˈbɪkwɪtəs/", pos: "adj.", def: "Present everywhere.", ex: "Smartphones are now ubiquitous in urban India." },
    { word: "Ephemeral", ipa: "/ɪˈfɛmərəl/", pos: "adj.", def: "Lasting a very short time.", ex: "Viral fame is often ephemeral." },
    { word: "Pragmatic", ipa: "/præɡˈmætɪk/", pos: "adj.", def: "Dealing with things sensibly and realistically.", ex: "We need a pragmatic approach, not idealism." },
    { word: "Cogent", ipa: "/ˈkoʊdʒənt/", pos: "adj.", def: "Clear, logical, and convincing.", ex: "She made a cogent argument for remote work." },
  ],
  "Corporate Boardroom": [
    { word: "Synergy", ipa: "/ˈsɪnərdʒi/", pos: "noun", def: "Combined effect greater than sum of parts.", ex: "The merger created real synergy across teams." },
    { word: "Leverage", ipa: "/ˈlɛvərɪdʒ/", pos: "verb", def: "Use to maximum advantage.", ex: "We must leverage our brand equity." },
    { word: "Bandwidth", ipa: "/ˈbændwɪdθ/", pos: "noun", def: "Capacity to handle work.", ex: "I don't have the bandwidth this quarter." },
  ],
  "SAT Essentials": [
    { word: "Candid", ipa: "/ˈkændɪd/", pos: "adj.", def: "Truthful and straightforward.", ex: "His candid feedback changed our roadmap." },
    { word: "Mitigate", ipa: "/ˈmɪtɪɡeɪt/", pos: "verb", def: "Make less severe.", ex: "We added tests to mitigate regressions." },
  ],
  "Consulting Lingo": [
    { word: "Holistic", ipa: "/hoʊˈlɪstɪk/", pos: "adj.", def: "Considering the whole, not just parts.", ex: "We took a holistic view of the supply chain." },
    { word: "Actionable", ipa: "/ˈækʃənəbl/", pos: "adj.", def: "Able to be acted upon.", ex: "Give me one actionable insight." },
  ],
};
