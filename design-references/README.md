# Dashboard motion reference

Control AI Policy Platform by George Railean.
Source: https://dribbble.com/shots/27388009-AI-Dashboard-Design-for-Control-AI-Policy-Platform
Video: https://cdn.dribbble.com/userupload/47771395/file/large-6a4c6572b8e5d8ef7405388ee0a09dde.mp4
Downloaded for the requested visual study. 21.07 seconds, 800 × 600, 30 fps.
Reference footage is not embedded in the application or used as its interface.

Studied sequence:
- 0–4 s: luminous hub reveals an orbital graph; camera pulls out.
- 5–9 s: floating task dock and contextual analysis.
- 10–14 s: selected node comes forward, shifts left, reveals branch cards.
- 15–18 s: selected branch fans out into related nodes.
- 18–21 s: right-side contextual inspector enters.

Implemented in `frontend/src/network.ts` and `frontend/src/studio.css`:
- Edge-to-edge canvas with floating top-center controls; desktop sidebar removed from the graph surface.
- Golden runtime nucleus, violet/rose/teal agent spheres, capability satellites, real runtime services (routing, blackboard, trust, event stream), and animated filaments.
- Node selection transitions into a left-hand agent hub, four real-data branch cards, and a contextual inspector.
- Capability, output, workflow, and receipt branches fan out into clickable rows.
- Floating task form remains connected to real execution; panning, zoom, reset, keyboard activation, and reduced motion work.
- Agent store, installation, publishing, and existing execution evidence remain available.

Intentional adaptations: the graph uses actual installed agents and capability counts, not the reference's policy entities or invented metrics. Detail panels contain live Nexus state. The reference video is a study asset, not an application background.

Visual QA: compared the video’s 3-second overview, 12-second focus, and 18-second inspector frames against the rendered app. Used Playwright with local Chrome because the Browser plugin is unavailable. Checked desktop and mobile screenshots, console health, scene transitions, diagram hit targets, panning/zoom/reset, reduced motion, task preview, and preserved execution/store flows. Fixed a gap in SVG fan-row hit areas and centered the mobile viewport on the runtime hub.
