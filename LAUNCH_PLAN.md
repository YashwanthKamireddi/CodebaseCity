# Codebase City — Launch Plan

## Phase 1: Pre-Launch Checklist (Do First)

- [x] World-class README with screenshots, badges, architecture diagram
- [x] CONTRIBUTING.md
- [x] Docker Compose works out of the box
- [x] Vercel deployment config
- [x] Clean up dead code
- [ ] **Push all changes to GitHub**
- [ ] **Verify live demo works at codebasecity.vercel.app**
- [ ] Add 5-6 GitHub Topics: `code-visualization`, `3d`, `architecture`, `developer-tools`, `react`, `threejs`
- [ ] Write a one-line GitHub repo description: *"Transform any codebase into an explorable 3D city — files are buildings, folders are districts, imports are roads"*
- [ ] Pin the repo on your GitHub profile

---

## Phase 2: Deploy (Free Tier)

### Option A: Vercel (Frontend) + Railway (Backend) — Recommended

| Service | What | Free Tier |
|---------|------|-----------|
| **Vercel** | Frontend (SPA) | Unlimited for personal projects |
| **Railway** | Backend (FastAPI + git clone) | $5/mo credit free, 500 hours |

**Steps:**
1. Push to GitHub
2. Import frontend on [vercel.com](https://vercel.com) → set root directory to `frontend/`
3. Import backend on [railway.app](https://railway.app) → set root directory to `backend/`, add `GEMINI_API_KEY`
4. In Vercel environment settings, set `VITE_API_URL=https://your-railway-url.up.railway.app`
5. Redeploy

### Option B: Render (Full Stack)
- Backend as a Web Service (free tier spins down after 15min idle)
- Frontend as Static Site
- Free custom domain

### Option C: Fly.io
- `flyctl launch` in both directories
- 3 shared-cpu machines free
- Better cold start than Render

---

## Phase 3: Launch Day Strategy

### 1. Reddit (highest ROI for dev tools)

**Post to these subreddits in this order, 1-2 hours apart:**

| Subreddit | Post Style | Expected Impact |
|-----------|-----------|-----------------|
| r/programming | "Show: I built a tool that turns codebases into 3D cities" | 50K+ subscribers, high engagement |
| r/webdev | Focus on React + Three.js technical architecture | Frontend community |
| r/Python | Focus on Tree-sitter + FastAPI backend | Backend community |
| r/dataisbeautiful | Post a stunning screenshot of a large repo | Visual impact |
| r/SideProject | "I spent X months building this" story | Indie community |

**Post template:**
```
Title: I built an open-source tool that transforms any codebase into an explorable 3D city

Body:
- Files become buildings (height = complexity, color = health)
- Folders become districts
- Import dependencies become roads
- Click any building to see its source code, metrics, and dependencies

Live demo: [link]
GitHub: [link]

Built with React + Three.js + FastAPI + Tree-sitter.
Supports Python, JavaScript, and TypeScript codebases.

Would love feedback!
```

### 2. Hacker News

- Post as **"Show HN: Codebase City – See your code like never before"**
- Best time: Tuesday-Thursday, 7-9am EST
- Engage with every comment in the first 2 hours
- Keep the description under 3 lines

### 3. Twitter/X

**Thread format (6-8 tweets):**
1. Hook: "What if you could walk through your codebase like a city? 🏙️" + demo GIF
2. How it works (30-second screen recording)
3. Technical breakdown (Tree-sitter, Leiden clustering, GPU instancing)
4. Before/after comparing OpenCV, React, FastAPI as cities
5. "It's 100% open source" + GitHub link
6. "Star it if this is useful" CTA

**Tag:** @threejs, @reactjs, @FastAPI, @veraborsa (Vite), @github

### 4. Dev.to / Hashnode Article

**"How I Built a 3D Code Visualization Engine"**
- Architecture deep-dive
- Screenshots of real repos as cities
- Performance optimization story (GPU instancing for 10K+ buildings)
- Include GitHub link prominently

### 5. Product Hunt

- Launch on a **Tuesday** (less competition than Monday)
- Need a **hunter** with followers (reach out to tech influencers)
- Prepare: tagline, 5 screenshots, 60-second demo video, maker comment
- Tagline: "Transform any codebase into an explorable 3D city"

### 6. YouTube / Demo Video (1-2 minutes)

Record a screen capture showing:
1. Paste a GitHub URL → watch the city generate
2. Fly through the city in exploration mode
3. Click a building → see the code + metrics
4. Use the AI architect → "what's the most complex file?"
5. Time-travel through git history
6. Compare two repos side by side

Upload to YouTube with SEO-optimized title:
*"Codebase City: Open Source 3D Code Visualization | Transform GitHub Repos into Cities"*

---

## Phase 4: Ongoing Growth

### GitHub Optimization
- **Star the repo yourself** (shows activity)
- **Create 5-10 "good first issue" labels** to attract contributors
- **Add GitHub Discussions** for community Q&A
- **Create a Release** (v1.0.0) with release notes
- **Add social preview image** (Settings → Social Preview → upload hero banner)

### Weekly Cadence
1. Share a "City of the Week" screenshot (analyze a famous repo)
2. Post progress updates on Twitter/Reddit
3. Respond to every issue and PR within 24 hours

### Repos to Showcase
Generate and screenshot cities for:
- **React** (facebook/react)
- **FastAPI** (tiangolo/fastapi)
- **Flask** (pallets/flask)
- **Express** (expressjs/express)
- **VS Code** (microsoft/vscode)

These screenshots drive social media engagement.

---

## Phase 5: Star-Getting Tactics

| Tactic | Expected Stars |
|--------|---------------|
| Reddit r/programming front page | 500-2000 |
| Hacker News front page | 300-1500 |
| Twitter viral thread | 200-1000 |
| Product Hunt top 5 | 300-800 |
| Dev.to featured article | 100-300 |
| "Awesome" list inclusion | 50-200/month ongoing |
| Good first issues → contributors → their followers | Compound growth |

### "Awesome" Lists to Submit To
- [awesome-react](https://github.com/enaqx/awesome-react)
- [awesome-python](https://github.com/vinta/awesome-python)
- [awesome-developer-tools](https://github.com/trimstray/the-book-of-secret-knowledge)
- [awesome-visualization](https://github.com/AlanChaucworthy/awesome-data-visualization)

---

## Quick Reference: What to Do Right Now

1. `git add -A && git commit -m "feat: world-class README, Docker fixes, CONTRIBUTING.md" && git push`
2. Go to GitHub → Settings → Add social preview image + topics + description
3. Create a GitHub Release (v1.0.0)
4. Deploy to Vercel + Railway
5. Record a 60-second demo GIF/video
6. Post on Reddit r/programming (Tuesday-Thursday morning)
7. Post Show HN (same day, 2 hours later)
8. Tweet the thread
9. Write Dev.to article (same week)
10. Submit to awesome lists (ongoing)
