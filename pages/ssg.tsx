export async function getStaticProps() {
  const timestamp = new Date().toISOString();
  console.log(`[SSG] getStaticProps called at ${timestamp}`);

  return {
    props: {
      timestamp,
      message: 'This page is fully static (SSG, no revalidation)',
    },
  };
}

export default function SSGPage({ timestamp, message }: { timestamp: string; message: string }) {
  return (
    <div>
      <h1>SSG Page</h1>
      <p>{message}</p>
      <p>Built at: {timestamp}</p>
    </div>
  );
}
