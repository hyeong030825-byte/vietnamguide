// GET /api/config → which logins are ready. The page hides the login button when the list is empty.
import { json, configuredProviders } from '../../server/lib.js';

export function onRequestGet({ env }) {
  return json({ app: 'vietnamguide', providers: configuredProviders(env) });
}
