const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

class PhotoProcessingService {
  // Generate thumbnail
  static async generateThumbnail(inputPath, outputPath, size = 300) {
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  // Optimize image for storage
  static async optimizeImage(inputPath, outputPath, quality = 85) {
    try {
      const metadata = await sharp(inputPath).metadata();

      let transformer = sharp(inputPath);

      // Resize if too large (max 2048px width)
      if (metadata.width > 2048) {
        transformer = transformer.resize(2048, null, {
          withoutEnlargement: true,
        });
      }

      // Convert to JPEG and compress
      await transformer.jpeg({ quality }).toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  // AI-based night photo enhancement (placeholder for AI integration)
  static async enhanceNightPhoto(inputPath, outputPath) {
    try {
      // Basic enhancement using Sharp (placeholder for AI)
      await sharp(inputPath)
        .modulate({
          brightness: 1.2,
          saturation: 1.1,
        })
        .sharpen()
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error(`Night enhancement failed: ${error.message}`);
    }
  }

  // Extract metadata from image
  static async extractMetadata(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
      };
    } catch (error) {
      throw new Error(`Metadata extraction failed: ${error.message}`);
    }
  }

  // Calculate quality score based on image properties
  static async calculateQualityScore(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await sharp(imagePath).stats();

      let score = 100;

      // Penalize low resolution
      if (metadata.width < 800 || metadata.height < 600) {
        score -= 20;
      }

      // Penalize very large file sizes (indicates poor compression)
      if (metadata.size > 5 * 1024 * 1024) {
        // 5MB
        score -= 15;
      }

      // Check for blur (basic implementation)
      // In a real implementation, you'd use more sophisticated algorithms
      if (stats.channels[0].mean < 50) {
        // Very dark images might be blurry
        score -= 10;
      }

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      return 50; // Default score if analysis fails
    }
  }

  // Detect if photo was taken in low light conditions
  static async detectLowLight(imagePath) {
    try {
      const stats = await sharp(imagePath).stats();
      const avgBrightness =
        stats.channels.reduce((sum, ch) => sum + ch.mean, 0) /
        stats.channels.length;

      return {
        isLowLight: avgBrightness < 80,
        brightness: avgBrightness,
        recommendation: avgBrightness < 80 ? "enhance" : "none",
      };
    } catch (error) {
      return {
        isLowLight: false,
        brightness: null,
        recommendation: "none",
        error: error.message,
      };
    }
  }

  // Create a collage from multiple photos for anomaly reports
  static async createCollage(imagePaths, outputPath, options = {}) {
    try {
      const { width = 1200, height = 800, columns = 2, margin = 10 } = options;

      const rows = Math.ceil(imagePaths.length / columns);
      const cellWidth = Math.floor((width - margin * (columns + 1)) / columns);
      const cellHeight = Math.floor((height - margin * (rows + 1)) / rows);

      const canvas = sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      });

      const composite = [];

      for (let i = 0; i < imagePaths.length; i++) {
        const row = Math.floor(i / columns);
        const col = i % columns;

        const left = margin + col * (cellWidth + margin);
        const top = margin + row * (cellHeight + margin);

        const resizedBuffer = await sharp(imagePaths[i])
          .resize(cellWidth, cellHeight, { fit: "cover" })
          .toBuffer();

        composite.push({
          input: resizedBuffer,
          left,
          top,
        });
      }

      await canvas
        .composite(composite)
        .jpeg({ quality: 90 })
        .toFile(outputPath);
      return outputPath;
    } catch (error) {
      throw new Error(`Collage creation failed: ${error.message}`);
    }
  }
}

module.exports = PhotoProcessingService;
