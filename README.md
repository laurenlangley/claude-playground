# HealthOps - Personal Health Analytics Platform

A web-based personal health application that aggregates diverse health data (PDFs, CSVs, manual logs), visualizes trends, runs statistical comparisons, and uses integrated LLM to provide personalized health insights.

## 🏗️ Architecture

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS + Recharts
- **Backend:** FastAPI + SQLAlchemy + SQLite
- **AI:** Anthropic Claude API for PDF lab report extraction
- **Data Processing:** Pandas + NumPy

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- Anthropic API key (for PDF parsing)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Seed the database with metric types
python -m app.seed_data

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at http://localhost:3000

## 📊 Current Features (Phase 1: Data Ingestion)

### ✅ Completed

- [x] Full-stack architecture (Next.js + FastAPI)
- [x] SQLite database with comprehensive schema
- [x] 23 pre-configured health metric types
- [x] CSV parser for Apple Health HRV data (with daily aggregation)
- [x] TXT parser for menstrual cycle tracking
- [x] PDF parser using Claude AI for lab reports
- [x] Dynamic cycle phase calculation (follicular, ovulatory, luteal, menstrual)
- [x] File upload API endpoints

### 📦 Data Types Supported

1. **HRV Data** (CSV)
   - Apple Health export format
   - Daily averaging with metadata (std, min, max, count)

2. **Menstrual Cycle** (TXT)
   - Markdown table format
   - Automatic cycle phase calculation based on individual cycle length
   - Generates daily cycle metrics

3. **Lab Reports** (PDF)
   - Quest Diagnostics format
   - LLM-powered extraction
   - Supports: metabolic panel, lipids, thyroid, CBC, vitamins

### 🔬 Tracked Metrics

**Recovery:**
- HRV SDNN, Resting Heart Rate, Sleep Duration

**Cycle:**
- Cycle Length, Cycle Phase, Cycle Day

**Lab Results:**
- Glucose, HbA1c, Insulin
- Total/LDL/HDL Cholesterol, Triglycerides
- TSH, T4, Thyroid Antibodies
- Vitamin D, WBC, Creatinine, eGFR

**Fitness (Future):**
- VO2 Max, Training Load

## 📁 Project Structure

```
healthops/
├── frontend/              # Next.js frontend
│   ├── app/              # App router pages
│   ├── components/       # React components
│   └── package.json
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── main.py       # FastAPI app
│   │   ├── database.py   # DB connection
│   │   ├── seed_data.py  # Metric types seed
│   │   ├── parsers/      # Data parsers
│   │   │   ├── csv_parser.py
│   │   │   ├── cycle_parser.py
│   │   │   └── pdf_parser.py
│   │   └── routers/      # API routes
│   │       └── upload.py
│   └── requirements.txt
└── sample-data/          # Example data files
    ├── hrv_sdnn.csv
    ├── period_cycle_data.txt
    └── Langley_Quest_labreport_Aug2025.pdf
```

## 🧪 Testing the Parsers

Upload your sample data files:

```bash
# Test CSV upload
curl -X POST http://localhost:8000/api/upload/csv \
  -F "file=@sample-data/hrv_sdnn.csv"

# Test TXT upload
curl -X POST http://localhost:8000/api/upload/txt \
  -F "file=@sample-data/period_cycle_data.txt"

# Test PDF upload (requires ANTHROPIC_API_KEY)
curl -X POST http://localhost:8000/api/upload/pdf \
  -F "file=@sample-data/Langley_Quest_labreport_Aug2025.pdf"
```

## 🗺️ Roadmap

### Phase 2: Core Analytics (Next)
- [ ] Data retrieval APIs
- [ ] Statistical correlation functions
- [ ] Cycle-aware analysis engine
- [ ] Trend detection

### Phase 3: Dashboard UI
- [ ] Command Center (home page)
- [ ] Deep Dive pages (Recovery, Cycle, Fitness)
- [ ] Chart visualizations (Recharts)
- [ ] Dark mode

### Phase 4: LLM Integration
- [ ] Natural language Q&A
- [ ] Proactive recommendations
- [ ] Daily insights generation

### Phase 5: Polish
- [ ] Data export
- [ ] Error handling
- [ ] Performance optimization
- [ ] Testing suite

## 🎨 Design Philosophy

**Aesthetic:** "Medical Modern"
- Minimalist, clean, abundant whitespace
- Soft neutrals for UI
- Bold, high-contrast colors (Neon Green, Electric Blue, Hot Pink) for data charts
- Inspired by: Spotify × Strava × Apple Health

**Health Science:** Physiology-first
- Women-specific adaptations (cycle-aware training)
- Readiness indicators (HRV, load, sleep, stress)
- Science-backed recommendations
- Based on: Dr. Stacy Sims, Dr. Peter Attia, Dr. Andrew Huberman

## 📝 License

Private project - Not licensed for public use

## 🙏 Acknowledgments

Built with Claude AI and passion for data-driven health optimization.
