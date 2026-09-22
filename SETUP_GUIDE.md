# AeroMesh Team Setup & Onboarding Guide

Welcome to the **AeroMesh** project! This document outlines the initial setup that has been completed and provides instructions on how to get your local environment ready for development.

## 1. Repository Setup Completed
The foundational Git repository has been created, configured, and pushed to GitHub.

* **Repository URL**: `git@github.com:abtimist/AeroMesh.git`
* **Default Branch**: `main`

The following initial files have already been committed to the repository to establish our product vision and architecture:
* `FINAL_ARCHITECTURE.md`: The complete technical blueprint, feature definitions, and development roadmap.
* `qna.md`: A reference document containing answers to key product and domain questions.
* `GoingThrough.md`: Initial brainstorming and project scoping notes.
* `SystemArchitecture.png`: Visual architecture diagram.
* `.gitignore`: A comprehensive gitignore configured for Node.js, Python, virtual environments, and OS system files.

## 2. Getting Started (For Teammates)

To join the project and start contributing, follow these steps:

### Step A: Clone the Repository
Open your terminal and run:
```bash
git clone git@github.com:abtimist/AeroMesh.git
cd AeroMesh
```

### Step B: Environment Requirements
We have verified the following runtimes for the project. Please ensure you have compatible versions installed on your system:
* **Node.js**: v26+ (Current verified version: `v26.8.1`)
* **npm**: v11+ (Current verified version: `11.19.0`)
* **Python**: v3.14+ (Current verified version: `3.14.7`)

### Step C: Read the Architecture Blueprint
Before writing any code, please read the **`FINAL_ARCHITECTURE.md`** file. It contains:
* The core problem we are solving (active early warning vs. passive monitoring).
* The dual-horizon alerting mechanics and citizen incentive models.
* The 7-day development roadmap.

## 3. Immediate Next Steps (Day 1 Roadmap)
We are currently entering **Day 1** of our roadmap. The upcoming technical tasks are:
1. **Frontend Scaffolding**: Initializing the Vite + React 18 + Tailwind CSS project.
2. **Backend Scaffolding**: Initializing the FastAPI Python project and setting up the Laya AI decision engine structure.
3. **Database Setup**: Initializing the PostgreSQL + PostGIS local container or instance.

Let's build AeroMesh!
