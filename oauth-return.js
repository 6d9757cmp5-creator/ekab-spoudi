// The one-time login secret stays in memory and is consumed once by the SDK.
export async function finishOAuthReturn({ href, clearAddress, createSession, getUser }) {
  const url = new URL(href);
  const userIds = url.searchParams.getAll('userId');
  const secrets = url.searchParams.getAll('secret');
  url.search = '';
  url.hash = '';
  clearAddress(url.href); // Scrub before validation, network requests or redirects.
  const userId = userIds[0], secret = secrets[0];
  if (userIds.length !== 1 || secrets.length !== 1 || !userId || !secret || userId.length > 128 || secret.length > 4096) {
    throw new Error('invalid-oauth-return');
  }
  await createSession({ userId, secret });
  const user = await getUser();
  if (!user || user.$id !== userId) throw new Error('session-not-confirmed');
  return user;
}
