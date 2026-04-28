const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8080;

// ================= CONFIG =================
const SECRET_KEY = "1234567890abcdef1234567890abcdef"; // 32 bytes
const SECRET_IV = "abcdef1234567890"; // 16 bytes

// ================= DECRYPT =================
function decrypt(encryptedText) {
  let base64 = encryptedText.replace(/-/g, "+").replace(/_/g, "/");

  const encryptedBuffer = Buffer.from(base64, "base64");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(SECRET_KEY, "utf-8"),
    Buffer.from(SECRET_IV, "utf-8")
  );

  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf-8");
}

// ================= RESPONSE BUILDER =================
function buildResponse(parsed, code, message) {
  return {
    machineId: parsed.machineId,
    transactionId: parsed.transactionId,
    userId: parsed.userId,
    recordStatusCode: code,
    recordStatusDescription: message,
    amount: parsed.amount,

    // 🔥 Added missing fields only
    prefix: parsed.prefix || null,
    mobileNumber: parsed.mobileNumber || null,
    externalSystemId: parsed.externalSystemId || null,

    externalSystemRecordId: code === "4" ? "EXT" + Date.now() : null,
    bitRecordSerialId: code === "4" ? "SER" + Date.now() : null,
    openingTimestamp: new Date().toISOString(),
    updatingTimeStamp: new Date().toISOString(),
  };
}

// ================= API =================
app.get("/endlos-api/public/machine/bit-api", (req, res) => {
  try {
    const encryptedData = req.query.data;

    if (!encryptedData) {
      return res.status(400).json({
        code: 400,
        message: "Missing data param",
      });
    }

    // 🔓 Decrypt
    const decrypted = decrypt(encryptedData);
    console.log("🔓 Decrypted:", decrypted);

    const parsed = JSON.parse(decrypted);

    // ================= VALIDATION =================
    if (!parsed.userId || parsed.userId !== "308208552") {
          console.log("======== Invalid userId:", parsed.userId);

      return res.status(200).json(
        buildResponse(parsed, "6", "Invalid userId")
      );
    }

    // ================= SUCCESS =================
    return res.status(200).json(
      buildResponse(parsed, "4", "SUCCESS")
    );

  } catch (err) {
    console.error("❌ ERROR:", err.message);

    return res.status(500).json({
      code: 500,
      message: err.message,
    });
  }
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
