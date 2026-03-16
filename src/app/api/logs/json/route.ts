import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logPath = path.join(process.cwd(), "logs", "groq_interactions.csv");

    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const stats = fs.statSync(logPath);
    const fileSize = stats.size;

    // Read the first 2KB to get the headers
    let headersStr = "";
    if (fileSize > 0) {
      const headBuffer = Buffer.alloc(Math.min(fileSize, 2048));
      const fdHead = fs.openSync(logPath, "r");
      fs.readSync(fdHead, headBuffer, 0, headBuffer.length, 0);
      fs.closeSync(fdHead);
      const headLines = headBuffer.toString("utf-8").split("\n");
      headersStr = headLines[0];
    } else {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Read the last 512KB for recent logs
    const readSize = 512 * 1024; // 512KB
    let tailContent = "";
    if (fileSize <= readSize) {
      tailContent = fs.readFileSync(logPath, "utf-8");
    } else {
      const position = fileSize - readSize;
      const tailBuffer = Buffer.alloc(readSize);
      const fdTail = fs.openSync(logPath, "r");
      fs.readSync(fdTail, tailBuffer, 0, tailBuffer.length, position);
      fs.closeSync(fdTail);

      tailContent = tailBuffer.toString("utf-8");

      // Find a valid start line. A new row starts with something like 2026-
      // We can find the first \n202
      const matchIndex = tailContent.indexOf("\n202");
      if (matchIndex !== -1) {
        tailContent = tailContent.substring(matchIndex + 1); // skip \n
      } else {
        // fallback: find first \n
        const firstNl = tailContent.indexOf("\n");
        if (firstNl !== -1) tailContent = tailContent.substring(firstNl + 1);
      }
    }

    const fileContentToParse =
      fileSize <= readSize ? tailContent : headersStr + "\n" + tailContent;

    // Parse CSV into JSON array
    const result = [];
    let headers: string[] = [];
    let inQuotes = false;
    let currentValue = "";
    let currentRecord: string[] = [];

    for (let i = 0; i < fileContentToParse.length; i++) {
      const char = fileContentToParse[i];

      if (char === '"') {
        if (inQuotes && fileContentToParse[i + 1] === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        currentRecord.push(currentValue);
        currentValue = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && fileContentToParse[i + 1] === "\n") {
          i++; // skip \n
        }
        currentRecord.push(currentValue);
        currentValue = "";

        if (headers.length === 0) {
          headers = currentRecord.map((h) => h.trim());
        } else if (currentRecord.length > 1 || currentRecord[0].trim() !== "") {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = currentRecord[index] || "";
          });
          result.push(obj);
        }
        currentRecord = [];
      } else {
        currentValue += char;
      }
    }

    if (currentRecord.length > 0 || currentValue !== "") {
      currentRecord.push(currentValue);
      if (headers.length === 0) {
        headers = currentRecord.map((h) => h.trim());
      } else if (currentRecord.length > 1 || currentRecord[0].trim() !== "") {
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
          obj[header] = currentRecord[index] || "";
        });
        result.push(obj);
      }
    }

    // Only return the last 50 logs for performance
    const data = result.slice(-50).reverse();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error reading log file:", error);
    return NextResponse.json(
      { error: "Failed to read log file" },
      { status: 500 },
    );
  }
}
