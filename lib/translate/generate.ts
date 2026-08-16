/**
 * Prose to query. The model's one job.
 *
 * It never detects a technology, never assigns a grade, and never resolves a
 * state. It maps a sentence onto predicates the engine already understands, and
 * the result lands in the builder unrun so a human checks it before it decides
 * anything.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { GRAPH } from "@/data/graph";
import { translatedQuerySchema, type TranslatedQuery } from "@/lib/technographics";

const MODEL = "gemini-3.6-flash";

export class MissingKeyError extends Error {}
export class ModelError extends Error {}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    predicates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          op: {
            type: Type.STRING,
            enum: ["has", "has_any_in", "count_in", "not", "gap"],
          },
          technologyId: { type: Type.STRING },
          categoryId: { type: Type.STRING },
          atLeast: { type: Type.INTEGER },
          minGrade: {
            type: Type.STRING,
            enum: ["CONFIRMED", "LIKELY", "HINTED"],
          },
        },
        required: ["op"],
      },
    },
    note: { type: Type.STRING },
  },
  required: ["predicates"],
};

function prompt(description: string): string {
  const technologies = GRAPH.technologies
    .map((technology) => `${technology.id} (${technology.name}, ${technology.category})`)
    .join("\n");
  const categories = GRAPH.categories
    .map((category) => `${category.id} (${category.label})`)
    .join("\n");

  return `Translate a description of a technographic segment into predicates.

Technologies:
${technologies}

Categories:
${categories}

Operators:
- has: technologyId + minGrade
- has_any_in: categoryId + minGrade
- count_in: categoryId + atLeast + minGrade
- not: technologyId
- gap: categoryId

Rules:
- Use only ids from the lists above. Never invent one.
- minGrade is CONFIRMED unless the description asks for weaker evidence.
- "does not use X" is not(X). "no X tools at all" is gap(category).
- "migrating", "switching", "running two" is count_in with atLeast 2.
- Do not judge whether a predicate is answerable. The engine decides that.
- note: one short sentence on anything in the description you could not express.

Description: ${description}`;
}

export async function translate(description: string): Promise<TranslatedQuery> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new MissingKeyError("GEMINI_API_KEY is not set");
  }

  const client = new GoogleGenAI({ apiKey });

  let text: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt(description),
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0,
      },
    });
    text = response.text;
  } catch (error) {
    throw new ModelError(error instanceof Error ? error.message : "model call failed");
  }

  if (text === undefined) throw new ModelError("the model returned no text");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ModelError("the model returned text that is not JSON");
  }

  // A response schema is a request. A validator is a guarantee.
  const result = translatedQuerySchema.safeParse(parsed);
  if (!result.success) {
    throw new ModelError("the model returned a query the engine cannot run");
  }

  for (const predicate of result.data.predicates) {
    if (predicate.op === "has" || predicate.op === "not") {
      GRAPH.technology(predicate.technologyId);
    } else {
      GRAPH.category(predicate.categoryId);
    }
  }

  return result.data;
}
