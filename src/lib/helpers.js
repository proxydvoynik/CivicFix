export const DISTRICT_TO_ZONE = {
  // Map old mixed landmark names
  "Court Road Junction": "Court Corridor",
  "Sea Bridge Lane": "Seafront",
  "Gundopp Street Block": "North Uplands",
  "Chirakkara Ward": "Chirakkara Hills",
  "Thalassery Bus Stand Area": "South Highway",
  "Overbury's Folly Sector": "Heritage Quarter",
  
  // Map old full names
  "Kannoth–Court Corridor": "Court Corridor",
  "Punnol–Thiruvangad Seafront": "Seafront",
  "Illikkunnu–Nittoor Uplands": "North Uplands",
  "Chirakkara–Morakunnu Hills": "Chirakkara Hills",
  "Kodiyeri–Madapeedika South": "South Highway",
  "Thiruvangad–Overbury's Heritage Quarter": "Heritage Quarter"
};

export const ZONE_TO_DISTRICT = {
  "Court Corridor": "Court Corridor",
  "Seafront": "Seafront",
  "North Uplands": "North Uplands",
  "Chirakkara Hills": "Chirakkara Hills",
  "South Highway": "South Highway",
  "Heritage Quarter": "Heritage Quarter"
};

export const WARD_ZONES = {
  "Court Corridor": ["11", "12", "47", "48", "51", "52"],
  "Seafront": ["33", "34", "37", "41", "42", "43"],
  "North Uplands": ["1", "2", "3", "4", "5", "7", "8", "9", "10"],
  "Chirakkara Hills": ["13", "14", "15", "16", "17", "18", "19", "20", "21"],
  "South Highway": ["22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32"],
  "Heritage Quarter": ["6", "35", "36", "38", "39", "40", "44", "45", "46", "50"]
};

export const ZONE_MAPPING = [
  { fullName: "Court Corridor", shortName: "Court Corridor" },
  { fullName: "Seafront", shortName: "Seafront" },
  { fullName: "North Uplands", shortName: "North Uplands" },
  { fullName: "Chirakkara Hills", shortName: "Chirakkara Hills" },
  { fullName: "South Highway", shortName: "South Highway" },
  { fullName: "Heritage Quarter", shortName: "Heritage Quarter" }
];

export const getCategoryInfo = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes('drain') || t.includes('logging') || t.includes('water')) {
    return { label: 'Drainage', color: '#3b82f6', bg: 'bg-blue-500/10 text-[#3b82f6] border-blue-500/20' };
  }
  if (t.includes('pothole') || t.includes('road')) {
    return { label: 'Pothole', color: '#f97316', bg: 'bg-orange-500/10 text-[#f97316] border-orange-500/20' };
  }
  if (t.includes('garbage') || t.includes('waste') || t.includes('pileup')) {
    return { label: 'Waste', color: '#22c55e', bg: 'bg-green-500/10 text-[#22c55e] border-green-500/20' };
  }
  if (t.includes('light') || t.includes('lamp') || t.includes('streetlight')) {
    return { label: 'Streetlight', color: '#eab308', bg: 'bg-yellow-500/10 text-[#eab308] border-yellow-500/20' };
  }
  if (t.includes('safety') || t.includes('danger') || t.includes('hazard') || t.includes('obstruction')) {
    return { label: 'Safety', color: '#ef4444', bg: 'bg-red-500/10 text-[#ef4444] border-red-500/20' };
  }
  return { label: 'Other', color: '#6b7280', bg: 'bg-gray-500/10 text-[#6b7280] border-gray-500/20' };
};

export function normalizeZoneName(zone) {
  if (!zone) return "Court Corridor";
  return DISTRICT_TO_ZONE[zone] || zone;
}

export function getZoneHealthScore(zoneIncidents) {
  let penalty = 0;
  zoneIncidents.forEach(inc => {
    if (inc.status !== 'resolved') {
      if (inc.severity === 'critical') penalty += 20;
      else if (inc.severity === 'warning') penalty += 10;
      else penalty += 4; // info/low
    }
  });
  return Math.max(10, 100 - penalty);
}

export function getZoneStatus(healthScore) {
  if (healthScore >= 90) return "STABLE";
  if (healthScore >= 70) return "WARNING";
  return "CRITICAL";
}

export function getDominantIssueType(zoneIncidents) {
  if (!zoneIncidents || zoneIncidents.length === 0) return "Clear";
  const counts = {};
  zoneIncidents.forEach(inc => {
    const cat = getCategoryInfo(inc.type).label;
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "Clear";
}

export function getZoneSummary(zoneIncidents) {
  const healthScore = getZoneHealthScore(zoneIncidents);
  const status = getZoneStatus(healthScore);
  const dominantIssue = getDominantIssueType(zoneIncidents);
  const activeCount = zoneIncidents.filter(inc => inc.status !== 'resolved').length;
  const resolvedCount = zoneIncidents.filter(inc => inc.status === 'resolved').length;
  return {
    healthScore,
    status,
    dominantIssue,
    activeCount,
    resolvedCount
  };
}

export function filterAlerts(incidents, query, activeZone, statusFilter) {
  return incidents.filter(inc => {
    // 1. Filter by active zone wards if set
    if (activeZone) {
      const wardList = WARD_ZONES[activeZone];
      const wardStr = inc.ward?.toString();
      if (!wardStr || !wardList.includes(wardStr)) return false;
    }

    // 2. Filter by search query (description, ward, type)
    if (query && query.trim()) {
      const q = query.toLowerCase();
      const matchesDesc = (inc.description || inc.details || "").toLowerCase().includes(q);
      const matchesWard = (inc.ward || "").toString().toLowerCase().includes(q);
      const matchesType = (inc.type || "").toLowerCase().includes(q);
      if (!matchesDesc && !matchesWard && !matchesType) return false;
    }

    // 3. Filter by status pills
    if (statusFilter && statusFilter !== "All") {
      if (inc.status !== statusFilter.toLowerCase()) return false;
    }

    return true;
  });
}

export function getMapMarkers(incidents) {
  return incidents.map(inc => {
    if (!inc.lat || !inc.lng) return null;
    
    let pingBg = 'bg-amber-400';
    let bgClass;
    let showPing = true;

    if (inc.status === 'resolved') {
      bgClass = 'bg-emerald-500';
      showPing = false;
    } else if (inc.status === 'dispatched') {
      pingBg = 'bg-blue-400';
      bgClass = 'bg-blue-500';
    } else if (inc.status === 'escalated') {
      pingBg = 'bg-red-500 animate-pulse';
      bgClass = 'bg-red-600';
    } else {
      // open/other, color by severity
      if (inc.severity === 'critical') {
        pingBg = 'bg-red-400';
        bgClass = 'bg-red-500';
      } else if (inc.severity === 'warning') {
        pingBg = 'bg-amber-400';
        bgClass = 'bg-amber-500';
      } else {
        pingBg = 'bg-slate-400';
        bgClass = 'bg-slate-500';
        showPing = false;
      }
    }

    return {
      ...inc,
      pingBg,
      bgClass,
      showPing
    };
  }).filter(Boolean);
}

export function getHeatmapData(incidents) {
  // Filter for unresolved incidents
  const activeIncidents = incidents.filter(inc => inc.status !== 'resolved' && inc.lat && inc.lng);
  
  return activeIncidents.map(inc => {
    let radius;
    let color;
    
    if (inc.severity === 'critical') {
      radius = 200;
      color = '#ef4444'; // critical red
    } else if (inc.severity === 'warning') {
      radius = 120;
      color = '#f59e0b'; // warning amber
    } else {
      radius = 70;
      color = '#3b82f6'; // info blue
    }
    
    return {
      lat: inc.lat,
      lng: inc.lng,
      radius,
      color
    };
  });
}

export function getStabilityTrend(incidents) {
  const numBuckets = 48;
  const minutesPerBucket = 30; // 24 hours total
  
  // Initialize buckets
  const buckets = Array.from({ length: numBuckets }).map(() => {
    return {
      stability: 100,
      activeCount: 0,
    };
  });
  
  // Parse minutesAgo for each incident
  const processedIncidents = incidents.map(inc => {
    let minutesAgo = 0;
    if (inc.timeAgo) {
      const match = inc.timeAgo.match(/(\d+)\s*(m|h|d)/);
      if (match) {
        const num = parseInt(match[1]);
        const unit = match[2];
        if (unit === 'm') minutesAgo = num;
        else if (unit === 'h') minutesAgo = num * 60;
        else if (unit === 'd') minutesAgo = num * 24 * 60;
      } else if (inc.timeAgo.toLowerCase().includes('just now')) {
        minutesAgo = 0;
      }
    } else if (inc.reportedAt) {
      const diffMs = Date.now() - new Date(inc.reportedAt).getTime();
      minutesAgo = Math.max(0, Math.floor(diffMs / 60000));
    }
    
    // Assign weight based on severity
    let weight = 2; // low/info
    if (inc.severity === 'critical') weight = 15;
    else if (inc.severity === 'warning') weight = 8;
    
    return {
      minutesAgo,
      severity: inc.severity,
      status: inc.status,
      weight
    };
  });
  
  // Fill buckets
  for (let i = 0; i < numBuckets; i++) {
    const bucketTimeAgo = (numBuckets - 1 - i) * minutesPerBucket;
    let activeWeightSum = 0;
    let activeCount = 0;
    
    processedIncidents.forEach(inc => {
      if (inc.minutesAgo >= bucketTimeAgo) {
        // Was it active?
        const isActive = inc.status !== 'resolved' || bucketTimeAgo > 0;
        if (isActive) {
          activeWeightSum += inc.weight;
          activeCount++;
        }
      }
    });
    
    buckets[i].activeCount = activeCount;
    buckets[i].stability = Math.max(25, Math.min(100, 100 - activeWeightSum));
  }
  
  return buckets;
}
