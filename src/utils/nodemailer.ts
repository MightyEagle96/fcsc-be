import nodemailer from "nodemailer";

//console.log(process.env.MAILTRAP_TOKEN);
const transporter = nodemailer.createTransport({
  host: "bulk.smtp.mailtrap.io", // from Mailtrap
  port: 587, // from Mailtrap
  auth: {
    user: "api", // from Mailtrap
    pass: process.env.MAILTRAP_TOKEN, // from Mailtrap
  },
});

export async function sendMailFunc(to: string, subject: string, html?: string) {
  try {
    const info = await transporter.sendMail({
      from: "<no-reply@accreditation.jamb.gov.ng>",
      to: to,
      subject,

      html,
    });

    console.log("Message sent: %s", info.messageId);
  } catch (err) {
    console.error("Error sending mail:", err);
  }
}
