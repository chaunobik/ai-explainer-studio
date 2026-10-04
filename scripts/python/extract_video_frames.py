import argparse
import os

import cv2


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--count", type=int, default=5)
    args = parser.parse_args()

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {args.video}")

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total <= 0:
        raise RuntimeError(f"Video has no readable frames: {args.video}")

    os.makedirs(args.out_dir, exist_ok=True)
    count = max(2, min(args.count, total))
    indices = sorted(
        set(round(i * (total - 1) / (count - 1)) for i in range(count))
    )

    written = []
    for index in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, index)
        ok, frame = cap.read()
        if not ok:
            raise RuntimeError(f"Unable to read frame {index} from {args.video}")
        out = os.path.join(args.out_dir, f"frame-{index:06d}.jpg")
        if not cv2.imwrite(out, frame):
            raise RuntimeError(f"Unable to write {out}")
        written.append(out)

    cap.release()
    for out in written:
        print(out)


if __name__ == "__main__":
    main()
