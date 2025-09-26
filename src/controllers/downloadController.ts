import { Request, Response } from "express";
import XLSX from "xlsx";
import { Candidate } from "../models/candidateModel";

export const HEADER_MAP = {
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

export const exportCandidatesExcel = async (req: Request, res: Response) => {
  try {
    // 1. Fetch all candidates
    const candidates = await Candidate.find().lean();

    // 2. Convert HEADER_MAP to an array of headers
    const headers = Object.keys(HEADER_MAP); // e.g. ["IPPIS Number", "Name...", "DOB", ...]

    // 3. Map candidates into rows with header mapping
    const rows = candidates.map((cand: any) => {
      const row: Record<string, any> = {};
      for (const [header, field] of Object.entries(HEADER_MAP)) {
        row[header] = cand[field] ?? ""; // fallback empty if missing
      }
      return row;
    });

    // 4. Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });

    // 5. Create workbook & append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");

    // 6. Write workbook to buffer
    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    // 7. Send file as response
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=candidates.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error exporting candidates" });
  }
};
