import { Request, Response } from "express";
import { Candidate } from "../models/candidateModel";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import { uploadFileToB2WithFolder } from "../utils/uploadToB2";

export async function generateLetterFunc(data: any): Promise<string> {
  try {
    const htmlPath = path.resolve(__dirname, "../assets/examcardTemplate.html");

    if (!fs.existsSync(htmlPath)) {
      throw new Error(`Template file not found: ${htmlPath}`);
    }

    const logoBase64 = fs
      .readFileSync(path.resolve(__dirname, "../assets/logo.png"))
      .toString("base64");

    // Ensure the file exists before reading
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`Template file not found: ${htmlPath}`);
    }

    const qrCodeBase64 = await QRCode.toDataURL(data._id.toString());

    let htmlTemplate = fs.readFileSync(htmlPath, "utf8");

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
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlTemplate);

    const outputPath = path.join(
      __dirname,
      `examcards/${data.ippisNumber}.pdf`
    );

    //ensure the directory exists
    //ensure the directory exists
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await page.pdf({
      path: outputPath,
      height: "1450px",
      width: "800px",
      printBackground: true,
    });

    await browser.close();

    console.log(`✅ Letter generated: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error("❌ Error generating certificate:", error);
    return "";
  }
}

// export const generateLetter = async (req: Request, res: Response) => {
//   const candidates = req.body;

//   for (let i = 0; i < candidates.length; i++) {
//     const candidate = await Candidate.findOne({
//       ippisNumber: candidates[i].ippisNumber,
//     }).lean();
//     if (!candidate) {
//       throw new Error(`Candidate not found: ${candidates[i].ippisNumber}`);
//     }

//     //update the candidate
//     await Candidate.updateOne(
//       { _id: candidate._id },
//       { $set: { ...candidates[i] } }
//     );

//     const outputPath = await generateLetterFunc({
//       ...candidate,
//       ...candidates[i],
//       passport:
//         candidate.uploadedDocuments?.find(
//           (c) => c.fileType === "Passport Photograph"
//         )?.fileUrl || "",
//     });

//     const result = await uploadFileToB2WithFolder(
//       outputPath,
//       "application/pdf",
//       "examcards"
//     );

//     if (result) {
//       await Candidate.updateOne(
//         { _id: candidate._id },
//         {
//           $set: {
//             fileId: result.fileId,
//             fileName: result.fileName,
//             fileUrl: result.fileUrl,
//           },
//         }
//       );

//       fs.unlinkSync(outputPath);
//     }
//   }
//   res.send("Generating data");
// };

const BATCH_SIZE = 5; // process 5 candidates in parallel

export const generateLetter = async (req: Request, res: Response) => {
  try {
    const candidates = req.body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).send("No candidates provided");
    }

    console.log(`📄 Generating letters for ${candidates.length} candidates...`);

    // Split candidates into chunks of 5
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (payload) => {
          try {
            const candidate = await Candidate.findOne({
              ippisNumber: payload.ippisNumber,
            }).lean();

            if (!candidate) {
              console.warn(`⚠️ Candidate not found: ${payload.ippisNumber}`);
              return;
            }

            // 🔄 Update candidate info before letter generation
            await Candidate.updateOne(
              { _id: candidate._id },
              { $set: { ...payload } }
            );

            // 🧾 Generate PDF letter
            const outputPath = await generateLetterFunc({
              ...candidate,
              ...payload,
              passport:
                candidate.uploadedDocuments?.find(
                  (c) => c.fileType === "Passport Photograph"
                )?.fileUrl || "",
            });

            // ☁️ Upload to Backblaze B2
            const result = await uploadFileToB2WithFolder(
              outputPath,
              "application/pdf",
              "examcards"
            );

            if (result) {
              // 🗃️ Update candidate record with uploaded file metadata
              await Candidate.updateOne(
                { _id: candidate._id },
                {
                  $set: {
                    fileId: result.fileId,
                    fileName: result.fileName,
                    fileUrl: result.fileUrl,
                  },
                }
              );
            }

            // 🧹 Cleanup local file
            try {
              await fs.promises.unlink(outputPath);
            } catch (unlinkErr) {
              console.error(`⚠️ Could not delete ${outputPath}:`, unlinkErr);
            }

            console.log(`✅ Processed: ${payload.ippisNumber}`);
          } catch (err) {
            console.error(`❌ Error processing ${payload.ippisNumber}:`, err);
          }
        })
      );
    }

    res.send("✅ Letters generated and uploaded successfully");
  } catch (err) {
    console.error("❌ Error generating letters:", err);
    res.status(500).send("Error generating letters");
  }
};
export const viewCandidate = async (req: Request, res: Response) => {
  const candidate = await Candidate.findById(req.query.id).lean();

  if (!candidate) {
    return res.status(404).send("Candidate not found");
  }
  res.send(candidate);
};
