import { exchangeOAuthCode, parseOAuthExchangeRequest, toOAuthErrorResponse } from "@/lib/oauth-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await parseOAuthExchangeRequest(request);
    const result = await exchangeOAuthCode("github", payload);
    return Response.json(result);
  } catch (error) {
    return toOAuthErrorResponse(error);
  }
}
