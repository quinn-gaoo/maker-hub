import { NextRequest } from "next/server";

const UPSTREAM_API_BASE = "http://124.221.252.106:8000";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildUpstreamUrl(pathSegments: string[], search: string) {
  const pathname = pathSegments.map(encodeURIComponent).join("/");
  return `${UPSTREAM_API_BASE}/api/v1/${pathname}${search}`;
}

function buildUpstreamHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  for (const headerName of HOP_BY_HOP_HEADERS) {
    headers.delete(headerName);
  }

  return headers;
}

async function forwardRequest(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.search);
  const headers = buildUpstreamHeaders(request);
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstreamResponse = await fetch(upstreamUrl, init);
  const responseHeaders = new Headers(upstreamResponse.headers);

  for (const headerName of HOP_BY_HOP_HEADERS) {
    responseHeaders.delete(headerName);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context);
}
