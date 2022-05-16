// Horário de turma
// Define o substituto nas substituições(adiciona e remove)
angular
  .module('class-scheduler')
  .controller('horarioTurmaCtrl', horarioCtrl);

function horarioCtrl($scope, $mdDialog, authSvc, $pessoaSvc, $historicoSvc,
  $turmaSvc, $rootScope, $disciplinaSvc, $subSvc, $horarioSvc, $periodoSvc, $profSvc,
  $mdClassSchedulerToast, $alertSvc, temaSvc, $location) {

  const self = this;

  self.init = init;
  self.submit = submit;
  self.isLoading = isLoading;
  self.loadPeriodos = loadPeriodos;
  self.loadTurmas = loadTurmas;
  // Define a ação com base no status da substituição.
  self.actions = actions;

  function init() {
    initFirebase()
    updateMenuBar();
    self.labelHorario = [
      {inicio: "07:00", final:"07:50"}, {inicio: "07:50", final:"08:40"},
      {inicio: "08:40", final:"09:30"}, {inicio: "09:50", final:"10:40"}, {inicio: "10:40", final:"11:30"},
      {inicio: "11:30", final:"12:20"}, {inicio: "13:00", final: "13:50"}, {inicio: "13:50", final:"14:40"},
      {inicio: "14:40", final:"15:30"}, {inicio: "15:50", final:"16:40"}, {inicio: "16:40", final:"17:30"}
    ];
    getUsuario();
    getTema();
  }

  function initFirebase() {
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
  function updateMenuBar() {
    $rootScope.$broadcast('tituloPagina', {
      titulo: "Horário da Turma"
    });
  }

  function isLoading() {
    return (self.buscandoHorario || self.buscandoHorarioG1 ||
            self.buscandoHorarioG2 || self.buscandoSubstituicoes ||
            self.buscandoSubstituicoesG1 || self.buscandoSubstituicoesG2);
  }

  function loadPeriodos() {
    self.listaPeriodos = []
    return $periodoSvc.loadPeriodos(self.listaPeriodos)
  }

  function loadTurmas() {
    self.turmas = [];
    return $turmaSvc.getTurmasPorPeriodo2(self.periodo.id)
        .then(turmas => {
            self.turmas = turmas;
        })
        .catch(error => handleError(error, 'buscar turmas'));
  }

  function getEmptyJSON() {
    return {
      1: new Array(15).fill(null),
      2: new Array(15).fill(null),
      3: new Array(15).fill(null),
      4: new Array(15).fill(null),
      5: new Array(15).fill(null)
    };
  }

  function submit() {
    if (!self.user) return;
    definirDatas(self.dia);
    getHorario();
    getSubstituicoes();
    $turmaSvc.getSubturmasByTurmaId(self.turmaSelected.id)
        .then(subturmas => {
            if(subturmas.length === 0) return;
            getHorarioG1(subturmas[0].id );
            getSubstituicoesG1(subturmas[0].id);
            getHorarioG2(subturmas[1].id);
            getSubstituicoesG2(subturmas[1].id);
        })
        .catch(error => handleError(error, 'buscar subturmas'))
  }

  function getHorario(){
    self.buscandoHorario = true;
    const refTurmaSelected = self.db.doc('turmas/' + self.turmaSelected.id);
    getHorarioFromService(refTurmaSelected, horario => {
        self.horario = horario;
        self.buscandoHorario = false;
    });
  }

  function getHorarioG1(turmaId) {
      self.buscandoHorarioG1 = true;
      const refSubturma = self.db.doc('subturmas/' + turmaId);
      $horarioSvc.getHorarioTurmaByRef(refSubturma)
          .then(horario => {
            self.horarioG1 = horario;
            self.buscandoHorarioG1 = false;
          })
          .catch(error => handleError(error, 'busca horário g1'));
  }

  function getHorarioG2(turmaId) {
      self.buscandoHorarioG2 = true;
      const refSubturma = self.db.doc('subturmas/' + turmaId);
      $horarioSvc.getHorarioTurmaByRef(refSubturma)
          .then(horario => {
            self.horarioG2 = horario;
            self.buscandoHorarioG2 = false;
          })
          .catch(error => handleError(error, 'busca horário g2'));
  }

  function getHorarioFromService(turmaRef, callback) {
    $horarioSvc.getHorarioTurmaByRef(turmaRef)
        .then(horario => callback(horario))
        .catch(error => handleError(error, 'buscar horário'))
  }

  function getSubstituicoes() {
    self.buscandoSubstituicoes = true;
    const turmaRef = self.db.doc('turmas/' + self.turmaSelected.id);
    $subSvc.getSubstituicoesPorTurmaRef(turmaRef, self.domingo, self.sabado)
        .then(substituicoes => {
            self.substituicoes = substituicoes;
            self.buscandoSubstituicoes = false;
        })
        .catch(error => handleError(error, 'buscar substituições'));
  }

  function getSubstituicoesG1(turmaId) {
    self.buscandoSubstituicoesG1 = true;
    const turmaRef = self.db.doc('subturmas/' + turmaId);
    $subSvc.getSubstituicoesPorTurmaRef(turmaRef, self.domingo, self.sabado)
        .then(substituicoes => {
            self.substituicoesG1 = substituicoes;
            self.buscandoSubstituicoesG1 = false;
        })
        .catch(error => handleError(error, 'buscar substituições g1'));
  }

  function getSubstituicoesG2(turmaId) {
    self.buscandoSubstituicoesG2 = true;
    const turmaRef = self.db.doc('subturmas/' + turmaId);
    $subSvc.getSubstituicoesPorTurmaRef(turmaRef, self.domingo, self.sabado)
        .then(substituicoes => {
            self.substituicoesG2 = substituicoes;
            console.log(self.substituicoesG2);
            self.buscandoSubstituicoesG2 = false;
        })
        .catch(error => handleError(error, 'buscar substituições g2'));
  }

  function definirDatas(data) {
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

  function actions(substituicao, disciplina, event) {
    if (!substituicao) return;
    if (substituicao.status === 'livre' || substituicao.status === 'falta') {
      showOcuparAula(substituicao, event);
    }
    else if (substituicao.status === 'substituida') {
      if (substituicao.substituto.professorId === self.user.id) {
        self.showDesocuparAula(substituicao, disciplina, event)
      } else {
        self.showAulaSubstituida(substituicao, event);
      }
    }
  }

  function showOcuparAula(substituicao, event) {
    $mdDialog.show({
      templateUrl: 'app/components/horario-turma/ocupar-aula.tmpl.html',
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
            const professorId = self.user.id

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
    }).then(disciplina => ocuparAula(substituicao, disciplina),
        function () {

        }
      )
  }

  function ocuparAula(substituicao, disciplina) {
    $subSvc.definirSubstituto(substituicao.id, disciplina.id, disciplina.professorId)
      .then(() => {
        $mdClassSchedulerToast.show('A aula foi substituída');
        console.log('Substituto definido: /substituicoes/' + substituicao.id);

        addHistorico('LO', disciplina, substituicao);
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

          addHistorico('OL', disciplina, substituicao);
        })
        .catch(error => handleError(error, 'Desocupar aula'))
    }, function () {

    })
  }

  function addHistorico(action, disciplina, substituicao) {
    $historicoSvc.addHistorico2({
      action: action,
      authorId: self.user.id,
      disciplina: disciplina,
      substituicao: substituicao,
      turmaRef: substituicao.turmaRef
    }).then((historicoRef) => {
      console.log(`${action} - Adicionado ao histórico: ${historicoRef.path}`);
    })
    .catch(error => handleError(error, 'Adicionar ao histórico'))
  }

  self.showAulaSubstituida = function (substituicao, event) {
    $mdDialog.show({
      templateUrl: 'app/components/horario-turma/aula-substituida.tmpl.html',
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
              .catch(error => handleError(error, 'buscar disciplina substituta'))
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
              .catch(error => handleError(error, 'buscar professor substituto'))
          }

          $scope.verificarSubstituto();
        }
      ]
    })
  }

  function handleError(error, operation = 'operation') {
    console.error(`Ocorreu um erro ao ${operation}`, error);
    $alertSvc.showAlert(`Ocorreu um erro ao ${operation}!`)
  }

  init();
  // self.init()
}
