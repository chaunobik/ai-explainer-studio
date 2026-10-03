import type { ValidationIssue, ValidationReport } from "../pipeline/types";

export type MotionOperation =
  | {
      type: "camera";
      start_sec: number;
      end_sec: number;
      from_scale: number;
      to_scale: number;
      from_x: number;
      to_x: number;
      from_y: number;
      to_y: number;
    }
  | {
      type: "heat_flow";
      start_sec: number;
      end_sec: number;
      direction: "forward";
      speed: number;
      paths: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    }
  | {
      type: "highlight";
      start_sec: number;
      end_sec: number;
      x: number;
      y: number;
      width: number;
      height: number;
      opacity: number;
      label?: string;
    }
  | {
      type: "label";
      start_sec: number;
      end_sec: number;
      text: string;
      x: number;
      y: number;
      font_size: number;
      align?: "left" | "center" | "right";
    }
  | {
      type: "opacity";
      start_sec: number;
      end_sec: number;
      from_opacity: number;
      to_opacity: number;
    };

export interface MotionScene {
  scene_id: string;
  duration_sec: number;
  source_asset_ids: string[];
  background?: "image" | "solid";
  solid_background?: string;
  operations: MotionOperation[];
}

export interface MotionSpec {
  motion_plan_id: string;
  project_id: string;
  fps: number;
  width: 1080;
  height: 1920;
  scenes: MotionScene[];
}

function add(
  list: ValidationIssue[],
  code: string,
  path: string,
  message: string,
  severity: "error" | "warning" = "error",
): void {
  list.push({ code, path, message, severity });
}

export function validateMotionSpec(
  spec: MotionSpec,
  storyboardSceneDurations?: Map<string, number>,
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const sceneIds = spec.scenes.map((scene) => scene.scene_id);

  if (new Set(sceneIds).size !== sceneIds.length) {
    add(issues, "MOTION_DUP_SCENE", "motion.scenes", "Motion scene IDs must be unique.");
  }

  for (const [sceneIndex, scene] of spec.scenes.entries()) {
    const storyboardDuration = storyboardSceneDurations?.get(scene.scene_id);
    if (
      storyboardDuration != null &&
      Math.abs(storyboardDuration - scene.duration_sec) > 0.001
    ) {
      add(
        issues,
        "MOTION_DURATION_MISMATCH",
        `motion.scenes[${sceneIndex}].duration_sec`,
        `Motion duration ${scene.duration_sec}s differs from storyboard duration ${storyboardDuration}s.`,
      );
    }

    for (const [opIndex, operation] of scene.operations.entries()) {
      if (operation.end_sec <= operation.start_sec) {
        add(
          issues,
          "MOTION_BAD_WINDOW",
          `motion.scenes[${sceneIndex}].operations[${opIndex}]`,
          "Motion operation end_sec must be greater than start_sec.",
        );
      }

      if (operation.start_sec < 0 || operation.end_sec > scene.duration_sec) {
        add(
          issues,
          "MOTION_WINDOW_OUTSIDE_SCENE",
          `motion.scenes[${sceneIndex}].operations[${opIndex}]`,
          `Operation window [${operation.start_sec}, ${operation.end_sec}] lies outside scene duration ${scene.duration_sec}s.`,
        );
      }

      if (operation.type === "heat_flow") {
        if (operation.direction !== "forward") {
          add(
            issues,
            "MOTION_HEAT_DIRECTION",
            `motion.scenes[${sceneIndex}].operations[${opIndex}]`,
            "Heat-flow direction must be explicitly forward along the declared path.",
          );
        }

        for (const [pathIndex, path] of operation.paths.entries()) {
          if (path.x1 === path.x2 && path.y1 === path.y2) {
            add(
              issues,
              "MOTION_ZERO_PATH",
              `motion.scenes[${sceneIndex}].operations[${opIndex}].paths[${pathIndex}]`,
              "Heat-flow path must have non-zero length.",
            );
          }
        }
      }
    }

    if ((scene.background ?? "image") === "image" && scene.source_asset_ids.length === 0) {
      add(
        issues,
        "MOTION_MISSING_SOURCE",
        `motion.scenes[${sceneIndex}].source_asset_ids`,
        "Image-background scene requires at least one source asset.",
      );
    }
  }

  const errors = issues.filter((value) => value.severity === "error");
  const warnings = issues.filter((value) => value.severity === "warning");
  return { ok: errors.length === 0, errors, warnings };
}

export function motionTotalDuration(spec: MotionSpec): number {
  return spec.scenes.reduce((total, scene) => total + scene.duration_sec, 0);
}
