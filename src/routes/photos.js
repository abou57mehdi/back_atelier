const express = require("express");
const router = express.Router();
const Photo = require("../models/Photo");
const upload = require("../middleware/upload");
const PhotoProcessingService = require("../services/PhotoProcessingService");
const StorageService = require("../services/StorageService");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs").promises;

// JWT middleware
function auth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
}
// GET /api/photos - Get all photos
router.get("/", auth, async (req, res) => {
  try {
    const photos = await Photo.find()
      .populate("uploadedBy", "firstName lastName")
      .populate("relatedAnomalyId")
      .populate("relatedEquipmentId", "billunId internalId licensePlate");
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/photos/upload - Upload photos (multiple files)
router.post("/upload", auth, upload.array("photos", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No photos uploaded" });
    }

    const {
      anomalyId,
      equipmentId,
      geolocation,
      deviceInfo,
      enhanceNight = false,
    } = req.body;

    const uploadedPhotos = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // Process geolocation if provided
        let geoData = null;
        if (geolocation) {
          try {
            geoData =
              typeof geolocation === "string"
                ? JSON.parse(geolocation)
                : geolocation;
          } catch (e) {
            console.warn("Invalid geolocation data:", e.message);
          }
        }

        // Process device info
        let deviceData = null;
        if (deviceInfo) {
          try {
            deviceData =
              typeof deviceInfo === "string"
                ? JSON.parse(deviceInfo)
                : deviceInfo;
          } catch (e) {
            console.warn("Invalid device info:", e.message);
          }
        }

        // Generate optimized version
        const optimizedPath = path.join(
          path.dirname(file.path),
          "opt-" + path.basename(file.path)
        );
        await PhotoProcessingService.optimizeImage(file.path, optimizedPath);

        // Generate thumbnail
        const thumbnailPath = path.join(
          path.dirname(file.path),
          "thumb-" + path.basename(file.path, path.extname(file.path)) + ".jpg"
        );
        await PhotoProcessingService.generateThumbnail(
          optimizedPath,
          thumbnailPath
        );

        // AI enhancement if requested
        let finalPath = optimizedPath;
        let enhancementType = "none";
        if (enhanceNight) {
          const enhancedPath = path.join(
            path.dirname(file.path),
            "enhanced-" + path.basename(file.path)
          );
          await PhotoProcessingService.enhanceNightPhoto(
            optimizedPath,
            enhancedPath
          );
          finalPath = enhancedPath;
          enhancementType = "night";
        }

        // Upload to storage
        const storageResult = await StorageService.uploadPhoto(
          finalPath,
          `billun-${Date.now()}-${path.basename(file.filename)}`
        );

        const thumbnailStorageResult = await StorageService.uploadPhoto(
          thumbnailPath,
          `thumb-billun-${Date.now()}-${path.basename(file.filename)}`
        );

        // Calculate quality score
        const qualityScore = await PhotoProcessingService.calculateQualityScore(
          finalPath
        );

        // Extract metadata
        const metadata = await PhotoProcessingService.extractMetadata(
          finalPath
        );

        // Create photo record
        const photo = new Photo({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          storageUrl: storageResult.url,
          thumbnailUrl: thumbnailStorageResult.url,
          localPath: file.path,
          uploadedBy: req.user.id,
          relatedAnomalyId: anomalyId,
          relatedEquipmentId: equipmentId,
          geolocation: geoData,
          deviceInfo: deviceData,
          aiEnhanced: enhanceNight,
          enhancementType,
          qualityScore,
          status: "ready",
        });

        await photo.save();

        // Clean up temporary files
        try {
          await fs.unlink(file.path);
          await fs.unlink(optimizedPath);
          await fs.unlink(thumbnailPath);
          if (finalPath !== optimizedPath) {
            await fs.unlink(finalPath);
          }
        } catch (cleanupError) {
          console.warn("Cleanup failed:", cleanupError.message);
        }

        uploadedPhotos.push({
          id: photo._id,
          url: photo.storageUrl,
          thumbnailUrl: photo.thumbnailUrl,
          qualityScore: photo.qualityScore,
          aiEnhanced: photo.aiEnhanced,
        });
      } catch (fileError) {
        errors.push({
          filename: file.originalname,
          error: fileError.message,
        });
      }
    }

    res.status(201).json({
      message: `${uploadedPhotos.length} photos uploaded successfully`,
      photos: uploadedPhotos,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/photos/:id - Get photo details
router.get("/:id", auth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id)
      .populate("uploadedBy", "firstName lastName")
      .populate("relatedAnomalyId")
      .populate("relatedEquipmentId", "billunId internalId licensePlate");

    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }

    res.json(photo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/photos/:id/enhance - AI enhance photo
router.put("/:id/enhance", auth, async (req, res) => {
  try {
    const { enhancementType = "night" } = req.body;

    const photo = await Photo.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }

    if (photo.aiEnhanced) {
      return res.status(400).json({ error: "Photo already enhanced" });
    }

    // Update status to processing
    photo.status = "processing";
    await photo.save();

    try {
      // Download original photo for processing
      // This is a simplified version - in production you'd handle this differently
      const tempPath = path.join(
        __dirname,
        "../../temp",
        `enhance-${photo._id}.jpg`
      );

      // For local storage, copy the file
      if (photo.localPath && require("fs").existsSync(photo.localPath)) {
        require("fs").copyFileSync(photo.localPath, tempPath);
      } else {
        // Download from remote storage
        const response = await require("axios").get(photo.storageUrl, {
          responseType: "stream",
        });
        const writer = require("fs").createWriteStream(tempPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });
      }

      // Apply enhancement
      const enhancedPath = path.join(
        path.dirname(tempPath),
        "enhanced-" + path.basename(tempPath)
      );

      if (enhancementType === "night") {
        await PhotoProcessingService.enhanceNightPhoto(tempPath, enhancedPath);
      } else {
        // Other enhancement types can be added here
        throw new Error("Unsupported enhancement type");
      }

      // Upload enhanced version
      const storageResult = await StorageService.uploadPhoto(
        enhancedPath,
        `enhanced-${photo.filename}`
      );

      // Create new photo record for enhanced version
      const enhancedPhoto = new Photo({
        filename: `enhanced-${photo.filename}`,
        originalName: `enhanced-${photo.originalName}`,
        mimetype: photo.mimetype,
        size: require("fs").statSync(enhancedPath).size,
        storageUrl: storageResult.url,
        thumbnailUrl: photo.thumbnailUrl, // Reuse original thumbnail
        uploadedBy: photo.uploadedBy,
        relatedAnomalyId: photo.relatedAnomalyId,
        relatedEquipmentId: photo.relatedEquipmentId,
        geolocation: photo.geolocation,
        deviceInfo: photo.deviceInfo,
        aiEnhanced: true,
        enhancementType,
        originalPhotoId: photo._id,
        qualityScore: await PhotoProcessingService.calculateQualityScore(
          enhancedPath
        ),
        status: "ready",
      });

      await enhancedPhoto.save();

      // Update original photo
      photo.status = "ready";
      await photo.save();

      // Clean up temp files
      try {
        await fs.unlink(tempPath);
        await fs.unlink(enhancedPath);
      } catch (cleanupError) {
        console.warn("Cleanup failed:", cleanupError.message);
      }

      res.json({
        message: "Photo enhanced successfully",
        original: photo,
        enhanced: enhancedPhoto,
      });
    } catch (enhancementError) {
      photo.status = "failed";
      photo.processingError = enhancementError.message;
      await photo.save();
      throw enhancementError;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/photos/gallery/:anomalyId - Get photo gallery for anomaly
router.get("/gallery/:anomalyId", auth, async (req, res) => {
  try {
    const photos = await Photo.find({ relatedAnomalyId: req.params.anomalyId })
      .populate("uploadedBy", "firstName lastName")
      .sort({ createdAt: 1 });

    const gallery = photos.map((photo) => ({
      id: photo._id,
      url: photo.storageUrl,
      thumbnailUrl: photo.thumbnailUrl,
      originalName: photo.originalName,
      aiEnhanced: photo.aiEnhanced,
      enhancementType: photo.enhancementType,
      qualityScore: photo.qualityScore,
      uploadedBy: photo.uploadedBy,
      uploadedAt: photo.createdAt,
      geolocation: photo.geolocation,
    }));

    res.json({
      anomalyId: req.params.anomalyId,
      photoCount: gallery.length,
      photos: gallery,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/photos/:id - Delete photo
router.delete("/:id", auth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }

    // Delete from storage
    await StorageService.deletePhoto(photo);

    // Delete from database
    await Photo.findByIdAndDelete(req.params.id);

    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/photos/stats/dashboard - Photo statistics
router.get("/stats/dashboard", auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const stats = {
      totalPhotos: await Photo.countDocuments(),
      todayPhotos: await Photo.countDocuments({ createdAt: { $gte: today } }),
      monthlyPhotos: await Photo.countDocuments({
        createdAt: { $gte: thisMonth },
      }),
      aiEnhancedPhotos: await Photo.countDocuments({ aiEnhanced: true }),
      averageQualityScore: await Photo.aggregate([
        { $group: { _id: null, avgQuality: { $avg: "$qualityScore" } } },
      ]),
      photosByEnhancement: await Photo.aggregate([
        { $group: { _id: "$enhancementType", count: { $sum: 1 } } },
      ]),
      storageDistribution: await Photo.aggregate([
        {
          $group: {
            _id: {
              $cond: [{ $ne: ["$infomaniakId", null] }, "infomaniak", "local"],
            },
            count: { $sum: 1 },
          },
        },
      ]),
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
