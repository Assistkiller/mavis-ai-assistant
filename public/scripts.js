const chatForm = document.getElementById("chat-form");
const chatHistory = document.getElementById("chat-history");
const userInput = document.getElementById("user_input");

const renderer = new marked.Renderer();
let workflows = []
// Listas ordenadas e não ordenadas
renderer.list = (body, ordered) => {
    // Create the HTML structure for the list
    const tag = ordered ? 'ol' : 'ul'; // Check if the list is ordered or unordered
    const itemsHtml = body.items.map(item => {
        // Map each list item into an HTML element
        return `<${tag} style="margin: 10px; ">${item.text}</${tag}>`;
    }).join(''); // Join all items together

    // Complete the list HTML
    return `<${tag} class="markdown-list" style="margin: 10px;">${itemsHtml}`;
};

// Itens da lista
renderer.listitem = (text) => {
    return `<li class="markdown-list-item">${text}</li>\n`;
};

// Blocos de código
renderer.code = function (code, language) {
    console.log("Code:", code);  // Debugging

    // Escape special characters
    const escapedCode = code.text
        .replace(/\\/g, '\\\\')  // Escape backslashes
        .replace(/'/g, "\\'")     // Escape single quotes
        .replace(/"/g, '&quot;')  // Escape double quotes (if needed)
        .replace(/\n/g, '\\n')    // Escape newlines
        .replace(/\r/g, '\\r');   // Escape carriage returns
    
    const escapedHTML = code.text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    return `
        <div class="code-block">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="language">${code.lang || 'plaintext'}
                    <button class="copy-btn" onclick="navigator.clipboard.writeText('${escapedCode}');">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="code-content">
                <pre><code class="code">${escapedHTML}</code></pre>
            </div>
            <div class="language">
                <button class="collapse-btn" onclick="toggleCollapse(this)">
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button class="copy-btn" onclick="navigator.clipboard.writeText('${escapedCode}');">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        </div>
    `;
};

// Citações
renderer.blockquote = (quote) => {
    return `<blockquote class="markdown-quote">${quote.text}</blockquote>\n`;
};

// Links
// renderer.link = (href, title, text) => {
//     return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="markdown-link">${text}</a>\n`;
// };

// Imagens
renderer.image = (href, title, text) => {
    return `<img src="${href.href}" alt="${href.text}" class="markdown-image"/>\n`;
};

// Tabelas
// renderer.table = (header, body) => {
//     return `
//     <table class="markdown-table">
//         <thead>${header}</thead>
//         <tbody>${body}</tbody>
//     </table>\n`;
// };

// Tarefas (Checkbox)
renderer.listitem = (text) => {
    if (text.startsWith("[ ]")) {
        return `<li class="markdown-task"><input type="checkbox" disabled> ${text.slice(3)}</li>\n`;
    } else if (text.startsWith("[x]")) {
        return `<li class="markdown-task"><input type="checkbox" disabled checked> ${text.slice(3)}</li>\n`;
    }
    return `<li class="markdown-list-item">${text}</li>\n`;
};

// Configurar o Marked.js para usar o renderer
marked.setOptions({
    gfm: true,
    breaks: true,
    smartLists: true,
    smartypants: true,
    renderer: renderer,
    highlight: function (code, lang) {
        console.log(code)
        return hljs.highlightAuto(code).value;
    },
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
    });
});

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(chatForm);
    const userMessage = formData.get("user_input");
    userMessageElement = createMessageBox('human', userMessage)
    chatHistory.appendChild(userMessageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    chatForm.reset();

    try {
        const response = await fetch("/chat", {
            method: "POST",
            body: formData,
        });
        const responseText = await response.text();
        console.log(responseText)
        chatHistory.appendChild(createMessageBox("bot", responseText))
        chatHistory.scrollTop = chatHistory.scrollHeight;
    } catch (error) {
        console.error("Error fetching chat response:", error);
    }
});

function createWelcomeMessageBox(){
    const message = "Hi there! 👋 \n\
I'm MAVIS – your **Multi-tasking AI Virtual Intelligent Solution**. Think of me as your personal AI assistant, Ready to help with anything you need! 💡🤖 \n\
How can I assist you today?"
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", "welcome-message");
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("message-content");
    contentDiv.innerHTML = marked.parse(message);
    messageDiv.appendChild(contentDiv);
     return messageDiv;
}

function createMessageBox(type, message){
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", type === "human" ? "user-message" : "ai-message");

    const contentDiv = document.createElement("div");
    contentDiv.classList.add("message-content");
    contentDiv.innerHTML = marked.parse(message);

    const buttonsDiv = document.createElement("div");
    buttonsDiv.classList.add("message-buttons");

    if (type === "human") {
        const editButton = document.createElement("button");
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.classList.add("edit-btn");
        editButton.onclick = () => editMessage(contentDiv, message);
        buttonsDiv.appendChild(editButton);
    }

    const copyButton = document.createElement("button");
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.classList.add("copy-btn");
    copyButton.onclick = () => navigator.clipboard.writeText(message);
    buttonsDiv.appendChild(copyButton);

    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(buttonsDiv);
    return messageDiv;
}

// Handle Enter key press
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        chatForm.dispatchEvent(new Event('submit', { bubbles: true }));
    }
}

// Scroll to the bottom of the chat history on page load
window.addEventListener("load", () => {
    chatHistory.scrollTop = userInput.scrollHeight;
});

function toggleSidebar() {
    loadworkflows();
    const sidebar = document.getElementById("workflow-sidebar");
    const scrollButtons = document.getElementById("scrollButtons");
    console.log(scrollButtons)
    sidebar.classList.toggle("open");
    scrollButtons.classList.toggle("hidden");
}

// Close sidebar when clicking outside
document.addEventListener("click", function(event) {
    const sidebar = document.getElementById("workflow-sidebar");
    const scrollButtons = document.getElementById("scrollButtons");
    const toggleButton = document.querySelector(".toggle-btn");
    
    if (!sidebar.contains(event.target) && !toggleButton.contains(event.target)) {
        sidebar.classList.remove("open");
        scrollButtons.classList.remove("hidden");
    }
});

// Load workflows from the server
async function loadworkflows() {
    try {
        const response = await fetch("/workflows");
        workflows = await response.json();
        const workflowList = document.getElementById("workflow-list");
        workflowList.innerHTML = "";
        workflows.reverse();
        workflows.forEach(workflow => {
            
            const li = document.createElement("li");

            const span = document.createElement("span");
            span.textContent = workflow.name;
            li.appendChild(span)
            li.dataset.workflowId = workflow.uuid;

            const removeIcon = document.createElement("i");
            removeIcon.classList.add("fas", "fa-trash", "remove-icon");
            removeIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteWorkflow(workflow.uuid);
            });

            const pinIcon = document.createElement("i");
            pinIcon.classList.add("fas", "fa-thumbtack", "pin-icon");
            pinIcon.addEventListener("click", (e) => {
                e.stopPropagation();
                pinWorkflow(workflow.uuid);
            });

            li.append(removeIcon);
            li.prepend(pinIcon);

            li.addEventListener("click", () => selectWorkflow(workflow.uuid));

            workflowList.appendChild(li);
        });
    } catch (error) {
        console.error("Failed to load workflows:", error);
    }
}

// Select a workflow
async function selectWorkflow(workflowId) {
    try {
        const response = await fetch("/workflow", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ workflow_id: workflowId }),
        });
        if (response.ok) {
            console.log("Workflow selected successfully");
            await loadHistory(workflowId);
        } else {
            console.error("Failed to select workflow");
        }
    } catch (error) {
        console.error("Failed to select workflow:", error);
    }
}

// Create a new workflow
async function createNewWorkflow() {
    const workflowName = prompt("Enter a name for the new workflow:");
    if (workflowName) {
        const response = await fetch("/workflows", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: workflowName }),
        });
        if (response.ok) {
            const data = await response.json();
            const workflowId = data.uuid;
            console.log("Workflow created successfully:", workflowId);
            await loadworkflows();
            await loadHistory(workflowId);
        } else {
            console.error("Failed to create workflow");
        }
    }
}

// Delete a workflow
async function deleteWorkflow(workflowId) {
    try {
        const response = await fetch(`/workflows/${workflowId}`, {
            method: "DELETE",
        });
        if (response.ok) {
            console.log("Workflow deleted successfully");
            await loadworkflows();
        } else {
            console.error("Failed to delete workflow");
        }
    } catch (error) {
        console.error("Failed to delete workflow:", error);
    }
}

// Pin a workflow
async function pinWorkflow(workflowId) {
    try {
        const response = await fetch(`/workflows/${workflowId}/pin`, {
            method: "POST",
        });
        if (response.ok) {
            console.log("Workflow pinned successfully");
            await loadworkflows();
        } else {
            console.error("Failed to pin workflow");
        }
    } catch (error) {
        console.error("Failed to pin workflow:", error);
    }
}

// Load chat history for a workflow
async function loadHistory(workflowId) {
    try {
        const response = await fetch(`/history/${workflowId}`);
        if (!response.ok) {
            throw new Error(`Failed to load history: ${response.statusText}`);
        }
        const history = await response.json();
        const chatHistory = document.getElementById("chat-history");
        chatHistory.innerHTML = "";

        if (!history || !Array.isArray(history)) {
            throw new Error("Invalid history format: expected an array");
        }

        // chatHistory.appendChild(createWelcomeMessageBox())
        history.forEach(message => {
            if (!message || typeof message !== "object" || !message.type || !message.data || !message.data.content) {
                console.error("Invalid message format:", message);
                return;
            }
            
            if (message.type !== "system") {
                const messageDiv = createMessageBox(message.type, message.data.content);
                chatHistory.appendChild(messageDiv);
            }
        });

        chatHistory.scrollTop = chatHistory.scrollHeight;
    } catch (error) {
        console.error("Failed to load history:", error);
        const chatHistory = document.getElementById("chat-history");
        chatHistory.innerHTML = "<p>Failed to load chat history. Please try again.</p>";
    }
}

function editMessage(contentDiv, message) {
    const newText = prompt("Edit your message:", message.data.content);
    if (newText !== null) {
        message.data.content = newText;
        contentDiv.innerHTML = marked.parse(newText);
    }
}

// Load models from the server
async function loadModels() {
    try {
        const response = await fetch("/models");
        if (!response.ok) {
            throw new Error(`Failed to load models: ${response.statusText}`);
        }
        models = await response.json();
        renderModels();
    } catch (error) {
        console.error("Failed to load models:", error);
    }
}

// Render the model list
function renderModels() {
    const modelList = document.getElementById("model-list");
    modelList.innerHTML = ""; // Clear the list

    models.forEach((model, index) => {
        const modelItem = document.createElement("div");
        modelItem.className = "model-item";

        modelItem.innerHTML = `
            <div class="model-info"> 
                <span>🔹 Provider: ${model.provider.charAt(0).toUpperCase() + model.provider.slice(1)}</span>
                <span>🤖 Model: ${model.name}</span>
                <span>${model.censored ? "🔒 Censored" : "🔓 Uncensored"}</span>
            </div>
            <div class="model-btns">
                <button onclick="moveModelUp(${index})">⬆️</button>
                <button onclick="moveModelDown(${index})">⬇️</button>
                <button onclick="removeModel(${index})">❌</button>
            </div>
        `;

        modelList.appendChild(modelItem);
    });
}

// Add a new model
async function addModel() {
    const provider = prompt("Enter provider (e.g., OpenAI, Ollama):");
    const name = prompt("Enter model name:");
    const censored = confirm("Is this model censored?");

    if (provider && name) {
        const response = await fetch("/models", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ provider, name, censored }),
        });
        if (response.ok) {
            await loadModels();
        } else {
            console.error("Failed to add model");
        }
    }
}

// Remove a model
async function removeModel(index) {
    if (confirm("Are you sure you want to remove this model?")) {
        const model = models[index];
        const response = await fetch(`/models/${model.name}`, {
            method: "DELETE",
        });
        if (response.ok) {
            await loadModels();
        } else {
            console.error("Failed to remove model");
        }
    }
}

// Move a model up
async function moveModelUp(index) {
    if (index > 0) {
        try {
            const response = await fetch("/models/move", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ from_index: index, to_index: index - 1 }),
            });
            if (response.ok) {
                await loadModels(); // Refresh the model list
            } else {
                console.error("Failed to move model:", await response.text());
            }
        } catch (error) {
            console.error("Error moving model up:", error);
        }
    }
}

// Move a model down
async function moveModelDown(index) {
    if (index < models.length - 1) {
        try {
            const response = await fetch("/models/move", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ from_index: index, to_index: index + 1 }),
            });
            if (response.ok) {
                await loadModels(); // Refresh the model list
            } else {
                console.error("Failed to move model:", await response.text());
            }
        } catch (error) {
            console.error("Error moving model down:", error);
        }
    }
}

function toggleCollapse(button) {
    const codeBlock = button.closest('.code-block').querySelector('.code-content');
    if (codeBlock) {
        const isCollapsed = codeBlock.style.display === "none";
        codeBlock.style.display = isCollapsed ? "block" : "none";
        button.innerHTML = isCollapsed ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
    }
}

function setRandomAnimation() {
    const glowingBar = document.querySelector('.glowing-bar');
    const glowing = document.querySelector('.glowing');

    // Set random durations on the animations
    const randomDuration = Math.random() * (5 - 0.5) + 0.5;
    const randomCount = Math.round(Math.random() + 1);
    glowingBar.style.animationDuration = "0.2s";
    glowing.style.animationDuration = "0.2s";

    // Reset the animations
    glowingBar.style.animation = 'none'; // Reset animation
    glowing.offsetWidth; // Trigger reflow to reset
    glowingBar.style.animation = `pulseBar 0.2s ${randomCount}`;

    glowing.style.animation = 'none'; // Reset animation
    glowing.offsetWidth; // Trigger reflow to reset
    glowing.style.animation = `pulseGlow 0.2s ${randomCount}`;

    // Call again after random interval
    setTimeout(setRandomAnimation, randomDuration * 1000);
}

// Start the random animation interval
// setRandomAnimation();

function createClouds() {
    const sky = document.querySelector('.sky');

    const cloudTypes = ['Foreground', 'Background'];
    const cloudSizes = ['tiny', 'small', 'medium', 'big'];

    for (let i = 0; i <10; i++) {
        // Create a new cloud div
        const cloud = document.createElement('div');
        cloud.classList.add('Cloud');

        // Randomly select the cloud type
        const randomType = cloudTypes[Math.floor(Math.random() * cloudTypes.length)];
        cloud.classList.add(randomType);

        // Weighted random selection for size: more small clouds
        const randomSize = weightedRandomSize();
        cloud.classList.add(randomSize);

        // Set random absolute position within the sky div
        const randomX = Math.floor(Math.random() * 100); // percentage of the width
        
        // Create a gradient effect for the Y position (more clouds at the top)
        const randomY = Math.floor(Math.pow(Math.random(), 2) * 60); // Y position skewed towards the top
        cloud.style.position = 'absolute';
        cloud.style.left = `${randomX}%`;
        cloud.style.top = `${randomY}%`;

        // Randomize the size of each cloud based on the selected size class
        const size = sizeToPixels(randomSize);
        cloud.style.width = `${size}px`;
        cloud.style.height = `${size * 0.6}px`; // Maintain aspect ratio

        // Randomly flip the cloud
        if (Math.random() > 0.5) {
            cloud.classList.add('flipped');
        }

        // Duration based on size (slower for larger clouds)
        const duration = 600 - (size / 2); // Duration in seconds (adjust as needed)
        cloud.style.animationDuration = `${duration}s`;

        // Randomly set a delay
        const delay = Math.random() * 0; // Random delay between 0s and 10s
        cloud.style.animationDelay = `${delay}s`;

        // Randomly set direction
        if (Math.random() > 0.5) {
            cloud.style.animationName = 'moveCloudRight';
        } else {
            cloud.style.animationName = 'moveCloudLeft';
        }

        // Create keyframes for left and right movement
        const styleSheet = document.styleSheets[0];
        if (cloud.style.animationName === 'moveCloudRight') {
            styleSheet.insertRule(`@keyframes moveCloudRight {
                0% { transform: translateX(0); }
                50% { transform: translateX(100vw); }
                100% { transform: translateX(0); }
            }`, styleSheet.cssRules.length);
        } else {
            styleSheet.insertRule(`@keyframes moveCloudLeft {
                0% { transform: translateX(0); }
                50% { transform: translateX(-100vw); }
                100% { transform: translateX(0); }
            }`, styleSheet.cssRules.length);
        }

        // Append the cloud to the sky
        sky.appendChild(cloud);
    }
}

   
// Function to return a weighted random size
function weightedRandomSize() {
    const sizes = ['tiny', 'tiny', 'small', 'small', 'medium', 'big'];  // Weighted towards smaller sizes
    return sizes[Math.floor(Math.random() * sizes.length)];
}

// Function to translate size classes to pixel sizes
function sizeToPixels(sizeClass) {
    switch (sizeClass) {
        case 'tiny': return Math.random() * 20 + 20; // Tiny clouds: 20px to 40px
        case 'small': return Math.random() * 40 + 40; // Small clouds: 40px to 80px
        case 'medium': return Math.random() * 60 + 60; // Medium clouds: 60px to 120px
        case 'big': return Math.random() * 40 + 100; // Big clouds: 100px to 140px
        default: return 60; // Default size (in case of an error)
    }
}

// Call the function to spawn clouds
// createClouds();

function scrollToTop() {
    document.getElementById("chat-history").scrollTo({ top: 0, behavior: "smooth" });
}
function scrollToBottom() {
    const chatHistory = document.getElementById("chat-history");
    chatHistory.scrollTo({ top: chatHistory.scrollHeight, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadworkflows();
    await loadModels();
    console.log(workflows)
    selectWorkflow(workflows[0].uuid)
});

hljs.highlightAll();
