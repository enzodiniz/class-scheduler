# Class Scheduler

É uma aplicação de registro de faltas de docentes, onde os docentes
podem substituir faltas de outros docentes. Possui um histórico contendo
as faltas dos professores, quantas delas foram justificadas(possuem motivo
definido) e quantas substituições eles fizeram.

## Como usar

Você deve ter um projeto do Firebase (https://firebase.google.com/?hl=pt-br) criado.
Para criá-lo acesse o console do firebase.

Você deve ter o nodeJS e a CLI do firebase instalados.


- Clone a aplicação para seu computador

```bash
git clone https://github.com/enzodiniz/class-scheduler.git
```

- Entre no diretório da aplicação

```bash
cd class-scheduler
```

- Digite o comando para associar essa aplicação ao projeto criado
no console do firebase.

```bash
firebase use --add
```

- Por fim, hospede a aplicação. 

```bash
firebase deploy
```
