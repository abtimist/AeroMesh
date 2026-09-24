# Task 01: Build the Citizen Reporting Form UI

**Assigned to**: Teammate
**Difficulty**: Beginner (AI-Assisted)
**Branch**: `feature/citizen-portal-ui`

Welcome to the project! Your task is to build a purely visual, frontend user interface for the "Citizen Reporting Portal" where people can report smoke or pollution. 

You don't need to know how to code. You will use an AI coding assistant inside VS Code to do the heavy lifting for you. 

Follow these steps **exactly in order**. Do not skip any steps.

---

## Step 1: Set Up Your Tools

1. **Download and Install VS Code**:
   - Go to [https://code.visualstudio.com/](https://code.visualstudio.com/)
   - Download the installer for your operating system and install it.
2. **Install the AI Coding Assistant**:
   - Open VS Code.
   - On the left sidebar, click the **Extensions** icon (it looks like 4 blocks).
   - Search for **"Codeium"** (or "GitHub Copilot" / "Cline" depending on what account you have). Codeium is free and excellent.
   - Click **Install**.
   - Follow the prompts in the bottom right to log in or create a free account if it asks.

---

## Step 2: Get the Code and Create a Branch

It is **very important** that you do not edit the `main` code directly. You must work on your own "branch".

1. Open your terminal (or open a terminal inside VS Code by clicking `Terminal -> New Terminal` at the top).
2. Clone the repository and go into it (if you haven't already):
   ```bash
   git clone https://github.com/abtimist/AeroMesh.git
   cd AeroMesh
   ```
3. Create your own safe workspace (a branch) named `feature/citizen-portal-ui`:
   ```bash
   git checkout -b feature/citizen-portal-ui
   ```
4. Open this folder in VS Code:
   ```bash
   code .
   ```

---

## Step 3: Tell the AI What to Build

We want to build a simple React component for a mobile phone screen where a citizen can report a pollution event.

1. Open the AI Chat panel in VS Code (usually on the left sidebar if you installed Codeium).
2. Copy and paste the following prompt exactly into the AI chat:

> "I need to create a new React component for our project. We are using Vite, React, and Tailwind CSS. 
> Please create a file at `frontend/src/components/CitizenReportForm.jsx`. 
> It should be a mobile-first UI with a clean white/light theme. 
> It needs:
> 1. A top header that says 'AeroMesh Citizen Portal'.
> 2. A red alert banner below the header that says '⚠️ Air Quality: UNHEALTHY in your area'.
> 3. A large, circular AQI (Air Quality Index) gauge in the center showing a number like '198'.
> 4. A giant, highly visible 'Report Smoke/Fire' button at the bottom.
> 5. Make it look very modern and premium using Tailwind CSS classes (shadows, rounded corners).
> Please give me the exact code, and tell me how to import it into `frontend/src/App.jsx` to test it."

3. The AI will generate the code. Use the "Apply to file" button or manually copy-paste the code into `frontend/src/components/CitizenReportForm.jsx` (you may need to create this file).
4. Follow the AI's instructions to temporarily put your component into `frontend/src/App.jsx` so you can see it.

---

## Step 4: Test It

1. Open the VS Code Terminal (`Terminal -> New Terminal`).
2. Go to the frontend folder and run it:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open the link it gives you (usually `http://localhost:5173`) in your browser. 
4. Check if the UI looks good! If it doesn't, tell the AI in the chat what to fix (e.g., "Make the button bigger and red", or "Center the text").

---

## Step 5: Save and Upload (Push) Your Work

Once you are happy with how it looks, you need to save it and send it to GitHub for review.

1. In the terminal, stop the server by pressing `Ctrl + C`.
2. Run these exact commands:
   ```bash
   git add .
   git commit -m "feat: added citizen report form UI"
   git push origin feature/citizen-portal-ui
   ```
3. You're done! Let your teammate know that your branch is pushed, and they will merge it into the main project.
