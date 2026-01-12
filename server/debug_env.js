import 'dotenv/config';

const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log('Raw env var length:', envVar.length);
console.log('First 100 chars:', envVar.substring(0, 100));

try {
  const serviceAccount = JSON.parse(envVar);
  console.log('Parsed private key length:', serviceAccount.private_key.length);
  console.log('Private key first 50 chars:', serviceAccount.private_key.substring(0, 50));
  console.log('Does it contain actual newlines?', serviceAccount.private_key.includes('\n'));
  console.log('Does it contain literal \\n?', serviceAccount.private_key.includes('\\n'));
} catch (e) {
  console.error('Parse error:', e.message);
}
