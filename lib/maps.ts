// Odkazy na mapy a navigáciu k hale. Presná poloha (GPS z administrácie) má prednosť pred adresou.
type Hall = { street: string; city: string; mapUrl: string; lat: string; lng: string };

export function mapLinks(hall: Hall, name = 'I-SPORT COMPLEX') {
  const coords = hall.lat && hall.lng ? `${hall.lat},${hall.lng}` : '';
  const address = [hall.street, hall.city].filter(Boolean).join(', ');
  const q = encodeURIComponent(coords || `${name}, ${address}`);
  return {
    address,
    // vložená mapa Google (načíta sa až po kliknutí návštevníka – pozri LocationMap)
    embed: `https://www.google.com/maps?q=${q}&z=16&hl=sk&output=embed`,
    google: hall.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    waze: coords ? `https://waze.com/ul?ll=${encodeURIComponent(coords)}&navigate=yes` : `https://waze.com/ul?q=${q}&navigate=yes`,
    apple: `https://maps.apple.com/?daddr=${q}`,
  };
}
