import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const DEFAULT_MODEL = "llama3.2";

/**
 * GET /api/ai — Check if Ollama is available and list installed models.
 */
export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json({ available: false });
    }

    const data = await res.json();
    const models: string[] = (data.models ?? []).map(
      (m: { name: string }) => m.name
    );

    return NextResponse.json({ available: true, models });
  } catch {
    return NextResponse.json({ available: false });
  }
}

/**
 * POST /api/ai — Generate AI text via Ollama.
 *
 * Supported actions:
 *   - (none)       : free-form generation with optional system-like context
 *   - "impression" : generate a concise clinical impression from findings
 *   - "findings"   : generate structured findings for a body region + indication
 *   - "normal"     : generate normal anatomy description for a body region
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, model, context, action, findings, bodyRegion, clinicalIndication } = body;

    // Resolve the model to use
    let resolvedModel = model || DEFAULT_MODEL;

    // If no explicit model and we couldn't determine one, try to pick the first available
    if (!model) {
      try {
        const tagsRes = await fetch(`${OLLAMA_URL}/api/tags`, {
          signal: AbortSignal.timeout(3000),
        });
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          const models: string[] = (tagsData.models ?? []).map(
            (m: { name: string }) => m.name
          );
          if (models.length > 0) {
            resolvedModel = models[0];
          }
        }
      } catch {
        // Fall back to the default model name
      }
    }

    // Build the effective prompt based on action
    let effectivePrompt = "";

    switch (action) {
      case "impression": {
        if (!findings) {
          return NextResponse.json(
            { error: "Missing required field: findings" },
            { status: 400 }
          );
        }
        effectivePrompt =
          "You are an expert radiologist. Based on the following MRI findings, provide a concise clinical impression with the most important diagnoses listed. Be specific and clinical.\n\nFindings:\n" +
          findings;
        break;
      }

      case "findings": {
        if (!bodyRegion || !clinicalIndication) {
          return NextResponse.json(
            {
              error:
                "Missing required fields: bodyRegion, clinicalIndication",
            },
            { status: 400 }
          );
        }
        effectivePrompt =
          `You are an expert radiologist. For a ${bodyRegion} MRI with clinical indication: ${clinicalIndication}, provide a structured findings description. Include relevant normal and abnormal findings. Be thorough but concise.`;
        break;
      }

      case "normal": {
        if (!bodyRegion) {
          return NextResponse.json(
            { error: "Missing required field: bodyRegion" },
            { status: 400 }
          );
        }
        effectivePrompt =
          `Describe the normal MRI appearance of ${bodyRegion}. Use standard radiological terminology. Be comprehensive.`;
        break;
      }

      default: {
        // Free-form generation — prepend context as system-like instructions
        if (!prompt) {
          return NextResponse.json(
            { error: "Missing required field: prompt" },
            { status: 400 }
          );
        }
        effectivePrompt = context
          ? `${context}\n\n${prompt}`
          : prompt;
        break;
      }
    }

    // Call Ollama generate endpoint
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: resolvedModel,
        prompt: effectivePrompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text().catch(() => "Unknown error");
      return NextResponse.json(
        { error: `Ollama error: ${ollamaRes.status} — ${errorText}` },
        { status: 500 }
      );
    }

    const data = await ollamaRes.json();
    const text = (data.response as string) || "";

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}