// js/app.profile.js
// Generate profile summaries (like generateProfileSummary)
import { callGeminiAPI, skillTags, questions, discoveryQuestions, definingQuestions, saveSession } from './app.utils.js';
import { mentorThinking, appendMessage } from './app.utils.js'; // For chat integration

export async function generateProfileSummary() {
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

// Stub for other profile-related functions if needed
export function handleTagClick(event) {
  console.log("handleTagClick needs re-wire");
}
export function toggleRefineEditor(show) {
    console.log("Validation UI needs re-wire");
}
export async function handleRegenerateSummary() {
    console.log("Validation UI needs re-wire");
}
export async function handleValidationApproval() {
    console.log("Validation UI needs re-wire");
}