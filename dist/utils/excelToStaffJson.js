"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.excelToStaffJson = void 0;
const XLSX = __importStar(require("xlsx"));
const HEADER_MAP = {
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
};
function excelToStaffJson(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    if (rawData.length === 0) {
        throw new Error("Uploaded file is empty");
    }
    // Validate headers
    const fileHeaders = Object.keys(rawData[0]);
    const missingHeaders = Object.keys(HEADER_MAP).filter((h) => !fileHeaders.includes(h));
    if (missingHeaders.length > 0) {
        throw new Error(`Missing headers: ${missingHeaders.join(", ")}`);
    }
    // Map rows into schema
    const staffData = rawData.map((row) => {
        const mapped = {};
        for (const [excelHeader, schemaField] of Object.entries(HEADER_MAP)) {
            let value = row[excelHeader];
            // Attempt date parsing for date fields
            if ([
                "DOB",
                "Date of First Appointment",
                "Date of Confirmation",
                "Date of Last Promotion",
            ].includes(excelHeader) &&
                value) {
                value = new Date(value);
            }
            mapped[schemaField] = value;
        }
        return mapped;
    });
    return staffData;
}
exports.excelToStaffJson = excelToStaffJson;
