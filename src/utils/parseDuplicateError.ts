export function parseDuplicateError(error: any) {
  const duplicates: string[] = [];

  if (error.writeErrors) {
    for (const we of error.writeErrors) {
      const e = we.err || we;
      let field = "unknown";
      let value = "unknown";

      // Case 1: Modern driver (keyPattern + keyValue exist)
      if (e.keyPattern && e.keyValue) {
        field = Object.keys(e.keyPattern)[0];
        value = Object.values(e.keyValue)[0] as string;
      }
      // Case 2: Fallback to regex on errmsg
      else if (e.errmsg) {
        const match = e.errmsg.match(/dup key:\s*{\s*(.*?)\s*}/);
        if (match) {
          const kv = match[1]
            .split(":")
            .map((s: string) => s.trim().replace(/"/g, ""));
          field = kv[0];
          value = kv[1];
        }
      }

      duplicates.push(`Duplicate ${field}: ${value}`);
    }
  } else {
    // Single duplicate error
    let field = "unknown";
    let value = "unknown";

    if (error.keyPattern && error.keyValue) {
      field = Object.keys(error.keyPattern)[0];
      value = Object.values(error.keyValue)[0] as string;
    } else if (error.errmsg) {
      const match = error.errmsg.match(/dup key:\s*{\s*(.*?)\s*}/);
      if (match) {
        const kv = match[1]
          .split(":")
          .map((s: string) => s.trim().replace(/"/g, ""));
        field = kv[0];
        value = kv[1];
      }
    }

    duplicates.push(`Duplicate ${field}: ${value}`);
  }

  return duplicates;
}
