export function buildDirectConversationPairKey(userIdA: string, userIdB: string) {
  const [first, second] = [userIdA, userIdB].sort((a, b) => a.localeCompare(b));
  return `${first}::${second}`;
}