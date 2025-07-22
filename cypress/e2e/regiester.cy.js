describe('Tela de Login', () => {
  beforeEach(() => {
    cy.visit('src/pages/editor/login.html');
  });

  it('deve conter campos de e-mail e senha', () => {
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
  });

  it('deve mostrar erro ao tentar logar sem preencher', () => {
    cy.get('button[type="submit"]').click();
    cy.contains('Preencha todos os campos').should('be.visible');
  });
});