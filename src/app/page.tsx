import { EditionCover } from "@/components/landing/EditionCover";

/**
 * The landing page is a single edition cover: one centred card over the
 * touring ASCII globe, with every action inside the card. All composition
 * and derived numbers live in EditionCover (a client component, because the
 * globe tour, the hover story and local progress are browser concerns).
 */
export default function Home() {
  return <EditionCover />;
}
