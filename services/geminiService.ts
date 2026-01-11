
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, JobAlert } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * AGENT: PROFILER
 * Mission: Binary Identity Synthesis.
 * Enforces "Seniority Locking" and niche technical extraction.
 */
export const profileAgent = async (resumeText: string): Promise<UserProfile> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `IDENTITY SYNTHESIS MISSION:
    Analyze this resume. Extract:
    1. Core technical skills.
    2. Expected seniority level (Junior/Mid/Senior/Staff/Lead).
    3. Target role titles.
    4. A one-sentence Vector Summary that defines the candidate's niche exactly.
    
    Resume: ${resumeText}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          targetRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
          vectorSummary: { type: Type.STRING }
        },
        required: ['skills', 'targetRoles', 'vectorSummary']
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return { resumeText, ...data };
};

/**
 * AGENT: SCOUT
 * Mission: Secure Grounding + Deep Link Extraction.
 * Query uses 'after:7d' logic to ensure immediate promptness.
 */
export const scoutAgent = async (companyName: string, domain: string, targetRoles: string[]): Promise<{ jobs: any[] }> => {
  // Use specific ATS keywords and date filters to ensure link viability
  const query = `site:${domain} (inurl:careers OR inurl:jobs OR inurl:greenhouse OR inurl:lever OR inurl:workday) "${targetRoles[0]}" after:7d`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `SCOUT MISSION: 
    Locate the 3 most RECENT job openings at ${companyName} (${domain}) for the role of ${targetRoles[0]}. 
    CRITICAL: The links MUST be deep links to application pages (e.g., /jobs/12345 or boards.greenhouse.io). Discard root career homepages.
    Search Grounding Query: ${query}`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "Focus ONLY on results from the last 7 days. If the search result date is older, or the link is just a company homepage, ignore it."
    }
  });

  const parseResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `EXTRACT DATA:
    Extract Title, Link, Snippet, and Posting Date from the provided text. Ensure the link is direct.
    Text: ${response.text}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            link: { type: Type.STRING },
            snippet: { type: Type.STRING },
            postedDate: { type: Type.STRING }
          },
          required: ['title', 'link', 'snippet']
        }
      }
    }
  });

  let jobs = [];
  try {
    jobs = JSON.parse(parseResponse.text || '[]');
  } catch (e) { jobs = []; }

  return { jobs };
};

/**
 * AGENT: CRITIC
 * Mission: Binary Gatekeeper.
 * Rules: < 7 days old, Direct Link verified, Seniority match.
 */
export const criticAgent = async (job: any, profile: UserProfile): Promise<Partial<JobAlert> | null> => {
  const prompt = `
    MATCH EVALUATION (BINARY):
    Candidate Vector: ${profile.vectorSummary}
    
    Potential Match: ${job.title}
    Details: ${job.snippet}
    Source Link: ${job.link}
    Date Evidence: ${job.postedDate || 'Unknown'}
    
    VERIFICATION RULES:
    1. RECENCY: If the posting is explicitly > 7 days old, REJECT.
    2. VIABILITY: If the link is a generic homepage (e.g. apple.com/careers) and NOT a specific job ID, REJECT.
    3. RELEVANCE: Does this match the "Subject Vector" identity? (TRUE/FALSE)
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN },
          reason: { type: Type.STRING }
        },
        required: ['isValid', 'reason']
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  
  if (data.isValid) {
    return {
      title: job.title,
      link: job.link,
      reason: data.reason
    };
  }
  
  return null;
};
