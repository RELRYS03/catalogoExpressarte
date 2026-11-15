const { readFileSync, writeFileSync } = require('node:fs');
const { createDecipheriv } = require('node:crypto');

const [backupPath, keyPath, outputPath] = process.argv.slice(2);
if (!backupPath || !keyPath || !outputPath) {
  console.error('Uso: node restaurar.cjs <backup.zip.aes> <chave.hex> <saida.zip>');
  process.exitCode = 1;
} else {
  const backup = readFileSync(backupPath);
  const header = backup.subarray(0, 5);
  if (!header.equals(Buffer.from('EXAR1'))) throw new Error('Formato de backup desconhecido.');

  const keyHex = readFileSync(keyPath, 'utf8').trim();
  if (!/^[0-9a-f]{64}$/i.test(keyHex)) throw new Error('Chave de recuperação inválida.');

  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), backup.subarray(5, 17));
  decipher.setAAD(header);
  decipher.setAuthTag(backup.subarray(17, 33));
  const original = Buffer.concat([decipher.update(backup.subarray(33)), decipher.final()]);
  writeFileSync(outputPath, original, { flag: 'wx' });
  console.log('Backup restaurado.');
}
