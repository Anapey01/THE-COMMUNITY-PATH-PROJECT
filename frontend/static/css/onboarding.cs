/* Based on your excellent CSS suggestion! */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Poppins", sans-serif;
  /* Dark blue gradient background */
  background: linear-gradient(135deg, #111827, #1e3a8a);
  color: #f9fafb;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.onboarding-container {
  width: 90%;
  max-width: 550px;
  /* Glassmorphism effect */
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  padding: 30px 30px 20px 30px; /* Reduced bottom padding */
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: fadeIn 0.8s ease-in-out;
  display: flex;
  flex-direction: column;
  height: 80vh; /* Set a max height */
  max-height: 700px;
}

/* Progress Bar */
.progress-bar-container {
    width: 100%;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    height: 8px;
    margin-bottom: 25px;
}

.progress-bar {
    width: 0%; /* Starts at 0, updated by JS */
    height: 100%;
    background-color: #3b82f6; /* Blue */
    border-radius: 10px;
    transition: width 0.4s ease-in-out;
}

/* Slide Container */
#slides-container {
    flex-grow: 1; /* This makes the content fill the space */
    overflow-y: auto; /* Adds scroll if content is too tall */
    padding: 0 10px;
    
    /* Custom scrollbar for dark mode */
    scrollbar-width: thin;
    scrollbar-color: #3b82f6 rgba(255, 255, 255, 0.1);
}

#slides-container::-webkit-scrollbar {
    width: 6px;
}
#slides-container::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}
#slides-container::-webkit-scrollbar-thumb {
    background: #3b82f6;
    border-radius: 3px;
}

/* Individual Slide Styling */
.slide {
  display: none;
  opacity: 0;
  transform: translateX(30px);
  transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
}

.slide.active {
  display: block;
  opacity: 1;
  transform: translateX(0);
}

.slide-content {
    /* Styles for the content inside a slide */
}

h1 {
  font-size: 1.8rem;
  margin-top: 0;
  margin-bottom: 20px;
  color: #ffffff;
}

p, li {
  font-size: 1rem;
  color: #e5e7eb;
  line-height: 1.6;
}

ul {
  text-align: left;
  margin: 20px auto;
  padding-left: 30px;
  width: fit-content;
}

.footer-note {
    font-style: italic;
    color: #9ca3af;
    margin-top: 24px;
}

/* Video Container */
.video-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
  height: 0;
  overflow: hidden;
  border-radius: 12px; /* Rounded corners for the video */
  margin-bottom: 1rem;
}

.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

/* Navigation Buttons */
.navigation-buttons {
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.nav-button {
  background: #2563eb;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  font-family: "Poppins", sans-serif;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-button:hover {
  background: #1d4ed8;
  transform: scale(1.03);
}

.back-button {
    background: rgba(255, 255, 255, 0.1);
}
.back-button:hover {
    background: rgba(255, 255, 255, 0.2);
}

/* Animation for the container */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}