'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ComplexArt } from '@/components/home/ComplexArt';
import { ComplexSky } from '@/components/home/ComplexSky';
import { ComplexWeather } from '@/components/home/ComplexWeather';
import { CLEAR, scene, type Weather } from '@/lib/sky';
import type { Zone } from '@/components/home/ComplexExplorer';

// Hero podstránky: ilustrácia areálu priblížená na danú časť, s rovnakým časom a počasím ako na hlavnej stránke.
const VIEW: Record<Zone, string> = {
  ice: '40 140 860 400',
  sky: '560 290 520 250',
  food: '560 330 520 250',
  pitch: '700 270 640 300',
  gym: '1000 230 620 290',
  well: '1000 300 620 290',
};

export function ZoneHero({ zone, now: initialNow, weather = CLEAR }: { zone: Zone; now: number; weather?: Weather }) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);
  const sky = useMemo(() => scene(now, weather), [now, weather]);
  return (
    <>
      <div className={`cx__art cxe__art band2__art ph-${sky.phase}${sky.lights ? ' lights-on' : ''} is-${zone}`} aria-hidden="true">
        <svg viewBox={VIEW[zone]} preserveAspectRatio="xMidYMid slice" focusable="false">
          <ComplexArt sky={<ComplexSky s={sky} w={weather} />} front={<ComplexWeather s={sky} w={weather} />} />
        </svg>
      </div>
      <Link href={`/?areal=${zone}#komplex`} className="band2__where">
        Ukázať v areáli
        <span aria-hidden="true">→</span>
      </Link>
    </>
  );
}
