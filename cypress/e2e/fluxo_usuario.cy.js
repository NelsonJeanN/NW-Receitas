describe('Fluxo do usuário: Registro, Login, Busca e Favoritar', () => {
  const email = `teste_${Date.now()}@gmail.com`;
  const senha = 'SenhaSegura@1243';

  it('Deve registrar um novo usuário', () => {
    cy.visit('src/pages/editor/register.html');

    cy.get('#reg-name').type('Usuário Teste');
    cy.get('#reg-email').type(email);
    cy.get('#reg-pass').type(senha);
    cy.contains('button', 'Registrar').click();

    cy.get('#reg-msg').should('contain', 'Usuário registrado com sucesso');
  });

  it('Deve fazer login com sucesso', () => {
    cy.visit('src/pages/editor/login.html');

    cy.get('#login-email').type(email);
    cy.get('#login-pass').type(senha);
    cy.contains('button', 'Entrar').click();

    cy.get('#welcome').should('contain', 'Bem-vindo');
  });

  it('Deve buscar uma receita', () => {
    cy.visit('src/pages/editor/index.html');

    cy.get('#recipeInput').type('Bolo de cenoura');
    cy.get('#searchBtn').click();

    cy.get('#result', { timeout: 10000 }).should('contain.text', 'Ingredientes');
    cy.get('#favBtn').should('be.visible');
  });

  it('Deve salvar a receita como favorita', () => {
    cy.get('#favBtn').click();
    cy.get('#feedback', { timeout: 5000 }).should('contain', 'Receita salva como favorita');
  });

  it('Deve exibir a receita nos favoritos', () => {
    cy.visit('src/pages/editor/favoritos.html');

    cy.get('#favoritesList', { timeout: 5000 })
      .children()
      .should('contain.text', 'Bolo de cenoura');
  });
});
