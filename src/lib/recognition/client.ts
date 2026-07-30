import type { RecognitionDraft } from "@/types/domain";
import { normalizeRecognition } from "@/lib/recognition/normalize";

const timeoutMs = 20_000;

function basicAuthorization(): string | null {
  const id = process.env.ANGUS_CLIENT_ID;
  const secret = process.env.ANGUS_CLIENT_SECRET;
  if (!id || !secret) return null;
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Some providers return plain OCR text. The normalizer accepts it as raw text.
  }
  if (!response.ok) {
    throw new Error(`Angus request failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return body;
}

async function callGenericJson(imageUrl: string): Promise<unknown> {
  const endpoint = process.env.ANGUS_API_URL;
  if (!endpoint) throw new Error("ANGUS_API_URL is required for generic-json mode");
  const authorization = basicAuthorization();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify({
      imageUrl,
      task: "Extract product name, production date, shelf life and expiry date from the package image.",
      output: "json",
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  return parseResponse(response);
}

async function callAngusRest(image: Blob): Promise<unknown> {
  const base = (process.env.ANGUS_API_URL || "https://gate.angus.ai").replace(/\/$/, "");
  const service = process.env.ANGUS_SERVICE_NAME;
  const version = process.env.ANGUS_SERVICE_VERSION || "1";
  const authorization = basicAuthorization();
  if (!service) throw new Error("ANGUS_SERVICE_NAME is required for angus-rest mode");
  if (!authorization) throw new Error("ANGUS_CLIENT_ID and ANGUS_CLIENT_SECRET are required");

  const form = new FormData();
  form.append("attachment://image", image, "item.jpg");
  form.append(
    "meta",
    new Blob(
      [JSON.stringify({ async: false, image: "attachment://image" })],
      { type: "application/json" },
    ),
  );

  const response = await fetch(`${base}/services/${service}/${version}/jobs`, {
    method: "POST",
    headers: { authorization },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  return parseResponse(response);
}

function mockResponse(): unknown {
  const configured = process.env.ANGUS_MOCK_RESPONSE;
  if (configured) {
    try {
      return JSON.parse(configured);
    } catch {
      return { rawText: configured };
    }
  }
  return {
    rawText: null,
    warnings: ["当前使用 Angus Mock 模式，请手动填写识别信息。"],
  };
}

export async function recognizeItem(input: {
  image: Blob;
  signedImageUrl: string;
}): Promise<RecognitionDraft> {
  const mode = (process.env.ANGUS_API_MODE || "mock").toLowerCase();
  try {
    let raw: unknown;
    if (mode === "generic-json") {
      raw = await callGenericJson(input.signedImageUrl);
    } else if (mode === "angus-rest") {
      raw = await callAngusRest(input.image);
    } else {
      raw = mockResponse();
    }

    const result = normalizeRecognition(raw, `angus:${mode}`);
    if (mode === "mock") {
      result.warnings.unshift("当前为 Mock 识别模式，核心手动录入流程仍可完整测试。");
    }
    return result;
  } catch (error) {
    console.error("Angus recognition error", error);
    return {
      name: null,
      produceDate: null,
      shelfLife: null,
      expireDate: null,
      rawText: null,
      warnings: ["图像识别暂时失败，请手动填写后继续。"],
      provider: `angus:${mode}:failed`,
    };
  }
}
