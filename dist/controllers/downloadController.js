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
exports.exportCandidatesExcel = exports.HEADER_MAP = void 0;
const candidateModel_1 = require("../models/candidateModel");
const exceljs_1 = __importDefault(require("exceljs"));
exports.HEADER_MAP = {
    "IPPIS Number": "ippisNumber",
    "Name (Surname, First Name)": "fullName",
    DOB: "dateOfBirth",
    Gender: "gender",
    "State of Origin": "stateOfOrigin",
    "Local Government Area": "lga",
    "Pool Office": "poolOffice",
    "Current MDA": "currentMDA",
    Cadre: "cadre",
    "Grade Level": "gradeLevel",
    "Date of First Appointment": "dateOfFirstAppointment",
    "Date of Confirmation": "dateOfConfirmation",
    "Date of Last Promotion": "dateOfLastPromotion",
    "Phone Number": "phoneNumber",
    Email: "email",
    "State of Current Posting": "stateOfCurrentPosting",
    2021: "year2021",
    2022: "year2022",
    2023: "year2023",
    2024: "year2024",
    Remark: "remark",
    Status: "status",
};
// export const exportCandidatesExcel = async (req: Request, res: Response) => {
//   try {
//     // 1. Fetch all candidates
//     const candidates = await Candidate.find().lean();
//     // 2. Convert HEADER_MAP to an array of headers
//     const headers = Object.keys(HEADER_MAP); // e.g. ["IPPIS Number", "Name...", "DOB", ...]
//     // 3. Map candidates into rows with header mapping
//     const rows = candidates.map((cand: any) => {
//       const row: Record<string, any> = {};
//       for (const [header, field] of Object.entries(HEADER_MAP)) {
//         row[header] = cand[field] ?? ""; // fallback empty if missing
//       }
//       return row;
//     });
//     // 4. Create worksheet
//     const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
//     // 5. Create workbook & append worksheet
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");
//     // 6. Write workbook to buffer
//     const buffer = XLSX.write(workbook, {
//       bookType: "xlsx",
//       type: "buffer",
//     });
//     // 7. Send file as response
//     res.setHeader(
//       "Content-Disposition",
//       "attachment; filename=candidates.xlsx"
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.send(buffer);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Error exporting candidates" });
//   }
// };
const exportCandidatesExcel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const candidates = yield candidateModel_1.Candidate.find().lean();
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet("Candidates");
        // 1. Add header row
        const headers = Object.keys(exports.HEADER_MAP);
        worksheet.addRow(headers);
        // 2. Add candidate rows
        for (const cand of candidates) {
            const row = headers.map((header) => {
                var _a;
                const field = exports.HEADER_MAP[header];
                return (_a = cand[field]) !== null && _a !== void 0 ? _a : "";
            });
            worksheet.addRow(row);
        }
        // 3. Set response headers
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=candidates.xlsx");
        // 4. Stream workbook directly to response
        yield workbook.xlsx.write(res);
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error exporting candidates" });
    }
});
exports.exportCandidatesExcel = exportCandidatesExcel;
