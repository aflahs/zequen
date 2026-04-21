const { GoogleGenAI, Type } = require('@google/genai');
const path = require('path');
const fs = require('fs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDRAnlYLgnwkrWRNgkj2cymdPf2vGyrzE0';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Define the JSON canonical output schema. All fields are optional to prevent AI hallucination on missing data.
 */
const certificateSchema = {
  type: Type.OBJECT,
  properties: {
    student_name: {
      type: Type.STRING,
      description: "Full legal name of the student exactly as printed. Strip any titles (Mr, Ms, Dr, Prof). Single space between words. E.g. 'Alice Johnson'. If not found, return empty string."
    },
    degree: {
      type: Type.STRING,
      description: "The FULL official degree name, always expanded — never abbreviated. E.g. 'Bachelor of Computer Science', NOT 'BSc CS' or 'B.Sc'. If not found, return empty string."
    },
    institution: {
      type: Type.STRING,
      description: "The FULL official institution name, spelled out completely — never acronyms. E.g. 'National University of Technology', NOT 'NUT'. If not found, return empty string."
    },
    graduation_year: {
      type: Type.STRING,
      description: "4-digit year only (e.g. '2024'). Extract only the numeric year from any date format on the certificate. If not found, return empty string."
    },
    certificate_id: {
      type: Type.STRING,
      description: "The unique certificate identifier code exactly as printed, including all dashes and alphanumeric chars. E.g. 'CERT-16EB9112'. If not found, return empty string."
    },
  },
  required: []
};

/**
 * Converts a local file to the base64 part object expected by the Gemini API
 */
function fileToGenerativePart(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  if (ext === '.pdf') mimeType = 'application/pdf';

  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

/**
 * Full OCR pipeline: send to Gemini Vision API → receive structured canonical data
 */
async function ocrExtract(filePath) {
  try {
    const filePart = fileToGenerativePart(filePath);

    const prompt = [
      "You are a precision academic certificate data extractor. Extract ONLY the following fields from this certificate document.",
      "",
      "STRICT NORMALIZATION RULES — follow exactly:",
      "1. student_name: Full legal name, no titles (Mr/Ms/Dr/Prof). Single space between words.",
      "2. degree: Always the FULL expanded name. Never abbreviate. Use 'Bachelor of Computer Science' not 'BSc CS'.",
      "3. institution: Always the FULL official name spelled out. Never use acronyms.",
      "4. graduation_year: 4-digit year only (e.g. '2024').",
      "5. certificate_id: Exact code as printed including dashes (e.g. 'CERT-16EB9112').",
      "6. If a field is not visible in the document, return an empty string. Do NOT invent values.",
      "",
      "Return ONLY structured JSON matching the schema. No commentary."
    ].join("\n");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [filePart, prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: certificateSchema,
      }
    });

    const parsed = JSON.parse(response.text);

    // Gemini essentially handles both extraction and parsing in one go
    // We mock "rawText" for logging purposes since the SDK returns structured JSON directly
    const rawText = `[Extracted by Gemini AI]\nName: ${parsed.student_name}\nDegree: ${parsed.degree}\nInstitution: ${parsed.institution}\nYear: ${parsed.graduation_year}\nID: ${parsed.certificate_id}`;

    return { rawText, parsed };
  } catch (err) {
    console.error('Gemini Vision API Error:', err);
    throw new Error('AI Document Analysis Failed');
  }
}

module.exports = { ocrExtract };
