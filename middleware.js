// Edge middleware: rewrite Origin/Ar-Origin when proxying API so login works from *.vercel.app
export const config = {
  matcher: ["/api/:path*"],
};

export default async function middleware(request) {
  if (request.method === "OPTIONS") {
    const h = new Headers();
    h.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
    h.set("Access-Control-Allow-Credentials", "true");
    h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    h.set(
      "Access-Control-Allow-Headers",
      request.headers.get("Access-Control-Request-Headers") || "*"
    );
    h.set("Access-Control-Max-Age", "86400");
    return new Response(null, { status: 204, headers: h });
  }

  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, "https://BigMumbaiapi.com");

  const headers = new Headers(request.headers);
  headers.set("Origin", "https://www.bigmumbaie.com");
  headers.set("Referer", "https://www.bigmumbaie.com/");
  headers.set("Ar-Origin", "https://www.bigmumbaie.com");
  headers.delete("host");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const resp = await fetch(target, init);
  const outHeaders = new Headers(resp.headers);
  outHeaders.set("Access-Control-Allow-Origin", request.headers.get("Origin") || "*");
  outHeaders.set("Access-Control-Allow-Credentials", "true");
  outHeaders.delete("content-encoding");
  outHeaders.delete("transfer-encoding");

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: outHeaders,
  });
}
