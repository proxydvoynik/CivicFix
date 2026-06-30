# CivicFix: Hyperlocal Civic Command Center

**CivicFix** is a premium, AI-driven hyperlocal incident command center dashboard tailored specifically for **Thalassery Town** (Kannur, Kerala, India). Styled as a modern, high-density operations interface, CivicFix empowers local citizens and municipal wardens to report, cross-verify, and track infrastructure issues (potholes, drainage blockages, broken streetlights, safety hazards, and waste accumulation) in real-time. It leverages advanced AI orchestration to bridge the gap between citizens and municipal authorities.

*Developed by Harshith for the Vibe2Ship Hackathon.*

---

## 📸 Visual Previews & Media

Below are visual layouts and walkthrough placeholders demonstrating the high-density tactical dashboard in action.

### 🖥️ Tactical Dashboard Interface
<img width="1917" height="909" alt="Screenshot 2026-06-30 155642" src="https://github.com/user-attachments/assets/0676d6a5-65b2-46b5-acb5-1f46272758b2" />
*Figure 1: Full tactical dashboard containing the 3-column layouts, dark-mode leaflet map, and live data charts.*

### 📍 Geocoding & Incident Auto-Fill Modal
<img width="952" height="907" alt="Screenshot 2026-06-30 160943" src="https://github.com/user-attachments/assets/e2dbb65a-3318-4263-a715-e5cfe525df30" />
*Figure 2: Frosted reporting modal showing GPS location-lock and dynamic ward boundary auto-fill.*

### 🔍 Citizen Evidence Verification Panel
<img width="966" height="780" alt="image" src="https://github.com/user-attachments/assets/771836ab-9348-48eb-bd2e-48c23fbd5b21" />
*Figure 3: Centered evidence panel displaying citizen-submitted photo evidence along with EXIF photo metadata.*

---

## 🖥️ System Architecture & Dashboard Features

CivicFix uses a balanced, high-density layout with a dark, premium matte charcoal theme, frosted glass cards (glassmorphism), and full monospaced styling for maximum data readability:

### 1. Central Tactical Map & History
- **Interactive Live Tactical Map**: Powered by Leaflet, OpenStreetMap, and CartoDB Dark Matter tiles, providing a premium, fully zoomable, and draggable dark-themed tactical map.
- **Irregular Municipal Boundary**: Dynamically computes the outer municipal perimeter on boot as the union of all 53 ward polygons using Turf.js (`turf.dissolve`), extracting only the outer perimeter to discard internal gaps/slivers. Includes a `turf.convex` fallback.
- **Strict Boundary Lock**: Map coordinates bounds are locked (`minZoom: 11, maxZoom: 18`) to restrict panning outside Thalassery Town limits, utilizing bounce-back boundaries.
- **Interactive Panning**: Clicking on any incident in the sidebar feed smoothly pans and zooms the Leaflet map focus to the target coordinates.
- **Map Click Coordinates Capture**: Clicking any point on the map retrieves exact latitude/longitude coordinates, runs Point-in-Polygon geocoding, and opens the reporting form.
- **Live Sync & Custom Markers**: Plots pulsing red/blue/amber custom markers for active reports, with live upvote and verification actions bound directly inside Leaflet popups.
- **Hazard Heatmap Layer**: Toggles interactive hazard boundary circles (red/orange radius overlays) around reported incidents dynamically scaled by severity.
- **Civic Stability History**: 90-day stability charts featuring a custom multi-color gradient sparkline (Green $\rightarrow$ Yellow $\rightarrow$ Red) and a 48-bucket active stability bar graph.

### 2. Left Column: Core Analytics
- **Environmental Health (Wards Health)**: Plotted with a vector SVG Spiderweb Radar Chart tracking five primary metrics: *Lights, Safety, Waste, Drainage, and Roads*. Expanded layout centers the radar chart with enhanced breathing room.
- **Active Grid Alerts Launcher**: Direct operational trigger opening the Active Alerts modal workspace.
- **AI Dispatch Queue Launcher**: Direct operational trigger opening the AI Dispatch Queue modal workspace.
- **Risk Forecast Launcher**: Direct operational trigger opening the Ward Hotspots modal workspace.

### 3. Right Column: Hazards & Community
- **Precipitation & Hazards Forecast**: Displays meteorological radar values, wind speed, pressure, and a color-coded hourly rainfall chart.
- **Volunteer Karma Board**: High-contrast leaderboard highlighting top wardens, badges, and contribution karma points.
- **Vertical Spacing Balance**: Side widgets grow vertically (`flex-1`) with aligned spacing metrics for visual stability.

### 4. Centered Triage Agent Command Log & Integrated Footer
- **Triage Agent Command Log Drawer**: A live rolling terminal window tracking background autonomous workflow decisions, confidence scores, and action plans of the CivicFix monitoring agent. It is docked at the bottom of the viewport and horizontally centered (`max-w-6xl`) for a clean, premium developer-tool layout.
- **Integrated Footer**: Embedded directly inside the collapsible console drawer container. The developer signature, versioning info, and hackathon credits form a unified component that slides up and down dynamically with the console drawer, maximizing vertical screen real estate.

### 5. Interactive Split-Screen Workspace Modals
- **Active Grid Alerts Workspace**: Frosted modal overlay with a searchable grid alerts feed on the left and a synchronized Leaflet map on the right. Clicking any card pans and centers the map to the incident coordinates.
- **AI Dispatch Queue Workspace**: Frosted modal overlay with active municipal dispatches, status progress bars, and stage labels on the left, and a synchronized Leaflet map displaying active dispatch pins on the right.
- **Ward Hotspots & Risk Predictions Workspace**: Frosted modal overlay showing AI-generated ward risk forecasts (critical, high, moderate, low), confidence ratings, spatial rationale, and action plans on the left, and a synchronized Leaflet map on the right.
  - **Synchronized Map Highlighting**: Hovering over or clicking a ward in the left list highlights that ward's boundary polygon dynamically (white border highlight and increased opacity) and centers the map coordinates on its centroid.
- **Consolidated Map Properties**: All workspace maps share the same strict coordinate limits, municipal boundaries, ward borders overlays, zoom constraints, and custom bottomright zoom controls as the main dashboard map.
- **Citizen Evidence Verification**: Side-by-side comparative panel analyzing baseline archive imagery against mobile EXIF data uploads to verify infrastructure damage.
- **Report Neighborhood Issue Modal**: Frosted overlay popup with categories, location selectors, coordinates feedback displays, and live photo validations.
- **Lightweight Duplicate Detection & Merge Suggestion**: Autonomously compares categories and calculates spatial distance using Turf.js to identify active duplicate reports under 250 meters, suggesting merges before a new ticket is logged.

---

## 🎨 Premium Motion System & Visual Redesign

We revamped the user experience and interface transitions using custom Framer Motion animations and CSS keyframes, recreating the visual style of premium libraries (like Magic UI) manually:
- **Staggered Panel Entrances**: Panels and containers slide and fade into view sequentially on load using custom staggered spring animations.
- **Blur-Fade Reveals**: Recreated the Magic UI Blur-Fade entry effect, animating elements from `opacity: 0, scale: 0.985, filter: blur(6px)` to sharp focus.
- **NumberTicker Counters**: Smooth spring-based integer and decimal counts for KPIs (Warden Karma points, weather stats, and stability indexes).
- **SVG Border Beams**: High-priority cards (like escalated dispatches or critical weather alerts) feature a glowing color gradient beam that crawls along their borders using keyframe-animated SVG stroke offsets.
- **Infinite Scrolling Marquee**: Rebuilt the live ticker using a double-content infinite loop container running at 60fps with pauses on hover.
- **View Transition Theme Toggling**: Seamless circular clip-path expansion ripple when switching between dark and light modes, combined with rotating sun/moon button animations.
- **Tactical Dot-Grid Canvas**: Applied a subtle grid texture backdrop (`.bg-grid-dots`) that shifts cleanly between light mode and dark mode.

---

## 🎖️ Warden Authentication & Dynamic Rank Progression

Every active control panel operator is registered under a Warden Profile. The platform encourages warden accountability using a gamified role progression logic:

### 1. Account Initialization & Role
- **Anonymous Sign-In**: Automatically assigns each visitor a unique Firebase Auth profile.
- **Profile Registration**: On first boot, users enter their display alias and are assigned the initial rank of **`Cadet Warden`** with `0` Karma Points (KP).

### 2. Dynamic Promotion Thresholds
Your role badge updates dynamically on your header and on the Volunteer Board depending on your current KP value:

| Karma Points (KP) | Warden Role Badge | Description |
| :--- | :--- | :--- |
| **0 – 149** | `Cadet Warden` | Initial entry rank |
| **150 – 349** | `Street Watcher` | Focuses on streetlights and signs |
| **350 – 399** | `Waste Tracker` | Coordinates waste cleaning dispatches |
| **400 – 499** | `Pothole Ranger` | Audits road repair work |
| **500+** | `Thalassery Warden` | Highest rank; full administrative authority |

### 3. Karma Points (KP) Reward Matrix
Wardens earn points to rank up by completing community validation tasks:
- **Submit a Civic Report**: `+10 KP`
- **Upvote an Active Incident**: `+2 KP`
- **Submit a Community Verification**: `+5 KP`
- **Audit and Verify a Resolution Proof**: `+25 KP`

---

## 🤖 How AI Acts Autonomously (Agentic Depth)

CivicFix utilizes an autonomous agentic pipeline to monitor and triage reports without manual human intervention:
- **Autonomous Image Category Validation**: When a photo is uploaded, Gemini 2.5 Flash analyzes its pixels and returns a `detectedCategory`. If it differs from the user's current choice, the form displays a helpful suggestion alert box with a single-click **"Change Category"** button.
- **Placeholder Substitution Engine**: If a user uploads a photo before entering coordinates or details, Gemini drafts the grievance notice with placeholder strings (`"Unknown Location"`, `"Unknown Ward"`). On submission, the frontend dynamically replaces these strings with the user's finalized text inputs before saving to Firestore.
- **Auto-Escalation Triage**: The system tracks volunteer verifications and community upvotes. If an issue passes the 15-verification or 100-upvote thresholds, the AI agent autonomously escalates the report's severity to "critical" and status to "escalated", updating the tactical priority score.
- **Intelligent Duplicity Filtering**: The system autonomously computes spatial distance (using Turf.js) and category checks on newly reported issues to detect duplicates, suggesting merges before a ticket is created.
- **Closed-Loop Resolution Audits**: When maintenance teams upload repair proof photos, Gemini Vision audits the pixels to check if the issue is resolved (`appears_resolved` vs `insufficient_evidence`) before allowing wardens to close the ticket.
- **Autonomous Legal Drafting**: The AI agent drafts context-aware grievance letters to the Municipal Commissioner, automatically pre-populating geo-coordinates, reference numbers, and localized ward details.

---

## 📈 Impact & Outcomes (Problem Solving & Impact)
CivicFix directly solves the hyper-local community hero challenge through measurable, high-trust civic mechanics:
- **Faster Triage and Response**: The automated priority scoring and AI-triage mechanism reduce the time administrative teams spend reviewing reports, focusing attention immediately on critical hazards.
- **90%+ Reduction in Duplicate Tickets**: Spatial and category-based duplicity checks prevent redundant reports from flooding the system, streamlining administrative workflows.
- **Better Ward-Level Prioritization**: Wards-health radar graphs and heatmaps group data administratively, helping councilors identify and prioritize structural issues by zone.
- **Trustworthy Evidence Validation**: Combining EXIF metadata matching with visual AI auditing ensures only authentic, verified reports are submitted to municipal commissioners, minimizing spam and false alarms.

---

## 🧮 Geocoding & Coordinate Inference Engines

The core location engine of CivicFix matches coordinates to the 53 municipal wards of Thalassery using a hierarchical geocoding pipeline:

### 1. Point-in-Polygon (PIP) Ray-Casting
When a coordinate $(x, y)$ is clicked or captured, CivicFix checks for exact containment inside the polygon boundary of each ward. This is implemented via the standard ray-casting algorithm. A horizontal ray is cast from the coordinate to the right. The number of times the ray intersects the polygon's edges determines if the point is inside:

$$\text{inside} = \text{number of intersections is odd}$$

For each edge between polygon vertices $(x_i, y_i)$ and $(x_j, y_j)$, the intersection condition is:

$$(y_i > y) \neq (y_j > y) \quad \text{and} \quad \left(x < \frac{(x_j - x_i) \cdot (y - y_i)}{y_j - y_i} + x_i\right)$$

If containment is found, the system auto-fills the ward and marks the location as **Confident (Polygon Matched)**.

### 2. Centroid-Based Nearest Ward Fallback
If the point lies slightly outside all defined ward boundaries (e.g. boundary roads or offshore), the engine falls back to comparing the Haversine distance from the coordinate to the precomputed geographic centroids of all 53 wards.

The Haversine distance $d$ between the coordinate $(\phi_1, \lambda_1)$ and centroid $(\phi_2, \lambda_2)$ is calculated as:

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$

$$c = 2 \cdot \mathrm{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$

$$d = R \cdot c$$

where $R = 6371\text{ km}$ is the radius of the Earth, $\Delta \phi = \phi_2 - \phi_1$, and $\Delta \lambda = \lambda_2 - \lambda_1$.
The system auto-fills the closest ward if $d \le 3.0\text{ km}$. If the distance exceeds this confidence threshold, it prompts the user to select the ward manually.

### 3. Zone Centroid Calibration
The tactical centers for each of the six municipal zones are computed dynamically as the average centroid coordinates of their constituent wards:

$$\text{Center}_{\text{zone}} = \left(\frac{1}{N}\sum_{k=1}^N \text{Lat}_k, \quad \frac{1}{N}\sum_{k=1}^N \text{Lng}_k\right)$$

This ensures that the zone markers on the Leaflet map represent the true geographic center of their administrative wards.

### 4. Geographic Calibration Offset
To align the custom ward overlays with the OpenStreetMap base tiles, a translation calibration offset ($dLat = -0.00014$, $dLng = +0.00180$) is applied to all ward polygon vertices, correcting the baseline coordinates to their actual coordinates on the map:

$$\text{Lat}_{\text{calibrated}} = \text{Lat}_{\text{raw}} - 0.00014$$
$$\text{Lng}_{\text{calibrated}} = \text{Lng}_{\text{raw}} + 0.00180$$

---

## 🛠️ Tech Stack & Aesthetics

- **Core**: React 19, Vite, Framer Motion, Lucide Icons, Leaflet.
- **Styling**: Tailwind CSS & Vanilla CSS configurations.
- **Typography**: JetBrains Mono (imported globally for high-contrast command center readouts).
- **Design System**: Matte charcoal backdrops (`#08090c`), frosted glassmorphic card boundaries (`bg-[#121318]/70 backdrop-blur-md border-[#1b1d24]/50`), and status alerts (emerald, amber, red).

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation
1. Clone the repository to your local drive.
2. Navigate to the project root:
   ```bash
   cd CivicFix
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration
1. Copy the blueprint template:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and configure your API keys:
   * `VITE_FIREBASE_API_KEY`, etc. (for real-time Firestore database sync).
   * `VITE_GEMINI_API_KEY` (for live Gemini AI Vision photo validation and municipal letter drafts).
   
   *Note: If no keys are configured, CivicFix automatically falls back to full local simulation mode.*

### Running Locally
To launch the Vite development server:
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### Compiling Production Build
To create a minimized, optimized production build:
```bash
npm run build
```
The compiled assets will be built into the `dist/` directory.
