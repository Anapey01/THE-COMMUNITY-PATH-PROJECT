// --- GEMINI API Configuration (Mandatory) ---
const apiKey = "AIzaSyAKpsPDtMTjbdkoyLLBf9y-J3rOS5mkyEc"; // This should be secured
const LLM_MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${apiKey}`;

// --- PRD Compliance: Firebase Setup ---
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  setPersistence,
  browserLocalPersistence
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

// --- [NEW] Default Session State ---
const newSessionState = {
    memory: {
      focus_points: [], open_questions: [], clarified_terms: {},
      student_name: null, current_lens: null, topic_focus: null, last_student_response: null
    },
    current_question: null,
    current_lens: null,
    student_name: null,
    mentor_name: null,
    current_step_index: -4, // -4:name, -3:intro, -2:vid1, -1:vid2, 0:welcome, 1:sdg_ack, 2:choice, 3:context, 4:ready, 5+:chat_q
    answers: [],
    selected_skills: [],
    profile_generated: false,
    awaiting_validation: false,
    current_summary: "",
    previous_topic: null,  
    phase_completed: null,  
    created_at: null,  
    updated_at: null,
    has_rewatched: false, // Flag for re-welcome message
    chat_history: [] // [NEW] To store messages for reply
};

// --- STUDENT-LED SCAFFOLDING INTEGRATION ---
// Tunable thresholds
const THRESHOLDS = {
  RELEVANCE: 0.50,
  SPECIFICITY: 0.45,
  COMPLETENESS: 0.50,
  SHORT_LENGTH: 8,
  CONFUSION_KEYWORDS: ["maybe", "kinda", "I don't know", "not sure", "stuff", "things", "etc"],
  READINESS_THRESHOLD: 0.70, // Min score to proceed without intervention
  MAX_INTERVENTIONS: 3 // Max nudges per question
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

// [NEW] Helper for time-based greeting
function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
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
    max_words: 25
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
  } [action] || 25;

  return ms;
}

// Memory Updater
function summarizeTextShort(text) {
  // [FIX] Handle potential undefined text
  if (!text) return "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 12) return text.trim() || '';
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
  const sentences = cleaned.split(/[.!?]+/).map(s => s.trim() + '.').filter(s => s.length > 10);
  let wordCount = 0;
  let filtered = '';
  for (let sentence of sentences) {
    const sentWords = wordsCount(sentence);
    if (wordCount + sentWords > microInstruction.max_words) break;
    filtered += (filtered ? ' ' : '') + sentence;
    wordCount += sentWords;
  }
  if (!/[.?!]$/.test(filtered)) filtered += "?";
  return filtered || cleaned.substring(0, microInstruction.max_words) + '?';
}

// New: Smart Rephrase for Fallbacks
async function rephraseCurrentQuestion(currentQuestion, studentMessage) {
  const systemInstruction = `You are a warm, supportive mentor for Ghanaian students. Rephrase this question to provide context and meaning, weaving in the student's recent thought warmly without answering it or adding facts. Keep neutral Ghanaian English, evoke emotions/values, end with a question. Max 25 words.`;
  const userQuery = `Original Question: "${currentQuestion}"\nStudent's Recent Thought: "${studentMessage}"\nRephrase to guide gently.`;

  try {
    const response = await callGeminiAPI(systemInstruction, userQuery);
    return filterLLMOutput(response, {
      max_words: 25
    });
  } catch (error) {
    console.error('Rephrase failed:', error);
    const summary = studentMessage.split('.')[0].trim();
    const simpleRephrase = `Building on your insight about ${summary}, how does this connect to your personal values or emotions in your community?`;
    return simpleRephrase;
  }
}

// Smart Transition (Active Listening)
async function generateSmartTransition(priorAnswer, nextQuestionTitle) {
  const systemInstruction = `You are a supportive peer mentor for Ghanaian students. Your task is to create a smooth, natural transition. 
  1. Briefly and warmly acknowledge the student's previous answer. 
  2. Paraphrase the key insight from their answer in one sentence to show you understood. 
  3. Clearly and grammatically introduce the next question. 
  Use neutral Ghanaian English. Be concise (max 2-3 sentences total). Do not use markdown.`;

  const userQuery = `Previous Answer: "${priorAnswer}"\nNext Question to Introduce: "${nextQuestionTitle}"`;

  try {
    const transitionText = await callGeminiAPI(systemInstruction, userQuery);

    if (transitionText && transitionText.length > 15 && transitionText.includes("?")) {
      return transitionText;
    } else {
      console.warn("Smart transition failed, using template fallback.");
      const rephrasedNext = nextQuestionTitle.charAt(0).toLowerCase() + nextQuestionTitle.slice(1);
      return `That's a great point. Now, let's think about this: ${rephrasedNext}?`;
    }
  } catch (error) {
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
    }
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
        return "REPHRASE_NEEDED";
      }

    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('LLM call failed:', error);
        return "REPHRASE_NEEDED";
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
    system_message: "You are a supportive peer mentor assistant for Ghanaian students. Prioritize student-led conversation. Follow any runtime instructions provided in the 'micro_instruction' field. Be brief, clear, non-judgemental, warm, and use neutral Ghanaian English (e.g., reference shared values like community unity or resilience across Ghana's diverse groups). Do not use specific ethnic languages or references. Do not invent facts. Always stay on the current question; do not jump to later topics like solutions, causes, or efforts.",
    micro_instruction: micro,
    memory_snapshot: micro.memory_snapshot,
    student_message: studentMessage
  };

  let llmText = await callLLM(runtimePayload);

  if (llmText === "REPHRASE_NEEDED") {
    console.warn('Fallback triggered; generating contextual rephrase.');
    llmText = await rephraseCurrentQuestion(session.current_question, studentMessage);
  }

  llmText = filterLLMOutput(llmText, micro);
  session.memory = updateMemory(session.memory, studentMessage, session.current_lens);
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
  // Default state is defined globally as newSessionState
  try {
    if (Object.keys(firebaseConfig).length) {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
      
      await setPersistence(auth, browserLocalPersistence);

      if (initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
      } else {
        await signInAnonymously(auth);
      }
      userId = auth.currentUser.uid;
      console.log("Firebase initialized successfully");

      const sessionRef = doc(db, 'sessions', userId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        window.session = { ...newSessionState,
          ...data,
          memory: { ...newSessionState.memory,
            ...(data.memory || {})
          },
          chat_history: data.chat_history || [] // [NEW] Load chat history
        };
        // [FIX] If user quit during onboarding, restart onboarding
        if (window.session.current_step_index < 0) {
            window.session.current_step_index = -4; // Restart at name capture
        }
        console.log("Loaded existing session from step:", window.session.current_step_index);
      } else {
        // No session found, use the brand new state
        window.session = { ...newSessionState }; // Use a copy
        window.session.created_at = new Date().toISOString();
        const mentorNames = ["Kofi", "Yaw", "Sam", "Ama", "Adwoa"];
        window.session.mentor_name = mentorNames[Math.floor(Math.random() * mentorNames.length)];
        console.log("No existing session, starting new one.");
      }
    } else {
      // Standalone mode
      console.log("Firebase config not provided, running in standalone mode");
      window.session = { ...newSessionState }; // Use a copy
      window.session.created_at = new Date().toISOString();
      const mentorNames = ["Kofi", "Yaw", "Sam", "Ama", "Adwoa"];
      window.session.mentor_name = mentorNames[Math.floor(Math.random() * mentorNames.length)];
    }
  } catch (error) {
    // Error mode
    console.error("Firebase initialization or sign-in failed:", error);
    window.session = { ...newSessionState }; // CRITICAL: Ensure session exists
  }
}

async function saveSession() {
  if (db && userId) {
    try {
      const sessionRef = doc(db, 'sessions', userId);
      window.session.updated_at = new Date().toISOString();
      // [NEW] Save chat history to Firebase
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

// 🧭 PHASE 1A – DISCOVERY (9 QUESTIONS)
const discoveryQuestions = [
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
const definingQuestions = [
    { id: 'q1b1_what', category: 'What', title: "What exactly is the problem or issue you've identified?", helpText: "Define the core issue clearly." },
    { id: 'q1b2_where', category: 'Where', title: "Where does it happen most often? (Community, workplaces, schools, etc.)", helpText: "Narrow the location for focus." },
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
const purposeAnchorQuestions = [
    { id: 'q1c1_role', title: "Which role would you most prefer to take in addressing this issue?", helpText: "This helps you clarify how you naturally engage with change." },
    { id: 'q1c2_clarity', title: "On a scale of 1-5, how clear and meaningful does this problem feel to you right now?", helpText: "Helps track user clarity across iterations." },
    { id: 'q1c3_commitment', title: "Name one small, realistic action you could take in the next 2-4 weeks to move this problem forward.", helpText: "Translates intention into agency." },
    { id: 'q1c4_impact', title: "Imagine three years from now: what difference would your action make in your community?", helpText: "Anchors motivation in long-term purpose." }
];


// Total questions array (9 + 10 + 4 = 23)
const questions = discoveryQuestions.concat(definingQuestions, purposeAnchorQuestions);

const skillTags = [
    { id: 's1', label: 'Problem Solving' }, { id: 's2', label: 'Leadership' },
    { id: 's3', label: 'Mathematics/Science' }, { id: 's4', label: 'Creative Writing' },
    { id: 's5', label: 'Public Speaking' }, { id: 's6', label: 'Digital Design' },
    { id: 's7', label: 'Teamwork/Organizing' }, { id: 's8', label: 'Manual/Practical Skills' }
];

// --- Phase Intro Text Objects ---
const phase1AIntro = {
  title: "THE FIRST SPARK",
  purpose: "To help the participant identify a real problem in their community that sparks curiosity, how they came to notice it, and how it affects people around them in a culturally relevant way.",
  facilitatorFlow: "So, to start, let's focus on what you've personally noticed in your community that ignites your curiosity."
};

const phase1BIntro = {
  title: "UNDERSTANDING THE 'WHY'",
  purpose: "To move from storytelling and observation to a structured understanding of the problem — identifying the \"who, where, why, and what\" clearly."
};

const phase1CIntro = {
  title: "FINDING YOUR ROLE",
  purpose: "To bridge your analysis of the problem with your personal motivation and sense of agency. This phase is about connecting the 'what' to the 'why you'."
};


// --- DOM Elements ---
let appContainer, appFooter, nextButton, backButton, currentStepSpan; // Main App
let conversationLog, chatForm, chatInput, sendButton; // Chat-specific
let replyPreviewContainer, replyPreviewName, replyPreviewText, cancelReplyBtn; // [NEW] Reply UI

// --- [NEW] Reply State ---
let currentReply = null; // { messageId, sender, text }


// --- [NEW] Main App Router ---

/**
 * Renders the correct UI based on the session's step index.
 * index < 0 is Onboarding
 * index >= 0 is Chat
 */
function renderApp() {
    if (!window.session) {
        console.error("Session not initialized. Cannot render app.");
        appContainer.innerHTML = "<p class='text-red-500'>Error: Session could not be loaded.</p>";
        return;
    }
    
    const index = window.session.current_step_index;

    if (index >= 0) {
        // --- CHAT MODE ---
        // User has completed onboarding, show the chat interface
        renderChatInterface();
        startChatConversation();
    } else {
        // --- ONBOARDING MODE ---
        // User is in the name/video flow
        renderOnboardingStep(index);
    }
}

/**
 * [NEW] Renders the static onboarding steps
 */
function renderOnboardingStep(index) {
    console.log("Rendering onboarding step:", index);
    
    // Ensure nav buttons are visible
    if (appFooter) appFooter.style.display = 'flex';
    if (nextButton) nextButton.textContent = "Continue"; // Default text
    
    let templateId = '';
    let greeting = '';
    
    switch(index) {
        case -4: // Name Capture
            templateId = 'template-context-name';
            currentStepSpan.textContent = "Welcome";
            break;
        case -3: // Context Intro
            templateId = 'template-context-intro';
            currentStepSpan.textContent = "The Big Picture";
            break;
        case -2: // SDG Video 1
            templateId = 'template-context-sdg-video';
            currentStepSpan.textContent = "Global Goals";
            break;
        case -1: // Final Video 2
            templateId = 'template-context-final-video';
            currentStepSpan.textContent = "Inspiration";
            if(nextButton) nextButton.textContent = "Start My Path"; // Final button text
            break;
        default:
            // Fallback to first step
            templateId = 'template-context-name'; 
            window.session.current_step_index = -4;
    }

    const template = document.getElementById(templateId);
    if (!template) {
        console.error("Template not found:", templateId);
        return;
    }
    
    appContainer.innerHTML = ''; // Clear container
    const content = template.content.cloneNode(true);
    
    // Populate placeholders
    if (index === -3) {
        greeting = window.session.student_name ? `${window.session.student_name}, to find your purpose,` : "To find your purpose,";
        const greetingEl = content.querySelector('[data-placeholder="greeting"]');
        if (greetingEl) greetingEl.textContent = greeting;
    }
    
    // Pre-fill name if we have it
    if (index === -4 && window.session.student_name) {
        const nameInput = content.querySelector('#student_name_input');
        if (nameInput) nameInput.value = window.session.student_name;
    }
    
    appContainer.appendChild(content);
    updateNavigation();
}

/**
 * [NEW] Injects the chat UI and hides the onboarding nav
 */
function renderChatInterface() {
    console.log("Rendering Chat Interface");
    // Hide onboarding footer
    if (appFooter) appFooter.style.display = 'none';

    // Get chat template
    const template = document.getElementById('template-chat-interface');
    if (!template) {
        console.error("Chat interface template not found!");
        return;
    }
    
    appContainer.innerHTML = ''; // Clear container
    const chatUI = template.content.cloneNode(true);
    appContainer.appendChild(chatUI);
    
    // Find new chat elements
    conversationLog = document.getElementById('conversation-log');
    chatForm = document.getElementById('chat-form');
    chatInput = document.getElementById('chat-input');
    sendButton = document.getElementById('send-button');
    
    // [NEW] Find reply elements
    replyPreviewContainer = document.getElementById('reply-preview-container');
    replyPreviewName = document.getElementById('reply-preview-name');
    replyPreviewText = document.getElementById('reply-preview-text');
    cancelReplyBtn = document.getElementById('cancel-reply-btn');
    
    // Attach chat listener
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmit);
    }
    
    // [NEW] Attach cancel reply listener
    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', cancelReply);
    }
    
    // [NEW] Attach reply listener to the whole log (event delegation)
    if (conversationLog) {
        conversationLog.addEventListener('click', handleLogClick);
    }
    
    currentStepSpan.textContent = "Mentor Chat";
}


// --- CONVERSATION LOG UTILITY ---

/**
 * [MODIFIED] Appends a message to the chat log
 * @param {string} sender - 'user' or mentor's name
 * @param {string} message - The text content (raw markdown)
 * @param {object} replyInfo - Optional: { messageId, sender, text }
 * @param {boolean} isTyping - If true, show typing indicator
 * @returns {string} The messageId of the created bubble
 */
function appendMessage(sender, message, replyInfo = null, isTyping = false) {
    if (!conversationLog) {
        console.warn("Conversation log not found, cannot append message.");
        return null; 
    }
    
    const isUser = sender === 'user';
    const senderName = isUser ? (window.session.student_name || 'You') : (sender || 'Mentor');
    
    const logItem = document.createElement('div');
    logItem.className = `p-3 rounded-xl shadow-sm ${isUser ? 'user-bubble' : 'ai-bubble'} max-w-[85%] text-sm`;
    logItem.style.wordBreak = 'break-word';
    
    // [NEW] Give every message a unique ID
    const messageId = `msg-${window.session.chat_history.length}`;
    logItem.dataset.messageId = messageId;
    logItem.dataset.senderName = senderName;
    logItem.dataset.messageText = message; // Store raw text for replying

    let messageHTML = '';

    // [NEW] Add quoted message block if this is a reply
    if (replyInfo) {
        messageHTML += `
            <div class="quoted-message" data-scroll-to-id="${replyInfo.messageId}">
                <p class="quoted-name">${replyInfo.sender}</p>
                <p>${replyInfo.text}</p>
            </div>
        `;
    }

    if (isTyping) {
        logItem.id = 'ai-typing-indicator';
        logItem.innerHTML = `<span class="font-semibold">${senderName}:</span> <span class="animate-pulse">...Thinking...</span>`;
    } else {
        // [FIX] Render markdown bold
        let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        messageHTML += `<span class="font-semibold">${senderName}:</span> ${formattedMessage}`;
        
        // [NEW] Add reply button (hidden by default, shown on hover via CSS)
        messageHTML += `
            <button class="reply-btn" title="Reply">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 011.06 0l3.5 3.5a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 01-1.06-1.06L9.94 7 7.793 4.854a.75.75 0 010-1.062L6.732 2.732c-.31-.31-.812-.31-1.122 0l-3.5 3.5a.75.75 0 000 1.06l3.5 3.5c.31.31.812.31 1.122 0l1.06-1.06a.75.75 0 010-1.06L5.06 7l2.146-2.146a.75.75 0 011.06 0l-1.59 1.59a.75.75 0 101.06 1.06l2.122-2.122a.75.75 0 011.06 0z" clip-rule="evenodd" />
                  <path d="M12.207 7.232a.75.75 0 011.06 0l3.5 3.5a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 01-1.06-1.06L14.94 13l-2.147-2.146a.75.75 0 010-1.062l-1.06-1.06c-.31-.31-.812-.31-1.122 0l-3.5 3.5a.75.75 0 000 1.06l3.5 3.5c.31.31.812.31 1.122 0l1.06-1.06a.75.75 0 010-1.06L10.06 13l2.146-2.146a.75.75 0 011.06 0l-1.59 1.59a.75.75 0 101.06 1.06l2.122-2.122a.75.75 0 011.06 0z" />
                </svg>
            </button>
        `;
        logItem.innerHTML = messageHTML;
    }

    const placeholder = conversationLog.querySelector('.text-gray-500');
    if (placeholder) {
        placeholder.remove();
    }
    
    conversationLog.appendChild(logItem);
    conversationLog.scrollTop = conversationLog.scrollHeight;
    
    // [NEW] Save message to session history (if it's not just typing)
    if (!isTyping) {
        window.session.chat_history.push({
            id: messageId,
            sender: senderName,
            text: message.replace(/\*\*(.*?)\*\*/g, '$1'), // Save un-bolded text for quotes
            rawText: message, // Save text with markdown
            replyInfo: replyInfo
        });
        return messageId; // [NEW] Return the ID
    }
    return null;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('ai-typing-indicator');
  if (indicator) indicator.remove();
}

// --- Scaffolding function adapted for chat ---
/**
 * [MODIFIED] Displays an AI nudge in the chat interface, quoting the user.
 */
async function displayAINudge(userText, currentQuestion, qId, userMessageReplyInfo) {
    const session = window.session;
    session.current_question = currentQuestion;
    
    appendMessage('mentor', '', null, true); // Typing...
    const result = await handleStudentMessage(userText, session);

    const currentCount = interventionCounts.get(qId) || 0;
    interventionCounts.set(qId, currentCount + 1);

    removeTypingIndicator();
    // [NEW] Pass the user's message as replyInfo
    appendMessage(session.mentor_name, result.assistant_reply, userMessageReplyInfo);
    
    if(chatInput) chatInput.disabled = false;
    if(sendButton) sendButton.disabled = false;
    if(chatInput) chatInput.focus();
}

async function checkThresholds(text, currentQuestion, qId) {
  const signals = await analyzeInput(text, currentQuestion);
  const decision = decideAction(signals, currentQuestion);

  const currentCount = interventionCounts.get(qId) || 0;
  const forceProceed = currentCount >= THRESHOLDS.MAX_INTERVENTIONS;

  console.log(`KPI → ${decision.action === 'minimal_validation' ? 'PASSED (Readiness: ' + signals.readiness_score + ')' : 'FAILED (' + decision.action + ', Count: ' + (currentCount + 1) + ')'}`);

  if (forceProceed) {
    console.log('Max interventions reached; forcing proceed.');
    return false; // Proceed even if not ideal
  }

  return decision.action !== 'minimal_validation' && decision.action !== 'no_intervene';
}


// --- CHAT LOGIC FUNCTIONS ---

/**
 * Kicks off the chat conversation
 */
function startChatConversation() {
    const name = window.session.student_name;
    const topic = window.session.previous_topic;

    if (!conversationLog) {
        console.error("Cannot start chat, conversation log not ready.");
        return;
    }
    conversationLog.innerHTML = ''; // Clear placeholder
    
    // [NEW] Render all existing chat history
    window.session.chat_history.forEach(msg => {
        // Re-create the bubble content from stored data
        appendMessage(msg.sender, msg.rawText, msg.replyInfo);
    });

    // Check if user is returning mid-conversation
    // [NEW] State shift: 5 is the first question
    if (topic && window.session.current_step_index >= 5) {
        // --- RETURNING USER (mid-conversation) ---
        appendMessage('mentor', `Welcome back, ${name}! Last time, we started talking about ${topic}. Let's build on that thought.`);
        setTimeout(askCurrentQuestion, 1500); // Ask question they left off on
    } else {
        // --- NEW USER or REWATCHER ---
        // Only ask welcome if chat history is empty
        if (window.session.chat_history.length === 0) {
            window.session.current_step_index = 0; // Ensure it's 0
            askCurrentQuestion(); // This will ask the welcome message
        } else {
            // User is returning but hasn't finished welcome, ask current question
            // (and re-enable input)
            askCurrentQuestion();
        }
    }
}


/**
 * Asks the question based on the current step index.
 * (This no longer handles onboarding)
 */
async function askCurrentQuestion() {
    const index = window.session.current_step_index;
    let questionAsked = false; // Flag to see if we asked a question
    const mentorName = window.session.mentor_name || "Mentor";
    
    // --- [NEW] Handle Chat Welcome Step ---
    if (index === 0) {
        const name = window.session.student_name || "friend";
        
        if (window.session.has_rewatched) {
            // --- User has rewatched ---
            appendMessage(mentorName, `Welcome back, ${name}. I believe you are ready now?`);
            window.session.current_step_index = 100; // Special state
        } else {
            // --- First-time welcome ---
            appendMessage(mentorName, `${getTimeGreeting()}, ${name}.`);
        }
        questionAsked = true; // We are waiting for a response
    
    } else if (index === 1) {
        // --- Ask about SDGs ---
        appendMessage(mentorName, `I see you've just finished reviewing the SDGs and those inspiring solutions. It's a lot to take in, isn't it?`);
        questionAsked = true;

    } else if (index === 2) {
        // --- Ask to Continue/Rewatch ---
        appendMessage(mentorName, "Are you ready to continue and start exploring your own purpose path, or would you like to go back and re-watch the videos? Just type **'continue'** or **'rewatch'**.");
        questionAsked = true;

    } else if (index === 3) {
        // --- Set Context ---
        appendMessage(mentorName, `Great. ${phase1AIntro.facilitatorFlow}`);
        await new Promise(r => setTimeout(r, 2000)); // Pause
        appendMessage(mentorName, "That's the first step to finding a problem you truly care about... don't you think?");
        questionAsked = true; // Waiting for "yes"

    } else if (index === 4) {
        // --- Ask First Question ---
        // This state is just a buffer, we move to state 5 to ask Q[0]
        window.session.current_step_index = 5;
        await saveSession(); // Save new index
        askCurrentQuestion(); // Ask questions[0]
        return; // Exit to avoid double-enabling input

    // --- Handle Phase Intros (for later phases) ---
    // Note: index is shifted by +5
    } else if (index === (discoveryQuestions.length + 5)) { // 9 + 5 = 14
        appendMessage(mentorName, `Great, that's Phase 1A done. Now for Phase 1B: ${phase1BIntro.purpose}`);
        await new Promise(r => setTimeout(r, 1500));
    
    } else if (index === (discoveryQuestions.length + definingQuestions.length + 5)) { // 9 + 10 + 5 = 24
        appendMessage(mentorName, `Excellent. Let's move to Phase 1C: ${phase1CIntro.purpose}`);
        await new Promise(r => setTimeout(r, 1500));
    }

    // --- Handle Asking the Question (Note the 'index - 5' shift) ---
    const questionIndex = index - 5; // 5 -> 0, 6 -> 1, etc.
    
    if (questionIndex >= 0 && questionIndex < questions.length) {
        const q = questions[questionIndex];
        window.session.current_question = q.title; 
        appendMessage(mentorName, q.title); 
        questionAsked = true;
        
        if (q.helpText) {
            setTimeout(() => appendMessage(mentorName, `(Hint: ${q.helpText})`), 1000);
        }
        interventionCounts.set(q.id, 0);

    } else if (questionIndex === questions.length) { // 23 + 5 = 28
        appendMessage(mentorName, "You've finished all the questions! Now, let's move to Step 2. What are 3-5 of your core skills or passions? You can just list them.");
        questionAsked = true;
    
    } else if (questionIndex > questions.length && index < 100) { // Check < 100 to avoid rewatch loop
        appendMessage(mentorName, "You've completed this part of the path!");
        if(chatInput) chatInput.disabled = true;
        if(sendButton) sendButton.disabled = true;
    }
    
    // Re-enable input
    if (questionAsked) {
        if(chatInput) chatInput.disabled = false;
        if(sendButton) sendButton.disabled = false;
        if(chatInput) chatInput.focus();
    }
}

/**
 * Handles user chat submissions.
 */
async function handleChatSubmit(event) {
    event.preventDefault();
    if (!chatInput) return; // Guard
    
    const userInput = chatInput.value.trim();
    if (userInput === '') return;

    // [NEW] Check if this is a reply
    const replyData = currentReply; 
    
    // [MODIFIED] Save the messageId
    const userMessageId = appendMessage('user', userInput, replyData);
    // [NEW] Create reply info for the mentor to use
    const userMessageReplyInfo = {
        messageId: userMessageId,
        sender: window.session.student_name || 'You',
        text: userInput
    };
    
    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;
    cancelReply(); // [NEW] Clear the reply state
    
    // --- STATE-BASED LOGIC ---
    const index = window.session.current_step_index;
    const lowerInput = userInput.toLowerCase();
    const positiveReply = ['yes', 'yep', 'ya', 'sure', 'ok', 'okay', 'ready', 'i am', 'i think so', 'continue'];
    const mentorName = window.session.mentor_name || "Mentor";
    
    // Add a slight, human-like delay
    await new Promise(r => setTimeout(r, 500 + Math.random() * 800)); // Variable delay

    if (index === 0) {
        // --- 1. User replied to "Good morning" ---
        window.session.current_step_index = 1;
        await saveSession();
        askCurrentQuestion(); // Asks about SDGs
        
    } else if (index === 1) {
        // --- 2. User replied to "isn't it?" ---
        window.session.current_step_index = 2;
        await saveSession();
        askCurrentQuestion(); // Asks "continue or rewatch?"
    
    } else if (index === 2) {
        // --- 3. Processing "Continue" or "Rewatch" ---
        if (lowerInput.includes('rewatch')) {
            // Send user back to onboarding
            window.session.current_step_index = -1; // Back to last video
            window.session.has_rewatched = true; // [NEW] Set rewatch flag
            await saveSession();
            renderApp(); // This will re-render the static onboarding
        } else {
            // Assume "continue"
            window.session.current_step_index = 3; // Move to "Set Context" step
            await saveSession();
            askCurrentQuestion(); // Asks "...don't you think?"
        }
    
    } else if (index === 3) {
        // --- 4. Processing "Ready for Q1" ---
        window.session.current_step_index = 5; // Move to first question (skipping 4)
        await saveSession();
        askCurrentQuestion(); // Asks questions[0]
        
    } else if (index >= 5 && (index - 5) < questions.length) {
        // --- 5. Processing a Question Answer ---
        const questionIndex = index - 5; // 5 -> 0, 6 -> 1
        const lastPhase1B_QuestionIndex = (discoveryQuestions.length + definingQuestions.length) - 1; // This is 18
        
        const q = questions[questionIndex];
        const needsNudge = await checkThresholds(userInput, q.title, q.id);

        if (needsNudge) {
            // --- A. Answer is weak, needs nudge ---
            expectingRefined = true;
            // [MODIFIED] Pass the user's message info for quoting
            await displayAINudge(userInput, q.title, q.id, userMessageReplyInfo);
            
        } else {
            // --- B. Answer is good, proceed ---
            expectingRefined = false;
            window.session.answers[questionIndex] = userInput; 
            if (questionIndex === 0) {
                 window.session.previous_topic = summarizeTextShort(userInput);
            }
            
            // [NEW] Check if this is the end of Phase 1B
            if (questionIndex === lastPhase1B_QuestionIndex) {
                // --- B.1. START VALIDATION ---
                appendMessage('mentor', '', null, true); // Typing...
                const summary = await generateFinalProblemSummary();
                window.session.current_summary = summary; // Save summary
                removeTypingIndicator();
                
                await new Promise(r => setTimeout(r, 1000));
                appendMessage(mentorName, "Great, you've defined the core problem. Here's a summary of your thoughts:", userMessageReplyInfo);
                await new Promise(r => setTimeout(r, 1500));
                appendMessage(mentorName, `"${summary}"`);
                await new Promise(r => setTimeout(r, 1500));
                appendMessage(mentorName, "Does that capture your idea correctly? Please type **'approve'** to continue, or **'refine'** to go back and change it.");
                
                window.session.current_step_index = 150; // Awaiting validation
                await saveSession();
                chatInput.disabled = false;
                sendButton.disabled = false;
                chatInput.focus();

            } else {
                // --- B.2. NORMAL TRANSITION ---
                appendMessage('mentor', '', null, true); // Typing...
                
                let transition;
                const nextQ = questions[questionIndex + 1];
                
                if (nextQ) {
                     transition = await generateSmartTransition(userInput, nextQ.title);
                } else {
                    transition = "Got it. That's a very clear point.";
                }
                
                await new Promise(r => setTimeout(r, 1000)); // Human delay
                removeTypingIndicator();
                // [MODIFIED] Pass user's message info so mentor can quote it
                appendMessage(mentorName, transition, userMessageReplyInfo); 
                
                window.session.current_step_index++; // e.g., 5 -> 6
                await saveSession();
                
                setTimeout(askCurrentQuestion, 2000); // Wait for transition, then ask
            }
        }
    
    } else if (index === 150) {
        // --- 6.A. Handling "Approve" or "Refine" ---
        if (lowerInput.includes('refine')) {
            appendMessage(mentorName, "No problem. Let's go back and redefine the core issue.");
            // 5 (start) + 9 (Phase 1A) = 14
            window.session.current_step_index = 14; // Start of Phase 1B
            await saveSession();
            setTimeout(askCurrentQuestion, 1500);
        } else {
            // Assume "approve"
            appendMessage(mentorName, "Excellent. Let's move on to Phase 1C and find your role in this.");
            // 5 (start) + 9 (1A) + 10 (1B) = 24
            window.session.current_step_index = 24; // Start of Phase 1C
            await saveSession();
            setTimeout(askCurrentQuestion, 1500);
        }

    } else if (index === 100) {
        // --- 6.B. Handling "Ready now?" after rewatch ---
        if (positiveReply.some(w => lowerInput.includes(w))) {
            window.session.current_step_index = 3; // Move to "Set Context"
            await saveSession();
            askCurrentQuestion();
        } else {
            appendMessage(mentorName, "No problem at all. Is there anything you're still unsure about?");
            window.session.current_step_index = 101; // Move to "why not"
            await saveSession();
            chatInput.disabled = false;
            sendButton.disabled = false;
            chatInput.focus();
        }

    } else if (index === 101) {
        // --- 6.C. User explained why they're not ready ---
        appendMessage(mentorName, "That's understandable. This session is all about exploring your own ideas, so there's no pressure. It's just a space for you to think.");
        await new Promise(r => setTimeout(r, 2000));
        appendMessage(mentorName, "Can we start now?");
        window.session.current_step_index = 102; // Move to final check
        await saveSession();
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
        
    } else if (index === 102) {
        // --- 6.D. Final check ---
         if (positiveReply.some(w => lowerInput.includes(w))) {
            window.session.current_step_index = 3; // Move to "Set Context"
            await saveSession();
            askCurrentQuestion();
        } else {
            appendMessage(mentorName, "That's alright. Feel free to re-watch again. I'll be here when you're ready.");
            window.session.current_step_index = 2; // Back to "continue/rewatch"
            await saveSession();
            chatInput.disabled = false;
            sendButton.disabled = false;
            chatInput.focus();
        }

    } else {
        // --- 7. Processing Skills or End of Convo ---
        appendMessage(mentorName, "Thanks! (Logic for this step is next).");
        chatInput.disabled = false;
        sendButton.disabled = false;
        await saveSession();
    }
}

// --- [NEW] REPLY HANDLERS ---

/**
 * Handles a click anywhere on the conversation log.
 * Checks if the click was on a reply button or a quoted message.
 */
function handleLogClick(event) {
    // Check for reply button first
    const replyButton = event.target.closest('.reply-btn');
    if (replyButton) {
        const messageBubble = event.target.closest('[data-message-id]');
        if (!messageBubble) return;

        const { messageId, senderName } = messageBubble.dataset;
        
        // Find the clean text from chat history
        const historyMessage = window.session.chat_history.find(m => m.id === messageId);
        const cleanText = historyMessage ? historyMessage.text : messageBubble.dataset.messageText; // Fallback
        
        initReply(messageId, senderName, cleanText);
        return; // Stop processing
    }

    // Check for quoted message click
    const quotedMessage = event.target.closest('.quoted-message');
    if (quotedMessage) {
        scrollToMessage(quotedMessage);
        return; // Stop processing
    }
}

/**
 * [NEW] Scrolls to the original message when a quote is clicked
 */
function scrollToMessage(quotedMessageElement) {
    const messageId = quotedMessageElement.dataset.scrollToId;
    if (!messageId) return;

    const originalMessage = conversationLog.querySelector(`[data-message-id="${messageId}"]`);
    if (originalMessage) {
        originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight
        originalMessage.classList.add('highlight');
        setTimeout(() => {
            originalMessage.classList.remove('highlight');
        }, 1500); // Highlight for 1.5 seconds
    }
}


/**
 * Sets the app state to "replying" and shows the preview UI.
 */
function initReply(messageId, sender, text) {
    currentReply = { messageId, sender, text: summarizeTextShort(text) }; // Use summary
    
    if (replyPreviewName) replyPreviewName.textContent = sender;
    if (replyPreviewText) replyPreviewText.textContent = summarizeTextShort(text);
    if (replyPreviewContainer) replyPreviewContainer.classList.remove('hidden');
    
    if (chatInput) chatInput.focus();
}

/**
 * Clears the reply state and hides the preview UI.
 */
function cancelReply() {
    currentReply = null;
    if (replyPreviewContainer) {
        replyPreviewContainer.classList.add('hidden');
        replyPreviewName.textContent = '';
        replyPreviewText.textContent = '';
    }
}


// --- [REVIVED] ONBOARDING HANDLERS ---

async function handleNext() {
    const index = window.session.current_step_index;
    
    // --- Handle Name Capture (only on this step) ---
    if (index === -4) {
        const nameInput = document.getElementById('student_name_input');
        if (!nameInput) {
            console.error("Name input not found!");
            return;
        }
        const studentName = nameInput.value.trim() || '';
        if (studentName.length < 2) {
            alert("Please enter your first name.");
            return; // Stop execution
        }
        window.session.student_name = studentName;
    }
    
    // Increment step
    if (index < -1) { // i.e., -4, -3, -2
        window.session.current_step_index++; // e.g., -4 -> -3
    } else if (index === -1) { // On the *last* onboarding step
        window.session.current_step_index = 0; // Go to chat mode
    }
    
    await saveSession();
    renderApp(); // Re-render at the new step
}

async function handleBack() {
    const index = window.session.current_step_index;
    if (index > -4) { // Only allow back if not on the first step
        window.session.current_step_index--; // e.g., -3 -> -4
        await saveSession();
        renderApp();
    }
}

function updateNavigation() {
    // This is for the onboarding buttons
    const index = window.session.current_step_index;
    if (backButton) {
        backButton.disabled = (index === -4); // Disable back on first step
    }
}


// --- OTHER FUNCTIONS ---
async function generateFinalProblemSummary() {
  // [MODIFIED] Pass the correct answers array
  const answers = window.session.answers;
  const dataPoints = answers.map((answer, index) => {
    // Note: The question index is now (index - 5)
    const questionIndex = index - 5;
    if (questionIndex < 0 || !answer) return null; // Skip welcome messages
    
    if (questionIndex < discoveryQuestions.length + definingQuestions.length) {  
      if (questionIndex < discoveryQuestions.length) {
        category = 'DISCOVERY - ' + discoveryQuestions[questionIndex].title.replace(/Question \d+: /, '');
      } else {
        const defIndex = questionIndex - discoveryQuestions.length;
        if(defIndex >= definingQuestions.length) return null;
        const defQ = definingQuestions[defIndex];
        category = `DEFINING - ${defQ.category ? defQ.category + ': ' : ''}` + defQ.title.replace(/Question \d+: /, '');
      }
      return `${category}: ${answer}`;
    }
    return null;
  }).filter(Boolean).join('\n'); 

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

async function generateProfileSummary() {
  window.session.phase_completed = "3";
  window.session.profile_generated = true;
  console.log("generateProfileSummary needs to be adapted for chat UI");
  
  appendMessage('mentor', '', null, true); // Typing...

  // Note: The question indices are shifted by 5
  const problemStatement = `Problem: Q1: ${window.session.answers[5]} | Q2: ${window.session.answers[6]} | Q9: ${window.session.answers[13]}`;
  const skillsData = window.session.answers[questions.length + 5] || { tags: [], optionalText: '' }; 
  const skills = `Skills: ${skillsData.tags?.map(id => skillTags.find(s => s.id === id)?.label).join(', ') || ''}. Optional: ${skillsData.optionalText || ''}`;

  const systemInstruction = `You are an inspirational pathfinder for Ghanaian students. Generate:
    1. An aspirational Mission Title (5-7 words max).
    2. A single encouraging sentence about their path.
    Format: [MISSION TITLE] | [PATH SUMMARY]`;
  const userQuery = `Student Profile:\n${problemStatement}\n${skills}`;
  const rawResponse = await callGeminiAPI(systemInstruction, userQuery);
  
  removeTypingIndicator();
  const [title, summary] = rawResponse.split('|').map(s => s.trim());

  if (title && summary) {
    appendMessage(window.session.mentor_name, `Here is your Purpose Profile:\n\n**${title}**\n${summary}`);
  } else {
    appendMessage(window.session.mentor_name, "Sorry, I had trouble generating your profile. Let's move on for now.");
  }
  
  await saveSession();
  
  appendMessage(window.session.mentor_name, "Next, we'll look at Step 4: Academic Reality...");
}

function handleTagClick(event) {
  console.log("handleTagClick needs re-wire");
}
function toggleRefineEditor(show) {
    console.log("Validation UI needs re-wire");
}
async function handleRegenerateSummary() {
    console.log("Validation UI needs re-wire");
}
async function handleValidationApproval() {
    console.log("Validation UI needs re-wire");
}


// --- Feedback Modal (This is fine) ---
function injectFeedbackUI() {
    const template = document.getElementById('template-feedback-modal');
    if (!template) return;
    
    const modalHTML = template.content.cloneNode(true);
    document.body.appendChild(modalHTML);

    const modal = document.getElementById('feedback-modal-overlay');
    const openBtn = document.getElementById('open-feedback-btn');
    const closeBtn = document.getElementById('close-feedback-modal');
    
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (modal) modal.style.display = "block";
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (modal) modal.style.display = "none";
        });
    }
    
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    }
}

// --- Original callGeminiAPI (This is fine) ---
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

// --- APP INITIALIZATION (MODIFIED) ---

function initApp() {
  console.log("Initializing hybrid app...");
  
  // Find MAIN app elements
  appContainer = document.getElementById('app-container');
  appFooter = document.getElementById('app-footer');
  nextButton = document.getElementById('next-button');
  backButton = document.getElementById('back-button');
  currentStepSpan = document.getElementById('current-step'); 

  if (!appContainer || !nextButton || !backButton || !currentStepSpan) {
    console.error("Failed to find required app DOM elements!");
    appContainer.innerHTML = "<p class='text-red-500'>Error: Application failed to load. Please refresh.</p>";
    return;
  }

  // --- Inject the Feedback Button & Modal UI ---
  injectFeedbackUI();
  // --- END ---

  console.log("Attaching onboarding listeners");
  nextButton.addEventListener('click', handleNext);
  backButton.addEventListener('click', handleBack);

  // [ROBUST FLOW]
  initializeFirebase()
    .catch((error) => {
        console.error("A critical error occurred during Firebase init:", error);
        // We ensure a fallback session exists even if Firebase fails
        if (!window.session) {
            window.session = { ...newSessionState };
        }
    })
    .finally(() => {
        // This will ALWAYS run, even if Firebase fails
        renderApp();
    });
}

window.addEventListener('DOMContentLoaded', initApp);