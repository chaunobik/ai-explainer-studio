
import fs from "node:fs";
import path from "node:path";
import {projectDirForSlug} from "../../../../../../lib/project-runtime";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  {params}: {params: {slug: string; assetId: string}},
) {
  try {
    const projectDir = projectDirForSlug(params.slug);
    const project = JSON.parse(
      fs.readFileSync(path.join(projectDir, "project.json"), "utf8"),
    );
    const manifestPath = path.join(projectDir, project.paths.image_assets_manifest);
    if (!fs.existsSync(manifestPath)) {
      return new Response("Image manifest not found", {status: 404});
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const asset = manifest.assets.find(
      (value: any) => value.asset_id === params.assetId,
    );
    if (!asset?.file?.uri) {
      return new Response("Asset file not found", {status: 404});
    }

    const filePath = path.resolve(projectDir, asset.file.uri);
    if (
      !(filePath === projectDir || filePath.startsWith(projectDir + path.sep)) ||
      !fs.existsSync(filePath)
    ) {
      return new Response("Asset file missing", {status: 404});
    }

    const bytes = fs.readFileSync(filePath);
    return new Response(bytes, {
      headers: {
        "Content-Type": asset.file.mime_type ?? "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Asset preview failed",
      {status: 500},
    );
  }
}
