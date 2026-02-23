export default function HomePage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Pages Router Cache Handler Test</h1>

      <h2>Test Pages</h2>
      <ul>
        <li><a href="/isr">ISR Page</a> (60s revalidation)</li>
        <li><a href="/ssg">SSG Page</a> (no revalidation)</li>
        <li><a href="/posts/1">Post 1</a> (dynamic ISR, 30s)</li>
        <li><a href="/posts/2">Post 2</a> (dynamic ISR, 30s)</li>
        <li><a href="/posts/99">Post 99</a> (fallback: blocking)</li>
        <li><a href="/fetch-test">Fetch Cache Test</a> (fetch with tags)</li>
      </ul>

      <h2>API Endpoints</h2>
      <ul>
        <li><a href="/api/revalidate-path?path=/isr">Revalidate /isr</a></li>
        <li><a href="/api/revalidate-path?path=/posts/1">Revalidate /posts/1</a></li>
        <li><a href="/api/revalidate-tag?tag=fetch-test">Revalidate tag: fetch-test</a></li>
        <li><a href="/api/cache-stats">Cache Stats</a></li>
      </ul>
    </div>
  );
}
