// Ochrana GET sťahovaní (exporty, kalendár) pred vyvolaním z cudzieho webu (CSRF / „login CSRF“).
// Prehliadače posielajú Sec-Fetch-Site; ak chýba (staršie prehliadače, curl), požiadavku pustíme – overenie relácie platí vždy.
export function isCrossSite(req: Request): boolean {
  const site = req.headers.get('sec-fetch-site');
  return site === 'cross-site';
}
