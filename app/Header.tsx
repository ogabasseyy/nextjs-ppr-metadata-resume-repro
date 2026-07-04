'use client';

import { useState } from 'react';

// Small interactive chrome that must hydrate on the client. In the PART 2
// scenario this is what reconciles against the static PPR fallback sibling.
export function Header() {
  const [count, setCount] = useState(0);
  return (
    <header>
      <strong>PPR Repro Store</strong>
      <button type="button" onClick={() => setCount((n) => n + 1)}>
        Cart ({count})
      </button>
    </header>
  );
}
