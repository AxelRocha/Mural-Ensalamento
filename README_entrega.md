
# Adição de um mural ao projeto do ensalador

- Projeto de Software/Design de Software - 2019
- Axel Valene Rocha
- Lucas Braz Cunha

As configurações utilizadas durante o desenvolvimento do trabalho foram de banco em memória.

Diagrama geral das classes do projeto no arquivo class_diagram.png

Diagrama de classes apenas das mudanças no arquivo mural_diagram.png

### Objetivo:
O trabalho consistia e implementar um mural que será um agregador de informações/avisos úteis para os usuários do Departamento (alunos, servidores e professores), relativos às turmas (cancelamentos/provas/etc.), salas (troca de sala/sala em laboratório), dias de aula (cancelamentos/mudança de horário), entre outros. O mural deverá conter:
- Informações: mensagem de exibição; responsável pela mensagem (servidor ou professor); sala (não obrigatório); turma (não obrigatório); órgão; data; indicação se o aviso ainda está válido.

- Funcionamento: o mural implementado deverá ser acessado através de API RESTful. O mural deverá ter funcionalidades CRUD: criação, leitura (todas as ocorrências, ou filtrado por cada um dos itens acima separadamente), alteração e exclusão.

### Changelog:
- Adição do modelo "Aviso", que representa uma mensagem escrita no mural.
- Adição de endpoints para o CRUD de Aviso e busca com filtro.
- Adição de relacionamento entre o modelo "Professor" e o modelo "UsuarioGenerico".
- Autentição em relação aos endpoints do modelo "Aviso":
	- Apenas usuários autenticados podem realizar a criação de Avisos.
	- Qualquer usuário pode realizar a consulta aos avisos.
	- Apenas quem criou o aviso pode executar updates e deletes.
