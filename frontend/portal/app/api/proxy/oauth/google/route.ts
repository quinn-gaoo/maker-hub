import { exchangeOAuthCode, parseOAuthExchangeRequest, toOAuthErrorResponse } from "@/lib/oauth-proxy";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const payload = await parseOAuthExchangeRequest(request, "google");
    const result = await exchangeOAuthCode("google", payload);
    return Response.json(result);
  } catch (error) {
    return toOAuthErrorResponse("google", error);
  }
}
