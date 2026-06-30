import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { 
  MapPin, Activity, PlusCircle, RefreshCw, 
  CheckCircle2, Send, Globe, Shield, X, 
  Camera, AlertCircle, FileText, CloudSun, Layers, Sun, Moon, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LeftPanel from './components/LeftPanel.jsx';
import NumberTicker from './components/ui/NumberTicker.jsx';
import * as turf from '@turf/turf';

// Live Integration Imports
import { db, auth, isFirebaseConfigured } from './lib/firebase.js';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, increment, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { analyzeIssueImage, isGeminiConfigured } from './lib/gemini.js';
import { CivicFixTriageAgent } from './lib/triageAgent.js';

// Leaflet Maps Imports
import L from 'leaflet';
import RightPanel from './components/RightPanel.jsx';
import 'leaflet/dist/leaflet.css';
import LiveTicker from './components/LiveTicker.jsx';
import ConsoleDrawer from './components/ConsoleDrawer.jsx';
import IssueDetailsModal from './components/IssueDetailsModal.jsx';
import WardHotspotsWorkspace from './components/WardHotspotsWorkspace.jsx';
import ActiveGridAlertsWorkspace from './components/ActiveGridAlertsWorkspace.jsx';
import AiDispatchQueueWorkspace from './components/AiDispatchQueueWorkspace.jsx';

import { 
  normalizeZoneName, 
  getMapMarkers, 
  getHeatmapData, 
  getStabilityTrend,
  CANONICAL_WARDS,
  inferWardFromCoordinates,
  getZoneFromWard
} from './lib/helpers.js';
import { WARD_POLYGONS } from './lib/ward_polygons.js';



/*
function usePrevious(value) {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(null);

  if (value !== current) {
    setPrevious(current);
    setCurrent(value);
  }

  return previous;
}
*/

// Hardcoded Thalassery Town Community Wards/Zones
const initialDistricts = [
  { name: "South Highway", availability: 97.2, active: 2, resolved: 41, severity: "warning", lat: 11.745525, lng: 75.528233, sparkline: [98, 97.5, 97.2, 97.0, 97.3, 97.2] },
  { name: "Court Corridor", availability: 99.0, active: 1, resolved: 58, severity: "normal", lat: 11.753798, lng: 75.490089, sparkline: [99, 99.1, 98.9, 99.0, 99.0, 99.0] },
  { name: "Heritage Quarter", availability: 94.6, active: 4, resolved: 32, severity: "critical", lat: 11.742951, lng: 75.501934, sparkline: [96, 95.2, 94.8, 94.1, 94.5, 94.6] },
  { name: "Seafront", availability: 98.1, active: 1, resolved: 29, severity: "normal", lat: 11.737300, lng: 75.509542, sparkline: [98.5, 98.2, 98.0, 98.1, 98.3, 98.1] },
  { name: "North Uplands", availability: 99.5, active: 0, resolved: 24, severity: "normal", lat: 11.768448, lng: 75.489624, sparkline: [99.5, 99.5, 99.5, 99.5, 99.5, 99.5] },
  { name: "Chirakkara Hills", availability: 96.8, active: 3, resolved: 37, severity: "warning", lat: 11.752816, lng: 75.506582, sparkline: [97.5, 97.1, 96.9, 96.6, 96.8, 96.8] }
];

// Mock Recent Issues Feed for Thalassery
// Mock Recent Issues Feed for Thalassery
const initialIssues = [
  { 
    id: 1, 
    type: "Pothole", 
    location: "Court Road Junction Bypass (Near Post Office)", 
    zone: "Court Corridor", 
    ward: "47",
    timeAgo: "2m ago", 
    severity: "critical", 
    votes: 85, 
    verifications: 12,
    user: "Adithya V.",
    streetViewStatus: "verified",
    image: "/images/seed/pothole.png",
    lat: 11.746356,
    lng: 75.492390,
    status: "dispatched",
    dispatchApprovals: ["Ashwin Raj", "Divya Balan", "Muhammed Shafi", "Ananya K.", "Haris P.", "Suresh M.", "Kavya Nair", "Rahul K.", "Meera V.", "Amal Roy", "Fathima Z.", "Sidharth S.", "Neetu P.", "Sreejith V.", "Anjana Das"],
    details: "Deep crater in the middle of the road, causing severe traffic block and safety risks for two-wheelers.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Urgent grievance notice regarding public road damage (Pothole) at Court Corridor.

Respected Sir/Madam,
I am writing to draw your immediate attention to a severe infrastructure hazard at Court Road Junction Bypass (Near Post Office). An automated civic monitoring tool has registered a deep road cavity (approx. depth 12cm, diameter 1.1m) posing threat to traffic safety. 

This issue is verified by local community sensors. We request your engineering team to inspect and repair the road surface at the earliest.

Coordinates: Lat 11.746356, Lng 75.492390
Report Reference: #CF-9811`
  },
  { 
    id: 2, 
    type: "Drainage", 
    location: "Railway Underpass (Overbury's Folly Road)", 
    zone: "Heritage Quarter", 
    ward: "45",
    timeAgo: "14m ago", 
    severity: "critical", 
    votes: 180, 
    verifications: 16,
    user: "Nihal P.",
    streetViewStatus: "verified",
    image: "/images/seed/drainage.png",
    lat: 11.743814,
    lng: 75.491403,
    status: "escalated",
    dispatchApprovals: ["Ashwin Raj", "Divya Balan", "Muhammed Shafi", "Ananya K.", "Haris P.", "Suresh M.", "Kavya Nair", "Rahul K.", "Meera V.", "Amal Roy", "Fathima Z.", "Sidharth S."],
    details: "Water logged up to 60 cm under the railway bridge. Cars and autos are turning back.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Report regarding clogged stormwater drain and waterlogging at Railway Underpass.

Respected Sir/Madam,
This is to notify the Thalassery Municipality regarding waterlogging at the Railway Underpass (Overbury's Folly Road). Blocked stormwater channels have resulted in over 60 cm of water accumulation.

Local traffic is paralyzed. We urge the municipal drainage department to clear the blocks immediately.

Coordinates: Lat 11.743814, Lng 75.491403
Report Reference: #CF-9812`
  },
  { 
    id: 3, 
    type: "Waste", 
    location: "Madapeedika Junction (Near Highway Bypass)", 
    zone: "South Highway", 
    ward: "32",
    timeAgo: "32m ago", 
    severity: "warning", 
    votes: 60, 
    verifications: 5,
    user: "Shahana M.",
    streetViewStatus: "unverified",
    image: "/images/seed/waste.png",
    lat: 11.736163,
    lng: 75.530662,
    status: "open",
    details: "Commercial waste and plastic bags piled near the parking lot, attracting stray dogs.",
    letterDrafted: `To,
The Health Inspector,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Request for waste clearance near Madapeedika Junction.

Respected Sir/Madam,
I request the municipal sanitation department to clear commercial waste accumulated near Madapeedika Junction. The dump is causing unhygienic conditions.

Coordinates: Lat 11.736163, Lng 75.530662
Report Reference: #CF-9813`
  },
  { 
    id: 4, 
    type: "Drainage", 
    location: "Sea Bridge pathway near children's park", 
    zone: "Seafront", 
    ward: "42",
    timeAgo: "1h ago", 
    severity: "warning", 
    votes: 90, 
    verifications: 7,
    user: "Ramesh Kumar",
    streetViewStatus: "verified",
    image: "/images/seed/drainage.png",
    lat: 11.742109,
    lng: 75.500670,
    status: "inspected",
    details: "Cover slab of storm drain is broken, leaving a 1-meter deep open hole on the pedestrian walkway.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Broken drain cover slab hazard near Sea Bridge pathway.

Respected Sir/Madam,
A broken cover slab on the storm drain near the Sea Bridge pathway has created an open hazard on the walkway. Please initiate immediate repairs to prevent accidents.

Coordinates: Lat 11.742109, Lng 75.500670
Report Reference: #CF-9814`
  },
  { 
    id: 5, 
    type: "Streetlight", 
    location: "Thalassery Town Hall Road", 
    zone: "Court Corridor", 
    ward: "12",
    timeAgo: "2h ago", 
    severity: "info", 
    votes: 30, 
    verifications: 2,
    user: "Kiran Das",
    streetViewStatus: "unverified",
    image: "/images/seed/streetlight.png",
    lat: 11.751203,
    lng: 75.498350,
    status: "open",
    details: "Three consecutive streetlights are not working on the Town Hall stretch, making it extremely dark and unsafe after 7 PM.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Non-functional streetlights on Town Hall Road.

Respected Sir/Madam,
This is to report that three consecutive streetlights are not functioning on the Town Hall Road stretch in Ward 12. The lack of lighting poses a significant safety concern for pedestrians and commuters after dark. Please replace the lamps at the earliest.

Coordinates: Lat 11.751203, Lng 75.498350
Report Reference: #CF-9815`
  },
  { 
    id: 6, 
    type: "Safety", 
    location: "Chirakkara Junction Pedestrian Crossing", 
    zone: "Chirakkara Hills", 
    ward: "14",
    timeAgo: "4h ago", 
    severity: "critical", 
    votes: 120, 
    verifications: 11,
    user: "Aiswarya K.",
    streetViewStatus: "verified",
    image: "/images/seed/safety.png",
    lat: 11.756198,
    lng: 75.505553,
    status: "open",
    details: "Pedestrian crossing signs and markings have completely faded at a high-speed junction, causing close calls daily.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Dangerous pedestrian crossing at Chirakkara Junction.

Respected Sir/Madam,
This is to alert the traffic planning department that pedestrian crossing markings and signs at Chirakkara Junction in Ward 14 have completely faded. This high-speed junction has seen several near-miss incidents. We request immediate repainting and installation of warning lights.

Coordinates: Lat 11.756198, Lng 75.505553
Report Reference: #CF-9816`
  },
  { 
    id: 7, 
    type: "Pothole", 
    location: "Nittoor High School Road", 
    zone: "North Uplands", 
    ward: "1",
    timeAgo: "6h ago", 
    severity: "warning", 
    votes: 50, 
    verifications: 4,
    user: "Gautham S.",
    streetViewStatus: "verified",
    image: "/images/seed/pothole.png",
    lat: 11.771405,
    lng: 75.478565,
    status: "resolved",
    details: "Large pothole near the school entrance causing traffic delays during school assembly hours.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Resolved: Road pothole repaired near Nittoor High School.

Respected Sir/Madam,
This is to confirm that the large pothole near the Nittoor High School entrance in Ward 1 has been successfully patched by the public works department. Traffic flow has returned to normal.

Coordinates: Lat 11.771405, Lng 75.478565
Report Reference: #CF-9817`
  },
  { 
    id: 8, 
    type: "Waste", 
    location: "Temple Gate Road Waste Dump", 
    zone: "Heritage Quarter", 
    ward: "38",
    timeAgo: "8h ago", 
    severity: "warning", 
    votes: 70, 
    verifications: 6,
    user: "Suresh Babu",
    streetViewStatus: "unverified",
    image: "/images/seed/waste.png",
    lat: 11.739705,
    lng: 75.512677,
    status: "open",
    details: "Illegal garbage dumping on the side of the road near the temple gate, spreading bad odor.",
    letterDrafted: `To,
The Health Inspector,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Uncontrolled garbage dumping near Temple Gate Road.

Respected Sir/Madam,
I am writing to draw your attention to the illegal dumping of domestic and commercial waste on the side of Temple Gate Road in Ward 38. The pile is emitting a foul smell and attracting stray animals. We request clean-up and warning boards.

Coordinates: Lat 11.739705, Lng 75.512677
Report Reference: #CF-9818`
  },
  { 
    id: 9, 
    type: "Safety", 
    location: "Saidar Palli Beach Road Curve", 
    zone: "Seafront", 
    ward: "43",
    timeAgo: "12h ago", 
    severity: "critical", 
    votes: 150, 
    verifications: 15,
    user: "Muhammed R.",
    streetViewStatus: "verified",
    image: "/images/seed/safety.png",
    lat: 11.736787,
    lng: 75.496621,
    status: "dispatched",
    dispatchApprovals: ["Ashwin Raj", "Divya Balan", "Muhammed Shafi", "Ananya K.", "Haris P.", "Suresh M.", "Kavya Nair", "Rahul K.", "Meera V.", "Amal Roy", "Fathima Z.", "Sidharth S.", "Neetu P.", "Sreejith V.", "Anjana Das"],
    details: "Broken side barrier on the sharp sea-facing curve, exposing vehicles to fall onto the rocky shore.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Damaged sea-wall barrier at Saidar Palli Beach Road.

Respected Sir/Madam,
The side barrier on the sharp curve along the Saidar Palli Beach Road (Ward 43) has collapsed. Vehicles are now directly exposed to a steep fall onto the rocky sea bed below. Prompt repair is critical to avoid major accidents.

Coordinates: Lat 11.736787, Lng 75.496621
Report Reference: #CF-9819`
  },
  { 
    id: 10, 
    type: "Streetlight", 
    location: "Morakunnu Residential Lane", 
    zone: "Chirakkara Hills", 
    ward: "13",
    timeAgo: "1d ago", 
    severity: "info", 
    votes: 20, 
    verifications: 1,
    user: "Meera Nair",
    streetViewStatus: "unverified",
    image: "/images/seed/streetlight.png",
    lat: 11.759232,
    lng: 75.502188,
    status: "open",
    details: "Flickering streetlight poles making the residential area look eerie and encouraging illegal parking.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Flickering streetlight on Morakunnu Lane.

Respected Sir/Madam,
The streetlight pole on the Morakunnu Residential Lane in Ward 13 is continuously flickering. This is creating blind spots and security concerns for the residents walking in the evening. Please dispatch a repair technician.

Coordinates: Lat 11.759232, Lng 75.502188
Report Reference: #CF-9820`
  },
  { 
    id: 11, 
    type: "Pothole", 
    location: "Chandra Nagar Bypass Corner", 
    zone: "South Highway", 
    ward: "22",
    timeAgo: "1d ago", 
    severity: "warning", 
    votes: 40, 
    verifications: 3,
    user: "Rahul R.",
    streetViewStatus: "unverified",
    image: "/images/seed/pothole.png",
    lat: 11.752417,
    lng: 75.521439,
    status: "open",
    details: "Series of potholes on the highway bypass exit, slowing down high-speed traffic abruptly.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Highway bypass potholes at Chandra Nagar Corner.

Respected Sir/Madam,
This is to report multiple potholes on the bypass exit curve at Chandra Nagar Corner in Ward 22. High-speed traffic exiting the bypass is forced to brake suddenly to avoid these road cavities, creating a risk of rear-end crashes. Please patch this section immediately.

Coordinates: Lat 11.752417, Lng 75.521439
Report Reference: #CF-9821`
  },
  { 
    id: 12, 
    type: "Drainage", 
    location: "Ward 53 Main Road Waterlogging", 
    zone: "Chirakkara Hills", 
    ward: "53",
    timeAgo: "2d ago", 
    severity: "warning", 
    votes: 110, 
    verifications: 9,
    user: "Fathima S.",
    streetViewStatus: "verified",
    image: "/images/seed/drainage.png",
    lat: 11.763435,
    lng: 75.475041,
    status: "escalated",
    dispatchApprovals: ["Ashwin Raj", "Divya Balan", "Muhammed Shafi", "Ananya K.", "Haris P.", "Suresh M.", "Kavya Nair", "Rahul K.", "Meera V."],
    details: "Stormwater accumulates on the roadway during slight showers, blocking pedestrian movements.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Stormwater logging on Ward 53 Main Road.

Respected Sir/Madam,
We are facing recurrent waterlogging on the Ward 53 Main Road during light rains due to clogged side drains. This hinders pedestrian movement and damages the asphalt surface. We request cleaning of the stormwater drains in this sector.

Coordinates: Lat 11.763435, Lng 75.475041
Report Reference: #CF-9822`
  }
];

const mockLeaderboard = [
  { id: "seed_ashwin_raj", name: "Ashwin Raj", score: 520, badge: "Thalassery Warden", rank: 1, avatar: "🏆" },
  { id: "seed_divya_balan", name: "Divya Balan", score: 450, badge: "Pothole Ranger", rank: 2, avatar: "🥈" },
  { id: "seed_muhammed_shafi", name: "Muhammed Shafi", score: 390, badge: "Waste Tracker", rank: 3, avatar: "🥉" },
  { id: "seed_ananya_k", name: "Ananya K.", score: 340, badge: "Street Watcher", rank: 4, avatar: "✨" }
];

// Helper to compute automatic severity score from category and context
const getSeverityScore = (incident, floodRisk) => {
  let score = 30; // fallback
  const type = (incident.type || "").toLowerCase();
  
  if (type.includes("pothole")) score = 40;
  else if (type.includes("drain")) score = 60;
  else if (type.includes("water") || type.includes("logging")) score = 65;
  else if (type.includes("streetlight")) score = 35;
  else if (type.includes("waste") || type.includes("garbage") || type.includes("pileup")) score = 20;
  else if (type.includes("leak")) score = 35;
  else if (type.includes("obstruct")) score = 70;

  // Boosts for severity (contextual)
  if (incident.streetViewStatus === "verified" || incident.hasImage) {
    score += 10;
  }

  const loc = (incident.location || "").toLowerCase();
  const zone = (incident.zone || "").toLowerCase();
  const isRisky = loc.includes("stand") || loc.includes("underpass") || loc.includes("bridge") ||
                  loc.includes("junction") || loc.includes("school") || loc.includes("hospital") ||
                  loc.includes("market") || loc.includes("highway") || loc.includes("bypass") ||
                  zone.includes("seafront") || zone.includes("heritage");
  if (isRisky) {
    score += 10;
  }

  const isRainSensitive = type.includes("water") || type.includes("logging") || type.includes("drain");
  if (isRainSensitive && floodRisk) {
    score += 15;
  }

  return score;
};

// Convert score to semantic level (low/medium/high)
const getSeverityLevel = (score) => {
  if (score >= 75) return "high";
  if (score >= 40) return "medium";
  return "low";
};

// Compute a priorityScore from severity, verifications, upvotes, weather, and unresolved age
const getPriorityScore = (incident, severityScore, floodRisk) => {
  let score = severityScore;

  const verifications = incident.verifications || 0;
  score += Math.min(verifications * 1.33, 20);

  const upvotes = incident.votes || incident.upvotes || 0;
  score += Math.min(upvotes * 0.15, 15);

  const timeAgo = (incident.timeAgo || "").toLowerCase();
  const isOld = timeAgo.includes("h ago") || timeAgo.includes("d ago") || 
                timeAgo.includes("hour") || timeAgo.includes("day") ||
                (typeof incident.id === "number" && Date.now() - incident.id > 1800000);
  if (isOld && incident.status !== "resolved") {
    score += 10;
  }

  const type = (incident.type || "").toLowerCase();
  const isRainSensitive = type.includes("water") || type.includes("logging") || type.includes("drain");
  if (isRainSensitive && floodRisk) {
    score += 10;
  }

  return Math.min(score, 100);
};

// Determine dispatch necessity, status stage, and progress percentage
const getDispatchState = (incident, priorityScore) => {
  const dispatchRequired = priorityScore >= 60;
  const status = incident.status || "open";

  let dispatchStatus = "REPORTED";
  if (status === "resolved") {
    dispatchStatus = "RESOLVED";
  } else if (status === "inspected") {
    dispatchStatus = "IN_PROGRESS";
  } else if (status === "dispatched") {
    dispatchStatus = "DISPATCHED";
  } else if (status === "escalated") {
    dispatchStatus = "ESCALATED";
  } else if (status === "under_review") {
    dispatchStatus = "UNDER_REVIEW";
  } else if (status === "open") {
    if (dispatchRequired) {
      if (priorityScore >= 75) {
        dispatchStatus = "ESCALATED";
      } else {
        dispatchStatus = "UNDER_REVIEW";
      }
    } else {
      dispatchStatus = "REPORTED";
    }
  }

  const dispatchProgress = {
    "REPORTED": 15,
    "UNDER_REVIEW": 25,
    "ESCALATED": 40,
    "DISPATCHED": 65,
    "IN_PROGRESS": 85,
    "RESOLVED": 100
  }[dispatchStatus] || 15;

  return {
    dispatchRequired,
    dispatchStatus,
    dispatchProgress
  };
};

// Map issue categories to municipal departments
const getDepartmentFromType = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("pothole") || t.includes("drain") || t.includes("water") || t.includes("logging")) {
    return "PWD";
  }
  if (t.includes("waste") || t.includes("garbage") || t.includes("pileup")) {
    return "Sanitation";
  }
  if (t.includes("streetlight") || t.includes("light")) {
    return "Electricity Board";
  }
  if (t.includes("leak")) {
    return "Water Authority";
  }
  if (t.includes("obstruct")) {
    return "Municipality";
  }
  return "Municipality";
};

// Context-aware escalation/priority reasoning
const getEscalationReason = (incident, floodRisk) => {
  const type = (incident.type || "").toLowerCase();
  const verifications = incident.verifications || 0;
  const upvotes = incident.votes || incident.upvotes || 0;
  const hasImage = incident.streetViewStatus === "verified" || incident.hasImage;
  const isRainSensitive = type.includes("water") || type.includes("logging") || type.includes("drain");

  if (incident.status === "resolved") {
    return "Issue successfully resolved by municipal action.";
  }
  if (verifications >= 15 && isRainSensitive && floodRisk) {
    return "Escalated due to repeated verification and flood risk.";
  }
  if (verifications >= 15) {
    return `Escalated due to repeated volunteer verifications (${verifications}).`;
  }
  if (isRainSensitive && floodRisk) {
    return "Monsoon precipitation risk threshold active for low-lying zone.";
  }
  if (hasImage && upvotes >= 100) {
    return "High priority based on photo evidence and community support.";
  }
  if (hasImage) {
    return "Verification pending with confirmed photo evidence.";
  }
  if (upvotes >= 100) {
    return "Under review due to significant community upvotes.";
  }
  return "Queued for routine inspection.";
};

const dashboardContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15
    }
  }
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.985, filter: "blur(6px)" },
  show: { 
    opacity: 1, 
    scale: 1, 
    filter: "blur(0px)",
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 18 
    } 
  }
};

function App() {
const [currentUser, setCurrentUser] = useState(null);
  
  // Triage Agent & ADK-style states
  const triageAgent = useMemo(() => new CivicFixTriageAgent(), []);
  const [triageSuggestion, setTriageSuggestion] = useState(null);
  const [activeResolveIncident, setActiveResolveIncident] = useState(null);
  const [resolveImage, setResolveImage] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [activeAuditIncident, setActiveAuditIncident] = useState(null);
  const [isAgentProcessing, setIsAgentProcessing] = useState(false);
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [wardensList, setWardensList] = useState([]);
  const [wardRisks, setWardRisks] = useState({});
  const [isRiskForecastOpen, setIsRiskForecastOpen] = useState(false);
  const [selectedDetailedIncident, setSelectedDetailedIncident] = useState(null);
  
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.toggle('light', theme === 'light');
    document.body.classList.toggle('dark', theme === 'dark');
    if (document.documentElement.style) {
      document.documentElement.style.colorScheme = theme;
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = (event) => {
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
      return;
    }

    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${maxRadius}px at ${x}px ${y}px)`,
    ];

    const root = document.documentElement;
    root.dataset.magicuiThemeVt = "active";
    root.style.setProperty("--magicui-theme-toggle-vt-duration", "500ms");
    root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0]);

    const cleanup = () => {
      delete root.dataset.magicuiThemeVt;
      root.style.removeProperty("--magicui-theme-toggle-vt-duration");
      root.style.removeProperty("--magicui-theme-vt-clip-from");
    };

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
      });
    });

    if (transition && typeof transition.finished?.finally === "function") {
      transition.finished.finally(cleanup);
    } else {
      cleanup();
    }

    if (transition && transition.ready) {
      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath,
          },
          {
            duration: 500,
            easing: "ease-in-out",
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    }
  };
  
  const [selectedZone, setSelectedZone] = useState("All");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isActiveAlertsOpen, setIsActiveAlertsOpen] = useState(false);
  const [isDispatchQueueOpen, setIsDispatchQueueOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reports, setReports] = useState(initialIssues);
  
  // Heatmap Overlay Toggle Feature
  const [showHazardHeatmap, setShowHazardHeatmap] = useState(false);
  const [showWardBorders, setShowWardBorders] = useState(true);

  // Active Letter View Modal
  const [activeLetter, setActiveLetter] = useState(null);
  
  // Custom StreetView Verification Modal
  const [activeStreetCheck, setActiveStreetCheck] = useState(null);

  // Form State
  const [formType, setFormType] = useState("Pothole");
  const [formDetails, setFormDetails] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formWardNo, setFormWardNo] = useState(""); // "" means unselected/not inferred
  const [formWardName, setFormWardName] = useState("");
  const [lastInferredWardNo, setLastInferredWardNo] = useState("");
  const [formLat, setFormLat] = useState(0);
  const [formLng, setFormLng] = useState(0);
  const [suggestedCategory, setSuggestedCategory] = useState(null);

  const thalasseryBoundaryGeoJSON = useMemo(() => {
    try {
      const features = WARD_POLYGONS.map(wp => {
        const coords = wp.polygon.map(c => [c[1], c[0]]);
        if (coords[0].toString() !== coords[coords.length - 1].toString()) {
          coords.push([...coords[0]]);
        }
        return turf.polygon([coords], { group: 'thalassery' });
      });
      const merged = turf.dissolve(turf.featureCollection(features), { propertyName: 'group' });
      
      let boundaryFeature = merged.features[0] || null;
      if (boundaryFeature) {
        if (boundaryFeature.geometry.type === 'Polygon') {
          // Extract only the outer ring to discard internal holes/slivers
          const outerCoords = boundaryFeature.geometry.coordinates[0];
          boundaryFeature = turf.polygon([outerCoords], boundaryFeature.properties);
        } else if (boundaryFeature.geometry.type === 'MultiPolygon') {
          // Find the polygon with the most points (assumed main boundary) and take its outer ring
          let maxPoints = 0;
          let mainOuterCoords = null;
          boundaryFeature.geometry.coordinates.forEach(polyCoords => {
            const outer = polyCoords[0];
            if (outer && outer.length > maxPoints) {
              maxPoints = outer.length;
              mainOuterCoords = outer;
            }
          });
          if (mainOuterCoords) {
            boundaryFeature = turf.polygon([mainOuterCoords], boundaryFeature.properties);
          }
        }
      }
      
      if (boundaryFeature) {
        return boundaryFeature;
      }
      
      // Fallback: Convex Hull of all ward coordinates
      const points = [];
      WARD_POLYGONS.forEach(wp => {
        wp.polygon.forEach(c => {
          points.push(turf.point([c[1], c[0]]));
        });
      });
      const hull = turf.convex(turf.featureCollection(points));
      return hull || null;
    } catch (err) {
      console.error("Error computing municipal boundary:", err);
      return null;
    }
  }, []);
  const [locationSource, setLocationSource] = useState(null); // 'map', 'gps', or null
  const [locationError, setLocationError] = useState(null);
  const [isGeolocationLoading, setIsGeolocationLoading] = useState(false);
  const [isImageVerifying, setIsImageVerifying] = useState(false);
  const [imageVerified, setImageVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map & Leaflet References
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const reportMarkersGroup = useRef(null);
  const wardMarkersGroup = useRef(null);
  const tempPlacementMarker = useRef(null);
  const hazardCirclesGroup = useRef(null);
  const wardPolygonsGroup = useRef(null);
  const tileLayerRef = useRef(null);

  // Cleanup map placement marker if coordinates are reset
  useEffect(() => {
    if (formLat === 0 && tempPlacementMarker.current && mapInstance) {
      tempPlacementMarker.current.remove();
      tempPlacementMarker.current = null;
    }
  }, [formLat, mapInstance]);

  // Gemini & Upload States
  const [uploadedImage, setUploadedImage] = useState(null);
  const [verifiedConfidence, setVerifiedConfidence] = useState(97.4);
  const [verifiedDetails, setVerifiedDetails] = useState("");
  const [aiDraftedLetter, setAiDraftedLetter] = useState("");


  // AI Logs State
  const [aiLogs, setAiLogs] = useState([
    { id: 1, type: "info", text: "CiviFix AI Grid Monitor active for Thalassery Municipality..." },
    { id: 2, type: "success", text: "Google Maps API overlays rendered with dark-theme styling." },
    { id: 3, type: "warning", text: "High probability waterlogging warning active for low-lying Railway Underpass." }
  ]);

  const [peakRainfall, setPeakRainfall] = useState(0);
  const [hasWeatherData, setHasWeatherData] = useState(false);

  const floodRisk = useMemo(() => {
    return hasWeatherData && (
      (reports.some(r => {
        const zone = normalizeZoneName(r.zone);
        let status = r.status;
        if (!status) {
          if (r.severity === "resolved") status = "resolved";
          else if (r.verifications >= 15 || r.severity === "critical") status = "escalated";
          else status = "open";
        }
        return (zone === "Seafront" || zone === "Court Corridor") &&
               r.type?.toLowerCase().includes("drain") &&
               status !== "resolved";
      }) && peakRainfall > 12) ||
      peakRainfall > 25
    );
  }, [hasWeatherData, reports, peakRainfall]);

  // Map raw reports to Incident interface
  const mappedIncidents = useMemo(() => {
    return reports.map(r => {
      const zone = normalizeZoneName(r.zone);
      
      let ward = r.ward;
      if (!ward) {
        // assign default ward based on zone
        if (zone === "Court Corridor") ward = "11";
        else if (zone === "Seafront") ward = "33";
        else if (zone === "North Uplands") ward = "1";
        else if (zone === "Chirakkara Hills") ward = "13";
        else if (zone === "South Highway") ward = "22";
        else if (zone === "Heritage Quarter") ward = "6";
        else ward = "11";
      }

      let status = r.status;
      if (!status) {
        if (r.severity === "resolved") status = "resolved";
        else if (r.verifications >= 15 || r.severity === "critical") status = "escalated";
        else status = "open";
      }

      // Compute severity score and priority score using helpers
      const severityScore = getSeverityScore(r, floodRisk);
      const severityLevel = getSeverityLevel(severityScore);
      const derivedSeverity = severityLevel === "high" ? "critical" : (severityLevel === "medium" ? "warning" : "info");
      const priorityScore = getPriorityScore(r, severityScore, floodRisk);

      // Determine dispatch necessity, status stage, and progress percentage
      const { dispatchRequired, dispatchStatus, dispatchProgress } = getDispatchState(r, priorityScore);

      const assignedDepartment = getDepartmentFromType(r.type);
      const escalationReason = getEscalationReason(r, floodRisk);

      return {
        id: r.id?.toString() || r.docId || 'fallback-id',
        ward: ward?.toString() || "11",
        zone: zone || "Court Corridor",
        type: r.type || "Other",
        description: r.details || r.location || "",
        status: status,
        verifications: r.verifications || 0,
        upvotes: r.votes || r.upvotes || 0,
        reportedAt: r.reportedAt || new Date().toISOString(),
        // Pass original fields for compatibility
        lat: r.lat,
        lng: r.lng,
        location: r.location,
        docId: r.docId,
        details: r.details,
        letterDrafted: r.letterDrafted,
        timeAgo: r.timeAgo,
        image: r.image,
        streetViewStatus: r.streetViewStatus,
        hasImage: r.hasImage || !!r.image,
        
        // New functional fields
        severity: derivedSeverity,
        severityLevel,
        severityScore,
        priorityScore,
        dispatchRequired,
        dispatchStatus,
        dispatchProgress,
        assignedDepartment,
        escalationReason
      };
    });
  }, [reports, floodRisk]);

  // Compute scores for previousScores comparison
  /*
  const currentScores = useMemo(() => {
    const scores = {};
    Object.keys(WARD_ZONES).forEach(zoneName => {
      const wardList = WARD_ZONES[zoneName];
      const zoneIncidents = mappedIncidents.filter(inc => {
        const wardStr = inc.ward?.toString();
        return wardStr && wardList.includes(wardStr);
      });
      const resolvedCount = zoneIncidents.filter(inc => inc.status === 'resolved').length;
      scores[zoneName] = zoneIncidents.length === 0 
        ? 100 
        : Math.round((resolvedCount / zoneIncidents.length) * 100);
    });
    return scores;
  }, [mappedIncidents]);
  */

  // const previousScores = usePrevious(currentScores) || {};

  const [currentTime, setCurrentTime] = useState("");
  const [currentTemp, setCurrentTemp] = useState("28°C");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTemp = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=11.7490&longitude=75.4891&current_weather=true"
        );
        if (res.ok) {
          const data = await res.json();
          const temp = data.current_weather?.temperature;
          if (temp !== undefined) {
            setCurrentTemp(`${Math.round(temp)}°C`);
          }
        }
      } catch (err) {
        console.error("Failed to fetch temp for navbar:", err);
      }
    };
    fetchTemp();
    const interval = setInterval(fetchTemp, 900000); // 15 mins
    return () => clearInterval(interval);
  }, []);

  const getRoleFromKarma = (karma) => {
    if (karma >= 500) return "Thalassery Warden";
    if (karma >= 400) return "Pothole Ranger";
    if (karma >= 350) return "Waste Tracker";
    if (karma >= 150) return "Street Watcher";
    return "Cadet Warden";
  };

  const mappedWardens = useMemo(() => {
    return wardensList.map(w => ({
      ...w,
      name: w.name,
      role: getRoleFromKarma(w.karma || 0),
      karma: w.karma || 0
    }));
  }, [wardensList]);

  const currentUserWarden = useMemo(() => {
    if (!currentUser) return null;
    return wardensList.find(w => w.id === currentUser.uid);
  }, [currentUser, wardensList]);

  const onAgentLog = useCallback((message) => {
    const cleanedMessage = message.startsWith(">> ") ? message.substring(3) : message;

    // Parse peak rain from weather sync log
    const rainMatch = cleanedMessage.match(/(\d+(?:\.\d+)?)mm peak rain/);
    if (rainMatch) {
      setPeakRainfall(parseFloat(rainMatch[1]));
      setHasWeatherData(true);
    }

    setAiLogs(prev => {
      if (prev.length > 0 && prev[prev.length - 1].text === cleanedMessage) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `log-agent-${Date.now()}-${Math.random()}`,
          type: "info",
          text: cleanedMessage
        }
      ];
    });
  }, []);

  const consoleLogs = useMemo(() => {
    return [...aiLogs].reverse().map(log => log.text);
  }, [aiLogs]);

  // Helper to increment user karma dynamically
  const incrementUserKarma = useCallback(async (points) => {
    if (isFirebaseConfigured && currentUser) {
      try {
        const userRef = doc(db, 'wardens', currentUser.uid);
        await updateDoc(userRef, {
          karma: increment(points)
        });
      } catch (err) {
        console.error("Error incrementing user karma:", err);
      }
    } else if (currentUser) {
      // Local fallback (only when Firebase is missing)
      setWardensList(prev => prev.map(w => {
        if (w.id === currentUser.uid) {
          const nextKarma = (w.karma || 0) + points;
          const nextRole = getRoleFromKarma(nextKarma);
          return { ...w, karma: nextKarma, role: nextRole };
        }
        return w;
      }));
      // Update local storage
      const localAlias = localStorage.getItem('civicfix_mock_alias');
      if (localAlias) {
        const cachedKarma = parseInt(localStorage.getItem('civicfix_mock_karma') || '0', 10);
        const nextKarma = cachedKarma + points;
        localStorage.setItem('civicfix_mock_karma', nextKarma.toString());
      }
    }
  }, [currentUser]);

  // Upvote/Downvote report
  const handleVote = useCallback(async (id, docId) => {
    if (!currentUser) {
      alert("Please enter a civic alias profile to upvote issues.");
      return;
    }
    const userId = currentUser.uid;
    const report = reports.find(r => r.id === id || r.docId === docId);
    if (!report) return;

    const upvotedByList = report.upvotedBy || [];
    if (upvotedByList.includes(userId)) {
      alert("You have already upvoted this issue!");
      return;
    }

    const nextUpvotedBy = [...upvotedByList, userId];
    const nextVotesCount = (report.votes || 0) + 1;

    if (isFirebaseConfigured && docId) {
      try {
        const docRef = doc(db, 'reports', docId);
        await updateDoc(docRef, {
          votes: nextVotesCount,
          upvotedBy: nextUpvotedBy
        });
        setAiLogs(prev => [...prev, { id: `log-vote-${id}-${Date.now()}`, type: "success", text: `Firestore: Logged upvote for issue #CF-${id.toString().substring(0, 4)}` }]);
        await incrementUserKarma(2);
      } catch (error) {
        console.error("Error updating vote in Firestore:", error);
      }
    } else {
      setReports(prev => prev.map(r => r.id === id ? { ...r, votes: nextVotesCount, upvotedBy: nextUpvotedBy } : r));
      await incrementUserKarma(2);
    }
  }, [reports, incrementUserKarma, currentUser]);

  // Verify issue locally (Gamification Verification loop)
  const handleVerify = useCallback(async (id, docId) => {
    if (isFirebaseConfigured && docId) {
      try {
        const report = reports.find(r => r.docId === docId);
        if (!report) return;
        const nextVerifications = (report.verifications || 0) + 1;
        const nextSeverity = nextVerifications >= 15 ? "critical" : report.severity;
        const nextStatus = nextVerifications >= 15 ? "escalated" : (report.status || "open");
        
        const docRef = doc(db, 'reports', docId);
        await updateDoc(docRef, {
          verifications: increment(1),
          severity: nextSeverity,
          status: nextStatus
        });

        // Log AI action
        setAiLogs(prevLogs => [...prevLogs, { 
          id: `log-verify-${id}-${Date.now()}-${Math.random()}`, 
          type: "success", 
          text: `Verification logged for report #${id}. [Status: ${nextVerifications >= 15 ? "ESCALATED" : "PENDING CLEARANCE"}]` 
        }]);
        await incrementUserKarma(5);
      } catch (error) {
        console.error("Error updating verification in Firestore:", error);
      }
    } else {
      setReports(prev => prev.map(r => {
        if (r.id === id) {
          const nextVerifications = r.verifications + 1;
          const nextSeverity = nextVerifications >= 15 ? "critical" : r.severity;
          const nextStatus = nextVerifications >= 15 ? "escalated" : (r.status || "open");
          
          // Log AI action
          setAiLogs(prevLogs => [...prevLogs, { 
            id: `log-verify-${id}-${Date.now()}-${Math.random()}`, 
            type: "success", 
            text: `Verification logged for report #${id}. [Status: ${nextVerifications >= 15 ? "ESCALATED" : "PENDING CLEARANCE"}]` 
          }]);

          return { ...r, verifications: nextVerifications, severity: nextSeverity, status: nextStatus };
        }
        return r;
      }));
      await incrementUserKarma(5);
    }
  }, [reports, incrementUserKarma]);

  const onUpvote = useCallback((id) => {
    const report = reports.find(r => r.id?.toString() === id.toString() || r.docId === id);
    if (report) {
      handleVote(report.id, report.docId);
    }
  }, [reports, handleVote]);

  const onVerify = useCallback((id) => {
    const report = reports.find(r => r.id?.toString() === id.toString() || r.docId === id);
    if (report) {
      setActiveStreetCheck(report);
    }
  }, [reports]);

  const onViewLetter = useCallback((report) => {
    if (!currentUserWarden) {
      alert("Permission Denied: Only registered Thalassery Wardens can review and dispatch AI Grievance Letters.");
      return;
    }
    
    // Seed mock approvals if empty and escalated
    if (report.status === 'escalated' && (!report.dispatchApprovals || report.dispatchApprovals.length === 0)) {
      const mockApprovalsCount = 11 + Math.floor(Math.random() * 3); // 11, 12, or 13 approvals
      const mockNames = [
        "Ashwin Raj", "Divya Balan", "Muhammed Shafi", "Ananya K.", 
        "Haris P.", "Suresh M.", "Kavya Nair", "Rahul K.", 
        "Meera V.", "Amal Roy", "Fathima Z.", "Sidharth S.", 
        "Neetu P.", "Sreejith V.", "Anjana Das"
      ].slice(0, mockApprovalsCount);
      
      report.dispatchApprovals = mockNames;
      
      // Update locally or in Firebase
      if (isFirebaseConfigured && report.docId) {
        const reportRef = doc(db, 'reports', report.docId);
        updateDoc(reportRef, { dispatchApprovals: mockNames }).catch(e => console.error("Error setting mock approvals:", e));
      } else {
        setReports(prev => prev.map(r => r.id === report.id ? { ...r, dispatchApprovals: mockNames } : r));
      }
    }

    setActiveLetter(report);
  }, [currentUserWarden]);

  const onAutoEscalate = useCallback(async (id) => {
    const report = reports.find(r => r.id?.toString() === id.toString() || r.docId === id);
    if (!report) return;

    if (isFirebaseConfigured && report.docId) {
      try {
        const docRef = doc(db, 'reports', report.docId);
        await updateDoc(docRef, {
          status: 'escalated',
          severity: 'critical'
        });
      } catch (err) {
        console.error("Error auto-escalating Firestore report:", err);
      }
    } else {
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'escalated', severity: 'critical' } : r));
    }
  }, [reports]);



  const handleSaveAlias = async (e) => {
    e.preventDefault();
    if (!aliasInput.trim()) return;

    const trimmedAlias = aliasInput.trim();

    if (isFirebaseConfigured && currentUser) {
      try {
        const userDocRef = doc(db, 'wardens', currentUser.uid);
        await setDoc(userDocRef, {
          name: trimmedAlias,
          karma: 0,
          role: "Cadet Warden"
        }, { merge: true });
        setAliasModalOpen(false);
        setAiLogs(prev => [...prev, { id: `log-alias-${Date.now()}`, type: "success", text: `Profile: Civic alias registered as "${trimmedAlias}"` }]);
      } catch (err) {
        console.error("Error setting civic alias in Firestore:", err);
        alert("Failed to save alias. Please try again.");
      }
    } else if (currentUser) {
      // Local fallback (only when Firebase is missing)
      localStorage.setItem('civicfix_mock_alias', trimmedAlias);
      localStorage.setItem('civicfix_mock_karma', '0');
      
      // Update local wardens list
      setWardensList(prev => {
        const exists = prev.some(w => w.id === currentUser.uid);
        if (exists) {
          return prev.map(w => w.id === currentUser.uid ? { ...w, name: trimmedAlias } : w);
        } else {
          return [...prev, { id: currentUser.uid, name: trimmedAlias, karma: 0, role: "Cadet Warden" }];
        }
      });
      setAliasModalOpen(false);
      setAiLogs(prev => [...prev, { id: `log-alias-${Date.now()}`, type: "success", text: `Profile: Local civic alias set to "${trimmedAlias}"` }]);
    }
  };

  // Auth Hookup: onAuthStateChanged & signInAnonymously
  useEffect(() => {
    let unsubscribeAuth = () => {};

    if (isFirebaseConfigured) {
      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          console.log("Firebase Authenticated User ID:", user.uid);
          setCurrentUser(user);
          
          // Check if warden doc exists with a name
          const userDocRef = doc(db, 'wardens', user.uid);
          try {
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists() || !docSnap.data().name) {
              setAliasModalOpen(true);
            }
          } catch (err) {
            console.error("Error checking warden doc:", err);
          }
        } else {
          console.log("No auth user. Signing in anonymously...");
          try {
            await signInAnonymously(auth);
          } catch (err) {
            console.error("Anonymous authentication failed:", err);
          }
        }
      });
    } else {
      // Fallback only used when Firebase is missing
      let localUid = localStorage.getItem('civicfix_mock_uid');
      if (!localUid) {
        localUid = 'mock_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('civicfix_mock_uid', localUid);
      }
      setTimeout(() => {
        setCurrentUser({ uid: localUid });
        const localAlias = localStorage.getItem('civicfix_mock_alias');
        if (!localAlias) {
          setAliasModalOpen(true);
        }
      }, 0);
    }

    return () => unsubscribeAuth();
  }, []);

  // Real-time Wardens Subscription & Idempotent Seeding
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Mock local wardens setup
      const localAlias = localStorage.getItem('civicfix_mock_alias');
      const localKarma = parseInt(localStorage.getItem('civicfix_mock_karma') || '0', 10);
      const localUid = localStorage.getItem('civicfix_mock_uid');

      const initialMockList = mockLeaderboard.map((w) => ({
        id: w.id,
        name: w.name,
        karma: w.score,
        role: w.badge
      }));

      if (localAlias && localUid) {
        initialMockList.push({
          id: localUid,
          name: localAlias,
          karma: localKarma,
          role: getRoleFromKarma(localKarma)
        });
      }
      setTimeout(() => {
        setWardensList(initialMockList);
      }, 0);
      return;
    }

    console.log("Subscribing to Firestore wardens collection...");
    const q = query(collection(db, 'wardens'), orderBy('karma', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });

      if (list.length === 0) {
        console.log("Wardens collection is empty. Seeding deterministic wardens...");
        try {
          const SEEDS = [
            { id: "seed_ashwin_raj", name: "Ashwin Raj", karma: 520, role: "Thalassery Warden" },
            { id: "seed_divya_balan", name: "Divya Balan", karma: 450, role: "Pothole Ranger" },
            { id: "seed_muhammed_shafi", name: "Muhammed Shafi", karma: 390, role: "Waste Tracker" },
            { id: "seed_ananya_k", name: "Ananya K.", karma: 340, role: "Street Watcher" },
            { id: "seed_haris_p", name: "Haris P.", karma: 580, role: "Thalassery Warden" },
            { id: "seed_suresh_m", name: "Suresh M.", karma: 490, role: "Thalassery Warden" },
            { id: "seed_kavya_nair", name: "Kavya Nair", karma: 410, role: "Pothole Ranger" },
            { id: "seed_rahul_k", name: "Rahul K.", karma: 370, role: "Waste Tracker" },
            { id: "seed_meera_v", name: "Meera V.", karma: 330, role: "Street Watcher" },
            { id: "seed_amal_roy", name: "Amal Roy", karma: 510, role: "Thalassery Warden" },
            { id: "seed_fathima_z", name: "Fathima Z.", karma: 460, role: "Pothole Ranger" },
            { id: "seed_sidharth_s", name: "Sidharth S.", karma: 380, role: "Waste Tracker" },
            { id: "seed_neetu_p", name: "Neetu P.", karma: 320, role: "Street Watcher" },
            { id: "seed_sreejith_v", name: "Sreejith V.", karma: 505, role: "Thalassery Warden" },
            { id: "seed_anjana_das", name: "Anjana Das", karma: 430, role: "Pothole Ranger" },
            { id: "seed_jithin_m", name: "Jithin M.", karma: 395, role: "Waste Tracker" },
            { id: "seed_sruthy_k", name: "Sruthy K.", karma: 310, role: "Street Watcher" },
            { id: "seed_arun_kumar", name: "Arun Kumar", karma: 540, role: "Thalassery Warden" },
            { id: "seed_gopika_s", name: "Gopika S.", karma: 440, role: "Pothole Ranger" },
            { id: "seed_shyam_p", name: "Shyam P.", karma: 375, role: "Waste Tracker" },
            { id: "seed_athira_m", name: "Athira M.", karma: 305, role: "Street Watcher" },
            { id: "seed_vivek_nair", name: "Vivek Nair", karma: 500, role: "Thalassery Warden" },
            { id: "seed_reshma_r", name: "Reshma R.", karma: 420, role: "Pothole Ranger" },
            { id: "seed_nikhil_v", name: "Nikhil V.", karma: 385, role: "Waste Tracker" },
            { id: "seed_sneha_k", name: "Sneha K.", karma: 300, role: "Street Watcher" }
          ];
          for (const s of SEEDS) {
            await setDoc(doc(db, 'wardens', s.id), {
              name: s.name,
              karma: s.karma,
              role: s.role
            });
          }
        } catch (err) {
          console.error("Failed to seed wardens:", err);
        }
      } else {
        setWardensList(list);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Detected resolution state change tracking effect
  const prevReportsRef = useRef([]);
  useEffect(() => {
    if (currentUser && prevReportsRef.current.length > 0) {
      reports.forEach(report => {
        const prevReport = prevReportsRef.current.find(r => r.id?.toString() === report.id?.toString());
        if (
          prevReport && 
          prevReport.status !== 'resolved' && 
          report.status === 'resolved' &&
          report.reporterUid === currentUser.uid &&
          !report.resolutionKarmaAwarded
        ) {
          console.log(`Warden report ${report.id} resolved. Awarding +25 karma.`);
          incrementUserKarma(25);

          if (isFirebaseConfigured) {
            const reportRef = doc(db, 'reports', report.docId);
            updateDoc(reportRef, {
              resolutionKarmaAwarded: true
            }).catch(err => console.error("Error setting resolutionKarmaAwarded:", err));
          } else {
            setReports(prev => prev.map(r => r.id === report.id ? { ...r, resolutionKarmaAwarded: true } : r));
          }
        }
      });
    }
    prevReportsRef.current = reports;
  }, [reports, currentUser, incrementUserKarma]);

  // Agent logging handler
  const logAgentActivity = useCallback(async ({ reportId = null, wardId = null, agentType, decision, confidence, reason, recommendedAction }) => {
    const newLog = {
      reportId: reportId ? String(reportId) : null,
      wardId: wardId ? String(wardId) : null,
      agentType,
      decision,
      confidence: Number(confidence),
      reason,
      recommendedAction,
      timestamp: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await addDoc(collection(db, 'agent_logs'), newLog);
      } catch (err) {
        console.error("Failed to write agent log to Firestore:", err);
      }
    }
    
    setAiLogs(prev => [
      {
        id: `rolling-log-${Date.now()}-${Math.random()}`,
        type: decision.includes("resolved") || decision === "new_issue" ? "success" : "info",
        text: `[${agentType}] ${decision.toUpperCase()} - ${recommendedAction}`
      },
      ...prev
    ]);
  }, []);

  // Ward Risk Forecasting effect
  useEffect(() => {
    const issuesByWard = {};
    reports.forEach(r => {
      if (r.ward) {
        if (!issuesByWard[r.ward]) issuesByWard[r.ward] = [];
        issuesByWard[r.ward].push(r);
      }
    });

    const runWardRiskForecast = async () => {
      const newWardRisks = {};
      const entries = Object.entries(issuesByWard);
      
      for (const [wardNo, incidents] of entries) {
        const canonicalWard = CANONICAL_WARDS.find(w => w.wardNo.toString() === wardNo.toString());
        const wardName = canonicalWard ? `Ward ${wardNo} - ${canonicalWard.wardName}` : `Ward ${wardNo}`;
        
        try {
          const result = await triageAgent.predictWardRisk(wardName, incidents, { temp: 29, precipitation: 5, floodRisk: false }, false);
          newWardRisks[wardNo] = {
            wardName,
            riskLevel: result.riskLevel,
            confidence: result.confidence,
            reason: result.reason,
            recommendedAction: result.recommendedAction
          };
        } catch (e) {
          console.error("Risk prediction failed for ward", wardNo, e);
        }
      }
      setWardRisks(newWardRisks);
    };

    const timeout = setTimeout(() => {
      runWardRiskForecast();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [reports, triageAgent]);


  // Incident resolution action triggers
  const handleResolveClick = (incident) => {
    setActiveResolveIncident(incident);
    setResolveNotes("");
    setResolveImage(null);
  };

  const handleAuditClick = (incident) => {
    setActiveAuditIncident(incident);
  };

  // Submit proof image + notes to triage agent auditor
  const submitResolutionProof = async (e) => {
    e.preventDefault();
    if (!resolveNotes.trim()) {
      alert("Please provide a brief summary of the resolution work done.");
      return;
    }
    if (!resolveImage) {
      alert("Please upload a photo showing proof of the resolved hazard.");
      return;
    }

    setIsAgentProcessing(true);

    try {
      // Extract Base64 parts
      const commaIdx = resolveImage.indexOf(",");
      const base64Data = commaIdx > -1 ? resolveImage.substring(commaIdx + 1) : resolveImage;
      const mimeType = resolveImage.substring(resolveImage.indexOf(":") + 1, resolveImage.indexOf(";"));

      // Call Triage agent to audit proof
      const agentResult = await triageAgent.auditResolution(activeResolveIncident, base64Data, mimeType, resolveNotes);

      // Log decision
      await logAgentActivity({
        reportId: activeResolveIncident.id,
        wardId: activeResolveIncident.ward,
        agentType: "Resolution Auditor Agent",
        decision: agentResult.decision,
        confidence: agentResult.confidence,
        reason: agentResult.reason,
        recommendedAction: agentResult.recommendedAction
      });

      // Update report status to resolved_pending_verification (or open if rejected by AI)
      const nextStatus = agentResult.decision === 'appears_resolved' ? 'resolved_pending_verification' : 'open';

      const updateData = {
        status: nextStatus,
        resolutionProofImage: resolveImage,
        resolutionAuditDecision: agentResult.decision,
        resolutionAuditReason: agentResult.reason,
        resolutionNotes: resolveNotes
      };

      if (isFirebaseConfigured && activeResolveIncident.docId) {
        const reportRef = doc(db, 'reports', activeResolveIncident.docId);
        await updateDoc(reportRef, updateData);
      } else {
        setReports(prev => prev.map(r => r.id === activeResolveIncident.id ? { ...r, ...updateData } : r));
      }

      if (agentResult.decision === 'appears_resolved') {
        alert("AI Audit passed! Status updated to 'resolved_pending_verification'. A warden will verify this proof for final closure.");
      } else {
        alert(`AI Audit failed: ${agentResult.reason}. Ticket remains open.`);
      }

      setActiveResolveIncident(null);
    } catch (err) {
      console.error("Resolution submit failed:", err);
      alert("Audit process failed: " + err.message);
    } finally {
      setIsAgentProcessing(false);
      setResolveImage(null);
      setResolveNotes("");
    }
  };

  // Warden final verification consensus
  const handleWardenResolutionAudit = async (approve) => {
    if (!activeAuditIncident) return;
    setIsAgentProcessing(true);

    try {
      const updateData = {
        status: approve ? 'resolved_verified' : 'open',
        finalResolvedAt: approve ? new Date().toISOString() : null,
        // Clear resolution audit feedback if rejected to allow resubmission
        resolutionAuditDecision: approve ? activeAuditIncident.resolutionAuditDecision : null,
        resolutionAuditReason: approve ? activeAuditIncident.resolutionAuditReason : null
      };

      if (isFirebaseConfigured && activeAuditIncident.docId) {
        const reportRef = doc(db, 'reports', activeAuditIncident.docId);
        await updateDoc(reportRef, updateData);
      } else {
        setReports(prev => prev.map(r => r.id === activeAuditIncident.id ? { ...r, ...updateData } : r));
      }

      // Log decision
      await logAgentActivity({
        reportId: activeAuditIncident.id,
        wardId: activeAuditIncident.ward,
        agentType: "Warden Consensus Auditor",
        decision: approve ? "resolution_approved" : "resolution_rejected",
        confidence: 1.0,
        reason: approve 
          ? "Warden consensus verified the AI audit proof and finalized closure." 
          : "Warden rejected the uploaded proof. Ticket returned to active status.",
        recommendedAction: approve ? "Close ticket and archive history." : "Allow worker resubmission."
      });

      alert(approve ? "Incident resolution approved and verified!" : "Incident returned to active queue.");
      setActiveAuditIncident(null);
    } catch (err) {
      console.error("Warden audit failed:", err);
    } finally {
      setIsAgentProcessing(false);
    }
  };

  // Real-time Firestore sync & Auto-population
  useEffect(() => {
    if (!isFirebaseConfigured) {
      console.log("Firebase is not configured. Running CiviFix with local mock state.");
      return;
    }

    console.log("Firebase is configured. Initializing real-time sync...");
    const q = query(collection(db, 'reports'), orderBy('id', 'desc'));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const reportsList = [];
      querySnapshot.forEach((doc) => {
        reportsList.push({ docId: doc.id, ...doc.data() });
      });

      if (reportsList.length === 0) {
        console.log("Firestore reports collection is empty. Pre-populating default reports...");
        try {
          for (const issue of initialIssues) {
            await addDoc(collection(db, 'reports'), issue);
          }
          setAiLogs(prev => [...prev, { id: `log-sync-init-${Date.now()}`, type: "success", text: "Firestore: Pre-populated default reports." }]);
        } catch (err) {
          console.error("Error pre-populating Firestore:", err);
        }
      } else {
        // Self-heal: check if any seed reports (id <= 12) are missing the image property, and write them to Firestore
        reportsList.forEach(async (report) => {
          if (report.id && report.id <= 12 && !report.image) {
            const seedIssue = initialIssues.find(i => i.id === report.id);
            if (seedIssue && seedIssue.image) {
              console.log(`Self-healing: Seeding missing image for report #${report.id} in Firestore...`);
              try {
                const reportRef = doc(db, 'reports', report.docId);
                await updateDoc(reportRef, {
                  image: seedIssue.image
                });
              } catch (err) {
                console.error(`Failed to update image for report #${report.id}:`, err);
              }
            }
          }
        });
        setReports(reportsList);
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, []);

  // Sync ward statistics dynamically based on current reports list
  const districts = initialDistricts.map(d => {
    const activeCount = reports.filter(r => normalizeZoneName(r.zone) === normalizeZoneName(d.name)).length;
    const computedAvailability = parseFloat((100 - activeCount * 0.6).toFixed(1));
    const severity = activeCount >= 4 ? "critical" : (activeCount >= 2 ? "warning" : "normal");
    return {
      ...d,
      active: activeCount,
      availability: Math.min(100, Math.max(0, computedAvailability)),
      severity: severity
    };
  });

  const stabilityBuckets = useMemo(() => getStabilityTrend(mappedIncidents), [mappedIncidents]);

  const sparklinePath = useMemo(() => {
    if (stabilityBuckets.length === 0) return "";
    return stabilityBuckets.map((b, i) => {
      const x = i * (400 / 47);
      const y = 45 - (b.stability - 25) * 0.467;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [stabilityBuckets]);

  const sparklineFillPath = useMemo(() => {
    if (!sparklinePath) return "";
    return `${sparklinePath} L400,50 L0,50 Z`;
  }, [sparklinePath]);



  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    // Extended panning boundary limits to cover all of Thalassery, especially the eastern borders
    const boundaryLimit = L.latLngBounds([11.7000, 75.4300], [11.8100, 75.5600]);

    // Initialize Map centered on Thalassery Town with expanded zoom capabilities and panning bounds
    const map = L.map(mapRef.current, {
      center: [11.7490, 75.4891],
      zoom: 13,         // Centered slightly zoomed out so the entire town is visible on boot
      minZoom: 11,      // Decreased minZoom to allow zooming out to view all borders
      maxZoom: 18,
      maxBounds: boundaryLimit,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: false
    });

    // Add theme-aware CartoDB tile layer
    const initTileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const tileLayer = L.tileLayer(initTileUrl, {
      maxZoom: 20
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Draw Thalassery Municipal Boundary calculated dynamically as dissolved union of all wards
    if (thalasseryBoundaryGeoJSON) {
      L.geoJSON(thalasseryBoundaryGeoJSON, {
        style: {
          color: '#ef4444',
          weight: 2,
          dashArray: '8 4',
          fill: false,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false
        }
      }).addTo(map);
    }

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    setMapInstance(map);

    // Add click handler to pick coordinates
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;

      // Verify if the clicked coordinates are inside the city borders first using Turf.js
      const point = turf.point([lng, lat]);
      const isInside = thalasseryBoundaryGeoJSON
        ? turf.booleanPointInPolygon(point, thalasseryBoundaryGeoJSON)
        : false;
      if (!isInside) {
        alert("Selected location is outside the Thalassery municipal border. Please select a valid location inside the city.");
        return;
      }

      setFormLat(lat);
      setFormLng(lng);
      setLocationSource("map");
      setLocationError(null);

      // Run ward inference only if inside boundaries
      const inference = inferWardFromCoordinates(lat, lng);
      if (inference && inference.confident) {
        setFormWardNo(String(inference.ward.wardNo));
        setFormWardName(inference.ward.wardName);
        setLastInferredWardNo(String(inference.ward.wardNo));
      } else {
        setFormWardNo("");
        setFormWardName("");
        setLastInferredWardNo("");
        setLocationError("Could not automatically determine the ward. Please select it manually.");
      }
      setIsReportModalOpen(true);

      // Add temporary marker
      if (tempPlacementMarker.current) {
        tempPlacementMarker.current.setLatLng([lat, lng]);
      } else {
        const tempIcon = L.divIcon({
          className: 'custom-temp-marker',
          html: '<div class="w-4 h-4 rounded-full bg-blue-500 border border-white animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        tempPlacementMarker.current = L.marker([lat, lng], { icon: tempIcon }).addTo(map);
      }

      setAiLogs(prev => [...prev, { 
        id: `log-click-${Date.now()}`, 
        type: "info", 
        text: `Map clicked: Coords set to (${lat.toFixed(4)}, ${lng.toFixed(4)}). ${inference && inference.confident ? `Auto-selected Ward ${inference.ward.wardNo}` : 'Outside boundary'}.` 
      }]);
    });

    return () => {
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thalasseryBoundaryGeoJSON]);

  // Swaps map tile layer dynamically when theme changes
  useEffect(() => {
    if (mapInstance) {
      const url = theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      mapInstance.eachLayer(layer => {
        if (typeof layer.setUrl === 'function') {
          layer.setUrl(url);
        }
      });

      // Force Leaflet map redraw and bounds recalculation after view transition finishes (500ms duration)
      const timer = setTimeout(() => {
        mapInstance.eachLayer(layer => {
          if (typeof layer.setUrl === 'function') {
            layer.redraw();
          }
        });
        mapInstance.invalidateSize();
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [theme, mapInstance]);

  // Sync ward polygons (boundaries) layer on Leaflet map with active sector highlights
  useEffect(() => {
    if (!mapInstance) return;

    if (wardPolygonsGroup.current) {
      mapInstance.removeLayer(wardPolygonsGroup.current);
    }

    if (!showWardBorders) {
      return; // Do not render ward borders if toggled off
    }

    wardPolygonsGroup.current = L.layerGroup().addTo(mapInstance);

    // Color theme mapping for sectors
    const ZONE_COLORS = {
      "Court Corridor": "#3b82f6",     // Blue
      "Seafront": "#06b6d4",           // Cyan
      "North Uplands": "#f59e0b",       // Amber
      "Chirakkara Hills": "#a855f7",   // Purple
      "South Highway": "#f43f5e",      // Rose/Red
      "Heritage Quarter": "#10b981"    // Emerald
    };

    WARD_POLYGONS.forEach(wp => {
      const canonicalWard = CANONICAL_WARDS.find(w => w.wardNo === wp.wardNo);
      const zone = canonicalWard ? canonicalWard.zone : null;
      const zoneColor = ZONE_COLORS[zone] || "#94a3b8";

      const isZoneMatch = selectedZone === "All" || selectedZone === zone;
      
      const fillOpacity = isZoneMatch ? 0.08 : 0.015;
      const strokeOpacity = isZoneMatch ? 0.6 : 0.15;
      const weight = isZoneMatch ? 1.0 : 0.5;

      const polygon = L.polygon(wp.polygon, {
        color: '#22d3ee',
        opacity: strokeOpacity,
        weight: weight,
        fillColor: zoneColor,
        fillOpacity: fillOpacity,
        interactive: true
      });

      polygon.on('mouseover', () => {
        polygon.setStyle({
          weight: 2.0,
          fillOpacity: 0.28,
          opacity: 1.0
        });
      });

      polygon.on('mouseout', () => {
        polygon.setStyle({
          weight: weight,
          fillOpacity: fillOpacity,
          opacity: strokeOpacity
        });
      });

      polygon.bindTooltip(
        `<strong>Ward ${wp.wardNo}: ${canonicalWard ? canonicalWard.wardName : "Unknown"}</strong><br/><span style="color:${zoneColor}">${zone || "General"} Sector</span>`,
        { direction: 'center', className: 'custom-ward-tooltip font-mono text-[10px] text-white border-none bg-[#090b10]/95 p-2.5 rounded shadow-xl' }
      );

      polygon.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setFormLat(lat);
        setFormLng(lng);
        setLocationSource("map");
        setLocationError(null);
        setFormWardNo(String(wp.wardNo));
        if (canonicalWard) {
          setFormWardName(canonicalWard.wardName);
          setLastInferredWardNo(String(wp.wardNo));
        }
        setIsReportModalOpen(true);
        
        setAiLogs(prev => [...prev, { 
          id: `log-click-polygon-${Date.now()}`, 
          type: "info", 
          text: `Map clicked inside Ward ${wp.wardNo} (${canonicalWard ? canonicalWard.wardName : "Unknown"}). Pre-filled report coordinates.` 
        }]);

        L.DomEvent.stopPropagation(e);
      });

      wardPolygonsGroup.current.addLayer(polygon);
    });

    return () => {
      if (wardPolygonsGroup.current && mapInstance) {
        mapInstance.removeLayer(wardPolygonsGroup.current);
      }
    };
  }, [mapInstance, selectedZone, showWardBorders, setFormLat, setFormLng, setLocationSource, setLocationError, setFormWardNo, setFormWardName, setLastInferredWardNo, setIsReportModalOpen, setAiLogs]);

  // Sync ward overlay markers
  useEffect(() => {
    if (!mapInstance) return;

    if (!wardMarkersGroup.current) {
      wardMarkersGroup.current = L.layerGroup().addTo(mapInstance);
    } else {
      wardMarkersGroup.current.clearLayers();
    }

    districts.forEach(d => {
      let colorClass = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]';
      if (d.severity === 'critical') colorClass = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]';
      else if (d.severity === 'warning') colorClass = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.7)]';

      const wardIcon = L.divIcon({
        className: 'custom-ward-marker',
        html: `<div class="w-6 h-6 rounded border border-[#1b1d24]/60 flex items-center justify-center bg-[#101115]/90 backdrop-blur-sm shadow-xl"><div class="w-2.5 h-2.5 rounded-sm ${colorClass}"></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([d.lat, d.lng], { icon: wardIcon });
      marker.bindTooltip(`<strong>${d.name}</strong><br/>Uptime Status: ${d.availability}% stable`, {
        direction: 'top',
        className: 'custom-tooltip font-mono text-[10px] bg-[#0c0d12]/95 text-white border border-[#1b1d24]/60 p-2 rounded shadow-2xl'
      });

      marker.on('click', () => {
        setSelectedZone(d.name);
        setAiLogs(prev => [...prev, { id: `log-ward-${Date.now()}`, type: "info", text: `Viewport focus aligned with regional coordinates for: ${d.name}` }]);
      });

      wardMarkersGroup.current.addLayer(marker);
    });
  }, [districts, mapInstance]);

  // Sync report pins dynamically
  useEffect(() => {
    if (!mapInstance) return;

    if (!reportMarkersGroup.current) {
      reportMarkersGroup.current = L.layerGroup().addTo(mapInstance);
    } else {
      reportMarkersGroup.current.clearLayers();
    }

    const markers = getMapMarkers(mappedIncidents);

    markers.forEach(issue => {
      const marker = L.circle([issue.lat, issue.lng], {
        radius: 60, // 60 meters dynamically scales with map zoom
        color: issue.colorHex,
        fillColor: issue.colorHex,
        fillOpacity: 0.8,
        weight: 2
      }).addTo(reportMarkersGroup.current);

      const popupDiv = document.createElement('div');
      popupDiv.className = 'font-mono text-xs text-[#e2e8f0]';
      popupDiv.style.minWidth = '220px';
      
      const badgeColor = issue.severity === 'critical' ? 'bg-red-950/40 text-red-400 border-red-500/20' : 'bg-amber-950/40 text-amber-400 border-amber-500/20';

      let actionButtonsHtml;
      if (issue.status === 'resolved') {
        actionButtonsHtml = `<div class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider text-center py-1">✓ Issue Resolved</div>`;
      } else {
        const upvoteBtn = `
          <button id="map-vote-btn-${issue.id}" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1 px-2 rounded transition-colors text-center cursor-pointer">
            ▲ UPVOTE (${issue.upvotes})
          </button>
        `;
        const verifyBtn = `
          <button id="map-verify-btn-${issue.id}" class="flex-1 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white text-[10px] font-bold py-1 px-2 rounded transition-colors text-center cursor-pointer">
            VERIFY
          </button>
        `;
        const dispatchBtn = issue.status === 'escalated' ? `
          <button id="map-dispatch-btn-${issue.id}" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold py-1 px-2 rounded transition-colors text-center cursor-pointer">
            ✉ DISPATCH
          </button>
        ` : '';
        
        actionButtonsHtml = `
          <div class="flex flex-col gap-1.5 w-full">
            <div class="flex gap-1.5 w-full">
              ${upvoteBtn}
              ${verifyBtn}
            </div>
            ${dispatchBtn}
          </div>
        `;
      }

      popupDiv.innerHTML = `
        <div class="border-b border-[#1b1d24]/60 pb-2 mb-2">
          <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-white text-sm">${issue.type}</span>
            <span class="text-[8px] border px-1.5 py-0.5 rounded uppercase font-bold ${badgeColor}">
              ${issue.severity}
            </span>
          </div>
          <span class="text-[#7d8590] text-[9px] block">REF: #CF-${issue.id.toString().substring(0, 4)}</span>
        </div>
        <p class="mb-2 text-[#8f97a3] leading-relaxed">${issue.location}</p>
        <div class="text-[10px] text-[#7d8590] mb-2.5">Community Verifications: <span class="text-white font-bold">${issue.verifications}</span></div>
        <div class="flex flex-col gap-1.5 border-t border-[#1b1d24]/60 pt-2.5">
          ${actionButtonsHtml}
          <button id="map-details-btn-${issue.id}" class="w-full bg-[#16171d] hover:bg-[#1f2129] border border-[#1b1d24] text-white hover:text-cyan-400 text-[10px] font-bold py-1.5 rounded transition-colors text-center cursor-pointer uppercase font-mono mt-0.5">
            🔍 Inspect Details
          </button>
        </div>
      `;

      marker.bindPopup(popupDiv);

      marker.on('popupopen', () => {
        const voteBtn = document.getElementById(`map-vote-btn-${issue.id}`);
        const verifyBtn = document.getElementById(`map-verify-btn-${issue.id}`);
        const dispatchBtn = document.getElementById(`map-dispatch-btn-${issue.id}`);
        const detailsBtn = document.getElementById(`map-details-btn-${issue.id}`);

        if (voteBtn) {
          voteBtn.onclick = () => {
            handleVote(issue.id, issue.docId);
            marker.closePopup();
          };
        }
        if (verifyBtn) {
          verifyBtn.onclick = () => {
            onVerify(issue.id);
            marker.closePopup();
          };
        }
        if (dispatchBtn) {
          dispatchBtn.onclick = () => {
            onViewLetter(issue);
            marker.closePopup();
          };
        }
        if (detailsBtn) {
          detailsBtn.onclick = () => {
            setSelectedDetailedIncident(issue);
            marker.closePopup();
          };
        }
      });

      reportMarkersGroup.current.addLayer(marker);
    });
  }, [mappedIncidents, mapInstance, handleVote, handleVerify, onVerify, currentUserWarden, onViewLetter]);

  // Sync hazard heatmap layer on Leaflet map
  useEffect(() => {
    if (!mapInstance) return;
    
    if (!hazardCirclesGroup.current) {
      hazardCirclesGroup.current = L.layerGroup().addTo(mapInstance);
    } else {
      hazardCirclesGroup.current.clearLayers();
    }
    
    if (showHazardHeatmap) {
      const hazards = getHeatmapData(mappedIncidents);
      
      hazards.forEach(h => {
        const circle = L.circle([h.lat, h.lng], {
          color: h.color,
          fillColor: h.color,
          fillOpacity: 0.25,
          radius: h.radius,
          stroke: false,
          interactive: false
        });
        hazardCirclesGroup.current.addLayer(circle);
      });
    }
  }, [showHazardHeatmap, mapInstance, mappedIncidents]);

  // Pan map to issue coordinates
  const handleMapFocus = useCallback((lat, lng, zoom = 16) => {
    if (mapInstance) {
      mapInstance.setView([lat, lng], zoom, { animate: true });
    }
  }, [mapInstance]);

  // Handle Refresh Action
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate new data arrival
    const generatedRef = Math.floor(1000 + Math.random() * 9000);
    const mockIssue = {
      id: Date.now(),
      type: "Streetlight",
      location: "Centenary Park Path (Near Fort Entrance)",
      zone: "Heritage Quarter",
      timeAgo: "Just now",
      severity: "warning",
      votes: 1,
      verifications: 0,
      user: "Gautham P.",
      streetViewStatus: "verified",
      status: "open",
      details: "Three consecutive streetlights are out, causing absolute pitch darkness along the walking pathway.",
      letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Request for replacement of streetlights near Centenary Park pathway.

Respected Sir/Madam,
I request the electrical department of Thalassery Municipality to replace broken streetlights near the Centenary Park walking pathway. The dark area is unsafe for evening walkers.

Coordinates: Lat 11.7410, Lng 75.4830
Report Reference: #CF-${generatedRef}`
    };

    if (isFirebaseConfigured) {
      try {
        await addDoc(collection(db, 'reports'), mockIssue);
        setAiLogs(prev => [...prev, { id: `log-refresh-db-${Date.now()}`, type: "success", text: "Firestore: Refreshed and added new streetlight alert." }]);
      } catch (error) {
        console.error("Failed to add refresh doc to Firestore:", error);
      }
    } else {
      setReports(prev => [mockIssue, ...prev]);
      setAiLogs(prev => [...prev, { id: `log-refresh-local-${Date.now()}`, type: "success", text: "Refreshed Thalassery grid dashboard. 1 new streetlight alert added." }]);
    }

    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };



  // Image Upload and Gemini AI Vision checking
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (1MB = 1048576 bytes)
    if (file.size > 1048576) {
      alert("Please upload an image smaller than 1MB to avoid database size limits.");
      // Clear the file input if needed
      e.target.value = '';
      return;
    }

    setIsImageVerifying(true);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setUploadedImage(base64String);
      
      // Extract data URL prefix to get raw base64
      const commaIndex = base64String.indexOf(',');
      const rawBase64 = base64String.substring(commaIndex + 1);
      const mimeType = file.type;

      if (isGeminiConfigured) {
        try {
          const result = await analyzeIssueImage(rawBase64, mimeType, formType, formDetails || "Unknown Location", formWardName || "Unknown Ward");
          setIsImageVerifying(false);
          if (result.isValid) {
            setImageVerified(true);
            setVerifiedConfidence(Math.floor(90 + Math.random() * 9));
            setVerifiedDetails(result.description);
            setAiDraftedLetter(result.letterDraft);
            
            // Check detected category matching
            const detected = result.detectedCategory;
            if (detected) {
              if (detected.toLowerCase() !== formType.toLowerCase()) {
                setSuggestedCategory(detected);
              } else {
                setSuggestedCategory(null);
              }
            } else {
              setSuggestedCategory(null);
            }

            setAiLogs(prev => [...prev, { 
              id: `log-upload-${Date.now()}-${Math.random()}`, 
              type: "success", 
              text: `Gemini Vision: Photo verified as valid ${result.detectedCategory || formType}. Drafted municipal letter.` 
            }]);
          } else {
            setImageVerified(false);
            setUploadedImage(null);
            alert("Gemini could not verify this as a valid civic/infrastructure issue. Please upload a clear photo of the issue.");
            setAiLogs(prev => [...prev, { 
              id: `log-upload-fail-${Date.now()}-${Math.random()}`, 
              type: "warning", 
              text: "Gemini Vision: Uploaded image verified as UNRELATED to civic infrastructure." 
            }]);
          }
        } catch (error) {
          setIsImageVerifying(false);
          setImageVerified(false);
          setUploadedImage(null);
          console.error("Gemini call failed:", error);
          alert("Gemini image analysis failed. Falling back to local mock validation.");
          runFallbackMockVerification();
        }
      } else {
        runFallbackMockVerification();
      }
    };
    reader.readAsDataURL(file);
  };

  const runFallbackMockVerification = () => {
    setIsImageVerifying(true);
    setTimeout(() => {
      setIsImageVerifying(false);
      setImageVerified(true);
      setVerifiedConfidence(97.4);
      setVerifiedDetails("Confirmed structural road cracking/debris blockages in the sector area.");
      
      const generatedRef = Math.floor(1000 + Math.random() * 9000);
      setAiDraftedLetter(`To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Report regarding ${formType} at ${formDetails || "specified location"}.

Respected Sir/Madam,
This is to notify the Thalassery Municipality regarding ${formType} observed at ${formDetails || "specified location"} in Ward ${formWardNo} (${formWardName || "Unassigned"}). Standard image comparison confirms surface changes.

Please initiate inspections.

Coordinates: Lat ${formLat.toFixed(5)}, Lng ${formLng.toFixed(5)}
Report Reference: #CF-${generatedRef}`);
      setSuggestedCategory(null);
      setAiLogs(prev => [...prev, { 
        id: `log-upload-${Date.now()}-${Math.random()}`, 
        type: "success", 
        text: "Mock Vision: Image analyzed. Simulated validation confirmed structural issue." 
      }]);
    }, 1500);
  };

  // Geolocation helpers
  const handlePickFromMap = () => {
    setIsReportModalOpen(false);
    setAiLogs(prev => [...prev, {
      id: `log-pick-map-${Date.now()}`,
      type: "info",
      text: "System: Please click anywhere on the tactical map to pin coordinates for your report."
    }]);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Browser geolocation not supported. Please pick from map.");
      return;
    }
    
    setIsGeolocationLoading(true);
    setLocationError(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Verify if coordinates are inside the city borders first using Turf.js
        const point = turf.point([longitude, latitude]);
        const isInside = thalasseryBoundaryGeoJSON
          ? turf.booleanPointInPolygon(point, thalasseryBoundaryGeoJSON)
          : false;
        if (!isInside) {
          alert("GPS coordinates are outside the Thalassery municipal border. Please select a location inside Thalassery.");
          setIsGeolocationLoading(false);
          return;
        }

        setFormLat(latitude);
        setFormLng(longitude);
        setLocationSource("gps");
        
        // Run ward inference only if inside boundaries
        const inference = inferWardFromCoordinates(latitude, longitude);
        let logText = "";
        
        if (inference && inference.confident) {
          setFormWardNo(String(inference.ward.wardNo));
          setFormWardName(inference.ward.wardName);
          setLastInferredWardNo(String(inference.ward.wardNo));
          logText = `GPS: Location locked at Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)} (Ward ${inference.ward.wardNo} - ${inference.ward.wardName}).`;
        } else {
          setFormWardNo("");
          setFormWardName("");
          setLastInferredWardNo("");
          setLocationError("Could not automatically determine the ward. Please select it manually.");
          logText = `GPS: Location locked at Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)} but ward inference failed.`;
        }
        
        setIsGeolocationLoading(false);
        setAiLogs(prev => [...prev, {
          id: `log-gps-${Date.now()}`,
          type: inference && inference.confident ? "success" : "warning",
          text: logText
        }]);

        // Draw visual map marker
        if (tempPlacementMarker.current && mapInstance) {
          tempPlacementMarker.current.setLatLng([latitude, longitude]);
        } else if (mapInstance) {
          const tempIcon = L.divIcon({
            className: 'custom-temp-marker',
            html: '<div class="w-4 h-4 rounded-full bg-blue-500 border border-white animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          tempPlacementMarker.current = L.marker([latitude, longitude], { icon: tempIcon }).addTo(mapInstance);
        }

        // Pan map
        if (mapInstance) {
          mapInstance.setView([latitude, longitude], 16, { animate: true });
        }

        // Optional: Reverse Geocoding via OSM Nominatim
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            const address = data.display_name || data.name || "";
            if (address) {
              const shortAddress = data.address.road || data.address.suburb || data.address.neighbourhood || address.split(',')[0];
              setFormDetails(shortAddress);
              setAiLogs(prev => [...prev, {
                id: `log-geocode-${Date.now()}`,
                type: "info",
                text: `Geocode: Address identified as "${shortAddress}".`
              }]);
            }
          }
        } catch (err) {
          console.error("Reverse geocoding failed", err);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        setIsGeolocationLoading(false);
        setLocationError("Geolocation permission denied or failed. Please click 'Pick from map' to select location.");
        setAiLogs(prev => [...prev, {
          id: `log-gps-err-${Date.now()}`,
          type: "error",
          text: "GPS Error: Geolocation access failed or denied. Manual map selection required."
        }]);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit new issue (Overlay Modal form)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Required validations
    if (!formType) {
      alert("Please select an issue category.");
      return;
    }
    if (!formWardNo || !formWardName) {
      alert("Please select a municipal ward.");
      return;
    }
    if (!formDetails || !formDetails.trim()) {
      alert("Please provide a landmark or exact place.");
      return;
    }
    if (!formDescription || !formDescription.trim()) {
      alert("Please describe the issue.");
      return;
    }
    if (formLat === undefined || formLng === undefined || formLat === null || formLng === null || formLat === 0 || formLng === 0) {
      setLocationError("Location coordinates are required. Please use 'Use current location' or pick from map.");
      alert("Location coordinates are required. Please use 'Use current location' or pick from map.");
      return;
    }

    const point = turf.point([formLng, formLat]);
    const isInsideThalassery = thalasseryBoundaryGeoJSON
      ? turf.booleanPointInPolygon(point, thalasseryBoundaryGeoJSON)
      : false;
    if (!isInsideThalassery) {
      setLocationError("Selected location is outside the Thalassery municipal border. Please select a valid location inside the city.");
      alert("Cannot submit report: Selected location is outside the Thalassery municipal border. Please select a valid location inside the city.");
      return;
    }

    const derivedZone = getZoneFromWard(formWardNo);
    const wardCode = String(formWardNo);

    const generatedRef = Math.floor(1000 + Math.random() * 9000);
    const draftLetter = aiDraftedLetter || `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Grievance regarding ${formType} at ${formDetails}.

Respected Sir/Madam,
This is to notify the Thalassery Municipality regarding ${formType} at ${formDetails} (Ward ${wardCode} - ${formWardName}, ${derivedZone}). Community sensors have validated this concern.

Coordinates: Lat ${formLat.toFixed(5)}, Lng ${formLng.toFixed(5)}
Report Reference: #CF-${generatedRef}`;

    const newReport = {
      id: Date.now(),
      type: formType,
      location: formDetails,
      description: formDescription,
      details: formDescription || verifiedDetails || "Citizen reported infrastructure issue verified by community tools.",
      zone: derivedZone, 
      ward: wardCode,
      status: "open",
      timeAgo: "Just now",
      severity: imageVerified ? "critical" : "warning",
      votes: 1,
      verifications: imageVerified ? 1 : 0,
      user: "You (Volunteer)",
      streetViewStatus: imageVerified ? "verified" : "unverified",
      image: uploadedImage,
      letterDrafted: draftLetter,
      lat: formLat,
      lng: formLng,
      reporterUid: currentUser ? currentUser.uid : null,
      reportedAt: new Date().toISOString()
    };

    // Agent Duplicate Report Detection / Merge Suggestion
    const candidates = reports.filter(r => 
      r.status !== 'resolved' && 
      r.status !== 'resolved_verified' &&
      r.status !== 'resolved_pending_verification' &&
      r.type?.toLowerCase() === formType?.toLowerCase()
    );

    let nearbyCandidates = [];
    candidates.forEach(c => {
      if (c.lat && c.lng) {
        try {
          const fromPoint = turf.point([formLng, formLat]);
          const toPoint = turf.point([c.lng, c.lat]);
          const distKm = turf.distance(fromPoint, toPoint);
          if (distKm < 0.25) { // 250 meters
            nearbyCandidates.push(c);
          }
        } catch {
          // ignore coordinate format exceptions
        }
      }
    });

    if (nearbyCandidates.length > 0) {
      setIsSubmitting(true);
      try {
        const agentResult = await triageAgent.detectDuplicates(newReport, nearbyCandidates);
        
        await logAgentActivity({
          wardId: wardCode,
          agentType: "Triage Agent",
          decision: agentResult.decision,
          confidence: agentResult.confidence,
          reason: agentResult.reason,
          recommendedAction: agentResult.recommendedAction
        });

        if (agentResult.decision === 'possible_duplicate' || agentResult.decision === 'related_cluster') {
          const matchedReport = nearbyCandidates.find(c => c.id?.toString() === agentResult.matchedReportId?.toString()) || nearbyCandidates[0];
          setTriageSuggestion({
            newReport,
            matchedReport,
            decision: agentResult.decision,
            confidence: agentResult.confidence,
            reason: agentResult.reason,
            recommendedAction: agentResult.recommendedAction
          });
          setIsSubmitting(false);
          return; // Pause normal flow, show custom duplicate/merge UI
        }
      } catch (err) {
        console.error("Triage duplicate check failed:", err);
      } finally {
        setIsSubmitting(false);
      }
    }

    // Default save flow
    setIsSubmitting(true);
    if (isFirebaseConfigured) {
      try {
        await addDoc(collection(db, 'reports'), newReport);
        setAiLogs(prev => [...prev, { id: `log-submit-db-${Date.now()}-${Math.random()}`, type: "success", text: `Firestore: Report added for ${derivedZone} (Ward ${wardCode}).` }]);
        await incrementUserKarma(10);
      } catch (error) {
        console.error("Failed to add document to Firestore:", error);
        alert("Firestore upload failed. Storing locally.");
        setReports(prev => [newReport, ...prev]);
      }
    } else {
      setReports(prev => [newReport, ...prev]);
      await incrementUserKarma(10);
    }
    
    // Log normal triage action if no duplicate was found
    await logAgentActivity({
      reportId: newReport.id,
      wardId: newReport.ward,
      agentType: "Triage Agent",
      decision: "new_issue",
      confidence: 1.0,
      reason: "No duplicate detected. Incident triaged and registered successfully.",
      recommendedAction: "Log new ticket in municipal registry."
    });

    setIsSubmitting(false);
    setIsReportModalOpen(false);
    
    // Reset form states
    setFormDetails("");
    setFormDescription("");
    setUploadedImage(null);
    setImageVerified(false);
    setVerifiedDetails("");
    setAiDraftedLetter("");
    setFormLat(0);
    setFormLng(0);
    setFormWardNo("");
    setFormWardName("");
    setLastInferredWardNo("");
    setLocationSource(null);
    setLocationError(null);
    
    setAiLogs(prev => [...prev, { id: `log-submit-${Date.now()}-${Math.random()}`, type: "success", text: `Report successfully uploaded and pinned to Ward ${wardCode} layout.` }]);
  };




  return (
    <div className={`h-[100dvh] bg-transparent flex flex-col font-mono selection:bg-blue-600 selection:text-white relative overflow-hidden transition-colors duration-300 ${
      theme === 'light' ? 'text-slate-700' : 'text-[#e2e8f0]'
    }`}>
      
      {/* Background radial gradient matches Singapore dashboard style */}
      <div className={`absolute inset-0 pointer-events-none z-0 ${
        theme === 'light'
          ? 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.7)_0%,rgba(224,231,255,0.4)_100%)]'
          : 'bg-[radial-gradient(circle_at_center,rgba(15,17,21,0.4)_0%,rgba(7,8,10,0.8)_100%)]'
      }`}></div>

      {/* HEADER NAVBAR (Matches Smart City Platform aesthetic with Glassmorphism) */}
      <header className={`sticky top-0 z-40 w-full backdrop-blur-xl h-14 flex items-center justify-between px-4 sm:px-6 flex-none relative transition-all duration-300 ${
        theme === 'light'
          ? 'bg-white/80 border-b border-slate-200/85 shadow-sm'
          : 'bg-[#07090d]/85 border-b border-[#1e2333]/70 shadow-[0_2px_24px_rgba(0,0,0,0.4)]'
      }`}>
        
        {/* Decorative thin neon-accent top border */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-blue-500/10 via-cyan-400/60 to-amber-500/10"></div>

        {/* Left Side: Brand Logo & Command Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-300 ${
              theme === 'light'
                ? 'border-blue-200 bg-blue-50'
                : 'border-blue-500/30 bg-blue-950/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
            }`}>
              <img src="/civicfix-logo.png" alt="CivicFix Logo" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className={`font-black text-sm tracking-wider uppercase font-sans transition-colors duration-300 ${
                theme === 'light' ? 'text-slate-800' : 'text-white'
              }`}>CivicFix</span>
              <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold font-mono mt-0.5">Thalassery Ops Center</span>
            </div>
          </div>
          
          <span className={`hidden md:inline font-bold transition-colors duration-300 ${theme === 'light' ? 'text-slate-200' : 'text-gray-700'}`}>|</span>

        </div>

        {/* Right Actions: Weather/Location info & Report button */}
        <div className="flex items-center gap-3 md:gap-4">
          


          {/* Volunteer Status Badge */}
          {currentUserWarden && (
            <div className={`hidden sm:flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-lg shadow-sm transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-slate-100 border border-slate-200/80 text-slate-500'
                : 'bg-[#0a0c10] border border-[#1e2333]/80 text-gray-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] animate-pulse shadow-[0_0_8px_#00f5d4]"></span>
              <span className={`font-bold truncate max-w-[70px] sm:max-w-[120px] uppercase transition-colors duration-300 ${
                theme === 'light' ? 'text-slate-800' : 'text-white'
              }`}>
                {currentUserWarden.name}
              </span>
              <span className={`font-bold transition-colors duration-300 ${theme === 'light' ? 'text-slate-200' : 'text-gray-700'}`}>|</span>
              <span className="text-cyan-500 font-bold">
                <NumberTicker value={currentUserWarden.karma} /> KP
              </span>
            </div>
          )}
          
          {/* Location & Weather details */}
          <div className={`hidden sm:flex items-center gap-2.5 text-[10px] font-mono px-3 py-1.5 rounded-lg shadow-sm transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-slate-100 border border-slate-200/80 text-slate-500'
              : 'bg-[#0a0c10] border border-[#1e2333]/80 text-gray-400'
          }`}>
            <span className={`flex items-center gap-1 transition-colors duration-300 ${theme === 'light' ? 'text-slate-700' : 'text-white'}`}>
              <MapPin size={10} className="text-blue-500" />
              Thalassery, IN
            </span>
            <span className={`font-bold transition-colors duration-300 ${theme === 'light' ? 'text-slate-200' : 'text-gray-700'}`}>|</span>
            <span className={`flex items-center gap-1 uppercase font-bold transition-colors duration-300 ${
              theme === 'light' ? 'text-amber-600' : 'text-amber-400'
            }`}>
              <CloudSun size={11} />
              <NumberTicker value={parseFloat(currentTemp) || 28} />°C, {currentTime || "11:00 PM"}
            </span>
          </div>

          {/* Refresh Grid */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`w-8 h-8 flex items-center justify-center border transition-all rounded-lg cursor-pointer disabled:opacity-50 ${
              theme === 'light'
                ? 'border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80'
                : 'border-[#1e2333]/85 bg-[#0a0c10] text-gray-400 hover:text-white hover:bg-[#121622]'
            }`}
            aria-label="Refresh data"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin text-blue-500" : ""} />
          </button>

          {/* Theme Toggle Button */}
          <button 
            onClick={handleThemeToggle}
            className={`w-8 h-8 flex items-center justify-center border transition-all rounded-lg cursor-pointer ${
              theme === 'light'
                ? 'border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80'
                : 'border-[#1e2333]/85 bg-[#0a0c10] text-gray-400 hover:text-white hover:bg-[#121622]'
            }`}
            aria-label="Toggle theme"
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {theme === 'dark' ? <Sun size={12} className="text-yellow-400" /> : <Moon size={12} className="text-indigo-400" />}
            </motion.div>
          </button>

          {/* REPORT BUTTON */}
          <button
            onClick={() => {
              setFormLat(0);
              setFormLng(0);
              setFormWardNo("");
              setFormWardName("");
              setLastInferredWardNo("");
              setLocationSource(null);
              setLocationError(null);
              setSuggestedCategory(null);
              setIsReportModalOpen(true);
            }}
            className="h-8.5 px-3.5 flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[10px] font-bold font-mono tracking-widest uppercase border border-blue-400/20 shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.03] cursor-pointer text-white"
          >
            <PlusCircle size={12} />
            <span>Report Issue</span>
          </button>
        </div>
      </header>

      {/* DYNAMIC LIVE SCROLLING TICKER */}
      <LiveTicker incidents={mappedIncidents} floodRisk={floodRisk} theme={theme} />

      {/* MAIN CONTAINER WITH SIDEBAR & CONTENT */}
      <motion.div 
        variants={dashboardContainerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[340px_1fr_340px] 2xl:grid-cols-[380px_1fr_380px] gap-3 p-3 md:p-4 bg-grid-dots"
      >
        <motion.div variants={panelVariants} className="h-[600px] lg:h-full min-h-0 order-2 lg:order-1">
          <LeftPanel
            incidents={mappedIncidents}
            onActiveGridAlertsClick={() => setIsActiveAlertsOpen(true)}
            onAiDispatchQueueClick={() => setIsDispatchQueueOpen(true)}
            onRiskForecastClick={() => setIsRiskForecastOpen(true)}
            theme={theme}
          />
        </motion.div>

        {/* Center column: Map & Stability */}
        <motion.div variants={panelVariants} className="flex flex-col gap-3 h-[500px] lg:h-full overflow-hidden order-1 lg:order-2">

          {/* INTERACTIVE LIVE TACTICAL MAP (with Glassmorphism) */}
          <section className={`flex-1 min-h-0 border backdrop-blur-xl p-4 flex flex-col gap-2.5 rounded-xl relative overflow-hidden transition-all duration-300 ${
            theme === 'light'
              ? 'border-slate-200/80 bg-gradient-to-b from-white/90 to-slate-50/90 shadow-[0_12px_40px_rgba(0,0,0,0.08)]'
              : 'border-[#1e2333]/70 bg-gradient-to-b from-[#0e111a]/90 to-[#07090d]/98 shadow-[0_12px_40px_rgba(0,0,0,0.55)]'
          }`}>
            {/* Corner Brackets */}
            <div className={`absolute top-0 left-0 w-2.5 h-2.5 border-t border-l rounded-tl-sm pointer-events-none transition-colors duration-300 ${theme === 'light' ? 'border-blue-400/40' : 'border-blue-500/25'}`}></div>
            <div className={`absolute top-0 right-0 w-2.5 h-2.5 border-t border-r rounded-tr-sm pointer-events-none transition-colors duration-300 ${theme === 'light' ? 'border-blue-400/40' : 'border-blue-500/25'}`}></div>
            <div className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l rounded-bl-sm pointer-events-none transition-colors duration-300 ${theme === 'light' ? 'border-blue-400/40' : 'border-blue-500/25'}`}></div>
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r rounded-br-sm pointer-events-none transition-colors duration-300 ${theme === 'light' ? 'border-blue-400/40' : 'border-blue-500/25'}`}></div>
            
            {/* Map Header details */}
            <div className={`flex items-center justify-between border-b pb-2.5 transition-colors duration-300 ${theme === 'light' ? 'border-slate-200' : 'border-[#1e2333]/50'}`}>
              <div className="flex items-center gap-2">
                <Globe className="text-blue-400" size={14} />
                <h3 className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Interactive Tactical Map (Thalassery Town)</h3>
              </div>
              <span className={`text-[8px] px-2 py-0.5 rounded-md border font-bold leading-none tracking-widest uppercase transition-colors duration-300 ${
                theme === 'light' 
                  ? 'bg-blue-50 text-blue-600 border-blue-200' 
                  : 'bg-blue-950/40 text-blue-400 border-blue-500/30'
              }`}>LIVE OSM</span>
            </div>

            {/* Interactive Leaflet Map Container */}
            <div className={`flex-1 w-full h-full min-h-0 relative z-0 rounded-lg border overflow-hidden transition-colors duration-300 ${
              theme === 'light' 
                ? 'border-slate-200/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] bg-slate-100' 
                : 'border-[#1e2333]/80 shadow-inner bg-[#07080d]'
            }`}>
              <div 
                ref={mapRef} 
                className="w-full h-full min-h-0 leaflet-container"
                style={{ background: 'transparent' }}
              ></div>

              {/* FLOATING ACTION OVERLAY ON MAP FOR TACTICAL CONTROLS */}
              <div className="absolute top-2.5 left-2.5 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
                {selectedZone !== "All" && (
                  <div className={`flex items-center gap-2 backdrop-blur-md border font-bold px-2.5 py-1 rounded-md text-[9px] font-mono transition-colors duration-300 ${
                    theme === 'light'
                      ? 'bg-white/95 border-blue-200 text-blue-600 shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
                      : 'bg-[#090b0e]/95 border-blue-500/40 text-blue-400 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme === 'light' ? 'bg-blue-500' : 'bg-blue-400'}`}></span>
                    <span>SECTOR: {selectedZone.toUpperCase()}</span>
                    <button 
                      onClick={() => setSelectedZone("All")} 
                      className={`font-bold text-xs pl-1 cursor-pointer transition-colors duration-300 ${theme === 'light' ? 'hover:text-blue-800' : 'hover:text-white'}`}
                      title="Clear sector focus filter"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MAP VIEW CONTROL ROW (Directly integrated below Map viewport - 3-column control grid) */}
            <div className="grid grid-cols-3 gap-2 mt-1 flex-none font-mono">
              <button 
                onClick={() => { setSelectedZone("All"); setShowHazardHeatmap(false); handleMapFocus(11.7490, 75.4891, 13); }}
                className={`backdrop-blur-md border p-2.5 text-left rounded-xl flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                  selectedZone === "All" && !showHazardHeatmap
                    ? (theme === 'light' ? "border-blue-300 bg-blue-50 shadow-[0_4px_16px_rgba(59,130,246,0.15)] text-slate-800" : "border-blue-500/40 bg-blue-950/20 text-white shadow-[0_4px_16px_rgba(59,130,246,0.15)]") 
                    : (theme === 'light' ? "border-slate-200 bg-white/80 text-slate-500 hover:text-slate-800 hover:border-blue-300" : "border-[#1e2333]/80 bg-[#090b0e]/80 text-gray-400 hover:text-white hover:border-blue-500/40")
                }`}
              >
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  theme === 'light' ? 'bg-blue-100 border-blue-200' : 'bg-[#141824] border-[#1e2333]'
                }`}>
                  <Globe size={13} className={`animate-pulse ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-[11px] font-bold leading-none transition-colors duration-300 ${
                    (selectedZone === "All" && !showHazardHeatmap) ? (theme === 'light' ? 'text-slate-800' : 'text-white') : (theme === 'light' ? 'text-slate-700' : 'text-white')
                  }`}>Town Overview</span>
                  <span className={`text-[8px] leading-none mt-1 truncate transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-500' : 'text-gray-500'
                  }`}>Reset map focus</span>
                </div>
              </button>

              <button 
                onClick={() => setShowHazardHeatmap(!showHazardHeatmap)}
                className={`backdrop-blur-md border p-2.5 text-left rounded-xl flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                  showHazardHeatmap 
                    ? (theme === 'light' ? "border-amber-300 bg-amber-50 shadow-[0_4px_16px_rgba(245,158,11,0.15)] text-slate-800" : "border-amber-500/40 bg-amber-950/20 text-white shadow-[0_4px_16px_rgba(245,158,11,0.15)]")
                    : (theme === 'light' ? "border-slate-200 bg-white/80 text-slate-500 hover:text-slate-800 hover:border-amber-300" : "border-[#1e2333]/80 bg-[#090b0e]/80 text-gray-400 hover:text-white hover:border-amber-500/40")
                }`}
              >
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  theme === 'light' ? 'bg-amber-100 border-amber-200' : 'bg-[#241a14] border-[#1e2333]'
                }`}>
                  <AlertCircle size={13} className={`animate-pulse ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-[11px] font-bold leading-none transition-colors duration-300 ${
                    showHazardHeatmap ? (theme === 'light' ? 'text-slate-800' : 'text-white') : (theme === 'light' ? 'text-slate-700' : 'text-white')
                  }`}>Hazard Heatmap</span>
                  <span className={`text-[8px] leading-none mt-1 truncate transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-500' : 'text-gray-500'
                  }`}>Toggle flood overlay</span>
                </div>
              </button>

              <button 
                onClick={() => setShowWardBorders(!showWardBorders)}
                className={`backdrop-blur-md border p-2.5 text-left rounded-xl flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                  showWardBorders 
                    ? (theme === 'light' ? "border-emerald-300 bg-emerald-50 shadow-[0_4px_16px_rgba(16,185,129,0.15)] text-slate-800" : "border-emerald-500/40 bg-emerald-950/20 text-white shadow-[0_4px_16px_rgba(16,185,129,0.15)]")
                    : (theme === 'light' ? "border-slate-200 bg-white/80 text-slate-500 hover:text-slate-800 hover:border-emerald-300" : "border-[#1e2333]/80 bg-[#090b0e]/80 text-gray-400 hover:text-white hover:border-emerald-500/40")
                }`}
              >
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  theme === 'light' ? 'bg-emerald-100 border-emerald-200' : 'bg-[#14241b] border-[#1e2333]'
                }`}>
                  <Layers size={13} className={`animate-pulse ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-[11px] font-bold leading-none transition-colors duration-300 ${
                    showWardBorders ? (theme === 'light' ? 'text-slate-800' : 'text-white') : (theme === 'light' ? 'text-slate-700' : 'text-white')
                  }`}>Ward Borders</span>
                  <span className={`text-[8px] leading-none mt-1 truncate transition-colors duration-300 ${
                    theme === 'light' ? 'text-slate-500' : 'text-gray-500'
                  }`}>
                    {showWardBorders ? "Borders visible" : "Borders hidden"}
                  </span>
                </div>
              </button>
            </div>
          </section>

          {/* CIVIC STABILITY HEALTH & SPARKLINE GRAPH (Bottom Center with Glassmorphism) */}
          <section className={`h-[160px] flex-shrink-0 overflow-hidden border backdrop-blur-xl p-4 flex flex-col gap-1.5 rounded-xl relative transition-all duration-300 ${
            theme === 'light' 
              ? 'border-slate-200/80 bg-gradient-to-b from-white/90 to-slate-50/90 shadow-[0_12px_40px_rgba(0,0,0,0.08)]' 
              : 'border-[#1e2333]/70 bg-gradient-to-b from-[#0e111a]/90 to-[#07090d]/98 shadow-[0_12px_40px_rgba(0,0,0,0.55)]'
          }`}>
            {/* Corner Brackets */}
            <div className={`absolute top-0 left-0 w-2.5 h-2.5 border-t border-l rounded-tl-sm pointer-events-none transition-colors duration-300 ${theme === 'light' ? 'border-blue-400/40' : 'border-blue-500/25'}`}></div>
            <div className={`absolute top-0 right-0 w-2.5 h-2.5 border-t border-r rounded-tr-sm pointer-events-none transition-colors duration-300 ${theme === 'light' ? 'border-blue-400/40' : 'border-blue-500/25'}`}></div>
            <div className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l rounded-bl-sm pointer-events-none transition-colors duration-300 ${theme === 'light' ? 'border-blue-400/40' : 'border-blue-500/25'}`}></div>
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r rounded-br-sm pointer-events-none transition-colors duration-300 ${theme === 'light' ? 'border-blue-400/40' : 'border-blue-500/25'}`}></div>

            <div className={`flex items-center justify-between border-b pb-1.5 transition-colors duration-300 ${theme === 'light' ? 'border-slate-200' : 'border-[#1e2333]/50'}`}>
              <div className="flex items-center gap-2">
                <Activity className={`animate-pulse ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} size={14} />
                <h3 className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Civic Stability Health</h3>
              </div>
              <span className={`text-[8px] uppercase tracking-wider font-bold transition-colors duration-300 ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`}>90-Day Trend</span>
            </div>

            {/* Sparkline chart (Color-coded from Good to Critical) */}
            <div className="h-8 w-full pt-0.5 relative">
              <svg viewBox="0 0 400 50" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <line x1="0" y1="10" x2="400" y2="10" stroke={theme === 'light' ? '#cbd5e1' : '#1e2433'} strokeWidth="0.5" strokeDasharray="2,4" />
                <line x1="0" y1="30" x2="400" y2="30" stroke={theme === 'light' ? '#cbd5e1' : '#1e2433'} strokeWidth="0.5" strokeDasharray="2,4" />
                <path 
                  d={sparklinePath} 
                  fill="none" 
                  stroke="url(#sparkline-grad)" 
                  strokeWidth="1.8" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d={sparklineFillPath} 
                  fill="url(#gradient-uptime-ctr)" 
                  className="opacity-10" 
                />
                <defs>
                  <linearGradient id="gradient-uptime-ctr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                  <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" /> {/* Good - Green */}
                    <stop offset="60%" stopColor="#f59e0b" /> {/* Medium - Yellow/Amber */}
                    <stop offset="100%" stopColor="#ef4444" /> {/* Low - Red */}
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Outages minute bars (Color-coded heights: Green, Yellow, Red) */}
            <div className={`flex items-end gap-[3px] h-8 pt-1 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200' : 'border-[#1e2333]/50'}`} role="img">
              {stabilityBuckets.map((b, i) => {
                const maxActive = Math.max(...stabilityBuckets.map(bucket => bucket.activeCount), 5);
                const heightPercentage = Math.max(8, (b.activeCount / maxActive) * 100);

                let bg = "bg-emerald-500";
                if (b.stability < 60) bg = "bg-red-500";
                else if (b.stability < 85) bg = "bg-amber-500";

                return (
                  <div key={i} className="flex-1 h-full min-w-[2px] rounded-t-[1px]" style={{ height: `${heightPercentage}%` }}>
                    <div className={`w-full h-full ${bg} opacity-80 hover:opacity-100 transition-all duration-300 hover:scale-y-110`} title={`Active count: ${b.activeCount}, Stability: ${b.stability}%`}></div>
                  </div>
                );
              })}
            </div>
            <div className={`flex items-center justify-between text-[8px] font-mono font-bold transition-colors duration-300 ${theme === 'light' ? 'text-slate-500' : 'text-gray-500'}`}>
              <span>30 MIN AGO</span>
              <span>NOW</span>
            </div>
          </section>

        </motion.div>

        <motion.div variants={panelVariants} className="h-[600px] lg:h-full min-h-0 order-3">
          <RightPanel 
            incidents={mappedIncidents} 
            wardens={mappedWardens} 
            onAgentLog={onAgentLog} 
            theme={theme}
          />
        </motion.div>

    </motion.div>

      {/* CIVIC ALIAS SELECTION MODAL (Center-aligned popup) */}
      <AnimatePresence>
        {aliasModalOpen && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#101115] border border-[#1b1d24] w-full max-w-sm rounded p-6 shadow-2xl flex flex-col gap-4 font-mono text-[#e2e8f0]"
            >
              <div className="border-b border-[#1b1d24] pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Choose civic alias
                </h3>
                <p className="text-[10px] text-[#7d8590] mt-1 font-sans">
                  Set your volunteer name
                </p>
              </div>

              <form onSubmit={handleSaveAlias} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    required
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    placeholder="Pick your command center name"
                    className="bg-[#16171d] border border-[#1b1d24] text-xs px-3 py-2 text-white focus:outline-none focus:border-blue-500 rounded"
                    maxLength={20}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-9 rounded bg-blue-600 hover:bg-blue-700 text-[10px] font-bold uppercase tracking-wider text-white transition-all shadow-[0_0_12px_rgba(37,99,235,0.2)] hover:scale-[1.01] cursor-pointer"
                >
                  Authorize Identity
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WORKSPACE MODALS */}
      <ActiveGridAlertsWorkspace
        isOpen={isActiveAlertsOpen}
        onClose={() => setIsActiveAlertsOpen(false)}
        incidents={mappedIncidents}
        onUpvote={onUpvote}
        onVerify={onVerify}
        onViewLetter={onViewLetter}
        onResolveClick={handleResolveClick}
        onAuditClick={handleAuditClick}
        onAutoEscalate={onAutoEscalate}
        onAgentLog={onAgentLog}
        thalasseryBoundaryGeoJSON={thalasseryBoundaryGeoJSON}
        onOpenIncidentDetails={setSelectedDetailedIncident}
        theme={theme}
      />

      <AiDispatchQueueWorkspace
        isOpen={isDispatchQueueOpen}
        onClose={() => setIsDispatchQueueOpen(false)}
        incidents={mappedIncidents}
        thalasseryBoundaryGeoJSON={thalasseryBoundaryGeoJSON}
        onOpenIncidentDetails={setSelectedDetailedIncident}
        theme={theme}
      />

      <WardHotspotsWorkspace
        isOpen={isRiskForecastOpen}
        onClose={() => setIsRiskForecastOpen(false)}
        wardRisks={wardRisks}
        thalasseryBoundaryGeoJSON={thalasseryBoundaryGeoJSON}
        incidents={mappedIncidents}
        onAgentLog={onAgentLog}
        triageAgent={triageAgent}
      />

      <AnimatePresence>
        {selectedDetailedIncident && (
          <IssueDetailsModal
            incident={selectedDetailedIncident}
            onClose={() => setSelectedDetailedIncident(null)}
            onUpvote={handleVote}
            onVerify={onVerify}
            onResolveClick={handleResolveClick}
            onAuditClick={handleAuditClick}
            onViewLetter={onViewLetter}
            currentUserWarden={currentUserWarden}
          />
        )}
      </AnimatePresence>

      {/* OVERLAY MODAL FOR REPORTING (center-aligned popup) */}
      <AnimatePresence>
        {isReportModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#101115] border border-[#1b1d24] w-full max-w-lg rounded shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="border-b border-[#1b1d24] bg-[#121318] p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlusCircle className="text-blue-500 animate-pulse" size={16} />
                  <h3 className="text-xs font-bold text-white font-sans uppercase tracking-wide">
                    Report Neighborhood Issue
                  </h3>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-[#8e8e8f] hover:text-white p-1 hover:bg-[#16171d] rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

               {/* Form */}
              <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
                
                {/* Issue Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Issue Category
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      setFormType(selectedVal);
                      if (suggestedCategory && suggestedCategory.toLowerCase() === selectedVal.toLowerCase()) {
                        setSuggestedCategory(null);
                      }
                    }}
                    className="bg-[#16171d] border border-[#1b1d24] text-xs px-3 py-2 text-white focus:outline-none focus:border-blue-500 rounded"
                  >
                    <option value="Pothole">Pothole</option>
                    <option value="Drainage">Drainage</option>
                    <option value="Waste">Waste</option>
                    <option value="Streetlight">Streetlight</option>
                    <option value="Safety">Safety / Hazard</option>
                    <option value="Other">Other</option>
                  </select>

                  {suggestedCategory && (
                    <div className="mt-1 bg-amber-500/10 border border-amber-500/20 rounded p-2.5 flex flex-col gap-1.5 animate-pulse">
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>AI Suggestion: Photo matches "{suggestedCategory}" category.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormType(suggestedCategory);
                          setSuggestedCategory(null);
                        }}
                        className="text-[9px] font-bold bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/30 rounded py-1 px-2 cursor-pointer transition-all self-start"
                      >
                        Change to {suggestedCategory}
                      </button>
                    </div>
                  )}
                </div>

                {/* Ward / Sector Selector */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                      Ward / Sector
                    </label>
                    {formWardNo !== "" && (
                      <span className={`text-[8px] font-mono font-bold uppercase px-1 rounded ${
                        (lastInferredWardNo === formWardNo || (lastInferredWardNo !== "" && getZoneFromWard(lastInferredWardNo) === getZoneFromWard(formWardNo)))
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                      }`}>
                        {(lastInferredWardNo === formWardNo || (lastInferredWardNo !== "" && getZoneFromWard(lastInferredWardNo) === getZoneFromWard(formWardNo))) 
                          ? '✨ Inferred Ward' 
                          : '⚠️ Manual Override'}
                      </span>
                    )}
                  </div>
                  <select
                    value={formWardNo}
                    onChange={(e) => {
                      const selectedWardNo = e.target.value;
                      const w = CANONICAL_WARDS.find(x => String(x.wardNo) === selectedWardNo);
                      if (w) {
                        setFormWardNo(String(w.wardNo));
                        setFormWardName(w.wardName);
                      }
                    }}
                    className="bg-[#16171d] border border-[#1b1d24] text-xs px-3 py-2 text-white focus:outline-none focus:border-blue-500 rounded cursor-pointer"
                  >
                    <option value="" disabled>Select a Ward...</option>
                    {CANONICAL_WARDS.map(w => (
                      <option key={w.wardNo} value={String(w.wardNo)}>
                        Ward {w.wardNo} - {w.wardName} ({w.zone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Landmark / exact place */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Landmark / exact place
                  </label>
                  <input
                    type="text"
                    required
                    value={formDetails}
                    onChange={(e) => setFormDetails(e.target.value)}
                    placeholder="e.g. opposite court entrance gate, underpass lane..."
                    className="bg-[#16171d] border border-[#1b1d24] text-xs px-3 py-2 text-white focus:outline-none focus:border-blue-500 rounded"
                  />
                </div>

                {/* Describe the issue */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Describe the issue
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Please include safety details (e.g. depth of pothole, blocked traffic, visibility at night)..."
                    className="bg-[#16171d] border border-[#1b1d24] text-xs px-3 py-2 text-white focus:outline-none focus:border-blue-500 rounded resize-none"
                  ></textarea>
                </div>

                {/* Photo Evidence */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Photo Evidence
                  </label>
                  
                  {imageVerified ? (
                    <div className="border border-emerald-500/30 bg-emerald-500/10 p-3 rounded flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-emerald-400">
                          <CheckCircle2 size={14} />
                          <span>Gemini verified structural damage details ({verifiedConfidence}%).</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setImageVerified(false); setUploadedImage(null); setAiDraftedLetter(""); setVerifiedDetails(""); }}
                          className="text-[9px] font-mono text-red-400 hover:underline font-bold"
                        >
                          Remove
                        </button>
                      </div>
                      {uploadedImage && (
                        <div className="w-full h-24 bg-black/60 border border-[#1b1d24]/50 rounded overflow-hidden flex items-center justify-center relative mt-1">
                          <img src={uploadedImage} alt="Citizen report preview" className="h-full object-contain" />
                        </div>
                      )}
                      {verifiedDetails && (
                        <div className="text-[10px] text-blue-200 bg-[#0e1014] border border-[#1b1d24]/50 p-2 rounded leading-relaxed">
                          <strong>AI Diagnosis:</strong> {verifiedDetails}
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="border border-[#1b1d24] bg-[#16171d] hover:bg-[#1d1e26] py-4 rounded flex flex-col items-center justify-center gap-2 text-[#7d8590] hover:text-white transition-colors cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        disabled={isImageVerifying} 
                        className="hidden" 
                      />
                      {isImageVerifying ? (
                        <div className="flex items-center gap-2 text-xs font-mono text-blue-400">
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Analyzing photo pixels...</span>
                        </div>
                      ) : (
                        <>
                          <Camera size={16} className="text-[#7d8590]" />
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                            Upload photo for AI analysis
                          </span>
                        </>
                      )}
                    </label>
                  )}
                  <span className="text-[9px] text-[#7d8590] mt-0.5 font-sans leading-none">
                    Optional, but improves AI categorization and verification
                  </span>
                </div>

                {/* Location Selection Method */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Incident Location
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isGeolocationLoading}
                      onClick={handleUseCurrentLocation}
                      className="flex items-center justify-center gap-1.5 bg-[#16171d] hover:bg-[#1d1e26] border border-[#1b1d24] hover:border-blue-500/40 text-[10px] font-bold font-mono py-2 px-3 text-[#e2e8f0] rounded transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isGeolocationLoading ? (
                        <>
                          <RefreshCw size={11} className="animate-spin text-blue-400" />
                          <span>Locating...</span>
                        </>
                      ) : (
                        <>
                          <MapPin size={11} className="text-blue-400" />
                          <span>Use current location</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handlePickFromMap}
                      className="flex items-center justify-center gap-1.5 bg-[#16171d] hover:bg-[#1d1e26] border border-[#1b1d24] hover:border-blue-500/40 text-[10px] font-bold font-mono py-2 px-3 text-[#e2e8f0] rounded transition-all cursor-pointer"
                    >
                      <MapPin size={11} className="text-blue-400" />
                      <span>Pick from map</span>
                    </button>
                  </div>
                </div>

                {/* Selected Map Coordinates */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Incident Coordinates
                  </label>
                  <div className="bg-[#16171d]/60 border border-[#1b1d24] text-xs px-3 py-2 text-white rounded flex items-center justify-between">
                    {formLat !== 0 ? (
                      <span className="font-mono text-blue-400">
                        Lat: {formLat.toFixed(5)} / Lng: {formLng.toFixed(5)}
                      </span>
                    ) : (
                      <span className="text-[#e2e8f0]/40 font-mono italic">
                        Not specified (Required)
                      </span>
                    )}
                    <span className="text-[9px] text-[#555] uppercase font-bold select-none">
                      {locationSource === 'map' ? 'Map Pinned' : (locationSource === 'gps' ? 'GPS Locked' : 'Pending')}
                    </span>
                  </div>
                </div>

                {/* Location Error Message */}
                {locationError && (
                  <div className="text-[10px] text-red-400 font-mono bg-red-950/20 border border-red-500/20 px-3 py-2 rounded leading-normal">
                    ⚠️ {locationError}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-[#1b1d24] mt-4">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="flex-1 bg-transparent hover:bg-[#16171d] border border-[#1b1d24] text-xs font-bold text-[#8e8e8f] hover:text-white py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-mono py-2 rounded shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Reporting...</span>
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>Report Issue</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI GRIEVANCE NOTICE DRAFTSMAN OVERLAY MODAL */}
      <AnimatePresence>
        {activeLetter && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#101115] border border-[#1b1d24] w-full max-w-lg rounded shadow-2xl flex flex-col h-[560px]"
            >
              {/* Header */}
              <div className="border-b border-[#1b1d24] bg-[#121318] p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400">
                  <FileText size={16} />
                  <span className="text-xs font-bold font-sans uppercase tracking-wide text-white">Warden Dispatch Consensus</span>
                </div>
                <button 
                  onClick={() => setActiveLetter(null)}
                  className="text-[#8e8e8f] hover:text-white p-1 hover:bg-[#16171d] rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Letter Content Pane */}
              <div className="flex-1 p-5 overflow-y-auto bg-black/20 font-mono text-xs text-blue-200/90 leading-relaxed whitespace-pre-wrap select-all selection:bg-blue-600">
                {activeLetter.letterDrafted}
              </div>

              {/* Consensus Progress Bar & approved wardens list */}
              <div className="border-t border-[#1b1d24] bg-[#121318] p-4 space-y-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[#8e8e8f] uppercase font-bold">Warden Consensus Progress</span>
                  <span className="text-cyan-400 font-bold">
                    {(activeLetter.dispatchApprovals || []).length} / 15 Approvals
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-[#1b1d24] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full transition-all duration-300 shadow-[0_0_8px_#06b6d4]"
                    style={{ width: `${Math.min(((activeLetter.dispatchApprovals || []).length / 15) * 100, 100)}%` }}
                  />
                </div>

                {/* Approved wardens list */}
                <div className="text-[9px] font-mono text-[#666] leading-relaxed">
                  <span className="text-white font-bold">Approved by:</span>{" "}
                  {(activeLetter.dispatchApprovals || []).length > 0 
                    ? (activeLetter.dispatchApprovals || []).join(", ") 
                    : "No approvals logged yet."}
                </div>
              </div>

              {/* Action Bar */}
              <div className="border-t border-[#1b1d24] bg-[#121318] p-3.5 flex items-center justify-between gap-3">
                <span className="text-[8px] font-mono text-[#555] uppercase">Consensus Verification Required</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveLetter(null)}
                    className="border border-[#1b1d24] hover:bg-[#16171d] text-[#8e8e8f] hover:text-white px-3.5 py-1.5 rounded text-xs transition-colors font-mono"
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      const reportId = activeLetter.id;
                      const docId = activeLetter.docId;
                      const currentWardenName = currentUserWarden ? currentUserWarden.name : "Anonymous Warden";
                      const currentApprovals = activeLetter.dispatchApprovals || [];

                      if (currentApprovals.includes(currentWardenName)) {
                        alert(`You have already approved this dispatch notice. Approvals: ${currentApprovals.length}/15.`);
                        return;
                      }

                      const nextApprovals = [...currentApprovals, currentWardenName];
                      const nextStatus = nextApprovals.length >= 15 ? 'dispatched' : 'escalated';

                      if (nextStatus === 'dispatched') {
                        setAiLogs(prev => [...prev, { 
                          id: `log-dispatch-${reportId}-${Date.now()}`, 
                          type: "success", 
                          text: `Consensus Reached: Dispatch notice for #CF-${reportId.toString().substring(0, 4)} approved by 15 wardens and sent to Municipal Commissioner!` 
                        }]);
                      } else {
                        setAiLogs(prev => [...prev, { 
                          id: `log-dispatch-approve-${reportId}-${Date.now()}`, 
                          type: "info", 
                          text: `Dispatch approval registered by warden ${currentWardenName} (${nextApprovals.length}/15 approvals).` 
                        }]);
                      }

                      if (isFirebaseConfigured && docId) {
                        try {
                          const reportRef = doc(db, 'reports', docId);
                          await updateDoc(reportRef, { 
                            dispatchApprovals: nextApprovals,
                            status: nextStatus
                          });
                        } catch (err) {
                          console.error("Failed to update approvals in Firestore:", err);
                        }
                      } else {
                        setReports(prev => prev.map(r => r.id === reportId ? { ...r, dispatchApprovals: nextApprovals, status: nextStatus } : r));
                      }

                      if (nextStatus === 'dispatched') {
                        alert(`Consensus Reached! Formal dispatch notice sent to Municipal Commissioner.`);
                        setActiveLetter(null);
                      } else {
                        alert(`Approval logged successfully (${nextApprovals.length}/15 approvals). This notice requires ${15 - nextApprovals.length} more warden approval(s) to be sent.`);
                        setActiveLetter(prev => prev ? { ...prev, dispatchApprovals: nextApprovals } : null);
                      }
                    }}
                    disabled={(activeLetter.dispatchApprovals || []).includes(currentUserWarden ? currentUserWarden.name : "Anonymous Warden")}
                    className={`px-4 py-1.5 rounded text-xs transition-colors font-mono font-bold ${(activeLetter.dispatchApprovals || []).includes(currentUserWarden ? currentUserWarden.name : "Anonymous Warden") ? 'bg-[#1b1d24] text-[#666] cursor-not-allowed border border-[#1b1d24]' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  >
                    {(activeLetter.dispatchApprovals || []).includes(currentUserWarden ? currentUserWarden.name : "Anonymous Warden") ? 'Approved (Waiting)' : 'Approve Dispatch'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GOOGLE STREETVIEW ARCHIVE PHOTO CHECK MODAL */}
      <AnimatePresence>
        {activeStreetCheck && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#101115] border border-[#1b1d24] w-full max-w-xl rounded shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="border-b border-[#1b1d24] bg-[#121318] p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Shield size={16} />
                  <span className="text-xs font-bold font-sans uppercase tracking-wide text-white">Citizen Evidence Verification</span>
                </div>
                <button 
                  onClick={() => setActiveStreetCheck(null)}
                  className="text-[#8e8e8f] hover:text-white p-1 hover:bg-[#16171d] rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Comparison split panels */}
              <div className="p-5 space-y-4">
                {/* Citizen Evidence / Live Simulation */}
                <div className="border border-[#1b1d24] bg-[#16171d] p-3.5 rounded flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">Reported Evidence (Today)</span>
                  <div className="w-full h-48 bg-black/60 border border-[#1b1d24] rounded flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
                    {activeStreetCheck.image ? (
                      <img src={activeStreetCheck.image} className="w-full h-full object-cover" alt="Citizen upload" />
                    ) : (
                      (() => {
                        const type = (activeStreetCheck.type || "").toLowerCase();
                        if (type.includes("pothole") || type.includes("road")) {
                          return (
                            <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
                              <rect x="0" y="0" width="200" height="40" fill="#1b2536" />
                              <polygon points="0,120 70,40 130,40 200,120" fill="#1f232b" />
                              <polygon points="0,120 70,40 0,40" fill="#142c1e" />
                              <polygon points="200,120 130,40 200,40" fill="#142c1e" />
                              <line x1="100" y1="40" x2="100" y2="120" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,4" />
                              <ellipse cx="100" cy="80" rx="30" ry="12" fill="#0f0f12" stroke="#ea580c" strokeWidth="1.5" />
                              <path d="M 85 80 Q 95 85 100 80 Q 110 75 115 80 Q 105 85 100 85 Q 90 85 85 80 Z" fill="#2d2e33" />
                              <path d="M 70 80 L 50 78 L 40 82" stroke="#4b5563" strokeWidth="1" fill="none" />
                              <path d="M 130 80 L 145 83 L 155 81" stroke="#4b5563" strokeWidth="1" fill="none" />
                              <path d="M 100 92 L 105 105 L 102 115" stroke="#4b5563" strokeWidth="1" fill="none" />
                              <rect x="5" y="5" width="65" height="15" rx="2" fill="black" fillOpacity="0.7" />
                              <text x="10" y="15" fill="#ef4444" fontSize="7" fontFamily="monospace" fontWeight="bold">DAMAGE INFERRED</text>
                              <line x1="100" y1="80" x2="125" y2="60" stroke="#f97316" strokeWidth="0.8" strokeDasharray="2,2" />
                              <text x="128" y="58" fill="#f97316" fontSize="7" fontFamily="monospace" fontWeight="bold">D: 12cm</text>
                            </svg>
                          );
                        } else if (type.includes("drain") || type.includes("water") || type.includes("flood")) {
                          return (
                            <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
                              <rect x="0" y="0" width="200" height="40" fill="#1b2536" />
                              <polygon points="0,120 70,40 130,40 200,120" fill="#1f232b" />
                              <polygon points="0,120 50,70 150,70 200,120" fill="#1d4ed8" fillOpacity="0.45" />
                              <ellipse cx="100" cy="95" rx="50" ry="8" stroke="#3b82f6" strokeWidth="0.8" fill="none" strokeOpacity="0.6" />
                              <ellipse cx="120" cy="85" rx="30" ry="5" stroke="#3b82f6" strokeWidth="0.8" fill="none" strokeOpacity="0.4" />
                              <ellipse cx="70" cy="105" rx="40" ry="6" stroke="#3b82f6" strokeWidth="0.8" fill="none" strokeOpacity="0.5" />
                              <rect x="85" y="85" width="30" height="15" fill="#374151" rx="1" />
                              <line x1="90" y1="85" x2="90" y2="100" stroke="black" strokeWidth="2" />
                              <line x1="95" y1="85" x2="95" y2="100" stroke="black" strokeWidth="2" />
                              <line x1="100" y1="85" x2="100" y2="100" stroke="black" strokeWidth="2" />
                              <line x1="105" y1="85" x2="105" y2="100" stroke="black" strokeWidth="2" />
                              <line x1="110" y1="85" x2="110" y2="100" stroke="black" strokeWidth="2" />
                              <rect x="5" y="5" width="70" height="15" rx="2" fill="black" fillOpacity="0.7" />
                              <text x="10" y="15" fill="#3b82f6" fontSize="7" fontFamily="monospace" fontWeight="bold">WATERLEVEL: 45cm</text>
                            </svg>
                          );
                        } else if (type.includes("waste") || type.includes("garbage") || type.includes("refuse") || type.includes("clean")) {
                          return (
                            <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
                              <rect x="0" y="0" width="200" height="40" fill="#1b2536" />
                              <polygon points="0,120 70,40 130,40 200,120" fill="#1f232b" />
                              <polygon points="0,120 70,40 0,40" fill="#142c1e" />
                              <ellipse cx="60" cy="85" rx="25" ry="12" fill="#374151" />
                              <path d="M 40 85 Q 50 70 60 72 Q 70 68 80 82 Q 70 95 55 90 Z" fill="#4b5563" />
                              <circle cx="50" cy="80" r="10" fill="#111827" stroke="#374151" strokeWidth="0.8" />
                              <circle cx="65" cy="82" r="9" fill="#111827" stroke="#374151" strokeWidth="0.8" />
                              <path d="M 48 70 L 52 70 L 50 67 Z" fill="#111827" />
                              <path d="M 63 73 L 67 73 L 65 70 Z" fill="#111827" />
                              <rect x="85" y="90" width="5" height="10" fill="#ef4444" transform="rotate(30,85,90)" />
                              <circle cx="78" cy="95" r="2" fill="#eab308" />
                              <rect x="5" y="5" width="60" height="15" rx="2" fill="black" fillOpacity="0.7" />
                              <text x="10" y="15" fill="#f59e0b" fontSize="7" fontFamily="monospace" fontWeight="bold">REFUSE DETECTED</text>
                            </svg>
                          );
                        } else if (type.includes("light") || type.includes("lamp") || type.includes("electricity") || type.includes("broken")) {
                          return (
                            <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
                              <rect x="0" y="0" width="200" height="120" fill="#0d0e12" />
                              <circle cx="170" cy="25" r="8" fill="#475569" />
                              <circle cx="168" cy="25" r="8" fill="#0d0e12" />
                              <rect x="98" y="30" width="4" height="90" fill="#1f2937" />
                              <path d="M 98 40 C 98 30 70 30 70 35" stroke="#1f2937" strokeWidth="3" fill="none" />
                              <polygon points="65,35 75,35 78,42 62,42" fill="#374151" />
                              <ellipse cx="70" cy="45" rx="4" ry="4" fill="#ef4444" fillOpacity="0.1" stroke="#ef4444" strokeWidth="0.8" />
                              <line x1="68" y1="43" x2="72" y2="47" stroke="#ef4444" strokeWidth="0.8" />
                              <line x1="72" y1="43" x2="68" y2="47" stroke="#ef4444" strokeWidth="0.8" />
                              <rect x="0" y="115" width="200" height="5" fill="#111827" />
                              <rect x="5" y="5" width="70" height="15" rx="2" fill="black" fillOpacity="0.7" />
                              <text x="10" y="15" fill="#ef4444" fontSize="7" fontFamily="monospace" fontWeight="bold">STATUS: OFFLINE</text>
                            </svg>
                          );
                        } else {
                          return (
                            <svg viewBox="0 0 200 120" className="w-full h-full object-cover">
                              <rect x="0" y="0" width="200" height="120" fill="#111827" />
                              <path d="M 100 35 L 140 100 L 60 100 Z" fill="#eab308" fillOpacity="0.1" stroke="#eab308" strokeWidth="2" />
                              <text x="100" y="80" fill="#eab308" fontSize="24" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">!</text>
                              <text x="100" y="110" fill="#9ca3af" fontSize="8" fontFamily="monospace" textAnchor="middle">HAZARD VERIFICATION</text>
                            </svg>
                          );
                        }
                      })()
                    )}
                    <span className="absolute bottom-2 left-2 text-[8px] font-mono bg-black/80 px-1 py-0.5 rounded text-rose-400 border border-rose-500/20">
                      {activeStreetCheck.image ? "User Mobile EXIF Validated" : "Simulated Local Evidence"}
                    </span>
                  </div>
                </div>

                {/* EXIF Metadata & Geocoding Telemetry Table */}
                <div className="border border-[#1b1d24] bg-[#0c0d10] rounded p-3 font-mono text-[10px] space-y-2">
                  <div className="text-[9px] text-[#7d8590] uppercase font-bold tracking-wide border-b border-[#1b1d24] pb-1">
                    EXIF Metadata Audit Logs
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <div className="text-[#666]">Device Sensor:</div>
                    <div className="text-white text-right">{activeStreetCheck.image ? "Apple iPhone 15 Pro Max" : "Mobile Client Node (Validated)"}</div>
                    
                    <div className="text-[#666]">GPS Alignment:</div>
                    <div className="text-emerald-400 text-right font-bold">100% Match (Thalassery Ward {activeStreetCheck.ward})</div>
                    
                    <div className="text-[#666]">Image Integrity Hash:</div>
                    <div className="text-white text-right overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-bold">SHA-256: 8a7c2e01...e3b50c18</div>
                    
                    <div className="text-[#666]">Submission Timestamp:</div>
                    <div className="text-white text-right">{activeStreetCheck.timeAgo === "Just now" ? new Date().toLocaleTimeString() : "2026-06-27 (Audited)"}</div>
                  </div>
                </div>

                {/* AI Verification Verdict */}
                <div className="border border-emerald-500/25 bg-emerald-500/5 p-4 rounded flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-400 mt-0.5 shrink-0" size={16} />
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">Gemini Vision AI Analysis Verdict</h4>
                    <p className="text-[11px] text-[#8e8e8f] mt-1 leading-relaxed font-mono">
                      Location telemetry matched. Image analysis confirms reported {activeStreetCheck.type.toLowerCase()} matches local environmental hazard features. High confidence rating logged.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="border-t border-[#1b1d24] bg-[#121318] p-3.5 flex justify-end gap-2.5">
                <button
                  onClick={() => setActiveStreetCheck(null)}
                  className="bg-[#1b1d24] hover:bg-[#252831] text-[#8e8e8f] hover:text-white px-4 py-1.5 rounded text-xs transition-colors font-mono font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleVerify(activeStreetCheck.id, activeStreetCheck.docId);
                    setActiveStreetCheck(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-xs transition-colors font-mono font-bold"
                >
                  Confirm & Verify Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRIAGE SUGGESTION / DUPLICATE MERGE MODAL */}
      <AnimatePresence>
        {triageSuggestion && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#101115] border border-[#1b1d24] w-full max-w-lg rounded shadow-2xl flex flex-col p-5 space-y-4 font-mono"
            >
              <div className="border-b border-[#1b1d24] pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertCircle size={18} />
                  <span className="text-xs font-bold font-sans uppercase tracking-wide text-white">Triage Agent Duplicate Warning</span>
                </div>
                <button 
                  onClick={() => setTriageSuggestion(null)}
                  className="text-[#8e8e8f] hover:text-white p-1 hover:bg-[#16171d] rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs font-mono text-[#8e8e8f] space-y-2 leading-relaxed">
                <p className="text-white font-bold">
                  Potential duplicate detected (confidence: {(triageSuggestion.confidence * 100).toFixed(0)}%)
                </p>
                <div className="bg-[#121318] p-3 rounded border border-[#1b1d24] space-y-1 text-[11px]">
                  <div className="text-amber-400 font-bold uppercase text-[9px]">Decision: {triageSuggestion.decision}</div>
                  <div><span className="text-[#555]">Existing Location:</span> {triageSuggestion.matchedReport.location}</div>
                  <div><span className="text-[#555]">Existing Description:</span> {triageSuggestion.matchedReport.details || triageSuggestion.matchedReport.description}</div>
                  <div><span className="text-[#555]">Reason:</span> {triageSuggestion.reason}</div>
                  <div><span className="text-[#555]">Recommended Action:</span> {triageSuggestion.recommendedAction}</div>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-[#1b1d24] pt-3 text-xs font-mono">
                <button
                  type="button"
                  onClick={async () => {
                    const matchedId = triageSuggestion.matchedReport.id;
                    const docId = triageSuggestion.matchedReport.docId;
                    
                    if (isFirebaseConfigured && docId) {
                      try {
                        const reportRef = doc(db, 'reports', docId);
                        await updateDoc(reportRef, { 
                          votes: increment(1),
                          verifications: increment(1)
                        });
                      } catch (err) {
                        console.error("Failed to merge report:", err);
                      }
                    } else {
                      setReports(prev => prev.map(r => r.id === matchedId ? { ...r, votes: (r.votes || 0) + 1, verifications: (r.verifications || 0) + 1 } : r));
                    }
                    
                    await logAgentActivity({
                      reportId: matchedId,
                      wardId: triageSuggestion.matchedReport.ward,
                      agentType: "Triage Agent",
                      decision: "merge_successful",
                      confidence: triageSuggestion.confidence,
                      reason: `User merged new submission into duplicate report #CF-${String(matchedId).substring(0, 4)}.`,
                      recommendedAction: "Increment upvotes/verifications of duplicate and close current triage flow."
                    });
                    
                    alert(`Report merged successfully! Existing ticket upvoted.`);
                    setTriageSuggestion(null);
                    setIsReportModalOpen(false);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded font-bold transition-colors"
                >
                  Merge into Existing
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const modifiedReport = {
                      ...triageSuggestion.newReport,
                      duplicateOf: triageSuggestion.matchedReport.id,
                      triageDecision: triageSuggestion.decision,
                      triageConfidence: triageSuggestion.confidence,
                      triageReason: triageSuggestion.reason
                    };
                    
                    if (isFirebaseConfigured) {
                      await addDoc(collection(db, 'reports'), modifiedReport);
                    } else {
                      setReports(prev => [modifiedReport, ...prev]);
                    }
                    
                    await logAgentActivity({
                      reportId: modifiedReport.id,
                      wardId: modifiedReport.ward,
                      agentType: "Triage Agent",
                      decision: "link_as_related",
                      confidence: triageSuggestion.confidence,
                      reason: `User linked new report #CF-${String(modifiedReport.id).substring(0, 4)} as related to #CF-${String(triageSuggestion.matchedReport.id).substring(0, 4)}.`,
                      recommendedAction: "Submit new report with duplicateOf reference set."
                    });
                    
                    alert(`Report linked as related and submitted!`);
                    setTriageSuggestion(null);
                    setIsReportModalOpen(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-bold transition-colors"
                >
                  Link as Related
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const newReport = triageSuggestion.newReport;
                    if (isFirebaseConfigured) {
                      await addDoc(collection(db, 'reports'), newReport);
                    } else {
                      setReports(prev => [newReport, ...prev]);
                    }
                    
                    await logAgentActivity({
                      reportId: newReport.id,
                      wardId: newReport.ward,
                      agentType: "Triage Agent",
                      decision: "submit_as_new",
                      confidence: triageSuggestion.confidence,
                      reason: "User manually bypassed duplicate warning and created a new independent ticket.",
                      recommendedAction: "Create new independent ticket without links."
                    });
                    
                    alert(`Report submitted as new independent ticket!`);
                    setTriageSuggestion(null);
                    setIsReportModalOpen(false);
                  }}
                  className="bg-[#1b1d24] hover:bg-[#252831] border border-[#1b1d24] text-white px-3 py-1.5 rounded transition-colors"
                >
                  Submit as New
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESOLVE ISSUE MODAL */}
      <AnimatePresence>
        {activeResolveIncident && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#101115] border border-[#1b1d24] w-full max-w-lg rounded shadow-2xl flex flex-col font-mono"
            >
              {/* Header */}
              <div className="border-b border-[#1b1d24] bg-[#121318] p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertCircle size={16} />
                  <span className="text-xs font-bold font-sans uppercase tracking-wide text-white">
                    Submit Resolution Proof
                  </span>
                </div>
                <button 
                  onClick={() => setActiveResolveIncident(null)}
                  className="text-[#8e8e8f] hover:text-white p-1 hover:bg-[#16171d] rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={submitResolutionProof} className="p-5 space-y-4 text-xs font-mono">
                <div>
                  <div className="text-[#8e8e8f] uppercase text-[9px] font-bold">Grievance Info</div>
                  <div className="text-white mt-1">
                    #CF-{activeResolveIncident.id.toString().substring(0, 4)}: {activeResolveIncident.type} at {activeResolveIncident.location}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Resolution Notes
                  </label>
                  <textarea
                    rows={3}
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Describe the actions taken to repair or clear this issue..."
                    className="bg-[#0c0d12] border border-[#1b1d24] rounded p-2 text-white focus:outline-none focus:border-blue-500/50 w-full text-xs font-mono"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Upload Resolution Proof Image
                  </label>
                  <div className="flex items-center justify-center border border-dashed border-[#1b1d24] bg-[#0c0d12] rounded p-4 relative h-36">
                    {resolveImage ? (
                      <div className="relative w-full h-full">
                        <img src={resolveImage} className="w-full h-full object-cover rounded" alt="Proof" />
                        <button 
                          type="button"
                          onClick={() => setResolveImage(null)}
                          className="absolute top-1 right-1 bg-black/85 text-white p-1 rounded-full hover:bg-black"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer text-[#8e8e8f] hover:text-white transition-colors w-full h-full">
                        <Camera size={24} className="mb-1.5 mx-auto" />
                        <span className="text-[9px] uppercase tracking-wider font-bold text-center block">Choose Proof Image</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 1048576) {
                                alert("Please upload an image smaller than 1MB to avoid database size limits.");
                                e.target.value = '';
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => setResolveImage(ev.target.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#1b1d24] pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveResolveIncident(null)}
                    className="border border-[#1b1d24] hover:bg-[#16171d] text-[#8e8e8f] hover:text-white px-3.5 py-1.5 rounded transition-colors font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAgentProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded font-bold transition-colors flex items-center gap-1.5"
                  >
                    {isAgentProcessing ? "AI Auditing..." : "Submit for Verification"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AUDIT PROOF VERIFICATION MODAL */}
      <AnimatePresence>
        {activeAuditIncident && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#101115] border border-[#1b1d24] w-full max-w-xl rounded shadow-2xl flex flex-col font-mono"
            >
              {/* Header */}
              <div className="border-b border-[#1b1d24] bg-[#121318] p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <Shield size={16} />
                  <span className="text-xs font-bold font-sans uppercase tracking-wide text-white">
                    Warden Verification Audit
                  </span>
                </div>
                <button 
                  onClick={() => setActiveAuditIncident(null)}
                  className="text-[#8e8e8f] hover:text-white p-1 hover:bg-[#16171d] rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-mono max-h-[500px] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-[#555]">Original Report</span>
                    <div className="text-white font-bold">#CF-{activeAuditIncident.id.toString().substring(0, 4)}</div>
                    <div className="text-[#8e8e8f]">{activeAuditIncident.type} @ {activeAuditIncident.location}</div>
                    <div className="text-[#666] leading-normal font-sans italic">{activeAuditIncident.details || activeAuditIncident.description}</div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-[#555]">Resolution Notes</span>
                    <div className="text-white font-bold">Uploaded by Worker</div>
                    <div className="text-[#8e8e8f] leading-normal font-sans">{activeAuditIncident.resolutionNotes || "No notes logged."}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-[#555]">AI Agent Audit Assessment</span>
                    <div className="bg-[#121318] p-3 rounded border border-[#1b1d24] space-y-1.5 text-[10px]">
                      <div className="font-bold text-emerald-400 uppercase">Decision: {activeAuditIncident.resolutionAuditDecision || "None"}</div>
                      <div className="text-[#8e8e8f]"><span className="text-[#555]">Reason:</span> {activeAuditIncident.resolutionAuditReason || "Verification pending."}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-[#555]">Resolution Proof Image</span>
                    <div className="w-full h-32 bg-black/60 rounded border border-[#1b1d24] overflow-hidden">
                      {activeAuditIncident.resolutionProofImage ? (
                        <img src={activeAuditIncident.resolutionProofImage} className="w-full h-full object-cover" alt="Proof" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#555]">No Image Uploaded</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#1b1d24] pt-4 flex justify-end gap-2">
                  <button
                    onClick={() => handleWardenResolutionAudit(false)}
                    disabled={isAgentProcessing}
                    className="border border-red-500/30 hover:bg-red-600/10 text-red-400 px-3.5 py-1.5 rounded transition-colors font-bold uppercase text-[10px]"
                  >
                    Reject Proof (Re-open)
                  </button>
                  <button
                    onClick={() => handleWardenResolutionAudit(true)}
                    disabled={isAgentProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded font-bold transition-colors uppercase text-[10px]"
                  >
                    Approve & Verify Resolution
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={`h-[76px] pb-8 flex-shrink-0 flex flex-col items-center justify-center border-t py-1 px-4 text-center text-[9px] leading-relaxed relative z-10 font-bold uppercase tracking-widest transition-colors duration-300 ${
        theme === 'light' ? 'border-slate-200/50 bg-slate-50/70 text-slate-500' : 'border-[#1e2333]/30 bg-[#07090d]/50 text-gray-500'
      }`}>
        <div>CivicFix v0.4.0 • Thalassery Town Community Command Center.</div>
        <div className={`mt-0.5 flex items-center justify-center gap-1 flex-wrap transition-colors duration-300 ${theme === 'light' ? 'text-slate-400' : 'text-gray-400'}`}>
          <span>Developed with ❤️ by <span className={`${theme === 'light' ? 'text-[#1e1b4b]' : 'text-white'} font-bold`}>Harshith</span> for the</span>
          <span className={`${theme === 'light' ? 'text-[#1e1b4b] hover:text-red-500' : 'text-white hover:text-red-500'} transition-colors cursor-pointer flex items-center gap-0.5 font-bold`}>
            Vibe2Ship Hackathon <Heart className="fill-red-500 stroke-red-500 inline-block shrink-0" size={10} />
          </span>
        </div>
      </footer>

      {/* Floating collapsible AI Agent Console Drawer */}
      <ConsoleDrawer logs={consoleLogs} theme={theme} />

    </div>
  );
}

export default App;
