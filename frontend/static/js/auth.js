// frontend/js/auth.js

// Set your backend API URL (Render backend)
const backendURL = "https://the-community-path-project.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const messageContainer = document.getElementById("messageContainer");

    // Show messages
    function showMessage(text, type = "error") {
        const color = type === "success" ? "green" : "red";
        messageContainer.innerHTML = `
            <div class="flash-message bg-${color}-100 border border-${color}-400 text-${color}-700 px-4 py-3 rounded-lg" role="alert">
                ${text}
            </div>
        `;
    }

    // Handle form submission
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${backendURL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                showMessage("Login successful!", "success");
                // Optional: store token/session if backend provides one
                // localStorage.setItem("token", data.token);
                // Redirect after 1 second
                setTimeout(() => {
                    window.location.href = "/index.html";
                }, 1000);
            } else {
                showMessage(data.message || "Login failed!");
            }
        } catch (err) {
            console.error(err);
            showMessage("An error occurred. Check console for details.");
        }
    });
});
