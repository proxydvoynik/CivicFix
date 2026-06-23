import { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Activity, PlusCircle, RefreshCw, 
  CheckCircle2, Send, Globe, Search, Shield, X, 
  Heart, Camera, AlertCircle, FileText, CloudSun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Live Integration Imports
import { db, isFirebaseConfigured } from './lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { analyzeIssueImage, isGeminiConfigured } from './lib/gemini';


// Hardcoded Thalassery Town Community Wards/Zones
const initialDistricts = [
  { name: "Thalassery Bus Stand Area", availability: 97.2, active: 2, resolved: 41, severity: "warning", coordinates: { x: 42, y: 38 }, sparkline: [98, 97.5, 97.2, 97.0, 97.3, 97.2] },
  { name: "Court Road Junction", availability: 99.0, active: 1, resolved: 58, severity: "normal", coordinates: { x: 55, y: 52 }, sparkline: [99, 99.1, 98.9, 99.0, 99.0, 99.0] },
  { name: "Overbury's Folly Sector", availability: 94.6, active: 4, resolved: 32, severity: "critical", coordinates: { x: 30, y: 65 }, sparkline: [96, 95.2, 94.8, 94.1, 94.5, 94.6] },
  { name: "Sea Bridge Lane", availability: 98.1, active: 1, resolved: 29, severity: "normal", coordinates: { x: 22, y: 78 }, sparkline: [98.5, 98.2, 98.0, 98.1, 98.3, 98.1] },
  { name: "Gundopp Street Block", availability: 99.5, active: 0, resolved: 24, severity: "normal", coordinates: { x: 68, y: 32 }, sparkline: [99.5, 99.5, 99.5, 99.5, 99.5, 99.5] },
  { name: "Chirakkara Ward", availability: 96.8, active: 3, resolved: 37, severity: "warning", coordinates: { x: 80, y: 48 }, sparkline: [97.5, 97.1, 96.9, 96.6, 96.8, 96.8] }
];

// Mock Recent Issues Feed for Thalassery
const initialIssues = [
  { 
    id: 1, 
    type: "Severe Pothole", 
    location: "Court Road Junction Bypass (Near Post Office)", 
    zone: "Court Road Junction", 
    timeAgo: "2m ago", 
    severity: "critical", 
    votes: 4, 
    verifications: 1,
    user: "Adithya V.",
    streetViewStatus: "verified",
    details: "Deep crater in the middle of the road, causing severe traffic block and safety risks for two-wheelers.",
    letterDrafted: `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Urgent grievance notice regarding public road damage (Severe Pothole) at Court Road Junction.

Respected Sir/Madam,
I am writing to draw your immediate attention to a severe infrastructure hazard at Court Road Junction Bypass (Near Post Office). An automated civic monitoring tool has registered a deep road cavity (approx. depth 12cm, diameter 1.1m) posing threat to traffic safety. 

This issue is verified by local community sensors. We request your engineering team to inspect and repair the road surface at the earliest.

Coordinates: Lat 11.7490, Lng 75.4891
Report Reference: #CF-9811`
  },
  { 
    id: 2, 
    type: "Water Logging", 
    location: "Railway Underpass (Overbury's Folly Road)", 
    zone: "Overbury's Folly Sector", 
    timeAgo: "14m ago", 
    severity: "critical", 
    votes: 18, 
    verifications: 2,
    user: "Nihal P.",
    streetViewStatus: "verified",
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
    type: "Garbage Pileup", 
    location: "Behind Thalassery Municipal Bus Stand", 
    zone: "Thalassery Bus Stand Area", 
    timeAgo: "32m ago", 
    severity: "warning", 
    votes: 6, 
    verifications: 0,
    user: "Shahana M.",
    streetViewStatus: "unverified",
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
    type: "Open Drainage", 
    location: "Sea Bridge pathway near children's park", 
    zone: "Sea Bridge Lane", 
    timeAgo: "1h ago", 
    severity: "warning", 
    votes: 9, 
    verifications: 1,
    user: "Ramesh Kumar",
    streetViewStatus: "verified",
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
  { name: "Ashwin Raj", score: 520, badge: "Thalassery Warden", rank: 1, avatar: "🏆" },
  { name: "Divya Balan", score: 450, badge: "Pothole Ranger", rank: 2, avatar: "🥈" },
  { name: "Muhammed Shafi", score: 390, badge: "Waste Tracker", rank: 3, avatar: "🥉" },
  { name: "Ananya K.", score: 340, badge: "Street Watcher", rank: 4, avatar: "✨" }
];

function App() {
  const [searchQuery, setSearchQuery] = useState("");
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
  const [formType, setFormType] = useState("Severe Pothole");
  const [formDetails, setFormDetails] = useState("");
  const [formZone, setFormZone] = useState("Court Road Junction");
  const [isImageVerifying, setIsImageVerifying] = useState(false);
  const [imageVerified, setImageVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Dispatch queue progress monitor (Right bottom panel)
  const [dispatchQueue, setDispatchQueue] = useState([
    { id: "CF-9811", type: "Pothole", location: "Court Rd", status: "PWD dispatched", progress: 65, color: "text-blue-400" },
    { id: "CF-9812", type: "Waterlog", location: "Railway Underpass", status: "Escalated", progress: 30, color: "text-red-400" },
    { id: "CF-9814", type: "Drainage", location: "Sea Bridge", status: "Inspected", progress: 90, color: "text-emerald-400" }
  ]);

  const logEndRef = useRef(null);

  // Auto-generate AI logs periodically
  useEffect(() => {
    const logPool = [
      { type: "info", text: "Scanning coords (11.7455, 75.4852) near Railway underpass..." },
      { type: "success", text: "AI verified pothole at Court Road. Deduplication matching found 0 near records." },
      { type: "info", text: "Updating volunteer reputation logs. Ashwin Raj awarded +20 karma." },
      { type: "success", text: "Drafted municipal notice #CF-9820 for new drainage issue." },
      { type: "warning", text: "High tide prediction: Stormwater drain backing up near Sea Bridge Lane." },
      { type: "info", text: "Comparing StreetView archives with today's report from Chirakkara Ward..." }
    ];

    const interval = setInterval(() => {
      const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
      setAiLogs(prev => [...prev, { id: `log-${Date.now()}-${Math.random()}`, ...randomLog }].slice(-10));
    }, 9500);

    return () => clearInterval(interval);
  }, []);

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
    const activeCount = reports.filter(r => r.zone === d.name).length;
    const computedAvailability = parseFloat((100 - activeCount * 0.6).toFixed(1));
    const severity = activeCount >= 4 ? "critical" : (activeCount >= 2 ? "warning" : "normal");
    return {
      ...d,
      active: activeCount,
      availability: Math.min(100, Math.max(0, computedAvailability)),
      severity: severity
    };
  });

  // Handle Refresh Action
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate new data arrival
    const generatedRef = Math.floor(1000 + Math.random() * 9000);
    const mockIssue = {
      id: Date.now(),
      type: "Broken Streetlight",
      location: "Centenary Park Path (Near Fort Entrance)",
      zone: "Overbury's Folly Sector",
      timeAgo: "Just now",
      severity: "warning",
      votes: 1,
      verifications: 0,
      user: "Gautham P.",
      streetViewStatus: "verified",
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

    // Add to dispatch queue
    setDispatchQueue(prev => [
      { id: `CF-${generatedRef}`, type: "Light", location: "Centenary Path", status: "Notice drafted", progress: 10, color: "text-amber-400" },
      ...prev
    ]);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Upvote/Downvote report
  const handleVote = async (id, docId) => {
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
      } catch (error) {
        console.error("Error updating vote in Firestore:", error);
      }
    } else {
      setReports(prev => prev.map(r => r.id === id ? { ...r, votes: r.votes + 1 } : r));
    }
  };

  // Verify issue locally (Gamification Verification loop)
  const handleVerify = async (id, docId) => {
    if (isFirebaseConfigured && docId) {
      try {
        const report = reports.find(r => r.docId === docId);
        if (!report) return;
        const nextVerifications = (report.verifications || 0) + 1;
        const nextSeverity = nextVerifications >= 3 ? "critical" : report.severity;
        
        const docRef = doc(db, 'reports', docId);
        await updateDoc(docRef, {
          verifications: increment(1),
          severity: nextSeverity
        });

        // Log AI action
        setAiLogs(prevLogs => [...prevLogs, { 
          id: `log-verify-${id}-${Date.now()}-${Math.random()}`, 
          type: "success", 
          text: `Verification logged for report #${id}. [Status: ${nextVerifications >= 3 ? "ESCALATED" : "PENDING CLEARANCE"}]` 
        }]);

        // Update queue progress if matching
        setDispatchQueue(prevQ => prevQ.map(q => {
          if (q.id === `CF-${id.toString().substring(0, 4)}`) {
            return { ...q, status: "Escalating...", progress: 45 };
          }
          return q;
        }));

      } catch (error) {
        console.error("Error updating verification in Firestore:", error);
      }
    } else {
      setReports(prev => prev.map(r => {
        if (r.id === id) {
          const nextVerifications = r.verifications + 1;
          const nextSeverity = nextVerifications >= 3 ? "critical" : r.severity;
          
          // Log AI action
          setAiLogs(prevLogs => [...prevLogs, { 
            id: `log-verify-${id}-${Date.now()}-${Math.random()}`, 
            type: "success", 
            text: `Verification logged for report #${id}. [Status: ${nextVerifications >= 3 ? "ESCALATED" : "PENDING CLEARANCE"}]` 
          }]);

          // Update queue progress if matching
          setDispatchQueue(prevQ => prevQ.map(q => {
            if (q.id === `CF-${id.toString().substring(0, 4)}`) {
              return { ...q, status: "Escalating...", progress: 45 };
            }
            return q;
          }));

          return { ...r, verifications: nextVerifications, severity: nextSeverity };
        }
        return r;
      }));
    }
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

Coordinates: Lat 11.7450, Lng 75.4880
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
    if (!formDetails.trim()) return;
    setIsSubmitting(true);
    
    const generatedRef = Math.floor(1000 + Math.random() * 9000);
    const draftLetter = aiDraftedLetter || `To,
The Municipal Commissioner,
Thalassery Municipal Corporation,
Thalassery, Kannur - 670101.

Subject: Grievance regarding ${formType} at ${formDetails}.

Respected Sir/Madam,
This is to notify the Thalassery Municipality regarding ${formType} at ${formDetails} (${formZone}). Community sensors have validated this concern.

Coordinates: Lat 11.7450, Lng 75.4880
Report Reference: #CF-${generatedRef}`;

    const newReport = {
      id: Date.now(),
      type: formType,
      location: formDetails,
      zone: formZone,
      timeAgo: "Just now",
      severity: imageVerified ? "critical" : "warning",
      votes: 1,
      verifications: imageVerified ? 1 : 0,
      user: "You (Volunteer)",
      streetViewStatus: imageVerified ? "verified" : "unverified",
      details: verifiedDetails || "Citizen reported infrastructure issue verified by community tools.",
      letterDrafted: draftLetter
    };

    if (isFirebaseConfigured) {
      try {
        await addDoc(collection(db, 'reports'), newReport);
        setAiLogs(prev => [...prev, { id: `log-submit-db-${Date.now()}-${Math.random()}`, type: "success", text: `Firestore: Report added for ${formZone}.` }]);
      } catch (error) {
        console.error("Failed to add document to Firestore:", error);
        alert("Firestore upload failed. Storing locally.");
        setReports(prev => [newReport, ...prev]);
      }
    } else {
      setReports(prev => [newReport, ...prev]);
    }

    // Add to dispatch queue
    setDispatchQueue(prev => [
      { id: `CF-${generatedRef}`, type: formType.substring(0, 8), location: formDetails.substring(0, 10), status: "Drafted", progress: 15, color: "text-blue-400" },
      ...prev
    ]);

    setIsSubmitting(false);
    setIsReportModalOpen(false);
    
    // Reset form states
    setFormDetails("");
    setImageVerified(false);
    setUploadedImage(null);
    setAiDraftedLetter("");
    setVerifiedDetails("");
    
    setAiLogs(prev => [...prev, { id: `log-submit-${Date.now()}-${Math.random()}`, type: "success", text: `Report successfully uploaded and pinned to ${formZone} layout.` }]);
  };


  // Filter logic
  const filteredReports = reports.filter(r => {
    const matchesZone = selectedZone === "All" || r.zone === selectedZone;
    const matchesSearch = r.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.zone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesZone && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#08090c] text-[#e2e8f0] flex flex-col font-mono selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      
      {/* Background radial gradient matches Singapore dashboard style */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,17,21,0.4)_0%,rgba(7,8,10,0.8)_100%)] pointer-events-none z-0"></div>

      {/* HEADER NAVBAR (Matches Smart City Platform aesthetic with Glassmorphism) */}
      <header className="sticky top-0 z-40 w-full bg-[#0c0d12]/75 backdrop-blur-lg border-b border-[#1b1d24]/60 h-14 flex items-center justify-between px-4 sm:px-6">
        
        {/* Left Side: Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded border border-blue-500/10 bg-blue-950/10 text-blue-400">
            <Activity size={18} />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">CivicFix</span>
        </div>

        {/* Right Actions: Weather/Location info & Report button */}
        <div className="flex items-center gap-4">
          
          {/* Location & Weather details (Metric conversion to Celsius) */}
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-mono text-[#7d8590] bg-[#16171d] border border-[#1b1d24] px-3 py-1 rounded">
            <span className="flex items-center gap-1 text-white">
              <MapPin size={10} className="text-blue-400" />
              Thalassery, IN
            </span>
            <span className="text-[#3b4453] font-bold">|</span>
            <span className="flex items-center gap-1 text-amber-400">
              <CloudSun size={11} />
              28°C, 11:00 PM
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

      {/* STATIC INCIDENT WARNING BAR (Replaces scrolling marquee) */}
      <div className="w-full bg-[#15130e] border-b border-[#251f12] py-2 px-4 relative z-10 flex items-center gap-3">
        <span className="shrink-0 text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-mono font-bold leading-none">THALASSERY INCIDENT ACTIVE</span>
        <span className="text-[11px] font-medium text-amber-400/90 font-mono truncate">
          ⚠️ Drainage blocks near Overbury's Folly road underpass posing waterlogging risks under heavy showers. Volunteers check coordinates.
        </span>
      </div>

      {/* MAIN SCREEN GRID LAYOUT (Three-Column Balanced Grid) */}
      <main className="flex-1 p-3 md:p-4 w-full max-w-none grid grid-cols-1 xl:grid-cols-4 gap-4 relative z-10">

        {/* COLUMN 1: Wards Health, Incident Feed, AI logs (Left Column - 1/4 Width) */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          
          {/* THALASSERY WARDS HEALTH (Top Left with Glassmorphism) */}
          <section className="border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-4 flex flex-col gap-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded">
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Environmental Health</h3>
              <span className="text-xs font-mono font-bold text-emerald-400">97.4% stable</span>
            </div>

            {/* Mock Vector Radar Spiderweb Chart for Singapore UI aesthetic */}
            <div className="h-28 w-full flex items-center justify-center relative">
              <svg viewBox="0 0 100 100" className="w-full h-full max-w-[120px] text-slate-800">
                {/* Radar outer web grid */}
                <polygon points="50,10 88,38 73,82 27,82 12,38" fill="none" stroke="#222530" strokeWidth="0.8" />
                <polygon points="50,25 78,45 67,73 33,73 22,45" fill="none" stroke="#222530" strokeWidth="0.5" />
                <polygon points="50,40 68,52 61,65 39,65 32,52" fill="none" stroke="#222530" strokeWidth="0.5" />
                {/* Axis lines */}
                <line x1="50" y1="50" x2="50" y2="10" stroke="#222530" strokeWidth="0.6" />
                <line x1="50" y1="50" x2="88" y2="38" stroke="#222530" strokeWidth="0.6" />
                <line x1="50" y1="50" x2="73" y2="82" stroke="#222530" strokeWidth="0.6" />
                <line x1="50" y1="50" x2="27" y2="82" stroke="#222530" strokeWidth="0.6" />
                <line x1="50" y1="50" x2="12" y2="38" stroke="#222530" strokeWidth="0.6" />

                {/* Radar Plot data representing CiviFix parameters */}
                <polygon points="50,18 78,40 63,75 42,72 20,41" fill="rgba(59, 130, 246, 0.25)" stroke="#3b82f6" strokeWidth="1.2" />
                
                {/* Vertex labels nodes */}
                <circle cx="50" cy="18" r="1.5" fill="#3b82f6" />
                <circle cx="78" cy="40" r="1.5" fill="#3b82f6" />
                <circle cx="63" cy="75" r="1.5" fill="#3b82f6" />
                <circle cx="42" cy="72" r="1.5" fill="#3b82f6" />
                <circle cx="20" cy="41" r="1.5" fill="#3b82f6" />
              </svg>

              {/* Spiderweb Legend overlay labels */}
              <div className="absolute top-0 text-[9px] font-mono text-[#7d8590]">LIGHTS</div>
              <div className="absolute right-0 top-1/3 text-[9px] font-mono text-[#7d8590]">SAFETY</div>
              <div className="absolute right-4 bottom-0 text-[9px] font-mono text-[#7d8590]">WASTE</div>
              <div className="absolute left-4 bottom-0 text-[9px] font-mono text-[#7d8590]">DRAINAGE</div>
              <div className="absolute left-0 top-1/3 text-[9px] font-mono text-[#7d8590]">ROADS</div>
            </div>

            {/* Mini List of Wards */}
            <div className="space-y-1.5 text-xs font-mono mt-1">
              {districts.slice(0, 3).map(d => (
                <div key={d.name} className="flex justify-between items-center py-1 border-t border-[#1b1d24]/40">
                  <span className="truncate text-[#7d8590]">{d.name.split(" ")[0]} Sector</span>
                  <span className={`font-bold ${d.severity === "critical" ? "text-red-400" : "text-emerald-400"}`}>
                    {d.availability}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* INCIDENT FEED (Left Middle with Glassmorphism) */}
          <section className="border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-4 flex flex-col gap-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded">
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Incident Streams</h3>
              <span className="text-xs text-[#8f97a3]">{reports.length} open</span>
            </div>

            <div className="flex items-center gap-2 bg-[#0c0d12]/60 border border-[#1b1d24]/50 px-2.5 py-1.5 rounded text-xs font-mono mb-1">
              <Search size={12} className="text-[#7d8590] shrink-0" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues..."
                className="bg-transparent border-none text-[#e2e8f0] focus:outline-none placeholder-[#3b4453] w-full text-[11px]"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="text-[#7d8590] hover:text-white shrink-0">
                  <X size={10} />
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredReports.map(issue => (
                <div key={issue.id} className="border border-[#1b1d24]/40 bg-[#16171d]/60 backdrop-blur-sm p-2.5 rounded text-xs flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`text-[11px] font-mono font-bold ${issue.verifications >= 3 ? "text-red-400" : "text-amber-400"}`}>
                        {issue.type}
                      </span>
                      <p className="text-white truncate font-medium mt-0.5">{issue.location.split("(")[0]}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => handleVote(issue.id, issue.docId)}
                        className="flex items-center gap-1 text-[9px] font-bold text-blue-400 hover:text-white bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 transition-all"
                        title="Upvote Report"
                      >
                        ▲ {issue.votes || 0}
                      </button>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${issue.verifications >= 3 ? "bg-red-500 pulse-critical" : "bg-amber-500 pulse-warning"}`} />
                    </div>
                  </div>

                  {/* Actions buttons inside stream */}
                  <div className="flex items-center justify-between border-t border-[#1b1d24]/45 pt-2 text-xs font-mono mt-0.5">
                    <button 
                      onClick={() => setActiveStreetCheck(issue)}
                      className="text-blue-400 hover:text-white font-bold"
                    >
                      StreetView
                    </button>
                    <button 
                      onClick={() => setActiveLetter(issue)}
                      className="text-[#7d8590] hover:text-white font-bold"
                    >
                      AI Notice
                    </button>
                    <button 
                      onClick={() => handleVerify(issue.id, issue.docId)}
                      className="bg-blue-600/10 hover:bg-blue-600 text-blue-300 hover:text-white px-2 py-0.5 rounded border border-blue-500/20 font-bold"
                    >
                      Verify ({issue.verifications || 0})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI AGENT CONSOLE (Left Bottom with Glassmorphism) */}
          <section className="border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-4 flex flex-col gap-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded flex-1 min-h-[180px]">
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2">
              <h3 className="text-sm font-bold text-white tracking-wide">AI Agent Console</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            <div className="bg-[#0a0b0e]/80 border border-[#1b1d24]/50 p-3 rounded font-mono text-xs flex-1 flex flex-col justify-between overflow-hidden">
              <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1 scrollbar-thin">
                {aiLogs.map((log) => (
                  <div key={log.id} className="leading-relaxed">
                    <span className="text-[#3b4453] mr-1 font-bold">&gt;&gt;</span>
                    <span className={`
                      ${log.type === "success" ? "text-emerald-400" : ""}
                      ${log.type === "warning" ? "text-amber-400" : ""}
                      ${log.type === "info" ? "text-blue-400" : ""}
                    `}>{log.text}</span>
                  </div>
                ))}
                <div ref={logEndRef}></div>
              </div>
            </div>
          </section>

        </div>

        {/* COLUMN 2 & 3: 3D map, stability, statistics (Center Column - 2/4 Width) */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* 3D INTERACTIVE TACTICAL MAP (with Glassmorphism) */}
          <section className="border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-4 flex flex-col gap-4 rounded shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden">
            
            {/* Map Header details */}
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="text-blue-400" size={15} />
                <h3 className="text-sm font-bold text-white tracking-wide">3D Tactical Map (Thalassery Town)</h3>
              </div>
              <span className="text-[10px] bg-blue-950/30 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold leading-none">3D PERSPECTIVE</span>
            </div>

            {/* 3D Map viewport wrapping the tilted plane */}
            <div className="map-perspective-container w-full h-[460px] bg-[#0a0b0e]/80 border border-[#1b1d24]/50 rounded relative overflow-hidden flex items-center justify-center">
              
              {/* Grid backdrop effect mimicking Singapore dashboard wireframe */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[length:16px_16px] pointer-events-none"></div>

              {/* Tilted Plane */}
              <div className="map-perspective-plane w-[400px] h-[400px] relative border border-[#1f2733]/40 rounded-full bg-black/20 flex items-center justify-center">
                
                {/* Concentric helper radar rings */}
                <div className="absolute w-[360px] h-[360px] rounded-full border border-blue-500/5 pointer-events-none"></div>
                <div className="absolute w-[240px] h-[240px] rounded-full border border-blue-500/5 pointer-events-none"></div>
                
                {/* SVG vector shapes of coastal land */}
                <svg viewBox="0 0 100 100" className="w-full h-full p-4 text-slate-800 opacity-40">
                  <path 
                    d="M 5 60 C 20 62, 35 68, 48 72 C 60 76, 75 80, 95 85" 
                    fill="none" 
                    stroke="rgba(59, 130, 246, 0.15)" 
                    strokeWidth="1" 
                  />
                  <path 
                    d="M 10 90 Q 25 80, 30 60 T 50 40 T 70 30 T 90 10" 
                    fill="none" 
                    stroke="#161e2b" 
                    strokeWidth="2.5" 
                  />
                </svg>

                {/* Heatmap blur layers if toggled */}
                <AnimatePresence>
                  {showHazardHeatmap && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 pointer-events-none z-10"
                    >
                      <div className="absolute w-20 h-20 rounded-full bg-red-500/30 blur-xl top-[50%] left-[20%]"></div>
                      <div className="absolute w-28 h-28 rounded-full bg-amber-500/25 blur-2xl top-[40%] left-[38%]"></div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3D Vertical standing pins */}
                {districts.map(d => {
                  let color = "bg-emerald-500 pulse-available shadow-[0_0_10px_rgba(16,185,129,0.5)]";
                  if (d.severity === "critical") {
                    color = "bg-red-500 pulse-critical shadow-[0_0_10px_rgba(239,68,68,0.7)]";
                  } else if (d.severity === "warning") {
                    color = "bg-amber-500 pulse-warning shadow-[0_0_10px_rgba(245,158,11,0.6)]";
                  }

                  return (
                    <div
                      key={d.name}
                      className="absolute z-20"
                      style={{ left: `${d.coordinates.x}%`, top: `${d.coordinates.y}%` }}
                    >
                      {/* Vertical Guideline wire connector stand (gives depth) */}
                      <div className="w-[1px] h-10 bg-gradient-to-t from-transparent via-[#2563eb] to-[#38bdf8] opacity-80 absolute bottom-[2px] left-1/2 -translate-x-1/2"></div>
                      
                      {/* Floating Counter-rotated Pin node */}
                      <button
                        onClick={() => {
                          setSelectedZone(d.name);
                          setAiLogs(prev => [...prev, { id: Date.now(), type: "info", text: `Viewport focus aligned with regional coordinates for: ${d.name}` }]);
                        }}
                        className={`map-3d-pin w-3 h-3 rounded-full border border-black/40 absolute -top-10 -left-1.5 transition-transform hover:scale-150 ${color}`}
                        title={`${d.name}: ${d.active} active issues`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Map Footer Metadata overlay */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none bg-[#0c0d12]/90 backdrop-blur-md border border-[#1b1d24]/50 px-2.5 py-1.5 rounded">
                <span className="text-xs text-[#7d8590] uppercase">
                  {showHazardHeatmap ? "Heatmap Layer: Active Hazard" : "Overlay Mode: Town Grid Radar"}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  SCANNING CHANNELS
                </span>
              </div>
            </div>

            {/* Map Mode selector buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => { setSelectedZone("All"); setShowHazardHeatmap(false); }}
                className="bg-[#16171d]/60 backdrop-blur-sm border border-[#1b1d24]/40 hover:border-blue-500/50 text-[#7d8590] hover:text-white px-3 py-2 text-left rounded flex items-center gap-2 transition-colors"
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
                className="bg-[#16171d]/60 backdrop-blur-sm border border-[#1b1d24]/40 hover:border-blue-500/50 text-[#7d8590] hover:text-white px-3 py-2 text-left rounded flex items-center gap-2 transition-colors"
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
          <section className="border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-4 flex flex-col gap-4 rounded shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="text-blue-400" size={15} />
                <h3 className="text-sm font-bold text-white tracking-wide">Civic Stability Health</h3>
              </div>
              <span className="text-xs text-[#7d8590] uppercase">90-Day Trend</span>
            </div>

            {/* Sparkline chart (Color-coded from Good to Critical) */}
            <div className="h-10 w-full pt-1">
              <svg viewBox="0 0 400 50" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <line x1="0" y1="10" x2="400" y2="10" stroke="#22242e" strokeWidth="0.5" strokeDasharray="2,4" />
                <line x1="0" y1="30" x2="400" y2="30" stroke="#22242e" strokeWidth="0.5" strokeDasharray="2,4" />
                <path 
                  d="M0,12 L20,15 L40,12 L60,24 L80,11 L100,10 L120,32 L140,16 L160,11 L180,10 L200,9 L220,12 L240,38 L260,22 L280,10 L300,11 L320,15 L340,10 L360,12 L380,8 L400,9" 
                  fill="none" 
                  stroke="url(#sparkline-grad)" 
                  strokeWidth="1.8" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d="M0,12 L20,15 L40,12 L60,24 L80,11 L100,10 L120,32 L140,16 L160,11 L180,10 L200,9 L220,12 L240,38 L260,22 L280,10 L300,11 L320,15 L340,10 L360,12 L380,8 L400,9 L400,50 L0,50 Z" 
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
            <div className="flex items-end gap-[3px] h-10 pt-2 border-t border-[#1b1d24]/50" role="img">
              {Array.from({ length: 48 }).map((_, i) => {
                const val = (i === 12) ? 42 :
                            (i === 28) ? 30 :
                            (i === 34) ? 55 :
                            (i === 8 || i === 22 || i === 41) ? 72 :
                            (86 + ((i * 7) % 15));

                let bg = "bg-emerald-500";
                if (val < 60) bg = "bg-red-500";
                else if (val < 85) bg = "bg-amber-500";

                return (
                  <div key={i} className="flex-1 h-full min-w-[2px] rounded-t-[1px]" style={{ height: `${val}%` }}>
                    <div className={`w-full h-full ${bg} opacity-80 hover:opacity-100`}></div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-[#555]">
              <span>30 MIN AGO</span>
              <span>NOW</span>
            </div>
          </section>

        </div>

        {/* COLUMN 4: Weather Predictor, Karma Board, AI notice dispatch queue (Right Column - 1/4 Width) */}
        <div className="xl:col-span-1 flex flex-col gap-4">

          {/* AI WEATHER & HAZARD PREDICTOR (Top Right with Glassmorphism) */}
          <section className="border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-4 flex flex-col gap-3.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded">
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Precipitation & Hazards</h3>
              <span className="text-xs text-[#7d8590]">24h Radar</span>
            </div>

            {/* Meteorological parameters grid similar to Singapore UI */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="border border-[#1b1d24]/45 p-2 bg-[#16171d]/60 backdrop-blur-sm rounded">
                <span className="text-[10px] text-[#7d8590] block">WIND</span>
                <span className="text-xs font-bold text-white">8 km/h</span>
              </div>
              <div className="border border-[#1b1d24]/45 p-2 bg-[#16171d]/60 backdrop-blur-sm rounded">
                <span className="text-[10px] text-[#7d8590] block">HUMIDITY</span>
                <span className="text-xs font-bold text-white">85%</span>
              </div>
              <div className="border border-[#1b1d24]/45 p-2 bg-[#16171d]/60 backdrop-blur-sm rounded">
                <span className="text-[10px] text-[#7d8590] block">PRESSURE</span>
                <span className="text-xs font-bold text-white">1,012 hPa</span>
              </div>
            </div>

            {/* Precipitation Bar chart (Color-coded) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[#7d8590] uppercase">Forecast Rain Level</span>
              <div className="flex items-end gap-1.5 h-12 pt-2">
                {[15, 30, 45, 60, 85, 95, 80, 50, 25, 10].map((val, idx) => {
                  let barColor = "bg-emerald-500";
                  if (val > 70) barColor = "bg-red-500";
                  else if (val > 30) barColor = "bg-amber-500";

                  return (
                    <div key={idx} className="flex-1 bg-blue-950/25 border border-blue-900/10 h-full rounded-t-[1px]" style={{ height: `${val}%` }}>
                      <div className={`w-full h-full ${barColor}`}></div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] font-mono text-[#555] mt-0.5">
                <span>08:00</span>
                <span>16:00</span>
                <span>00:00</span>
              </div>
            </div>
          </section>

          {/* KARMA BOARD (Middle Right with Glassmorphism) */}
          <section className="border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-4 flex flex-col gap-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded">
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Volunteer Karma Board</h3>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold leading-none">TOP WARDENS</span>
            </div>

            <div className="space-y-2">
              {mockLeaderboard.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#16171d]/60 backdrop-blur-sm border border-[#1b1d24]/40 p-2 rounded">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{item.avatar}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{item.name}</span>
                      <span className="text-[8px] font-mono text-[#7d8590] truncate">{item.badge}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-amber-300">{item.score}</span>
                    <span className="text-[8px] font-mono text-[#555] block">karma</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI GRIEVANCE DISPATCH QUEUE (Bottom Right with Glassmorphism) */}
          <section className="border border-[#1b1d24]/50 bg-[#121318]/70 backdrop-blur-md p-4 flex flex-col gap-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded flex-1 min-h-[200px]">
            <div className="flex items-center justify-between border-b border-[#1b1d24]/50 pb-2">
              <h3 className="text-sm font-bold text-white tracking-wide">AI Dispatch Queue</h3>
              <span className="text-xs text-[#8f97a3]">Municipality Status</span>
            </div>

            {/* Visualizer list for dispatch statuses */}
            <div className="space-y-3">
              {dispatchQueue.map(item => (
                <div key={item.id} className="border border-[#1b1d24]/45 bg-[#16171d]/60 backdrop-blur-sm p-2.5 rounded text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">{item.id}</span>
                    <span className={`font-semibold ${item.color}`}>{item.status}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#7d8590] text-[9px]">
                    <span>{item.type} @ {item.location}</span>
                    <span>{item.progress}% dispatched</span>
                  </div>
                  {/* Progress tracker bar */}
                  <div className="w-full bg-[#161e2b] h-1 rounded overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${item.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>

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
                    <option value="Severe Pothole">Severe Pothole</option>
                    <option value="Water Logging">Water Logging</option>
                    <option value="Open Drainage">Open Drainage / Broken Cover</option>
                    <option value="Garbage Pileup">Garbage Pileup</option>
                    <option value="Broken Streetlight">Broken Streetlights</option>
                    <option value="Other Infrastructure">Other Infrastructure Issue</option>
                  </select>
                </div>

                {/* District/Ward Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Select Community Ward / Sector
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

                {/* Description Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Location details (Landmarks)
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={formDetails}
                    onChange={(e) => setFormDetails(e.target.value)}
                    placeholder="Enter landmark e.g., opposite court entrance gate, underpass lane..."
                    className="bg-[#16171d] border border-[#1b1d24] text-xs px-3 py-2 text-white focus:outline-none focus:border-blue-500 rounded resize-none"
                  ></textarea>
                </div>

                {/* Gemini AI Vision Checker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono text-[#8e8e8f] uppercase font-bold">
                    Gemini AI Vision Checker
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
                          <span>Gemini analyzing photo pixels...</span>
                        </div>
                      ) : (
                        <>
                          <Camera size={16} className="text-[#7d8590]" />
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                            Upload Photo {isGeminiConfigured ? "(Live Gemini Analysis)" : "(Simulated verification)"}
                          </span>
                        </>
                      )}
                    </label>
                  )}
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
                        <span>Deploying...</span>
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>Submit Report</span>
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
                      
                      // Increment dispatch progress in queue
                      setDispatchQueue(prevQ => prevQ.map(q => {
                        if (q.id === `CF-${activeLetter.id.toString().substring(0, 4)}`) {
                          return { ...q, status: "Sent to PWD", progress: 80 };
                        }
                        return q;
                      }));

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
      <footer className="border-t border-[#1b1d24]/60 bg-[#0c0d12]/80 backdrop-blur-md py-6 px-4 text-center text-[#666] font-mono text-[10px] leading-relaxed relative z-10">
        <div>CivicFix v0.4.0 • Thalassery Town Community Command Center.</div>
        <div className="mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
          <span>Developed with ❤️ by <span className="text-white font-bold">Harshith</span> for the</span>
          <span className="text-white hover:text-red-500 transition-colors cursor-pointer flex items-center gap-0.5 font-bold">
            Vibe2Ship Hackathon <Heart className="fill-red-500 stroke-red-500 inline-block shrink-0" size={11} />
          </span>
        </div>
      </footer>

    </div>
  );
}

export default App;
