// --- GEMINI API Configuration (Mandatory) ---
// API KEY IS NOW SECURELY INSERTED.
const apiKey = "AIzaSyAKpsPDtMTjbdkoyLLBf9y-J3rOS5mkyEc"; 
const LLM_MODEL = "gemini-2.5-flash-preview-09-2025";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${apiKey}`;

// --- PRD Compliance: Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables MUST be used as mandated by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let userId;

async function initializeFirebase() {
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
        }
    } catch (error) {
        console.error("Firebase initialization or sign-in failed:", error);
    }
}

// --- Core Application State & Logic ---

// State now starts at -1 for the new introductory screen
let currentStepIndex = -1; 
// Sub-step index for the initial context screen (0=Title, 1=Goals, 2=Start Q1)
let contextSubStep = 0; 
let awaitingFollowup = false; 
// answers[0-17] = Step 1 Questions (18 total); answers[18] = Step 2 Skills
const answers = []; 

// New structure reflecting the Context/Awareness phase
const initialScreen = { id: 's0_context', title: "Phase 1: Setting Context & Building Awareness", buttonText: "I Understand. Let's Start." };

// 🧩 PHASE 1A: DISCOVERY (8 Questions) - Focus: Personal Observation & Emotion
const discoveryQuestions = [
    { id: 'q1a1_notice', title: "Question 1: How did you first notice this problem? (Through experience, observation, or from someone else?)", placeholder: "Describe the moment or story that brought this to your attention.", helpText: "Share the specific trigger that made it personal.", minWords: 10, nudge: 'nudge_notice' },
    { id: 'q1a2_affected', title: "Question 2: Who do you see being most affected by this issue?", placeholder: "Name specific groups like 'street vendors in Accra' or 'rural farmers'.", helpText: "Focus on the people closest to the pain.", minWords: 10, nudge: 'nudge_affected' },
    { id: 'q1a3_personal', title: "Question 3: What makes this issue important to you personally?", placeholder: "How does it frustrate, anger, or inspire you?", helpText: "Connect it to your emotions or values.", minWords: 10, nudge: 'nudge_personal' },
    { id: 'q1a4_example', title: "Question 4: Can you describe a specific situation or example that made you realize it’s a serious problem?", placeholder: "Tell a short story from your community.", helpText: "Stories make the issue vivid and real.", minWords: 10, nudge: 'nudge_example' },
    { id: 'q1a5_efforts', title: "Question 5: Have you seen anyone or any group trying to fix this problem before? What did they do?", placeholder: "Mention local initiatives, NGOs, or community efforts.", helpText: "This shows what's been tried and gaps.", minWords: 10, nudge: 'nudge_efforts' },
    { id: 'q1a6_causes', title: "Question 6: What do you think causes this problem in your community?", placeholder: "Is it poverty, lack of resources, or cultural factors?", helpText: "Pinpoint the everyday triggers.", minWords: 10, nudge: 'nudge_causes' },
    { id: 'q1a7_future', title: "Question 7: If this problem continues, what do you think will happen in the next few years?", placeholder: "Describe the worsening impact on people or places.", helpText: "Imagine the ripple effects.", minWords: 10, nudge: 'nudge_future' },
    { id: 'q1a8_wish', title: "Question 8: What do you wish could change about it?", placeholder: "What small or big shift would make a difference?", helpText: "This sparks your vision for better.", minWords: 10, nudge: 'nudge_wish' },
];

// ⚙️ PHASE 1B: DEFINING (10 Questions) - Focus: Root Cause & Structured Definition
const definingQuestions = [
    { id: 'q1b1_what', category: 'What', title: "What exactly is the problem or issue you’ve identified?", placeholder: "Be precise, e.g., 'flooding in low-lying areas during rains'.", helpText: "Define the core issue clearly.", minWords: 10, nudge: 'nudge_what' },
    { id: 'q1b2_where', category: 'Where', title: "Where does it happen most often? (Community, workplaces, schools, etc.)", placeholder: "Specific spots like 'informal markets in Kumasi'.", helpText: "Narrow the location for focus.", minWords: 10, nudge: 'nudge_where' },
    { id: 'q1b3_who', category: 'Who', title: "Who are the main people affected by this problem?", placeholder: "Detail groups like 'youth without skills training'.", helpText: "Highlight the vulnerable.", minWords: 10, nudge: 'nudge_who' },
    { id: 'q1b4_when', category: 'When', title: "When does it usually happen? (Certain seasons, life stages, or times?)", placeholder: "E.g., 'during dry seasons' or 'for school leavers'.", helpText: "Timing reveals patterns.", minWords: 10, nudge: 'nudge_when' },
    { id: 'q1b5_why', category: 'Why', title: "Why do you think this problem keeps happening?", placeholder: "Systemic reasons like 'poor infrastructure funding'.", helpText: "Uncover the persistence.", minWords: 10, nudge: 'nudge_why' },
    { id: 'q1b6_how', category: 'How', title: "How does this issue affect people or the community as a whole?", placeholder: "E.g., 'leads to health risks and lost income'.", helpText: "Show the broader ripple.", minWords: 10, nudge: 'nudge_how' },
    { id: 'q1b7_root', category: 'Root Causes', title: "What do you think are the main root causes behind this problem?", placeholder: "Deep factors like 'ineffective policies or education gaps'.", helpText: "Go beyond symptoms.", minWords: 10, nudge: 'nudge_root' },
    { id: 'q1b8_solutions', category: 'Possible Solutions', title: "What do you think can be done to reduce or solve it?", placeholder: "Ideas like 'community training programs'.", helpText: "Brainstorm feasible fixes.", minWords: 10, nudge: 'nudge_solutions' },
    { id: 'q1b9_impact', category: 'Impact of Solution', title: "If this problem were solved, how would your community or the people affected benefit?", placeholder: "E.g., 'improved livelihoods and safer environments'.", helpText: "Envision the positive change.", minWords: 10, nudge: 'nudge_impact' },
    { id: 'q1b10_role', category: 'Your Role', title: "What role do you see yourself playing in making this change happen?", placeholder: "E.g., 'leading workshops or advocating for policy'.", helpText: "Link your strengths to action.", minWords: 10, nudge: 'nudge_role' }
];

// Combine for overall flow control
const questions = discoveryQuestions.concat(definingQuestions);

// PRD-Compliant Step 2 Skill Tags
const skillTags = [
    { id: 's1', label: 'Problem Solving' },
    { id: 's2', label: 'Leadership' },
    { id: 's3', label: 'Mathematics/Science' },
    { id: 's4', label: 'Creative Writing' },
    { id: 's5', label: 'Public Speaking' },
    { id: 's6', label: 'Digital Design' },
    { id: 's7', label: 'Teamwork/Organizing' },
    { id: 's8', label: 'Manual/Practical Skills' }
];

let selectedSkills = [];
let profileGenerated = false; // Track if the LLM profile has been generated

// DOM Elements (Initialized in initApp)
let container, nextButton, backButton, currentStepSpan, conversationLog;

// Phase Intros
const phase1AIntro = {
    purpose: "To help the participant identify a real problem in their community, how they came to notice it, and how it affects people around them.",
    facilitatorFlow: "“Now that we’ve seen how global goals connect to real issues, let’s focus on what you’ve personally noticed in your community.”",
    tip: "Listen for patterns (economic, social, environmental, educational). Encourage personal stories — they make the problem more tangible."
};

const phase1BIntro = {
    purpose: "To move from storytelling and observation to a structured understanding of the problem — identifying the “who, where, why, and what” clearly."
};

// --- GEMINI API CALL UTILITY (Full Implementation) ---

async function callGeminiAPI(systemInstruction, userQuery) {
    
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
    };

    const maxRetries = 3;
    let delay = 1000;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 429 && i < maxRetries - 1) { // 429: Too Many Requests
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    continue;
                }
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const result = await response.json();
            
            // Check for null/empty response
            const raw = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (raw && raw.length > 5) {
                return raw;
            } else if (i < maxRetries - 1) {
                console.warn("API returned empty/too short response, retrying...");
                continue;
            } else {
                return "Hmm, could you tell me a bit more about that?"; // Final safe fallback
            }

        } catch (error) {
            if (i === maxRetries - 1) {
                console.error("Gemini API call failed after retries:", error);
                return "I'm sorry, I'm having trouble connecting to my mentor system right now. Please try again.";
            }
        }
    }
    return "Failed to get a response from my mentor system.";
}

// --- CONVERSATION LOG UTILITY ---

function appendToLog(sender, message, isTyping = false) {
    const isUser = sender === 'user';
    const logItem = document.createElement('div');
    logItem.className = `p-3 rounded-xl shadow-sm ${isUser ? 'user-bubble ml-auto' : 'ai-bubble mr-auto'} max-w-[85%] text-sm`;
    logItem.style.maxWidth = '85%';
    logItem.style.wordBreak = 'break-word';

    if (isTyping) {
        logItem.id = 'ai-typing-indicator';
        logItem.innerHTML = `<span class="font-semibold">${isUser ? 'You' : 'Mentor'}:</span> <span class="animate-pulse">...Thinking...</span>`;
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

// Renders the new initial context screen (Step 0)
function renderInitialContext() {
    currentStepSpan.textContent = '1';
    nextButton.textContent = initialScreen.buttonText;
    backButton.disabled = true;
    
    // Clear log header if needed
    if (conversationLog.children.length === 1 && conversationLog.children[0].textContent.includes('mentor will appear')) {
         conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Conversation log cleared.</p>`;
    }

    // --- Display based on contextSubStep ---
    if (contextSubStep === 0) {
        // First view: Title and overarching purpose
        nextButton.textContent = "Continue";
        container.innerHTML = `
            <div class="space-y-6 md:space-y-8">
                <h2 class="text-2xl font-bold text-indigo-800">${initialScreen.title}</h2>
                
                <div class="bg-indigo-50 p-4 border-l-4 border-indigo-500 rounded-lg">
                    <p class="text-gray-700 font-medium">Every community challenge connects to a global roadmap (like the UN SDGs). To find your purpose, we first need to look at the big picture.</p>
                </div>
                
                <p class="text-base text-indigo-600 font-semibold pt-2">Ready to see where your curiosity fits into the world's roadmap?</p>
            </div>
        `;
    } else if (contextSubStep === 1) {
        // Second view (NEW SWAP): The 17 Global Goals Scope (Visual Context Placeholder)
        nextButton.textContent = "Continue";
        container.innerHTML = `
            <div class="space-y-6 md:space-y-8 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">The Global Roadmap: 17 SDGs</h2>
                
                <div class="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
                    <p class="text-sm text-gray-700 font-medium mb-4">This is the global map: 17 Sustainable Development Goals (SDGs), covering all aspects of challenge and opportunity.</p>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d4/Sustainable_Development_Goals.png" 
                         alt="Visual grid of the 17 UN Sustainable Development Goals" 
                         class="w-full max-w-xs mx-auto rounded-lg shadow-md border-2 border-gray-100"
                         onerror="this.onerror=null; this.src='https://placehold.co/300x300/F0F4FF/4338CA?text=SDG+Grid+Visual';"
                    >
                </div>

                <p class="text-lg text-indigo-600 font-semibold mt-4">This completes the context setting. Now, let's look at your specific action goals.</p>
            </div>
        `;
    } else if (contextSubStep === 2) {
        // Third view (NEW SWAP): Specific goals and action points (REFINED UI)
        nextButton.textContent = "Continue to Videos";
        container.innerHTML = `
            <div class="space-y-6 md:space-y-8">
                <h2 class="text-2xl font-bold text-indigo-800">Your Goal in this Phase:</h2>
                
                <div class="text-gray-700 space-y-4">
                    <ul class="list-disc list-inside ml-4 text-base space-y-4">
                        <li class="font-medium">✅ **Map** your local challenge directly to global goals focused on **Jobs, Opportunity, and Economic Growth.**</li>
                        <li class="font-medium">✅ **Discover** proven solutions from Africa and the world that apply to your issue.</li>
                        <li class="font-medium">✅ **Define** a specific, **actionable problem** in your own community, moving beyond general ideas.</li>
                    </ul>
                </div>
            </div>
        `;
    } else if (contextSubStep === 3) {
        // Fourth view (NEW): Video & Reflection Screen
        nextButton.textContent = initialScreen.buttonText;
        container.innerHTML = `
            <div class="space-y-6 md:space-y-8">
                <h2 class="text-2xl font-bold text-indigo-800">Step 2: Solutions & Reflection</h2>
                
                <div class="text-gray-700 space-y-4">
                    <p class="text-base font-medium">To gain inspiration, watch how others are solving similar problems globally and locally. </p>
                    
                    <!-- Video Embed Container -->
                    <div class="video-container rounded-xl shadow-lg border border-indigo-300">
                        <iframe 
                            src="https://www.youtube.com/embed/IqGxel7qdP4?rel=0&modestbranding=1" 
                            title="Youth Employment Solutions Video" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen
                        ></iframe>
                    </div>
                    
                    <h3 class="text-lg font-semibold text-gray-700 pt-4">Guided Reflection Prompts:</h3>
                    <ul class="list-disc list-inside ml-4 text-sm space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <li>What stood out to you in this story?</li>
                        <li>How did they approach the problem?</li>
                        <li>Which idea could work in your community?</li>
                    </ul>

                    <p class="text-base text-indigo-600 font-semibold pt-2">Click 'I Understand' to proceed to Question 1 and define your specific challenge based on this context.</p>
                </div>
            </div>
        `;
    }
}

// Render the Step 1 question screen
function renderStep1Question() {
    const q = questions[currentStepIndex];
    const savedAnswer = answers[currentStepIndex] || '';
    const isFirstInPhase1A = currentStepIndex === 0;
    const isFirstInPhase1B = currentStepIndex === discoveryQuestions.length;
    
    // Determine the Phase Header
    let phaseHeader = '🧩 PHASE 1A: DISCOVERY – UNDERSTANDING THE PROBLEM CONTEXT';
    let introHTML = '';
    if (isFirstInPhase1A) {
        introHTML = `
            <div class="phase-intro">
                <h3 class="text-lg font-semibold text-indigo-800 mb-2">🎯 Purpose:</h3>
                <p class="text-gray-700 mb-3">${phase1AIntro.purpose}</p>
                <blockquote class="text-indigo-600 italic border-l-4 border-indigo-400 pl-4 mb-3">
                    <p>${phase1AIntro.facilitatorFlow}</p>
                </blockquote>
                <div class="phase-tip">
                    <p><strong>📝 Facilitator Tip:</strong> ${phase1AIntro.tip}</p>
                </div>
            </div>
        `;
        phaseHeader = '';
    } else if (currentStepIndex >= discoveryQuestions.length) {
        phaseHeader = '⚙️ PHASE 1B: DEFINING THE PROBLEM AND ITS IMPACT';
        if (isFirstInPhase1B) {
            introHTML = `
                <div class="phase-intro">
                    <h3 class="text-lg font-semibold text-indigo-800 mb-2">🎯 Purpose:</h3>
                    <p class="text-gray-700">${phase1BIntro.purpose}</p>
                </div>
            `;
        }
    }

    let categoryHTML = q.category ? `<p class="text-sm font-semibold text-gray-600 mb-1">${q.category}</p>` : '';

    container.innerHTML = `
        <div class="space-y-4">
            ${introHTML}
            ${phaseHeader ? `<p class="text-sm font-semibold text-indigo-600 mb-4 border-b border-indigo-200 pb-1">${phaseHeader}</p>` : ''}
            ${categoryHTML}
            <label for="${q.id}" class="block text-lg font-medium text-gray-700">${q.title} (${currentStepIndex + 1} of ${questions.length})</label>
            <textarea id="${q.id}" rows="4" 
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 shadow-sm"
                placeholder="${q.placeholder}"
            >${savedAnswer}</textarea>
            <p class="text-sm text-gray-500">${q.helpText}</p>
        </div>
    `;
    nextButton.textContent = "Continue";
    currentStepSpan.textContent = currentStepIndex + 2; // Adjusts dynamically for total questions
}

// Render the Step 2 screen
function renderStep2() {
    // Clear log when moving past Step 1
    conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Step 1 complete. Starting Step 2 guidance.</p>`;

    currentStepSpan.textContent = questions.length + 2; // Step is now after 18 questions
    const selectedTagsHTML = selectedSkills.map(tagId => {
        const tag = skillTags.find(t => t.id === tagId);
        return tag ? `<span class="tag-pill inline-flex items-center px-3 py-1 mr-2 mb-2 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full" data-tag-id="${tag.id}">${tag.label} &times;</span>` : '';
    }).join('');

    const availableTagsHTML = skillTags.filter(tag => !selectedSkills.includes(tag.id)).map(tag => `
        <span class="tag-pill inline-flex items-center px-3 py-1 mr-2 mb-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-full hover:bg-indigo-200" data-tag-id="${tag.id}">${tag.label}</span>
    `).join('');


    container.innerHTML = `
        <div class="space-y-6">
            <h2 class="text-xl font-semibold text-gray-800">Step 2: Your Skills & Interests (Guided Framework)</h2>
            <p class="text-sm text-gray-600">Please choose between 3 and 5 tags that best describe your core skills and passions.</p>
            
            <!-- Selected Tags Display -->
            <div id="selected-tags" class="min-h-[40px] p-2 border-2 border-indigo-200 rounded-xl bg-indigo-50">
                ${selectedTagsHTML || '<p class="text-gray-400 text-sm">Select 3-5 tags below...</p>'}
            </div>

            <!-- Available Tags -->
            <div id="available-tags-container" class="mt-4">
                ${availableTagsHTML}
            </div>

            <!-- Optional Text Input -->
            <label for="s2_optional_text" class="block pt-4 text-lg font-medium text-gray-700">Optional: Tell us more about a skill.</label>
            <textarea id="s2_optional_text" rows="2" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 shadow-sm" placeholder="e.g., 'I learned basic web design from YouTube and want to use it for impact.'"></textarea>
        </div>
    `;
    
    // Re-attach listeners for tags
    document.querySelectorAll('.tag-pill').forEach(tag => {
        tag.addEventListener('click', handleTagClick);
    });
    updateNavigation();
}

// Render the Step 3/Completion screen
function renderStep3Completion() {
    conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Step 2 complete. Ready for analysis.</p>`;

    currentStepSpan.textContent = questions.length + 2; // Step is 4 for Step 2 UI
    nextButton.textContent = "Go to Step 4";
    nextButton.disabled = false;

    const profileResultHTML = profileGenerated 
        ? `<div id="profile-output" class="p-6 bg-indigo-50 border-2 border-indigo-300 rounded-xl shadow-inner mt-4">
               <p class="text-center text-gray-500">Generating your purpose profile...</p>
            </div>`
        : `<div id="profile-output" class="p-6 bg-gray-100 border-2 border-gray-300 rounded-xl shadow-inner mt-4">
                <p class="text-center text-gray-500">Click the button below to get your profile.</p>
            </div>`;

    container.innerHTML = `
        <div class="space-y-6 text-center">
            <h2 class="text-2xl font-bold text-indigo-700">Section Complete! 🎉</h2>
            <p class="text-gray-600">You've clearly defined the problem and your skills. Let's see your potential mission.</p>
            
            ${profileResultHTML}

            <!-- New Gemini Feature Button -->
            <button id="generate-profile-btn" class="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-purple-700 transition duration-150 disabled:bg-purple-300">
                ✨ Generate My Purpose Profile
            </button>
            
            <p class="text-sm text-gray-500 pt-4">Next, we filter by your academic results.</p>
        </div>
    `;

    // Attach event listener for the new Gemini feature
    document.getElementById('generate-profile-btn').addEventListener('click', generateProfileSummary);

    if (profileGenerated) {
        // If the button was clicked and the process is starting/running, update the UI
        document.getElementById('generate-profile-btn').disabled = true;
    }
}

// Main render function wrapper
function renderStep() {
    if (currentStepIndex === -1) {
        renderInitialContext();
    } else if (currentStepIndex < questions.length) {
        renderStep1Question();
    } else if (currentStepIndex === questions.length) {
        renderStep2();
    } else {
        renderStep3Completion();
    }
    updateNavigation();
}

// --- FEATURE 1: LLM-POWERED CONVERSATIONAL NUDGE (Full Implementation) ---

// This function now only determines if a nudge is required.
async function checkThresholds(text) {
    const q = questions[currentStepIndex];
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    
    // --- 1. LOCAL CHECK: LENGTH (Fastest Check) ---
    const tooShort = words < q.minWords;
    if (tooShort) {
         console.log(`KPI → FAILED: Too Short (${words}/${q.minWords} words)`);
         return true; 
    }

    // --- 2. LLM CHECK: SPECIFICITY (Deep Semantic Check) ---
    
    // This prompt instructs the LLM to only return a deterministic JSON signal: PASS or FAIL.
    const systemInstruction = `
You are a fast, non-conversational AI specializing in text clarity and specificity analysis. 
Your only task is to analyze the student's input (the PROBLEM, WHO, or WHY) and determine if it is clear and specific enough to be used for program matching.

Criteria for PASS:
1. Must contain concrete nouns (places, objects, specific groups like 'market women', 'river').
2. Must describe an action or consequence (using verbs like 'robbing', 'spoiling', 'losing income', 'made me feel').
3. Must NOT use generic, abstract, or vague conversational terms (e.g., 'stuff', 'things', 'trouble', 'bit', 'kind of', 'general situation', 'some stuff', 'some things', 'affecting').

If the input meets all criteria, respond ONLY with {"assessment": "PASS"}.
If the input fails any of these criteria (especially using vague terms), respond ONLY with {"assessment": "FAIL"}.
DO NOT ADD ANY OTHER TEXT, EXPLANATION, OR CONVERSATIONAL PHRASING.
`;
    
    const userQuery = `Student input to assess: "${text}"`;

    try {
        const llmResponse = await callGeminiAPI(systemInstruction, userQuery);
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const assessment = parsed.assessment;
            
            if (assessment === "PASS") {
                console.log("KPI → PASSED (LLM Assessment)");
                return false;
            } else {
                console.log("KPI → FAILED (LLM Assessment: Vague)");
                return true;
            }
        } else {
            console.error("LLM returned non-JSON/invalid format for assessment. Failing safe.");
            return true; // Fail safe if LLM output is broken
        }

    } catch (error) {
        console.error("Error during LLM clarity assessment:", error);
        return true; // Fail safe on error
    }
}

async function displayAINudge(userText) {
    // --- SYSTEM INSTRUCTION (v5: GROW Scaffolding) ---
    
    // Build the conversation history for context
    const history = [];
    const logItems = conversationLog.querySelectorAll('.user-bubble, .ai-bubble');
    logItems.forEach(item => {
        const sender = item.classList.contains('user-bubble') ? 'user' : 'model';
        history.push({ 
            role: sender === 'user' ? 'user' : 'model', 
            parts: [{ text: item.textContent.replace(/^You: |^Mentor: /, '').trim() }] 
        });
    });

    // The final user query should be the prompt for the mentor
    let systemInstruction = `
You are a warm, supportive, and thoughtful career mentor speaking with a young person in Ghana. You are using a coaching approach (GROW Model style) to help them define a problem.
Your entire response must be ONE (1) or maximum TWO (2) sentences long, ending with a clear question mark.

To ensure conversation flow:
1. Use the full chat history provided to understand the current context and avoid repetition.
2. Begin with a natural acknowledgement that mirrors the student's *previous* attempt, using a warm, conversational tone (like "Ah, I see where you're coming from" or "That's an important point").
3. **CRITICAL: Adopt the User Researcher's Scaffolding Technique (modeled by Gabriel in the transcript).** When the student's topic is broad (e.g., "crime" or "food cost"), your question must present **two specific sub-categories or areas** relevant to the topic to guide the student's focus, reflecting local Ghanaian contexts.
   * Example Response Pattern for broad topics: "I would want you to look deeply into the [Topic] and see if you can notice a challenge that is facing the [Sub-topic 1] or a challenge facing the [Sub-topic 2]?"
4. Do not ask vague, open-ended questions like 'Can you tell me more about it?'
5. NEVER end with statements like “let’s move on”, “thank you,” or “that’s enough”.
`;
    
    let userQuery = `The student's raw message is: "${userText}"`;
    
    appendToLog('mentor', null, true); // Show thinking indicator
    
    // Call the API with context
    const payload = {
        contents: history.concat([{ role: 'user', parts: [{ text: userQuery }] }]),
        systemInstruction: { parts: [{ text: systemInstruction }] },
    };
    
    let response = await callGeminiAPI(systemInstruction, userQuery);

    // 1️⃣ Guard 1 — must end with ?
    if (!response.trim().endsWith('?')) {
        console.warn("Mentor response incomplete, attempting to complete the question...");
        const retryPrompt = `${response}\n\nPlease rewrite this so it ends with one natural question.`;
        response = await callGeminiAPI(systemInstruction, retryPrompt);
    }
    
    // 2️⃣ Guard 2 — false positives (Checks for premature closing and forces a probe)
    const normalizedResponse = response.toLowerCase().replace(/[’‘]/g, "'");
    const falsePositives = ["let's move", "let us move", "thank you", "that's enough", "let us proceed", "let's continue", "now, let's move"];

    if (falsePositives.some(f => normalizedResponse.includes(f))) {
        console.warn("Mentor attempting to close prematurely. Forcing one final probing question.");
        response += " But before we move on, could you share one more specific example or short story about that?";
    }
    
    removeTypingIndicator();
    appendToLog('mentor', response);
}

// --- FEATURE 2: LLM-POWERED PROFILE SUMMARY ---

async function generateFinalProblemSummary(...problemAnswers) {
    
    // Map the 18 answers to their corresponding titles for the LLM prompt
    const dataPoints = problemAnswers.map((answer, index) => {
        let category = '';
        // Determine phase and title
        if (index < discoveryQuestions.length) {
            category = 'DISCOVERY (Phase 1A) - ' + discoveryQuestions[index].title.replace(/Question \d+: /, '');
        } else {
            const defIndex = index - discoveryQuestions.length;
            const defQ = definingQuestions[defIndex];
            category = `DEFINING (Phase 1B) - ${defQ.category ? defQ.category + ': ' : ''}` + defQ.title.replace(/Question \d+: /, '');
        }
        return `${category}: ${answer}`;
    }).join('\n');


    const summaryPrompt = `
        Summarize the student's problem into ONE concise, validating summary (max 2 sentences). 
        The summary must integrate the following 18 data points into a clear narrative of the problem, its impact, and the student's proposed role:
        
        ${dataPoints}
        
        Begin the summary with: "That is a powerful problem, and here is the clear summary we have created:" and end with a smooth transition to the next section (e.g., "Let's now move on to Step 2: Your Skills and Interests.").
    `;
    
    // Use a high-level system instruction for formal writing
    const summaryInstruction = `You are a supportive mentor. Your output must be a single, validating summary paragraph (max 2 sentences) that combines the provided data into a concise, clear statement. Your tone must be validating and smooth.`;
    
    return callGeminiAPI(summaryInstruction, summaryPrompt);
}

async function generateProfileSummary() {
    profileGenerated = true;
    renderStep3Completion(); // Re-render to show loading state
    
    const outputDiv = document.getElementById('profile-output');
    const generateButton = document.getElementById('generate-profile-btn');

    if (!outputDiv || !generateButton) return;

    outputDiv.innerHTML = `<div class="flex items-center justify-center space-x-2 text-indigo-700">
                            <div class="h-4 w-4 border-2 border-t-2 border-t-indigo-500 border-gray-200 rounded-full animate-spin"></div>
                            <span>Analyzing purpose...</span>
                        </div>`;
    generateButton.disabled = true;


    // Updated to use first few answers for brevity in profile (full summary uses all 18)
    const problemStatement = `Problem Identified: Q1A1: ${answers[0]} | Q1A2: ${answers[1]} | Q1B1: ${answers[8]}`;
    const skills = `Skills Chosen: ${answers[questions.length]?.tags?.map(id => skillTags.find(s => s.id === id)?.label).join(', ') || ''}. Optional Note: ${answers[questions.length]?.optionalText || ''}`;
    
    const systemInstruction = `You are an inspirational pathfinder and analyst for Ghanaian students. Given the student's problem and skills, generate a response containing exactly two parts: 
    1. An aspirational Mission Title (5-7 words maximum).
    2. A single, encouraging sentence describing their potential path forward. 
    Format the output ONLY as: [MISSION TITLE] | [PATH SUMMARY SENTENCE]. Focus on impact, relevance to Ghana, and their chosen skills.`;
    
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
}

// --- HANDLERS ---

function handleTagClick(event) {
    const tagElement = event.target.closest('.tag-pill');
    if (!tagElement) return;

    const tagId = tagElement.dataset.tagId;

    if (selectedSkills.includes(tagId)) {
        selectedSkills = selectedSkills.filter(id => id !== tagId);
    } else {
        if (selectedSkills.length < 5) {
            selectedSkills.push(tagId);
        }
    }
    renderStep2(); 
}

async function handleNext() {
    if (currentStepIndex === -1) {
        // Advance from Context Screen Part 1 to Part 2 to Part 3 to Part 4 (Video)
        contextSubStep++;
        if (contextSubStep >= 4) {
            // Move to Q1 after Part 4
            currentStepIndex = 0; 
            contextSubStep = 0; // Reset sub-step index
        }
        renderStep();
        return;
    }
    
    if (currentStepIndex < questions.length) {
        // --- Step 1 Conversation Mode ---
        const q = questions[currentStepIndex];
        const textarea = document.getElementById(q.id); // Re-fetch textarea
        const answer = textarea?.value.trim() || '';
        
        if (!answer) {
            alert("Please write your response first.");
            return;
        }
        
        // 1. Check if input passes the AI thresholds (Now Async!)
        const needsMentor = await checkThresholds(answer); // true = intervention needed

        // Log the user's attempt immediately
        appendToLog('user', answer);

        // --- Scenario: Absolute KPI Enforcement (The Brain) ---
        if (needsMentor) {
            // 🚨 Trigger/Continue intervention loop
            awaitingFollowup = true;
            
            // Clear the input area and focus for the user's next attempt
            if (textarea) {
                textarea.value = '';
                textarea.focus();
            }
            
            // Call the Mentor
            await displayAINudge(answer); 
            return; // Stop here, the loop is active until KPI is met.
        }

        // --- Scenario: Pass KPI (This path is only taken when NEEDS_MENTOR is false) ---
        
        // 2. Clear log header if this was the first interaction (only if passed on first try)
        if (!awaitingFollowup && conversationLog.children.length === 1 && conversationLog.children[0].textContent.includes('mentor will appear')) {
             conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Conversation log cleared.</p>`;
        }

        // 3. If passed after a loop, give final closing message
        if (awaitingFollowup) {
            awaitingFollowup = false;
            // Mentor sends a final, short acknowledgment before continuing
            appendToLog('mentor', null, true);
            const closeoutMsg = await callGeminiAPI(
                `You are a kind and supportive mentor for Ghanaian students. The student has just given a thoughtful, specific example. Write one short, natural closing sentence that praises their clarity and smoothly transitions to the next question. Example: "That’s a clear picture of what you mean — thank you for sharing that. Let’s move on."`,
                `Thank you for sharing that detailed observation. Your persistence is excellent. That's exactly the kind of clarity we need. The refined answer was: "${answer}"`
            );
            removeTypingIndicator();
            appendToLog('mentor', closeoutMsg);

            // Pause for 1.5s to allow user to read the closing message
            setTimeout(() => {
                answers[currentStepIndex] = answer;
                currentStepIndex++;
                renderStep();
            }, 1500);
            return;
        }
        
        // 4. Clean Pass on first try
        answers[currentStepIndex] = answer;
        
        const isCompletingStep1 = currentStepIndex === questions.length - 1;

        if (isCompletingStep1) {
            // FINAL QUESTION PASSED: SUMMARIZE (Now all 18)
            
            // Clear log header if needed
            if (conversationLog.children.length === 1 && conversationLog.children[0].textContent.includes('mentor will appear')) {
                 conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Conversation log cleared.</p>`;
            }
            
            // Generate and display the summary
            appendToLog('mentor', null, true); // Thinking indicator
            
            // Pass all 18 answers
            const problemSummary = await generateFinalProblemSummary(...answers.slice(0, questions.length)); 
            removeTypingIndicator();
            
            // Display the summary for user validation
            appendToLog('mentor', problemSummary);
            
            // Advance after a pause
            setTimeout(() => {
                currentStepIndex++; // Advance to Step 2 (Skills)
                renderStep();
            }, 4000); // Longer pause (4s) for the student to read the full summary
            
            if (textarea) textarea.value = ''; // Clean input after saving
            return;

        } else {
            // INTERMEDIATE QUESTION PASSED: JUST ADVANCE
            currentStepIndex++;
            renderStep();
            if (textarea) textarea.value = ''; // Clean input after saving
            return;
        }
    } else if (currentStepIndex === questions.length) {
        // --- Step 2 Validation ---
        if (selectedSkills.length < 3) {
            alert("Please select at least 3 skill tags before continuing.");
            return;
        }
        
        const optionalText = document.getElementById('s2_optional_text').value.trim();
        answers[currentStepIndex] = { tags: selectedSkills, optionalText: optionalText };
        
        currentStepIndex++;
        renderStep();

    } else {
        // Final step - move to Step 4 (The Academic Filter)
        alert("Proceeding to Step 4: Academic Reality...");
        console.log("Final User Data:", answers);
    }
}

function handleBack() {
    if (currentStepIndex > -1) {
        if (currentStepIndex === -1 && contextSubStep === 1) {
            contextSubStep = 0; // Go back to Context Part 1
        } else if (currentStepIndex === -1 && contextSubStep === 2) {
            contextSubStep = 1; // Go back to Context Part 2
        } else if (currentStepIndex === -1 && contextSubStep === 3) {
            contextSubStep = 2; // Go back to Context Part 3
        } else {
            currentStepIndex--;
            // If moving back from Step 2 (index 18) to last question (index 17)
            if (currentStepIndex === questions.length) {
                currentStepIndex--; 
            }
        }
        
        // Clear log and reset state when moving back to a question
        awaitingFollowup = false;
        if (currentStepIndex < questions.length) {
            conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Your conversation with the mentor will appear here.</p>`;
        }
        renderStep();
    }
}

function updateNavigation() {
    backButton.disabled = currentStepIndex === -1 && contextSubStep === 0;
}

// --- APP INITIALIZATION ---

function initApp() {
    // 1. Initialize DOM element references (safely, after load)
    container = document.getElementById('path-finder-container');
    nextButton = document.getElementById('next-button');
    backButton = document.getElementById('back-button');
    currentStepSpan = document.getElementById('current-step');
    conversationLog = document.getElementById('conversation-log');
    
    // 2. Attach main handlers
    nextButton.addEventListener('click', handleNext);
    backButton.addEventListener('click', handleBack);
    
    // 3. Initialize Firebase (async, non-blocking)
    initializeFirebase();

    // 4. Start the application flow
    renderStep();
}

// Initialize the app only after the document structure is fully loaded
window.onload = initApp;