import type { GetStaticPaths, GetStaticProps } from 'next';

interface Post {
  id: string;
  title: string;
  body: string;
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [{ params: { id: '1' } }, { params: { id: '2' } }],
    fallback: 'blocking', // Generate new pages on-demand
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const id = params?.id as string;
  const timestamp = new Date().toISOString();
  console.log(`[Posts/${id}] getStaticProps called at ${timestamp}`);

  return {
    props: {
      post: {
        id,
        title: `Post ${id}`,
        body: `Content for post ${id}, generated at ${timestamp}`,
      },
      generatedAt: timestamp,
    },
    revalidate: 30,
  };
};

export default function PostPage({ post, generatedAt }: { post: Post; generatedAt: string }) {
  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      <p>Generated at: {generatedAt}</p>
    </div>
  );
}
