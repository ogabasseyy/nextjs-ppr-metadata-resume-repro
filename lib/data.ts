// Fake async "database". `'use cache'` marks the lookup as a cached function,
// which is what generateMetadata and the page both call for the same id.
export async function getProduct(id: string) {
  'use cache';
  await new Promise((resolve) => setTimeout(resolve, 50));
  return {
    id,
    name: `Product ${id}`,
    tagline: `The finest ${id} in the whole store`,
    price: 4200 + (id.length % 5) * 100,
  };
}
