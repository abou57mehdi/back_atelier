const axios = require("axios");
const fs = require("fs");
const path = require("path");

class StorageService {
  constructor() {
    // Infomaniak configuration (you'll need to set these in .env)
    this.infomaniakConfig = {
      endpoint: process.env.INFOMANIAK_ENDPOINT || "https://api.infomaniak.com",
      token: process.env.INFOMANIAK_TOKEN,
      bucket: process.env.INFOMANIAK_BUCKET || "billun-photos",
    };
  }

  // Upload file to Infomaniak storage
  async uploadToInfomaniak(filePath, fileName) {
    try {
      if (!this.infomaniakConfig.token) {
        throw new Error("Infomaniak token not configured");
      }

      const fileBuffer = fs.readFileSync(filePath);

      // Prepare form data
      const formData = new FormData();
      formData.append("file", new Blob([fileBuffer]), fileName);

      const response = await axios.post(
        `${this.infomaniakConfig.endpoint}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.infomaniakConfig.token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return {
        url: response.data.url,
        id: response.data.id,
        success: true,
      };
    } catch (error) {
      console.error("Infomaniak upload failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Upload to local storage as fallback
  async uploadToLocal(filePath, fileName) {
    try {
      const uploadsDir = path.join(__dirname, "../../uploads/stored");

      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const destinationPath = path.join(uploadsDir, fileName);

      // Copy file to permanent storage
      fs.copyFileSync(filePath, destinationPath);

      // Return local URL
      const baseUrl = process.env.BASE_URL || "http://localhost:5000";
      return {
        url: `${baseUrl}/uploads/stored/${fileName}`,
        localPath: destinationPath,
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Main upload method with fallback
  async uploadPhoto(filePath, fileName) {
    // Try Infomaniak first
    const infomaniakResult = await this.uploadToInfomaniak(filePath, fileName);

    if (infomaniakResult.success) {
      return {
        primary: "infomaniak",
        url: infomaniakResult.url,
        infomaniakId: infomaniakResult.id,
      };
    }

    // Fallback to local storage
    console.log("Falling back to local storage");
    const localResult = await this.uploadToLocal(filePath, fileName);

    if (localResult.success) {
      return {
        primary: "local",
        url: localResult.url,
        localPath: localResult.localPath,
      };
    }

    throw new Error("Both Infomaniak and local storage failed");
  }

  // Delete file from storage
  async deletePhoto(photoRecord) {
    try {
      if (photoRecord.infomaniakId && this.infomaniakConfig.token) {
        // Delete from Infomaniak
        await axios.delete(
          `${this.infomaniakConfig.endpoint}/files/${photoRecord.infomaniakId}`,
          {
            headers: {
              Authorization: `Bearer ${this.infomaniakConfig.token}`,
            },
          }
        );
      }

      if (photoRecord.localPath && fs.existsSync(photoRecord.localPath)) {
        // Delete from local storage
        fs.unlinkSync(photoRecord.localPath);
      }

      return true;
    } catch (error) {
      console.error("Delete failed:", error.message);
      return false;
    }
  }
}

module.exports = new StorageService();
