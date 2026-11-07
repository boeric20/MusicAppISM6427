/**
 * Suno POSTs task events here (stages: text, first, complete).
 * The browser polls /api/status instead of relying on this, because a static
 * site has nowhere durable to park the result. We acknowledge and log so the
 * events show up in the Netlify function logs for debugging.
 */
export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const payload = await req.json();
    const type = payload?.data?.callbackType;
    const taskId = payload?.data?.task_id || payload?.data?.taskId;
    console.log(`Suno callback: type=${type} task=${taskId} code=${payload?.code}`);
  } catch {
    console.log("Suno callback with non-JSON body");
  }
  return new Response(JSON.stringify({ status: "received" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = { path: "/api/callback" };
