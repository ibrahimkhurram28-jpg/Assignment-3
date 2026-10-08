import { readId, withErrorHandling } from "@/lib/server/http";
import { generateActivityHtml } from "@/lib/services/generationService";

export const dynamic = "force-dynamic";

// GET /api/activities/:id/generate            -> downloads the HTML file
// GET /api/activities/:id/generate?view=inline -> opens it in the browser
// Both are recorded in GenerationLog (kind DOWNLOAD or VIEW), failures included.
export const GET = withErrorHandling(async (request, context) => {
  const id = await readId(context);
  const inline = request.nextUrl.searchParams.get("view") === "inline";
  const { html, fileName, byteSize, wordCount } = await generateActivityHtml(id, {
    kind: inline ? "VIEW" : "DOWNLOAD",
  });

  const disposition = inline ? "inline" : "attachment";
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": String(byteSize),
      "Cache-Control": "no-store",
      "X-Word-Count": String(wordCount),
      "X-File-Name": fileName,
    },
  });
});
