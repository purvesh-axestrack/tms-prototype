import Anthropic from '@anthropic-ai/sdk';
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

function getAnthropicClient() {
  return new Anthropic();
}

export async function extractFromPdf(pdfPath) {
  const absolutePath = path.resolve(__dirname, '..', pdfPath);
  const pdfBuffer = fs.readFileSync(absolutePath);
  const pdfBase64 = pdfBuffer.toString('base64');

  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const text = response.content[0].text;

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  return JSON.parse(jsonStr);
}

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

  // Store extracted data
  await db('email_imports').where({ id: emailImportId }).update({
    processing_status: 'EXTRACTED',
    extracted_data: JSON.stringify(extracted),
    confidence_score: extracted.confidence || 0,
  });

  // Create draft load
  const { createDraftLoad } = await import('./draftLoadCreator.js');
  const load = await createDraftLoad(db, emailImportId, extracted, dispatcherId);

  return { status: 'DRAFT_CREATED', load_id: load.id, confidence: extracted.confidence };
}
