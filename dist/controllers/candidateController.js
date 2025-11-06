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
exports.updateCadre = exports.candidateCadre = exports.retrieveCredentials = exports.viewRejections = exports.deleteCandidate = exports.viewCandidate = exports.pushApplication = exports.myCorrections = exports.getCandidate = exports.submitCorrection = exports.uploadDocument = exports.viewMyDocuments = exports.getRefreshToken = exports.logoutCandidate = exports.fullCandidateProfile = exports.myProfile = exports.loginCandidate = exports.batchUploadCandidates = void 0;
const candidateModel_1 = require("../models/candidateModel");
const generateRandomPassword_1 = __importDefault(require("../utils/generateRandomPassword"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwtController_1 = require("./jwtController");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const documents_1 = require("../utils/documents");
const DataQueue_1 = require("../utils/DataQueue");
const adminLogin_1 = require("../models/adminLogin");
const console_1 = require("console");
const correctionData_1 = require("../models/correctionData");
const rejectionModel_1 = require("../models/rejectionModel");
const adminLogs_1 = __importDefault(require("../models/adminLogs"));
const batchUploadCandidates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //res.send("Hello");
    try {
        const candidates = req.body; // expect array of candidate objects
        const saltRounds = 10;
        const processedCandidates = yield Promise.all(candidates.map((candidate) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const plainPassword = (0, generateRandomPassword_1.default)(10);
            const hashedPassword = yield bcrypt_1.default.hash(plainPassword, saltRounds);
            if (((_a = candidate.phoneNumber) === null || _a === void 0 ? void 0 : _a.length) !== 11) {
                throw (0, console_1.error)("Phone number must be 11 digits");
            }
            return Object.assign(Object.assign({}, candidate), { passwords: [plainPassword], password: hashedPassword, 
                // if you want to track that it’s system-generated
                isDefaultPassword: true, uploadedDocuments: documents_1.documentsToUpload });
        })));
        // Bulk insert
        const result = yield candidateModel_1.Candidate.insertMany(processedCandidates, {
            ordered: false,
        });
        res.status(201).json({
            message: "Bulk upload successful",
            insertedCount: result.length,
        });
    }
    catch (err) {
        console.error("Bulk insert error:", err);
        res.status(500).json({ message: "Error uploading candidates" });
    }
});
exports.batchUploadCandidates = batchUploadCandidates;
const loginCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const candidate = yield candidateModel_1.Candidate.findOne({ email: req.body.email }).lean();
        if (!candidate) {
            return res.status(404).send("Candidate not found");
        }
        const isPasswordValid = yield bcrypt_1.default.compare(req.body.password, candidate.password);
        if (isPasswordValid) {
            const accessToken = (0, jwtController_1.generateToken)({ _id: candidate._id });
            const refreshToken = (0, jwtController_1.generateRefreshToken)({ _id: candidate._id });
            res
                .cookie(jwtController_1.tokens.auth_token, accessToken, {
                httpOnly: false,
                secure: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                maxAge: 1000 * 60 * 60, // 1h
            })
                .cookie(jwtController_1.tokens.refresh_token, refreshToken, {
                httpOnly: false,
                secure: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
            })
                .send("Logged In");
        }
        else {
            res.status(400).send("Invalid password");
        }
    }
    catch (error) {
        //console.error(error);
        res.status(500).send("Invalid credentials");
    }
});
exports.loginCandidate = loginCandidate;
const myProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (req.candidate) {
            const candidate = req.candidate;
            res.send({
                _id: candidate._id,
                name: candidate.fullName,
                email: candidate.email,
                ippisNumber: candidate.ippisNumber,
                phoneNumber: candidate.phoneNumber,
                mda: candidate.currentMDA,
                gradeLevel: candidate.gradeLevel,
                cadre: candidate.cadre,
                status: candidate.status,
                passport: ((_b = (_a = candidate.uploadedDocuments) === null || _a === void 0 ? void 0 : _a.find((c) => c.fileType === "Passport Photograph")) === null || _b === void 0 ? void 0 : _b.fileUrl) || "",
                role: candidate.role,
            });
        }
        if (req.admin) {
            const admin = yield adminLogin_1.AdminModel.findById(req.admin._id);
            const result = admin === null || admin === void 0 ? void 0 : admin.toObject();
            res.send(Object.assign(Object.assign({}, result), { role: "admin", specificRole: admin === null || admin === void 0 ? void 0 : admin.role }));
        }
    }
    catch (error) {
        //console.error(error);
        res.status(500).send("Internal Server Error");
    }
});
exports.myProfile = myProfile;
const fullCandidateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const candidate = yield candidateModel_1.Candidate.findById((_a = req.candidate) === null || _a === void 0 ? void 0 : _a._id).select({
        uploadedDocuments: 0,
        passwords: 0,
        password: 0,
    });
    res.send(candidate);
});
exports.fullCandidateProfile = fullCandidateProfile;
const logoutCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res
        .clearCookie(jwtController_1.tokens.auth_token)
        .clearCookie(jwtController_1.tokens.refresh_token)
        .send("Logged Out");
});
exports.logoutCandidate = logoutCandidate;
const getRefreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const refreshToken = req.cookies[jwtController_1.tokens.refresh_token];
    if (!refreshToken) {
        return res.status(401).send("Not authenticated");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN);
        const candidate = yield candidateModel_1.Candidate.findById(decoded._id);
        const admin = yield adminLogin_1.AdminModel.findById(decoded._id);
        if (candidate) {
            const accessToken = (0, jwtController_1.generateToken)({ _id: candidate._id });
            const newRefreshToken = (0, jwtController_1.generateRefreshToken)({ _id: candidate._id });
            return res
                .cookie(jwtController_1.tokens.auth_token, accessToken, {
                httpOnly: false,
                secure: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                maxAge: 1000 * 60 * 60, // 1h
            })
                .cookie(jwtController_1.tokens.refresh_token, newRefreshToken, {
                httpOnly: false,
                secure: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
            })
                .send("Logged In");
            //console.log("na here o");
            //return res.status(401).send("Invalid refresh token");
        }
        if (admin) {
            const accessToken = (0, jwtController_1.generateToken)({ _id: admin._id, role: "admin" });
            const refreshToken = (0, jwtController_1.generateRefreshToken)({
                _id: admin._id,
                role: "admin",
            });
            return res
                .cookie(jwtController_1.tokens.auth_token, accessToken, {
                httpOnly: false,
                secure: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                maxAge: 1000 * 60 * 60, // 1h
            })
                .cookie(jwtController_1.tokens.refresh_token, refreshToken, {
                httpOnly: false,
                secure: true,
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7d
            })
                .send("Logged In");
        }
        return res.status(401).send("Invalid refresh token");
    }
    catch (error) {
        res.status(401).send("Invalid refresh token");
    }
    //  res.send(req.cookies[tokens.refresh_token]);
});
exports.getRefreshToken = getRefreshToken;
const viewMyDocuments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const uploadedDocuments = (_a = req.candidate) === null || _a === void 0 ? void 0 : _a.uploadedDocuments.filter((c) => c.fileUrl).length;
    res.send({ documents: (_b = req.candidate) === null || _b === void 0 ? void 0 : _b.uploadedDocuments, uploadedDocuments });
});
exports.viewMyDocuments = viewMyDocuments;
const uploadQueue = new DataQueue_1.ConcurrentJobQueue({
    concurrency: 10,
    maxQueueSize: 100,
    retries: 3,
    retryDelay: 1000,
    shutdownTimeout: 20000,
});
const uploadDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(400).send("Registration window closed");
        //return;
        // if (!req.file) {
        //   return res.status(400).send("No file uploaded");
        // }
        // const extension = path.extname(req.file.originalname);
        // const fileData = {
        //   oldName: `./uploads/${req.file.filename}`,
        //   newName: `./uploads/${req.headers.documentid}${extension}`,
        //   path: req.file.path,
        //   candidate: req.candidate?._id,
        //   documentId: req.headers.documentid,
        //   mimetype: req.file.mimetype,
        // };
        // uploadQueue.enqueue(async () => {
        //   rename(fileData.oldName, fileData.newName, (err) => {
        //     if (err) {
        //       console.error("Error renaming file:", err);
        //     }
        //     uploadFileToB2(fileData.newName, fileData.mimetype)
        //       .then(async (result) => {
        //         if (result) {
        //           await Candidate.updateOne(
        //             {
        //               _id: fileData.candidate,
        //               "uploadedDocuments._id": fileData.documentId,
        //             },
        //             {
        //               $set: {
        //                 "uploadedDocuments.$.fileUrl": result.fileUrl,
        //                 "uploadedDocuments.$.fileName": result.fileName,
        //                 "uploadedDocuments.$.fileId": result.fileId,
        //                 "uploadedDocuments.$.updatedAt": new Date(),
        //               },
        //             }
        //           );
        //           console.log(`File uploaded successfully ✅`);
        //         }
        //       })
        //       .catch((error) => {
        //         console.error("Error uploading file to B2:", error);
        //       })
        //       .finally(() => {
        //         unlink(fileData.newName, (err) => {
        //           if (err) {
        //             console.error("Error deleting file:", err);
        //           }
        //           console.log({
        //             activeCount: uploadQueue.activeCount,
        //             pending: uploadQueue.pendingCount,
        //           });
        //         });
        //       });
        //   });
        // });
        // res.send("File uploaded successfully");
    }
    catch (error) {
        res.status(500).send(new Error(error).message);
    }
});
exports.uploadDocument = uploadDocument;
const correctionQueue = new DataQueue_1.ConcurrentJobQueue({
    concurrency: 10,
    maxQueueSize: 100,
    retries: 3,
    retryDelay: 1000,
    shutdownTimeout: 20000,
});
const submitCorrection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(400).send("Registration window closed");
    //const correction: ICorrection = req.body;
    // correction.candidate = new mongoose.Types.ObjectId(
    //   req.candidate?._id.toString()
    // );
    // const correctionData = await CorrectionModel.findOne({
    //   candidate: correction.candidate,
    //   correctionField: correction.correctionField,
    // });
    // if (correctionData) {
    //   return res
    //     .status(400)
    //     .send("You have already submitted a correction for this field");
    // }
    // res.send("Correction submitted. Awaiting approval");
    // correctionQueue.enqueue(async () => {
    //   await CorrectionModel.create(correction);
    // });
});
exports.submitCorrection = submitCorrection;
const getCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const candidate = yield candidateModel_1.Candidate.findById(req.query.id).select({
            uploadedDocuments: 0,
            passwords: 0,
            password: 0,
        });
        res.send(candidate);
    }
    catch (error) {
        res.status(500).send("Error occurred");
    }
});
exports.getCandidate = getCandidate;
const myCorrections = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const corrections = yield correctionData_1.CorrectionModel.find({
        candidate: (_a = req.candidate) === null || _a === void 0 ? void 0 : _a._id,
    });
    const correctionsOrdered = corrections.map((c, i) => {
        return Object.assign(Object.assign({}, c.toObject()), { id: i + 1 });
    });
    res.send(correctionsOrdered);
});
exports.myCorrections = myCorrections;
const pushApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // await Candidate.findByIdAndUpdate(req.candidate?._id, {
    //   status: "pending",
    // });
    // await Candidate.findOneAndUpdate(
    //   { _id: req.candidate?._id, status: "rejected" }, // condition
    //   { $set: { status: "pending" } }, // update
    //   { new: true } // return updated doc
    // );
    // res.send("Application submitted");
    res.status(400).send("Registration window closed");
});
exports.pushApplication = pushApplication;
const viewCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidate = yield candidateModel_1.Candidate.findOne({
        ippisNumber: req.query.ippisnumber,
    }).select({
        ippisNumber: 1,
        fullName: 1,
    });
    if (!candidate) {
        return res.status(404).send("Candidate not found");
    }
    res.send(candidate);
});
exports.viewCandidate = viewCandidate;
const deleteCandidate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //await Candidate.deleteOne({ ippisNumber: req.query.ippisnumber });
    res.send("Candidate deleted");
});
exports.deleteCandidate = deleteCandidate;
const viewRejections = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = (req.query.page || 1);
    const limit = (req.query.limit || 50);
    const rejections = yield rejectionModel_1.RejectionModel.find({
        rejectedBy: { $exists: true },
    })
        .populate([
        "rejectedBy",
        { path: "candidate", select: "fullName ippisNumber status" },
    ])
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    const total = yield rejectionModel_1.RejectionModel.countDocuments();
    const totalRejections = rejections.map((c, i) => {
        return Object.assign(Object.assign({}, c), { id: (page - 1) * limit + i + 1 });
    });
    res.send({
        total,
        rejections: totalRejections,
        page,
        limit,
    });
});
exports.viewRejections = viewRejections;
const retrieveCredentials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidate = yield candidateModel_1.Candidate.findOne(req.body);
    if (!candidate) {
        return res.status(404).send("Candidate not found");
    }
    res.send({
        name: candidate.fullName,
        email: candidate.email,
        password: candidate.passwords[0],
        ippisNumber: candidate.ippisNumber,
    });
});
exports.retrieveCredentials = retrieveCredentials;
const candidateCadre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidate = yield candidateModel_1.Candidate.findById(req.query.candidate).lean();
    res.send({
        _id: candidate === null || candidate === void 0 ? void 0 : candidate._id,
        fullName: (candidate === null || candidate === void 0 ? void 0 : candidate.fullName) || "Not set",
        cadre: (candidate === null || candidate === void 0 ? void 0 : candidate.cadre) || "Not set",
    });
});
exports.candidateCadre = candidateCadre;
const cadreUpdateQueue = new DataQueue_1.ConcurrentJobQueue({
    concurrency: 10,
    maxQueueSize: 100,
    retries: 3,
    retryDelay: 1000,
    shutdownTimeout: 20000,
});
const updateCadre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const candidate = yield candidateModel_1.Candidate.findById(req.body.candidateId).lean();
    if (!candidate) {
        return res.status(404).send("Candidate not found");
    }
    cadreUpdateQueue.enqueue(() => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        yield candidateModel_1.Candidate.updateOne({ _id: req.body.candidateId }, { $set: { cadre: req.body.newCadre } });
        yield adminLogs_1.default.create({
            account: (_a = req.admin) === null || _a === void 0 ? void 0 : _a._id,
            action: `Updated cadre for ${candidate.fullName} (${candidate.ippisNumber}) from ${candidate.cadre} to ${req.body.newCadre}`,
        });
        res.send("Cadre updated successfully");
    }));
});
exports.updateCadre = updateCadre;
