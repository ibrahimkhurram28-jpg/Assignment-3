import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageTracker } from "@/components/PageTracker";

export const metadata = {
  title: "Phoneme Builder: Speech Pathology Classroom Activities",
  description:
    "A builder for saving phoneme word lists and creating Wordle and Word Search classroom activities for Speech Pathology teaching.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <PageTracker />
          <Header />
          <main id="main" tabIndex={-1} className="flex-1 w-full">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
