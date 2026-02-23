import type { NextPageContext } from 'next';

function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <h1>{statusCode ? `${statusCode} - Server Error` : 'Client Error'}</h1>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
