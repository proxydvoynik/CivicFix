import { WARD_POLYGONS } from './ward_polygons.js';

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
  "North Uplands": ["1", "2", "3", "4", "5", "7", "8", "9", "10", "49"],
  "Chirakkara Hills": ["13", "14", "15", "16", "17", "18", "19", "20", "21", "53"],
  "South Highway": ["22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32"],
  "Heritage Quarter": ["6", "35", "36", "38", "39", "40", "44", "45", "46", "50"]
};

// Master list of 53 canonical wards
export const WARD_MASTER = [
  { wardNo: 1, wardName: "NITTOOR", zone: "North Uplands" },
  { wardNo: 2, wardName: "ILLIKKUNNU", zone: "North Uplands" },
  { wardNo: 3, wardName: "MANNAYAD", zone: "North Uplands" },
  { wardNo: 4, wardName: "BAALATHIL", zone: "North Uplands" },
  { wardNo: 5, wardName: "KUNNOTH", zone: "North Uplands" },
  { wardNo: 6, wardName: "KAVUM BAGHAM", zone: "Heritage Quarter" },
  { wardNo: 7, wardName: "KOLASSERI", zone: "North Uplands" },
  { wardNo: 8, wardName: "KUYYALI", zone: "North Uplands" },
  { wardNo: 9, wardName: "KOMATH PARA", zone: "North Uplands" },
  { wardNo: 10, wardName: "KUZHIPPANGADE", zone: "North Uplands" },
  { wardNo: 11, wardName: "KANNOTH PALLI", zone: "Court Corridor" },
  { wardNo: 12, wardName: "TOWN HALL", zone: "Court Corridor" },
  { wardNo: 13, wardName: "MORAKUNNU", zone: "Chirakkara Hills" },
  { wardNo: 14, wardName: "CHIRAKKARA", zone: "Chirakkara Hills" },
  { wardNo: 15, wardName: "KUNHAMPARAMB", zone: "Chirakkara Hills" },
  { wardNo: 16, wardName: "CHELLAKKARA", zone: "Chirakkara Hills" },
  { wardNo: 17, wardName: "MANHODI", zone: "Chirakkara Hills" },
  { wardNo: 18, wardName: "PERINGALAM", zone: "Chirakkara Hills" },
  { wardNo: 19, wardName: "VAYALALAM", zone: "Chirakkara Hills" },
  { wardNo: 20, wardName: "URAANGODE", zone: "Chirakkara Hills" },
  { wardNo: 21, wardName: "KUTTIMAKKOOL", zone: "Chirakkara Hills" },
  { wardNo: 22, wardName: "CHANDROTH", zone: "South Highway" },
  { wardNo: 23, wardName: "MOOZHIKKARA", zone: "South Highway" },
  { wardNo: 24, wardName: "EENGAYIL PEEDIKA", zone: "South Highway" },
  { wardNo: 25, wardName: "KODIYERI WEST", zone: "South Highway" },
  { wardNo: 26, wardName: "KARAAL THERU", zone: "South Highway" },
  { wardNo: 27, wardName: "MAMBALLI KUNNU", zone: "South Highway" },
  { wardNo: 28, wardName: "KODIYERI", zone: "South Highway" },
  { wardNo: 29, wardName: "MEETALE KODIYERI", zone: "South Highway" },
  { wardNo: 30, wardName: "PAARAL", zone: "South Highway" },
  { wardNo: 31, wardName: "POTHUVACHERI", zone: "South Highway" },
  { wardNo: 32, wardName: "MADAPEEDIKA", zone: "South Highway" },
  { wardNo: 33, wardName: "PUNNOL EAST", zone: "Seafront" },
  { wardNo: 34, wardName: "PUNNOL", zone: "Seafront" },
  { wardNo: 35, wardName: "KOMMAL VAYAL", zone: "Heritage Quarter" },
  { wardNo: 36, wardName: "NANGARATH", zone: "Heritage Quarter" },
  { wardNo: 37, wardName: "THALAYI", zone: "Seafront" },
  { wardNo: 38, wardName: "TEMPLE", zone: "Heritage Quarter" },
  { wardNo: 39, wardName: "KALLAYI THERU", zone: "Heritage Quarter" },
  { wardNo: 40, wardName: "THIRUVANGADE", zone: "Heritage Quarter" },
  { wardNo: 41, wardName: "GOPALA PETTA", zone: "Seafront" },
  { wardNo: 42, wardName: "ST. PETERS", zone: "Seafront" },
  { wardNo: 43, wardName: "SAIDAR PALLI", zone: "Seafront" },
  { wardNo: 44, wardName: "WEAVERS", zone: "Heritage Quarter" },
  { wardNo: 45, wardName: "MAARIYAMMA", zone: "Heritage Quarter" },
  { wardNo: 46, wardName: "KAIVATTAM", zone: "Heritage Quarter" },
  { wardNo: 47, wardName: "MATTAMBRAM", zone: "Court Corridor" },
  { wardNo: 48, wardName: "KAAYYATH", zone: "Court Corridor" },
  { wardNo: 49, wardName: "PALISSERI", zone: "North Uplands" },
  { wardNo: 50, wardName: "CHETTAM KUNNU", zone: "Heritage Quarter" },
  { wardNo: 51, wardName: "COURT", zone: "Court Corridor" },
  { wardNo: 52, wardName: "KODUVALLI", zone: "Court Corridor" },
  { wardNo: 53, wardName: "WARD 53", zone: "Chirakkara Hills" }
];

const ZONE_CENTERS = {
  "Court Corridor": { lat: 11.753798, lng: 75.490089 },
  "Seafront": { lat: 11.737300, lng: 75.509542 },
  "North Uplands": { lat: 11.768448, lng: 75.489624 },
  "Chirakkara Hills": { lat: 11.752816, lng: 75.506582 },
  "South Highway": { lat: 11.745525, lng: 75.528233 },
  "Heritage Quarter": { lat: 11.742951, lng: 75.501934 }
};

// Build canonical wards list using real pre-calculated centroids from polygons
export const CANONICAL_WARDS = WARD_MASTER.map(w => {
  const wp = WARD_POLYGONS.find(x => x.wardNo === w.wardNo);
  const lat = wp ? wp.centroid[0] : ZONE_CENTERS[w.zone].lat;
  const lng = wp ? wp.centroid[1] : ZONE_CENTERS[w.zone].lng;
  
  return {
    wardNo: w.wardNo,
    wardName: w.wardName,
    zone: w.zone,
    lat,
    lng,
    aliases: [w.wardName.toLowerCase(), `ward ${w.wardNo}`]
  };
});

// Haversine Distance helper
export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Ray-casting Point-in-Polygon check
export function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  const x = lng;
  const y = lat;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Infer closest ward from lat/lng using PIP first, fallback to centroid distance
export function inferWardFromCoordinates(lat, lng) {
  if (!lat || !lng) return null;
  
  // 1. Point-in-Polygon check
  for (const wp of WARD_POLYGONS) {
    if (pointInPolygon(lat, lng, wp.polygon)) {
      const canonicalWard = CANONICAL_WARDS.find(w => w.wardNo === wp.wardNo);
      if (canonicalWard) {
        return {
          ward: canonicalWard,
          confident: true,
          method: 'polygon'
        };
      }
    }
  }
  
  // 2. Fallback to nearest centroid distance matching
  let closestWard = null;
  let minDistance = Infinity;
  
  CANONICAL_WARDS.forEach(w => {
    const wp = WARD_POLYGONS.find(x => x.wardNo === w.wardNo);
    const targetLat = wp ? wp.centroid[0] : w.lat;
    const targetLng = wp ? wp.centroid[1] : w.lng;
    
    const dist = getDistance(lat, lng, targetLat, targetLng);
    if (dist < minDistance) {
      minDistance = dist;
      closestWard = w;
    }
  });
  
  // 3.0 km fallback distance threshold
  if (minDistance <= 3.0) {
    return {
      ward: closestWard,
      distance: minDistance,
      confident: true,
      method: 'centroid'
    };
  }
  
  return {
    ward: closestWard,
    distance: minDistance,
    confident: false,
    method: 'failed'
  };
}

// Lookup zone from wardNo
export function getZoneFromWard(wardNo) {
  const wardStr = String(wardNo);
  for (const [zone, wards] of Object.entries(WARD_ZONES)) {
    if (wards.includes(wardStr)) {
      return zone;
    }
  }
  return "Court Corridor";
}

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
      const sf = statusFilter.toLowerCase();
      if (sf === "open") {
        if (inc.status === "resolved" || inc.status === "resolved_verified") return false;
      } else if (sf === "resolved") {
        if (inc.status !== "resolved" && inc.status !== "resolved_verified") return false;
      } else {
        if (inc.status !== sf) return false;
      }
    }

    return true;
  });
}

export function getMapMarkers(incidents) {
  return incidents.map(inc => {
    if (!inc.lat || !inc.lng) return null;
    
    let pingBg = 'bg-amber-400';
    let bgClass;
    let colorHex;
    let showPing = true;

    if (inc.status === 'resolved' || inc.status === 'resolved_verified') {
      bgClass = 'bg-emerald-500';
      colorHex = '#10b981';
      showPing = false;
    } else if (inc.status === 'resolved_pending_verification') {
      pingBg = 'bg-purple-400 animate-pulse';
      bgClass = 'bg-purple-500';
      colorHex = '#a855f7';
    } else if (inc.status === 'dispatched') {
      pingBg = 'bg-blue-400';
      bgClass = 'bg-blue-500';
      colorHex = '#3b82f6';
    } else if (inc.status === 'escalated') {
      pingBg = 'bg-red-500 animate-pulse';
      bgClass = 'bg-red-600';
      colorHex = '#dc2626';
    } else {
      // open/other, color by severity
      if (inc.severity === 'critical') {
        pingBg = 'bg-red-400';
        bgClass = 'bg-red-500';
        colorHex = '#ef4444';
      } else if (inc.severity === 'warning') {
        pingBg = 'bg-amber-400';
        bgClass = 'bg-amber-500';
        colorHex = '#f59e0b';
      } else {
        pingBg = 'bg-slate-400';
        bgClass = 'bg-slate-500';
        colorHex = '#64748b';
        showPing = false;
      }
    }

    return {
      ...inc,
      pingBg,
      bgClass,
      colorHex,
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
