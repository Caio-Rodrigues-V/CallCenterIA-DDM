import { importContactsForCampaign } from '../../backend/src/services/contactImport.js';

function readBody(req: any) {
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return req.body || {};
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Metodo nao permitido. Use POST.' });
  }

  try {
    const { campaignId, contacts } = readBody(req) as {
      campaignId?: string;
      contacts?: Array<{ nome?: string; cpf?: string; telefone?: string; instituicao?: string }>;
    };

    if (!campaignId || !Array.isArray(contacts)) {
      return res.status(400).json({ success: false, error: 'Payload invalido' });
    }

    const result = await importContactsForCampaign(campaignId, contacts);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[api/contacts/import] error', error);
    return res.status(500).json({ success: false, error: error.message || 'Erro interno' });
  }
}
