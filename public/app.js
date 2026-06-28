import { micromark } from 'https://esm.sh/micromark@3?bundle'

const btn = document.getElementById("send-btn");
const input = document.getElementById("chat-input");
const container = document.getElementById("chat-container");
const form = document.getElementById("event-form");

let userid = localStorage.getItem("chat_userid");

if (!userid) {
    userid = "user-" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("chat_userid", userid);
}
console.log("Mijn userid is:", userid);

function scrollChatToBottom() {
    // Scroll het chat-gebied en de pagina zelf naar onderen
    container.scrollTop = container.scrollHeight;
    try {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
        // Fallback voor oudere browsers
        window.scrollTo(0, document.body.scrollHeight);
    }
}

// Event listener voor formulier submit
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const guests = document.getElementById("guests").value;
    const date = document.getElementById("date").value;
    const budget = document.getElementById("budget").value;
    const location = document.getElementById("location").value;

     const eventMessage = `Ik wil een evenement organiseren met deze details:
 - Aantal gasten: ${guests}
 - Datum: ${date}
 - Budget: €${budget}
 - Locatietype: ${location}

Geef me een concreet advies over catering, kosten en het weer.`;

    // Verstuur naar agent
    await sendMessage(eventMessage);

    // Reset form
    form.reset();
});

async function sendMessage(tekst) {
    const cleanText = String(tekst ?? "").trim();
    if (!cleanText) return;

    // Voeg gebruikersbericht toe
    const userDiv = document.createElement("div");
    userDiv.innerHTML = `<b>Jij:</b> ${cleanText}`;
    container.appendChild(userDiv);
    scrollChatToBottom();
    
    input.value = "";

    try {
        // Toon loading state
        const loadingDiv = document.createElement("div");
        loadingDiv.innerHTML = `<b>AI:</b> <em>Even denken...</em>`;
        loadingDiv.style.opacity = "0.6";
        container.appendChild(loadingDiv);
        scrollChatToBottom();

        const r = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: cleanText,
                userid: userid || "web-user",
            })
        });

        if (!r.ok) {
            const errorText = await r.text();
            throw new Error(`Server error ${r.status}: ${errorText || r.statusText}`);
        }

        const data = await r.json();

        // Vervang loading met antwoord
        container.removeChild(loadingDiv);
        
        const aiDiv = document.createElement("div");
        aiDiv.innerHTML = `
            <b>AI Event Planner:</b> ${micromark(data.message)}
            <div style="margin-top: 10px; color: #667eea; font-size: 0.9em;">
                <span class="tool-tag">🔧 Tools: ${data.toolsUsed.join(", ") || "Geen"}</span>
            </div>
        `;
        container.appendChild(aiDiv);
        
        // Scroll naar nieuwste bericht
        scrollChatToBottom();
    } catch (e) {
        const errorDiv = document.createElement("div");
        errorDiv.innerHTML = `<div style="color: #e74c3c;"><b>⚠️ Fout:</b> ${e.message}</div>`;
        container.appendChild(errorDiv);
        scrollChatToBottom();
    }
}

btn.addEventListener("click", () => {
    sendMessage(input.value);
});

// Enter key in chat input
input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        btn.click();
    }
});