import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getProduct } from '@/lib/data';

type Params = { params: Promise<{ id: string }> };

// Prerender concrete shells at BUILD time. The build-time (no-UA) shell is
// postponed with the STREAMING-metadata tree shape (metadata boundary under a
// hidden <div>). A runtime request then RESUMES this exact shell — but with
// htmlLimitedBots:/.*/ a non-empty UA renders the BLOCKING-metadata shape.
// The two tree shapes differ, so React's PPR resume aborts. (#93401)
export function generateStaticParams() {
  return [{ id: 'abc' }, { id: 'xyz' }];
}

// generateMetadata reads params and resolves metadata asynchronously. Keeping
// this resolution OUT of any cache boundary is what preserves the streaming
// metadata tree shape in the prerendered shell (the boundary the bug hinges on).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  await new Promise((resolve) => setTimeout(resolve, 50));
  return {
    title: `Product ${id}`,
    description: `The finest ${id} in the whole store`,
    alternates: { canonical: `/product/${id}` },
    openGraph: { title: `Product ${id}`, url: `/product/${id}` },
  };
}

// The dynamic hole the runtime must RESUME. It reads the cached product lookup
// AND an uncached delay, so it stays a postponed dynamic boundary.
async function RuntimeMarker({ id }: { id: string }) {
  const product = await getProduct(id); // cached lookup
  await new Promise((resolve) => setTimeout(resolve, 50));
  return (
    <p className="streamed">
      Resolved at request time — ₦{product.price.toLocaleString()}
    </p>
  );
}

export default async function ProductPage({ params }: Params) {
  // params is build-known for the prerendered ids, so this stays in the shell.
  const { id } = await params;
  return (
    <main className="card streamed">
      <h1>Product {id}</h1>
      <p>This static shell content is present in the prerendered shell.</p>
      <Suspense fallback={<p>Loading runtime marker…</p>}>
        <RuntimeMarker id={id} />
      </Suspense>
    </main>
  );
}
