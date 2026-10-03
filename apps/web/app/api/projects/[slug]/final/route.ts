import fs from "node:fs";
import path from "node:path";
import {projectDirForSlug} from "../../../../../lib/project-runtime";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  {params}: {params: {slug: string}},
) {
  try {
    const projectDir = projectDirForSlug(params.slug);
    const project = JSON.parse(
      fs.readFileSync(path.join(projectDir, "project.json"), "utf8"),
    );
    const filePath = path.resolve(projectDir, project.paths.output_file);
    if (!fs.existsSync(filePath)) {
      return new Response("Final video not rendered", {status: 404});
    }

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
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Final video failed",
      {status: 500},
    );
  }
}
