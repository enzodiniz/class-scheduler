// Horário de turma
// Define o substituto nas substituições
angular
  .module('class-scheduler')
  .controller('horarioCtrlTeste', horarioCtrl);

function horarioCtrl($scope, $mdDialog, authSvc, $pessoaSvc, $historicoSvc,
  $turmaSvc, $rootScope, $disciplinaSvc, $subSvc, $horarioSvc, $periodoSvc, $profSvc,
  $mdClassSchedulerToast, $alertSvc, temaSvc, $location) {

  const self = this;

  self.init = function () {
    self.initFirebase()
    self.updateMenuBar();
    self.labelHorario = [
      {inicio: "07:00", final:"07:50"}, {inicio: "07:50", final:"08:40"},
      {inicio: "08:40", final:"09:30"}, {inicio: "09:50", final:"10:40"}, {inicio: "10:40", final:"11:30"},
      {inicio: "11:30", final:"12:20"}, {inicio: "13:00", final: "13:50"}, {inicio: "13:50", final:"14:40"},
      {inicio: "14:40", final:"15:30"}, {inicio: "15:50", final:"16:40"}, {inicio: "16:40", final:"17:30"}
    ];
    getUsuario();
    getTema();
  }

  self.initFirebase = function() {
    self.db = firebase.firestore();
  }

  function getUsuario() {
    gotUsuario(authSvc.getUsuario());
    authSvc.observarUsuario(usuario => {
        $scope.$apply(() => {
            gotUsuario(usuario);
        });
    });
  }

  function AuthorizationException(message) {
    this.message = message;
    this.name = "AuthorizationException";
  }

  function gotUsuario(user) {
        self.user = user;
        if (self.user && user.papeis.includes('professor'))
            return;

        const error = new AuthorizationException('Usuário sem papel de professor');
        handleError(error, 'verificar papel de professor');
        $location.path('/home');
  }

  function getTema() {
    self.themeSelected = temaSvc.getTema();
    temaSvc.observarTema(tema => {
        self.themeSelected = tema;
    });
  }

  // atualiza no as informações na barra de menu que é controlada pelo mainCtrl.
  self.updateMenuBar = function () {
    $rootScope.$broadcast('tituloPagina', {
      titulo: "Horário da Turma"
    });
  }

  self.isLoading = function () {
    return self.loadingHorario || self.loadingSubstituicoes
  }

  self.loadPeriodos = function() {
    self.listaPeriodos = []
    return $periodoSvc.loadPeriodos(self.listaPeriodos)
  }

  self.loadTurmas = function () {
    self.turmas = [];

    return $turmaSvc.getTurmasPorPeriodo(self.periodo.id)
      .then(self.gotTurmas)
      .catch(error => {
        console.error("Erro em loadTurmas:", error);
        $alertSvc.showAlert("Ocorreu um erro ao obter as turmas do servidor!")
        $mdClassSchedulerToast.show("Ocorreu um erro ao obter as turmas do servidor!")
      })
  }

  self.gotTurmas = async function (query) {
    cursoPromises = []

    query.forEach(snapTurma => {
      const turma = snapTurma.data()
      turma.id = snapTurma.id

      self.turmas.push(turma)

      const promiseCurso = new Promise((resolve, reject) => {
        turma.curso.get().then(snapCurso => {
          resolve(snapCurso.data())
        })
        .catch(error => reject(error))
      });

      cursoPromises.push(promiseCurso)
    })

    await Promise.all(cursoPromises).then(cursos => {
      for (let i = 0; i < cursos.length; i++) {
        self.turmas[i].curso = cursos[i]
      }
    })
    .catch(error => {
      console.error('Erro ao obter cursos das turmas: ', error);
    })
  }

  self.getEmptyJSON = function () {
    return {
      1: new Array(15).fill(null),
      2: new Array(15).fill(null),
      3: new Array(15).fill(null),
      4: new Array(15).fill(null),
      5: new Array(15).fill(null)
    };
  }

  self.submit = function () {
    if (self.user) {
      self.definirDatas(self.dia)

      const refTurmaSelected = self.db.doc('turmas/' + self.turmaSelected.id)

      self.horario = self.getEmptyJSON();
      self.getHorario(refTurmaSelected, self.horario)

      self.substituicoes = self.getEmptyJSON();
      self.getSubstituicoes(refTurmaSelected, self.substituicoes)

      console.log('substituições: ', self.substituicoes);

      self.verifySubturmas2(self.turmaSelected)

      // self.getHorario(self.turmaSelected)
    }
  }
  
  self.definirDatas = function (data) {
    const domingo = $subSvc.retornarDom(data)
    const sabado = $subSvc.retornarSab(domingo);

    self.domingo = domingo.getTime()
    self.sabado = sabado.getTime()

    const domingoDate = domingo.getDate()

    self.dates = {
      segunda: new Date(self.domingo).setDate(domingoDate + 1),
      terca: new Date(self.domingo).setDate(domingoDate + 2),
      quarta: new Date(self.domingo).setDate(domingoDate + 3),
      quinta: new Date(self.domingo).setDate(domingoDate + 4),
      sexta: new Date(self.domingo).setDate(domingoDate + 5),
    }
  }

  self.verifySubturmas2 = function (turma) {
    $turmaSvc.getSubturmasByTurmaId(turma.id)
      .then(self.gotSubturmas)
      .catch(error => self.handleError(error, 'verificar subturmas'))
  }

  self.gotSubturmas = function (query) {
    query.forEach(snapSubturma => {
      const subturmaRef = self.db.doc('subturmas/' + snapSubturma.id);
      const subturma = snapSubturma.data();

      if (subturma.titulo === 'G1') {
        self.horarioG1 = self.getEmptyJSON();
        self.getHorario(subturmaRef, self.horarioG1)

        self.substituicoesG1 = self.getEmptyJSON();
        self.getSubstituicoes(subturmaRef, self.substituicoesG1)
        console.log('substituições G1: ', self.substituicoesG1);
      }
      else if (subturma.titulo === 'G2') {
        self.horarioG2 = self.getEmptyJSON();
        self.getHorario(subturmaRef, self.horarioG2)

        self.substituicoesG2 = self.getEmptyJSON();
        self.getSubstituicoes(subturmaRef, self.substituicoesG2)
        console.log('substituições G2: ', self.substituicoesG2);
      }
    })
  }

  self.getHorario = function (turmaRef, horarioJSON, loadingFlag) {
    $horarioSvc.getHorarioTurmaByRef(turmaRef)
      .then(horario => {
        $scope.$apply(function () {
          for (dia in horario) {
            for (let i = 0; i < horario[dia].length; i++){
              horarioJSON[dia][i] = horario[dia][i]
            }
          }
        })
      })
      .catch(error => {
        $alertSvc.showAlert('Ocorreu um erro ao buscar horário de turma!')
        console.error('Ocorreu um erro ao buscar horário de turma:', error);
      })
  }

  self.getSubstituicoes = function (turmaRef, JSONSubstituicoes) {

    console.log('Consultando...');
    console.log('JSON Substituições:', JSONSubstituicoes);
    console.log('turmaRef:', turmaRef);
    console.log('orderBy data');
    console.log('startAt:', self.domingo);
    console.log('endAt:', self.sabado);

    self.db.collection("substituicoes")
      .where("turmaRef", "==", turmaRef)
      .where('data', '>=', self.domingo)
      .where('data', '<=', self.sabado)
      // .orderBy("data")
      // .startAt(self.domingo)
      // .endAt(self.sabado)
      .onSnapshot(query => {
        console.log('query empty: ', query.empty);
        query.forEach(snapSubstituicao => {
          const substituicao = snapSubstituicao.data()
          substituicao.id = snapSubstituicao.id

          const dataSubstituicao = new Date(substituicao.data)
          const day = dataSubstituicao.getDay()

          $subSvc.setStatus(substituicao)

          JSONSubstituicoes[day][substituicao.aula.indice] = substituicao
        })
      }, error => {
        $alertSvc.showAlert("Ocorreu um erro ao buscar substituições!")
        console.error("Ocorreu um erro ao buscar substituições:", error);
      })
  }

  self.actions = function (substituicao, disciplina, event) {
    if (!substituicao) return;

    if (substituicao.status === 'livre' || substituicao.status === 'falta') {
      self.showOcuparAula(substituicao, event);
    }

    else if (substituicao.status === 'substituida') {
      if (substituicao.substituto.professorId === self.loggedUser.id) {
        self.showDesocuparAula(substituicao, disciplina, event)
      } else {
        self.showAulaSubstituida(substituicao, event);
      }
    }
  }

  self.showOcuparAula = function (substituicao, event) {
    $mdDialog.show({
      templateUrl: 'app/components/horario-turma-teste/ocupar-aula.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose:true,
      locals: {
        substituicao: substituicao
      },
      controller: ['$scope', 'substituicao',
        function ($scope, substituicao) {

          $scope.cancel = function () {
            $mdDialog.cancel();
          }

          $scope.hide = function () {
            $mdDialog.hide($scope.disciplinaSelecionada)
          }

          $scope.getDisciplinas = function () {
            const turmaRef = substituicao.turmaRef;
            const professorId = self.loggedUser.id

            console.log('consultando com...')
            console.log('turma:', turmaRef);
            console.log('professor:', professorId);
            return $disciplinaSvc.getDisciplinasByTurmaRefAndProfessorId(turmaRef, professorId)
              .then(query => {
                console.log('query:', query);
                $scope.disciplinas = [];

                query.forEach(snapDisciplina => {
                  const disciplina = snapDisciplina.data();
                  disciplina.id = snapDisciplina.id;

                  $scope.disciplinas.push(disciplina);
                })
              })
              .catch(error => {
                console.error('Ocorreu um erro ao obter as disciplinas do prof:', error);
              })
          }
        }
      ]
    }).then(disciplina => self.ocuparAula(substituicao, disciplina),
        function () {

        }
      )
  }

  self.ocuparAula = function (substituicao, disciplina) {
    $subSvc.definirSubstituto(substituicao.id, disciplina.id, disciplina.professorId)
      .then(() => {
        $mdClassSchedulerToast.show('A aula foi substituída');
        console.log('Substituto definido: /substituicoes/' + substituicao.id);

        self.addHistorico('LO', disciplina, substituicao);
      })
      .catch(error => {
        $alertSvc.showAlert('Ocorreu um erro ao substituir aula!');
        console.error('Ocorreu um erro ao substituir aula:', error);
      })
  }

  self.showDesocuparAula = function (substituicao, disciplina, event) {
    $mdDialog.show(
      $mdDialog.confirm()
        .title('Remover sua substituição dessa aula?')
        .ok('Remover')
        .cancel('Cancelar')
        .targetEvent(event)
        .theme(self.themeSelected)
    ).then(function () {
      console.log('desocuparAula -> disciplina:', disciplina);

      $subSvc.definirSubstituto(substituicao.id, null, null)
        .then(() => {
          $mdClassSchedulerToast.show('Substituição removida');
          console.log('Substituto definido: /substituicoes/' + substituicao.id);

          self.addHistorico('OL', disciplina, substituicao);
        })
        .catch(error => self.handleError(error, 'Desocupar aula'))
    }, function () {

    })
  }

  self.addHistorico = function (action, disciplina, substituicao) {
    const historico = {
      action: action,
      authorId: self.loggedUser.id,
      disciplina: disciplina,
      substituicao: substituicao,
      turmaRef: substituicao.turmaRef
    };

    $historicoSvc.addHistorico2(historico).then((historicoRef) => {
      console.log(`${action} - Adicionado ao histórico: ${historicoRef.path}`);
    })
    .catch(error => self.handleError(error, 'Adicionar ao histórico'))
  }

  self.showAulaSubstituida = function (substituicao, event) {
    $mdDialog.show({
      templateUrl: 'app/components/horario-turma-teste/aula-substituida.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose:true,
      locals: {
        substituicao: substituicao
      },
      controller: ['$scope', 'substituicao',
        function ($scope, substituicao) {

          $scope.cancel = function () {
            $mdDialog.cancel();
          }

          $scope.isLoading = function () {
            return $scope.loadingDisciplina || $scope.loadingProfessor;
          }

          $scope.verificarSubstituto = function () {
            $scope.substituto = substituicao.substituto;

            if (!$scope.substituto.disciplina) {
              $scope.loadingDisciplina = true;
              $scope.getDisciplina($scope.substituto)
            }

            if (!$scope.substituto.professor) {
              $scope.loadingProfessor = true;
              $scope.getProfessor($scope.substituto)
            }
          }

          $scope.getDisciplina = function (substituto) {
            const disciplinaId = substituto.disciplinaId;

            $disciplinaSvc.getDisciplina(disciplinaId)
              .then(snapDisciplina => {
                $scope.$apply(function () {
                  substituto.disciplina = snapDisciplina.data();
                  $scope.loadingDisciplina = false;
                });
              })
              .catch(error => self.handleError(error, 'buscar disciplina substituta'))
          }

          $scope.getProfessor = function (substituto) {
            const professorId = substituto.professorId;
            $profSvc.getProfessorById(professorId)
              .then(professor => {
                $scope.$apply(function () {
                  substituto.professor = professor
                  $scope.loadingProfessor = false;
                })
              })
              .catch(error => self.handleError(error, 'buscar professor substituto'))
          }

          $scope.verificarSubstituto();
        }
      ]
    })
  }

  self.handleError = function (error, operation = 'operation') {
    console.error(`Ocorreu um erro ao ${operation}`, error);
    $alertSvc.showAlert(`Ocorreu um erro ao ${operation}!`)
  }

  // self.init()
}
