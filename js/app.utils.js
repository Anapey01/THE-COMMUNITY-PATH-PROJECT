// js/app.utils.js
// Helper functions, e.g. appendMessage(), randomReply()
// Note: appendMessage is now in app.chat.js, but other utils here

// --- GEMINI API Configuration (Mandatory) ---
const apiKey = "AIzaSyAKpsPDtMTjbdkoyLLBf9y-J3rOS5mkyEc"; // This should be secured
const LLM_MODEL = "gemini-2.5-flash";
export const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${apiKey}`;

// --- [NEW] Default Session State ---
export const newSessionState = {
    memory: {
      focus_points: [], open_questions: [], clarified_terms: {},
      student_name: null, current_lens: null, topic_focus: null, last_student_response: null
    },
    current_question: null,
    current_lens: null,
    student_name: null,
    mentor_name: null,
    current_step_index: -4, // -4:name, -3:intro, -2:vid1, -1:vid2, 0:welcome, 1:sdg_ack, 2:choice, 3:ready?, 4:context, 5+:chat_q
    answers: [],
    selected_skills: [],
    profile_generated: false,
    awaiting_validation: false, // Flag for the refine loop
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
export const THRESHOLDS = {
  RELEVANCE: 0.50,
  SPECIFICITY: 0.45,
  COMPLETENESS: 0.50,
  SHORT_LENGTH: 8,
  CONFUSION_KEYWORDS: ["maybe", "kinda", "I don't know", "not sure", "stuff", "things", "etc"],
  READINESS_THRESHOLD: 0.70, // Min score to proceed without intervention
  MAX_INTERVENTIONS: 3 // Max nudges per question
};

// Helpers
export function wordsCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
export function cosine(a, b) {
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
export function keywordOverlap(textA, textB) {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = textB.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let overlap = 0;
  wordsB.forEach(w => {
    if (wordsA.has(w)) overlap++;
  });
  return overlap / Math.max(wordsA.size, 1);
}
// [NEW] Helper for time-based greeting
export function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}
// [NEW] Helper for dynamic "don't you think"
export function getDynamicConfirmation() {
    const phrases = [
        "That's amazing. Personally, I think that's the first step to finding a problem you care about. Don't you also think same?",
        "Exactly. Taking a moment to set our focus is the best way to start. It really helps to clear your mind, doesn't it?",
        "I agree. It's important to be in the right mindset first. This is the foundation for all the great ideas to come, don't you think?"
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
}
// [NEW] Helper for human-like delay
export function mentorThinking() {
    // Returns a promise that resolves after a random delay
    return new Promise(r => setTimeout(r, 800 + Math.random() * 1000));
}
// [NEW] Dynamic Scaffolding Prompts
export function getDynamicScaffoldingPrompt(action) {
    const clarifyPrompts = [
        "Ask one concise clarifying question focused on what's unclear. Start with 'That's an interesting point, can you tell me more about...'",
        "Help the user go deeper. Ask a 'what' or 'how' question about their last statement.",
        "Ask for a specific example. Start with 'I see. Could you give me an example of what you mean?'",
        "Encourage them to elaborate on one part of their answer. e.g., 'You mentioned [topic], could you expand on that a bit?'"
    ];
    const expandPrompts = [
        "Invite the student to give one specific example. Ask one open question only.",
        "Gently ask for more detail. e.g., 'That's a good start. What else comes to mind?'",
        "Ask an open-ended question to get them to add more. e.g., 'And what does that look like in your community?'"
    ];
    if (action === 'clarify') {
        return clarifyPrompts[Math.floor(Math.random() * clarifyPrompts.length)];
    }
    if (action === 'invite_expand') {
        return expandPrompts[Math.floor(Math.random() * expandPrompts.length)];
    }
    // Fallback for other actions
    return "Ask one concise clarifying question.";
}

// New: Readiness Assessor (lightweight LLM call)
export async function assessReadiness(questionTitle, studentAnswer) {
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
export async function analyzeInput(studentMessage, currentQuestion) {
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
export function decideAction(signals, currentQuestion) {
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
// [MODIFIED] Micro-instruction Composer (tuned for neutral Ghanaian context)
export function composeMicroInstruction(action, studentMessage, sessionMemory, currentQuestion) {
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
    invite_expand: getDynamicScaffoldingPrompt('invite_expand'), // [NEW] Dynamic
    clarify: getDynamicScaffoldingPrompt('clarify'), // [NEW] Dynamic
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
export function summarizeTextShort(text) {
  // [FIX] Handle potential undefined text
  if (!text) return "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 12) return text.trim() || '';
  return words.slice(0, 12).join(' ') + '...';
}
export function updateMemory(memory, studentMessage, inferredLens = null) {
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
export function filterLLMOutput(text, microInstruction) {
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
export async function rephraseCurrentQuestion(currentQuestion, studentMessage) {
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
// [MODIFIED] Smart Transition (Active Listening) - No next question
export async function generateSmartTransition(priorAnswer) {
  const systemInstruction = `You are a supportive peer mentor for Ghanaian students. Your task is to provide a brief, natural, and validating acknowledgement of the student's previous answer.
  1. Briefly and warmly acknowledge their answer.
  2. You can paraphrase their key insight in one short sentence to show you understood.
  3. **DO NOT** ask the next question. Just provide the acknowledgement.
  Use neutral Ghanaian English. Be very concise (max 1-2 short sentences total). Do not use markdown.`;
  // [FIX] Pass only the prior answer.
  const userQuery = `Previous Answer: "${priorAnswer}"`;
  try {
    const transitionText = await callGeminiAPI(systemInstruction, userQuery);
    if (transitionText && transitionText.length > 5 && !transitionText.includes("REPHRASE")) {
      return transitionText;
    } else {
      console.warn("Smart transition failed, using template fallback.");
      return `That's a great point.`;
    }
  } catch (error) {
    console.error("Error in generateSmartTransition:", error);
    return `That's a very clear point.`;
  }
}
// Updated LLM Runner using Gemini
export async function callLLM(runtimePayload, isFallbackCheck = false) {
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
// [NEW] AI-powered welcome chat function
export async function getConversationalReply(userInput, contextGoal) {
    const mentorName = window.session.mentor_name || "Mentor";
    const studentName = window.session.student_name || "Student";
    const systemInstruction = `You are ${mentorName}, a warm, empathetic, and human-like mentor for a Ghanaian student named ${studentName}.
You are currently in the *welcome phase* of a chat. Your goal is to be natural, listen, and make them feel comfortable before the 'real' questions begin.
**RULES:**
1. **Be Brief:** Use 1-2 short sentences.
2. **Be Human:** Be conversational, not robotic. Use light, appropriate emoji (like 😉 or 😊) if it feels natural.
3. **Listen (7Cs):** **Always** respond directly to what the user just said. Be Clear, Concise, and Courteous.
4. **Sentiment Mirroring:** Reflect the user's emotional tone. If they are tired, acknowledge it. If they are excited, share that.
5. **No 'But':** Use constructive feedback. Instead of "That's good, but...", say "That's a great point, and we can..."
6. **Fallback:** If the user's response is unclear (e.g., "askjdf"), gently ask for clarification (e.g., "Sorry, I didn't quite catch that.")
7. **One Turn At A Time:** Your response MUST NOT combine multiple steps. Just achieve the current goal and STOP.
8. **Follow the Goal:** Your reply MUST achieve the "CURRENT GOAL".
**Context:**
- The last 3 messages (if any) will be provided.
- You are leading the user to the first question of Phase 1.
**CURRENT GOAL:** ${contextGoal}
`;
    // [NEW] Context Embedding (Point 3)
    const history = window.session.chat_history.slice(-3); // Get last 3 messages
    const context = history.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
   
    const userQuery = `**Conversation History:**\n${context}\n\n**User's last message:** "${userInput}"`;
    try {
        const response = await callGeminiAPI(systemInstruction, userQuery);
        return response;
    } catch (error) {
        console.error("Conversational reply failed:", error);
        // Fallback for critical error
        return "I see. Shall we continue?";
    }
}
// Full Handler (for Q&A Scaffolding)
export async function handleStudentMessage(studentMessage, session) {
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

// --- Core Application State & Logic ---
// 🧭 PHASE 1A – DISCOVERY (9 QUESTIONS)
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
export const purposeAnchorQuestions = [
    { id: 'q1c1_role', title: "Which role would you most prefer to take in addressing this issue?", helpText: "This helps you clarify how you naturally engage with change." },
    { id: 'q1c2_clarity', title: "On a scale of 1-5, how clear and meaningful does this problem feel to you right now?", helpText: "Helps track user clarity across iterations." },
    { id: 'q1c3_commitment', title: "Name one small, realistic action you could take in the next 2-4 weeks to move this problem forward.", helpText: "Translates intention into agency." },
    { id: 'q1c4_impact', title: "Imagine three years from now: what difference would your action make in your community?", helpText: "Anchors motivation in long-term purpose." }
];
// Total questions array (9 + 10 + 4 = 23)
export const questions = discoveryQuestions.concat(definingQuestions, purposeAnchorQuestions);
export const skillTags = [
    { id: 's1', label: 'Problem Solving' }, { id: 's2', label: 'Leadership' },
    { id: 's3', label: 'Mathematics/Science' }, { id: 's4', label: 'Creative Writing' },
    { id: 's5', label: 'Public Speaking' }, { id: 's6', label: 'Digital Design' },
    { id: 's7', label: 'Teamwork/Organizing' }, { id: 's8', label: 'Manual/Practical Skills' }
];
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

// --- Original callGeminiAPI (This is fine) ---
export async function callGeminiAPI(systemInstruction, userQuery) {
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

// Export saveSession from firebase for use here
import { saveSession } from './app.firebase.js';

// --- OTHER FUNCTIONS ---
export async function generateFinalProblemSummary() {
  // [MODIFIED] Pass the correct answers array
  const answers = window.session.answers;
  const dataPoints = answers.map((answer, index) => {
    // Note: The question index is now (index - 5)
    // We only use answers from index 5 (q0) up to 23 (last q of 1B)
    // [FIX] lastPhase1B_QuestionIndex = (discoveryQuestions.length + definingQuestions.length - 1) = 18
    // [FIX] lastPhase1B_step_index = 18 + 5 = 23
    const lastPhase1B_step_index = (discoveryQuestions.length + definingQuestions.length - 1) + 5; // 18 + 5 = 23
   
    if (index < 5 || index > lastPhase1B_step_index || !answer) return null; // Skip welcome messages
   
    const questionIndex = index - 5;
   
    if (questionIndex < discoveryQuestions.length + definingQuestions.length) {
      let category;
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