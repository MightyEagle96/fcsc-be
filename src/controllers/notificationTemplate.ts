export const notificationTemplate = (fullName: string) => `<!DOCTYPE html>
<html lang="en" style="margin: 0; padding: 0">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FCSC Promotion</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: Roboto, Arial, sans-serif;
      color: #555555;
    "
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      bgcolor="#f4f4f4"
    >
      <tr>
        <td align="center" style="padding: 20px 10px">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            border="0"
            bgcolor="#ffffff"
            style="max-width: 600px; border-radius: 8px; overflow: hidden"
          >
            <!-- Header -->
            <tr>
              <td
                align="center"
                bgcolor="#28a745"
                style="
                  padding: 30px 20px;
                  background: linear-gradient(135deg, #3d886c, #28a745);
                "
              >
                <img
                  src="https://recruitment.fedcivilservice.gov.ng/build/assets/fcsc-logo-DC4X6AV5.png"
                  alt="FCSC Logo"
                  width="80"
                  style="display: block; margin: 0 auto 10px auto"
                />
                <h1
                  style="
                    margin: 0;
                    font-size: 22px;
                    font-weight: bold;
                    color: #ffffff;
                    font-family: Roboto, Arial, sans-serif;
                  "
                >
                  FEDERAL CIVIL SERVICE COMMISSION
                </h1>
                <p style="color: white; font-weight: 100">
                  2025 (DLP) PROMOTION EXAMINATION
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td
                style="
                  padding: 25px 20px;
                  font-size: 16px;
                  line-height: 1.6;
                  color: #555555;
                  font-family: Roboto, Arial, sans-serif;
                "
              >
                <p style="margin: 0 0 15px 0; text-transform: capitalize">
                  Dear ${fullName},
                </p>
                <p style="margin: 0 0 15px 0">
                  Please be notified that you are to come for your promotion
                  examination with your laptop.<br />
                </p>
                <p style="margin: 0 0 15px 0">
                  The time for your examination is <b>8:00am New York Time</b> on Wednesday, 19th November 2025.
                  <br />
                </p>

                <p style="margin: 20px 0 0 0; color: gray">
                  If this email is not intended for you, kindly ignore.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                align="center"
                bgcolor="#f9f9f9"
                style="
                  padding: 15px;
                  font-size: 12px;
                  color: #777777;
                  font-family: Roboto, Arial, sans-serif;
                "
              >
                Please do not respond to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
