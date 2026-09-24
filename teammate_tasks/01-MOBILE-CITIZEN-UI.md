# Task 01: Build the Citizen Reporting Form UI

**Assigned to**: Teammate
**Difficulty**: Beginner (AI-Assisted)
**Branch**: `feature/citizen-portal-ui`

Welcome to the AeroMesh project! Your task is to build a purely visual, frontend user interface for the **"Citizen Reporting Portal"** where people can report smoke or pollution from their mobile phones.

You don't need to know how to code! You will use an AI coding assistant called **Codex** inside VS Code to do the heavy lifting.

Follow these steps **exactly in order**. Do not skip any steps.

---

## Step 1: Install Your Tools (Git & VS Code)

Before you begin, you need the basic tools to download code and edit it.

1. **Install Git**:
   - Go to [https://git-scm.com/downloads](https://git-scm.com/downloads)
   - Download the installer for your operating system (Windows/Mac) and click through the standard installation steps (leaving all default settings).
2. **Install VS Code**:
   - Go to [https://code.visualstudio.com/](https://code.visualstudio.com/)
   - Download and install the Visual Studio Code editor.

---

## Step 2: Get the Code onto Your Desktop

It is **very important** that you do not edit the main project directly. You will create your own isolated copy (a "branch").

1. Open your computer's terminal:
   - **Windows**: Search for `Git Bash` or `Command Prompt` in your start menu.
   - **Mac**: Open the `Terminal` app.
2. Navigate to your Desktop folder:
   ```bash
   cd Desktop
   ```
3. Download (clone) the project code:
   ```bash
   git clone https://github.com/abtimist/AeroMesh.git
   ```
4. Go into the project folder:
   ```bash
   cd AeroMesh
   ```
5. Create your own safe workspace (a branch) named `feature/citizen-portal-ui`:
   ```bash
   git checkout -b feature/citizen-portal-ui
   ```
6. Open this folder in VS Code:
   ```bash
   code .
   ```

---

## Step 3: Install the "Codex" AI Extension

Now we will install your AI assistant, Codex, which will write the code for you.

1. In VS Code, look at the very left edge of the window. Click the **Extensions** icon (it looks like 4 small squares).
2. In the search bar at the top, type: **Codex**
3. Find the official Codex extension (usually by OpenAI or GitHub Copilot/Codex) and click **Install**.
4. Once installed, you will see a new Codex chat icon on the left sidebar. Click it. (If it asks you to sign in, follow the prompts).

---

## Step 4: Tell Codex What to Build

We want to build a simple React component for a mobile phone screen where a citizen can report a pollution event. 

1. We already have an approved design system. In VS Code, open the file `docs/design/DESIGN_SYSTEM.md` so you (and Codex) can see the color palette and typography.
2. Open the **Codex Chat panel** on the left.
3. Copy and paste the following prompt exactly into the Codex chat:

> "I need to create a new React component for our project. We are using Vite, React, and Tailwind CSS. 
> Please read `docs/design/DESIGN_SYSTEM.md` for our design guidelines, typography, and color palette.
> 
> Create a new file at `frontend/src/components/CitizenReportForm.jsx`. 
> It should be a mobile-first UI with a clean white/light theme. 
> It needs:
> 1. A top header that says 'AeroMesh Citizen Portal'.
> 2. A red alert banner below the header that says '⚠️ Air Quality: UNHEALTHY in your area'.
> 3. A large, circular AQI (Air Quality Index) gauge in the center showing a number like '198' using our design system colors.
> 4. A giant, highly visible 'Report Smoke/Fire' button at the bottom.
> 5. Make it look very modern and premium using Tailwind CSS classes (shadows, rounded corners).
> 
> Please give me the exact code, and tell me how to import it into `frontend/src/App.jsx` to test it."

4. Codex will generate the code. Use the "Apply to file" button, or manually copy and paste the code it gives you into the new file `frontend/src/components/CitizenReportForm.jsx`.
5. Follow Codex's instructions to temporarily put your component into `frontend/src/App.jsx` so you can see it on the screen.

---

## Step 5: Test and Look at Your UI

1. At the top of VS Code, click `Terminal -> New Terminal`.
2. Type the following to start the frontend website:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. It will give you a link (usually `http://localhost:5173`). `Ctrl+Click` (or `Cmd+Click` on Mac) that link to open it in your browser.
4. Check if the UI looks good! If it doesn't look right, tell Codex in the chat what to fix (e.g., "Make the button bigger and red", or "Center the text").

---

## Step 6: Save and Upload (Push) Your Work

Once you are happy with how it looks, you need to save it and send it to GitHub so the rest of the team can review it.

1. In the VS Code Terminal, stop the server by pressing `Ctrl + C`.
2. Run these exact commands to save your work to your specific branch:
   ```bash
   git add .
   git commit -m "feat: added citizen report form UI"
   git push origin feature/citizen-portal-ui
   ```
3. You're done! Tell your teammate that your branch is pushed. **Do not merge it into `main` yourself.**
