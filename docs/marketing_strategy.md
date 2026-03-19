# Zero-Budget Viral Launch Strategy: Codebase City

## The Core Philosophy: "Anti-Marketing"
Developers **hate** marketing. If you post "Try my new app," you will get banned or downvoted to oblivion. The only way to go viral in developer communities (Reddit, Hacker News) is to frame your launch as a **technical showcase, an open-source contribution, or a deep-dive into a hard problem you solved.**

Your angle isn't: *"Look at my product."*
Your angle is: *"I spent 300 hours rendering React codebases into breathtaking, interactive 3D architectural visualizations using Three.js and Vite. Here's how I optimized the WebGL shaders to handle 10,000 buildings without dropping frames."*

---

## 🎯 Who Is This For? (Broader Than You Think)

Codebase City is **not just for developers.** Anyone who needs to understand the structure, health, or evolution of a software project can use it:

| Audience | Use Case |
|---|---|
| **Engineering Managers / CTOs** | Instantly see which parts of the codebase have the most tech debt (red buildings), who owns what, and where complexity is concentrated — without reading a single line of code. |
| **New Team Members (Onboarding)** | Drop a repo URL and get a spatial map of the entire project in 30 seconds. Districts = modules, building height = file size. Navigate visually instead of guessing folder structures. |
| **Open Source Maintainers** | Visualize contributor activity, identify God Objects, and spot circular dependencies before they become unfixable. Share a screenshot in your README to make your project stand out. |
| **Technical Recruiters / Investors** | Assess codebase health at a glance. A well-structured city with evenly-sized buildings = clean architecture. A chaotic cluster of red skyscrapers = legacy debt. |
| **Educators / Students** | Teach software architecture visually. Show how React, Vue, or Django projects are structured by exploring their 3D cities. |
| **Project Managers** | Track how the codebase grows sprint-over-sprint using the Time Travel slider. Watch districts emerge and buildings grow as features are added. |

**Key marketing message:** *"You don't need to be a developer to understand what's wrong with a codebase. You just need to see it."*

---

## 🎬 Stream 1: The 30-Second "Hook" Video (Crucial)

Nobody reads text if there isn't a stunning visual attached. You need a jaw-dropping 30-second video.

**How to Record (MNC-Level Quality):**
1. **Tool:** Use [Screen Studio](https://www.screen.studio/) (Mac) or [OBS Studio](https://obsproject.com/) (Windows/Linux) for buttery smooth 60fps recording. Do NOT record with your phone.
2. **Resolution:** 1080p or 4K.
3. **The Script/Flow (Zero words, just action):**
   * **0:00 - 0:05:** Screen opens on a massive, complex codebase (like React or VSCode's repo). Click "Generate City".
   * **0:05 - 0:12:** The camera dramatically pans over the stunning, neon-lit 3D city. Volumetric fog provides atmospheric depth. Glowing data-streams flow along the highways.
   * **0:12 - 0:20:** Use the **Command Palette (⌘K)** to switch to "Time Travel" (Commit History). Scrub the timeline slider. Show the buildings instantly morphing and growing as commits change.
   * **0:20 - 0:30:** Zoom into a red, glowing "God Object" building. Open the Code Viewer. Show the metrics. End screen with GitHub URL.
4. **Audio:** Add a high-quality, professional electronic or cinematic synthwave instrumental track. If recording voiceover, sound exhausted but passionate (the "100-hour coding binge" vibe).

---

## 🚀 Stream 2: Where & How to Post (Exact Links & Rules)

### 1. Reddit: The "Showoff Saturday" Strategy
**Rule:** You **cannot** post promotional content on major subreddits during the week. You will be permanently banned. You **must** wait until Saturday morning (8:00 AM EST) and use the "Showoff Saturday" flair.

*   **/r/reactjs** ([Link](https://www.reddit.com/r/reactjs/)) - **ONLY ON SATURDAYS.** Use the `Showoff Saturday` flair.
*   **/r/webdev** ([Link](https://www.reddit.com/r/webdev/)) - **ONLY ON SATURDAYS.** Use the `Showoff Saturday` flair.
*   **/r/threejs** ([Link](https://www.reddit.com/r/threejs/)) - **ANY DAY.** They love WebGL projects.
*   **/r/SideProject** ([Link](https://www.reddit.com/r/SideProject/)) - **ANY DAY.** Post a direct video with a link in comments.
*   **/r/dataisbeautiful** ([Link](https://www.reddit.com/r/dataisbeautiful/)) - **ANY DAY** (OC tag). Frame it as "I visualized the React codebase as a 3D city."
*   **/r/InternetIsBeautiful** ([Link](https://www.reddit.com/r/InternetIsBeautiful/)) - **ANY DAY.** Post the live demo link directly.

**Exact Authentic Copy for /r/reactjs & /r/webdev (Post as a Video Upload):**
> **Title:** [Showoff Saturday] I built an interactive 3D city that visualizes any React/Vite codebase — file size = building height, tech debt = red glow (Three.js/Fiber) 🌃
>
> **Body:**
> Hey everyone,
>
> I spent the last few months deeply obsessing over how to visualize technical debt. Standard dependency graphs always looked like messy spiderwebs to me, so I decided to over-engineer it.
>
> I built Codebase City. It parses your AST, maps your directories to "districts", turns your files into 3D skyscrapers (height = lines of code, color = churn/health), and flags circular dependencies as glowing red "God Objects."
>
> The coolest part? Anyone on your team can use it — not just developers. Your PM can scrub through the Time Travel slider to see how your architecture evolved sprint by sprint. Your CTO can instantly spot which modules carry the most tech debt. New hires can navigate the project visually on their first day.
>
> The hardest part was getting 10,000+ buildings to render at 60fps in the browser. I had to ditch standard meshes and move entirely to GPU-instanced rendering (`<instancedMesh>`) with a custom shader for the window glows and traffic systems. 
>
> It's completely open-source and free. I'd love for you guys to tear it apart, tell me what sucks, or try it on your own repos. 
> 
> **Tech Stack:** React, Three.js (R3F), Zustand, Vite.
> **GitHub:** [Insert Link]
> **Live Demo:** [Insert Link]
>
> *P.S. Press ⌘K to open the command palette and try the Time Travel slider (it scrubs through your git commit history and animates the city's growth!).*

### 2. Hacker News (Y Combinator)
**Rule:** HN is notoriously cynical. Do NOT use emojis. Do NOT use marketing speak. Be dry, highly technical, and humble.
**Link:** [Submit to Show HN](https://news.ycombinator.com/submit)

**Exact Authentic Copy for Hacker News:**
> **Title:** Show HN: Codebase City – rendering ASTs and git history as interactive 3D cities
>
> **URL:** [Insert Live Demo Link]
>
> **First Comment (You must post a comment immediately after submitting):**
> Hi HN,
>
> I wanted a better way to visualize complex codebases and technical debt, rather than staring at 2D node graphs. I wrote a tool that parses a project's AST and git history, mapping them to a procedural 3D city using Three.js and React Three Fiber.
>
> Files are mapped to buildings (height = LoC), directories are districts, and git churn dictates the color styling (red hotspots = high churn/tech debt). To maintain 60FPS with tens of thousands of files, it relies heavily on InstancedMesh and custom GLSL shaders for the visual effects rather than computing geometry on the CPU.
>
> It also features a "Time Travel" slider that replays your git history, morphing the city as the codebase grew over time.
>
> The tool is designed to be accessible to non-developers too — engineering managers, technical recruiters, and educators can get a structural overview of any project without reading code.
>
> Repo is here: [Insert GitHub Link]. I'd appreciate any feedback on the WebGL optimization or architecture.

### 3. Twitter / X (The Visual Flex)
**Strategy:** Post the video natively on Twitter. The algorithms severely penalize YouTube links. Tag prominent tech accounts subtly.

**Exact Authentic Copy:**
> I got tired of looking at messy 2D dependency graphs, so I built a 3D engine that turns any codebase into an interactive data-metropolis. 🌃 
> 
> Red buildings = high churn/tech debt. 
> Press ⌘K to scrub through your Git history and watch the city grow in real-time.
>
> Not just for devs — your PM, CTO, or new hires can understand your codebase architecture at a glance.
> 
> Built with @reactjs and Three.js. Fully open source. 
> 
> Live Demo: [Link]
> GitHub: [Link]

### 4. Product Hunt
**Link:** [Product Hunt Post](https://www.producthunt.com/posts/new)
**Strategy:** Launch at exactly 12:01 AM PST to get the maximum 24 hours of visibility. Use an animated GIF as your logo.

*   **Tagline:** See any codebase as a living, breathing 3D city — no code reading required.
*   **Description:** A Three.js and React-powered visualization engine that transforms technical debt into visual intelligence. Map your files to 3D skyscrapers, identify God Objects, and scrub through your Git commit history via an interactive 3D timeline. Built for developers, managers, and anyone who needs to understand software architecture.

### 5. LinkedIn (The Non-Dev Audience)
**Strategy:** LinkedIn is where you reach the managers, CTOs, and recruiters. Frame it as a **management tool**, not a developer toy.

**Exact Authentic Copy:**
> 🏙️ What if you could see your entire codebase — not as text, but as a real city?
>
> I built [Codebase City], an open-source tool that transforms any GitHub repo into an interactive 3D visualization.
>
> - Building height = file size
> - Color = code health (red = technical debt)
> - Districts = modules / packages
> - Time Travel = watch your architecture evolve commit by commit
>
> The best part? You don't need to be a developer to use it. Engineering managers can spot debt-heavy modules in seconds. Recruiters can assess codebase quality visually. New team members can navigate a project spatially on day one.
>
> Try it yourself (free, open source): [Link]
>
> #SoftwareEngineering #TechnicalDebt #OpenSource #WebGL

---

## 📈 The 24-Hour Execution Playbook

1.  **Preparation (Friday Night):** Record the 30-second video, compress it to MP4 (under 50MB for Reddit/Twitter). Take 4 high-res screenshots. Deploy the live site via Vercel. Ensure the GitHub README looks pristine with the video embedded.
2.  **Launch (Saturday, 8:00 AM EST):** 
    *   Post the video + copy to **/r/reactjs** and **/r/webdev**.
    *   Post the text + link to **Hacker News (Show HN)**.
    *   Post the video to **Twitter/X**.
    *   Post to **LinkedIn** for the management/recruiter audience.
3.  **Engagement (Saturday, 9:00 AM - 12:00 PM EST):**
    *   Do not leave your computer. 
    *   Reply to **every single comment** on Reddit and HN. If someone criticizes it, thank them and explain your technical design choices. Authentic engagement drives the algorithm to push your post to the top.
4.  **Second-Wave Follow-up (Monday):**
    *   If the project did well, post a follow-up on Twitter/Reddit: *"Codebase City hit 500 stars this weekend. Here is a deep dive into the GLSL shaders I wrote to make 10,000 buildings run at 60fps in the browser."* This acts as a second wave of marketing disguised as a technical tutorial.
5.  **Third-Wave (Wednesday):**
    *   Post to **/r/dataisbeautiful** with a stunning screenshot: *"[OC] I visualized the React.js codebase as a 3D city — 4,200 files, 380k lines of code."*
    *   Post to **/r/InternetIsBeautiful** with the live demo link.
