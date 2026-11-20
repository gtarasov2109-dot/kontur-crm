export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, data } = req.body;
  const allowed = ['beauty_masters', 'beauty_clients'];
  if (!allowed.includes(table)) return res.status(400).json({ error: 'Invalid table' });

  try {
    const response = await fetch(`https://supabase.co{table}`, {
      method: 'POST',
      headers: {
        'apikey': 'sb_publishable_DPMIU24eWSc9RLhxAcGAXw_41_vhzqw',
        'Authorization': 'Bearer sb_publishable_DPMIU24eWSc9RLhxAcGAXw_41_vhzqw',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates'
      },
      body: JSON.stringify(data)
    });

    const text = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: text });
    return res.status(200).json({ ok: true, data: text ? JSON.parse(text) : null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
