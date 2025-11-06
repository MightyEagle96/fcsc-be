"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToB2WithFolder = exports.uploadFileToB2 = void 0;
exports.safeB2Call = safeB2Call;
exports.scheduleB2Reauth = scheduleB2Reauth;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const b2_1 = require("../b2");
/**
 * Wrapper to retry B2 calls if token expired (401 Unauthorized).
 */
function safeB2Call(fn) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            return yield fn();
        }
        catch (err) {
            if (((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.status) === 401) {
                console.warn("⚠️ Token expired, re-authorizing...");
                yield b2_1.b2.authorize();
                return fn(); // retry once
            }
            throw err;
        }
    });
}
const uploadFileToB2 = (localFilePath, mimeType) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //await b2.authorize();
        const buffer = yield promises_1.default.readFile(localFilePath);
        // const mimeType = "application/pdf"; // for Puppeteer PDFs
        const uploadName = path_1.default.basename(localFilePath);
        // // Get upload URL
        // const { data } = await b2.getUploadUrl({
        //   bucketId: process.env.B2_BUCKET_ID as string,
        // });
        const existing = yield b2_1.b2.listFileNames({
            bucketId: process.env.B2_BUCKET_ID,
            prefix: uploadName, // or full file name
            maxFileCount: 1,
            startFileName: "",
            delimiter: "",
        });
        if (existing.data.files.length > 0) {
            const oldFile = existing.data.files[0];
            console.log(`🔄 File exists (${oldFile.fileName}), deleting...`);
            // delete old file version
            yield safeB2Call(() => b2_1.b2.deleteFileVersion({
                fileId: oldFile.fileId,
                fileName: oldFile.fileName,
            }));
        }
        // 2. Get upload URL
        const { data } = yield safeB2Call(() => b2_1.b2.getUploadUrl({
            bucketId: process.env.B2_BUCKET_ID,
        }));
        let fileUrl = "";
        console.log(`📤 Uploading ${uploadName} to B2...`);
        const result = yield safeB2Call(() => b2_1.b2.uploadFile({
            uploadUrl: data.uploadUrl,
            uploadAuthToken: data.authorizationToken,
            fileName: uploadName,
            data: buffer,
            mime: mimeType,
        }));
        if (result) {
            fileUrl = `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${uploadName}`;
            return {
                fileUrl,
                fileName: result.data.fileName,
                fileId: result.data.fileId,
            };
        }
        return null;
    }
    catch (err) {
        console.error("Failed to upload PDF to B2:", err);
        // throw err;
        return null;
    }
});
exports.uploadFileToB2 = uploadFileToB2;
const uploadFileToB2WithFolder = (localFilePath, mimeType, folder // e.g. "examcards"
) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const buffer = yield promises_1.default.readFile(localFilePath);
        const baseName = path_1.default.basename(localFilePath);
        const uploadName = `${folder}/${baseName}`; // Put file in folder inside bucket
        console.log(`📁 Preparing upload to folder: ${folder}`);
        // 🔍 Check if a file with same name exists in the folder
        const existing = yield safeB2Call(() => b2_1.b2.listFileNames({
            bucketId: process.env.B2_BUCKET_ID,
            prefix: uploadName,
            maxFileCount: 1,
            startFileName: "",
            delimiter: "",
        }));
        if (((_b = (_a = existing === null || existing === void 0 ? void 0 : existing.data) === null || _a === void 0 ? void 0 : _a.files) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            const oldFile = existing.data.files[0];
            console.log(`🔄 File already exists (${oldFile.fileName}), deleting...`);
            yield safeB2Call(() => b2_1.b2.deleteFileVersion({
                fileId: oldFile.fileId,
                fileName: oldFile.fileName,
            }));
        }
        // ⚙️ Get new upload URL
        const { data } = yield safeB2Call(() => b2_1.b2.getUploadUrl({
            bucketId: process.env.B2_BUCKET_ID,
        }));
        console.log(`📤 Uploading ${uploadName} to B2...`);
        // 🚀 Upload file
        const result = yield safeB2Call(() => b2_1.b2.uploadFile({
            uploadUrl: data.uploadUrl,
            uploadAuthToken: data.authorizationToken,
            fileName: uploadName, // includes folder
            data: buffer,
            mime: mimeType,
        }));
        if (result) {
            const fileUrl = `https://f005.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${uploadName}`;
            return {
                fileUrl,
                fileName: result.data.fileName,
                fileId: result.data.fileId,
            };
        }
        return null;
    }
    catch (err) {
        console.error("❌ Failed to upload file to B2 folder:", err);
        return null;
    }
});
exports.uploadFileToB2WithFolder = uploadFileToB2WithFolder;
function scheduleB2Reauth() {
    const TWENTY_THREE_HOURS = 23 * 60 * 60 * 1000;
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🔄 Refreshing B2 token...");
            yield b2_1.b2.authorize();
            console.log("✅ B2 token refreshed successfully");
        }
        catch (err) {
            console.error("❌ Failed to refresh B2 token:", err);
        }
    }), TWENTY_THREE_HOURS);
}
