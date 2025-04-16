import fs from 'fs';
import path from 'path';

export function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function validatePathWritable(filePath: string) {
  try {
    const dirPath = path.dirname(filePath);
    ensureDirectoryExists(dirPath);
    
    // Try to write a test file
    const testPath = path.join(dirPath, '.write-test');
    fs.writeFileSync(testPath, '');
    fs.unlinkSync(testPath);
    return true;
  } catch (error) {
    return false;
  }
}

export function getSavePaths() {
  const publicPath = process.cwd();
  const standalonePath = process.env.STANDALONE_PATH || null;
  
  return {
    publicPath,
    standalonePath
  };
} 