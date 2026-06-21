import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';

export class PdfParser {
  private cacheDir: string;

  constructor(cacheDir: string = './.exam_cache') {
    this.cacheDir = cacheDir;
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  async parseToText(pdfPath: string): Promise<string> {
    const hash = this.getHash(pdfPath);
    const cachePath = path.join(this.cacheDir, `${hash}.txt`);

    if (fs.existsSync(cachePath)) {
      return fs.readFileSync(cachePath, 'utf-8');
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await (pdfParse as any)(dataBuffer);
    
    fs.writeFileSync(cachePath, data.text, 'utf-8');
    return data.text;
  }
}
