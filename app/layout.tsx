import type { ReactNode } from 'react';
import './globals.css';
import { Header } from './Header';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {/* .stage holds the absolutely-positioned static fallback and the
            streamed children as siblings (see globals.css :has() rule). */}
        <div className="stage">
          <div className="ppr-fallback">Loading store…</div>
          {children}
        </div>
      </body>
    </html>
  );
}
