// Fonction de hachage SHA-256
export const hashCode = async (code) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Vérifier un code
export const verifyCode = async (code, storedHash) => {
  const inputHash = await hashCode(code);
  return inputHash === storedHash;
};