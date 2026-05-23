# Intelligent Feature Store (NeuroStore)

A production-grade monorepo for managing, cataloging, serving, and validating machine learning features across offline training and real-time serving paths.

## Project Structure

```text
intelligent-feature-store/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI entry point, error handlers, and lifespan
│   │   ├── config.py          # Pydantic Settings management
│   │   ├── database.py        # Async pg engine & SQLAlchemy model mappings
│   │   ├── redis_client.py    # Async connection pool Redis helper
│   │   └── routers/
│   │       └── __init__.py
│   ├── requirements.txt       # Dependencies (FastAPI, great-expectations, MLflow, etc.)
│   └── .env.example           # Backend config variables template
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── components/
    │   │   │   └── Sidebar.tsx # Navigation and layout bar
    │   │   ├── health/
    │   │   │   └── page.tsx    # Connection state dashboard
    │   │   ├── features/       # Feature Registry view
    │   │   ├── datasets/       # Ingested datasets view
    │   │   ├── models/         # Registered serving models
    │   │   ├── alerts/         # Drift alerts logs
    │   │   ├── globals.css     # Premium dark theme and glassmorphic variables
    │   │   ├── layout.tsx      # Sidebar wrapping page
    │   │   └── page.tsx        # Ingestion metrics dashboard
    └── .env.example           # Frontend config template (NEXT_PUBLIC_API_URL)
```

## Prerequisite Software
- Node.js >= 20.x
- Python >= 3.11

---

## Setup & Local Execution

### 1. Configure Environments
Copy the template environmental files in both subdirectories:

```bash
# Set up Backend variables
cp backend/.env.example backend/.env

# Set up Frontend variables
cp frontend/.env.example frontend/.env
```

Open `backend/.env` and ensure database (Supabase), cache (Upstash), and AI keys (Groq) are filled.

### 2. Start the Backend API
Navigate to the `backend/` directory, set up your Python virtual environment, install dependencies, and spin up the server:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The FastAPI application will automatically create model tables in PostgreSQL (Supabase), test the Redis (Upstash) connection pool, and expose the API at [http://localhost:8000](http://localhost:8000).

### 3. Start the Frontend Application
In a separate terminal tab, navigate to the `frontend/` directory, install packages, and boot the development server:

```bash
cd frontend
npm install
npm run dev
```

The Next.js 14 Web UI will start serving pages at [http://localhost:3000](http://localhost:3000).

---

## Service Verification

### Health Monitors
- Open your browser to the dynamic diagnostics interface: [http://localhost:3000/health](http://localhost:3000/health) to view connection reports.
- Access the raw API state: [http://localhost:8000/health](http://localhost:8000/health).
- Browse Interactive Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs).
