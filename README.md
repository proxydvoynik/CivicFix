# CiviFix: Hyperlocal Civic Command Center

**CiviFix** is a premium, AI-driven hyperlocal incident command center dashboard tailored specifically for **Thalassery Town** (Kerala, India). Styled as a modern, high-density tactical interface, CiviFix empowers local citizens to report, cross-verify, and track infrastructure issues (potholes, waterlogging, broken lights, waste) in real-time, leveraging AI automation to bridge the gap between citizens and municipal authorities.

*Developed with ❤️ by **Harshith** for the Vibe2Ship Hackathon.*

---

## 🖥️ System Architecture & Dashboard Features

CiviFix uses a balanced three-column layout with a dark, premium matte charcoal theme, frosted glass cards (glassmorphism), and full monospaced styling for high data readability:

### 1. Central Tactical Map & History
- **3D Isometric Tactical Map**: A perspective-warped town coordinates plane (`rotateX(46deg) rotateZ(-12deg)`) plotting local Thalassery sectors.
- **Floating 3D Pins**: Incident markers float vertically stand-up using counter-rotation transforms (`rotateZ(12deg) rotateX(-46deg)`) connected by glowing neon altitude wires to the map surface.
- **Hazard Heatmap Layer**: Toggles a glowing flood hazard heatmap overlay on low-lying sectors.
- **Civic Stability History**: 90-day stability charts featuring a custom multi-color gradient sparkline (Green $\rightarrow$ Yellow $\rightarrow$ Red) and a 48-bucket active stability bar graph.

### 2. Left Column: Analytics & Incident Feeds
- **Environmental Health (Wards Health)**: Plotted with a vector SVG Spiderweb Radar Chart tracking five primary metrics: *Lights, Safety, Waste, Drainage, and Roads*.
- **Incident Streams**: Real-time citizen alert cards categorized by severity, with integrated actions for verifying reports and drafting letters.
- **AI Agent Console**: A live rolling terminal window tracking the background autonomous workflow decisions of the CiviFix monitoring agent.

### 3. Right Column: Hazard Forecasting & Dispatch Queue
- **Precipitation & Hazards Forecast**: Displays meteorological radar values in Celsius (`°C`) and metric units, including a color-coded hourly rainfall chart.
- **Volunteer Karma Board**: High-contrast leaderboard highlighting top wardens, badges, and contribution karma points.
- **AI Dispatch Queue**: Real-time visual tracking of municipal notices (Drafted $\rightarrow$ Dispatched $\rightarrow$ Inspections $\rightarrow$ Clearance).

### 4. Interactive Overlay Modals
- **Grievance Notice Draftsman**: Automatically composes formal legal notice letters directed to the Thalassery Municipal Commissioner.
- **Google StreetView AI Cross-Check**: Side-by-side comparative panel analyzing baseline archive imagery against mobile EXIF data uploads to verify infrastructure damage.
- **Report Neighborhood Issue Modal**: Frosted overlay popup with categories, location selectors, and simulated Gemini Vision Vision checker uploads.

---

## 🛠️ Tech Stack & Aesthetics

- **Core**: React, Vite, Framer Motion, Lucide Icons.
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
