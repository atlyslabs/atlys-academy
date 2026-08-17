import type { DayId } from "./types";

/**
 * The travel staging layer.
 *
 * Atlys sells trips, so onboarding is staged as one. The joinee flies a real
 * five-stop route and lands at Atlys in Delhi on the last day. Each leg carries
 * a genuine airport code and a latitude and longitude, which is what lets the
 * roadmap put its stations on the actual world map rather than at hand-tuned
 * percentages that mean nothing.
 *
 * Cities are chosen to match what each day teaches: Day 3 covers the US B1/B2
 * visa, so Day 3 lands in New York; Day 4 is routing and coordination, so it
 * sits at a transfer hub. The last leg is fixed by the business, not by me.
 *
 * This is **staging only**. It sits alongside the day content in `days.ts` and
 * never replaces it: `Day.title` and every learn topic, activity and drill stay
 * exactly as the hiring manager wrote them, so the source doc remains
 * recognisable. Nothing here is training content.
 */

export interface JourneyLeg {
  dayId: DayId;
  /** Real IATA airport code. Printed on the boarding pass and the map. */
  code: string;
  /** The city, as it would read on a departures board. */
  place: string;
  /** Where the joinee is standing, in one line. */
  scene: string;
  /** Second-person opening beat, shown on the day's boarding pass. */
  narration: string;
  /** Clock on the terminal display. Pure flavour, fixed per day. */
  clock: string;
  /** Gate label for the boarding pass stub. */
  gate: string;
  /** The line that plays when the day is cleared. */
  cleared: string;
  /** Degrees north, for placing the station on an equirectangular map. */
  lat: number;
  /** Degrees east. Negative is west. */
  lon: number;
}

export const JOURNEY_LEGS: readonly JourneyLeg[] = [
  {
    dayId: 1,
    code: "SYD",
    place: "Sydney",
    scene: "Terminal 1 · Baggage claim",
    narration:
      "You have just landed, a long way from where this ends. Somewhere past the carousel there is a person holding a card with your name on it. Before you find them, work out where you actually are, and collect the kit you cannot work without.",
    clock: "09:15",
    gate: "A1",
    cleared: "Bags collected. You know which building you are in.",
    // The first two legs live in the southern hemisphere because the northern
    // half of this map is full. Sydney and Johannesburg were picked against the
    // real geometry rather than by eye: a plaque is 124px wide and 102px tall on
    // a 900px map, so a pair needs either 13.8 percent of clear width or 26.4
    // percent of clear height between them. Mumbai and Delhi had 1.2 and 1.9,
    // which is why one plaque covered the other and took its click with it.
    lat: -33.94,
    lon: 151.18,
  },
  {
    dayId: 2,
    code: "JNB",
    place: "Johannesburg",
    scene: "Departures · Counter 12",
    narration:
      "Now you are behind the counter, at the busiest desk on the continent. Everyone in this queue is asking one question out loud and a different one underneath. The whole job is hearing the second one.",
    clock: "11:40",
    gate: "B7",
    cleared: "You can hear the question under the question.",
    // Sits 5.4 percent of the width from Frankfurt, which would normally be a
    // collision, but 42 percent of the height below it. Far more clearance than
    // the 26.4 percent a plaque needs, so the two never meet.
    lat: -26.13,
    lon: 28.24,
  },
  {
    dayId: 3,
    code: "JFK",
    place: "New York",
    scene: "The booth · US document check",
    narration:
      "The hardest counter on the route. Three people decide what happens here and only one of them is you. Learn the line between the officer's call, the file you control, and the choices that were always the traveller's.",
    clock: "14:05",
    gate: "C3",
    cleared: "You know whose call is whose.",
    lat: 40.64,
    lon: -73.78,
  },
  {
    dayId: 4,
    code: "FRA",
    place: "Frankfurt",
    scene: "Transfer hub · Routing floor",
    narration:
      "The busiest transfer floor on the network, and the whole terminal is visible from here. Nothing that lands on you stays on you: every situation belongs at a desk, and knowing which one is the difference between an hour and a week.",
    clock: "16:30",
    gate: "D2",
    cleared: "Everything you cannot solve, you can route.",
    lat: 50.04,
    lon: 8.56,
  },
  {
    dayId: 5,
    code: "DEL",
    place: "Delhi",
    scene: "Khullar Farms · You are the desk now",
    narration:
      "Last leg, and the only one that is not an airport. No more shadowing, no more observing. The next voice asking for help is talking to you, and four conversations stand between here and the floor.",
    clock: "18:20",
    gate: "E1",
    cleared: "Redo. Come make the world smaller.",
    lat: 28.56,
    lon: 77.1,
  },
] as const;

export function legForDay(dayId: DayId): JourneyLeg {
  return JOURNEY_LEGS.find((leg) => leg.dayId === dayId) ?? JOURNEY_LEGS[0];
}

/**
 * The opening beat of a leg's narration - its first sentence.
 *
 * The landing page's story line and the day dossier's standfirst must read
 * identically, so the trim lives here with the prose rather than being copied
 * into each view.
 */
export function narrationOpener(leg: JourneyLeg): string {
  const end = leg.narration.indexOf(". ");
  return end === -1 ? leg.narration : leg.narration.slice(0, end + 1);
}
