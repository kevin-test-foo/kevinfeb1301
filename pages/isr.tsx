export async function getStaticProps() {
  const timestamp = new Date().toISOString();
  console.log(`[ISR] getStaticProps called at ${timestamp}`);

  return {
    props: {
      timestamp,
      message: 'This page uses ISR with 60s revalidation',
    },
    revalidate: 60, // Revalidate every 60 seconds
  };
}

export default function ISRPage({ timestamp, message }: { timestamp: string; message: string }) {
  return (
    <div>
      <h1>ISR Page</h1>
      <p>{message}</p>
      <p>Generated at: {timestamp}</p>
    </div>
  );
}
