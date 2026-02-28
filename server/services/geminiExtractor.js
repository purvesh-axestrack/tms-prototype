/**
 * Gemini-based PDF rate confirmation extractor.
 *
 * Self-contained — only depends on @google/generative-ai and fs.
 * The rest of the pipeline (draftLoadCreator, DraftReviewModal) consumes
 * the same JSON schema this returns.
 *
 * Env: GEMINI_API_KEY (required)
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EXTRACTION_PROMPT = `You are analyzing a PDF document that may be a rate confirmation (also known as a load confirmation, carrier confirmation, or load tender) in the freight/trucking industry.

First, determine if this document is actually a rate confirmation. Look for indicators like:
- Broker/shipper and carrier information
- Rate/payment amounts
- Pickup and delivery locations with dates
- Reference/load numbers
- Equipment requirements

Then extract the following structured data. For any field you cannot find, use null. Provide a confidence score (0.0 to 1.0) for each field based on how certain you are of the extraction.

Respond with ONLY a JSON object in this exact format:
{
  "is_rate_confirmation": true/false,
  "confidence": 0.0-1.0,
  "data": {
    "reference_number": { "value": "string or null", "confidence": 0.0-1.0 },
    "broker_name": { "value": "string or null", "confidence": 0.0-1.0 },
    "broker_mc_number": { "value": "string or null", "confidence": 0.0-1.0 },
    "rate_amount": { "value": number or null, "confidence": 0.0-1.0 },
    "rate_type": { "value": "FLAT or CPM or PERCENTAGE or null", "confidence": 0.0-1.0 },
    "loaded_miles": { "value": number or null, "confidence": 0.0-1.0 },
    "commodity": { "value": "string or null", "confidence": 0.0-1.0 },
    "weight": { "value": number or null, "confidence": 0.0-1.0 },
    "equipment_type": { "value": "string or null", "confidence": 0.0-1.0 },
    "special_instructions": { "value": "string or null", "confidence": 0.0-1.0 },
    "stops": [
      {
        "stop_type": "PICKUP or DELIVERY",
        "facility_name": "string or null",
        "address": "string or null",
        "city": "string or null",
        "state": "string or null",
        "zip": "string or null",
        "appointment_start": "ISO 8601 datetime or null",
        "appointment_end": "ISO 8601 datetime or null",
        "confidence": 0.0-1.0
      }
    ]
  }
}`;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Extract structured data from a rate con PDF using Gemini Flash.
 * Returns the same JSON schema as the original Claude extractor.
 */
export async function extractFromPdf(pdfPath) {
  const absolutePath = path.resolve(__dirname, '..', pdfPath);
  const pdfBuffer = fs.readFileSync(absolutePath);
  const pdfBase64 = pdfBuffer.toString('base64');

  const client = getClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64,
      },
    },
    { text: EXTRACTION_PROMPT },
  ]);

  const text = result.response.text();

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  return JSON.parse(jsonStr);
}

/**
 * Process an email import through the Gemini extraction pipeline.
 * Process an email import through the Gemini extraction pipeline.
 */
export async function processEmailImport(db, emailImportId, pdfStoragePath, dispatcherId = null) {
  const extracted = await extractFromPdf(pdfStoragePath);

  if (!extracted.is_rate_confirmation) {
    await db('email_imports').where({ id: emailImportId }).update({
      processing_status: 'SKIPPED',
      extracted_data: JSON.stringify(extracted),
      confidence_score: extracted.confidence || 0,
      error_message: 'Document is not a rate confirmation',
    });
    return { status: 'SKIPPED', reason: 'not a rate confirmation' };
  }

  await db('email_imports').where({ id: emailImportId }).update({
    processing_status: 'EXTRACTED',
    extracted_data: JSON.stringify(extracted),
    confidence_score: extracted.confidence || 0,
  });

  const { createDraftLoad } = await import('./draftLoadCreator.js');
  const load = await createDraftLoad(db, emailImportId, extracted, dispatcherId);

  return { status: 'DRAFT_CREATED', load_id: load.id, confidence: extracted.confidence };
}

/**
 * Standalone extraction — no email import row needed.
 * Used by the drag-and-drop upload endpoint.
 * Returns raw extracted data for the frontend to review.
 */
export async function extractOnly(pdfPath) {
  return extractFromPdf(pdfPath);
}
