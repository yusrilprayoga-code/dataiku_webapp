# Dataiku Quality Control WebApp

![Vercel Deployment](https://therealsujitk-vercel-badge.vercel.app/?app=dataiku-webapp&style=for-the-badge)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

> _Last Updated: June 18, 2025_

A full-stack web application designed to perform Quality Control (QC) processes on user-uploaded data files. The frontend is built with Next.js for a modern, interactive user experience, while the backend leverages Flask and Python for powerful data processing and analysis.

This project is configured for continuous deployment on Vercel from the `main` branch.

## ✨ Features

-   **File Upload Interface:** A clean, user-friendly interface to upload one or more data files for processing.
-   **Python-Powered Backend:** Utilizes the power of Python and its rich data science ecosystem to run complex quality control scripts.
-   **Interactive Visualizations:** Renders results and data plots dynamically using Plotly.js for an interactive analysis experience.
-   **Serverless Architecture:** Deployed on Vercel, leveraging serverless functions for a scalable and cost-effective backend.

## 🗺️ Project Roadmap

This project is under active development. Here are some of the planned features and improvements.

-   [x] Core QC script integration with file upload
-   [x] Interactive Plotly visualizations for results
-   [x] Establish a clean monorepo architecture for frontend and backend
-   [ ] Implement a robust user authentication system (e.g., NextAuth.js).
-   [ ] Connect to a database (e.g., Vercel Postgres) to save QC results and user data.
-   [ ] Add comprehensive unit and integration tests for the Python backend.
-   [ ] Refine UI/UX and build out a persistent user dashboard.
-   [ ] Expand the QC module with more advanced data validation rules.

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) |
| **Backend** | ![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white) ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) |
| **Deployment**| ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) |

## 📂 Project Structure & Developer Conventions

This project follows a **monorepo** structure, keeping the frontend and backend code in a single repository. This allows for atomic commits where changes to both client and server for a single feature can be tracked together.

#### Detailed Folder Layout

/ (Project Root)
├── frontend/           # The Next.js Application
│   ├── src/
│   │   ├── app/        # Next.js App Router
│   │   ├── components/ # Shared, reusable React components
│   │   └── lib/        # Helper functions, hooks, utils
│   ├── public/         # Static assets (images, fonts, etc.)
│   └── package.json    # Frontend dependencies and scripts
│
├── api/                # The Flask API (Python Serverless Functions)
│   ├── venv/           # Python virtual environment (.gitignore'd)
│   ├── index.py        # Main Flask app: defines all API routes
│   ├── my_modules/     # Custom Python modules for business logic
│   └── requirements.txt# Python dependencies
│
├── .gitignore          # Specifies intentionally untracked files
└── vercel.json         # Vercel build and routing configuration


#### Key Conventions & Developer Notes (TIDI)

> The goal is to maintain a clean separation of concerns. **Frontend code lives in `/frontend`**. All heavy data processing and core business logic, written in Python, **must live in `/api`**.

*(For a more detailed breakdown of conventions, refer to the previous detailed response.)*

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [Python](https://www.python.org/downloads/) (v3.9 or later) & `pip`

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/MichelPT/dataiku_webapp.git](https://github.com/MichelPT/dataiku_webapp.git)
    cd dataiku_webapp
    ```

2.  **Set up the Python Backend:**
    ```bash
    cd api
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
    ```

3.  **Set up the Next.js Frontend:**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

### Running the Development Server

The recommended way is to use `concurrently` to run both servers with one command from the project root. Ensure your root `package.json` has the `dev` script.

```bash
# From the project root directory:
npm run dev