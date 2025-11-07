// js/app.chat.js
// CLEAN REWRITE - V2 (Full Chat Logic)
// This file handles all CHAT logic (steps >= 0).

import { 
  questions,
  discoveryQuestions, 
  definingQuestions, 
  phase1BIntro, 
  phase1CIntro,
  callGeminiAPI,       // The new secure API function
  summarizeTextShort,
  getTimeGreeting,
  mentorThinking
} from './app.utils.js';
import { saveSession } from './app.firebase.js';

// --- DOM Elements ---
let conversationLog, chatForm, chatInput, sendButton;
let replyPreviewContainer, replyPreviewName, replyPreviewText, cancelReplyBtn;

// --- State ---
let currentReply = null; // { messageId, sender, text }

// This is the function called by app.init.js
export function renderChatInterface() {
    console.log("Rendering Chat Interface...");
    
    // Hide onboarding footer
    if (window.appDOM.appFooter) window.appDOM.appFooter.style.display = 'none';

    // Get chat template
    const template = document.getElementById('template-chat-interface');
    if (!template) {
        console.error("Chat interface template not found!");
        window.appDOM.appContainer.innerHTML = "<p>Error: Chat template failed to load.</p>";
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
    replyPreviewContainer = document.getElementById('reply-preview-container');
    replyPreviewName = document.getElementById('reply-preview-name');
    replyPreviewText = document.getElementById('reply-preview-text');
    cancelReplyBtn = document.getElementById('cancel-reply-btn');
   
    // Attach listeners
    if (chatForm) {
        chatForm.addEventListener('submit', handleChatSubmit);
    }
    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', cancelReply);
    }
    if (conversationLog) {
        conversationLog.addEventListener('click', handleLogClick);
    }
    
    window.appDOM.currentStepSpan.textContent = "Mentor Chat";
    
    // Kick off the conversation
    startChatConversation();
}

// --- Main Chat Flow ---

export function startChatConversation() {
    if (!conversationLog) {
        console.error("Cannot start chat, conversation log not ready.");
        return;
    }
    conversationLog.innerHTML = ''; // Clear placeholder
   
    // Render all existing chat history
    window.session.chat_history.forEach(msg => {
        appendMessage(msg.sender, msg.rawText, msg.replyInfo);
    });
    
    // Check if we are starting a new conversation
    if (window.session.chat_history.length === 0) {
        window.session.current_step_index = 0; // Ensure it's 0
        askCurrentQuestion(); // This will ask the first welcome message
    } else {
        // User is returning, re-enable input
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
    }
}

export async function askCurrentQuestion() {
    const index = window.session.current_step_index;
    let questionAsked = false;
    const mentorName = window.session.mentor_name || "Mentor";
   
    appendMessage('mentor', '', null, true); // Typing...
    await mentorThinking();
    removeTypingIndicator();
   
    // --- AI-Powered Welcome Flow ---
    if (index === 0) {
        const name = window.session.student_name || "friend";
        if (window.session.has_rewatched) {
            appendMessage(mentorName, `Welcome back, ${name}. I believe you are ready now?`);
            window.session.current_step_index = 100; // Special state
        } else {
            appendMessage(mentorName, `${getTimeGreeting()}, ${name}.`);
        }
        questionAsked = true;
    } 
    // --- Placeholder for other steps (1-4) ---
    // These are handled by getConversationalReply in handleChatSubmit
    
    // --- First "Real" Question ---
    else if (index === 5) {
        const q = questions[0]; // q[0]
        window.session.current_question = q.title;
        appendMessage(mentorName, "Okay, let's begin. What's that first problem or challenge you've noticed in your community, school, home, or Ghana that makes you say 'damm, this issue must be solved'? (And you can just type **'hint'** if you're stuck).");
        questionAsked = true;
        // interventionCounts.set(q.id, 0); // We'll add this with scaffolding
    }
    
    // --- Add logic for other questions later ---
    // (We'll add the scaffolding logic for this in the next step)
    
    // Re-enable input
    if (questionAsked) {
        if(chatInput) chatInput.disabled = false;
        if(sendButton) sendButton.disabled = false;
        if(chatInput) chatInput.focus();
    }
}

export async function handleChatSubmit(event) {
    event.preventDefault();
    if (!chatInput) return;
   
    const userInput = chatInput.value.trim();
    if (userInput === '') return;
    
    const replyData = currentReply;
   
    const userMessageId = appendMessage('user', userInput, replyData);
    const userMessageReplyInfo = {
        messageId: userMessageId,
        sender: window.session.student_name || 'You',
        text: summarizeTextShort(userInput)
    };
   
    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;
    cancelReply(); // Clear the reply state
   
    const index = window.session.current_step_index;
    const lowerInput = userInput.toLowerCase();
    const positiveReply = ['yes', 'yep', 'ya', 'sure', 'ok', 'okay', 'ready', 'i am', 'i think so', 'continue'];
    const mentorName = window.session.mentor_name || "Mentor";
   
    await mentorThinking();
    
    // --- AI-POWERED WELCOME FLOW (Steps 0-4) ---
    let goal = '';
    let mentorReply = '';

    if (index === 0) {
        // --- 1. User replied to "Good morning" ---
        const mentorGreeting = getTimeGreeting().toLowerCase();
        let greetingContext = `You said '${getTimeGreeting()}'. The user replied '${userInput}'.`;
        if (mentorGreeting.includes('afternoon') && lowerInput.includes('morning')) {
            greetingContext += " (They got the time wrong, make a friendly joke about it).";
        }
        goal = `${greetingContext} Acknowledge their greeting, then ask them if they found the SDG videos insightful (e.g., 'I see you've just finished... isn't it?').`;
        mentorReply = await getConversationalReply(userInput, goal);
        appendMessage(mentorName, mentorReply);
        window.session.current_step_index = 1;

    } else if (index === 1) {
        // --- 2. User replied to "isn't it?" ---
        goal = `You asked '...isn't it?'. The user replied '${userInput}'. Acknowledge their reply (e.g., "I understand" or "That's great!"), and then ask if they are ready to continue or rewatch. (e.g., "Are you ready to continue... or would you like to re-watch...?")`;
        mentorReply = await getConversationalReply(userInput, goal);
        appendMessage(mentorName, mentorReply);
        window.session.current_step_index = 2;

    } else if (index === 2) {
        // --- 3. Processing "Continue" or "Rewatch" ---
        if (lowerInput.includes('rewatch')) {
            window.session.current_step_index = -1; // Back to last video
            window.session.has_rewatched = true;
            await saveSession();
            // We need to tell app.init.js to re-render
            // For now, we'll just reload the page
            window.location.reload(); 
            return;
        } else {
            goal = `The user is ready to continue. Respond with encouragement and ask them if they are ready for the first phase. (e.g., 'Great. So, to start... are you ready?').`;
            mentorReply = await getConversationalReply(userInput, goal);
            appendMessage(mentorName, mentorReply);
            window.session.current_step_index = 3;
        }
   
    } else if (index === 3) {
        // --- 4. Processing "Are you ready?" ---
        if (positiveReply.some(w => lowerInput.includes(w))) {
            goal = `The user is ready. Give them one last dynamic, encouraging phrase (e.g., 'That's the first step... don't you think?').`;
            mentorReply = await getConversationalReply(userInput, goal);
            appendMessage(mentorName, mentorReply);
            window.session.current_step_index = 4;
        } else {
            goal = `The user said they are not ready. Be empathetic. Ask them what's on their mind.`;
            mentorReply = await getConversationalReply(userInput, goal);
            appendMessage(mentorName, mentorReply);
            // We'll add the "not ready" loop later
        }
       
    } else if (index === 4) {
        // --- 5. Processing "don't you think?" ---
        window.session.current_step_index = 5; // Move to first question
        await saveSession();
        askCurrentQuestion(); // Asks questions[0]
        return; // Return here
       
    } else if (index >= 5) {
        // --- 6. Processing a Question Answer ---
        // (We will add the scaffolding logic here in the next step)
        appendMessage(mentorName, "Thanks for that answer! I'm still learning how to process this part. Let's move on for now.");
        // For now, just re-enable
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
        
    } else {
        // Fallback for other states
        appendMessage(mentorName, "I'm not sure what to say. Let's try continuing.");
        window.session.current_step_index = 5;
        askCurrentQuestion();
    }
   
    // Re-enable input (unless we already returned)
    chatInput.disabled = false;
    sendButton.disabled = false;
    chatInput.focus();
    
    await saveSession();
}

// --- AI Chat Helper ---
async function getConversationalReply(userInput, contextGoal) {
    const mentorName = window.session.mentor_name || "Mentor";
    const studentName = window.session.student_name || "Student";
    
    const systemInstruction = `You are ${mentorName}, a warm, empathetic, and human-like mentor for a Ghanaian student named ${studentName}.
You are in the *welcome phase* of a chat. Your goal is to be natural, listen, and make them feel comfortable.
**RULES:**
1. **Be Brief:** Use 1-2 short sentences.
2. **Be Human:** Be conversational, not robotic.
3. **Listen:** Always respond directly to what the user just said.
4. **Follow the Goal:** Your reply MUST achieve the "CURRENT GOAL".
**CURRENT GOAL:** ${contextGoal}
`;
    
    const history = window.session.chat_history.slice(-3); // Get last 3 messages
    const context = history.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
   
    const userQuery = `**Conversation History:**\n${context}\n\n**User's last message:** "${userInput}"`;
    
    try {
        // Use the secure, imported callGeminiAPI
        const response = await callGeminiAPI(systemInstruction, userQuery);
        return response;
    } catch (error) {
        console.error("Conversational reply failed:", error);
        return "I see. Shall we continue?";
    }
}


// --- DOM Helpers (Bubbles & Replies) ---

export function appendMessage(sender, message, replyInfo = null, isTyping = false) {
    if (!conversationLog) return null;
   
    const isUser = sender === 'user';
    const senderName = isUser ? (window.session.student_name || 'You') : (sender || 'Mentor');
   
    const logItem = document.createElement('div');
    logItem.className = `p-3 rounded-xl shadow-sm ${isUser ? 'user-bubble' : 'ai-bubble'} max-w-[85%] text-sm`;
    logItem.style.wordBreak = 'break-word';
   
    const messageId = `msg-${window.session.chat_history.length}`;
    logItem.dataset.messageId = messageId;
    logItem.dataset.senderName = senderName;
    logItem.dataset.messageText = message;
    
    let messageHTML = '';
    
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
        let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        messageHTML += `<span class="font-semibold">${senderName}:</span> ${formattedMessage}`;
        messageHTML += `
            <button class="reply-btn" title="Reply">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
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
   
    if (!isTyping) {
        window.session.chat_history.push({
            id: messageId,
            sender: senderName,
            text: message.replace(/\*\*(.*?)\*\*/g, '$1'),
            rawText: message,
            replyInfo: replyInfo
        });
        return messageId;
    }
    return null;
}

export function removeTypingIndicator() {
  const indicator = document.getElementById('ai-typing-indicator');
  if (indicator) indicator.remove();
}

export function handleLogClick(event) {
    const replyButton = event.target.closest('.reply-btn');
    if (replyButton) {
        const messageBubble = event.target.closest('[data-message-id]');
        if (!messageBubble) return;
        const { messageId, senderName } = messageBubble.dataset;
        const historyMessage = window.session.chat_history.find(m => m.id === messageId);
        const cleanText = historyMessage ? historyMessage.text : messageBubble.dataset.messageText;
        initReply(messageId, senderName, cleanText);
        return;
    }
    const quotedMessage = event.target.closest('.quoted-message');
    if (quotedMessage) {
        scrollToMessage(quotedMessage);
        return;
    }
}

export function scrollToMessage(quotedMessageElement) {
    const messageId = quotedMessageElement.dataset.scrollToId;
    if (!messageId) return;
    const originalMessage = conversationLog.querySelector(`[data-message-id="${messageId}"]`);
    if (originalMessage) {
        originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        originalMessage.classList.add('highlight');
        setTimeout(() => {
            originalMessage.classList.remove('highlight');
        }, 1500);
    }
}

export function initReply(messageId, sender, text) {
    currentReply = { messageId, sender, text: summarizeTextShort(text) };
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