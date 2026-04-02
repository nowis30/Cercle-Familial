const command = process.argv[2];

const truthy = new Set(["1", "true", "yes", "on"]);

function isEnabled(value) {
  if (!value) return false;
  return truthy.has(String(value).toLowerCase());
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!command) {
  fail("[guard-prisma] Commande manquante.");
}

const isProduction = process.env.NODE_ENV === "production" || isEnabled(process.env.VERCEL) || isEnabled(process.env.CI);

if (command === "db-push") {
  const allowed = isEnabled(process.env.ALLOW_PRISMA_DB_PUSH);
  if (!allowed) {
    fail(
      "[guard-prisma] prisma db push bloque. Utilisez les migrations versionnees.\n" +
        "Pour un cas exceptionnel local uniquement: ALLOW_PRISMA_DB_PUSH=1 npm run prisma:push",
    );
  }
}

if (command === "migrate-reset") {
  const allowed = isEnabled(process.env.ALLOW_PRISMA_RESET) && !isProduction;
  if (!allowed) {
    fail(
      "[guard-prisma] prisma migrate reset bloque.\n" +
        "Autorise uniquement en local avec ALLOW_PRISMA_RESET=1 et hors CI/prod.",
    );
  }
}

if (command === "migrate-dev") {
  if (isProduction) {
    fail("[guard-prisma] prisma migrate dev est interdit en CI/prod. Utilisez prisma migrate deploy.");
  }
}
