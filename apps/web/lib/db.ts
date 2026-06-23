import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var makerHubPool: Pool | undefined;
}

function getConnectionString() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("Missing DATABASE_URL for Auth.js adapter.");
  }
  return value;
}

export const pool =
  global.makerHubPool ??
  new Pool({
    connectionString: getConnectionString(),
  });

if (process.env.NODE_ENV !== "production") {
  global.makerHubPool = pool;
}

