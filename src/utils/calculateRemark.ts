function calculateRemark(doc: any): number | null {
  const years = ["year2021", "year2022", "year2023", "year2024"];

  const values = years
    .map((year) => doc[year])
    .filter((val) => typeof val === "number" && !isNaN(val));

  if (values.length === 0) return null; // no data at all

  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.ceil(sum / values.length);
}

export default calculateRemark;
