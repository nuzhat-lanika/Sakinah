import './globals.css'

export const metadata = {
  title: "Sakinah — Qur'an Companion",
  description: "AI-powered Qur'an reflection, grammar learning, and memorization.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="page-wrapper">
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  )
}
