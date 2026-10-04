export interface ImageWorkflowOptions {
  checkpoint: string;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  filenamePrefix: string;
}

export interface ImageCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function textToImageWorkflow(
  options: ImageWorkflowOptions,
): Record<string, unknown> {
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: options.cfg,
        denoise: 1,
        latent_image: ["5", 0],
        model: ["4", 0],
        negative: ["7", 0],
        positive: ["6", 0],
        sampler_name: options.sampler,
        scheduler: options.scheduler,
        seed: options.seed,
        steps: options.steps,
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {ckpt_name: options.checkpoint},
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: {
        batch_size: 1,
        height: options.height,
        width: options.width,
      },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {clip: ["4", 1], text: options.prompt},
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {clip: ["4", 1], text: options.negativePrompt},
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {samples: ["3", 0], vae: ["4", 2]},
    },
    "9": {
      class_type: "SaveImage",
      inputs: {filename_prefix: options.filenamePrefix, images: ["8", 0]},
    },
  };
}

export function imageToImageWorkflow(
  options: ImageWorkflowOptions & {
    inputFilename: string;
    denoise: number;
    crop?: ImageCropRect;
  },
): Record<string, unknown> {
  const sourceNode = options.crop ? "12" : "10";
  const workflow: Record<string, any> = {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: options.cfg,
        denoise: options.denoise,
        latent_image: ["11", 0],
        model: ["4", 0],
        negative: ["7", 0],
        positive: ["6", 0],
        sampler_name: options.sampler,
        scheduler: options.scheduler,
        seed: options.seed,
        steps: options.steps,
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {ckpt_name: options.checkpoint},
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {clip: ["4", 1], text: options.prompt},
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {clip: ["4", 1], text: options.negativePrompt},
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {samples: ["3", 0], vae: ["4", 2]},
    },
    "9": {
      class_type: "SaveImage",
      inputs: {filename_prefix: options.filenamePrefix, images: ["8", 0]},
    },
    "10": {
      class_type: "LoadImage",
      inputs: {image: options.inputFilename},
    },
    "11": {
      class_type: "VAEEncode",
      inputs: {pixels: ["13", 0], vae: ["4", 2]},
    },
    "13": {
      class_type: "ImageScale",
      inputs: {
        image: [sourceNode, 0],
        upscale_method: "lanczos",
        width: options.width,
        height: options.height,
        crop: "center",
      },
    },
  };

  if (options.crop) {
    workflow["12"] = {
      class_type: "ImageCrop",
      inputs: {
        image: ["10", 0],
        width: options.crop.width,
        height: options.crop.height,
        x: options.crop.x,
        y: options.crop.y,
      },
    };
  }

  return workflow;
}
