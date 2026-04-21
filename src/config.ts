import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  // 0x
  ZERO_X_API_KEY: z.string().min(1, "ZERO_X_API_KEY is required"),

  // Payment
  PAYMENT_RECIPIENT_ADDRESS: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid EVM address"),

  // x402
  FACILITATOR_URL: z.string().url().optional(),
  CDP_API_KEY_ID: z.string().optional(),
  CDP_API_KEY_SECRET: z.string().optional(),
  X402_NETWORK: z.string().default("eip155:84532"),

  // Pricing
  PRICE_INDICATIVE_PRICE: z.coerce.number().positive().default(0.001),
  PRICE_FIRM_QUOTE: z.coerce.number().positive().default(0.01),

  // Server
  PORT: z.coerce.number().default(4021),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment configuration:");
  parsed.error.issues.forEach((issue) =>
    console.error(`   ${issue.path.join(".")}: ${issue.message}`)
  );
  console.error("\n   Copy .env.example → .env and fill in the values.\n");
  process.exit(1);
}

export const config = parsed.data;

export const isMainnet = !config.X402_NETWORK.includes("84532") &&
  !config.X402_NETWORK.includes("devnet");
