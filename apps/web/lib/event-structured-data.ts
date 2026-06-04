import type { FixtureView } from "@skorly/db";
import { absoluteUrl } from "@/lib/seo";

type TeamLd = {
  "@type": "SportsTeam";
  name: string;
  logo?: string;
};

type PlaceLd = {
  "@type": "Place";
  name: string;
  address?: {
    "@type": "PostalAddress";
    addressLocality: string;
  };
};

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function teamLd(team: FixtureView["home"]): TeamLd {
  return {
    "@type": "SportsTeam",
    name: team.name,
    ...(team.logo ? { logo: absoluteUrl(team.logo) } : {}),
  };
}

function placeLd(fixture: FixtureView): PlaceLd | null {
  const venue = clean(fixture.venue);
  const city = clean(fixture.city);
  if (!venue && !city) return null;

  return {
    "@type": "Place",
    name: venue ?? city!,
    ...(city
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: city,
          },
        }
      : {}),
  };
}

export function buildFixtureSportsEventLd({
  fixture,
  url,
  image,
  description,
}: {
  fixture: FixtureView;
  url: string;
  image: string;
  description: string;
}): Record<string, unknown> | null {
  const location = placeLd(fixture);
  if (!fixture.kickoffAt || !location) return null;

  const home = teamLd(fixture.home);
  const away = teamLd(fixture.away);
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${fixture.home.name} vs ${fixture.away.name}`,
    sport: "Soccer",
    startDate: fixture.kickoffAt.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location,
    description,
    image: [absoluteUrl(image)],
    url,
    competitor: [home, away],
    performer: [home, away],
    organizer: {
      "@type": "Organization",
      name: "FIFA",
      url: "https://www.fifa.com/",
    },
  };
}
