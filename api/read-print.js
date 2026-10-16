// Vercel Serverless Function: Leitura inteligente de prints do Maker World / Bambu Studio / Cura
// Suporta GEMINI_API_KEY, ANTHROPIC_API_KEY ou OPENAI_API_KEY configuradas nas Environment Variables da Vercel.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { image, type } = req.body || {};

  if (!image) {
    return res.status(400).json({ error: 'Imagem base64 não fornecida' });
  }

  const promptInstrucao = 
    "Esta imagem é uma captura de tela de um fatiador (Bambu Studio, OrcaSlicer, PrusaSlicer, Creality Print) ou do Maker World. " +
    "Extraia o peso do filamento (em gramas) e o tempo total de impressão (em horas decimais). " +
    "Se houver nome do modelo, extraia também. " +
    "Responda EXCLUSIVAMENTE em formato JSON puro, sem formatação markdown ou explicações: " +
    '{"horas": number|null, "gramas": number|null, "nome": string|null}';

  // 1. Google Gemini (recomendado por custo e velocidade na Vercel)
  if (process.env.GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptInstrucao },
              {
                inline_data: {
                  mime_type: type || 'image/jpeg',
                  data: image
                }
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini status ${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.status(200).json(parsed);
    } catch (err) {
      console.error('Erro Gemini:', err);
    }
  }

  // 2. Anthropic Claude
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: type || 'image/jpeg', data: image } },
              { type: 'text', text: promptInstrucao }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic status ${response.status}`);
      }

      const data = await response.json();
      const rawText = (data.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n')
        .replace(/```json|```/g, '')
        .trim();
      const parsed = JSON.parse(rawText);
      return res.status(200).json(parsed);
    } catch (err) {
      console.error('Erro Anthropic:', err);
    }
  }

  // 3. OpenAI GPT-4o-mini
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: promptInstrucao },
              { type: 'image_url', image_url: { url: `data:${type || 'image/jpeg'};base64,${image}` } }
            ]
          }],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI status ${response.status}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      return res.status(200).json(parsed);
    } catch (err) {
      console.error('Erro OpenAI:', err);
    }
  }

  // Nenhuma chave configurada na Vercel: retorna 404 para acionar o OCR Tesseract local no frontend
  return res.status(404).json({
    message: 'Nenhuma chave de IA configurada na Vercel. Utilizando fallback de OCR local no navegador.'
  });
};
