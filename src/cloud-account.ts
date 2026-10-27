// Store only account identity fields needed by the game; Firebase Auth remains the source of truth.
interface AccountSource { displayName?: unknown; email?: unknown }
interface AccountFields { displayName?: string; email?: string }

export function googleAccountFields(user: AccountSource | null | undefined): AccountFields {
  const result: AccountFields = {};
  const name = typeof user?.displayName === 'string' ? user.displayName.trim() : '';
  const email = typeof user?.email === 'string' ? user.email.trim() : '';
  if (name && name.length <= 200) result.displayName = name;
  if (email && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) result.email = email;
  return result;
}
