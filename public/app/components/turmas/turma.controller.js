// Gerenciar as turmas da aplicação

angular
  .module("class-scheduler")
  .controller("turmaCtrl", turmaCtrl)

function turmaCtrl ($scope, $mdDialog, $mdClassSchedulerToast, $rootScope,
  $turmaSvc, authSvc, $periodoSvc, $cursoSvc, $alertSvc, temaSvc, $location) {

  const self = this;

  self.initFirebase = function () {
    self.db = firebase.firestore();
    // self.auth = firebase.auth();
    // self.auth.onAuthStateChanged($authSvc.onAuthStateChanged.bind(this));
    self.sendToolbarToMainCtrl();
    gotUser(authSvc.getUsuario());
    authSvc.observarUsuario(usuario => { 
        $scope.$apply(() => {
            gotUser(usuario);
        });
    });
    getTema();
  }

  function AuthorizationException(message) {
    this.message = message;
    this.name = "AuthorizationException";
  }

  function gotUser(user) {
      if(user == null) return;
      if (user.papeis.includes('administrador'))
          return;

      const error = new AuthorizationException('Usuário não autorizado');
      self.returnError(error, 'verificar permissão de administrador');
      $location.path('/home');
  }

  function getTema() {
    self.themeSelected = temaSvc.getTema();
    temaSvc.observarTema(tema => {
        self.themeSelected = tema;
    });
  }

  self.sendToolbarToMainCtrl = function() {
    $rootScope.$broadcast('tituloPagina', {
      titulo: 'Turmas'
    });
  }

  self.loadCursos = function () {
    return $cursoSvc.getCursos()
    .then(self._gotCursos)
    .catch(error => self.returnError(error, 'buscar cursos'))
  }

  self._gotCursos = function(query) {
    self.cursos = []
    query.forEach(snapCurso => {
        const curso = snapCurso.data()
        curso.id = snapCurso.id
        self.cursos.push(curso)
    });
  }

  self.loadPeriodos = function () {
    return $periodoSvc.getPeriodos()
    .then(self._gotPeriodos)
    .catch(e => self.returnError(error, 'buscar períodos'))
  }

  self._gotPeriodos = function(query) {
      const periodos = []
      query.forEach(snapPeriodo => {
        const periodo = snapPeriodo.data()
        periodo.id = snapPeriodo.id
        periodos.push(periodo);
      });
      self.periodos = $periodoSvc.sortPeriodos(periodos);
  }

  self.query = function () {
    self.loadingTurmas = true;
    self.turmas = {};
    if (self.cursoSelected == "todos") {
      self.queryWithPeriodo()
    } else if (self.cursoSelected){
      self.queryWithPeriodoAndCurso()
    }
  }

  self.queryWithPeriodoAndCurso = function() {
    const periodoRef = self.db.doc("periodos/" + self.periodoSelected.id)
    const cursoRef = self.db.doc("cursos/" + self.cursoSelected.id)

    self.db.collection("turmas")
    .where("periodo", "==", periodoRef)
    .where("curso", "==", cursoRef)
    .orderBy("serie")
    .onSnapshot(self.gotTurmas, self.returnError)

    self.db.collection("subturmas")
      .where("periodo", "==", periodoRef)
      .where("curso", "==", cursoRef)
      .onSnapshot(self.gotSubturmas, error => self.returnError(error, 'buscar subturmas'))
  }

  self.queryWithPeriodo = function () {
    const periodoRef = self.db.doc("periodos/" + self.periodoSelected.id)

    self.db.collection("turmas")
      .where("periodo", "==", periodoRef)
      .onSnapshot(self.gotTurmas, self.returnError)

      self.db.collection("subturmas")
        .where("periodo", "==", periodoRef)
        .onSnapshot(self.gotSubturmas, error => self.returnError(error, 'buscar subturmas'))
  }

  self.gotTurmas = function (query) {
    $scope.$apply(() => {
        query.docChanges().forEach(change => {
            const changeType = change.type;
            if (changeType === 'added') {
                const turma = change.doc.data();
                turma.id = change.doc.id;
                self._addTurmaToJSON(turma);
            }
            else if (changeType === 'removed') {
                delete self.turmas[change.doc.id];
            }
        });
        self.loadingTurmas = false
        console.log("turmas: ", self.turmas);
    });
  }

  self._addTurmaToJSON = function(turma) {
    self.verificarCurso(turma)
    if (!self.turmas[turma.id]) {
        self.turmas[turma.id] = {
            data: null
        }
    }
    self.turmas[turma.id]['data'] = turma;
  }

  self.gotSubturmas = function(query) {
    query.docChanges().forEach(change => {
        const changeType = change.type;
        const subturma = change.doc.data();
        subturma.id = change.doc.id;
        if (changeType === 'added') {
            self._addSubturmaToJSON(subturma);
        } 
        else if (changeType === 'removed') {
            if (!self.turmas[subturma.turmaPrincipalId])
                return;
            delete self.turmas[subturma.turmaPrincipalId]['subturmas'][subturma.id]
            self._verificarSubturmasJSON(subturma.turmaPrincipalId) 
        }
    });
  }

  self._verificarSubturmasJSON = function(turmaPrincipalId) {
     let numSubturmas = 0;
     for (subturmaId in self.turmas[turmaPrincipalId]['subturmas']) {
        numSubturmas++;
     }
     if (numSubturmas === 0) {
        delete self.turmas[turmaPrincipalId]['subturmas'];
     }
  }

  self._addSubturmaToJSON = function(subturma) {
      if (!self.turmas[subturma.turmaPrincipalId]) {
        self.turmas[subturma.turmaPrincipalId] = {
          'data': null,
          'subturmas': {}
        };
      }

      if (!self.turmas[subturma.turmaPrincipalId]['subturmas']) {
        self.turmas[subturma.turmaPrincipalId]['subturmas'] = {};
      }
      
      self.turmas[subturma.turmaPrincipalId]['subturmas'][subturma.id] = subturma;
  }

  // TODO: Falta terminar aqui
  // self.sortTurmas = function () {
  //   for (var i = 0; i < self.turmas.length - 1; i++) {
  //     const turmaAtual = self.turmas[i]
  //     const proximaTurma = self.turmas[i]
  //
  //     if (turmaAtual)
  //   }
  //
  // }

  self.verificarCurso = function (turma) {
    if (self.cursoSelected == "todos") {
      self.getCurso(turma)
    }
    else {
      turma.curso = self.cursoSelected
    }
  }

  self.getCurso = function (turma) {
    turma.curso.get()
    .then(snapCurso => {
      turma.curso = snapCurso.data()
    })
    .catch(e => self.returnError(e))
  }

  // Abre o menu de turma na visualização de lista
  self.openMenu = function ($mdMenu, ev) {
    self.originatorEv = ev;
    $mdMenu.open(ev);
  }

  self.showSalvarTurma = function (ev) {
    $mdDialog.show({
      templateUrl: 'app/components/turmas/new-turma.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      targetEvent: ev,
      fullscreen: false,
      locals: { theme: self.themeSelected },
      controller: ['$scope', '$cursoSvc', 'theme',
      function ($scope, $cursoSvc, theme) {
        $scope.themeSelected = theme;

        $scope.selecionarNovoCurso = function(titulo) {
          $cursoSvc.addCurso2(titulo)
          .then(cursoRef => $scope._novoCursoSelecionado(cursoRef, titulo))
          .catch(error => self.returnError(error, 'criar novo curso'))
          console.log(`Criando curso '${titulo}' e selecionando ele em cursoSelected`);
        }

        $scope._novoCursoSelecionado = function(cursoRef, titulo) {
            console.log('Curso adicionado: ', cursoRef.path);
            $scope.cursoSelected = {
              titulo: titulo
            }
        }

        $scope.selectCurso = function(text) {
          return $cursoSvc.getCursos()
            .then(query => $scope._gotCursos(query, text))
            .catch(error => self.returnError(error, 'buscar cursos'))
        }

        $scope._gotCursos = function(query, text) {
            const suggestions = []
            const textLowerCase = text.toLowerCase()
            query.forEach(snapCurso => {
              const curso = snapCurso.data()
              const display = curso.titulo.toLowerCase()
              if (display.indexOf(textLowerCase) > -1) {
                curso.id = snapCurso.id
                suggestions.push(curso)
              }
            })

            return suggestions
        }

        $scope.loadPeriodos = function() {
          return $periodoSvc.getPeriodos()
            .then($scope._gotPeriodos)
            .catch(e => self.returnError(e));
        }

        $scope._gotPeriodos = function(query) {
            $scope.periodos = [];
            query.forEach(snapPeriodo => {
              const periodo = snapPeriodo.data();
              periodo.id = snapPeriodo.id;
              $scope.periodos.push(periodo);
            });
            $scope.periodos = $periodoSvc.sortPeriodos($scope.periodos)
        }

        $scope.cancel = function () {
          $mdDialog.cancel();
        }

        $scope.hide = function () {
          $scope.turma.curso = self.db.doc("cursos/" + $scope.cursoSelected.id)
          $scope.turma.periodo = self.db.doc("periodos/" + $scope.turma.periodo)
          const response = {
            turma: $scope.turma,
            possuiG2: $scope.possuiG2
          }
          $mdDialog.hide(response);
        }
      }]
    }).then(self.responseDialogSalvarTurma,
    () => {})
  }

  self.responseDialogSalvarTurma = async function (response) {
    console.log('possui g2: ', response.possuiG2);
    console.log(`saving ${response.turma}`);

    try {
      const turmaRef = await self.db.collection('turmas').add(response.turma);
      if (response.possuiG2) {
        const turma = response.turma;
        turma.id = turmaRef.id
        self._criarSubturmas(turma);
      }
      $mdClassSchedulerToast.show('Uma nova turma foi adicionada');

    } catch (error) {
      self.returnError(error, 'adicionar turma')
    }
  }

  self.confirmExcluirTurma = function (turma) {
    $mdDialog.show({
      templateUrl: 'app/components/turmas/delete-turma.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      locals: {
        turma: turma,
        theme: self.themeSelected
      },
      controller: ['$scope', 'turma', 'theme', function($scope, t, theme) {
        $scope.turma = t;
        $scope.themeSelected = theme;

        $scope.cancel = function() {
          $mdDialog.cancel();
        }

        $scope.hide = function() {
          $mdDialog.hide($scope.turma)
        }
      }]
    }).then(self.excluirTurma, () => {})

    self.originatorEv = null;
  }

  self.excluirTurma = async function(turma) {
    try {
      const promises = [];

      console.log('removendo ' + turma.data.id + '...');
      promises.push($turmaSvc.removerTurma(turma.data.id));

      if (turma['subturmas']) {
        console.log('iterando em subturmas...');

        for (let subturmaId in turma['subturmas']) {
          console.log(subturmaId);
          promises.push($turmaSvc.removerSubturma(subturmaId));
        }
      }

      await Promise.all(promises);
      $mdClassSchedulerToast.show('Turma removida');  
    } catch (error) {
      self.returnError(error, 'remover turma');
    }
  }

  self.confirmCriarSubturmas = function(turma) {
    const mdConfirm = $mdDialog.confirm()
            .textContent('Criar subturmas G1 e G2?')
            .ariaLabel('Criar subturmas?')
            .ok('Criar')
            .cancel('Cancelar')
            .theme(self.themeSelected)

    $mdDialog.show(mdConfirm).then(() => self._criarSubturmas(turma.data), () => {})
  }

  self._criarSubturmas = function(turma) {
    console.log('turma:', turma);
    const promessas = [];
    const subturma = {
        serie: turma.serie,
        curso: self.db.doc('cursos/' + turma.curso.id),
        periodo: self.db.doc('periodos/' + turma.periodo.id),
        turmaPrincipalId: turma.id
    };
    subturma.turmaPrincipalId = turma.id;
    subturma.titulo = "G1";
    promessas.push($turmaSvc.salvarSubturma(subturma));
    subturma.titulo = "G2";
    promessas.push($turmaSvc.salvarSubturma(subturma));
    
    Promise.all(promessas)
        .then(() => $mdClassSchedulerToast.show('Subturmas criadas'))
        .catch(error => self.returnError(error, 'criar subturmas'));
  }

  self.confirmRemoverSubturmas = function(turma) {
    $mdDialog.show({
      templateUrl: 'app/components/turmas/delete-subturmas.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      locals: { turma: turma, theme: self.themeSelected },
      controller: ['$scope', 'turma', 'theme',
        function($scope, turma, theme) {
          $scope.turma = turma;
          $scope.themeSelected = theme;

          $scope.cancel = function() {
            $mdDialog.cancel();
          }
  
          $scope.hide = function() {
            $mdDialog.hide($scope.turma)
          }
        }
      ]
    }).then(self.removerSubturmas, function() {})
  }

  self.removerSubturmas = function(turma) {
    const promessas = [];
    for (const subturmaId in turma.subturmas) {
        promessas.push($turmaSvc.removerSubturma(subturmaId));
    }
    Promise.all(promessas)
        .then(() => $mdClassSchedulerToast.show('Subturmas removidas'))
        .catch(error => self.returnError(error, 'remover subturmas'))
  }

  self.returnError = function (error, operation='') {
    $alertSvc.showAlert(`Ocorreu um erro ao ${operation}`);
    console.error(`Ocorreu um erro ao ${operation}: `, error);
  }

  self.initFirebase();
}
