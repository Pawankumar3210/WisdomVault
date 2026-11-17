# 📚 Wisdom Vault

> *"Knowledge is the only treasure that grows when shared. Built with purpose, preserved for excellence."*

A modern, mobile-first academic resource platform built for CSE 5th Semester students to access notes, question banks, and previous year papers — all in one place.

🌐 **Live at:** [wisdomvaultnext.vercel.app](https://wisdomvaultnext.vercel.app)

---

## ✨ Features

### For Students
- 🔍 **Instant Search** — Search notes, question banks and papers in real time, with shared caching
- 📄 **PDF Viewer** — Read documents directly inside the website
- ⬇️ **Download** — Download any PDF to your device
- 📱 **Mobile First** — Fully optimized for phones and tablets
- 🌙 **Dark / Light Mode** — Toggle between dark and cream light mode

### For Admin
- 🔐 **Secure Admin Login** — Protected dashboard access
- 📁 **Subject Management** — Add, edit and delete subjects
- 📤 **Content Upload** — Upload PDFs with drag and drop support
- 📊 **Dashboard Overview** — View stats for all notes, Q-banks and papers
- 🗑️ **Content Management** — Edit and delete notes, question banks and papers

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| Animations | Canvas API, Framer Motion |
| Deployment | Vercel |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Header.jsx
│   ├── SearchBar.jsx
│   ├── SubjectCard.jsx
│   ├── Footer.jsx
│   ├── ParticleBackground.jsx
│   ├── AnimatedCounter.jsx
│   ├── TypewriterText.jsx
│   ├── FuturisticLoader.jsx
│   └── TopLoadingBar.jsx
├── pages/
│   ├── Home.jsx
│   ├── AdminLogin.jsx
│   ├── AdminDashboard.jsx
│   └── PDFViewer.jsx
├── lib/
│   └── supabase.js
├── App.js
└── index.css
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/Pawankumar3210/wisdomvaultnext.git
cd wisdomvaultnext

# Install dependencies
npm install --legacy-peer-deps

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_SITE_URL=https://wisdomvaultnext.vercel.app
REACT_APP_SENTRY_DSN=optional_sentry_dsn
```

`REACT_APP_SITE_URL` is used for canonical links, social metadata, and sitemap generation. `REACT_APP_SENTRY_DSN` is optional; error monitoring is disabled when it is blank.

`npm run build` regenerates `public/sitemap.xml` before creating the production bundle.

### Run Locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Schema

```sql
-- Subjects table
create table subjects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text not null,
  created_at timestamp default now()
);

-- Content table
create table content (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject_id uuid references subjects(id) on delete cascade,
  pdf_url text not null,
  type text check (type in ('note', 'qb', 'paper')),
  created_at timestamp default now()
);
```

---

## 🌐 Deployment

The project is deployed on **Vercel** with the following configuration:

```json
{
  "buildCommand": "CI=false react-scripts build",
  "outputDirectory": "build",
  "framework": null
}
```

Environment variables are configured directly in the Vercel dashboard.

---

## 👥 Team Udbhav

| Name | Role | LinkedIn |
|---|---|---|
| Pawan Kumar G | Chief Architect | [Connect](https://www.linkedin.com/in/pawan-kumar-g-54530134b) |
| Keerthana D | Head of Vault Security | [Connect](https://www.linkedin.com/in/keerthana-d-653313398) |
| Poorvi V Bharadwaj | Head of Vault UX | [Connect](https://www.linkedin.com/in/poorvi-v-bharadwaj-603837391) |
| Poorvika MJ | Vault Ambassador | [Connect](https://www.linkedin.com/in/poorvika-mj-aba066392) |

---

## 📄 License

This project is for educational purposes only.

---

<div align="center">
  <strong>Built with Purpose, Preserved for Excellence</strong><br/>
  <em>Team Udbhav © 2026</em>
</div>
