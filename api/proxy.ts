import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { targetUrl, stream } = req.query;

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Target URL is required' });
  }

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: { ...req.query, targetUrl: undefined, stream: undefined },
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      },
      responseType: stream === 'true' ? 'stream' : 'json',
      timeout: 15000,
    });

    if (stream === 'true') {
      const contentType = response.headers['content-type'];
      res.setHeader('Content-Type', typeof contentType === 'string' ? contentType : 'application/octet-stream');
      response.data.pipe(res);
    } else {
      res.status(response.status).json(response.data);
    }
  } catch (error: any) {
    console.error('Proxy connectivity error');
    res.status(error.response?.status || 500).json({
      error: 'Connectivity error',
      message: 'Sunucu bağlantı hatası.',
    });
  }
}
