import { Metadata } from "next";
import { cookies } from "next/headers";
import "../styles/globals.css";
import ReduxProvider from "@/lib/ReduxProvider";

export const metadata: Metadata = {
  title: "", // Replace  with your website name
  description: "", // Description of your website
  icons: {
    icon: "/favicon.ico", // Path to your favicon
  },
  openGraph: {
    title: "",
    description: " - ",
    url: "https://yourwebsite.com", // Replace with your website URL
    siteName: "",
    images: [
      {
        url: "https://yourwebsite.com/og-image.jpg", // Path to your Open Graph image
        width: 800,
        height: 600,
      },
    ],
    locale: "vi_VN", // Replace with appropriate locale
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const getLocale = async () => {
    const cookieStore = await cookies();
    return cookieStore.get("NEXT_LOCALE")?.value || "en";
  };
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head></head>
      <body className="m-0 p-0">
        <div className=" bg-light main-container">
          <ReduxProvider>{children}</ReduxProvider>
        </div>
      </body>
    </html>
  );
}
