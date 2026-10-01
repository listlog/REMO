import { getDb } from '../db.mjs';

// This endpoint returns only explicitly published homepage content.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const sql = getDb();
    const [members, projects, pages] = await sql.transaction([
      sql`SELECT id, name, role, skills, public_contact, image_url FROM public.remo_members WHERE published = true ORDER BY id`,
      sql`SELECT id, title, period, description, participants, activities, process, results, image_url, status FROM public.remo_projects WHERE published = true ORDER BY id`,
      sql`SELECT page, slot, content, image_url FROM public.remo_page_content WHERE published = true ORDER BY page, slot`
    ], { readOnly: true, isolationLevel: 'RepeatableRead' });
    return res.status(200).json({ members, projects, pages });
  } catch {
    // Never expose driver errors or database connection details.
    return res.status(503).json({ error: 'CONTENT_UNAVAILABLE' });
  }
}
