// Odkazy na mapy a navigáciu k hale. Presná poloha (GPS z administrácie) má prednosť pred adresou.
type Hall = { street: string; city: string; mapUrl: string; lat: string; lng: string };


export function mapLinks(hall: Hall) {
  const coords = hall.lat && hall.lng ? `${hall.lat},${hall.lng}` : '';
  const address = [hall.street, hall.city].filter(Boolean).join(', ');
  // Pre vyhľadanie len ulica, PSČ a mesto – bez názvu firmy a „– Juh“, inak Google nájde iné miesto.
  const city = hall.city.split(/\s[–-]\s/)[0].trim();
  const searchable = `${[hall.street, city].filter(Boolean).join(', ')}, Slovensko`;
  const q = encodeURIComponent(coords || searchable);
  return {
    address,
    exact: Boolean(coords),
    embed: `https://maps.google.com/maps?q=${q}&t=m&z=17&hl=sk&output=embed`,
    google: hall.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    waze: coords ? `https://waze.com/ul?ll=${encodeURIComponent(coords)}&navigate=yes` : `https://waze.com/ul?q=${q}&navigate=yes`,
    apple: coords ? `https://maps.apple.com/?daddr=${q}&dirflg=d` : `https://maps.apple.com/?daddr=${q}&dirflg=d`,
  };
}
