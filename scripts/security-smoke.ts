import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const targetUrl = process.env.SECURITY_SMOKE_URL ?? "http://localhost:3000/api/i18n/lang";
const method = (process.env.SECURITY_SMOKE_METHOD ?? "POST").toUpperCase();
const attempts = Number(process.env.SECURITY_SMOKE_ATTEMPTS ?? "10");
const rawBody = process.env.SECURITY_SMOKE_BODY;
const requestBody = rawBody ? JSON.parse(rawBody) : { lang: "en" };

const headers: Record<string, string> = {};
if (method !== "GET" && method !== "HEAD") {
  headers["Content-Type"] = "application/json";
}

const run = async () => {
  const counts: Record<string, number> = {};
  for (let i = 0; i < attempts; i += 1) {
    const response = await fetch(targetUrl, {
      method,
      headers,
      ...(method === "GET" || method === "HEAD"
        ? {}
        : { body: JSON.stringify(requestBody) }),
    });
    counts[String(response.status)] = (counts[String(response.status)] ?? 0) + 1;
  }

  console.log(`Security smoke: ${attempts} requests -> ${targetUrl}`);
  console.log("Status counts:", counts);

  if (!counts["429"]) {
    console.log(
      "No 429 observed. Lower the rate limits or increase SECURITY_SMOKE_ATTEMPTS."
    );
  }
};

run().catch((error) => {
  console.error("Security smoke failed:", error);
  process.exitCode = 1;
});
