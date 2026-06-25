import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  MapPin, Activity, PlusCircle, RefreshCw, 
  CheckCircle2, Send, Globe, Shield, X, 
  Heart, Camera, AlertCircle, FileText, CloudSun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LeftPanel from './components/LeftPanel';

// Live Integration Imports
import { db, auth, isFirebaseConfigured } from './lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, increment, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { analyzeIssueImage, isGeminiConfigured } from './lib/gemini';

// Leaflet Maps Imports
import L from 'leaflet';
import RightPanel from './components/RightPanel';
import 'leaflet/dist/leaflet.css';
import LiveTicker from './components/LiveTicker';
import ConsoleDrawer from './components/ConsoleDrawer';

import { 
  DISTRICT_TO_ZONE, 
  ZONE_TO_DISTRICT, 
  WARD_ZONES, 
  normalizeZoneName, 
  getMapMarkers, 
  getHeatmapData, 
  getStabilityTrend 
} from './lib/helpers';

function usePrevious(value) {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(null);

  if (value !== current) {
    setPrevious(current);
    setCurrent(value);
  }

  return previous;
}

// Hardcoded Thalassery Town Community Wards/Zones
const initialDistricts = [
  { name: "South Highway", availability: 97.2, active: 2, resolved: 41, severity: "warning", lat: 11.7511, lng: 75.4921, sparkline: [98, 97.5, 97.2, 97.0, 97.3, 97.2] },
  { name: "Court Corridor", availability: 99.0, active: 1, resolved: 58, severity: "normal", lat: 11.7490, lng: 75.4891, sparkline: [99, 99.1, 98.9, 99.0, 99.0, 99.0] },
  { name: "Heritage Quarter", availability: 94.6, active: 4, resolved: 32, severity: "critical", lat: 11.7455, lng: 75.4852, sparkline: [96, 95.2, 94.8, 94.1, 94.5, 94.6] },
  { name: "Seafront", availability: 98.1, active: 1, resolved: 29, severity: "normal", lat: 11.7420, lng: 75.4810, sparkline: [98.5, 98.2, 98.0, 98.1, 98.3, 98.1] },
  { name: "North Uplands", availability: 99.5, active: 0, resolved: 24, severity: "normal", lat: 11.7535, lng: 75.4985, sparkline: [99.5, 99.5, 99.5, 99.5, 99.5, 99.5] },
  { name: "Chirakkara Hills", availability: 96.8, active: 3, resolved: 37, severity: "warning", lat: 11.7570, lng: 75.4840, sparkline: [97.5, 97.1, 96.9, 96.6, 96.8, 96.8] }
];

// Mock Recent Issues Feed for Thalassery
const initialIssues = [
  { 
    id: 1, 
    type: "Pothole", 
    location: "Court Road Junction Bypass (Near Post Office)", 
    zone: "Court Corridor", 
    timeAgo: "2m ago", 
    severity: "critical", 
    votes: 4, 
    verifications: 1,
    user: "Adithya V.",
    streetViewStatus: "verified",
    lat: 11.7490,
    lng: 75.4891,
    status: "dispatched",
    details: "Deep crater in the middle of the road, causing severe traffic block and safety risks for two-wheelers.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Urgent grievance notice regarding public road damage (Pothole) at Court Corridor.

Respected Sir/Madam,
I am writing to draw your immediate attention to a severe infrastructure hazard at Court Road Junction Bypass (Near Post Office). An automated civic monitoring tool has registered a deep road cavity (approx. depth 12cm, diameter 1.1m) posing threat to traffic safety. 

This issue is verified by local community sensors. We request your engineering team to inspect and repair the road surface at the earliest.

Coordinates: Lat 11.7490, Lng 75.4891
Report Reference: #CF-9811`
  },
  { 
    id: 2, 
    type: "Drainage", 
    location: "Railway Underpass (Overbury's Folly Road)", 
    zone: "Heritage Quarter", 
    timeAgo: "14m ago", 
    severity: "critical", 
    votes: 18, 
    verifications: 2,
    user: "Nihal P.",
    streetViewStatus: "verified",
    lat: 11.7455,
    lng: 75.4852,
    status: "escalated",
    details: "Water logged up to 60 cm under the railway bridge. Cars and autos are turning back.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Report regarding clogged stormwater drain and waterlogging at Railway Underpass.

Respected Sir/Madam,
This is to notify the Thalassery Municipality regarding waterlogging at the Railway Underpass (Overbury's Folly Road). Blocked stormwater channels have resulted in over 60 cm of water accumulation.

Local traffic is paralyzed. We urge the municipal drainage department to clear the blocks immediately.

Coordinates: Lat 11.7455, Lng 75.4852
Report Reference: #CF-9812`
  },
  { 
    id: 3, 
    type: "Waste", 
    location: "Behind Thalassery Municipal Bus Stand", 
    zone: "South Highway", 
    timeAgo: "32m ago", 
    severity: "warning", 
    votes: 6, 
    verifications: 0,
    user: "Shahana M.",
    streetViewStatus: "unverified",
    lat: 11.7511,
    lng: 75.4921,
    status: "open",
    details: "Commercial waste and plastic bags piled near the parking lot, attracting stray dogs.",
    letterDrafted: `To,
The Health Inspector,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Request for waste clearance behind Thalassery Municipal Bus Stand.

Respected Sir/Madam,
I request the municipal sanitation department to clear commercial waste accumulated behind the Thalassery Municipal Bus Stand. The dump is causing unhygienic conditions.

Coordinates: Lat 11.7511, Lng 75.4921
Report Reference: #CF-9813`
  },
  { 
    id: 4, 
    type: "Drainage", 
    location: "Sea Bridge pathway near children's park", 
    zone: "Seafront", 
    timeAgo: "1h ago", 
    severity: "warning", 
    votes: 9, 
    verifications: 1,
    user: "Ramesh Kumar",
    streetViewStatus: "verified",
    lat: 11.7420,
    lng: 75.4810,
    status: "inspected",
    details: "Cover slab of storm drain is broken, leaving a 1-meter deep open hole on the pedestrian walkway.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Broken drain cover slab hazard near Sea Bridge pathway.

Respected Sir/Madam,
A broken cover slab on the storm drain near the Sea Bridge pathway has created an open hazard on the walkway. Please initiate immediate repairs to prevent accidents.

Coordinates: Lat 11.7420, Lng 75.4810
Report Reference: #CF-9814`
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
  score += Math.min(verifications * 5, 20);

  const upvotes = incident.votes || incident.upvotes || 0;
  score += Math.min(upvotes * 1.5, 15);

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
  if (verifications >= 3 && isRainSensitive && floodRisk) {
    return "Escalated due to repeated verification and flood risk.";
  }
  if (verifications >= 3) {
    return `Escalated due to repeated volunteer verifications (${verifications}).`;
  }
  if (isRainSensitive && floodRisk) {
    return "Priority boost due to active monsoon precipitation risk.";
  }
  if (hasImage && upvotes >= 10) {
    return "High priority based on photo evidence and community support.";
  }
  if (hasImage) {
    return "Verification pending with confirmed photo evidence.";
  }
  if (upvotes >= 10) {
    return "Under review due to significant community upvotes.";
  }
  return "Queued for routine inspection.";
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [wardensList, setWardensList] = useState([]);
  
  const [selectedZone, setSelectedZone] = useState("All");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reports, setReports] = useState(initialIssues);
  
  // Heatmap Overlay Toggle Feature
  const [showHazardHeatmap, setShowHazardHeatmap] = useState(false);

  // Active Letter View Modal
  const [activeLetter, setActiveLetter] = useState(null);
  
  // Custom StreetView Verification Modal
  const [activeStreetCheck, setActiveStreetCheck] = useState(null);

  // Form State
  const [formType, setFormType] = useState("Pothole");
  const [formDetails, setFormDetails] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formZone, setFormZone] = useState("Court Corridor");
  const [formLat, setFormLat] = useState(11.7490);
  const [formLng, setFormLng] = useState(75.4891);
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
          else if (r.verifications >= 3 || r.severity === "critical") status = "escalated";
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
        else if (r.verifications >= 3 || r.severity === "critical") status = "escalated";
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

  const previousScores = usePrevious(currentScores) || {};

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
      name: w.name,
      role: w.role || getRoleFromKarma(w.karma || 0),
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

  const agentLogs = useMemo(() => {
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
  }, [currentUser, isFirebaseConfigured]);

  // Upvote/Downvote report
  const handleVote = useCallback(async (id, docId) => {
    if (isFirebaseConfigured && docId) {
      try {
        const docRef = doc(db, 'reports', docId);
        // Find existing report to get current votes count safely
        const report = reports.find(r => r.docId === docId);
        if (!report) return;
        await updateDoc(docRef, {
          votes: increment(1)
        });
        setAiLogs(prev => [...prev, { id: `log-vote-${id}-${Date.now()}`, type: "success", text: `Firestore: Logged upvote for issue #CF-${id.toString().substring(0, 4)}` }]);
        await incrementUserKarma(2);
      } catch (error) {
        console.error("Error updating vote in Firestore:", error);
      }
    } else {
      setReports(prev => prev.map(r => r.id === id ? { ...r, votes: r.votes + 1 } : r));
      await incrementUserKarma(2);
    }
  }, [reports, isFirebaseConfigured, incrementUserKarma]);

  // Verify issue locally (Gamification Verification loop)
  const handleVerify = useCallback(async (id, docId) => {
    if (isFirebaseConfigured && docId) {
      try {
        const report = reports.find(r => r.docId === docId);
        if (!report) return;
        const nextVerifications = (report.verifications || 0) + 1;
        const nextSeverity = nextVerifications >= 3 ? "critical" : report.severity;
        const nextStatus = nextVerifications >= 3 ? "escalated" : (report.status || "open");
        
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
          text: `Verification logged for report #${id}. [Status: ${nextVerifications >= 3 ? "ESCALATED" : "PENDING CLEARANCE"}]` 
        }]);
        await incrementUserKarma(5);
      } catch (error) {
        console.error("Error updating verification in Firestore:", error);
      }
    } else {
      setReports(prev => prev.map(r => {
        if (r.id === id) {
          const nextVerifications = r.verifications + 1;
          const nextSeverity = nextVerifications >= 3 ? "critical" : r.severity;
          const nextStatus = nextVerifications >= 3 ? "escalated" : (r.status || "open");
          
          // Log AI action
          setAiLogs(prevLogs => [...prevLogs, { 
            id: `log-verify-${id}-${Date.now()}-${Math.random()}`, 
            type: "success", 
            text: `Verification logged for report #${id}. [Status: ${nextVerifications >= 3 ? "ESCALATED" : "PENDING CLEARANCE"}]` 
          }]);

          return { ...r, verifications: nextVerifications, severity: nextSeverity, status: nextStatus };
        }
        return r;
      }));
      await incrementUserKarma(5);
    }
  }, [reports, isFirebaseConfigured, incrementUserKarma]);

  const onUpvote = useCallback((id) => {
    const report = reports.find(r => r.id?.toString() === id.toString() || r.docId === id);
    if (report) {
      handleVote(report.id, report.docId);
    }
  }, [reports, handleVote]);

  const onVerify = useCallback((id) => {
    const report = reports.find(r => r.id?.toString() === id.toString() || r.docId === id);
    if (report) {
      handleVerify(report.id, report.docId);
    }
  }, [reports, handleVerify]);

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
  }, [isFirebaseConfigured]);

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
            { id: "seed_ananya_k", name: "Ananya K.", karma: 340, role: "Street Watcher" }
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
  }, [isFirebaseConfigured, currentUser]);

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
  }, [reports, currentUser, isFirebaseConfigured, incrementUserKarma]);

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

  // Calculate distance between two coordinates in km (Haversine Formula)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    const boundaryLimit = L.latLngBounds([11.7150, 75.4450], [11.7950, 75.5350]);

    // Initialize Map centered on Thalassery Town with restricted panning bounds and zoom levels
    const map = L.map(mapRef.current, {
      center: [11.7490, 75.4891],
      zoom: 14,
      minZoom: 13,
      maxZoom: 18,
      maxBounds: boundaryLimit,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: false
    });

    // Add CartoDB Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    // Draw custom dashed irregular boundary polygon for Thalassery Municipality
    const thalasseryPolygonCoords = [
      [11.766385, 75.4695947],
      [11.7650957, 75.4711298],
      [11.7640887, 75.4726003],
      [11.7637939, 75.4730407],
      [11.7630997, 75.4736629],
      [11.7624012, 75.4742047],
      [11.7619837, 75.4745239],
      [11.7616581, 75.4746795],
      [11.7614608, 75.4747557],
      [11.7613797, 75.4748136],
      [11.7606812, 75.475578],
      [11.7603057, 75.4759455],
      [11.7600536, 75.4761708],
      [11.7597855, 75.476301],
      [11.7595048, 75.476325],
      [11.7593998, 75.4763719],
      [11.7590085, 75.4768601],
      [11.7587651, 75.4772063],
      [11.7585623, 75.4773362],
      [11.7584519, 75.4774068],
      [11.7579455, 75.4774942],
      [11.7578951, 75.4775495],
      [11.7578873, 75.4776916],
      [11.7578741, 75.4779357],
      [11.7576982, 75.4782468],
      [11.7570863, 75.4790139],
      [11.756871, 75.4791963],
      [11.7565617, 75.4795833],
      [11.7562513, 75.4797837],
      [11.7562172, 75.479828],
      [11.7559821, 75.4804958],
      [11.7559333, 75.4805802],
      [11.7557314, 75.4807895],
      [11.7550985, 75.4814655],
      [11.7546967, 75.4818919],
      [11.7543195, 75.4821342],
      [11.7539667, 75.4824659],
      [11.7535229, 75.4830962],
      [11.7531527, 75.4833752],
      [11.7528664, 75.4835388],
      [11.7525566, 75.4836488],
      [11.7522782, 75.4836112],
      [11.7521889, 75.483622],
      [11.7521495, 75.4836488],
      [11.7520287, 75.4838821],
      [11.7518055, 75.4841343],
      [11.7516112, 75.4842201],
      [11.7513092, 75.4842657],
      [11.7512672, 75.4842925],
      [11.7511779, 75.4844373],
      [11.7510046, 75.4844642],
      [11.7507919, 75.4844277],
      [11.750503, 75.4842952],
      [11.7504164, 75.4842174],
      [11.7503586, 75.4841799],
      [11.7503035, 75.4841986],
      [11.7495052, 75.4850382],
      [11.7492688, 75.4851133],
      [11.74898, 75.4851267],
      [11.748397, 75.4850703],
      [11.7479007, 75.484888],
      [11.7477746, 75.4848692],
      [11.7476617, 75.4848745],
      [11.7474273, 75.4850489],
      [11.7473046, 75.4851186],
      [11.7470945, 75.4851964],
      [11.7467216, 75.485183],
      [11.746417, 75.4851803],
      [11.7463172, 75.485242],
      [11.7462909, 75.4853493],
      [11.7464458, 75.4860735],
      [11.7464852, 75.4866126],
      [11.746501, 75.4869345],
      [11.7464196, 75.4874468],
      [11.7463145, 75.4877713],
      [11.7462489, 75.4879564],
      [11.7458397, 75.4886081],
      [11.7454859, 75.4892378],
      [11.7454428, 75.4893199],
      [11.7450934, 75.4898366],
      [11.7447021, 75.4903811],
      [11.7445104, 75.4906467],
      [11.7442295, 75.4909685],
      [11.7440666, 75.4911187],
      [11.743917, 75.4912877],
      [11.7437646, 75.4914299],
      [11.7435047, 75.4917195],
      [11.7433, 75.491874],
      [11.7431528, 75.4920226],
      [11.7428193, 75.4923016],
      [11.7425908, 75.4924464],
      [11.7423938, 75.4925296],
      [11.7422851, 75.492584],
      [11.7421745, 75.4926395],
      [11.7421155, 75.492669],
      [11.7418817, 75.4928327],
      [11.7416848, 75.4930338],
      [11.7414274, 75.4931572],
      [11.7411569, 75.4933181],
      [11.7409285, 75.4934871],
      [11.740721, 75.4937097],
      [11.7404952, 75.4938707],
      [11.740335, 75.493935],
      [11.7402797, 75.4939778],
      [11.74016, 75.4940704],
      [11.7400645, 75.4941443],
      [11.7399716, 75.4941958],
      [11.7397257, 75.494332],
      [11.7395603, 75.494795],
      [11.739274, 75.4946834],
      [11.7390219, 75.4948658],
      [11.738849, 75.494972],
      [11.738417, 75.495265],
      [11.738176, 75.495423],
      [11.737961, 75.4956356],
      [11.7377509, 75.4957482],
      [11.7374883, 75.4959279],
      [11.7372808, 75.4960701],
      [11.7371495, 75.4962149],
      [11.736879, 75.4964402],
      [11.7366875, 75.4965631],
      [11.7365825, 75.4966041],
      [11.7365085, 75.4966761],
      [11.7364245, 75.4967381],
      [11.7363305, 75.4967991],
      [11.7362565, 75.4968701],
      [11.7361715, 75.4969511],
      [11.7361615, 75.4969611],
      [11.7359326, 75.497108],
      [11.7357283, 75.4973157],
      [11.7356873, 75.4973457],
      [11.7354523, 75.4974737],
      [11.7354413, 75.4974827],
      [11.7351973, 75.4976497],
      [11.7350053, 75.4978167],
      [11.734797, 75.497834],
      [11.73474, 75.4977827],
      [11.7346901, 75.4977518],
      [11.7346507, 75.4977518],
      [11.7346179, 75.4978162],
      [11.7345601, 75.4978484],
      [11.7343343, 75.4978618],
      [11.7340625, 75.4978725],
      [11.7340165, 75.4979114],
      [11.7340008, 75.4981139],
      [11.7339115, 75.498189],
      [11.733771, 75.498211],
      [11.733616, 75.498223],
      [11.7331762, 75.4982507],
      [11.7329766, 75.4983526],
      [11.7322977, 75.4988045],
      [11.7320653, 75.49905],
      [11.7321467, 75.4991626],
      [11.7323515, 75.4993182],
      [11.7325511, 75.4994228],
      [11.732819, 75.499506],
      [11.7329529, 75.4995757],
      [11.7330508, 75.4996744],
      [11.7331787, 75.4998446],
      [11.7332563, 75.4999512],
      [11.7332812, 75.5000404],
      [11.7332983, 75.5002235],
      [11.7334269, 75.5003891],
      [11.7336687, 75.5003731],
      [11.733902, 75.5008714],
      [11.7339965, 75.5011362],
      [11.734049, 75.5013796],
      [11.7341274, 75.501572],
      [11.7342294, 75.5018457],
      [11.7342511, 75.501986],
      [11.7342749, 75.502144],
      [11.7342885, 75.5022893],
      [11.7342759, 75.5023546],
      [11.7343365, 75.5025814],
      [11.7343841, 75.5028574],
      [11.7344013, 75.5029902],
      [11.7343947, 75.5030519],
      [11.7344209, 75.5031994],
      [11.7344209, 75.5034032],
      [11.7344052, 75.5035856],
      [11.7343448, 75.5037332],
      [11.734288, 75.503961],
      [11.734236, 75.504135],
      [11.7341321, 75.5043313],
      [11.734076, 75.504457],
      [11.7340244, 75.5046344],
      [11.7339666, 75.5048034],
      [11.733895, 75.504957],
      [11.7338169, 75.5051225],
      [11.733735, 75.505254],
      [11.733613, 75.505401],
      [11.733509, 75.505549],
      [11.733423, 75.5057046],
      [11.7333442, 75.505718],
      [11.7332812, 75.5056939],
      [11.7331709, 75.5056858],
      [11.7329949, 75.5057153],
      [11.7329529, 75.505777],
      [11.7329503, 75.5058092],
      [11.733016, 75.506005],
      [11.7330291, 75.5060962],
      [11.7329871, 75.5061659],
      [11.7329083, 75.5062491],
      [11.732819, 75.5062625],
      [11.7327139, 75.5062437],
      [11.7324369, 75.506001],
      [11.7324093, 75.5059996],
      [11.7323857, 75.5060157],
      [11.73206, 75.5063269],
      [11.7317029, 75.5067319],
      [11.7316648, 75.5067185],
      [11.7315505, 75.5066071],
      [11.7312275, 75.5063014],
      [11.7311934, 75.5063014],
      [11.7311527, 75.5063336],
      [11.7310246, 75.5064886],
      [11.730957, 75.5065924],
      [11.7309807, 75.5066621],
      [11.7312407, 75.5068928],
      [11.7313011, 75.5069974],
      [11.7313063, 75.5071503],
      [11.7307496, 75.5081695],
      [11.7303451, 75.5086899],
      [11.7300274, 75.5090547],
      [11.7298278, 75.5092692],
      [11.7294916, 75.5096045],
      [11.7291029, 75.5099398],
      [11.7287011, 75.5102348],
      [11.7283729, 75.5104548],
      [11.727963, 75.510756],
      [11.727543, 75.5110583],
      [11.7272252, 75.5113238],
      [11.727065, 75.5114096],
      [11.7269494, 75.5114204],
      [11.7267105, 75.511415],
      [11.7266107, 75.5114633],
      [11.7264032, 75.5115572],
      [11.7263244, 75.5116323],
      [11.7261852, 75.5117691],
      [11.7260854, 75.51182],
      [11.7257834, 75.5119434],
      [11.7256258, 75.512048],
      [11.725497, 75.512144],
      [11.7253606, 75.5122733],
      [11.7252266, 75.5123484],
      [11.7249745, 75.5124906],
      [11.7247014, 75.512622],
      [11.7246095, 75.5127078],
      [11.7245149, 75.5128098],
      [11.7244335, 75.5128714],
      [11.7240448, 75.5130672],
      [11.7238111, 75.5131893],
      [11.7237349, 75.513255],
      [11.7236194, 75.5133542],
      [11.7235406, 75.5134374],
      [11.7233856, 75.5135393],
      [11.7230416, 75.5136386],
      [11.7229707, 75.5136761],
      [11.7228446, 75.5137646],
      [11.7224609, 75.515036],
      [11.722297, 75.5167054],
      [11.7231364, 75.5175021],
      [11.7235616, 75.5183687],
      [11.7221757, 75.5192895],
      [11.7223951, 75.519817],
      [11.722717, 75.5205908],
      [11.7234804, 75.5211052],
      [11.7248055, 75.5211018],
      [11.7258379, 75.521026],
      [11.7261557, 75.521576],
      [11.7264787, 75.5222744],
      [11.7263397, 75.5231828],
      [11.7244672, 75.5245108],
      [11.7239319, 75.5248904],
      [11.7245272, 75.5269971],
      [11.7263111, 75.5265863],
      [11.7297556, 75.5280262],
      [11.7308021, 75.5295467],
      [11.7318557, 75.5316406],
      [11.7338569, 75.5324869],
      [11.7345344, 75.533093],
      [11.7347614, 75.5333738],
      [11.7347255, 75.5337714],
      [11.7344193, 75.5371629],
      [11.7355085, 75.5390774],
      [11.737652, 75.5393067],
      [11.742184, 75.5398572],
      [11.7427937, 75.5399313],
      [11.7464068, 75.5400164],
      [11.7466682, 75.5399212],
      [11.7492138, 75.5389945],
      [11.7498253, 75.5382848],
      [11.7498253, 75.5367235],
      [11.7504645, 75.53661],
      [11.7516874, 75.5361558],
      [11.7518263, 75.5347364],
      [11.7524378, 75.5333738],
      [11.7535549, 75.5326358],
      [11.7551892, 75.532437],
      [11.7575515, 75.5327777],
      [11.7579405, 75.5313016],
      [11.7579061, 75.530928],
      [11.7581224, 75.5292766],
      [11.7569737, 75.5284881],
      [11.7576854, 75.5272832],
      [11.7591677, 75.5263634],
      [11.7591764, 75.5257423],
      [11.7593305, 75.5251445],
      [11.7599151, 75.5246446],
      [11.7593103, 75.5233814],
      [11.7588048, 75.5222258],
      [11.7585107, 75.5215533],
      [11.7583834, 75.520849],
      [11.7582337, 75.5200213],
      [11.758385, 75.5197132],
      [11.7588274, 75.5188119],
      [11.7591809, 75.5182286],
      [11.7598122, 75.5175282],
      [11.75997, 75.5172863],
      [11.7600881, 75.5170593],
      [11.7598623, 75.5166006],
      [11.7592212, 75.5163234],
      [11.7588221, 75.5156904],
      [11.7593169, 75.513868],
      [11.7616318, 75.5150628],
      [11.7619702, 75.5142764],
      [11.7607915, 75.5137753],
      [11.7588694, 75.5114472],
      [11.7595023, 75.5097833],
      [11.7584662, 75.5088388],
      [11.7584279, 75.5079823],
      [11.7585764, 75.5077398],
      [11.7587867, 75.5073964],
      [11.7589787, 75.5072234],
      [11.7601226, 75.5065655],
      [11.7616144, 75.5063295],
      [11.7625452, 75.5060268],
      [11.763449, 75.5058933],
      [11.7639324, 75.5054109],
      [11.7644203, 75.5049459],
      [11.7652669, 75.5043289],
      [11.7655809, 75.5044006],
      [11.7656902, 75.5044255],
      [11.7664108, 75.5045026],
      [11.767158, 75.5040224],
      [11.7684337, 75.5030249],
      [11.7685287, 75.5029506],
      [11.7700575, 75.5028414],
      [11.7708102, 75.5029065],
      [11.7718033, 75.5030328],
      [11.7728872, 75.502875],
      [11.7733067, 75.5016887],
      [11.7745719, 75.5014264],
      [11.7751239, 75.5009058],
      [11.7752207, 75.5004218],
      [11.7752966, 75.5000424],
      [11.7748294, 75.4986474],
      [11.7749412, 75.4983184],
      [11.7756405, 75.4976952],
      [11.7765142, 75.4967837],
      [11.7771243, 75.4955086],
      [11.7779949, 75.4949447],
      [11.7783807, 75.4946948],
      [11.7794261, 75.4940991],
      [11.7804056, 75.4939186],
      [11.7812611, 75.4945827],
      [11.7817769, 75.4952896],
      [11.7826907, 75.4951715],
      [11.7829007, 75.4943991],
      [11.7827012, 75.4938304],
      [11.7823596, 75.4931829],
      [11.7818573, 75.4925868],
      [11.7819593, 75.492208],
      [11.7828482, 75.4919368],
      [11.7837178, 75.4915409],
      [11.7838064, 75.4908062],
      [11.7838446, 75.4887372],
      [11.7835932, 75.4872446],
      [11.7835467, 75.4859486],
      [11.7834486, 75.4842323],
      [11.7820486, 75.484335],
      [11.780812, 75.4840511],
      [11.7798129, 75.4824042],
      [11.7794781, 75.4816808],
      [11.7776162, 75.4794666],
      [11.7770294, 75.4787888],
      [11.7756708, 75.4772195],
      [11.7749901, 75.4750382],
      [11.7739202, 75.4737465],
      [11.7722528, 75.4727956],
      [11.7712668, 75.4721566],
      [11.7706352, 75.4717472],
      [11.770238, 75.4714898],
      [11.7689876, 75.4710765],
      [11.7688207, 75.4710214],
      [11.7675423, 75.4705388],
      [11.766385, 75.4695947]
    ];

    L.polygon(thalasseryPolygonCoords, {
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.015,
      weight: 1.5,
      dashArray: '5, 8'
    }).addTo(map).bindTooltip('Thalassery Municipal Boundary Limit', {
      permanent: true,
      direction: 'top',
      className: 'custom-town-tooltip'
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    setMapInstance(map);

    // Add click handler to pick coordinates
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setFormLat(lat);
      setFormLng(lng);

      // Auto-find closest district
      let closestDistrict = initialDistricts[0];
      let minDistance = Infinity;
      
      initialDistricts.forEach(d => {
        const dist = getDistance(lat, lng, d.lat, d.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestDistrict = d;
        }
      });

      setFormZone(closestDistrict.name);
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
        text: `Map clicked: Coords set to (${lat.toFixed(4)}, ${lng.toFixed(4)}). Auto-selected ${closestDistrict.name.split(" ")[0]}.` 
      }]);
    });

    return () => {
      map.remove();
    };
  }, []);

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
        html: `<div class="w-6 h-6 rounded-full border border-[#1b1d24]/60 flex items-center justify-center bg-[#101115]/90 backdrop-blur-sm shadow-xl"><div class="w-2.5 h-2.5 rounded-full ${colorClass}"></div></div>`,
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
      const pingHtml = issue.showPing 
        ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${issue.pingBg} opacity-75"></span>` 
        : '';

      const markerIcon = L.divIcon({
        className: 'custom-issue-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute flex h-5 w-5">
              ${pingHtml}
              <span class="relative inline-flex rounded-full h-3 w-3 ${issue.bgClass} border border-black/40 shadow-lg"></span>
            </span>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([issue.lat, issue.lng], { icon: markerIcon });

      const popupDiv = document.createElement('div');
      popupDiv.className = 'font-mono text-xs text-[#e2e8f0]';
      popupDiv.style.minWidth = '220px';
      
      const badgeColor = issue.severity === 'critical' ? 'bg-red-950/40 text-red-400 border-red-500/20' : 'bg-amber-950/40 text-amber-400 border-amber-500/20';

      const actionButtonsHtml = issue.status === 'resolved' 
        ? `<div class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider text-center py-1">✓ Issue Resolved</div>`
        : `
          <button id="map-vote-btn-${issue.id}" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1 px-2 rounded transition-colors text-center cursor-pointer">
            ▲ UPVOTE (${issue.upvotes})
          </button>
          <button id="map-verify-btn-${issue.id}" class="flex-1 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white text-[10px] font-bold py-1 px-2 rounded transition-colors text-center cursor-pointer">
            VERIFY
          </button>
        `;

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
        <div class="text-[10px] text-[#7d8590] mb-3">Community Verifications: <span class="text-white font-bold">${issue.verifications}</span></div>
        <div class="flex items-center gap-2 border-t border-[#1b1d24]/60 pt-2">
          ${actionButtonsHtml}
        </div>
      `;

      marker.bindPopup(popupDiv);

      marker.on('popupopen', () => {
        const voteBtn = document.getElementById(`map-vote-btn-${issue.id}`);
        const verifyBtn = document.getElementById(`map-verify-btn-${issue.id}`);

        if (voteBtn) {
          voteBtn.onclick = () => {
            handleVote(issue.id, issue.docId);
            marker.closePopup();
          };
        }
        if (verifyBtn) {
          verifyBtn.onclick = () => {
            handleVerify(issue.id, issue.docId);
            marker.closePopup();
          };
        }
      });

      reportMarkersGroup.current.addLayer(marker);
    });
  }, [mappedIncidents, mapInstance, handleVote, handleVerify]);

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
          stroke: false
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
          const result = await analyzeIssueImage(rawBase64, mimeType, formType, formDetails || "Unknown Location", formZone);
          setIsImageVerifying(false);
          if (result.isValid) {
            setImageVerified(true);
            setVerifiedConfidence(Math.floor(90 + Math.random() * 9));
            setVerifiedDetails(result.description);
            setAiDraftedLetter(result.letterDraft);
            setAiLogs(prev => [...prev, { 
              id: `log-upload-${Date.now()}-${Math.random()}`, 
              type: "success", 
              text: `Gemini Vision: Photo verified as valid ${formType}. Drafted municipal letter.` 
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
This is to notify the Thalassery Municipality regarding ${formType} observed at ${formDetails || "specified location"} in the ${formZone} ward. Standard image comparison confirms surface changes.

Please initiate inspections.

Coordinates: Lat ${formLat.toFixed(5)}, Lng ${formLng.toFixed(5)}
Report Reference: #CF-${generatedRef}`);
      setAiLogs(prev => [...prev, { 
        id: `log-upload-${Date.now()}-${Math.random()}`, 
        type: "success", 
        text: "Mock Vision: Image analyzed. Simulated validation confirmed structural issue." 
      }]);
    }, 1500);
  };

  // Submit new issue (Overlay Modal form)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Required validations
    if (!formType) {
      alert("Please select an issue category.");
      return;
    }
    if (!formZone) {
      alert("Please select a ward/sector.");
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
    if (formLat === undefined || formLng === undefined || formLat === null || formLng === null) {
      alert("Please select coordinates on the map.");
      return;
    }

    setIsSubmitting(true);
    
    const generatedRef = Math.floor(1000 + Math.random() * 9000);
    const draftLetter = aiDraftedLetter || `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Grievance regarding ${formType} at ${formDetails}.

Respected Sir/Madam,
This is to notify the Thalassery Municipality regarding ${formType} at ${formDetails} (${formZone}). Community sensors have validated this concern.

Coordinates: Lat ${formLat.toFixed(5)}, Lng ${formLng.toFixed(5)}
Report Reference: #CF-${generatedRef}`;

    const zoneName = DISTRICT_TO_ZONE[formZone] || "Court Corridor";
    const defaultWardsForZone = {
      "Court Corridor": "11",
      "Seafront": "33",
      "North Uplands": "1",
      "Chirakkara Hills": "13",
      "South Highway": "22",
      "Heritage Quarter": "6"
    };
    const wardCode = defaultWardsForZone[zoneName] || "11";
    const derivedZone = Object.keys(WARD_ZONES).find(z => WARD_ZONES[z].includes(wardCode)) || zoneName;

    const newReport = {
      id: Date.now(),
      type: formType,
      location: formDetails,
      description: formDescription,
      details: formDescription || verifiedDetails || "Citizen reported infrastructure issue verified by community tools.",
      zone: derivedZone, // Write new derived zone name (e.g. Kannoth–Court Corridor)
      ward: wardCode,
      status: "open",
      timeAgo: "Just now",
      severity: imageVerified ? "critical" : "warning",
      votes: 1,
      verifications: imageVerified ? 1 : 0,
      user: "You (Volunteer)",
      streetViewStatus: imageVerified ? "verified" : "unverified",
      letterDrafted: draftLetter,
      lat: formLat,
      lng: formLng,
      reporterUid: currentUser ? currentUser.uid : null,
      reportedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      try {
        await addDoc(collection(db, 'reports'), newReport);
        setAiLogs(prev => [...prev, { id: `log-submit-db-${Date.now()}-${Math.random()}`, type: "success", text: `Firestore: Report added for ${formZone}.` }]);
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

    setIsSubmitting(false);
    setIsReportModalOpen(false);
    
    // Reset form states
    setFormDetails("");
    setFormDescription("");
    setImageVerified(false);
    setUploadedImage(null);
    setAiDraftedLetter("");
    setVerifiedDetails("");
    
    setAiLogs(prev => [...prev, { id: `log-submit-${Date.now()}-${Math.random()}`, type: "success", text: `Report successfully uploaded and pinned to ${formZone} layout.` }]);
  };




  return (
    <div className="h-screen bg-[#08090c] text-[#e2e8f0] flex flex-col font-mono selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* Background radial gradient matches Singapore dashboard style */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,17,21,0.4)_0%,rgba(7,8,10,0.8)_100%)] pointer-events-none z-0"></div>

      {/* HEADER NAVBAR (Matches Smart City Platform aesthetic with Glassmorphism) */}
      <header className="sticky top-0 z-40 w-full bg-[#0c0d12]/75 backdrop-blur-lg border-b border-[#1b1d24]/60 h-14 flex items-center justify-between px-4 sm:px-6 flex-none">
        
        {/* Left Side: Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded border border-blue-500/10 bg-blue-950/10 text-blue-400">
            <Activity size={18} />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">CivicFix</span>
        </div>

        {/* Right Actions: Weather/Location info & Report button */}
        <div className="flex items-center gap-4">
          
          {/* Volunteer Status Badge */}
          {currentUserWarden && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#7d8590] bg-[#16171d] border border-[#1b1d24] px-3 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
              <span className="text-white font-bold truncate max-w-[70px] sm:max-w-[120px]">
                {currentUserWarden.name}
              </span>
              <span className="text-[#3b4453] font-bold">|</span>
              <span className="text-cyan-400 font-bold">
                {currentUserWarden.karma} KP
              </span>
            </div>
          )}
          
          {/* Location & Weather details (Metric conversion to Celsius) */}
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-mono text-[#7d8590] bg-[#16171d] border border-[#1b1d24] px-3 py-1 rounded">
            <span className="flex items-center gap-1 text-white">
              <MapPin size={10} className="text-blue-400" />
              Thalassery, IN
            </span>
            <span className="text-[#3b4453] font-bold">|</span>
            <span className="flex items-center gap-1 text-amber-400">
              <CloudSun size={11} />
              {currentTemp}, {currentTime || "11:00 PM"}
            </span>
          </div>

          {/* Refresh Grid */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 flex items-center justify-center border border-[#1b1d24] bg-[#16171d] text-[#7d8590] hover:text-white transition-all rounded hover:bg-[#1d1e26]"
            aria-label="Refresh data"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin text-blue-400" : ""} />
          </button>

          {/* REPORT BUTTON */}
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="h-8.5 px-3.5 flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-700 text-[10px] font-semibold font-mono tracking-wider uppercase border border-blue-400/20 shadow-[0_0_12px_rgba(37,99,235,0.25)] transition-all hover:scale-[1.02]"
          >
            <PlusCircle size={12} />
            <span>Report Issue</span>
          </button>
        </div>
      </header>

      {/* DYNAMIC LIVE SCROLLING TICKER */}
      <LiveTicker incidents={mappedIncidents} floodRisk={floodRisk} />

      {/* MAIN CONTAINER WITH SIDEBAR & CONTENT */}
      <div 
        style={{ height: 'calc(100vh - 56px - 34px - 48px - 32px)' }} 
        className="flex-shrink-0 overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-[380px_1fr_380px] gap-3 p-3 md:p-4"
      >
        <LeftPanel
          incidents={mappedIncidents}
          previousScores={previousScores}
          activeZone={selectedZone === "All" ? null : (DISTRICT_TO_ZONE[selectedZone] || selectedZone)}
          onZoneSelect={(zoneName) => {
            if (zoneName) {
              const distName = ZONE_TO_DISTRICT[zoneName];
              setSelectedZone(distName || "All");
            } else {
              setSelectedZone("All");
            }
          }}
          onIncidentFocus={(incident) => handleMapFocus(incident.lat, incident.lng)}
          onUpvote={onUpvote}
          onVerify={onVerify}
          onAutoEscalate={onAutoEscalate}
          onAgentLog={onAgentLog}
        />

        {/* Center column: Map & Stability */}
        <div className="flex flex-col gap-3 h-full overflow-hidden">

          {/* INTERACTIVE LIVE TACTICAL MAP (with Glassmorphism) */}
          <section className="flex-1 min-h-0 border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-3 flex flex-col gap-2 rounded shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden">
            
            {/* Map Header details */}
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2">
              <div className="flex items-center gap-2">
                <Globe className="text-blue-400" size={15} />
                <h3 className="text-base font-bold text-white tracking-wide">Interactive Tactical Map (Thalassery Town)</h3>
              </div>
              <span className="text-[10px] bg-blue-950/30 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold leading-none">LIVE OSM</span>
            </div>

            {/* Interactive Leaflet Map Container */}
            <div ref={mapRef} className="flex-1 w-full rounded border border-[#1b1d24]/50 z-20 relative min-h-0"></div>

            {/* Map Mode selector buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => { setSelectedZone("All"); setShowHazardHeatmap(false); handleMapFocus(11.7490, 75.4891, 14); }}
                className={`backdrop-blur-sm border px-3 py-2 text-left rounded flex items-center gap-2 transition-colors ${
                  selectedZone === "All" && !showHazardHeatmap
                    ? "border-blue-500/40 bg-blue-950/20 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]" 
                    : "border-[#1b1d24]/40 bg-[#16171d]/60 text-[#7d8590] hover:text-white hover:border-blue-500/50"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#1e2029]/80 flex items-center justify-center">
                  <Globe size={13} className="text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-tight">Town Overview</span>
                  <span className="text-[10px] text-[#8e8e8f] leading-tight">Reset map focus</span>
                </div>
              </button>

              <button 
                onClick={() => setShowHazardHeatmap(!showHazardHeatmap)}
                className={`backdrop-blur-sm border px-3 py-2 text-left rounded flex items-center gap-2 transition-colors ${
                  showHazardHeatmap 
                    ? "border-amber-500/40 bg-amber-950/20 text-white shadow-[0_0_10px_rgba(245,158,11,0.15)]" 
                    : "border-[#1b1d24]/40 bg-[#16171d]/60 text-[#7d8590] hover:text-white hover:border-blue-500/50"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#1e2029]/80 flex items-center justify-center">
                  <AlertCircle size={13} className="text-amber-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-tight">Hazard Heatmap</span>
                  <span className="text-[10px] text-[#8e8e8f] leading-tight">Toggle flood overlay</span>
                </div>
              </button>
            </div>
          </section>

          {/* CIVIC STABILITY HEALTH & SPARKLINE GRAPH (Bottom Center with Glassmorphism) */}
          <section className="h-[160px] flex-shrink-0 overflow-hidden border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-3 flex flex-col gap-1.5 rounded shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-1">
              <div className="flex items-center gap-2">
                <Activity className="text-blue-400" size={15} />
                <h3 className="text-base font-bold text-white tracking-wide">Civic Stability Health</h3>
              </div>
              <span className="text-xs text-[#9ca3af] uppercase">90-Day Trend</span>
            </div>

            {/* Sparkline chart (Color-coded from Good to Critical) */}
            <div className="h-8 w-full pt-0.5">
              <svg viewBox="0 0 400 50" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <line x1="0" y1="10" x2="400" y2="10" stroke="#22242e" strokeWidth="0.5" strokeDasharray="2,4" />
                <line x1="0" y1="30" x2="400" y2="30" stroke="#22242e" strokeWidth="0.5" strokeDasharray="2,4" />
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
                    <stop offset="100%" stopColor="#000000" />
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
            <div className="flex items-end gap-[3px] h-8 pt-1 border-t border-[#1b1d24]/50" role="img">
              {stabilityBuckets.map((b, i) => {
                const maxActive = Math.max(...stabilityBuckets.map(bucket => bucket.activeCount), 5);
                const heightPercentage = Math.max(8, (b.activeCount / maxActive) * 100);

                let bg = "bg-emerald-500";
                if (b.stability < 60) bg = "bg-red-500";
                else if (b.stability < 85) bg = "bg-amber-500";

                return (
                  <div key={i} className="flex-1 h-full min-w-[2px] rounded-t-[1px]" style={{ height: `${heightPercentage}%` }}>
                    <div className={`w-full h-full ${bg} opacity-80 hover:opacity-100`} title={`Active count: ${b.activeCount}, Stability: ${b.stability}%`}></div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-[#7d8590]">
              <span>30 MIN AGO</span>
              <span>NOW</span>
            </div>
          </section>

        </div>

        <RightPanel incidents={mappedIncidents} wardens={mappedWardens} onAgentLog={onAgentLog} />

    </div>

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
                    onChange={(e) => setFormType(e.target.value)}
                    className="bg-[#16171d] border border-[#1b1d24] text-xs px-3 py-2 text-white focus:outline-none focus:border-blue-500 rounded"
                  >
                    <option value="Pothole">Pothole</option>
                    <option value="Drainage">Drainage</option>
                    <option value="Water Leakage">Water Leakage</option>
                    <option value="Streetlight">Streetlight</option>
                    <option value="Waste">Waste</option>
                    <option value="Obstruction">Obstruction</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Ward / Sector Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Ward / Sector
                  </label>
                  <select
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    className="bg-[#16171d] border border-[#1b1d24] text-xs px-3 py-2 text-white focus:outline-none focus:border-blue-500 rounded"
                  >
                    {districts.map(d => (
                      <option key={d.name} value={d.name}>{d.name}</option>
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

                {/* Selected Map Coordinates */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Incident Coordinates (Selected from Map)
                  </label>
                  <div className="bg-[#16171d]/60 border border-[#1b1d24] text-xs px-3 py-2 text-white rounded flex items-center justify-between">
                    <span className="font-mono text-blue-400">
                      Lat: {formLat.toFixed(5)} / Lng: {formLng.toFixed(5)}
                    </span>
                    <span className="text-[9px] text-[#555] uppercase font-bold select-none">Read-Only</span>
                  </div>
                </div>

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
              className="bg-[#101115] border border-[#1b1d24] w-full max-w-lg rounded shadow-2xl flex flex-col h-[520px]"
            >
              {/* Header */}
              <div className="border-b border-[#1b1d24] bg-[#121318] p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400">
                  <FileText size={16} />
                  <span className="text-xs font-bold font-sans uppercase tracking-wide text-white">AI Grievance Draftsman</span>
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

              {/* Action Bar */}
              <div className="border-t border-[#1b1d24] bg-[#121318] p-3.5 flex items-center justify-between gap-3">
                <span className="text-[8px] font-mono text-[#555] uppercase">Ready for submission</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveLetter(null)}
                    className="border border-[#1b1d24] hover:bg-[#16171d] text-[#8e8e8f] hover:text-white px-3.5 py-1.5 rounded text-xs transition-colors font-mono"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setAiLogs(prev => [...prev, { 
                        id: `log-dispatch-${activeLetter.id}-${Date.now()}`, 
                        type: "success", 
                        text: `Dispatched formal PWD notice for report #CF-${activeLetter.id.toString().substring(0, 4)} to Municipal Board.` 
                      }]);
                      
                      const reportId = activeLetter.id;
                      const docId = activeLetter.docId;
                      if (isFirebaseConfigured && docId) {
                        updateDoc(doc(db, 'reports', docId), { status: 'dispatched' });
                      } else {
                        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'dispatched' } : r));
                      }

                      setActiveLetter(null);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-xs transition-colors font-mono font-bold"
                  >
                    Submit to Commissioner
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
                  <span className="text-xs font-bold font-sans uppercase tracking-wide text-white">Google StreetView AI Cross-Check</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Historical StreetView */}
                  <div className="border border-[#1b1d24] bg-[#16171d] p-3.5 rounded flex flex-col gap-2">
                    <span className="text-[9px] font-mono text-[#7d8590] uppercase">Historical Google StreetView (Jan 2026)</span>
                    <div className="w-full h-36 bg-black/60 border border-[#1b1d24] rounded flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>
                      <div className="text-[#8e8e8f] font-mono text-[10px] text-center p-4 leading-relaxed">
                        [ MOCKED STREETVIEW CAMERA PAN ]<br/>
                        <span className="text-[#444] text-[9px]">Road Surface: Clear, Intact</span>
                      </div>
                      <span className="absolute bottom-2 left-2 text-[8px] font-mono bg-black/80 px-1 py-0.5 rounded text-[#555]">
                        11.745° N, 75.485° E
                      </span>
                    </div>
                  </div>

                  {/* Citizen Upload */}
                  <div className="border border-[#1b1d24] bg-[#16171d] p-3.5 rounded flex flex-col gap-2">
                    <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">Uploaded Citizen Photo (Today)</span>
                    <div className="w-full h-36 bg-black/60 border border-[#1b1d24] rounded flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
                      <div className="text-red-400 font-mono text-[10px] text-center p-4 leading-relaxed">
                        [ USER CAMERA CAPTURE ]<br/>
                        <span className="text-red-300 font-bold uppercase text-[9px]">{activeStreetCheck.type} detected</span>
                      </div>
                      <span className="absolute bottom-2 left-2 text-[8px] font-mono bg-black/80 px-1 py-0.5 rounded text-[#555]">
                        Verified Mobile EXIF Data
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Verification Verdict */}
                <div className="border border-emerald-500/25 bg-emerald-500/5 p-4 rounded flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-400 mt-0.5 shrink-0" size={16} />
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">Gemini Vision AI Analysis Verdict</h4>
                    <p className="text-[11px] text-[#8e8e8f] mt-1 leading-relaxed">
                      Location data matched with Google StreetView coordinates. Surface comparison confirms **recent structural degradation** (newly formed potholes/blockages not present in baseline street archives). High confidence rating logged.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="border-t border-[#1b1d24] bg-[#121318] p-3.5 flex justify-end">
                <button
                  onClick={() => setActiveStreetCheck(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-xs transition-colors font-mono font-bold"
                >
                  Confirm Verification
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer 
        style={{ height: '48px' }} 
        className="flex-shrink-0 flex flex-col items-center justify-center border-t border-[#1b1d24]/60 bg-[#0c0d12]/80 backdrop-blur-md py-2 px-4 text-center text-[#666] font-mono text-[10px] leading-relaxed relative z-10"
      >
        <div>CivicFix v0.4.0 • Thalassery Town Community Command Center.</div>
        <div className="mt-1 flex items-center justify-center gap-1.5 flex-wrap">
          <span>Developed with ❤️ by <span className="text-white font-bold">Harshith</span> for the</span>
          <span className="text-white hover:text-red-500 transition-colors cursor-pointer flex items-center gap-0.5 font-bold">
            Vibe2Ship Hackathon <Heart className="fill-red-500 stroke-red-500 inline-block shrink-0" size={11} />
          </span>
        </div>
      </footer>

      {/* Spacer to reserve room for the ConsoleDrawer */}
      <div className="h-8 flex-shrink-0" />

      {/* Floating collapsible AI Agent Console Drawer */}
      <ConsoleDrawer logs={agentLogs} />

    </div>
  );
}

export default App;
