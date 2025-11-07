// js/app.utils.js
// CLEAN REWRITE - V2 (SECURED)
// This file holds all static configuration, state, and data.

// --- GEMINI API Configuration (SECURED) ---
// The API Key is REMOVED from the frontend.
// We will now call our OWN backend proxy server.
const LLM_MODEL = "gemini-2.5-flash";

// [FIX] This is now the path to OUR backend server, not Google's.
export const API_URL = '/api/generate'; 

// --- Default Session State ---
export const newSessionState = {
    memory: {
      focus_points: [], open_questions: [], clarified_terms: {},
      student_name: null, current_lens: null, topic_focus: null, last_student_response: null
    },
    current_question: null,
    current_lens: null,
    student_name: null,
    mentor_name: null,
    current_step_index: -4, // -4:name, -3:intro, -2:vid1, -1:vid2, 0:welcome
    answers: [],
    selected_skills: [],
    profile_generated: false,
    awaiting_validation: false,
    current_summary: "",
    previous_topic: null,
    phase_completed: null,
    created_at: null,
    updated_at: null,
    has_rewatched: false,
    chat_history: []
};

// --- [NEW] callGeminiAPI (Proxy Version) ---
// This function now talks to OUR backend, not Google's.
export async function callGeminiAPI(systemInstruction, userQuery) {
  
  // This is the data we'll send to our server.
  const payload = {
    systemInstruction,
    userQuery
  };

  const maxRetries = 3;
  let delay = 1000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        if (response.status === 429 && i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      // Our server will send back the text directly.
      const textResponse = await response.text();
      
      if (textResponse && textResponse.length > 5) {
        return textResponse;
      } else if (i < maxRetries - 1) {
        console.warn("API returned empty response, retrying...");
        continue;
      } else {
        return "Hmm, could you tell me a bit more about that?";
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error("Gemini API call failed after retries:", error);
        return "I'm sorry, I'm having trouble connecting right now. Please try again.";
      }
    }
  }
  return "Failed to get a response.";
}


// --- Tunable Thresholds ---
export const THRESHOLDS = {
  RELEVANCE: 0.50,
  SPECIFICITY: 0.45,
  COMPLETENESS: 0.50,
  SHORT_LENGTH: 8,
  CONFUSION_KEYWORDS: ["maybe", "kinda", "I don't know", "not sure", "stuff", "things", "etc"],
  READINESS_THRESHOLD: 0.70,
  MAX_INTERVENTIONS: 3
};

// --- 🧭 PHASE 1A – DISCOVERY (9 QUESTIONS) ---
export const discoveryQuestions = [
    { id: 'q1a1_curiosity', title: "What problem have you noticed in your community that ignites a curiosity in you?", helpText: "Think of issues close to home in Ghana that make you wonder 'Why?' or 'How can we fix this?'" },
    { id: 'q1a2_notice', title: "How did you first notice this problem? (Through experience, observation, or from someone else?)", helpText: "Share the specific trigger that made it personal, like a conversation at a trotro stop." },
    { id: 'q1a3_affected', title: "Who do you see being most affected by this issue?", helpText: "Focus on the people closest to the pain, like families in your neighborhood." },
    { id: 'q1a4_personal', title: "What makes this issue important to you personally?", helpText: "Connect it to your emotions or values, rooted in your Ghanaian context." },
    { id: 'q1a5_example', title: "Can you describe a specific situation or example that made you realize it's a real problem?", helpText: "Stories make the issue vivid and real, like a local market tale." },
    { id: 'q1a6_efforts', title: "Have you seen anyone or any group trying to fix this problem before? What did they do?", helpText: "This shows what's been tried and gaps, perhaps a church group or youth club." },
    { id: 'q1a7_causes', title: "What do you think causes this problem in your community?", helpText: "Pinpoint the everyday triggers, like seasonal farming challenges." },
    { id: 'q1a8_future', title: "If this problem continues, what do you think will happen in the next few years?", helpText: "Imagine the ripple effects on your community." },
    { id: 'q1a9_wish', title: "What do you wish could change about it?", helpText: "This sparks your vision for better, inspired by Ghanaian resilience." }
];
// 🧭 PHASE 1B – DEFINING (10 QUESTIONS)
export const definingQuestions = [
    { id: 'q1b1_what', category: 'What', title: "What exactly is the problem or issue you've identified?", helpText: "Define the core issue clearly." },
    { id:J: 'q1b2_where', category: 'Where', title: "Where does it happen most often? (Community, workplaces, schools, etc.)", helpText: "Narrow the location for focus." },
    { id: 'q1b3_who', category: 'Who', title: "Who are the main people affected by this problem?", helpText: "Highlight the vulnerable." },
    { id: 'q1b4_when', category: 'When', title: "When does it usually happen? (Certain seasons, life stages, or times?)", helpText: "Timing reveals patterns." },
    { id: 'q1b5_why', category: 'Why', title: "Why do you think this problem keeps happening?", helpText: "Uncover the persistence." },
    { id: 'q1b6_how', category: 'How', title: "How does this issue affect people or the community as a whole?", helpText: "Show the broader ripple." },
    { id: 'q1b7_root', category: 'Root Causes', title: "What do you think are the main root causes behind this problem?", helpText: "Go beyond symptoms." },
    { id: 'q1b8_solutions', category: 'Possible Solutions', title: "What do you think can be done to reduce or solve it?", helpText: "Brainstorm feasible fixes." },
    { id: 'q1b9_impact', category: 'Impact of Solution', title: "If this problem were solved, how would your community or the people affected benefit?", helpText: "Envision the positive change." },
    { id: 'q1b10_role', category: 'Your Role', title: "What role do you see yourself playing in making this change happen?", helpText: "Link your strengths to action." }
];
// 🧭 PHASE 1C – PURPOSE ANCHORS (4 QUESTIONS)
export const purposeAnchorQuestions = [
    { id: 'q1c1_role', title: "Which role would you most prefer to take in addressing this issue?", helpText: "This helps you clarify how you naturally engage with change." },
    { id: 'q1c2_clarity', title: "On a scale of 1-5, how clear and meaningful does this problem feel to you right now?", helpText: "Helps track user clarity across iterations." },
    { id: 'q1c3_commitment', title: "Name one small, realistic action you could take in the next 2-4 weeks to move this problem forward.", helpText: "Translates intention into agency." },
    { id: 'q1c4_impact', title: "Imagine three years from now: what difference would your action make in your community?", helpText: "Anchors motivation in long-term purpose." }
];
// Total questions array (9 + 10 + 4 = 23)
export const questions = discoveryQuestions.concat(definingQuestions, purposeAnchorQuestions);

// --- Phase Intro Text Objects ---
export const phase1AIntro = {
  title: "THE FIRST SPARK",
  purpose: "To help the participant identify a real problem in their community that sparks curiosity, how they came to notice it, and how it affects people around them in a culturally relevant way.",
  facilitatorFlow: "So, to start, let's focus on what you've personally noticed in your community that ignites your curiosity."
};
export const phase1BIntro = {
  title: "UNDERSTANDING THE 'WHY'",
  purpose: "To move from storytelling and observation to a structured understanding of the problem — identifying the \"who, where, why, and what\" clearly."
};
export const phase1CIntro = {
  title: "FINDING YOUR ROLE",
  purpose: "To bridge your analysis of the problem with your personal motivation and sense of agency. This phase is about connecting the 'what' to the 'why you'."
};

// All other helper functions (getTimeGreeting, etc.) will be added back later
// when we build the chat.
// js/app.utils.js
// (Add this code to the end of the file)

// --- [NEW] HELPER FUNCTIONS ---
// (Adding these back in for the chat logic)

export function summarizeTextShort(text) {
  if (!text) return "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 12) return text.trim() || '';
  return words.slice(0, 12).join(' ') + '...';
}

export function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export function mentorThinking() {
    // Returns a promise that resolves after a random delay
    return new Promise(r => setTimeout(r, 800 + Math.random() * 1000));
}

// We will add the other utils (analyzeInput, etc.) later
// when we build the scaffolding for the questions.
// For now, this is all we need for the welcome flow.