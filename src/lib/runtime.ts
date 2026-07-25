/**
 * Which kind of host is this process running on.
 *
 * Three things behave differently on a serverless platform (Vercel, Netlify,
 * a bare Lambda) than on a long-running Node host, and each of them is a
 * silent failure rather than a loud one:
 *
 * 1. The filesystem is read-only apart from `/tmp`, and `/tmp` is discarded
 *    with the instance — file logging writes nothing anyone can read.
 * 2. The instance is frozen the moment a response is sent, so a detached
 *    promise (`void doWork()`) is never finished.
 * 3. Every concurrent instance opens its own Postgres pool, so a pool sized
 *    for one big server multiplies until the database refuses connections.
 *
 * Each of those is handled at its own call site; this module only answers
 * "am I on that kind of host". `VERCEL` and `NETLIFY` are set by the
 * platforms themselves, `AWS_LAMBDA_FUNCTION_NAME` by the Lambda runtime.
 * `SERVERLESS=1` forces the same behaviour anywhere else.
 */
export const IS_VERCEL = process.env.VERCEL === '1'

export const IS_SERVERLESS =
  IS_VERCEL ||
  process.env.NETLIFY === 'true' ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  process.env.SERVERLESS === '1'
