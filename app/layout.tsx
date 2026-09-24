import type React from "react"
import type { Metadata, Viewport } from "next"

import { OG_IMAGE, SITE_URL } from "@/lib/site"
import { Chakra_Petch, Space_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-chakra-petch",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
})

const DESCRICAO =
  "Entidade de robótica da UFSCar Sorocaba — Competição, Pesquisa e Projetos em automação e inteligência artificial."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GEAR | UFSCar Sorocaba",
  description: DESCRICAO,
  openGraph: {
    title: "GEAR | UFSCar Sorocaba",
    description: DESCRICAO,
    url: "/",
    siteName: "GEAR",
    images: [OG_IMAGE],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GEAR | UFSCar Sorocaba",
    description: DESCRICAO,
    images: [OG_IMAGE.url],
  },
}

/*
 * Dados estruturados. Sem eles o Google lê a GEAR como "um site qualquer";
 * com eles entende que é uma organização educacional ligada à UFSCar, o que
 * habilita o painel de conhecimento e melhora a busca pelo nome da entidade.
 * Só afirma o que é verificável nas próprias páginas do site.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "GEAR — Grupo de Extensão em Automação e Robótica",
  alternateName: "GEAR UFSCar",
  description: DESCRICAO,
  url: SITE_URL,
  logo: `${SITE_URL}/gear-logo-principal.svg`,
  image: `${SITE_URL}${OG_IMAGE.url}`,
  parentOrganization: {
    "@type": "CollegeOrUniversity",
    name: "Universidade Federal de São Carlos",
    alternateName: "UFSCar",
  },
  location: {
    "@type": "Place",
    name: "UFSCar — campus Sorocaba",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sorocaba",
      addressRegion: "SP",
      addressCountry: "BR",
    },
  },
  knowsAbout: [
    "Robótica",
    "Inteligência artificial",
    "Sistemas embarcados",
    "Visão computacional",
    "Controle e automação",
  ],
}

export const viewport: Viewport = {
  themeColor: "#081726",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${chakraPetch.variable} ${spaceMono.variable}`}>
      <body className="font-sans antialiased overflow-x-hidden">
        <script
          type="application/ld+json"
          // conteúdo estático definido acima, não vem de entrada de usuário
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="noise-overlay" />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
