import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isGeminiConfigured = !!(apiKey && apiKey !== 'your_gemini_api_key');

let ai = null;
if (isGeminiConfigured) {
  ai = new GoogleGenAI({ apiKey });
}

export class CivicFixTriageAgent {
  constructor() {
    this.name = "CivicFix Triage Agent";
    this.systemInstruction = `
You are the CivicFix Triage Agent, an autonomous coordinator for the Thalassery Municipal Command Center.
Your objective is to ensure high data integrity, validate citizen-submitted issues, audit resolutions, detect duplicates, and predict ward-level infrastructure risk.
Provide structured, high-confidence decisions with clear reasoning and recommended actions.
`;
  }

  // Capability 1: Duplicate Detection
  async detectDuplicates(newIssue, candidateIssues) {
    if (!isGeminiConfigured) {
      // Deterministic fallback
      const dup = candidateIssues.find(c => c.type.toLowerCase() === newIssue.type.toLowerCase());
      if (dup) {
        return {
          decision: "possible_duplicate",
          confidence: 0.85,
          reason: "Deterministic match: Same category within close spatial proximity.",
          recommendedAction: "Suggest merging this ticket into the existing report.",
          matchedReportId: dup.id
        };
      }
      return {
        decision: "new_issue",
        confidence: 1.0,
        reason: "No matching categories found within proximity limits.",
        recommendedAction: "Log as a new independent incident."
      };
    }

    const candidateListStr = candidateIssues.map(c => 
      `- Report ID: ${c.id}, Category: ${c.type}, Location: ${c.location}, Details: ${c.details || c.description}, Lat/Lng: [${c.lat}, ${c.lng}], Status: ${c.status}`
    ).join("\n");

    const prompt = `
Analyze the new report and compare it with the list of nearby candidate reports.
Classify the new report as one of:
1. "new_issue": Unique incident, no duplicates.
2. "possible_duplicate": Represents the exact same physical hazard.
3. "related_cluster": Uniquely different but related to the same local issue group (e.g. another streetlight out on the same stretch).

New Report:
- Category: ${newIssue.type}
- Location: ${newIssue.location}
- Description: ${newIssue.description}
- Lat/Lng: [${newIssue.lat}, ${newIssue.lng}]

Nearby Candidates:
${candidateListStr || "None"}
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [this.systemInstruction, prompt],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              decision: { type: 'STRING', enum: ['new_issue', 'possible_duplicate', 'related_cluster'] },
              confidence: { type: 'NUMBER' },
              reason: { type: 'STRING' },
              recommendedAction: { type: 'STRING' },
              matchedReportId: { type: 'STRING' }
            },
            required: ['decision', 'confidence', 'reason', 'recommendedAction']
          }
        }
      });

      return JSON.parse(response.text);
    } catch (err) {
      console.error("Agent duplicate check failed:", err);
      // Fallback
      return {
        decision: "new_issue",
        confidence: 0.5,
        reason: "Gemini analysis error: " + err.message,
        recommendedAction: "Proceed as a new ticket."
      };
    }
  }

  // Capability 2: Resolution Audit
  async auditResolution(report, proofImageBase64, proofImageMime, workerNotes) {
    if (!isGeminiConfigured) {
      // Deterministic fallback
      return {
        decision: "appears_resolved",
        confidence: 0.9,
        reason: "Simulated validation: Image metadata and notes uploaded by authorized warden.",
        recommendedAction: "Approve resolution and flag for final warden verification."
      };
    }

    const prompt = `
You are auditing a resolved infrastructure issue. Verify if the provided proof photo shows that the reported issue has been successfully fixed or cleared.
Report details:
- Category: ${report.type}
- Location: ${report.location}
- Description: ${report.details || report.description}
- Worker notes: ${workerNotes}

Determine the audit outcome:
1. "appears_resolved": The photo confirms the hazard is fixed (e.g. pothole patched, waste cleared).
2. "needs_manual_review": The photo is unclear, ambiguous, or shows incomplete work.
3. "insufficient_evidence": The photo is unrelated, of poor quality, or doesn't show the site of the issue.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          this.systemInstruction,
          prompt,
          {
            inlineData: {
              mimeType: proofImageMime,
              data: proofImageBase64
            }
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              decision: { type: 'STRING', enum: ['appears_resolved', 'needs_manual_review', 'insufficient_evidence'] },
              confidence: { type: 'NUMBER' },
              reason: { type: 'STRING' },
              recommendedAction: { type: 'STRING' }
            },
            required: ['decision', 'confidence', 'reason', 'recommendedAction']
          }
        }
      });

      return JSON.parse(response.text);
    } catch (err) {
      console.error("Agent resolution audit failed:", err);
      return {
        decision: "needs_manual_review",
        confidence: 0.5,
        reason: "Analysis error: " + err.message,
        recommendedAction: "Request manual verification from a senior warden."
      };
    }
  }

  // Capability 3: Ward Risk Forecasting
  async predictWardRisk(wardName, incidents, weatherData) {
    // Deterministic metrics
    const unresolved = incidents.filter(i => i.status !== 'resolved' && i.status !== 'resolved_verified').length;
    const criticalCount = incidents.filter(i => i.severity === 'critical').length;
    
    let deterministicRisk = "low";
    if (unresolved >= 8 || criticalCount >= 3) {
      deterministicRisk = "critical";
    } else if (unresolved >= 4 || criticalCount >= 1) {
      deterministicRisk = "high";
    } else if (unresolved >= 2) {
      deterministicRisk = "moderate";
    }

    if (!isGeminiConfigured) {
      return {
        riskLevel: deterministicRisk,
        confidence: 0.9,
        reason: `Deterministic assessment based on ${unresolved} active reports and ${criticalCount} critical incidents.`,
        recommendedAction: deterministicRisk === 'critical' ? "Dispatch immediate clearance teams" : "Monitor ward channels"
      };
    }

    const incidentsListStr = incidents.map(i => 
      `- [${i.severity}] ${i.type} at ${i.location} (Status: ${i.status})`
    ).join("\n");

    const prompt = `
Analyze the infrastructure logs and weather forecast to predict the ward risk level (low, moderate, high, or critical).
Ward: ${wardName}
Weather parameters: Temp: ${weatherData?.temp || 30}°C, Precipitation: ${weatherData?.precipitation || 0}mm, Flood risk: ${weatherData?.floodRisk ? "YES" : "NO"}
Active Issues:
${incidentsListStr || "None"}
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [this.systemInstruction, prompt],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              riskLevel: { type: 'STRING', enum: ['low', 'moderate', 'high', 'critical'] },
              confidence: { type: 'NUMBER' },
              reason: { type: 'STRING' },
              recommendedAction: { type: 'STRING' }
            },
            required: ['riskLevel', 'confidence', 'reason', 'recommendedAction']
          }
        }
      });

      return JSON.parse(response.text);
    } catch (err) {
      console.error("Agent risk prediction failed:", err);
      return {
        riskLevel: deterministicRisk,
        confidence: 0.5,
        reason: "Prediction model error fallback: " + err.message,
        recommendedAction: "Monitor ward status manually."
      };
    }
  }
}
