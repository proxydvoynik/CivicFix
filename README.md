# CivicFix: Hyperlocal Civic Command Center

**CivicFix** is a premium, AI-driven hyperlocal incident command center dashboard tailored specifically for **Thalassery Town** (Kerala, India). Styled as a modern, high-density tactical interface, CivicFix empowers local citizens to report, cross-verify, and track infrastructure issues (potholes, waterlogging, broken lights, waste) in real-time, leveraging AI automation to bridge the gap between citizens and municipal authorities.

*Developed with ❤️ by **Harshith** for the Vibe2Ship Hackathon.*

---

## 🖥️ System Architecture & Dashboard Features

CivicFix uses a balanced three-column layout with a dark, premium matte charcoal theme, frosted glass cards (glassmorphism), and full monospaced styling for high data readability:

### 1. Central Tactical Map & History
- **Interactive Live Tactical Map**: Powered by Leaflet, OpenStreetMap, and CartoDB Dark Matter tiles, providing a premium, fully zoomable, and draggable dark-themed tactical map.
- **Irregular Municipal Boundary**: Renders the authentic, high-resolution geographic border coordinates of Thalassery Municipality extracted from OpenStreetMap.
- **Strict Boundary Lock**: Map coordinates bounds are locked (`minZoom: 13, maxZoom: 18`) to restrict panning outside Thalassery Town limits, utilizing bounce-back boundaries.
- **Interactive Panning**: Clicking on any incident in the sidebar feed smoothly pans and zooms the Leaflet map focus to the target coordinates.
- **Map Click Coordinates Capture**: Clicking any point on the map retrieves exact latitude/longitude coordinates, auto-selects the nearest ward sector, and opens the reporting form.
- **Live Sync & Custom Markers**: Plots pulsing red/amber custom markers for active reports, with live upvote and verification actions bound directly inside Leaflet popups.
- **Hazard Heatmap Layer**: Toggles interactive hazard boundary circles (red/orange radius overlays) around low-lying underpasses when enabled.
- **Civic Stability History**: 90-day stability charts featuring a custom multi-color gradient sparkline (Green $\rightarrow$ Yellow $\rightarrow$ Red) and a 48-bucket active stability bar graph.

### 2. Left Column: Analytics & Incident Feeds
- **Environmental Health (Wards Health)**: Plotted with a vector SVG Spiderweb Radar Chart tracking five primary metrics: *Lights, Safety, Waste, Drainage, and Roads*.
- **Incident Streams**: Real-time citizen alert cards categorized by severity, with integrated search/filter queries, votes count, and action controls.
- **AI Agent Console**: A live rolling terminal window tracking the background autonomous workflow decisions of the CivicFix monitoring agent.

### 3. Right Column: Hazard Forecasting & Dispatch Queue
- **Precipitation & Hazards Forecast**: Displays meteorological radar values, wind speed, pressure, and a color-coded hourly rainfall chart.
- **Volunteer Karma Board**: High-contrast leaderboard highlighting top wardens, badges, and contribution karma points.
- **AI Dispatch Queue**: Real-time visual tracking of municipal notices (Drafted $\rightarrow$ Dispatched $\rightarrow$ Inspections $\rightarrow$ Clearance).

### 4. Interactive Overlay Modals
- **Grievance Notice Draftsman**: Automatically composes formal legal notice letters directed to the Thalassery Municipal Commissioner.
- **Google StreetView AI Cross-Check**: Side-by-side comparative panel analyzing baseline archive imagery against mobile EXIF data uploads to verify infrastructure damage.
- **Report Neighborhood Issue Modal**: Frosted overlay popup with categories, location selectors, coordinates feedback displays, and live photo validations.

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
To launch the Vite hot-reloading development server:
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
