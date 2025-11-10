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
exports.bulkNotifyParticipants = exports.generateSlipForCandidates = exports.convertAndUploadPassportPdfs = exports.convertAndReuploadPassportPdfs = exports.candidatesWithPdfAsPassport = exports.generateSlipForACandidate = exports.notifyParticipants = exports.adminEmail = exports.printSlip = exports.viewMySlip = exports.viewCandidate = exports.generateLetter = void 0;
exports.generateLetterFunc = generateLetterFunc;
const candidateModel_1 = require("../models/candidateModel");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const qrcode_1 = __importDefault(require("qrcode"));
const uploadToB2_1 = require("../utils/uploadToB2");
const smsHandler_1 = require("../utils/smsHandler");
const axios_1 = __importDefault(require("axios"));
const pdf2pic_1 = require("pdf2pic");
const os_1 = __importDefault(require("os"));
function generateLetterFunc(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const htmlPath = path_1.default.resolve(__dirname, "../assets/examcardTemplate.html");
            if (!fs_1.default.existsSync(htmlPath)) {
                throw new Error(`Template file not found: ${htmlPath}`);
            }
            const logoBase64 = fs_1.default
                .readFileSync(path_1.default.resolve(__dirname, "../assets/logo.png"))
                .toString("base64");
            // Ensure the file exists before reading
            if (!fs_1.default.existsSync(htmlPath)) {
                throw new Error(`Template file not found: ${htmlPath}`);
            }
            const qrCodeBase64 = yield qrcode_1.default.toDataURL(data._id.toString());
            let htmlTemplate = fs_1.default.readFileSync(htmlPath, "utf8");
            htmlTemplate = htmlTemplate
                .replace(/{{year}}/g, new Date().getFullYear().toString())
                .replace(/{{passport}}/g, data.passport ? data.passport : "")
                .replace(/{{logo}}/g, `data:image/png;base64,${logoBase64}`)
                .replace(/{{qrCode}}/g, qrCodeBase64)
                .replace(/{{ippisNumber}}/g, data.ippisNumber)
                .replace(/{{name}}/g, data.fullName)
                .replace(/{{emailAddress}}/g, data.email)
                .replace(/{{gradeLevel}}/g, data.gradeLevel)
                .replace(/{{cadre}}/g, data.cadre)
                .replace(/{{phoneNumber}}/g, data.phoneNumber)
                .replace(/{{examCentre}}/g, data.examCentreAddress)
                .replace(/{{examDate}}/g, data.examDate)
                .replace(/{{examTime}}/g, data.examTime)
                .replace(/{{examNumber}}/g, data.examNumber)
                .replace(/{{seatNumber}}/g, data.seatNumber);
            // Launch Puppeteer
            const browser = yield puppeteer_1.default.launch();
            const page = yield browser.newPage();
            yield page.setContent(htmlTemplate);
            const outputPath = path_1.default.join(__dirname, `examcards/${data.ippisNumber}.pdf`);
            //ensure the directory exists
            //ensure the directory exists
            const outputDir = path_1.default.dirname(outputPath);
            if (!fs_1.default.existsSync(outputDir)) {
                fs_1.default.mkdirSync(outputDir, { recursive: true });
            }
            yield page.pdf({
                path: outputPath,
                height: "1450px",
                width: "800px",
                printBackground: true,
            });
            yield browser.close();
            console.log(`✅ Letter generated: ${outputPath}`);
            return outputPath;
        }
        catch (error) {
            console.error("❌ Error generating certificate:", error);
            return "";
        }
    });
}
const BATCH_SIZE = 5; // process 5 candidates in parallel
const generateLetter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const candidates = req.body;
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return res.status(400).send("No candidates provided");
        }
        console.log(`📄 Generating letters for ${candidates.length} candidates...`);
        // Split candidates into chunks of 5
        for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);
            yield Promise.all(batch.map((payload) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                try {
                    const candidate = yield candidateModel_1.Candidate.findOne({
                        ippisNumber: payload.ippisNumber,
                    }).lean();
                    if (!candidate) {
                        console.warn(`⚠️ Candidate not found: ${payload.ippisNumber}`);
                        return;
                    }
                    // 🔄 Update candidate info before letter generation
                    yield candidateModel_1.Candidate.updateOne({ _id: candidate._id }, { $set: Object.assign({}, payload) });
                    // 🧾 Generate PDF letter
                    const outputPath = yield generateLetterFunc(Object.assign(Object.assign(Object.assign({}, candidate), payload), { passport: ((_b = (_a = candidate.uploadedDocuments) === null || _a === void 0 ? void 0 : _a.find((c) => c.fileType === "Passport Photograph")) === null || _b === void 0 ? void 0 : _b.fileUrl) || "" }));
                    // ☁️ Upload to Backblaze B2
                    const result = yield (0, uploadToB2_1.uploadFileToB2WithFolder)(outputPath, "application/pdf", "examcards");
                    if (result) {
                        // 🗃️ Update candidate record with uploaded file metadata
                        yield candidateModel_1.Candidate.updateOne({ _id: candidate._id }, {
                            $set: {
                                fileId: result.fileId,
                                fileName: result.fileName,
                                fileUrl: result.fileUrl,
                            },
                        });
                    }
                    // 🧹 Cleanup local file
                    try {
                        yield fs_1.default.promises.unlink(outputPath);
                    }
                    catch (unlinkErr) {
                        console.error(`⚠️ Could not delete ${outputPath}:`, unlinkErr);
                    }
                    console.log(`✅ Processed: ${payload.ippisNumber}`);
                }
                catch (err) {
                    console.error(`❌ Error processing ${payload.ippisNumber}:`, err);
                }
            })));
        }
        res.send("✅ Letters generated and uploaded successfully");
    }
    catch (err) {
        console.error("❌ Error generating letters:", err);
        res.status(500).send("Error generating letters");
    }
});
exports.generateLetter = generateLetter;
const viewCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidate = yield candidateModel_1.Candidate.findById(req.query.id).lean();
    if (!candidate) {
        return res.status(404).send("Candidate not found");
    }
    res.send(candidate);
});
exports.viewCandidate = viewCandidate;
const viewMySlip = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const candidate = yield candidateModel_1.Candidate.findOne({
        _id: (_a = req.candidate) === null || _a === void 0 ? void 0 : _a._id,
        fileUrl: { $exists: true },
    }).lean();
    if (!candidate) {
        return res.status(404).send("Candidate not found");
    }
    res.send(candidate.fileUrl);
});
exports.viewMySlip = viewMySlip;
const printSlip = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const candidate = yield candidateModel_1.Candidate.findById((_a = req.candidate) === null || _a === void 0 ? void 0 : _a._id);
    if (!candidate) {
        return res.status(404).send("Candidate not found");
    }
    yield candidateModel_1.Candidate.updateOne({ _id: candidate._id }, {
        $set: {
            hasViewedSlip: true,
            timeViewedSlip: new Date(),
            printCount: candidate.printCount + 1,
        },
    });
    res.send("Slip printed");
});
exports.printSlip = printSlip;
exports.adminEmail = "mightyeaglecorp@gmail.com";
const notifyParticipants = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (((_a = req.admin) === null || _a === void 0 ? void 0 : _a.email) !== exports.adminEmail) {
            return res.status(403).send("You are forbidden from doing this");
        }
        res.send("📢 Sending out notifications...");
        const candidates = yield candidateModel_1.Candidate.find({
            examCentreAddress: { $exists: true },
            fileId: { $exists: true },
            //printCount: { $lt: 1 },
        }).lean();
        if (!candidates.length) {
            console.log("No candidates to notify");
            return;
        }
        console.log(`📨 Found ${candidates.length} candidates to notify.`);
        for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);
            yield Promise.all(batch.map((candidate) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const phoneNumber = `234${candidate.phoneNumber.slice(1)}`;
                    const message = smsMessage(candidate.fullName.toUpperCase(), candidate.examCentreAddress.toUpperCase());
                    console.log({ message, phoneNumber });
                    yield (0, smsHandler_1.SendSms)(message, phoneNumber);
                    console.log(`✅ Notified ${candidate.fullName}`);
                    // optional: update printCount or add a log
                    // await Candidate.updateOne(
                    //   { _id: candidate._id },
                    //   { $inc: { printCount: 1 } }
                    // );
                }
                catch (err) {
                    console.error(`❌ Error notifying ${candidate.fullName}:`, err);
                }
            })));
            console.log(`🚀 Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`);
        }
        console.log("✅ All notifications sent successfully.");
    }
    catch (err) {
        console.error("❌ Error sending notifications:", err);
    }
});
exports.notifyParticipants = notifyParticipants;
const smsMessage = (name, centre) => `Dear ${name}, your exam card is ready. Your centre is ${centre}. Kindly log on to https://promotion.fedcivilservice.gov.ng to print your card and ensure you present same at your centre.`;
const reprintMessage = (name) => `Dear ${name}, kindly log on to https://promotion.fedcivilservice.gov.ng to reprint your examination card and ensure you present same at your centre.`;
const generateSlipForACandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const candidate = yield candidateModel_1.Candidate.findOne({
            ippisNumber: req.body.ippisNumber,
        }).lean();
        if (!candidate) {
            return res.status(404).send("Candidate not found");
        }
        if (!candidate.examCentreAddress) {
            return res
                .status(400)
                .send("This candidate was not selected for this exam");
        }
        const outputPath = yield generateLetterFunc(Object.assign(Object.assign({}, candidate), { passport: ((_b = (_a = candidate.uploadedDocuments) === null || _a === void 0 ? void 0 : _a.find((c) => c.fileType === "Passport Photograph")) === null || _b === void 0 ? void 0 : _b.fileUrl) || "" }));
        // ☁️ Upload to Backblaze B2
        const result = yield (0, uploadToB2_1.uploadFileToB2WithFolder)(outputPath, "application/pdf", "examcards");
        if (result) {
            // 🗃️ Update candidate record with uploaded file metadata
            yield candidateModel_1.Candidate.updateOne({ _id: candidate._id }, {
                $set: {
                    fileId: result.fileId,
                    fileName: result.fileName,
                    fileUrl: result.fileUrl,
                },
            });
        }
        // 🧹 Cleanup local file
        try {
            yield fs_1.default.promises.unlink(outputPath);
        }
        catch (unlinkErr) {
            console.error(`⚠️ Could not delete ${outputPath}:`, unlinkErr);
        }
        res.send("File generated");
    }
    catch (error) {
        res.status(500).send("Server error");
    }
});
exports.generateSlipForACandidate = generateSlipForACandidate;
const candidatesWithPdfAsPassport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidates = yield candidateModel_1.Candidate.aggregate([
        // 1️⃣ Only candidates who have an examCentreAddress
        { $match: { examCentreAddress: { $exists: true, $ne: "" } } },
        // 2️⃣ Unwind the uploadedDocuments array to inspect each item individually
        { $unwind: "$uploadedDocuments" },
        // 3️⃣ Filter to only "Passport Photograph" PDFs
        {
            $match: {
                "uploadedDocuments.fileType": "Passport Photograph",
                $or: [
                    { "uploadedDocuments.fileUrl": { $regex: /\.pdf$/i } },
                    { "uploadedDocuments.fileName": { $regex: /\.pdf$/i } },
                ],
            },
        },
        // 4️⃣ Project just the info you want
        {
            $project: {
                _id: 1,
                fullName: 1,
                ippisNumber: 1,
                email: 1,
                phoneNumber: 1,
                examCentreAddress: 1,
                "uploadedDocuments.fileName": 1,
                "uploadedDocuments.fileUrl": 1,
                "uploadedDocuments.fileType": 1,
            },
        },
    ]);
    res.send(candidates);
});
exports.candidatesWithPdfAsPassport = candidatesWithPdfAsPassport;
const convertAndReuploadPassportPdfs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send("Conversion started!");
    yield (0, exports.convertAndUploadPassportPdfs)();
});
exports.convertAndReuploadPassportPdfs = convertAndReuploadPassportPdfs;
const TEMP_DIR = path_1.default.join(os_1.default.tmpdir(), "pdf_conversion");
const convertAndUploadPassportPdfs = () => __awaiter(void 0, void 0, void 0, function* () {
    // ensure temp dir exists
    yield fs_1.default.promises.mkdir(TEMP_DIR, { recursive: true });
    // Step 1: Find all candidates with PDF passport uploads
    const candidates = yield candidateModel_1.Candidate.aggregate([
        { $match: { examCentreAddress: { $exists: true, $ne: "" } } },
        { $unwind: "$uploadedDocuments" },
        {
            $match: {
                "uploadedDocuments.fileType": "Passport Photograph",
                $or: [
                    { "uploadedDocuments.fileUrl": { $regex: /\.pdf$/i } },
                    { "uploadedDocuments.fileName": { $regex: /\.pdf$/i } },
                ],
            },
        },
        {
            $project: {
                _id: 1,
                "uploadedDocuments.fileUrl": 1,
                "uploadedDocuments.fileName": 1,
            },
        },
    ]);
    console.log(`📄 Found ${candidates.length} PDF passport photos.`);
    for (const cand of candidates) {
        const { fileUrl, fileName } = cand.uploadedDocuments;
        const safeName = fileName || `${cand._id}.pdf`;
        const pdfPath = path_1.default.join(TEMP_DIR, safeName);
        const jpgBaseName = path_1.default.basename(safeName, ".pdf");
        try {
            // Step 2: Download PDF
            console.log(`⬇️ Downloading PDF for ${cand._id}`);
            const response = yield axios_1.default.get(fileUrl, {
                responseType: "arraybuffer",
            });
            yield fs_1.default.promises.writeFile(pdfPath, response.data);
            // Step 3: Convert PDF → JPG using pdf2pic
            console.log(`🖼️ Converting ${safeName} to JPG...`);
            const convert = (0, pdf2pic_1.fromPath)(pdfPath, {
                density: 150,
                saveFilename: jpgBaseName,
                savePath: TEMP_DIR,
                format: "jpg",
                width: 600,
                height: 800,
            });
            const result = yield convert(1); // convert only first page
            const jpgPath = result.path;
            // Step 4: Upload JPG to Backblaze
            console.log(`☁️ Uploading JPG for ${cand._id}...`);
            const uploadResult = yield (0, uploadToB2_1.uploadFileToB2)(jpgPath, "image/jpeg");
            if (!uploadResult) {
                console.error(`⚠️ Upload failed for ${cand._id}`);
                continue;
            }
            // Step 5: Update MongoDB record
            yield candidateModel_1.Candidate.updateOne({ _id: cand._id, "uploadedDocuments.fileUrl": fileUrl }, {
                $set: {
                    "uploadedDocuments.$.fileUrl": uploadResult.fileUrl,
                    "uploadedDocuments.$.fileName": uploadResult.fileName,
                    "uploadedDocuments.$.fileId": uploadResult.fileId,
                    "uploadedDocuments.$.updatedAt": new Date(),
                },
            });
            console.log(`✅ Converted and updated candidate: ${cand._id}`);
            // Step 6: Cleanup temp files
            yield fs_1.default.promises.unlink(pdfPath);
            yield fs_1.default.promises.unlink(jpgPath);
        }
        catch (err) {
            console.error(`❌ Error processing ${cand._id}:`, err.message);
        }
    }
    console.log("🎯 Conversion complete!");
    process.exit();
});
exports.convertAndUploadPassportPdfs = convertAndUploadPassportPdfs;
const generateSlipForCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const ippisObjects = req.body;
    const BATCH_SIZE = 5;
    // Validate input
    if (!Array.isArray(ippisObjects) || ippisObjects.length === 0) {
        return res.status(400).send("Array of { ippisNumber } objects required");
    }
    // Extract ippisNumbers into a simple array
    const ippisNumbers = ippisObjects
        .map((obj) => obj.ippisNumber)
        .filter(Boolean);
    if (ippisNumbers.length === 0) {
        return res.status(400).send("No valid ippisNumbers provided");
    }
    const results = [];
    try {
        // Split into batches of 5
        for (let i = 0; i < ippisNumbers.length; i += BATCH_SIZE) {
            const batch = ippisNumbers.slice(i, i + BATCH_SIZE);
            console.log(`🚀 Processing batch ${i / BATCH_SIZE + 1}:`, batch);
            // Process each batch concurrently
            const batchResults = yield Promise.all(batch.map((ippisNumber) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                try {
                    const candidate = yield candidateModel_1.Candidate.findOne({ ippisNumber }).lean();
                    if (!candidate)
                        return { ippisNumber, status: "not_found" };
                    if (!candidate.examCentreAddress)
                        return { ippisNumber, status: "not_selected" };
                    const passport = ((_b = (_a = candidate.uploadedDocuments) === null || _a === void 0 ? void 0 : _a.find((c) => c.fileType === "Passport Photograph")) === null || _b === void 0 ? void 0 : _b.fileUrl) || "";
                    console.log(`📄 Generating slip for ${ippisNumber}`);
                    const outputPath = yield generateLetterFunc(Object.assign(Object.assign({}, candidate), { passport }));
                    const result = yield (0, uploadToB2_1.uploadFileToB2WithFolder)(outputPath, "application/pdf", "examcards");
                    if (result) {
                        yield candidateModel_1.Candidate.updateOne({ _id: candidate._id }, {
                            $set: {
                                fileId: result.fileId,
                                fileName: result.fileName,
                                fileUrl: result.fileUrl,
                            },
                        });
                    }
                    // 🧹 Cleanup local file
                    try {
                        yield fs_1.default.promises.unlink(outputPath);
                    }
                    catch (unlinkErr) {
                        console.error(`⚠️ Could not delete ${outputPath}:`, unlinkErr);
                    }
                    console.log(`✅ Done for ${ippisNumber}`);
                    return { ippisNumber, status: "success", fileUrl: result === null || result === void 0 ? void 0 : result.fileUrl };
                }
                catch (err) {
                    console.error(`❌ Error processing ${ippisNumber}:`, err.message);
                    return { ippisNumber, status: "error", message: err.message };
                }
            })));
            results.push(...batchResults);
            console.log(`✅ Batch ${i / BATCH_SIZE + 1} completed`);
        }
        // Summary
        const summary = {
            total: ippisNumbers.length,
            success: results.filter((r) => r.status === "success").length,
            failed: results.filter((r) => r.status === "error").length,
            notFound: results.filter((r) => r.status === "not_found").length,
            notSelected: results.filter((r) => r.status === "not_selected").length,
        };
        res.json({ summary, results });
    }
    catch (err) {
        console.error("❌ Fatal error:", err);
        res.status(500).send("Server error");
    }
});
exports.generateSlipForCandidates = generateSlipForCandidates;
// export const bulkNotifyParticipants = async (req: Request, res: Response) => {
//   try {
//     const ippisNumber = req.body.map((candidate: any) => {
//       return candidate.ippisNumber;
//     });
//     const candidates = await Candidate.find({
//       ippisNumber: { $in: ippisNumber },
//     }).lean();
//     console.log(`📨 Found ${candidates.length} candidates to notify.`);
//     for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
//       const batch = candidates.slice(i, i + BATCH_SIZE);
//       await Promise.all(
//         batch.map(async (candidate) => {
//           try {
//             const phoneNumber = `234${candidate.phoneNumber.slice(1)}`;
//             const message = reprintMessage(candidate.fullName);
//             await SendSms(message, phoneNumber);
//             console.log(`✅ Notified ${candidate.fullName}`);
//           } catch (error) {
//             console.error(`❌ Error notifying ${candidate.fullName}:`, error);
//           }
//         })
//       );
//       console.log(`🚀 Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`);
//     }
//     console.log("✅ All notifications sent successfully.");
//     res.send("Bulk notifications are in progress");
//   } catch (error) {
//     console.error("❌ Error sending notifications:", error);
//   }
// };
const bulkNotifyParticipants = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // respond immediately
        res.status(202).send("Bulk notifications queued for sending.");
        // process asynchronously (no need to await)
        process.nextTick(() => __awaiter(void 0, void 0, void 0, function* () {
            const ippisNumber = req.body.map((c) => c.ippisNumber);
            const candidates = yield candidateModel_1.Candidate.find({
                ippisNumber: { $in: ippisNumber },
            }).lean();
            console.log(`📨 Found ${candidates.length} candidates.`);
            const BATCH_SIZE = 100;
            for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
                const batch = candidates.slice(i, i + BATCH_SIZE);
                yield Promise.allSettled(batch.map((candidate) => __awaiter(void 0, void 0, void 0, function* () {
                    try {
                        const phoneNumber = `234${candidate.phoneNumber.slice(1)}`;
                        const message = reprintMessage(candidate.fullName);
                        yield (0, smsHandler_1.SendSms)(message, phoneNumber);
                        console.log(`✅ Sent to ${candidate.fullName}`);
                    }
                    catch (err) {
                        console.error(`❌ Failed for ${candidate.fullName}:`, err);
                    }
                })));
                console.log(`🚀 Batch ${Math.floor(i / BATCH_SIZE) + 1} done`);
            }
            console.log("✅ All notifications completed.");
        }));
    }
    catch (err) {
        console.error("❌ Error queuing notifications:", err);
        res.status(500).send("Failed to start bulk notification");
    }
});
exports.bulkNotifyParticipants = bulkNotifyParticipants;
