import { NextResponse } from "next/server";
import { z } from "zod";
import { MissingKeyError, ModelError, translate } from "@/lib/translate/generate";
import { rateLimit } from "@/lib/translate/rate-limit";

const bodySchema = z.object({
  description: z.string().min(3).max(600),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Describe the segment in a sentence or two." },
      { status: 400 },
    );
  }

  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limit = rateLimit(key, Date.now());
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Translation is limited to six requests a minute. Try again in ${limit.retryAfterSeconds}s — the builder works without it.`,
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    return NextResponse.json(await translate(parsed.data.description));
  } catch (error) {
    if (error instanceof MissingKeyError) {
      return NextResponse.json(
        {
          error:
            "No GEMINI_API_KEY is configured, so prose cannot be translated. Build the query directly — the builder does everything this panel does.",
        },
        { status: 501 },
      );
    }
    if (error instanceof ModelError) {
      return NextResponse.json(
        { error: `The model could not produce a runnable query. ${error.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Translation failed." }, { status: 500 });
  }
}
