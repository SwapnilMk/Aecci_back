import fs from 'fs';
import path from 'path';
const dirs = ['d:/Projects/AECCI/global/aecci_back/src', 'd:/Projects/AECCI/global/Aecci_main/src'];
function walk(dir: string) {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
  });
  return results;
}
dirs.forEach(dir => {
  const files = walk(dir);
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content
      .replace(/kycStatus/g, 'verificationStatus')
      .replace(/kycRejectionReason/g, 'rejectionReason')
      .replace(/internationalKycIds/g, 'internationalIds')
      .replace(/updateKycStatus/g, 'updateVerificationStatus')
      .replace(/updateKyc/g, 'updateVerification');
    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
      console.log('Updated ' + file);
    }
  });
});