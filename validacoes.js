function isValidName(name) {
  return /^[A-Za-zÀ-ÿ' ]{3,}$/.test(name);
}

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@(?:gmail\.com|outlook\.com|hotmail\.com|yahoo\.com|icloud\.com)$/i.test(email);
}

function hasSequentialNums(str) {
  return /012|123|234|345|456|567|678|789|890|098|987|876|765|654|543|432|321/.test(str);
}

function isStrongPassword(pwd) {
  if (pwd.length < 8) return false;
  if (hasSequentialNums(pwd)) return false;
  if (/^(.)\1{3,}$/.test(pwd)) return false;
  return (
    /[a-z]/.test(pwd) &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd)
  );
}

module.exports = {
  isValidName,
  isValidEmail,
  isStrongPassword
};
