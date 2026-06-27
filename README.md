# CivicFix: Hyperlocal Civic Command Center

**CivicFix** is a premium, AI-driven hyperlocal incident command center dashboard tailored specifically for **Thalassery Town** (Kerala, India). Styled as a modern, high-density tactical interface, CivicFix empowers local citizens to report, cross-verify, and track infrastructure issues (potholes, waterlogging, broken lights, waste) in real-time, leveraging AI automation to bridge the gap between citizens and municipal authorities.

*Developed with ❤️ for the Vibe2Ship Hackathon.*

---

## 📸 Visual Previews & Media

Below are visual layouts and walkthrough placeholders demonstrating the high-density tactical dashboard in action.

### 🖥️ Tactical Dashboard Interface
<!-- Add dashboard view screenshot here -->
![Tactical Dashboard Screenshot](docs/screenshots/dashboard_tactical_view.png)
*Figure 1: Full tactical dashboard containing the 3-column layouts, dark-mode leaflet map, and live data charts.*

### 📍 Geocoding & Incident Auto-Fill Modal
<!-- Add modal view screenshot here -->
![Report Modal Screenshot](docs/screenshots/report_modal_autocomplete.png)
*Figure 2: Frosted reporting modal showing GPS location-lock and dynamic ward boundary auto-fill.*

### 🔍 Citizen Evidence Verification Panel
<!-- Add Evidence View screenshot here -->
![Evidence Verification Screenshot](docs/screenshots/streetview_verification_panel.png)
*Figure 3: Centered evidence panel displaying citizen-submitted photo evidence along with EXIF photo metadata.*

### 🎥 Demo Walkthrough Video
<!-- Add product walkthrough video here -->
```html
<video src="docs/media/civicfix_demo_walkthrough.mp4" controls width="800" poster="docs/screenshots/dashboard_tactical_view.png">
  Your browser does not support the video tag.
</video>
```
*Video 1: Walkthrough showing map pings, boundary drawing, Point-in-Polygon checks, and AI console logs.*

---

## 🖥️ System Architecture & Dashboard Features

CivicFix uses a balanced three-column layout with a dark, premium matte charcoal theme, frosted glass cards (glassmorphism), and full monospaced styling for high data readability:

### 1. Central Tactical Map & History
- **Interactive Live Tactical Map**: Powered by Leaflet, OpenStreetMap, and CartoDB Dark Matter tiles, providing a premium, fully zoomable, and draggable dark-themed tactical map.
- **Irregular Municipal Boundary**: Renders the authentic, high-resolution geographic border coordinates of Thalassery Municipality extracted from OpenStreetMap.
- **Strict Boundary Lock**: Map coordinates bounds are locked (`minZoom: 13, maxZoom: 18`) to restrict panning outside Thalassery Town limits, utilizing bounce-back boundaries.
- **Interactive Panning**: Clicking on any incident in the sidebar feed smoothly pans and zooms the Leaflet map focus to the target coordinates.
- **Map Click Coordinates Capture**: Clicking any point on the map retrieves exact latitude/longitude coordinates, runs Point-in-Polygon geocoding, and opens the reporting form.
- **Live Sync & Custom Markers**: Plots pulsing red/blue/amber custom markers for active reports, with live upvote and verification actions bound directly inside Leaflet popups.
- **Hazard Heatmap Layer**: Toggles interactive hazard boundary circles (red/orange radius overlays) around reported incidents dynamically scaled by severity.
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

$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$

$$d = R \cdot c$$

where $R = 6371\text{ km}$ is the radius of the Earth, $\Delta \phi = \phi_2 - \phi_1$, and $\Delta \lambda = \lambda_2 - \lambda_1$.
The system auto-fills the closest ward if $d \le 3.0\text{ km}$. If the distance exceeds this confidence threshold, it prompts the user to select the ward manually.

### 3. Zone Centroid Calibration
The tactical centers for each of the six municipal zones are computed dynamically as the average centroid coordinates of their constituent wards:

$$\text{Center}_{\text{zone}} = \left(\frac{1}{N}\sum_{k=1}^N \text{Lat}_k, \quad \frac{1}{N}\sum_{k=1}^N \text{Lng}_k\right)$$

This ensures that the zone markers on the Leaflet map represent the true geographic center of their administrative wards.

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
Open **[http://localhost:5173/](http://localhost:5173/)** (or the fallback port indicated in the terminal, e.g. `5174`) in your browser.

### Compiling Production Build
To create a minimized, optimized production build:
```bash
npm run build
```
The compiled assets will be built into the `dist/` directory.
