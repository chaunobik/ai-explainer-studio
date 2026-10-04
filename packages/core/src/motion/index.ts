export type {MotionOperation, MotionScene, MotionSpec} from "./motion-spec";
export {motionTotalDuration, validateMotionSpec} from "./motion-spec";

export type {
  MotionBackend,
  MotionIntent,
  MotionRoute,
  MotionRoutingInput,
} from "./motion-router";
export {nextMotionBackend, routeMotion} from "./motion-router";
