# Codebase City: 2026 Viral Launch Scripts

> [!IMPORTANT]
> **Rule #1: No AI Buzzwords.** Avoid: "Revolutionary," "Seamless," "Empowering," "Next-gen."
> **Rule #2: Show Vulnerability.** People upvote humans who spent too much time on a weird problem.
> **Rule #3: The "Visual Hook".** Never post without a high-quality GIF or Video (Rule of thumb: if it doesn't look like a AAA game, don't post).

---

## 1. Reddit: /r/reactjs (Showoff Saturday)
**Style:** Self-deprecating, obsessive, "I over-engineered this."

**Title:** [Showoff Saturday] I spent 300+ hours turning any React codebase into a 3D city because I hate looking at messy node-graphs 🌃

**Body:**
Hey everyone,

I’ve always struggled to "see" the architecture of large projects. Dependency graphs just look like nested spiderwebs to me once you go past 50 files.

So I spent the last few months deeply obsessing over how to make technical debt spatial. I built Codebase City. It’s a Three.js + R3F visualizer that maps your folders to districts and your files to skyscrapers.

- **Height = Lines of Code.**
- **Red Glow = High Churn / Tech Debt.**
- **Time Travel:** I added a slider that scrubs through your Git history so you can literally watch the city grow and change over the years.

I had to move entirely to GPU-instanced rendering to get 10,000+ buildings to run at 60fps in the browser without melting my laptop. 

It’s completely open source. I’d love for you guys to try it on your repos and tel me if it actually helps you spot "God Objects" or if I just wasted a lot of time on a pretty toy.

**GitHub:** [Link]
**Live Demo:** [Link]

---

## 2. Hacker News (Show HN)
**Style:** Dry, technical, focused on a specific optimization problem.

**Title:** Show HN: Codebase City – rendering ASTs and git history as 10k+ instanced 3D buildings

**First Comment:**
Hi HN,

I wanted a more intuitive way to audit codebase health, so I built a tool that visualizes project structure as a 3D metropolis. 

Technically, the biggest challenge was the rendering budget. Standard React Three Fiber meshes choked at around 500 buildings. I moved the entire layout engine to a custom `<instancedMesh>` set with a vertex shader that handles window glows and traffic systems on the GPU. This allowed me to push the limit toward 15,000+ files while maintaining 60FPS.

It maps:
- Folders → Districts
- Files → Skyscrapers (Height by LoC)
- Churn → "Thermal" color mapping

It also replays Git history via a timeline scrub. I'm especially interested in feedback on the layout engine's collision resolution—it uses a quadrant-offset approach to keep things organic but non-overlapping.

Repo: [Link]

---

## 3. Twitter / X (The "Aesthetic" Flex)
**Style:** High-energy, visually stunning, short sentences.

**Title:** 300 hours of coding later: My codebase is now a 3D metropolis. 🌃

**Body:**
Dependency graphs are a mess. So I over-engineered the solution.
Codebase City maps your React project into an interactive 3D city.

🔥 Red buildings = technical debt hotspots.
⏳ Scrub the Git history to watch the city grow.
🚀 10,000+ buildings at 60fps (instanced rendering).

Open source & free.
Try it on your repo: [Link]

#ThreeJS #ReactJS #WebDev

---

## 4. The "Anti-Ban" GitHub Outreach
**Strategy:** Find a large open-source project with a visible "issue" (e.g., a massive God Object file). Do NOT comment "use my tool." 

**Script for Issue/PR Comment:**
"Hey, I was curious about the architecture of this module, so I ran it through a 3D visualizer I'm working on. Here is what [Module Name] looks like spatially: [Attached Image of Code City]. 

It's pretty interesting how [File X] towers over everything else. If this visualization helps the refactoring discussion, I'm happy to generate more for other districts!"

---

## 5. Handling "Is this AI?" Criticism
**The "Honest Dave" Reply:**
"Fair call—I definitely used AI (LLMs) to help me pair-program the boilerplate and some of the regex parsing. But the core 3D engine, the quadrant-layout logic, and the custom shaders were my design. Think of it like using an electric drill instead of a screwdriver—I still had to build the house."
