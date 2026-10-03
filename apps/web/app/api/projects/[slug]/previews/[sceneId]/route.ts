import fs from "node:fs";
import path from "node:path";
import {projectDirForSlug} from "../../../../../../lib/project-runtime";

export const dynamic = "force-dynamic";

function videoResponse(request: Request, filePath: string): Response {
  const stat = fs.statSync(filePath);
  const range = request.headers.get("range");

  if (!range) {
    return new Response(fs.readFileSync(filePath), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(stat.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }

  const match = /bytes=(\d+)-(\d*)/.exec(range);
  if (!match) return new Response("Invalid range", {status: 416});
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : stat.size - 1;
  if (start < 0 || end >= stat.size || start > end) {
    return new Response("Range not satisfiable", {
      status: 416,
      headers: {"Content-Range": "bytes */" + stat.size},
    });
  }

  const bytes = fs.readFileSync(filePath).subarray(start, end + 1);
  return new Response(bytes, {
    status: 206,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(bytes.length),
      "Content-Range": "bytes " + start + "-" + end + "/" + stat.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  request: Request,
  {params}: {params: {slug: string; sceneId: string}},
) {
  try {
    if (!/^S[0-9]+$/.test(params.sceneId)) {
      return new Response("Invalid scene", {status: 400});
    }
    const projectDir = projectDirForSlug(params.slug);
    const filePath = path.join(
      projectDir,
      "output",
      "previews",
      params.sceneId + ".mp4",
    );
    if (!fs.existsSync(filePath)) {
      return new Response("Preview not rendered", {status: 404});
    }
    return videoResponse(request, filePath);
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Preview failed",
      {status: 500},
    );
  }
}
