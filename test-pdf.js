import fs from 'fs';
import { PDFParse } from 'pdf-parse';
async function run() {
  const buf = fs.readFileSync('test.pdf');
  try {
    const p = new PDFParse({ data: buf });
    const res = await p.getText();
    console.log("Success", res.text.substring(0, 100));
  } catch(e) {
    console.log("Error:", e.message);
  }
}
run();
