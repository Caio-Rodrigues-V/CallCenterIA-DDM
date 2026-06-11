import { fetchVapiResources } from '../../backend/src/services/vapiResources.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Metodo nao permitido' });
  }

  try {
    const resources = await fetchVapiResources();
    return res.status(200).json({ success: true, ...resources });
  } catch (error: any) {
    console.error('[api/vapi/resources] error', error);
    return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Erro interno' });
  }
}
