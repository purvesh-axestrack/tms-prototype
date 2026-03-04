import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AUTHORITY_TYPES, COMPANY_INSURANCE_TYPES } from '../lib/constants.js';

export default function companyProfileRouter(db) {
  const router = Router();

  // GET /api/company-profile — returns the single company profile (or null)
  router.get('/', asyncHandler(async (req, res) => {
    const profile = await db('company_profile').first();
    if (!profile) return res.json(null);

    const insurance = await db('company_insurance')
      .where({ company_profile_id: profile.id })
      .orderBy('id');

    res.json({ ...profile, insurance });
  }));

  // POST /api/company-profile — create or update (upsert pattern)
  router.post('/', asyncHandler(async (req, res) => {
    const {
      company_name, dba_name, mc_number, dot_number, scac_code, ein,
      authority_type, contact_name, phone, email, website,
      address, city, state, zip,
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    if (authority_type && !AUTHORITY_TYPES.includes(authority_type)) {
      return res.status(400).json({ error: `authority_type must be one of: ${AUTHORITY_TYPES.join(', ')}` });
    }

    const data = {
      company_name,
      dba_name: dba_name || null,
      mc_number: mc_number || null,
      dot_number: dot_number || null,
      scac_code: scac_code || null,
      ein: ein || null,
      authority_type: authority_type || 'OWN_AUTHORITY',
      contact_name: contact_name || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
    };

    const existing = await db('company_profile').first();

    let profile;
    if (existing) {
      await db('company_profile').where({ id: existing.id }).update(data);
      profile = await db('company_profile').where({ id: existing.id }).first();
    } else {
      [profile] = await db('company_profile').insert(data).returning('*');
    }

    const insurance = await db('company_insurance')
      .where({ company_profile_id: profile.id })
      .orderBy('id');

    res.json({ ...profile, insurance });
  }));

  // POST /api/company-profile/insurance — add insurance policy
  router.post('/insurance', asyncHandler(async (req, res) => {
    const profile = await db('company_profile').first();
    if (!profile) {
      return res.status(400).json({ error: 'Create company profile first' });
    }

    const { policy_type, provider, policy_number, coverage_amount, expiration_date } = req.body;

    if (!policy_type || !provider) {
      return res.status(400).json({ error: 'policy_type and provider are required' });
    }

    if (!COMPANY_INSURANCE_TYPES.includes(policy_type)) {
      return res.status(400).json({ error: `policy_type must be one of: ${COMPANY_INSURANCE_TYPES.join(', ')}` });
    }

    const amount = coverage_amount ? parseFloat(coverage_amount) : null;
    if (coverage_amount && isNaN(amount)) {
      return res.status(400).json({ error: 'coverage_amount must be a valid number' });
    }

    const [policy] = await db('company_insurance').insert({
      company_profile_id: profile.id,
      policy_type,
      provider,
      policy_number: policy_number || null,
      coverage_amount: amount ? Math.round(amount * 100) / 100 : null,
      expiration_date: expiration_date || null,
    }).returning('*');

    res.status(201).json(policy);
  }));

  // DELETE /api/company-profile/insurance/:id
  router.delete('/insurance/:id', asyncHandler(async (req, res) => {
    const deleted = await db('company_insurance')
      .where({ id: req.params.id })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Insurance policy not found' });
    }

    res.json({ message: 'Insurance policy deleted' });
  }));

  return router;
}
