// Componente Minhas aulas(horário do professor)
// Cria a remove substituições
angular
  .module('class-scheduler')
  .controller('minhasAulasCtrl', minhasAulasCtrl)

function minhasAulasCtrl($scope, $mdDialog, authSvc, $rootScope, $pessoaSvc, $profSvc,
  $subSvc, $horarioSvc, $periodoSvc, $historicoSvc, $mdClassSchedulerToast,
  $alertSvc, $location, temaSvc) {

  const self = this;

  self.horarios = ["07:00", "07:50", "08:40", "09:50", "10:40", "11:30", "13:00",
    "13:50", "14:40", "15:50", "16:40", "18:20", "19:10", "20:00", "20:50"];


  self.init = function () {
    self.initFirebase();
    self.sendToolbarToMainCtrl();
    self.dateSelected = new Date();
    getUsuario();
    getTema();
  }

  self.initFirebase = function () {
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
        if (user && user.papeis.includes('professor'))
            return;

        const error = new AuthorizationException('Usuário sem papel de professor');
        self.returnError(error, 'verificar papel de professor');
        $location.path('/home');
  }

  function getTema() {
    self.themeSelected = temaSvc.getTema();
    temaSvc.observarTema(tema => {
        self.themeSelected = tema;
    });
  }
  
  self.sendToolbarToMainCtrl = function () {
    $rootScope.$broadcast('tituloPagina', {
        titulo: "Minhas aulas"
    });
  }
  
  self.loadPeriodos = function() {
    self.listaPeriodos = []
    return $periodoSvc.loadPeriodos(self.listaPeriodos)
  }

  self.returnDay = function (date, day) {
    const dataDoDia = $subSvc.retornarDom(date)

    dataDoDia.setDate(dataDoDia.getDate() + day)
    return dataDoDia
  }

  self.isLoading = function() {
      return self.buscandoHorario || self.buscandoSubstituicoes;
  }

  self.submit = function () {
    const periodoId = self.periodoSelected.id
    const professorId = self.user.id
    if (self.ultimoPeriodoIdConsultado !== periodoId) {
        self.ultimoPeriodoIdConsultado = periodoId
        self.buscandoHorario = true;
        self.getHorarioProfessor(professorId, periodoId)
    }
    self.buscandoSubstituicoes = true;
    self.getSubstituicoesProfessor(professorId, periodoId)
  }

  self.getHorarioProfessor = function(professorId, periodoId) {
    $horarioSvc.getHorarioProfessor(professorId, periodoId)
      .then(horario => {
        $scope.$apply(function () {
          self.horario = horario
          console.log('self.horario:', self.horario);
          self.buscandoHorario = false;
        })
      })
      .catch(error => {
        $alertSvc.showAlert('Ocorreu um erro ao obter o horário do professor!')
        console.error('Ocorreu um erro ao obter o horário do professor: ', error);
      })
  }

  self.getSubstituicoesProfessor = function (professorId, periodoId) {
    console.log('obtendo substituicões...');
    const start = $subSvc.retornarDom(self.dateSelected).getTime()
    const end = $subSvc.retornarSab(self.dateSelected).getTime()
    console.log('start: ', start);
    console.log('end: ', end);
    self.db.collection('substituicoes')
      .where('aula.professorId', '==', professorId)
      .orderBy('data')
      .startAt(start)
      .endAt(end)
      .onSnapshot(self.gotSubstituicoes, self.errorInGetSubstituicoes)
  }

  self.gotSubstituicoes = function (query) {
    self.substituicoes = {
      1: new Array(15).fill({ status: 'normal' }),
      2: new Array(15).fill({ status: 'normal' }),
      3: new Array(15).fill({ status: 'normal' }),
      4: new Array(15).fill({ status: 'normal' }),
      5: new Array(15).fill({ status: 'normal' })
    }

    query.forEach(snapSubstituicao => {
      $scope.$apply(function () {
        const substituicao = snapSubstituicao.data()

        substituicao.id = snapSubstituicao.id
        $subSvc.setStatus(substituicao)
        console.log('substituicao:', substituicao);

        const date = new Date(substituicao.data)
        self.substituicoes[date.getDay()][substituicao.aula.indice] = substituicao
      })
    })
    console.log('substituicoes: ', self.substituicoes);
    self.buscandoSubstituicoes = false;
  }

  self.showDisponibilizarDiaInteiro = function (dia, event) {
    const prompt = $mdDialog.prompt()
      .title('Marcar falta em todas as aulas desse dia?')
      .placeholder('Motivo das faltas')
      .ariaLabel('Disponibilizar dia inteiro')
      .targetEvent(event)
      .required(true)
      .theme(self.themeSelected)
      .ok('Marcar faltas')
      .cancel('Cancelar')

    $mdDialog.show(prompt).then(motivo => {
      for (let indiceAula = 0; indiceAula < self.horario[dia].length; indiceAula++) {
        const substituicao = self.substituicoes[dia][indiceAula]

        if (substituicao.status === 'normal') {
          self._disponibilizarAula(dia, indiceAula, motivo)
        }
      }
    }, function () {

    })
  }

  self.showRemoverFaltaDiaInteiro = function (dia, event) {
    const  confirm = $mdDialog.confirm()
      .title('Remover marcação de falta em todas as aulas desse dia?')
      .ariaLabel('Remover marcação de falta do dia inteiro')
      .targetEvent(event)
      .theme(self.themeSelected)
      .ok('Remover')
      .cancel('Cancelar')

    $mdDialog.show(confirm).then(function () {
      for (let indiceAula = 0; indiceAula < self.horario[dia].length; indiceAula++) {
        const substituicao = self.substituicoes[dia][indiceAula]

        console.log('RemoverDiaInteiro -> substituição:', substituicao);

        if (substituicao.status === 'livre') {
          self.deleteSubstituicao(substituicao.id, dia, indiceAula)
        }
      }
    }, function () {

    })
  }

  self.action = function (dia, indiceAula, event) {
    const substituicao = self.substituicoes[dia][indiceAula]
    self.originatorEv = event

    if (substituicao.status === 'substituida') {
      self.showAulaSubstituida(dia, indiceAula)
    }
    else if (substituicao.status === 'livre') {
      self.showRemoverFalta(dia, indiceAula)
    }
    else if (substituicao.status === 'falta') {
      self.showFalta(dia, indiceAula)
    }
    else if (substituicao.status === 'normal') {
      self.showDisponibilizarAula(dia, indiceAula)
    }
  }

  self.showRemoverFalta = function(dia, indiceAula) {
    const substituicao = self.substituicoes[dia][indiceAula]
    console.log('substituição a ser removida: ', substituicao);

    const confirm = $mdDialog.confirm()
      .title('Remover marcação de falta?')
      .textContent(`Motivo: ${substituicao.motivo}`)
      .ariaLabel('Remover marcação de falta')
      .targetEvent(self.originatorEv)
      .theme(self.themeSelected)
      .ok('Remover')
      .cancel('Cancelar')

    $mdDialog.show(confirm)
      .then(() => {
        self.deleteSubstituicao(substituicao.id, dia, indiceAula)
      },
        function () {
          console.log('cancelada');
        }
      );
  }

  self.deleteSubstituicao = function (substituicaoId, dia, indiceAula) {
    const disciplina = self.horario[dia][indiceAula]

    $subSvc.deleteSubstituicao(substituicaoId)
      .then(() => {
        console.log('substituição removida /substituicoes/' + substituicaoId)

        self.addHistorico('LN',  null, dia, disciplina, indiceAula)
      })
      .catch(error => {
        $alertSvc.showAlert('Ocorreu um erro ao remover a marcação de falta!')
        console.error('Ocorreu um erro ao remover a substituição: ', error)
      })
  }

  self.showDisponibilizarAula = function(dia, indiceAula) {
    const prompt = $mdDialog.prompt()
      .title('Marcar falta nessa aula?')
      .placeholder('Motivo')
      .ariaLabel('Disponibilizar aula')
      .targetEvent(self.originatorEv)
      .required(true)
      .ok('Marcar falta')
      .theme(self.themeSelected)
      .cancel('Cancelar')

    $mdDialog.show(prompt).then(motivo => {
      self._disponibilizarAula(dia, indiceAula, motivo)
    }, function () {

    });
  }

  self._disponibilizarAula = function (dia, indiceAula, motivo) {
    const data = self.returnDay(self.dateSelected, dia)
    const disciplina = self.horario[dia][indiceAula]

    if (!disciplina) return;

    const props = {
      data: data,
      eFalta: false,
      disciplina: disciplina,
      indiceAula: indiceAula,
      motivo: motivo
    }

    $subSvc.addSubstituicao(props)
      .then(refSubstituicao => {
        console.log('substituicao adicionada: ', refSubstituicao.path)
        $mdClassSchedulerToast.show('Aula marcada com falta')

        const subsId = refSubstituicao.id
        self.addHistorico('NL', subsId, dia, disciplina, indiceAula)
      })
      .catch(error => {
        $alertSvc.showAlert('Ocorreu um erro ao marcar falta!')
        console.error('Ocorreu um erro ao adicionar substituição: ', error)
      })
  }

  self.addHistorico = function(acao, subsId, dia, disciplina, indiceAula) {
    const authorId = self.user.id
    const dataSubstituicao = self.returnDay(self.dateSelected, dia).getTime()

    $historicoSvc.addHistorico(acao, subsId, authorId, disciplina, dataSubstituicao, indiceAula)
      .then(refHistorico => {
        console.log('adicionado ao histórico: ', refHistorico.path)
      })
      .catch(error => {
        console.error('Erro ao adicionar ao histórico:', error);
      })
  }

  self.showAulaSubstituida = function(dia, indiceAula) {
    const substituicao = self.substituicoes[dia][indiceAula]
    console.log('substituição:', substituicao)

    function verificarProfessorSubstituto() {
      if (substituicao.substituto.professor) {
        showProfessorSubstituto()
      }
    }

    function showProfessorSubstituto() {
      const div = document.getElementById('substituto-aula')
      div.classList.add('show-substituto')
    }

    $mdDialog.show({
      // templateUrl: 'app/components/minhas-aulas2/aula-substituida.tmpl.html',
      templateUrl: 'app/components/minhas-aulas2/aula-substituida2.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      clickOutsideToClose: true,
      // onComplete: verificarProfessorSubstituto,
      locals: {
        substituicao: substituicao
      },
      controller: ['$scope', 'substituicao',
        function ($scope, substituicao) {

          $scope.substituicao = substituicao
          $scope.substituto = $scope.substituicao.substituto

          $scope.isLoading = function () {
            const professor = $scope.substituto.professor
            return !professor || !professor.pessoa;
          }

          $scope.verificarProfessorSubstituto = function (substituto) {
            if (!substituto.professor) {
              $scope.getProfessor(substituto)
              // $scope.getDisciplina(substituto)
            } else {
              // $scope.showDiv();
            }
          }

          $scope.getProfessor= function (substituto) {
            $profSvc.getProfessorById(substituto.professorId)
              .then(professor => {
                $scope.$apply(function () {
                  substituto.professor = professor
                  // $scope.showDiv()
                  // showProfessorSubstituto()
                })
              })
              .catch(error => {
                console.error('Ocorreu um ao obter professor substituto:', error);
              })
          }

          // $scope.showDiv = function () {
          //   const div = document.getElementById('substituto-aula')
          //   div.classList.add('show-substituto')
          // }

          $scope.hide = function () {
            console.log('hide -> motivoFalta:', $scope.motivoFalta);
            $mdDialog.hide($scope.motivoFalta)
          }

          $scope.cancel = function () {
            $mdDialog.cancel()
          }

          $scope.verificarProfessorSubstituto(substituicao.substituto)
        }
      ]
    })
      .then((motivo) => self.justificarFalta(substituicao.id, motivo),
      function () {

      })
  }

  self.showFalta = function (dia, indiceAula) {
    const substituicao = self.substituicoes[dia][indiceAula]

    $mdDialog.show({
      templateUrl: 'app/components/minhas-aulas2/falta.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      clickOutsideToClose: true,
      locals: {
        substituicao: substituicao
      },
      controller: ['$scope', 'substituicao',
        function ($scope, substituicao) {
          $scope.substituicao = substituicao

          $scope.hide = function () {
            $mdDialog.hide($scope.motivoFalta)
          }

          $scope.cancel = function () {
            $mdDialog.cancel()
          }
        }
      ]
    })
    .then((motivo) => {
      self.justificarFalta(substituicao.id, motivo)
    },
    function () {

    })
  }

  self.justificarFalta = function (substituicaoId, motivo) {
    console.log('motivo: ', motivo);
    $subSvc.justificar(substituicaoId, motivo)
      .then(function () {
        $mdClassSchedulerToast.show('Falta justificada')
        console.log('Falta justificada: /substituicoes/' + substituicaoId);
      })
      .catch(error => {
        $alertSvc.showAlert('Ocorreu um erro ao justificar a falta!')
        console.error('Ocorreu um erro ao justificar a falta: ', error);
      })
  }

  self.returnError = function(error, operation="") {
    $alertSvc.showAlert(`Ocorreu um erro ao ${operation}!`);
    console.error('Ocorreu um erro ao', operation);
  }

  self.init();
}
