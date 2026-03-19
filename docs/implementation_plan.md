### Authentic Human Storytelling & "Anti-Ban" Strategy

The Reddit feedback was clear: the marketing sounds like an AI bot. We need to strip away "revolutionary/seamless" and replace it with "I obsessed over this because X was broken."

#### [MODIFY] [marketing_strategy.md](file:///home/yash/.gemini/antigravity/brain/9ada2740-4374-4ce8-88be-e8db381e6382/marketing_strategy.md)
- Pivot from "technical deep dive" to "obsessive creator journey."
- Add rules for "Human-Only" language (no AI buzzwords).
- Define the "Anti-Spam" repo outreach strategy: finding specific architectural issues in repos and offering a Code City visualization as a helping hand, rather than a cold ad.

#### [NEW] [launch_scripts.md](file:///home/yash/.gemini/antigravity/brain/9ada2740-4374-4ce8-88be-e8db381e6382/launch_scripts.md)
- Provide copy-pasteable "World Class 2026" scripts for:
    - **Reddit /r/reactjs**: "I spent 300 hours on this because I hate node-graphs"
    - **Hacker News**: "Show HN: I converted VS Code's AST into a 3D metropolis"
    - **Twitter/X**: The "Visual Hook" thread.
    - **Repo Outreach**: How to comment on a GitHub Issue without getting banned.

---

### Functional Fixes (Required for Trust)

We can't market a "World Class" app if the metrics aren't explained and the screenshot button is broken.

#### [MODIFY] [AuditStats.jsx](file:///home/yash/Projects/Code_City/frontend/src/features/explorer/ui/AuditStats.jsx)
- Add explanatory tooltips to every card. "Architecture Grade" needs to justify itself.

#### [MODIFY] [ViewControl.jsx](file:///home/yash/Projects/Code_City/frontend/src/widgets/layout/ui/ViewControl.jsx)
- Fix the screenshot button. It must force a render frame to capture the buffer now that `preserveDrawingBuffer` is off.

#### [MODIFY] [createCitySlice.js](file:///home/yash/Projects/Code_City/frontend/src/store/slices/createCitySlice.js)
- Implement `excludePatterns`. This is the #1 feature request from technical users (excluding tests).

---

## Verification Plan

### Automated Tests
- Run existing tests: `cd frontend && npx vitest run`
- Verify `utils.test.js` (pattern detection) and `colorUtils.test.js` (building colors) still pass
- Verify `createCitySlice.test.js` still passes after adding `excludePatterns`

### Manual Verification
1. **Tooltips**: Hover over each metric card in the Metrics Table view. Each should show a tooltip explaining the formula.
2. **File Exclusion**: Load a repo, open the exclusion panel, add `*.test.*`, verify test files disappear from the city and metrics recalculate.
3. **Screenshot**: Click the camera icon in ViewControl. Verify a PNG downloads with the correct city render.
4. **Health Explanation**: Click the Town Hall/Reactor, verify the "How is this calculated?" section is present and readable.
