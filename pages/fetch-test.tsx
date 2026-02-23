export async function getStaticProps() {
  const timestamp = new Date().toISOString();
  console.log(`[FetchTest] getStaticProps called at ${timestamp}`);

  // Fetch with cache tags — this should go through the cache handler's fetch cache
  const res = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
    next: { tags: ['fetch-test', 'jsonplaceholder'], revalidate: 60 },
  });
  const post = await res.json();

  return {
    props: {
      post,
      fetchedAt: timestamp,
    },
    revalidate: 120,
  };
}

export default function FetchTestPage({ post, fetchedAt }: { post: any; fetchedAt: string }) {
  return (
    <div>
      <h1>Fetch Cache Test</h1>
      <p>Title: {post.title}</p>
      <p>Fetched at: {fetchedAt}</p>
    </div>
  );
}
