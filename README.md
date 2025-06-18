# Dataiku Quality Control WebApp

![Vercel Deployment](https://therealsujitk-vercel-badge.vercel.app/?app=dataiku-webapp&style=for-the-badge) 
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

A full-stack web application designed to perform Quality Control (QC) processes on user-uploaded data files. The frontend is built with Next.js for a modern, interactive user experience, while the backend leverages Flask and Python for powerful data processing and analysis.

This project is configured for continuous deployment on Vercel from the `main` branch.

## ✨ Features

-   **File Upload Interface:** A clean, user-friendly interface to upload one or more data files for processing.
-   **Python-Powered Backend:** Utilizes the power of Python and its rich data science ecosystem to run complex quality control scripts.
-   **Interactive Visualizations:** Renders results and data plots dynamically using Plotly.js for an interactive analysis experience.
-   **Serverless Architecture:** Deployed on Vercel, leveraging serverless functions for a scalable and cost-effective backend.

## 🛠️ Tech Stack

| Category      | Technology                                                                                                                              |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) |
| **Backend** | ![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white) ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)                                                                                                              |
| **Deployment**| ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)                                                                                                                                                                                                                          |

## 📂 Project Structure

This project follows a **monorepo** structure, keeping the frontend and backend code in a single repository for easier management and atomic commits.

├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   │   ├── (pages)/        # Route Group for main pages
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── ...
│   │   │   ├── api/            # For Next.js API routes (client-side tasks only)
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── page.tsx        # Homepage
│   │   │
│   │   ├── components/         # Shared, reusable React components
│   │   │   ├── ui/             # Simple UI elements (Button.tsx, Card.tsx)
│   │   │   └── charts/         # Chart components (e.g., PlotlyWrapper.tsx)
│   │   │
│   │   └── lib/                # Helper functions, hooks, utils
│   │
│   ├── public/               # Static assets (images, fonts, etc.)
│   ├── package.json          # Frontend dependencies and scripts
│   └── ...                   # Other Next.js config files
│
├── api/
│   ├── venv/                 # Python virtual environment (.gitignore'd)
│   ├── index.py              # Main Flask app: defines all API routes
│   ├── my_modules/           # Custom Python modules for business logic
│   │   ├── __init__.py
│   │   └── qc_module.py      # Example: The actual QC logic lives here
│   │
│   └── requirements.txt      # Python dependencies (Flask, Pandas, etc.)
│
├── .gitignore                # Specifies intentionally untracked files
└── vercel.json               # Vercel build and routing configuration