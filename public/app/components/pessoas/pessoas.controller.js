// Componente que cria, remove e atualiza pessoas. Adiciona pessoas ao grupo de 
// professores e coordenadores.

angular
  .module("class-scheduler")
  .controller("userCtrl", userCtrl)

function userCtrl($scope, $mdDialog, $authSvc, $rootScope, $profSvc, $pessoaSvc, $coordSvc,
  $mdClassSchedulerToast, $filter, $alertSvc) {

  var self = this;

  function Employee() {
    this.update = function (personUpdated, arrayEmployee) {
      const id = personUpdated.id
      for (let i = 0; i < arrayEmployee.length; i++) {
        const personEmployee = arrayEmployee[i].pessoa

        if (personEmployee.id === id) {
          arrayEmployee[i].pessoa = personUpdated
          break;
        }
      }
    }

    this.indexOf = function (personId, arrayEmployee) {
      for (let index = 0; index < arrayEmployee.length; index++) {
        const personEmployee = arrayEmployee[index].pessoa

        if (personEmployee.id === personId) {
          return index
        }
      }

      return -1;
    }

    this.indexOfId = function (id, list) {
      for (let index = 0; index < list.length; index++) {
        const obj = list[index]
        if (obj.id === id) {
          return index
        }
      }

      return -1;
    }

    this.remove = function (personRemovedId, arrayEmployee) {
      for (let index = 0; index < arrayEmployee.length; index++) {
        const personEmployee = arrayEmployee[index].pessoa

        if (personEmployee.id === personRemovedId) {
          arrayEmployee.splice(index, 1)
          break;
        }
      }
    }

    this.gotEmployees = function (query, employeeArray) {
      query.docChanges().forEach(change => {
        const employee = change.doc.data()
        employee.id = change.doc.id

        if (change.type === 'added') {
          this._getPessoa(employee)
          employeeArray.push(employee)
        }
        else if (change.type === 'removed') {
          const index = this.indexOfId(employee.id, employeeArray)
          employeeArray.splice(index, 1)
        }
      })
    }

    this._getPessoa = function(employee) {
      employee.refPessoa.get()
        .then(snapPessoa => {
          $scope.$apply(function () {
            let pessoa
            if (snapPessoa.exists) {
              pessoa = snapPessoa.data()
              pessoa.id = snapPessoa.id
              pessoa.fullName = pessoa.nome + ' ' + pessoa.sobrenome
            } else {
              pessoa = {
                nome: 'Indefinido',
                fullName: 'Essa pessoa foi excluída'
              }
            }
            employee.pessoa = pessoa
          })
        })
        .catch(e => console.error("Erro ao obter pessoa do empregado: ", e))
    }
  }

  self.init = function () {
    self.initFirebase()
    self.sendToolbarToMainCtrl();
    // self.verifyDarkTheme();
    self.employeeManager = new Employee()
    console.log('employeeManager:', self.employeeManager);
  }

  self.initFirebase = function() {
    self.db = firebase.firestore();
    self.auth = firebase.auth();
    self.auth.onAuthStateChanged(self.onAuthStateChanged.bind(this));
  }

  self.onAuthStateChanged = function(user) {
    if (user) {
      self.getUser(user.email);
    } else {
      $location.path('/login');
    }
  }

  self.getUser = function(email) {
    $pessoaSvc.getPessoaByEmail(email)
      .then(query => {
        const snapUser = query.docs[0];
        self.loggedUser = snapUser.data();
        self.loggedUser.id = snapUser.id;
        self.verifyTheme(self.loggedUser);
      })
      .catch(error => self.returnError(error, 'buscar usuário'))
  }

  self.verifyTheme = function(user) {
    if (user.theme === 'system') {
      self.addThemeListener();
    } 
    else if (user.theme === 'dark') {
      self.setDarkTheme(true);
    }
    else {
      self.setDarkTheme(false);
    }
  }

  self.addThemeListener = function() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    self.setDarkTheme(mediaQuery.matches)

    mediaQuery.addListener(event => {
      $scope.$apply(self.setDarkTheme(event.matches))
    })
  }

  self.setDarkTheme = function(isDarkMode) {
    self.themeSelected = isDarkMode ? 'dark' : 'default'
    self.bodyClass = isDarkMode ? 'body-dark' : 'body-light'
  }

  self.sendToolbarToMainCtrl = function () {
    $rootScope.$broadcast('tituloPagina', {
        titulo: "Pessoas"
    });
  }

  self.openMenu = function ($mdMenu, ev) {
    self.originatorEv = ev;
    $mdMenu.open(ev);
  }

  self.getPessoas = function() {
    self.buscandoPessoas = true;
    self.first = true;
    self.pessoas = []
    self.db.collection("pessoas")
    .onSnapshot(query => {
      self.gotPessoas(query)
      // self.pessoas = [];

      // query.forEach(doc => {
      //   const pessoa = doc.data();
      //   pessoa.id = doc["id"];
      //   self.pessoas.push(pessoa);
      // });

      self.buscandoPessoas = false;
    }, error => {
      $alertSvc.showAlert('Ocorreu um erro ao obter as pessoas!')
      console.error('Ocorreu um erro ao obter as pessoas:', error)
    })
  }

  self.gotPessoas = function (query) {
    query.docChanges().forEach(change => {

      const person = change.doc.data()
      person.id = change.doc.id
      person.fullName = person.nome + ' ' + person.sobrenome

      if (change.type === 'added') {
        self.pessoas.push(person)
      }
      else if (change.type === "modified") {
        const index = self.indexOfId(change.doc.id, self.pessoas)
        self.pessoas[index] = person
        // self.updateEmployee(person, self.professores)
        // self.updateEmployee(person, self.coordenadores)
        self.employeeManager.update(person, self.professores)
        self.employeeManager.update(person, self.coordenadores)
        $mdClassSchedulerToast.show(`Dados de ${person.nome} atualizados`)
      }
      else if (change.type === "removed") {
        const index = self.indexOfId(person.id, self.pessoas)
        self.pessoas.splice(index, 1)
        $mdClassSchedulerToast.show(`${person.nome} foi removido`)
        self.employeeManager.remove(person.id, self.professores)
        self.employeeManager.remove(person.id, self.coordenadores)
      }
    })

    console.log('pessoas:', self.pessoas);
  }

  self.indexOfId = function (id, list) {
    for (let index = 0; index < list.length; index++) {
      const element = list[index]

      if (element.id === id) {
        return index
      }
    }

    return -1
  }

  self.getProfessores = function() {
    self.professores = []
    self.db.collection("professores").onSnapshot(query => {
        self.employeeManager.gotEmployees(query, self.professores)
    }, e => self.retornarErro(e))
  }

  self.getCoordenadores = function() {
    self.coordenadores = [];
    self.db.collection("coordenadores").onSnapshot(query => {
        self.employeeManager.gotEmployees(query, self.coordenadores)
    }, e => self.retornarErro(e))
  }

  self.isLoading = function (list) {
    return list.length < 1
  }

  self.adicionarPessoa = function(ev) {
    $mdDialog.show({
      templateUrl: 'app/components/pessoas/add-pessoa.tmpl.html',
      parent: angular.element(document.body),
      clickOutsideToClose:true,
      fullscreen: true,
      locals: { theme: self.themeSelected },
      controller: ['$scope', 'theme', function($scope, theme) {

        $scope.theme = theme;

        $scope.user = {}

        $scope.hide = function() {
          $scope.user.theme = 'system';
          $scope.user.papeis = [];
          if ($scope.isAdmin) {
            $scope.user.papeis.push('administrador');
          }
          if ($scope.isProf) {
            $scope.user.papeis.push('professor');
          }
          if ($scope.isCoord) {
            $scope.user.papeis.push('coordenador');
          }
          
          $mdDialog.hide({
            user: $scope.user,
            isProf: $scope.isProf,
            isCoord: $scope.isCoord
          });
        }

        $scope.cancel = function() {
          $mdDialog.cancel();
        }
      }]
    })
    .then(function(dados) {
      $pessoaSvc.addPessoa(dados.user).then(refDoc => {
        // if (dados.isProf) {
        //   $profSvc.addProfessor(refDoc.id).catch(e => self.retornarErro(e));
        // }
        // if (dados.isCoord) {
        //   $coordSvc.addCoordenador(refDoc.id).catch(e => self.retornarErro(e));
        // }
        console.log(`Usuário adicionado: ${refDoc.path}`);
        const msg = `${dados.user.nome} foi adicionado`
        $mdClassSchedulerToast.show(msg)
      }).catch(e => self.retornarErro(e));
    }, function() {
      console.info('You cancelled the dialog.');
    });
  }

  self.editPerson = function(pessoa) {
    $mdDialog.show({
      templateUrl: 'app/components/pessoas/edit-pessoa.tmpl.html',
      clickOutsideToClose: true,
      parent: angular.element(document.body),
      fullscreen: true,
      targetEvent: self.originatorEv,
      locals: {
        pessoa: pessoa
      },
      controller: ['$scope', 'pessoa', function($scope, pessoa) {

        $scope.pessoa = {
          nome: pessoa.nome,
          sobrenome: pessoa.sobrenome,
          email: pessoa.email,
          isAdmin: pessoa.isAdmin,
          photoUrl: pessoa.photoUrl
        }

        $scope.cancel = function() {
          $mdDialog.cancel();
        }

        $scope.hide = function() {
          $mdDialog.hide({
            id: pessoa.id,
            pessoa: $scope.pessoa
          })
        }

      }]
    }).then(data => {
      const user = data.pessoa

      $pessoaSvc.atualizarPessoa(data.id, user)
      .then(function () {
        // $mdClassSchedulerToast.show("Dados de " + user.nome + " atualizados")
      })
      .catch(e => console.error("Erro ao atualizar pessoa: ", e))
    }, function() {
      console.log("Dialog cancelado");
    });
  }

  self.deletePessoa = function (p) {
    $mdDialog.show({
      templateUrl: 'app/components/pessoas/delete-pessoa.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      clickOutsideToClose: true,
      locals: {
        pessoa: p
      },
      controller: ['$scope', 'pessoa', function($scope, pessoa) {
        $scope.pessoa = pessoa;

        $scope.cancel = function() {
          $mdDialog.cancel();
        }

        $scope.excluir = function() {
          $mdDialog.hide($scope.pessoa);
        }
      }]
    }).then(user => {
      $pessoaSvc.deletePessoa(user.id).then(function () {
        // $mdClassSchedulerToast.show(`${user.nome} foi excluído(a)`);
      })
      .catch(e => console.error("Erro ao excluir pessoa:", e));
    }, function () {

    })

    self.originatorEv = null;
  }

  self.tornarCoord = function (person) {
    if (self.existsInArray(person.id, self.coordenadores)) {
      const title = `${person.nome} ${person.sobrenome} já é coordenador(a)`
      const ariaLabel = "A pessoa já é coordenador"
      self.alert(title, ariaLabel)
    } else {
      $coordSvc.addCoordenador(person.id)
      .then(function () {
        let msg = `${person.nome} foi adicionado(a) aos coordenadores`
        $mdClassSchedulerToast.show(msg)
      })
      .catch(e => console.error("Ocorreu um erro ao tornar coordenador: ", e))
    }
  }

  self.excluirCoord = function (coord) {
    $mdDialog.show({
      templateUrl: 'app/components/pessoas/excluir-coord.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      clickOutsideToClose: false,
      fullscreen: false,
      locals: {
        coord: coord
      },
      controller: ['$scope', 'coord', function($scope, coord) {
        $scope.coord = coord;

        $scope.cancel = function() {
          $mdDialog.cancel();
        }

        $scope.excluir = function() {
          $mdDialog.hide($scope.coord.id);
        }
      }]
    }).then(userId => {
     $coordSvc.deleteCoordenador(userId).then(function() {
        $mdClassSchedulerToast.show("Pessoa removida dos coordenadores");
     })
     .catch(e => console.error("Ocorreu um erro ao excluir o coordenador: ", e));
    }, function () {
      console.log("Exclusão cancelada.");
    })
    self.originatorEv = null;
  }

  self.tornarProf = function (person) {
    if (self.existsInArray(person.id, self.professores)) {
      const title = `${person.nome} ${person.sobrenome} já é professor(a)`
      const ariaLabel = "A pessoa já é professor"
      self.alert(title, ariaLabel)
      return
    } else {
      $profSvc.addProfessor(person.id)
      .then(function () {
        let msg = person.nome + " foi adicionado(a) aos professores"
        $mdClassSchedulerToast.show(msg)
      })
      .catch(e => console.error("Ocorreu um erro ao tornar professor: ", e))
    }
  }

  self.alert = function (title, ariaLabel) {
    $mdDialog.show(
      $mdDialog.alert()
        .parent(angular.element(document.querySelector('#popupContainer')))
        .clickOutsideToClose(true)
        .title(title)
        .ariaLabel(ariaLabel)
        .ok("Fechar")
        .theme(self.themeSelected)
        .targetEvent(self.originatorEv)
    )
    self.originatorEv = null
  }

  self.existsInArray = function (personId, array) {
    for (const person of array) {
      if (person.pessoa.id === personId) {
        return true
      }
    }
    return false
  }

  self.adicionarProf = function(ev) {
    $mdDialog.show({
      templateUrl: 'app/components/pessoas/add-prof.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true,
      locals: {
        pessoas: self.pessoas
      },
      controller: ['$scope', 'pessoas', function($scope, pessoas) {

        $scope.pessoas = pessoas;
        $scope.professores = [];

        $scope.addToProfs = function (pessoa) {
          $scope.professores.push(pessoa);
          $scope.searchText = "";
        }

        $scope.querySearch = function(q) {
          const pessoas = $filter('filter')($scope.pessoas, q);
          for (let p of pessoas) {
            p.displayName = p.nome + " " + p.sobrenome;
          }
          return pessoas
        }

        $scope.hide = function() {

        }

        $scope.cancel = function() {
          $mdDialog.cancel();
        }
      }]
    })
    .then(function(dados) {

    }, function() {
      console.info('You cancelled the dialog.');
    });
  }

  self.excluirProf = function (prof) {
    $mdDialog.show({
      templateUrl: 'app/components/pessoas/excluir-prof.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: self.originatorEv,
      clickOutsideToClose: false,
      fullscreen: false,
      locals: {
        prof: prof
      },
      controller: ['$scope', 'prof', function($scope, prof) {
        $scope.prof = prof;

        $scope.cancel = function() {
          $mdDialog.cancel();
        }

        $scope.excluir = function() {
          $mdDialog.hide($scope.prof.id);
        }
      }]
    }).then(userId => {
      $profSvc.excluirProf(userId).then(function () {
        $mdClassSchedulerToast.show("Pessoa removida dos professores");
      })
      .catch(e => console.error("Ocorreu um erro ao excluir o professor: ", e));
    }, function () {
      console.log("Exclusão cancelada.");
    })
    self.originatorEv = null;
  }

  self.retornarErro = function (error) {
    console.error("Ocorreu um erro:", error);
  }

  self.init();
}
