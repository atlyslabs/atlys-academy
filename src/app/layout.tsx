import type { Metadata } from "next";
import { Playfair_Display, Schibsted_Grotesk } from "next/font/google";
import { DAYS } from "@/content/onboarding/days";
import { LoadingScreen } from "@/components/fx/LoadingScreen";
import "./globals.css";

/**
 * The document shell.
 *
 * Schibsted Grotesk carries the UI - a grotesque drawn for a news house, so
 * it has real editorial character at masthead sizes and stays crisp at
 * caption sizes. Playfair Display is the display serif standing in for
 * Denton (the Atlys brand serif, commercially licensed and not in this
 * repo): the italic wordmark, roman numerals, and stage captions.
 */
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontVariables = [schibsted.variable, playfair.variable].join(" ");

export const metadata: Metadata = {
  title: "Atlys Academy",
  // Derived, not written down: the journey was scoped from five days to three
  // and this string was the last place still claiming five.
  description:
    `Guided onboarding for the Pre-checkout Sales function at Atlys: ${DAYS.length} days, ` +
    "from your first shadowed chat to your first live one.",
  applicationName: "Atlys Academy",
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon", sizes: "any" }],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the cold-open script below stamps a data
    // attribute on <html> before hydration, exactly like a theme script.
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">
        <script
          // Decides before first paint whether the cold open plays this
          // session - so there is never a flash, and JS-off readers simply
          // get the page. See src/components/fx/LoadingScreen.tsx.
          dangerouslySetInnerHTML={{
            __html: `try{var k="atlys.academy.boot";if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,"1");document.documentElement.dataset.boot="play"}}catch(e){}`,
          }}
        />
        {children}
        <LoadingScreen />
      </body>
    </html>
  );
}
