// --- GEMINI API Configuration (Mandatory) ---
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
            console.log("Firebase initialized successfully");
        } else {
            console.log("Firebase config not provided, running in standalone mode");
        }
    } catch (error) {
        console.error("Firebase initialization or sign-in failed:", error);
    }
}

// --- Core Application State & Logic ---

let currentStepIndex = -1; 
let contextSubStep = 0; 
let awaitingFollowup = false; 
const answers = []; 

const initialScreen = { 
    id: 's0_context', 
    title: "Phase 1: Setting Context & Building Awareness", 
    buttonText: "I Understand. Let's Start." 
};

// 🧩 PHASE 1A: DISCOVERY (8 Questions)
const discoveryQuestions = [
    { id: 'q1a1_notice', title: "Question 1: How did you first notice this problem? (Through experience, observation, or from someone else?)", placeholder: "Describe the moment or story that brought this to your attention.", helpText: "Share the specific trigger that made it personal.", minWords: 10 },
    { id: 'q1a2_affected', title: "Question 2: Who do you see being most affected by this issue?", placeholder: "Name specific groups like 'street vendors in Accra' or 'rural farmers'.", helpText: "Focus on the people closest to the pain.", minWords: 10 },
    { id: 'q1a3_personal', title: "Question 3: What makes this issue important to you personally?", placeholder: "How does it frustrate, anger, or inspire you?", helpText: "Connect it to your emotions or values.", minWords: 10 },
    { id: 'q1a4_example', title: "Question 4: Can you describe a specific situation or example that made you realize it's a serious problem?", placeholder: "Tell a short story from your community.", helpText: "Stories make the issue vivid and real.", minWords: 10 },
    { id: 'q1a5_efforts', title: "Question 5: Have you seen anyone or any group trying to fix this problem before? What did they do?", placeholder: "Mention local initiatives, NGOs, or community efforts.", helpText: "This shows what's been tried and gaps.", minWords: 10 },
    { id: 'q1a6_causes', title: "Question 6: What do you think causes this problem in your community?", placeholder: "Is it poverty, lack of resources, or cultural factors?", helpText: "Pinpoint the everyday triggers.", minWords: 10 },
    { id: 'q1a7_future', title: "Question 7: If this problem continues, what do you think will happen in the next few years?", placeholder: "Describe the worsening impact on people or places.", helpText: "Imagine the ripple effects.", minWords: 10 },
    { id: 'q1a8_wish', title: "Question 8: What do you wish could change about it?", placeholder: "What small or big shift would make a difference?", helpText: "This sparks your vision for better.", minWords: 10 },
];

// ⚙️ PHASE 1B: DEFINING (10 Questions)
const definingQuestions = [
    { id: 'q1b1_what', category: 'What', title: "What exactly is the problem or issue you've identified?", placeholder: "Be precise, e.g., 'flooding in low-lying areas during rains'.", helpText: "Define the core issue clearly.", minWords: 10 },
    { id: 'q1b2_where', category: 'Where', title: "Where does it happen most often? (Community, workplaces, schools, etc.)", placeholder: "Specific spots like 'informal markets in Kumasi'.", helpText: "Narrow the location for focus.", minWords: 10 },
    { id: 'q1b3_who', category: 'Who', title: "Who are the main people affected by this problem?", placeholder: "Detail groups like 'youth without skills training'.", helpText: "Highlight the vulnerable.", minWords: 10 },
    { id: 'q1b4_when', category: 'When', title: "When does it usually happen? (Certain seasons, life stages, or times?)", placeholder: "E.g., 'during dry seasons' or 'for school leavers'.", helpText: "Timing reveals patterns.", minWords: 10 },
    { id: 'q1b5_why', category: 'Why', title: "Why do you think this problem keeps happening?", placeholder: "Systemic reasons like 'poor infrastructure funding'.", helpText: "Uncover the persistence.", minWords: 10 },
    { id: 'q1b6_how', category: 'How', title: "How does this issue affect people or the community as a whole?", placeholder: "E.g., 'leads to health risks and lost income'.", helpText: "Show the broader ripple.", minWords: 10 },
    { id: 'q1b7_root', category: 'Root Causes', title: "What do you think are the main root causes behind this problem?", placeholder: "Deep factors like 'ineffective policies or education gaps'.", helpText: "Go beyond symptoms.", minWords: 10 },
    { id: 'q1b8_solutions', category: 'Possible Solutions', title: "What do you think can be done to reduce or solve it?", placeholder: "Ideas like 'community training programs'.", helpText: "Brainstorm feasible fixes.", minWords: 10 },
    { id: 'q1b9_impact', category: 'Impact of Solution', title: "If this problem were solved, how would your community or the people affected benefit?", placeholder: "E.g., 'improved livelihoods and safer environments'.", helpText: "Envision the positive change.", minWords: 10 },
    { id: 'q1b10_role', category: 'Your Role', title: "What role do you see yourself playing in making this change happen?", placeholder: "E.g., 'leading workshops or advocating for policy'.", helpText: "Link your strengths to action.", minWords: 10 }
];

const questions = discoveryQuestions.concat(definingQuestions);

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
let profileGenerated = false;

// DOM Elements
let container, nextButton, backButton, currentStepSpan, conversationLog;

const phase1AIntro = {
    purpose: "To help the participant identify a real problem in their community, how they came to notice it, and how it affects people around them.",
    facilitatorFlow: "Now that we've seen how global goals connect to real issues, let's focus on what you've personally noticed in your community."
};

const phase1BIntro = {
    purpose: "To move from storytelling and observation to a structured understanding of the problem — identifying the \"who, where, why, and what\" clearly."
};

let phaseIntroSubStep = 0;
let currentPhase = null;

// --- GEMINI API CALL UTILITY ---

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

// --- CONVERSATION LOG UTILITY ---

function appendToLog(sender, message, isTyping = false) {
    const isUser = sender === 'user';
    const logItem = document.createElement('div');
    logItem.className = `p-3 rounded-xl shadow-sm ${isUser ? 'bg-blue-100 ml-auto user-bubble' : 'bg-gray-100 mr-auto ai-bubble'} max-w-[85%] text-sm`; // ADDED: user-bubble / ai-bubble classes
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

function renderInitialContext() {
    console.log("Rendering context screen, substep:", contextSubStep);
    currentStepSpan.textContent = '1';
    backButton.disabled = contextSubStep === 0;
    
    if (conversationLog.children.length === 1 && conversationLog.children[0].textContent.includes('mentor will appear')) {
         conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Conversation log cleared.</p>`;
    }

    if (contextSubStep === 0) {
        nextButton.textContent = "Continue";
        container.innerHTML = `
            <div class="initial-context short-section space-y-4 text-center"> <!-- ADDED: initial-context class -->
                <h2 class="text-2xl font-bold text-indigo-800">${initialScreen.title}</h2>
                <p class="text-base text-gray-700 font-medium">Every community challenge connects to a global roadmap (like the UN SDGs). To find your purpose, we first need to look at the big picture.</p>
                <p class="text-base text-indigo-600 font-semibold">Ready to see where your curiosity fits into the world's roadmap?</p>
            </div>
        `;
    } else if (contextSubStep === 1) {
        nextButton.textContent = "Continue";
        container.innerHTML = `
            <div class="short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">The Global Roadmap: 17 SDGs</h2>
                <div class="p-2 bg-white rounded-xl shadow-lg border border-gray-200">
                    <p class="text-sm text-gray-700 font-medium mb-2">Watch this short video explaining the 17 Sustainable Development Goals</p>
                    <div class="video-container rounded-xl shadow-lg border border-indigo-300"> <!-- ADDED: video-container class; removed inline style -->
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
    } else if (contextSubStep === 2) {
        nextButton.textContent = "Continue to Reflection";
        container.innerHTML = `
            <div class="short-section space-y-4 phase-intro"> <!-- ADDED: phase-intro class for consistency -->
                <h2 class="text-2xl font-bold text-indigo-800">Your Goal in this Phase:</h2>
                <div class="text-gray-700 space-y-2">
                    <ul class="list-disc list-inside ml-4 text-base space-y-1 reflection-list"> <!-- ADDED: reflection-list class -->
                        <li class="font-medium">Map your local challenge directly to global goals focused on Jobs, Opportunity, and Economic Growth.</li>
                        <li class="font-medium">Discover proven solutions from Africa and the world that apply to your issue.</li>
                        <li class="font-medium">Define a specific, actionable problem in your own community, moving beyond general ideas.</li>
                    </ul>
                </div>
            </div>
        `;
    } else if (contextSubStep === 3) {
        nextButton.textContent = "Watch Video";
        container.innerHTML = `
            <div class="short-section space-y-4">
                <h2 class="text-2xl font-bold text-indigo-800">Step 2: Solutions & Reflection</h2>
                <div class="text-gray-700 space-y-2">
                    <p class="text-base font-medium">To gain inspiration, reflect on these as you watch how others are solving similar problems globally and locally.</p>
                    <h3 class="text-lg font-semibold text-gray-700">Reflection Questions:</h3>
                    <ul class="list-disc list-inside ml-4 text-sm space-y-1 reflection-list"> <!-- CHANGED: reflection-list class, removed inline Tailwind for consistency -->
                        <li>What stood out to you in this story?</li>
                        <li>How did they approach the problem?</li>
                        <li>Which idea could work in your community?</li>
                    </ul>
                </div>
            </div>
        `;
    } else if (contextSubStep === 4) {
        nextButton.textContent = initialScreen.buttonText;
        container.innerHTML = `
            <div class="short-section space-y-4">
                <h2 class="text-2xl font-bold text-indigo-800">Watch the Video</h2>
                <div class="text-gray-700 text-center">
                    <div class="video-container rounded-xl shadow-lg border border-indigo-300"> <!-- ADDED: video-container class; removed inline style -->
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

function renderStep1Question() {
    console.log("Rendering question, index:", currentStepIndex, "phase intro:", phaseIntroSubStep);
    const q = questions[currentStepIndex];
    const savedAnswer = answers[currentStepIndex] || '';
    const isFirstInPhase1A = currentStepIndex === 0;
    const isFirstInPhase1B = currentStepIndex === discoveryQuestions.length;
    
    if (isFirstInPhase1A && phaseIntroSubStep === 0) {
        nextButton.textContent = "Start Questions";
        backButton.disabled = false;
        container.innerHTML = `
            <div class="phase-intro short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">🧩 PHASE 1A: DISCOVERY</h2>
                <h3 class="text-xl font-semibold text-indigo-700">Understanding the Problem Context</h3>
                
                <div class="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-200 text-left">
                    <h3 class="text-lg font-semibold text-indigo-800 mb-2">🎯 Purpose:</h3>
                    <p class="text-gray-700 mb-3">${phase1AIntro.purpose}</p>
                    <blockquote class="text-indigo-600 italic border-l-4 border-indigo-400 pl-3">
                        <p>${phase1AIntro.facilitatorFlow}</p>
                    </blockquote>
                </div>
            </div>
        `;
        currentStepSpan.textContent = currentStepIndex + 2;
        return;
    }
    
    if (isFirstInPhase1B && phaseIntroSubStep === 0) {
        nextButton.textContent = "Start Questions";
        backButton.disabled = false;
        container.innerHTML = `
            <div class="phase-intro short-section space-y-4 text-center">
                <h2 class="text-2xl font-bold text-indigo-800">⚙️ PHASE 1B: DEFINING</h2>
                <h3 class="text-xl font-semibold text-indigo-700">The Problem and Its Impact</h3>
                
                <div class="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-200 text-left">
                    <h3 class="text-lg font-semibold text-indigo-800 mb-2">🎯 Purpose:</h3>
                    <p class="text-gray-700">${phase1BIntro.purpose}</p>
                </div>
            </div>
        `;
        currentStepSpan.textContent = currentStepIndex + 2;
        return;
    }

    let phaseHeader = currentStepIndex < discoveryQuestions.length 
        ? '🧩 PHASE 1A: DISCOVERY – UNDERSTANDING THE PROBLEM CONTEXT'
        : '⚙️ PHASE 1B: DEFINING THE PROBLEM AND ITS IMPACT';
    
    let categoryHTML = q.category ? `<p class="text-sm font-semibold text-gray-600 mb-1">${q.category}</p>` : '';

    container.innerHTML = `
        <div class="question-section short-section space-y-3"> <!-- ADDED: question-section class -->
            <p class="text-sm font-semibold text-indigo-600 mb-2 border-b border-indigo-200 pb-1">${phaseHeader}</p>
            ${categoryHTML}
            <label for="${q.id}" class="block text-lg font-medium text-gray-700">${q.title} (${currentStepIndex + 1} of ${questions.length})</label>
            <textarea id="${q.id}" rows="4" 
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 shadow-sm"
                placeholder="${q.placeholder}"
            >${savedAnswer}</textarea>
            <p class="text-sm text-gray-500 mb-0">${q.helpText}</p>
        </div>
    `;
    nextButton.textContent = "Continue";
    currentStepSpan.textContent = currentStepIndex + 2;
    backButton.disabled = false;
}

function renderStep2() {
    conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Step 1 complete. Starting Step 2 guidance.</p>`;

    currentStepSpan.textContent = questions.length + 2;
    const selectedTagsHTML = selectedSkills.map(tagId => {
        const tag = skillTags.find(t => t.id === tagId);
        return tag ? `<span class="tag-pill inline-flex items-center px-3 py-1 mr-2 mb-2 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full cursor-pointer" data-tag-id="${tag.id}">${tag.label} &times;</span>` : '';
    }).join('');

    const availableTagsHTML = skillTags.filter(tag => !selectedSkills.includes(tag.id)).map(tag => `
        <span class="tag-pill inline-flex items-center px-3 py-1 mr-2 mb-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-full hover:bg-indigo-200 cursor-pointer" data-tag-id="${tag.id}">${tag.label}</span>
    `).join('');

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
            <textarea id="s2_optional_text" rows="2" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 shadow-sm" placeholder="e.g., 'I learned basic web design from YouTube and want to use it for impact.'"></textarea>
        </div>
    `;
    
    document.querySelectorAll('.tag-pill').forEach(tag => {
        tag.addEventListener('click', handleTagClick);
    });
    updateNavigation();
}

function renderStep3Completion() {
    conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Step 2 complete. Ready for analysis.</p>`;

    currentStepSpan.textContent = questions.length + 2;
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

            <button id="generate-profile-btn" class="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-purple-700 transition duration-150 disabled:bg-purple-300">
                ✨ Generate My Purpose Profile
            </button>
            
            <p class="text-sm text-gray-500 pt-4">Next, we filter by your academic results.</p>
        </div>
    `;

    document.getElementById('generate-profile-btn').addEventListener('click', generateProfileSummary);

    if (profileGenerated) {
        document.getElementById('generate-profile-btn').disabled = true;
    }
}

function renderStep() {
    console.log("RenderStep called - currentStepIndex:", currentStepIndex, "contextSubStep:", contextSubStep);
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

// --- THRESHOLD CHECK ---
async function checkThresholds(text) {
    const q = questions[currentStepIndex];
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    
    if (words < q.minWords) {
         console.log(`KPI → FAILED: Too Short (${words}/${q.minWords} words)`);
         return true; 
    }

    const systemInstruction = `You are a fast, non-conversational AI specializing in text clarity analysis. 
Analyze if the student's input is clear and specific.

Criteria for PASS:
1. Contains concrete nouns (places, objects, specific groups).
2. Describes an action or consequence.
3. Does NOT use vague terms (e.g., 'stuff', 'things', 'trouble', 'kind of').

Respond ONLY with {"assessment": "PASS"} or {"assessment": "FAIL"}.`;
    
    const userQuery = `Student input: "${text}"`;

    try {
        const llmResponse = await callGeminiAPI(systemInstruction, userQuery);
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.assessment === "PASS") {
                console.log("KPI → PASSED");
                return false;
            }
        }
        console.log("KPI → FAILED (Vague)");
        return true;
    } catch (error) {
        console.error("Error during assessment:", error);
        return true;
    }
}

async function displayAINudge(userText) {
    const systemInstruction = `You are a warm mentor for Ghanaian students using the GROW Model.
Your response must be ONE or TWO sentences long, ending with a question mark.

Guidelines:
1. Acknowledge the student's response warmly.
2. When the topic is broad, present two specific sub-categories to guide focus.
3. Never ask vague questions like 'Can you tell me more?'
4. NEVER end with "let's move on" or "thank you".`;
    
    const userQuery = `Student's message: "${userText}"`;
    
    appendToLog('mentor', null, true);
    let response = await callGeminiAPI(systemInstruction, userQuery);

    if (!response.trim().endsWith('?')) {
        const retryPrompt = `${response}\n\nRewrite this to end with one natural question.`;
        response = await callGeminiAPI(systemInstruction, retryPrompt);
    }
    
    const normalized = response.toLowerCase();
    const falsePositives = ["let's move", "thank you", "that's enough", "let's continue"];
    if (falsePositives.some(f => normalized.includes(f))) {
        response += " But before we move on, could you share one more specific example?";
    }
    
    removeTypingIndicator();
    appendToLog('mentor', response);
}

async function generateFinalProblemSummary(...problemAnswers) {
    const dataPoints = problemAnswers.map((answer, index) => {
        let category = '';
        if (index < discoveryQuestions.length) {
            category = 'DISCOVERY - ' + discoveryQuestions[index].title.replace(/Question \d+: /, '');
        } else {
            const defIndex = index - discoveryQuestions.length;
            const defQ = definingQuestions[defIndex];
            category = `DEFINING - ${defQ.category ? defQ.category + ': ' : ''}` + defQ.title.replace(/Question \d+: /, '');
        }
        return `${category}: ${answer}`;
    }).join('\n');

    const summaryPrompt = `
        Summarize the student's problem into ONE concise, validating summary (max 2 sentences). 
        The summary must integrate the following 18 data points into a clear narrative:
        
        ${dataPoints}
        
        Begin with: "That is a powerful problem, and here is the clear summary we have created:" and end with a transition like "Let's now move on to Step 2: Your Skills and Interests."
    `;
    
    const summaryInstruction = `You are a supportive mentor. Your output must be a single, validating summary paragraph (max 2 sentences). Your tone must be validating and smooth.`;
    
    return callGeminiAPI(summaryInstruction, summaryPrompt);
}

async function generateProfileSummary() {
    profileGenerated = true;
    renderStep3Completion();
    
    const outputDiv = document.getElementById('profile-output');
    const generateButton = document.getElementById('generate-profile-btn');

    if (!outputDiv || !generateButton) return;

    outputDiv.innerHTML = `<div class="flex items-center justify-center space-x-2 text-indigo-700">
                            <div class="h-4 w-4 border-2 border-t-2 border-t-indigo-500 border-gray-200 rounded-full animate-spin"></div>
                            <span>Analyzing purpose...</span>
                        </div>`;
    generateButton.disabled = true;

    const problemStatement = `Problem: Q1: ${answers[0]} | Q2: ${answers[1]} | Q9: ${answers[8]}`;
    const skills = `Skills: ${answers[questions.length]?.tags?.map(id => skillTags.find(s => s.id === id)?.label).join(', ') || ''}. Optional: ${answers[questions.length]?.optionalText || ''}`;
    
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
    console.log("handleNext called - currentStepIndex:", currentStepIndex, "contextSubStep:", contextSubStep, "phaseIntroSubStep:", phaseIntroSubStep);
    
    if (currentStepIndex === -1) {
        if (contextSubStep < 4) {
            contextSubStep++;
            console.log("Moving to context substep:", contextSubStep);
        } else {
            currentStepIndex = 0; 
            contextSubStep = 0;
            phaseIntroSubStep = 0;
            currentPhase = '1A';
            console.log("Moving to Phase 1A intro");
        }
        renderStep();
        return;
    }
    
    if (currentStepIndex < questions.length && phaseIntroSubStep === 0) {
        phaseIntroSubStep = -1;
        console.log("Starting questions from phase intro");
        renderStep();
        return;
    }
    
    if (currentStepIndex < questions.length) {
        const q = questions[currentStepIndex];
        const textarea = document.getElementById(q.id);
        const answer = textarea?.value.trim() || '';
        
        if (!answer) {
            alert("Please write your response first.");
            return;
        }
        
        const needsMentor = await checkThresholds(answer);
        appendToLog('user', answer);

        if (needsMentor) {
            awaitingFollowup = true;
            if (textarea) {
                textarea.value = '';
                textarea.focus();
            }
            await displayAINudge(answer); 
            return;
        }

        if (!awaitingFollowup && conversationLog.children.length === 1 && conversationLog.children[0].textContent.includes('mentor will appear')) {
             conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Conversation log cleared.</p>`;
        }

        if (awaitingFollowup) {
            awaitingFollowup = false;
            appendToLog('mentor', null, true);
            const closeoutMsg = await callGeminiAPI(
                `You are a supportive mentor. Write one short sentence praising their clarity and transitioning to the next question.`,
                `The refined answer was: "${answer}"`
            );
            removeTypingIndicator();
            appendToLog('mentor', closeoutMsg);

            setTimeout(() => {
                answers[currentStepIndex] = answer;
                currentStepIndex++;
                if (currentStepIndex === discoveryQuestions.length) {
                    phaseIntroSubStep = 0;
                    currentPhase = '1B';
                }
                renderStep();
            }, 1500);
            return;
        }
        
        answers[currentStepIndex] = answer;
        const isCompletingStep1 = currentStepIndex === questions.length - 1;

        if (isCompletingStep1) {
            if (conversationLog.children.length === 1 && conversationLog.children[0].textContent.includes('mentor will appear')) {
                 conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Conversation log cleared.</p>`;
            }
            
            appendToLog('mentor', null, true);
            const problemSummary = await generateFinalProblemSummary(...answers.slice(0, questions.length)); 
            removeTypingIndicator();
            appendToLog('mentor', problemSummary);
            
            setTimeout(() => {
                currentStepIndex++;
                renderStep();
            }, 4000);
            
            if (textarea) textarea.value = '';
            return;

        } else {
            currentStepIndex++;
            if (currentStepIndex === discoveryQuestions.length) {
                phaseIntroSubStep = 0;
                currentPhase = '1B';
            }
            renderStep();
            if (textarea) textarea.value = '';
            return;
        }
    } else if (currentStepIndex === questions.length) {
        if (selectedSkills.length < 3) {
            alert("Please select at least 3 skill tags before continuing.");
            return;
        }
        
        const optionalText = document.getElementById('s2_optional_text').value.trim();
        answers[currentStepIndex] = { tags: selectedSkills, optionalText: optionalText };
        
        currentStepIndex++;
        renderStep();

    } else {
        alert("Proceeding to Step 4: Academic Reality...");
        console.log("Final User Data:", answers);
    }
}

function handleBack() {
    console.log("handleBack called - currentStepIndex:", currentStepIndex, "contextSubStep:", contextSubStep, "phaseIntroSubStep:", phaseIntroSubStep);
    
    if (currentStepIndex === -1) {
        if (contextSubStep > 0) {
            contextSubStep--;
        }
        renderStep();
        return;
    }
    
    // Handle backing from phase intros
    if (currentStepIndex < questions.length && phaseIntroSubStep === 0) {
        if (currentStepIndex === 0) {
            // From Phase 1A intro back to context
            currentStepIndex = -1;
            contextSubStep = 4;
        } else {
            // From Phase 1B intro back to last question of Phase 1A
            currentStepIndex = discoveryQuestions.length - 1;
        }
        phaseIntroSubStep = -1;
        awaitingFollowup = false;
        conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Your conversation with the mentor will appear here.</p>`;
        renderStep();
        return;
    }
    
    // Handle backing from questions
    if (currentStepIndex >= 0 && currentStepIndex < questions.length) {
        if (currentStepIndex === 0) {
            // From first question back to context
            currentStepIndex = -1;
            contextSubStep = 4;
            phaseIntroSubStep = -1;
        } else {
            // Decrement to previous question
            currentStepIndex--;
        }
        awaitingFollowup = false;
        conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Your conversation with the mentor will appear here.</p>`;
        renderStep();
        return;
    }
    
    // Handle backing from Step 2 (skills)
    if (currentStepIndex === questions.length) {
        currentStepIndex--;
        phaseIntroSubStep = -1;
        awaitingFollowup = false;
        conversationLog.innerHTML = `<p class="text-sm text-gray-500 text-center">Your conversation with the mentor will appear here.</p>`;
        renderStep();
        return;
    }
    
    // Handle backing from Step 3 (completion)
    if (currentStepIndex > questions.length) {
        currentStepIndex = questions.length;
        renderStep();
        return;
    }
}

function updateNavigation() {
    if (currentStepIndex === -1 && contextSubStep === 0) {
        backButton.disabled = true;
    } else {
        backButton.disabled = false;
    }
}

// --- APP INITIALIZATION ---

function initApp() {
    console.log("Initializing app...");
    container = document.getElementById('path-finder-container');
    nextButton = document.getElementById('next-button');
    backButton = document.getElementById('back-button');
    currentStepSpan = document.getElementById('current-step');
    conversationLog = document.getElementById('conversation-log');
    
    if (!container || !nextButton || !backButton || !currentStepSpan || !conversationLog) {
        console.error("Failed to find required DOM elements!");
        return;
    }
    
    console.log("DOM elements found, attaching event listeners");
    nextButton.addEventListener('click', handleNext);
    backButton.addEventListener('click', handleBack);
    
    initializeFirebase();

    console.log("Rendering initial step");
    renderStep();
}

window.addEventListener('DOMContentLoaded', initApp);