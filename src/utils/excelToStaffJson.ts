import * as XLSX from "xlsx";

const HEADER_MAP: Record<string, keyof StaffSchema> = {
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

type StaffSchema = {
  ippisNumber: string;
  fullName: string;
  dateOfBirth: Date | string;
  gender: string;
  stateOfOrigin: string;
  lga: string;
  poolOffice: string;
  currentMDA: string;
  cadre: string;
  gradeLevel: string;
  dateOfFirstAppointment: Date | string;
  dateOfConfirmation: Date | string;
  dateOfLastPromotion: Date | string;
  phoneNumber: string;
  email: string;
  stateOfCurrentPosting: string;
  year2021: string;
  year2022: string;
  year2023: string;
  year2024: string;
  remark: string;
};

export function excelToStaffJson(filePath: string): StaffSchema[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (rawData.length === 0) {
    throw new Error("Uploaded file is empty");
  }

  // Validate headers
  const fileHeaders = Object.keys(rawData[0]);
  const missingHeaders = Object.keys(HEADER_MAP).filter(
    (h) => !fileHeaders.includes(h)
  );
  if (missingHeaders.length > 0) {
    throw new Error(`Missing headers: ${missingHeaders.join(", ")}`);
  }

  // Map rows into schema
  const staffData: StaffSchema[] = rawData.map((row) => {
    const mapped: Partial<StaffSchema> = {};
    for (const [excelHeader, schemaField] of Object.entries(HEADER_MAP)) {
      let value = row[excelHeader];

      // Attempt date parsing for date fields
      if (
        [
          "DOB",
          "Date of First Appointment",
          "Date of Confirmation",
          "Date of Last Promotion",
        ].includes(excelHeader) &&
        value
      ) {
        value = new Date(value);
      }

      mapped[schemaField] = value;
    }
    return mapped as StaffSchema;
  });

  return staffData;
}
