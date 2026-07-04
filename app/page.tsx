import Link from 'next/link';

export default function Home() {
  return (
    <div className="streamed card">
      <h1>PPR metadata resume repro</h1>
      <p>
        Visit a dynamic product route to exercise generateMetadata under Cache
        Components / PPR:
      </p>
      <ul>
        <li>
          <Link href="/product/abc">/product/abc</Link>
        </li>
        <li>
          <Link href="/product/xyz">/product/xyz</Link>
        </li>
      </ul>
    </div>
  );
}
