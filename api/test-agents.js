import { supabase } from './_lib/supabase.js'

export default async function handler(req, res) {
  // Simple auth check
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const agent = req.query.agent
  res.status(200).json({ message: `Agent '${agent}' would be triggered. Use the dispatch endpoint with proper cron setup.` })
}
