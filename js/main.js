// --- GEMINI API Configuration (Mandatory) ---
const apiKey = "AIzaSyAKpsPDtMTjbdkoyLLBf9y-J3rOS5mkyEc";
const LLM_MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${apiKey}`;

// --- PRD Compliance: Firebase Setup ---
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables MUST be used as mandated by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let userId;

// --- STUDENT-LED SCAFFOLDING INTEGRATION ---
// Tunable thresholds
const THRESHOLDS = {
  RELEVANCE: 0.50,
  SPECIFICITY: 0.45,
  COMPLETENESS: 0.50,
  SHORT_LENGTH: 8,
  CONFUSION_KEYWORDS: ["maybe", "kinda", "I don't know", "not sure", "stuff", "things", "etc"],
  READINESS_THRESHOLD: 0.70, // New: Min score to proceed without intervention
  MAX_INTERVENTIONS: 3 // New: Max nudges per question to avoid laborious loops
};

// Track interventions per question
let interventionCounts = new Map(); // questionId -> count

// Track if expecting refined response after nudge
let expectingRefined = false;

// Helpers
function wordsCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0.0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB)) || 0.0;
}

function keywordOverlap(textA, textB) {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = textB.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let overlap = 0;
  wordsB.forEach(w => {
    if (wordsA.has(w)) overlap++;
  });
  return overlap / Math.max(wordsA.size, 1);
}

// New: Readiness Assessor (lightweight LLM call)
async function assessReadiness(questionTitle, studentAnswer) {
  const systemInstruction = `You are an expert educational assessor for Ghanaian students. Score the student's answer (0.0-1.0) on how well it addresses the question. Criteria: specific, complete, culturally relevant, insightful. Respond ONLY with JSON: {"readiness_score": 0.85, "reason": "Brief reason (under 50 words)"}. Use neutral Ghanaian context.`;
  const userQuery = `Question: "${questionTitle}"\nAnswer: "${studentAnswer}"`;

  try {
    const response = await callGeminiAPI(systemInstruction, userQuery);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        readiness_score: parsed.readiness_score || 0,
        reason: parsed.reason || ''
      };
    }
    return {
      readiness_score: 0.5,
      reason: 'Parsing failed'
    };
  } catch (error) {
    console.error('Readiness assessment failed:', error);
    return {
      readiness_score: 0.5,
      reason: 'Error'
    };
  }
}

// Input Analyzer (no embeddings in browser; fallback to keywords)
async function analyzeInput(studentMessage, currentQuestion) {
  const length = wordsCount(studentMessage);
  const lower = studentMessage.toLowerCase();

  const concreteIndicators = (studentMessage.match(/\b(e\.g\.|for example|because|when|where|who|how|numbers|[0-9]+)\b/gi) || []).length;
  const specificity_score = Math.min(1, (concreteIndicators + length / 15) / 2);

  let relevance_score = 1.0;
  if (currentQuestion) {
    relevance_score = keywordOverlap(studentMessage, currentQuestion);
  }

  const normalizedLength = Math.min(1, length / 30);
  const completeness_score = 0.5 * normalizedLength + 0.5 * specificity_score;

  const confusion_signals = THRESHOLDS.CONFUSION_KEYWORDS.some(k => lower.includes(k));

  const intent = studentMessage.trim().endsWith('?') ? 'question' : 'answer';

  // Integrate readiness for finer control
  const readiness = await assessReadiness(currentQuestion || '', studentMessage);
  const adjusted_completeness = completeness_score * 0.7 + readiness.readiness_score * 0.3;

  return {
    length,
    specificity_score,
    relevance_score,
    completeness_score: adjusted_completeness,
    confusion_signals,
    intent,
    readiness_score: readiness.readiness_score,
    readiness_reason: readiness.reason
  };
}

// Decision Module (now factors in readiness)
function decideAction(signals, currentQuestion) {
  if (signals.intent === 'question') return {
    action: 'no_intervene'
  };

  // High readiness overrides other thresholds
  if (signals.readiness_score >= THRESHOLDS.READINESS_THRESHOLD) {
    return {
      action: 'minimal_validation'
    };
  }

  if (signals.relevance_score < THRESHOLDS.RELEVANCE) {
    return {
      action: 're_anchor'
    };
  }
  if (signals.completeness_score < THRESHOLDS.COMPLETENESS || signals.specificity_score < THRESHOLDS.SPECIFICITY || signals.confusion_signals) {
    if (signals.length <= THRESHOLDS.SHORT_LENGTH) return {
      action: 'invite_expand'
    };
    return {
      action: 'clarify'
    };
  }

  return {
    action: 'minimal_validation'
  };
}

// Micro-instruction Composer (tuned for neutral Ghanaian context)
function composeMicroInstruction(action, studentMessage, sessionMemory, currentQuestion) {
  const ms = {
    runtime_instruction: "Do not invent facts or give external data.",
    context_anchor: currentQuestion || (sessionMemory?.topic_focus) || "No explicit question",
    memory_snapshot: {
      topic_focus: sessionMemory?.topic_focus || null,
      focus_points: sessionMemory?.focus_points?.slice(-3) || []
    },
    student_message: studentMessage,
    output_format: "single_question",
    max_words: 25 // Increased slightly to reduce cutoffs
  };

  const actionInstructions = {
    no_intervene: "Student asked a question. Do not intervene. Only reply with a brief encouragement if necessary (e.g., 'Good question.').",
    minimal_validation: "Provide a very short validation/acknowledgement using the student's words. <= 8 words. Do not ask any questions.",
    invite_expand: "Invite the student to give one specific example. Ask one open question only, <= 15 words. No examples from assistant.",
    clarify: "Ask one concise clarifying question focused on what's unclear. Use student's own terms. <= 20 words.",
    re_anchor: "Re-anchor to the earlier question or topic by restating it briefly in a neutral Ghanaian community context (e.g., tying to shared values like unity or resilience across Ghana). Then ask a single question linking the student's response back to the core curiosity or problem. Keep it warm and student-centered. Two short lines max."
  };

  ms.runtime_instruction += ` ${actionInstructions[action] || actionInstructions.minimal_validation}`;
  ms.output_format = action === 'minimal_validation' || action === 'no_intervene' ? 'one_line_validation' :
    action === 're_anchor' ? 'two_lines_reanchor' : 'single_question';
  ms.max_words = {
    minimal_validation: 8,
    invite_expand: 15,
    re_anchor: 30
  } [action] || 25; // Adjusted for completeness

  return ms;
}

// Memory Updater
function summarizeTextShort(text) {
  const words = text?.trim().split(/\s+/) || [];
  if (words.length <= 12) return text?.trim() || '';
  return words.slice(0, 12).join(' ') + '...';
}

function updateMemory(memory, studentMessage, inferredLens = null) {
  if (!memory) return {
    focus_points: [],
    open_questions: [],
    clarified_terms: {},
    student_name: null,
    current_lens: null,
    topic_focus: null,
    last_student_response: null
  };
  const summary = summarizeTextShort(studentMessage);

  memory.last_student_response = summary;
  if (inferredLens) memory.current_lens = inferredLens;

  if (summary && !memory.focus_points.includes(summary)) {
    memory.focus_points.push(summary);
    if (memory.focus_points.length > 5) memory.focus_points.shift();
  }

  return memory;
}

// Improved Output Filter (sentence-aware to avoid cutoffs)
function filterLLMOutput(text, microInstruction) {
  let cleaned = (text || '').replace(/\n+/g, ' ').trim();
  // Split into sentences
  const sentences = cleaned.split(/[.!?]+/).map(s => s.trim() + '.').filter(s => s.length > 10);
  let wordCount = 0;
  let filtered = '';
  for (let sentence of sentences) {
    const sentWords = wordsCount(sentence);
    if (wordCount + sentWords > microInstruction.max_words) break;
    filtered += (filtered ? ' ' : '') + sentence;
    wordCount += sentWords;
  }
  if (!/[.?!]$/.test(filtered)) filtered += "?"; // End with ? for questions to feel natural
  return filtered || cleaned.substring(0, microInstruction.max_words) + '?'; // Fallback ends with ?
}

// New: Smart Rephrase for Fallbacks (adds context/meaning without answering)
async function rephraseCurrentQuestion(currentQuestion, studentMessage) {
  const systemInstruction = `You are a warm, supportive mentor for Ghanaian students. Rephrase this question to provide context and meaning, weaving in the student's recent thought warmly without answering it or adding facts. Keep neutral Ghanaian English, evoke emotions/values, end with a question. Max 25 words.`;
  const userQuery = `Original Question: "${currentQuestion}"\nStudent's Recent Thought: "${studentMessage}"\nRephrase to guide gently.`;

  try {
    const response = await callGeminiAPI(systemInstruction, userQuery);
    return filterLLMOutput(response, {
      max_words: 25
    }); // Apply light filter
  } catch (error) {
    console.error('Rephrase failed:', error);
    // Graceful template fallback
    const summary = studentMessage.split('.')[0].trim();
    const simpleRephrase = `Building on your insight about ${summary}, how does this connect to your personal values or emotions in your community?`;
    return simpleRephrase;
  }
}

/**
 * [NEW SMART LOGIC]
 * Uses an LLM call to generate a smooth transition between questions,
 * acknowledging and paraphrasing the student's last answer.
 */
async function generateSmartTransition(priorAnswer, nextQuestionTitle) {
  const systemInstruction = `You are a supportive peer mentor for Ghanaian students. Your task is to create a smooth, natural transition. 
  1. Briefly and warmly acknowledge the student's previous answer. 
  2. Paraphrase the key insight from their answer in one sentence to show you understood. 
  3. Clearly and grammatically introduce the next question. 
  Use neutral Ghanaian English. Be concise (max 2-3 sentences total). Do not use markdown.`;

  const userQuery = `Previous Answer: "${priorAnswer}"\nNext Question to Introduce: "${nextQuestionTitle}"`;

  try {
    const transitionText = await callGeminiAPI(systemInstruction, userQuery);

    // Basic validation to ensure the API returned something sensible
    if (transitionText && transitionText.length > 15 && transitionText.includes("?")) {
      return transitionText;
    } else {
      // Fallback if response is empty, weird, or the default error
      console.warn("Smart transition failed, using template fallback.");
      const rephrasedNext = nextQuestionTitle.charAt(0).toLowerCase() + nextQuestionTitle.slice(1);
      return `That's a great point. Now, let's think about this: ${rephrasedNext}?`;
    }
  } catch (error) {
    // Fallback on any API error
    console.error("Error in generateSmartTransition:", error);
    const rephrasedNext = nextQuestionTitle.charAt(0).toLowerCase() + nextQuestionTitle.slice(1);
    return `That's a very clear point. Moving on, ${rephrasedNext}?`;
  }
}


// Updated LLM Runner using Gemini
async function callLLM(runtimePayload, isFallbackCheck = false) {
  const systemPrompt = runtimePayload.system_message + "\n\nMicro-instruction: " + JSON.stringify(runtimePayload.micro_instruction);
  const fullPrompt = `${systemPrompt}\n\nStudent: ${runtimePayload.student_message}`;

  const payload = {
    contents: [{
      parts: [{
        text: fullPrompt
      }]
    }],
    systemInstruction: {
      parts: [{
        text: runtimePayload.system_message
      }]
    },
    generationConfig: {
      maxOutputTokens: 100
    } // Added to encourage fuller responses
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

      const result = await response.json();
      const raw = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (raw && raw.length > 5) {
        return raw;
      } else if (i < maxRetries - 1) {
        console.warn("API returned empty response, retrying...");
        continue;
      } else {
        // Flag for rephrase instead of generic fallback
        return "REPHRASE_NEEDED";
      }

    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('LLM call failed:', error);
        return "REPHRASE_NEEDED"; // Use rephrase on errors too
      }
    }
  }
  return "REPHRASE_NEEDED";
}

// Full Handler (now handles rephrase flag)
async function handleStudentMessage(studentMessage, session) {
  const signals = await analyzeInput(studentMessage, session.current_question);
  const decision = decideAction(signals, session.current_question);
  const action = decision.action;
  const micro = composeMicroInstruction(action, studentMessage, session.memory, session.current_question);

  const runtimePayload = {
    system_message: "You are a supportive peer mentor assistant for Ghanaian students exploring community issues. Prioritize student-led conversation. Follow any runtime instructions provided in the 'micro_instruction' field. Be brief, clear, non-judgemental, warm, and use neutral Ghanaian English (e.g., reference shared values like community unity or resilience across Ghana's diverse groups). Do not use specific ethnic languages or references. Do not invent facts. Always stay on the current question; do not jump to later topics like solutions, causes, or efforts.",
    micro_instruction: micro,
    memory_snapshot: micro.memory_snapshot,
    student_message: studentMessage
  };

  let llmText = await callLLM(runtimePayload);

  // New: If rephrase flag, generate contextual rephrase instead of "..."
  if (llmText === "REPHRASE_NEEDED") {
    console.warn('Fallback triggered; generating contextual rephrase.');
    llmText = await rephraseCurrentQuestion(session.current_question, studentMessage);
  }

  llmText = filterLLMOutput(llmText, micro);

  session.memory = updateMemory(session.memory, studentMessage, session.current_lens);

  // Save session memory after AI interaction
  await saveSession();

  return {
    assistant_reply: llmText,
    action,
    signals,
    micro_instruction: micro
  };
}

// Firebase init with session load/save
async function initializeFirebase() {
  // Default state for a new session
  const newSessionState = {
    memory: {
      focus_points: [],
      open_questions: [],
      clarified_terms: {},
      student_name: null,
      current_lens: null,
      topic_focus: null,
      last_student_response: null
    },
    current_question: null,
    current_lens: null,
    embeddingsClient: null,
    // --- [NEW] Progress tracking state ---
    student_name: null,
    current_step_index: -1,
    context_sub_step: 0,
    phase_intro_sub_step: 0,
    answers: [],
    selected_skills: [],
    profile_generated: false,
    awaiting_validation: false,
    current_summary: "",
    previous_topic: null, 
    phase_completed: null, 
    created_at: null, 
    updated_at: null 
  };

  try {
    if (Object.keys(firebaseConfig).length) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);

      if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
      } else {
        await signInAnonymously(auth);
      }
      userId = auth.currentUser.uid;
      console.log("Firebase initialized successfully");

      // Load session memory
      const sessionRef = doc(db, 'sessions', userId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        // Merge loaded data with defaults to prevent errors if schema mismatch
        window.session = { ...newSessionState,
          ...data,
          // Deep merge memory just in case
          memory: { ...newSessionState.memory,
            ...(data.memory || {})
          }
        };
        console.log("Loaded existing session from step:", window.session.current_step_index);
      } else {
        // No session found, use the brand new state
        window.session = newSessionState;
        window.session.created_at = new Date().toISOString(); // <-- SET CREATED_AT
        console.log("No existing session, starting new one.");
      }
    } else {
      // Standalone mode
      console.log("Firebase config not provided, running in standalone mode");
      window.session = newSessionState;
      window.session.created_at = new Date().toISOString(); // <-- SET CREATED_AT
    }
  } catch (error) {
    // Error mode
    console.error("Firebase initialization or sign-in failed:", error);
    window.session = newSessionState;
  }
}

async function saveSession() {
  if (db && userId) {
    try {
      const sessionRef = doc(db, 'sessions', userId);
      // [NEW] Update timestamp
      window.session.updated_at = new Date().toISOString();
      
      await setDoc(sessionRef, window.session, {
        merge: true
      });
      console.log("Session saved. Step:", window.session.current_step_index);
    } catch (error) {
      console.error("Error saving session:", error);
    }
  }
}

// --- Core Application State & Logic ---

let awaitingFollowup = false; // This is fine as global, it's not persistent state

const initialScreen = {
  id: 's0_context',
  title: "Phase 1: Setting Context & Building Awareness",
  buttonText: "I Understand. Let's Start."
};

// 🧭 PHASE 1A – DISCOVERY (9 QUESTIONS)
const discoveryQuestions = [{
  id: 'q1a1_curiosity',
  title: "What problem have you noticed in your community that ignites a curiosity in you?",
  placeholder: "Describe a challenge like youth unemployment in your area or waste in local markets that sparks your interest.",
  helpText: "Think of issues close to home in Ghana that make you wonder 'Why?' or 'How can we fix this?'",
  minWords: 10
}, {
  id: 'q1a2_notice',
  title: "How did you first notice this problem? (Through experience, observation, or from someone else?)",
  placeholder: "Describe the moment or story that brought this to your attention.",
  helpText: "Share the specific trigger that made it personal, like a conversation at a trotro stop.",
  minWords: 10
}, {
  id: 'q1a3_affected',
  title: "Who do you see being most affected by this issue?",
  placeholder: "Name specific groups like 'street vendors in Accra' or 'rural farmers'.",
  helpText: "Focus on the people closest to the pain, like families in your neighborhood.",
  minWords: 10
}, {
  id: 'q1a4_personal',
  title: "What makes this issue important to you personally?",
  placeholder: "How does it frustrate, anger, or inspire you?",
  helpText: "Connect it to your emotions or values, rooted in your Ghanaian context.",
  minWords: 10
}, {
  id: 'q1a5_example',
  title: "Can you describe a specific situation or example that made you realize it's a serious problem?",
  placeholder: "Tell a short story from your community.",
  helpText: "Stories make the issue vivid and real, like a local market tale.",
  minWords: 10
}, {
  id: 'q1a6_efforts',
  title: "Have you seen anyone or any group trying to fix this problem before? What did they do?",
  placeholder: "Mention local initiatives, NGOs, or community efforts.",
  helpText: "This shows what's been tried and gaps, perhaps a church group or youth club.",
  minWords: 10
}, {
  id: 'q1a7_causes',
  title: "What do you think causes this problem in your community?",
  placeholder: "Is it poverty, lack of resources, or cultural factors?",
  helpText: "Pinpoint the everyday triggers, like seasonal farming challenges.",
  minWords: 10
}, {
  id: 'q1a8_future',
  title: "If this problem continues, what do you think will happen in the next few years?",
  placeholder: "Describe the worsening impact on people or places.",
  helpText: "Imagine the ripple effects on your community.",
  minWords: 10
}, {
  id: 'q1a9_wish',
  title: "What do you wish could change about it?",
  placeholder: "What small or big shift would make a difference?",
  helpText: "This sparks your vision for better, inspired by Ghanaian resilience.",
  minWords: 10
}, ];

// 🧭 PHASE 1B – DEFINING (10 QUESTIONS)
const definingQuestions = [{
  id: 'q1b1_what',
  category: 'What',
  title: "What exactly is the problem or issue you've identified?",
  placeholder: "Be precise, e.g., 'flooding in low-lying areas during rains'.",
  helpText: "Define the core issue clearly.",
  minWords: 10
}, {
  id: 'q1b2_where',
  category: 'Where',
  title: "Where does it happen most often? (Community, workplaces, schools, etc.)",
  placeholder: "Specific spots like 'informal markets in Kumasi'.",
  helpText: "Narrow the location for focus.",
  minWords: 10
}, {
  id: 'q1b3_who',
  category: 'Who',
  title: "Who are the main people affected by this problem?",
  placeholder: "Detail groups like 'youth without skills training'.",
  helpText: "Highlight the vulnerable.",
  minWords: 10
}, {
  id: 'q1b4_when',
  category: 'When',
  title: "When does it usually happen? (Certain seasons, life stages, or times?)",
  placeholder: "E.g., 'during dry seasons' or 'for school leavers'.",
  helpText: "Timing reveals patterns.",
  minWords: 10
}, {
  id: 'q1b5_why',
  category: 'Why',
  title: "Why do you think this problem keeps happening?",
  placeholder: "Systemic reasons like 'poor infrastructure funding'.",
  helpText: "Uncover the persistence.",
  minWords: 10
}, {
  id: 'q1b6_how',
  category: 'How',
  title: "How does this issue affect people or the community as a whole?",
  placeholder: "E.g., 'leads to health risks and lost income'.",
  helpText: "Show the broader ripple.",
  minWords: 10
}, {
  id: 'q1b7_root',
  category: 'Root Causes',
  title: "What do you think are the main root causes behind this problem?",
  placeholder: "Deep factors like 'ineffective policies or education gaps'.",
  helpText: "Go beyond symptoms.",
  minWords: 10
}, {
  id: 'q1b8_solutions',
  category: 'Possible Solutions',
  title: "What do you think can be done to reduce or solve it?",
  placeholder: "Ideas like 'community training programs'.",
  helpText: "Brainstorm feasible fixes.",
  minWords: 10
}, {
  id: 'q1b9_impact',
  category: 'Impact of Solution',
  title: "If this problem were solved, how would your community or the people affected benefit?",
  placeholder: "E.g., 'improved livelihoods and safer environments'.",
  helpText: "Envision the positive change.",
  minWords: 10
}, {
  id: 'q1b10_role',
  category: 'Your Role',
  title: "What role do you see yourself playing in making this change happen?",
  placeholder: "E.g., 'leading workshops or advocating for policy'.",
  helpText: "Link your strengths to action.",
  minWords: 10
}];

// 🧭 PHASE 1C – PURPOSE ANCHORS (4 QUESTIONS)
const purposeAnchorQuestions = [{
  id: 'q1c1_role',
  title: "Which role would you most prefer to take in addressing this issue?",
  placeholder: "E.g., Organizer, Connector, Educator, Researcher, Advocate…",
  helpText: "This helps you clarify how you naturally engage with change."
}, {
  id: 'q1c2_clarity',
  title: "On a scale of 1-5, how clear and meaningful does this problem feel to you right now?",
  placeholder: "Rate 1 (not clear) – 5 (very clear). Optional: add one comment.",
  helpText: "Helps track user clarity across iterations."
}, {
  id: 'q1c3_commitment',
  title: "Name one small, realistic action you could take in the next 2-4 weeks to move this problem forward.",
  placeholder: "E.g., talk to a youth leader, survey your peers, observe your local market…",
  helpText: "Translates intention into agency."
}, {
  id: 'q1c4_impact',
  title: "Imagine three years from now: what difference would your action make in your community?",
  placeholder: "Visualize your desired impact.",
  helpText: "Anchors motivation in long-term purpose."
}];


// Total questions array (9 + 10 + 4 = 23)
const questions = discoveryQuestions.concat(definingQuestions, purposeAnchorQuestions);

const skillTags = [{
  id: 's1',
  label: 'Problem Solving'
}, {
  id: 's2',
  label: 'Leadership'
}, {
  id: 's3',
  label: 'Mathematics/Science'
}, {
  id: 's4',
  label: 'Creative Writing'
}, {
  id: 's5',
  label: 'Public Speaking'
}, {
  id: 's6',
  label: 'Digital Design'
}, {
  id: 's7',
  label: 'Teamwork/Organizing'
}, {
  id: 's8',
  label: 'Manual/Practical Skills'
}];

// DOM Elements
let container, nextButton, backButton, currentStepSpan, conversationLog;

// --- Phase Intro Text Objects ---
const phase1AIntro = {
  title: "THE FIRST SPARK",
  purpose: "To help the participant identify a real problem in their community that sparks curiosity, how they came to notice it, and how it affects people around them in a culturally relevant way.",
  facilitatorFlow: "Now that we've seen how global goals connect to real issues, let's focus on what you've personally noticed in your community that ignites your curiosity."
};

const phase1BIntro = {
  title: "UNDERSTANDING THE 'WHY'",
  purpose: "To move from storytelling and observation to a structured understanding of the problem — identifying the \"who, where, why, and what\" clearly."
};

const phase1CIntro = {
  title: "FINDING YOUR ROLE",
  purpose: "To bridge your analysis of the problem with your personal motivation and sense of agency. This phase is about connecting the 'what' to the 'why you'."
};

let currentPhase = null; // This can remain global as it's derived from state

// --- CONVERSATION LOG UTILITY ---

function appendToLog(sender, message, isTyping = false) {
  const isUser = sender === 'user';
  const logItem = document.createElement('div');
  logItem.className = `p-3 rounded-xl shadow-sm ${isUser ? 'bg-blue-100 ml-auto user-bubble' : 'bg-gray-100 mr-auto ai-bubble'} max-w-[85%] text-sm`;
  logItem.style.maxWidth = '85%';
  logItem.style.wordBreak = 'break-word';

  if (isTyping) {
    logItem.id = 'ai-typing-indicator';
    logItem.innerHTML = `<span class="font-semibold">${isUser ? 'You' : 'Mentor'}:</span> <span class="animate-pulse">...Thinking...</span>`;
  } else if (!message || message.trim() === '') {
    // Avoid empty logs
    logItem.innerHTML = `<span class="font-semibold">Mentor:</span> <span class="text-gray-400">Reflecting...</span>`;
  } else {
    logItem.innerHTML = `<span class="font-semibold">${isUser ? 'You' : 'Mentor'}:</span> ${message}`;
  }
  conversationLog.appendChild(logItem);
  conversationLog.scrollTop = conversationLog.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('ai-typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// --- RENDER FUNCTIONS ---
function renderInitialContext() {
  // Read state from window.session
  console.log("Rendering context screen, substep:", window.session.context_sub_step);
  currentStepSpan.innerHTML = 'THE BIGGER PICTURE'; // [FIX] Updated step name
  backButton.disabled = window.session.context_sub_step === 0;

  // [FIX] REMOVED the redundant log clearing from this function.
  /*
  if (conversationLog.children.length === 1 && conversationLog.children[0].textContent.includes('mentor will appear')) {
    conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Conversation log cleared.</p>`;
  }
  */

  if (window.session.context_sub_step === 0) {
    // --- Name Capture Screen ---
    nextButton.textContent = "Let's Go";
    container.innerHTML = `
            <div class="initial-context short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">Welcome to your Purpose Pathfinder</h2>
                <p class="text-base text-gray-700 font-medium">To make this journey personal, what's your first name?</p>
                <input type="text" id="student_name_input" class="w-full max-w-sm px-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 shadow-sm" placeholder="E.g., Ama or Kofi">
            </div>
        `;
  } else if (window.session.context_sub_step === 1) {
    // --- [NEW] Personalized Welcome Screen ---
    const name = window.session.student_name || 'Innovator'; // Fallback
    nextButton.textContent = "Continue";
    container.innerHTML = `
            <div class="initial-context short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">Welcome, ${name}</h2>
                <p class="text-lg text-gray-700 font-medium italic">"Innovation begins with the first thought."</p>
                <p class="text-base text-indigo-600 font-semibold">Let's get started.</p>
            </div>
        `;
  } else if (window.session.context_sub_step === 2) {
    // --- This is the OLD Step 1 (Connecting Your World) ---
    const name = window.session.student_name;
    const greeting = name ? `${name}, to find your purpose,` : "To find your purpose,";

    nextButton.textContent = "Continue";
    container.innerHTML = `
            <div class="initial-context short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">Connecting Your World</h2>
                <p class="text-base text-gray-700 font-medium">${greeting} we first need to see how community challenges connect to the big picture—a global roadmap (like the UN SDGs).</p>
                <p class="text-base text-indigo-600 font-semibold">Ready to see where your curiosity fits in?</p>
            </div>
        `;
  } else if (window.session.context_sub_step === 3) {
    // --- This is the OLD Step 2 (SDG Video) ---
    nextButton.textContent = "Continue";
    container.innerHTML = `
            <div class="short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">The Global Roadmap: 17 SDGs</h2>
                <div class="p-2 bg-white rounded-xl shadow-lg border border-gray-200">
                    <p class="text-sm text-gray-700 font-medium mb-2">Watch this short video explaining the 17 Sustainable Development Goals</p>
                    <div class="video-container rounded-xl shadow-lg border border-indigo-300">
                        <iframe 
                            src="https://www.youtube.com/embed/7dzFbP2AgFo?rel=0&modestbranding=1" 
                            title="17 Sustainable Development Goals Explained" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                        ></iframe>
                    </div>
                </div>
            </div>
        `;
  } else if (window.session.context_sub_step === 4) {
    // --- This is the OLD Step 3 (Reflection Questions) ---
    nextButton.textContent = "Watch Video";
    container.innerHTML = `
            <div class="short-section space-y-4">
                <h2 class="text-2xl font-bold text-indigo-800">See a Solution in Action</h2>
                <div class="text-gray-700 space-y-2">
                    <p class="text-base font-medium">To gain inspiration, reflect on these as you watch how others are solving similar problems globally and locally.</p>
                    <h3 class="text-lg font-semibold text-gray-700">Reflection Questions:</h3>
                    <ul class="list-disc list-inside ml-4 text-sm space-y-1 reflection-list">
                        <li>What stood out to you in this story?</li>
                        <li>How did they approach the problem?</li>
                        <li>Which idea could work in your community?</li>
                    </ul>
                </div>
            </div>
        `;
  } else if (window.session.context_sub_step === 5) {
    // --- This is the OLD Step 4 (Final Video) ---
    nextButton.textContent = initialScreen.buttonText;
    container.innerHTML = `
            <div class="short-section space-y-4">
                <h2 class="text-2xl font-bold text-indigo-800">Watch the Video</h2>
                <div class="text-gray-700 text-center">
                    <div class="video-container rounded-xl shadow-lg border border-indigo-300">
                        <iframe 
                            src="https://www.youtube.com/embed/IqGxel7qdP4?rel=0&modestbranding=1" 
                            title="Youth Employment Solutions Video" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                        ></iframe>
                    </div>
                    <p class="text-base text-indigo-600 font-semibold pt-1">Click 'I Understand' to proceed to Question 1.</p>
                </div>
            </div>
        `;
  }
}

// --- [RE-DESIGNED FUNCTION] ---
function renderStep1Question() {
  // Read state from window.session
  console.log("Rendering question, index:", window.session.current_step_index, "phase intro:", window.session.phase_intro_sub_step);
  const q = questions[window.session.current_step_index];
  const savedAnswer = window.session.answers[window.session.current_step_index] || '';

  // Define phase boundaries
  const isFirstInPhase1A = window.session.current_step_index === 0;
  const isFirstInPhase1B = window.session.current_step_index === discoveryQuestions.length; // 9
  const isFirstInPhase1C = window.session.current_step_index === (discoveryQuestions.length + definingQuestions.length); // 19

  // Reset intervention count on new question render
  interventionCounts.set(q.id, 0);

  // --- Render Phase Intro Screens ---
  if (isFirstInPhase1A && window.session.phase_intro_sub_step === 0) {
    nextButton.textContent = "Start Questions";
    backButton.disabled = false;
    container.innerHTML = `
            <div class="phase-intro short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">🧩 ${phase1AIntro.title}</h2>
                <div class="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-200 text-left">
                    <h3 class="text-lg font-semibold text-indigo-800 mb-2">🎯 Purpose:</h3>
                    <p class="text-gray-700 mb-3">${phase1AIntro.purpose}</p>
                    <blockquote class="text-indigo-600 italic border-l-4 border-indigo-400 pl-3">
                        <p>${phase1AIntro.facilitatorFlow}</p>
                    </blockquote>
                </div>
            </div>
        `;
    currentStepSpan.innerHTML = 'Identify area of change'; // [FIX] Updated step name
    return;
  }

  if (isFirstInPhase1B && window.session.phase_intro_sub_step === 0) {
    nextButton.textContent = "Start Questions";
    backButton.disabled = false;
    container.innerHTML = `
            <div class="phase-intro short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">⚙️ ${phase1BIntro.title}</h2>
                <div class="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-200 text-left">
                    <h3 class="text-lg font-semibold text-indigo-800 mb-2">🎯 Purpose:</h3>
                    <p class="text-gray-700">${phase1BIntro.purpose}</p>
                </div>
            </div>
        `;
    currentStepSpan.innerHTML = 'Identify area of change'; // [FIX] Updated step name
    return;
  }

  if (isFirstInPhase1C && window.session.phase_intro_sub_step === 0) {
    nextButton.textContent = "Start Questions";
    backButton.disabled = false;
    container.innerHTML = `
            <div class="phase-intro short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">🧭 ${phase1CIntro.title}</h2>
                <div class="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-200 text-left">
                    <h3 class="text-lg font-semibold text-indigo-800 mb-2">🎯 Purpose:</h3>
                    <p class="text-gray-700">${phase1CIntro.purpose}</p>
                </div>
            </div>
        `;
    currentStepSpan.innerHTML = 'Identify area of change'; // [FIX] Updated step name
    return;
  }

  // --- Render the Actual Question UI ---

  // Check for category (for Phase 1B)
  let categoryHTML = q.category ? `<p class="text-sm font-semibold text-indigo-600 mb-1">${q.category.toUpperCase()}</p>` : '';

  // [FIX] Build the new CLEAN UI, removing the repetitive phase title
  container.innerHTML = `
        <div class="question-section short-section space-y-4">
            <div class="p-5 bg-white rounded-xl shadow-lg border border-gray-200 space-y-3">
                ${categoryHTML}
                
                <label for="${q.id}" class="block text-xl font-semibold text-gray-800">${q.title}</label>
                
                <p class="text-sm text-gray-500 mb-0">${q.helpText || ''}</p>
                
                <textarea id="${q.id}" rows="5" 
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 shadow-sm"
                    placeholder="${q.placeholder}"
                >${savedAnswer}</textarea>
            </div>
        </div>
    `;

  nextButton.textContent = "Continue";
  currentStepSpan.innerHTML = 'Identify area of change'; // [FIX] Updated step name
  backButton.disabled = false;
}
// --- [END RE-DESIGNED FUNCTION] ---


// --- [NEW FUNCTION] ---
// Renders the "Guided Refinement" screen
function renderValidationScreen() {
  currentStepSpan.innerHTML = 'Identify area of change'; // [FIX] Updated step name
  const name = window.session.student_name ? `, ${window.session.student_name}` : '';
  
  // Key question indexes
  const who_idx = discoveryQuestions.length + 2; // q1b3_who (index 11)
  const what_idx = discoveryQuestions.length;     // q1b1_what (index 9)
  const why_idx = discoveryQuestions.length + 4;  // q1b5_why (index 13)

  container.innerHTML = `
        <div class="validation-section short-section space-y-4">
            <h2 class="text-2xl font-bold text-indigo-800 text-center">Here is your Problem Statement${name}</h2>
            
            <div id="summary-display" class="p-4 bg-indigo-50 border-2 border-indigo-300 rounded-xl shadow-inner">
                <p class="text-gray-700 italic">${window.session.current_summary}</p>
            </div>

            <div class="flex items-center justify-center space-x-4 pt-2">
                <button id="validation-approve-btn" class="bg-green-600 text-white px-5 py-2 rounded-xl font-semibold shadow-lg hover:bg-green-700 transition duration-150">
                    Looks Good! Let's Continue
                </button>
                <button id="validation-refine-btn" class="bg-gray-500 text-white px-5 py-2 rounded-xl font-semibold shadow-lg hover:bg-gray-600 transition duration-150">
                    I'd like to change something
                </button>
            </div>

            <div id="refine-panel" class="hidden space-y-4 pt-4 mt-4 border-t border-gray-300">
                <p class="text-lg font-semibold text-gray-700">No problem! Let's refine the key parts.</p>
                
                <div class="space-y-3">
                    <div>
                        <label for="refine_what" class="block text-sm font-medium text-gray-700">${questions[what_idx].title}</label>
                        <textarea id="refine_what" rows="2" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-xl shadow-sm">${window.session.answers[what_idx] || ''}</textarea>
                    </div>
                    <div>
                        <label for="refine_who" class="block text-sm font-medium text-gray-700">${questions[who_idx].title}</label>
                        <textarea id="refine_who" rows="2" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-xl shadow-sm">${window.session.answers[who_idx] || ''}</textarea>
                    </div>
                    <div>
                        <label for="refine_why" class="block text-sm font-medium text-gray-700">${questions[why_idx].title}</label>
                        <textarea id="refine_why" rows="2" class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-xl shadow-sm">${window.session.answers[why_idx] || ''}</textarea>
                    </div>
                </div>

                <button id="regenerate-summary-btn" class="bg-indigo-600 text-white px-5 py-2 rounded-xl font-semibold shadow-lg hover:bg-indigo-700 transition duration-150">
                    Re-generate Summary with My Changes
                </button>
            </div>
        </div>
    `;

  // Attach new event listeners
  document.getElementById('validation-approve-btn').addEventListener('click', handleValidationApproval);
  document.getElementById('validation-refine-btn').addEventListener('click', () => toggleRefineEditor(true));
  document.getElementById('regenerate-summary-btn').addEventListener('click', handleRegenerateSummary);
}
// --- [END NEW FUNCTION] ---

function renderStep2() {
  conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Phase 1 complete. Starting Step 2 guidance.</p>`;

  // [FIX] Updated index
  currentStepSpan.innerHTML = 'Your strength and interest'; // [FIX] Updated step name
  // Read state from window.session
  const selectedTagsHTML = window.session.selected_skills.map(tagId => {
    const tag = skillTags.find(t => t.id === tagId);
    return tag ? `<span class="tag-pill inline-flex items-center px-3 py-1 mr-2 mb-2 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full cursor-pointer" data-tag-id="${tag.id}">${tag.label} &times;</span>` : '';
  }).join('');

  const availableTagsHTML = skillTags.filter(tag => !window.session.selected_skills.includes(tag.id)).map(tag => `
        <span class="tag-pill inline-flex items-center px-3 py-1 mr-2 mb-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-full hover:bg-indigo-200 cursor-pointer" data-tag-id="${tag.id}">${tag.label}</span>
    `).join('');

  // Read optionalText from saved answers
  const savedAnswer = window.session.answers[questions.length] || {}; // Index 23
  const optionalText = savedAnswer.optionalText || '';

  container.innerHTML = `
        <div class="space-y-6">
            <h2 class="text-xl font-semibold text-gray-800">Step 2: Your Skills & Interests</h2>
            <p class="text-sm text-gray-600">Choose between 3 and 5 tags that best describe your core skills and passions.</p>
            
            <div id="selected-tags" class="min-h-[40px] p-2 border-2 border-indigo-200 rounded-xl bg-indigo-50">
                ${selectedTagsHTML || '<p class="text-gray-400 text-sm">Select 3-5 tags below...</p>'}
            </div>

            <div id="available-tags-container" class="mt-4">
                ${availableTagsHTML}
            </div>

            <label for="s2_optional_text" class="block pt-4 text-lg font-medium text-gray-700">Optional: Tell us more about a skill.</label>
            <textarea id="s2_optional_text" rows="2" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 shadow-sm" placeholder="e.g., 'I learned basic web design from YouTube and want to use it for impact.'">${optionalText}</textarea>
        </div>
    `;

  document.querySelectorAll('.tag-pill').forEach(tag => {
    tag.addEventListener('click', handleTagClick);
  });
  updateNavigation();
}

function renderStep3Completion() {
  conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Step 2 complete. Ready for analysis.</p>`;

  // [FIX] Updated index
  currentStepSpan.innerHTML = 'Your strength and interest'; // [FIX] Updated step name
  nextButton.textContent = "Go to Step 4";
  nextButton.disabled = false;

  // Read state from window.session
  const profileResultHTML = window.session.profile_generated ?
    `<div id="profile-output" class="p-6 bg-indigo-50 border-2 border-indigo-300 rounded-xl shadow-inner mt-4">
            <p class="text-center text-gray-500">Generating your purpose profile...</p>
        </div>` :
    `<div id="profile-output" class="p-6 bg-gray-100 border-2 border-gray-300 rounded-xl shadow-inner mt-4">
            <p class="text-center text-gray-500">Click the button below to get your profile.</p>
        </div>`;

  container.innerHTML = `
        <div class="space-y-6 text-center">
            <h2 class="text-2xl font-bold text-indigo-700">Section Complete! 🎉</h2>
            <p class="text-gray-600">You've clearly defined the problem and your skills. Let's see your potential mission.</p>
            
            ${profileResultHTML}

            <button id="generate-profile-btn" class="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-purple-700 transition duration-150 disabled:bg-purple-300">
                ✨ Generate My Purpose Profile
            </button>
            
            <p class="text-sm text-gray-500 pt-4">Next, we filter by your academic results.</p>
        </div>
    `;

  document.getElementById('generate-profile-btn').addEventListener('click', generateProfileSummary);

  if (window.session.profile_generated) {
    document.getElementById('generate-profile-btn').disabled = true;
  }
}

function renderStep() {
  // Read state from window.session
  console.log("RenderStep called - currentStepIndex:", window.session.current_step_index, "contextSubStep:", window.session.context_sub_step);
  
  // --- [NEW] Check for validation state first
  if (window.session.awaiting_validation) {
    renderValidationScreen();
  } else if (window.session.current_step_index === -1) {
    renderInitialContext();
  } else if (window.session.current_step_index < questions.length) { // 0-22
    renderStep1Question();
  } else if (window.session.current_step_index === questions.length) { // 23
    renderStep2();
  } else { // 24
    renderStep3Completion();
  }
  updateNavigation();
}

// Updated threshold check using scaffolding analyzer (returns true if intervention needed)
async function checkThresholds(text, currentQuestion, qId) {
  const signals = await analyzeInput(text, currentQuestion);
  const decision = decideAction(signals, currentQuestion);

  // Check intervention limit
  const currentCount = interventionCounts.get(qId) || 0;
  const forceProceed = currentCount >= THRESHOLDS.MAX_INTERVENTIONS;

  console.log(`KPI → ${decision.action === 'minimal_validation' ? 'PASSED (Readiness: ' + signals.readiness_score + ')' : 'FAILED (' + decision.action + ', Count: ' + (currentCount + 1) + ')'}`);

  if (forceProceed) {
    console.log('Max interventions reached; forcing proceed.');
    return false; // Proceed even if not ideal
  }

  return decision.action !== 'minimal_validation' && decision.action !== 'no_intervene';
}

// Updated nudge using scaffolding handler (increments count)
async function displayAINudge(userText, currentQuestion, qId) {
  const session = window.session;
  session.current_question = currentQuestion;
  const result = await handleStudentMessage(userText, session);
  // saveSession is already called inside handleStudentMessage

  // Increment intervention count
  const currentCount = interventionCounts.get(qId) || 0;
  interventionCounts.set(qId, currentCount + 1);

  appendToLog('mentor', null, true);
  removeTypingIndicator();
  appendToLog('mentor', result.assistant_reply);
}

// --- [RE-BUILT LOGIC] ---
// This function now handles all phase transitions intelligently.
async function proceedToNext(answer) {
  // 1. Save the answer
  window.session.answers[window.session.current_step_index] = answer;
  
  // [NEW] Save topic for "Mentor Memory Thread"
  if (window.session.current_step_index === 0) { // If this is the first question
      window.session.previous_topic = summarizeTextShort(answer);
  }

  // 2. Define phase boundaries
  const endOfPhase1A_idx = discoveryQuestions.length - 1; // 8
  const endOfPhase1B_idx = discoveryQuestions.length + definingQuestions.length - 1; // 18
  const endOfPhase1C_idx = questions.length - 1; // 22

  // 3. Handle transitions
  if (window.session.current_step_index === endOfPhase1B_idx) {
    // --- [NEW] Transition to Validation Screen ---
    window.session.phase_completed = "1B"; // [NEW] Mark phase as complete
    appendToLog('mentor', null, true);
    // Summarize all answers from Phase 1A and 1B
    const problemSummary = await generateFinalProblemSummary(...window.session.answers.slice(0, endOfPhase1B_idx + 1));
    removeTypingIndicator();
    appendToLog('mentor', "Great, you've defined the problem. Here's a summary of your thoughts..."); // Transition message
    
    window.session.current_summary = problemSummary;
    window.session.awaiting_validation = true;
    // We DON'T increment step_index. We stay on index 18.
    
    setTimeout(() => renderStep(), 1500); // Give time to read message

  } else if (window.session.current_step_index === endOfPhase1C_idx) {
    // --- Transition from 1C to Skills (Step 2) ---
    window.session.phase_completed = "1C"; // [NEW] Mark phase as complete
    // Use a fast, hardcoded transition
    appendToLog('mentor', "Thank you. That's a powerful vision for the future. Let's now move on to Step 2: Your Skills and Interests.");

    window.session.current_step_index++; // Move to 23
    renderStep(); // Renders Skills page

  } else {
    // --- Normal question-to-question transition ---
    window.session.current_step_index++; // Move to next question index

    // Check if we hit the 1A -> 1B intro
    if (window.session.current_step_index === discoveryQuestions.length) {
      window.session.phase_completed = "1A"; // [NEW] Mark phase as complete
      window.session.phase_intro_sub_step = 0; // Trigger 1B intro
    }
    // Check for 1B -> 1C intro
    if (window.session.current_step_index === (discoveryQuestions.length + definingQuestions.length)) {
      window.session.phase_intro_sub_step = 0; // Trigger 1C intro
    }


    const nextQ = questions[window.session.current_step_index];
    appendToLog('mentor', null, true);
    const echo = await generateSmartTransition(answer, nextQ.title);
    removeTypingIndicator();
    appendToLog('mentor', echo);

    setTimeout(() => renderStep(), 1500);
  }

  // 4. Reset intervention count for the *new* question (if it exists)
  if (questions[window.session.current_step_index]) {
    interventionCounts.set(questions[window.session.current_step_index].id, 0);
  }

  // 5. Save state
  await saveSession();
}
// --- [END RE-BUILT LOGIC] ---


// --- [UPDATED PROMPT] ---
async function generateFinalProblemSummary(...problemAnswers) {
  const dataPoints = problemAnswers.map((answer, index) => {
    let category = '';
    // Only use questions from Phase 1A and 1B for this summary
    if (index < discoveryQuestions.length + definingQuestions.length) { 
      if (index < discoveryQuestions.length) {
        category = 'DISCOVERY - ' + discoveryQuestions[index].title.replace(/Question \d+: /, '');
      } else {
        const defIndex = index - discoveryQuestions.length;
        const defQ = definingQuestions[defIndex];
        category = `DEFINING - ${defQ.category ? defQ.category + ': ' : ''}` + defQ.title.replace(/Question \d+: /, '');
      }
      return `${category}: ${answer}`;
    }
    return null;
  }).filter(Boolean).join('\n'); // filter(Boolean) removes nulls

  const summaryPrompt = `
        Summarize the student's problem into ONE concise, validating summary (max 2-3 sentences). 
        The summary must integrate the following data points into a clear narrative:
        
        ${dataPoints}
        
        Example: "In the Oforikrom area, many young graduates face joblessness due to limited access to practical training. This situation affects income stability and community growth. Addressing it could empower local youth and reduce underemployment."
        
        Respond only with the summary text.
    `;

  const summaryInstruction = `You are a supportive mentor. Your output must be a single, validating summary paragraph (max 2-3 sentences). Your tone must be validating and smooth. Do not add any intro or outro text like "Here is the summary:".`;

  return callGeminiAPI(summaryInstruction, summaryPrompt);
}
// --- [END UPDATED PROMPT] ---

async function generateProfileSummary() {
  // Write state to window.session
  window.session.phase_completed = "3"; // [NEW] Mark phase as complete
  window.session.profile_generated = true;
  renderStep3Completion();

  const outputDiv = document.getElementById('profile-output');
  const generateButton = document.getElementById('generate-profile-btn');

  if (!outputDiv || !generateButton) return;

  outputDiv.innerHTML = `<div class="flex items-center justify-center space-x-2 text-indigo-700">
                            <div class="h-4 w-4 border-2 border-t-2 border-t-indigo-500 border-gray-200 rounded-full animate-spin"></div>
                            <span>Analyzing purpose...</span>
                        </div>`;
  generateButton.disabled = true;

  // Read state from window.session
  // [FIX] Update index for answers (0-22) and skills (23)
  const problemStatement = `Problem: Q1: ${window.session.answers[0]} | Q2: ${window.session.answers[1]} | Q9: ${window.session.answers[8]}`;
  const skillsData = window.session.answers[questions.length] || { tags: [], optionalText: '' }; // Index 23
  const skills = `Skills: ${skillsData.tags?.map(id => skillTags.find(s => s.id === id)?.label).join(', ') || ''}. Optional: ${skillsData.optionalText || ''}`;

  const systemInstruction = `You are an inspirational pathfinder for Ghanaian students. Generate:
    1. An aspirational Mission Title (5-7 words max).
    2. A single encouraging sentence about their path.
    Format: [MISSION TITLE] | [PATH SUMMARY]`;

  const userQuery = `Student Profile:\n${problemStatement}\n${skills}`;
  const rawResponse = await callGeminiAPI(systemInstruction, userQuery);

  const [title, summary] = rawResponse.split('|').map(s => s.trim());

  if (title && summary) {
    outputDiv.innerHTML = `
            <p class="text-lg font-extrabold text-indigo-800 tracking-wide">${title}</p>
            <p class="text-sm text-gray-700 mt-2">${summary}</p>
            <p class="text-xs text-green-600 mt-3">✨ Powered by Gemini</p>
        `;
  } else {
    outputDiv.innerHTML = `<p class="text-red-500">Error generating profile. Please try again.</p>`;
    generateButton.disabled = false;
  }

  // Save session after profile generation
  await saveSession();
}

// --- HANDLERS ---

function handleTagClick(event) {
  const tagElement = event.target.closest('.tag-pill');
  if (!tagElement) return;

  const tagId = tagElement.dataset.tagId;

  // Write state to window.session
  if (window.session.selected_skills.includes(tagId)) {
    window.session.selected_skills = window.session.selected_skills.filter(id => id !== tagId);
  } else {
    if (window.session.selected_skills.length < 5) {
      window.session.selected_skills.push(tagId);
    }
  }
  renderStep2();
}

// --- [FIXED FUNCTION] ---
async function handleNext() {
  // Read/Write state from window.session
  console.log("handleNext called - currentStepIndex:", window.session.current_step_index, "contextSubStep:", window.session.context_sub_step, "phaseIntroSubStep:", window.session.phase_intro_sub_step);

  if (window.session.current_step_index === -1) {
    // --- Handle Name Capture ---
    if (window.session.context_sub_step === 0) {
        const nameInput = document.getElementById('student_name_input');
        const studentName = nameInput?.value.trim() || '';
        if (studentName.length < 2) {
            alert("Please enter your first name.");
            return;
        }
        window.session.student_name = studentName;
    }
    // --- [END NEW] ---

    if (window.session.context_sub_step < 5) { // [FIX] This is now 5
      window.session.context_sub_step++;
      console.log("Moving to context substep:", window.session.context_sub_step);
    } else {
      window.session.current_step_index = 0;
      window.session.context_sub_step = 0; // Reset this
      window.session.phase_intro_sub_step = 0;
      currentPhase = '1A';
      console.log("Moving to Phase 1A intro");
    }
    renderStep();
    await saveSession(); // Save progress
    return;
  }

  // [THIS IS THE FIX]
  // This block handles clicking "Continue" on an intro screen
  if (window.session.current_step_index < questions.length && window.session.phase_intro_sub_step === 0) {
    window.session.phase_intro_sub_step = -1; // Hide the intro screen
    console.log("Starting questions from phase intro");
    renderStep(); // Re-render to show the first question
    await saveSession(); // Save progress
    return; // Stop execution here
  }
  // [END FIX]

  // [FIX] Updated boundary
  if (window.session.current_step_index < questions.length) { // 0-22
    const q = questions[window.session.current_step_index];
    const textarea = document.getElementById(q.id);
    const answer = textarea?.value.trim() || '';

    if (!answer) {
      alert("Please write your response first.");
      return;
    }

    // Set current question for session
    window.session.current_question = q.title;
    // saveSession is called in handleStudentMessage

    // Clear log if placeholder
    if (conversationLog.children.length === 1 && conversationLog.children[0].textContent.includes('mentor will appear')) {
      conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Conversation log cleared.</p>`;
    }

    appendToLog('user', answer);

    if (expectingRefined) {
      // This is a refined response after nudge
      const needsMore = await checkThresholds(answer, q.title, q.id);
      if (needsMore) {
        // Still needs clarification
        expectingRefined = true;
        if (textarea) {
          textarea.value = '';
          textarea.focus();
        }
        await displayAINudge(answer, q.title, q.id);
        return;
      } else {
        // Refined response is good; proceed
        expectingRefined = false;
        await proceedToNext(answer); // This is async and saves
        return;
      }
    }

    // Normal case: check if needs initial nudge
    const needsMentor = await checkThresholds(answer, q.title, q.id);
    if (needsMentor) {
      expectingRefined = true;
      if (textarea) {
        textarea.value = '';
        textarea.focus();
      }
      await displayAINudge(answer, q.title, q.id);
      return;
    }

    // Initial response is good; proceed
    await proceedToNext(answer); // This is async and saves
    return;
  } else if (window.session.current_step_index === questions.length) { // 23
    if (window.session.selected_skills.length < 3) {
      alert("Please select at least 3 skill tags before continuing.");
      return;
    }

    const optionalText = document.getElementById('s2_optional_text').value.trim();
    // Write state to window.session
    window.session.answers[window.session.current_step_index] = {
      tags: window.session.selected_skills,
      optionalText: optionalText
    };
    window.session.phase_completed = "2"; // [NEW] Mark phase as complete

    window.session.current_step_index++; // Move to 24
    renderStep();
    await saveSession(); // Save progress

  } else { // 24
    alert("Proceeding to Step 4: Academic Reality...");
    console.log("Final User Data:", window.session.answers);
  }
}
// --- [END FIXED FUNCTION] ---


async function handleBack() {
  // Read/Write state from window.session
  console.log("handleBack called - currentStepIndex:", window.session.current_step_index, "contextSubStep:", window.session.context_sub_step, "phaseIntroSubStep:", window.session.phase_intro_sub_step);

  // --- [NEW] Handle Back from Validation Screen ---
  if (window.session.awaiting_validation) {
    window.session.awaiting_validation = false;
    // We are already on index 18, so just re-render
    renderStep(); 
    await saveSession();
    return;
  }
  // --- [END NEW] ---

  if (window.session.current_step_index === -1) {
    if (window.session.context_sub_step > 0) {
      window.session.context_sub_step--;
    }
    renderStep();
    await saveSession(); // Save progress
    return;
  }

  // Handle backing from phase intros
  if (window.session.current_step_index < questions.length && window.session.phase_intro_sub_step === 0) {
    if (window.session.current_step_index === (discoveryQuestions.length + definingQuestions.length)) {
      // --- [NEW] From 1C intro (19) back to Validation Screen
      window.session.current_step_index = discoveryQuestions.length + definingQuestions.length - 1; // 18
      window.session.awaiting_validation = true; // <-- Re-open validation
    } else if (window.session.current_step_index === discoveryQuestions.length) {
      // From 1B intro (9) back to 1A's last question (8)
      window.session.current_step_index = discoveryQuestions.length - 1; // 8
    } else if (window.session.current_step_index === 0) {
      // From 1A intro (0) back to context
      window.session.current_step_index = -1;
      window.session.context_sub_step = 5; // [FIX] Go to last context step (now 5)
    }

    window.session.phase_intro_sub_step = -1;
    expectingRefined = false;
    // [FIX] REMOVED conversationLog.innerHTML
    renderStep();
    await saveSession(); // Save progress
    return;
  }

  // Handle backing from questions
  if (window.session.current_step_index >= 0 && window.session.current_step_index < questions.length) {
    
    // [FIX] Improved back logic to show intro screens
    if (window.session.current_step_index === (discoveryQuestions.length + definingQuestions.length)) {
      // From first 1C question (19) back to 1C intro
      window.session.phase_intro_sub_step = 0;
    } else if (window.session.current_step_index === discoveryQuestions.length) {
      // From first 1B question (9) back to 1B intro
      window.session.phase_intro_sub_step = 0;
    } else if (window.session.current_step_index === 0) {
      // From first 1A question (0) back to 1A intro
      window.session.phase_intro_sub_step = 0;
    } else {
      // Decrement to previous question
      window.session.current_step_index--;
    }
    
    // Handle edge case of backing from first question
    if (window.session.current_step_index === 0 && window.session.phase_intro_sub_step === 0) {
       // We are on 1A intro, back one more
       window.session.current_step_index = -1;
       window.session.context_sub_step = 5; // [FIX] Go to last context step (now 5)
    }


    expectingRefined = false;
    // [FIX] REMOVED conversationLog.innerHTML
    renderStep();
    await saveSession(); // Save progress
    return;
  }

  // Handle backing from Step 2 (skills)
  if (window.session.current_step_index === questions.length) { // 23
    window.session.current_step_index--; // Go to 22 (last 1C question)
    window.session.phase_intro_sub_step = -1;
    expectingRefined = false;
    // [FIX] REMOVED conversationLog.innerHTML
    renderStep();
    await saveSession(); // Save progress
    return;
  }

  // Handle backing from Step 3 (completion)
  if (window.session.current_step_index > questions.length) { // 24
    window.session.current_step_index = questions.length; // Go to 23 (Skills)
    renderStep();
    await saveSession(); // Save progress
    return;
  }
}

function updateNavigation() {
  // Read state from window.session
  if (window.session.current_step_index === -1 && window.session.context_sub_step === 0) {
    backButton.disabled = true;
  } else {
    backButton.disabled = false;
  }
  
  // [NEW] Hide nav buttons during validation
  if (window.session.awaiting_validation) {
    nextButton.style.display = 'none';
    backButton.style.display = 'none';
  } else {
    nextButton.style.display = 'inline-flex';
    backButton.style.display = 'inline-flex';
  }
}

// Original callGeminiAPI (kept for summaries and rephrases)
async function callGeminiAPI(systemInstruction, userQuery) {
  const payload = {
    contents: [{
      parts: [{
        text: userQuery
      }]
    }],
    systemInstruction: {
      parts: [{
        text: systemInstruction
      }]
    },
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

      const result = await response.json();
      const raw = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (raw && raw.length > 5) {
        return raw;
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


// --- [NEW FUNCTIONS] for Validation Screen ---

function toggleRefineEditor(show) {
    const panel = document.getElementById('refine-panel');
    const refineBtn = document.getElementById('validation-refine-btn');
    const approveBtn = document.getElementById('validation-approve-btn');
    if (panel) {
        if (show) {
            panel.classList.remove('hidden');
            refineBtn.style.display = 'none';
            approveBtn.style.display = 'none';
        } else {
            panel.classList.add('hidden');
            refineBtn.style.display = 'inline-flex';
            approveBtn.style.display = 'inline-flex';
        }
    }
}

async function handleRegenerateSummary() {
    console.log("Regenerating summary...");
    const btn = document.getElementById('regenerate-summary-btn');
    btn.disabled = true;
    btn.textContent = "Regenerating...";

    // 1. Get key indexes
    const who_idx = discoveryQuestions.length + 2; // q1b3_who (index 11)
    const what_idx = discoveryQuestions.length;     // q1b1_what (index 9)
    const why_idx = discoveryQuestions.length + 4;  // q1b5_why (index 13)

    // 2. Read new values from textareas
    const newWhat = document.getElementById('refine_what').value;
    const newWho = document.getElementById('refine_who').value;
    const newWhy = document.getElementById('refine_why').value;

    // 3. Save new values back into the session
    window.session.answers[what_idx] = newWhat;
    window.session.answers[who_idx] = newWho;
    window.session.answers[why_idx] = newWhy;

    // 4. Re-run summary generation
    const problemSummary = await generateFinalProblemSummary(...window.session.answers.slice(0, discoveryQuestions.length + definingQuestions.length));
    window.session.current_summary = problemSummary;

    // 5. Update UI
    const summaryDisplay = document.getElementById('summary-display');
    if (summaryDisplay) {
        summaryDisplay.innerHTML = `<p class="text-gray-700 italic">${problemSummary}</p>`;
    }

    // 6. Reset buttons
    btn.disabled = false;
    btn.textContent = "Re-generate Summary with My Changes";
    toggleRefineEditor(false); // Hide the panel and show approve/refine buttons
    
    await saveSession();
}

async function handleValidationApproval() {
    console.log("Summary approved. Moving to Phase 1C.");
    
    window.session.awaiting_validation = false;
    window.session.current_step_index++; // Move to 19
    window.session.phase_intro_sub_step = 0; // Trigger 1C intro
    window.session.phase_completed = "1B-Val"; // [NEW] Mark validation as complete
    
    renderStep();
    await saveSession();
}

// --- [END NEW FUNCTIONS] ---

// --- [NEW FEEDBACK MODAL FUNCTION] ---
function injectFeedbackUI() {
    // 1. Create the CSS for the modal
    const modalCSS = `
        #open-feedback-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #4F46E5; /* Indigo */
            color: white;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 28px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            cursor: pointer;
            z-index: 999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #feedback-modal-overlay {
            display: none; /* Hidden by default */
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.5);
        }
        #feedback-modal-content {
            background-color: #fefefe;
            margin: 10% auto;
            padding: 24px;
            border: 1px solid #888;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            font-family: system-ui, sans-serif;
        }
        #close-feedback-modal {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        #feedback-form-content label {
            display: block;
            font-weight: 600;
            margin-top: 16px;
            margin-bottom: 6px;
        }
        #feedback-form-content input[type="text"],
        #feedback-form-content input[type="number"],
        #feedback-form-content textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-sizing: border-box; /* Important */
        }
        #feedback-form-content textarea {
            height: 100px;
        }
        #feedback-form-content .radio-group label {
            font-weight: normal;
            display: inline-block;
            margin-right: 15px;
        }
        #feedback-form-content .rating-group label {
            font-weight: normal;
            display: inline-block;
            margin: 0 5px;
        }
        #feedback-submit-btn {
            background-color: #4F46E5;
            color: white;
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin-top: 20px;
        }
    `;

    // 2. Create the HTML for the button and modal
    const modalHTML = `
        <button id="open-feedback-btn" title="Give Feedback">💬</button>
        
        <div id="feedback-modal-overlay">
            <div id="feedback-modal-content">
                <span id="close-feedback-modal">&times;</span>
                <h2 style="margin-top:0;">Give Feedback</h2>
                <p style="font-size: 14px; color: #555;">Help us improve this tool for you!</p>
                
                <form id="feedback-form-content" action="https://formsubmit.co/${'gabriel.k.anapey@gmail.com'}" method="POST">
                    <input type="hidden" name="_subject" value="New Pathfinder App Feedback!">
                    <input type="hidden" name="_autoresponse" value="Thank you for your valuable feedback! We've received it.">
                    
                    <label>1. How would you rate your experience today?</label>
                    <div class="rating-group">
                        <label><input type="radio" name="rating-experience" value="1 - Frustrating"> 1 (Frustrating)</label>
                        <label><input type="radio" name="rating-experience" value="2 - Confusing"> 2</label>
                        <label><input type="radio" name="rating-experience" value="3 - Okay"> 3 (Okay)</label>
                        <label><input type="radio" name="rating-experience" value="4 - Helpful"> 4</label>
                        <label><input type="radio" name="rating-experience" value="5 - Great!"> 5 (Great!)</label>
                    </div>

                    <label>2. On a scale of 0-10, how likely are you to recommend this to a friend?</label>
                    <input type="number" name="rating-recommend" min="0" max="10" placeholder="0 (No way) to 10 (Definitely!)">

                    <label>3. How easy was it to understand what to do next?</label>
                    <div class="radio-group">
                        <label><input type="radio" name="clarity" value="Very Easy"> Very Easy</label>
                        <label><input type="radio" name="clarity" value="Okay"> Okay, I figured it out</label>
                        <label><input type="radio" name="clarity" value="Confusing"> A little confusing</label>
                    </div>

                    <label>4. Did the mentor feel helpful and encouraging?</label>
                    <div class="radio-group">
                        <label><input type="radio" name="mentor-helpful" value="Yes, very!"> Yes, very!</label>
                        <label><input type="radio" name="mentor-helpful" value="Sometimes"> Sometimes</label>
                        <label><input type="radio" name="mentor-helpful" value="No, not really"> No, not really</label>
                    </div>
                    
                    <label for="feedback-change">5. What is the one thing you would change or add?</label>
                    <textarea id="feedback-change" name="change-one-thing"></textarea>
                    
                    <label for="feedback-favorite">6. What was your favorite or most helpful part?</label>
                    <textarea id="feedback-favorite" name="favorite-part"></textarea>

                    <button id="feedback-submit-btn" type="submit">Send Feedback</button>
                </form>
            </div>
        </div>
    `;

    // 3. Inject CSS and HTML
    document.head.insertAdjacentHTML('beforeend', `<style>${modalCSS}</style>`);
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 4. Add Event Listeners
    const modal = document.getElementById('feedback-modal-overlay');
    
    document.getElementById('open-feedback-btn').addEventListener('click', () => {
        modal.style.display = "block";
    });
    
    document.getElementById('close-feedback-modal').addEventListener('click', () => {
        modal.style.display = "none";
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) { // Clicked on the dark background
            modal.style.display = "none";
        }
    });
}
// --- [END NEW FEEDBACK FUNCTION] ---

// --- APP INITIALIZATION ---

function initApp() {
  console.log("Initializing app...");
  container = document.getElementById('path-finder-container');
  nextButton = document.getElementById('next-button');
  backButton = document.getElementById('back-button');
  // [FIX] We target the PARENT element to take full control of the text
  currentStepSpan = document.getElementById('current-step').parentElement; 
  conversationLog = document.getElementById('conversation-log');

  if (!container || !nextButton || !backButton || !currentStepSpan || !conversationLog) {
    console.error("Failed to find required DOM elements!");
    return;
  }

  // --- [NEW] Inject the Feedback Button & Modal UI ---
  injectFeedbackUI();
  // --- [END NEW] ---

  console.log("DOM elements found, attaching event listeners");
  nextButton.addEventListener('click', handleNext);
  backButton.addEventListener('click', handleBack);

  // initializeFirebase now loads all progress.
  initializeFirebase().then(() => {
    // --- [NEW] Welcome Back Message ---
    const name = window.session.student_name;
    const topic = window.session.previous_topic;
    
    if (name && window.session.current_step_index > 0) {
        conversationLog.innerHTML = ''; // Clear placeholder
        
        if (topic) {
            // [NEW] Mentor Memory Thread
            appendToLog('mentor', `Welcome back, ${name}! Last time, we started talking about ${topic}. Let's build on that thought.`);
        } else {
            // Fallback generic welcome
            appendToLog('mentor', `You are back ${name}, every single action helps to make your purpose clearer.`);
        }
    }
    // --- [END NEW] ---
    
    console.log("Firebase initialized, rendering saved step.");
    renderStep();
  });
}

window.addEventListener('DOMContentLoaded', initApp);