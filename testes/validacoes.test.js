const {
  isValidName,
  isValidEmail,
  isStrongPassword,
} = require("../validacoes");   // caminho OK (validacoes.js está na raiz)

/* -------------------------------------------------- *
 * SUÍTE: Funções de validação                        *
 * -------------------------------------------------- */
describe("Funções de validação", () => {
  /* -------------------------------------------------- *
   * isValidName()                                      *
   * -------------------------------------------------- */
  describe("isValidName()", () => {
    test("aceita nomes válidos com letras simples ou acentuadas", () => {
      expect(isValidName("José da Silva")).toBe(true);
      expect(isValidName("Álvaro")).toBe(true);
    });

    test("rejeita nomes curtos, com dígitos, símbolos ou hífen", () => {
      expect(isValidName("Anne-Marie O'Neill")).toBe(false); // hífen não permitido pela regex atual
      expect(isValidName("Jo")).toBe(false);      // muito curto
      expect(isValidName("123")).toBe(false);     // contém dígitos
      expect(isValidName("***")).toBe(false);     // símbolos inválidos
    });
  });

  /* -------------------------------------------------- *
   * isValidEmail()                                     *
   * -------------------------------------------------- */
  describe("isValidEmail()", () => {
    const domíniosPermitidos = [
      "gmail.com",
      "outlook.com",
      "hotmail.com",
      "yahoo.com",
      "icloud.com",
    ];

    test.each(domíniosPermitidos)("aceita e‑mails do domínio %s", (dom) => {
      expect(isValidEmail(`usuario@${dom}`)).toBe(true);
    });

    test("rejeita domínios não permitidos ou formatos inválidos", () => {
      expect(isValidEmail("user@empresa.com")).toBe(false);
      expect(isValidEmail("sem-arroba.com")).toBe(false);
      expect(isValidEmail("user@icloud")).toBe(false); // sem TLD
    });
  });

  /* -------------------------------------------------- *
   * isStrongPassword()                                 *
   * -------------------------------------------------- */
  describe("isStrongPassword()", () => {
    test("aceita senhas fortes (sem sequência numérica)", () => {
      expect(isStrongPassword("Str0ng@124")).toBe(true);   // não tem 123/234...
      expect(isStrongPassword("C0mpl3x#Pass!")).toBe(true);
    });

    test("rejeita senhas curtas (<8)", () => {
      expect(isStrongPassword("S@1a")).toBe(false);
    });

    test("rejeita senhas sem mistura de maiúsculas/minúsculas/dígitos/símbolos", () => {
      expect(isStrongPassword("solet")).toBe(false);     // só minúsculas
      expect(isStrongPassword("SOLETAS")).toBe(false);   // só maiúsculas
      expect(isStrongPassword("12345678")).toBe(false);  // só números
      expect(isStrongPassword("ABCDEFG1")).toBe(false);  // sem símbolo
    });

    test("rejeita senhas com números sequenciais (ex.: 123 ou 4321)", () => {
      expect(isStrongPassword("Abc@1234")).toBe(false);  // contém 123
      expect(isStrongPassword("Zyx@4321")).toBe(false);  // contém 4321
    });

    test("permite senhas que contenham repetições desde que não sejam toda a senha", () => {
      // A regra atual só bloqueia se TODA a senha for o mesmo caractere 4+ vezes.
      expect(isStrongPassword("AAAAaaaa1!")).toBe(true);
      expect(isStrongPassword("1111Bbbb@")).toBe(true);
    });
  });
});
