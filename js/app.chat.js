// js/app.chat.js
// Chat system (mentor/user flow)
import { 
  appendMessage, removeTypingIndicator, displayAINudge, checkThresholds, 
  startChatConversation, askCurrentQuestion, triggerValidationSummary, 
  handleChatSubmit, handleLogClick, scrollToMessage, initReply, cancelReply,
  renderChatInterface, renderOnboardingStep, handleNext, handleBack, updateNavigation,
  generateFinalProblemSummary 
} from './app.utils.js'; // Some utils shared
import { mentorThinking, getTimeGreeting, getDynamicConfirmation, getConversationalReply } from './app.utils.js';
import { callGeminiAPI } from './app.utils.js';
import { saveSession } from './app.firebase.js';
import { generateProfileSummary } from './app.profile.js';

// DOM Elements for chat
let conversationLog, chatForm, chatInput, sendButton;
let replyPreviewContainer, replyPreviewName, replyPreviewText, cancelReplyBtn;

// Reply State
let currentReply = null; // { messageId, sender, text }

// Main App Router
export function renderApp() {
    if (!window.session) {
        console.error("Session not initialized. Cannot render app.");
        if (window.appDOM.appContainer) window.appDOM.appContainer.innerHTML = "<p class='text-red-500'>Error: Session could not be loaded.</p>";
        return;
    }
   
    const index = window.session.current_step_index;
    if (index >= 0) {
        // --- CHAT MODE ---
        renderChatInterface();
        startChatConversation();
    } else {
        // --- ONBOARDING MODE ---
        renderOnboardingStep(index);
    }
}

// [NEW] Renders the static onboarding steps
export function renderOnboardingStep(index) {
    console.log("Rendering onboarding step:", index);
   
    // Ensure nav buttons are visible
    if (window.appDOM.appFooter) window.appDOM.appFooter.style.display = 'flex';
    if (window.appDOM.nextButton) window.appDOM.nextButton.textContent = "Continue"; // Default text
   
    let templateId = '';
    let greeting = '';
   
    switch(index) {
        case -4: // Name Capture
            templateId = 'template-context-name';
            window.appDOM.currentStepSpan.textContent = "Welcome";
            break;
        case -3: // Context Intro
            templateId = 'template-context-intro';
            window.appDOM.currentStepSpan.textContent = "The Big Picture";
            break;
        case -2: // SDG Video 1
            templateId = 'template-context-sdg-video';
            window.appDOM.currentStepSpan.textContent = "Global Goals";
            break;
        case -1: // Final Video 2
            templateId = 'template-context-final-video';
            window.appDOM.currentStepSpan.textContent = "Inspiration";
            if(window.appDOM.nextButton) window.appDOM.nextButton.textContent = "Start My Path"; // Final button text
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
   
    window.appDOM.appContainer.innerHTML = ''; // Clear container
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
   
    window.appDOM.appContainer.appendChild(content);
    updateNavigation();
}

// [NEW] Injects the chat UI and hides the onboarding nav
export function renderChatInterface() {
    console.log("Rendering Chat Interface");
    // Hide onboarding footer
    if (window.appDOM.appFooter) window.appDOM.appFooter.style.display = 'none';
    // Get chat template
    const template = document.getElementById('template-chat-interface');
    if (!template) {
        console.error("Chat interface template not found!");
        return;
    }
   
    window.appDOM.appContainer.innerHTML = ''; // Clear container
    const chatUI = template.content.cloneNode(true);
    window.appDOM.appContainer.appendChild(chatUI);
   
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
   
    window.appDOM.currentStepSpan.textContent = "Mentor Chat";
}

// --- CONVERSATION LOG UTILITY ---
export function appendMessage(sender, message, replyInfo = null, isTyping = false) {
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

export function removeTypingIndicator() {
  const indicator = document.getElementById('ai-typing-indicator');
  if (indicator) indicator.remove();
}

// --- Scaffolding function adapted for chat ---
export async function displayAINudge(userText, currentQuestion, qId, userMessageReplyInfo) {
    const session = window.session;
    session.current_question = currentQuestion;
   
    appendMessage('mentor', '', null, true); // Typing...
    await mentorThinking(); // Human delay
   
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

export async function checkThresholds(text, currentQuestion, qId) {
  const signals = await analyzeInput(text, currentQuestion);
  const decision = decideAction(signals, currentQuestion);
  const currentCount = interventionCounts.get(qId) || 0;
  const forceProceed = currentCount >= THRESHOLDS.MAX_INTERVENTIONS;
  console.log(`KPI → ${decision.action === 'minimal_validation' ? 'PASSED (Readiness: ' + signals.readiness_score + ')' : 'FAILED (' + decision.action + ', Count: ' + (currentCount + 1) + ')'}`);
  if (forceProceed) {
    console.log('Max interventions reached; forcing proceed.');
    return false; // Proceed even if not ideal
  }
  // Return TRUE if intervention is needed
  return decision.action !== 'minimal_validation' && decision.action !== 'no_intervene';
}

// --- CHAT LOGIC FUNCTIONS ---
export function startChatConversation() {
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
        // [FIX] Don't call askCurrentQuestion, just enable input
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
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

export async function askCurrentQuestion() {
    const index = window.session.current_step_index;
    let questionAsked = false; // Flag to see if we asked a question
    const mentorName = window.session.mentor_name || "Mentor";
   
    // [FIX] Add thinking delay
    appendMessage('mentor', '', null, true); // Typing...
    await mentorThinking();
    removeTypingIndicator();
   
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
        // This is now handled by getConversationalReply in handleChatSubmit
        console.error("Bug: askCurrentQuestion was called at index 1.");
       
    } else if (index === 2) {
        // --- Ask to Continue/Rewatch ---
        // This is now handled by getConversationalReply
        console.error("Bug: askCurrentQuestion was called at index 2.");
    } else if (index === 3) {
        // --- Set Context ---
        // This is now handled by getConversationalReply
        console.error("Bug: askCurrentQuestion was called at index 3.");
    } else if (index === 4) {
        // --- Dynamic Encouragement ---
        // This is now handled by getConversationalReply
        console.error("Bug: askCurrentQuestion was called at index 4.");
    } else if (index === 5) {
        // --- Ask First Question ---
        const q = questions[0]; // q[0]
        window.session.current_question = q.title;
        // [FIX] Rephrased question from user
        appendMessage(mentorName, "Okay, let's begin. What's that first problem or challenge you've noticed in your community, school, home, or Ghana that makes you say 'damm, this issue must be solved'? (And you can just type **'hint'** if you're stuck).");
        questionAsked = true;
        interventionCounts.set(q.id, 0);
       
    // --- Handle Phase Intros (for later phases) ---
    // Note: index is shifted by +5
    } else if (index === (discoveryQuestions.length + 5)) { // 9 + 5 = 14
        appendMessage(mentorName, `Great, that's Phase 1A done. Now for Phase 1B: ${phase1BIntro.purpose}`);
        await mentorThinking();
        // [FIX] Auto-ask first question of new phase
        window.session.current_step_index++; // Move to 15 (q[9])
        await saveSession();
        askCurrentQuestion();
        return;
   
    } else if (index === (discoveryQuestions.length + definingQuestions.length + 5)) { // 9 + 10 + 5 = 24
        appendMessage(mentorName, `Excellent. Let's move to Phase 1C: ${phase1CIntro.purpose}`);
        await mentorThinking();
        // [FIX] Auto-ask first question of new phase
        window.session.current_step_index++; // Move to 25 (q[19])
        await saveSession();
        askCurrentQuestion();
        return;
   
    // [NEW] Validation "What to refine?" step
    } else if (index === 151) {
        appendMessage(mentorName, "No problem. Which part would you like to refine: the **'what'**, the **'who'**, or the **'why'**?");
        questionAsked = true;
    }
    // --- Handle Asking the Question (Note the 'index - 5' shift) ---
    const questionIndex = index - 5; // 5 -> 0, 6 -> 1, etc.
   
    // [FIX] Make sure we don't re-ask Q[0]
    if (questionIndex > 0 && questionIndex < questions.length) {
        const q = questions[questionIndex];
        window.session.current_question = q.title;
        appendMessage(mentorName, `${q.title} (And as always, just type **'hint'** if you need it!)`);
        questionAsked = true;
       
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

export async function triggerValidationSummary(userMessageReplyInfo) {
    const mentorName = window.session.mentor_name || "Mentor";
   
    appendMessage('mentor', '', null, true); // Typing...
    await mentorThinking();
    const summary = await generateFinalProblemSummary();
    window.session.current_summary = summary; // Save summary
    removeTypingIndicator();
   
    await mentorThinking();
    appendMessage(mentorName, "Great, you've defined the core problem. Here's a summary of your thoughts:", userMessageReplyInfo);
    await mentorThinking();
    appendMessage(mentorName, `"${summary}"`);
    await mentorThinking();
    appendMessage(mentorName, "Does that capture your idea correctly? Please type **'approve'** to continue, or **'refine'** to go back and change it.");
   
    window.session.current_step_index = 150; // Awaiting validation
    await saveSession();
    chatInput.disabled = false;
    sendButton.disabled = false;
    chatInput.focus();
}

export async function handleChatSubmit(event) {
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
        text: summarizeTextShort(userInput) // [NEW] Use summary for quote
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
    await mentorThinking();
    // --- [NEW] AI-POWERED WELCOME FLOW ---
    if (index === 0) {
        // --- 1. User replied to "Good morning" ---
        const mentorGreeting = getTimeGreeting().toLowerCase();
        let greetingContext = `You said '${getTimeGreeting()}'. The user replied '${userInput}'.`;
        if (mentorGreeting.includes('afternoon') && lowerInput.includes('morning')) {
            greetingContext += " (They got the time wrong, make a friendly joke about it).";
        }
       
        const goal = `${greetingContext} Acknowledge their greeting, then ask them if they found the SDG videos insightful (e.g., 'I see you've just finished... isn't it?').`;
        const mentorReply = await getConversationalReply(userInput, goal);
       
        appendMessage(mentorName, mentorReply);
        window.session.current_step_index = 1;
       
    } else if (index === 1) {
        // --- 2. User replied to "isn't it?" ---
        const goal = `You asked '...isn't it?'. The user replied '${userInput}'. Acknowledge their reply (e.g., "I understand" or "That's great!"), and then ask if they are ready to continue or rewatch. (e.g., "Are you ready to continue... or would you like to re-watch...?")`;
        const mentorReply = await getConversationalReply(userInput, goal);
       
        appendMessage(mentorName, mentorReply);
        window.session.current_step_index = 2;
    } else if (index === 2) {
        // --- 3. Processing "Continue" or "Rewatch" ---
        if (lowerInput.includes('rewatch')) {
            // Send user back to onboarding
            window.session.current_step_index = -1; // Back to last video
            window.session.has_rewatched = true; // [NEW] Set rewatch flag
            await saveSession();
            renderApp(); // This will re-render the static onboarding
            return; // Stop execution
        } else {
            // Assume "continue"
            const goal = `The user is ready to continue. Respond with encouragement and ask them if they are ready for the first phase. (e.g., 'Great. So, to start... are you ready?').`;
            const mentorReply = await getConversationalReply(userInput, goal);
           
            appendMessage(mentorName, mentorReply);
            window.session.current_step_index = 3;
        }
   
    } else if (index === 3) {
        // --- 4. Processing "Are you ready?" ---
        if (positiveReply.some(w => lowerInput.includes(w))) {
            const goal = `The user is ready. Give them one last dynamic, encouraging phrase (e.g., 'That's the first step... don't you think?').`;
            const mentorReply = await getConversationalReply(userInput, goal);
           
            appendMessage(mentorName, mentorReply);
            window.session.current_step_index = 4; // Move to "don't you think?"
        } else {
            // [NEW] Handle "no"
            const goal = `The user said they are not ready. Be empathetic. Ask them what's on their mind.`;
            const mentorReply = await getConversationalReply(userInput, goal);
           
            appendMessage(mentorName, mentorReply);
            window.session.current_step_index = 103; // "Why not ready" loop
        }
       
    } else if (index === 4) {
        // --- 5. Processing "don't you think?" ---
        window.session.current_step_index = 5; // Move to first question
        await saveSession();
        askCurrentQuestion(); // Asks rephrased questions[0]
        return; // Return here to avoid double-enabling input
       
    } else if (index >= 5 && (index - 5) < questions.length) {
        // --- 6. Processing a Question Answer ---
        const questionIndex = index - 5; // 5 -> 0, 6 -> 1
        // [FIX] 9 (1A) + 10 (1B) - 1 (to be 0-indexed) = 18
        const lastPhase1B_QuestionIndex = (discoveryQuestions.length + definingQuestions.length) - 1; // This is 18
       
        const q = questions[questionIndex];
       
        // [NEW] Check for hint request FIRST
        if (lowerInput.includes('hint')) {
            appendMessage('mentor', '', null, true); // Typing...
            await mentorThinking();
            removeTypingIndicator();
            appendMessage(mentorName, `No problem. ${q.helpText}`, userMessageReplyInfo);
           
            // Re-enable input but DO NOT change step
            chatInput.disabled = false;
            sendButton.disabled = false;
            chatInput.focus();
            return;
        }
       
        // [NEW] Check if this is a "refine loop" answer
        if (window.session.awaiting_validation === true) {
            window.session.answers[questionIndex] = userInput; // Save the new answer
            window.session.awaiting_validation = false; // Turn off the flag
            await saveSession();
           
            // Go back to validation
            await triggerValidationSummary(userMessageReplyInfo);
            return; // Stop here
        }
        // --- Normal question flow ---
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
                await triggerValidationSummary(userMessageReplyInfo);
            } else {
                // --- B.2. NORMAL TRANSITION ---
                appendMessage('mentor', '', null, true); // Typing...
               
                let transition;
                const nextQ = questions[questionIndex + 1];
               
                if (nextQ) {
                     transition = await generateSmartTransition(userInput);
                } else {
                    transition = "Got it. That's a very clear point.";
                }
               
                await mentorThinking();
                removeTypingIndicator();
                appendMessage(mentorName, transition, userMessageReplyInfo);
               
                window.session.current_step_index++; // e.g., 5 -> 6
                await saveSession();
               
                await mentorThinking();
                askCurrentQuestion(); // Wait for transition, then ask
            }
        }
   
    } else if (index === 150) {
        // --- 7.A. Handling "Approve" or "Refine" ---
        if (lowerInput.includes('refine')) {
            window.session.current_step_index = 151; // Ask *what* to refine
            await saveSession();
            askCurrentQuestion();
        } else {
            // Assume "approve"
            appendMessage(mentorName, "Excellent. Let's move on to Phase 1C and find your role in this.");
            // 5 (start) + 9 (1A) + 10 (1B) = 24
            window.session.current_step_index = 24; // Start of Phase 1C
            await saveSession();
            setTimeout(askCurrentQuestion, 1500);
        }
    } else if (index === 151) {
        // --- 7.B. Handling "what, who, or why" ---
        window.session.awaiting_validation = true; // Set refine loop flag
        let targetIndex = -1;
        // q-indices: what=9, who=11, why=13
        // step-indices: what=14, who=16, why=18
        if (lowerInput.includes('what')) {
            targetIndex = 14; // Start of 1B (q1b1_what)
        } else if (lowerInput.includes('who')) {
            targetIndex = 16; // q1b3_who (9+5+2)
        } else if (lowerInput.includes('why')) {
            targetIndex = 18; // q1b5_why (9+5+4)
        } else {
            // Didn't understand
            appendMessage(mentorName, "Sorry, I didn't catch that. Please type 'what', 'who', or 'why'.");
            window.session.awaiting_validation = false; // Unset flag
            chatInput.disabled = false;
            sendButton.disabled = false;
            chatInput.focus();
            return;
        }
        appendMessage(mentorName, "Okay, let's look at that again.");
        window.session.current_step_index = targetIndex;
        await saveSession();
        setTimeout(askCurrentQuestion, 1500);
    } else if (index === 100) {
        // --- 7.C. Handling "Ready now?" after rewatch ---
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
        // --- 7.D. User explained why they're not ready ---
        appendMessage(mentorName, "That's understandable. This session is all about exploring your own ideas, so there's no pressure. It's just a space for you to think.");
        await new Promise(r => setTimeout(r, 2000));
        appendMessage(mentorName, "Can we start now?");
        window.session.current_step_index = 102; // Move to final check
        await saveSession();
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
       
    } else if (index === 102) {
        // --- 7.E. Final check ---
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
   
    } else if (index === 103) {
        // --- 7.F. User explained why not ready at index 3 ---
        appendMessage(mentorName, "That's completely okay. This is your journey. Remember, this first step is just about being curious. There are no right or wrong answers.");
        await new Promise(r => setTimeout(r, 2000));
        appendMessage(mentorName, "We can start whenever you're ready. Shall we try?");
        window.session.current_step_index = 3; // Go back to "are you ready" but user sees "shall we try"
        await saveSession();
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
    } else {
        // --- 8. Processing Skills or End of Convo ---
        appendMessage(mentorName, "Thanks! (Logic for this step is next).");
        chatInput.disabled = false;
        sendButton.disabled = false;
        await saveSession();
    }
   
    // [FIX] This is the global re-enable
    // We only re-enable if the step is an "active" step
    const finalIndex = window.session.current_step_index;
    if ((finalIndex >= 0 && finalIndex < 100) || finalIndex >= 150) {
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}

// --- [NEW] REPLY HANDLERS ---
export function handleLogClick(event) {
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

export function scrollToMessage(quotedMessageElement) {
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

export function initReply(messageId, sender, text) {
    currentReply = { messageId, sender, text: summarizeTextShort(text) }; // Use summary
   
    if (replyPreviewName) replyPreviewName.textContent = sender;
    if (replyPreviewText) replyPreviewText.textContent = summarizeTextShort(text);
    if (replyPreviewContainer) replyPreviewContainer.classList.remove('hidden');
   
    if (chatInput) chatInput.focus();
}

export function cancelReply() {
    currentReply = null;
    if (replyPreviewContainer) {
        replyPreviewContainer.classList.add('hidden');
        replyPreviewName.textContent = '';
        replyPreviewText.textContent = '';
    }
}

// --- [REVIVED] ONBOARDING HANDLERS ---
export async function handleNext() {
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

export async function handleBack() {
    const index = window.session.current_step_index;
    if (index > -4) { // Only allow back if not on the first step
        window.session.current_step_index--; // e.g., -3 -> -4
        await saveSession();
        renderApp();
    }
}

export function updateNavigation() {
    // This is for the onboarding buttons
    const index = window.session.current_step_index;
    if (window.appDOM.backButton) {
        window.appDOM.backButton.disabled = (index === -4); // Disable back on first step
    }
}

// Expose interventionCounts as global for scaffolding (or make it session-based)
let interventionCounts = new Map(); // questionId -> count
let expectingRefined = false;
window.interventionCounts = interventionCounts; // Temp global for now