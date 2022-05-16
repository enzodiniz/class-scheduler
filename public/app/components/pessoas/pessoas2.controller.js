// Componente que cria, remove e atualiza pessoas. Adiciona pessoas ao grupo de 
// professores e coordenadores.

angular
  .module("class-scheduler")
  .controller("pessoasCtrl", userCtrl)

function userCtrl($scope, $mdDialog, authSvc, $rootScope, $profSvc, $pessoaSvc, $coordSvc,
  $mdClassSchedulerToast, $filter, $alertSvc, $location, temaSvc) {

  const self = this;
  
  self.init = function () {
    self.initFirebase()
    self.sendToolbarToMainCtrl();
    getUsuario();
    getTema() 
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

  function gotUsuario(usuario) {
    if (usuario && !usuario.papeis.includes('administrador')) {
        self.returnError(null, 'verificar permissão de administrador');
        $location.path('/home');
    }
  }

  function getTema() {
    self.themeSelected = temaSvc.getTema();
    temaSvc.observarTema(tema => {
        $scope.$apply(() => {
            self.themeSelected = tema;
        });
    });
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
    self.pessoas = [];
    self.coordenadores = [];
    self.professores = [];
    self.db.collection("pessoas")
        .onSnapshot(self.gotPessoas,
                    error => self.returnError(error, 'buscar pessoas:')
        )
  }

  self.gotPessoas = function (query) {
    $scope.$apply(() => {
        query.docChanges().forEach(change => {
            const person = change.doc.data()
            person.id = change.doc.id
            person.fullName = person.nome + ' ' + person.sobrenome;
            if (change.type === 'added')
                pessoaAdicionada(person);
            else if (change.type === "modified")
                pessoaModificada(person);
            else if (change.type === "removed") 
                pessoaRemovida(person); 
        });
        self.buscandoPessoas = false;
        console.log('pessoas:', self.pessoas);
    });
  }

  function pessoaAdicionada(pessoa) {
    self.pessoas.push(pessoa);
    if (pessoa.papeis.includes('coordenador'))
        self.coordenadores.push(pessoa);
    if (pessoa.papeis.includes('professor'))
        self.professores.push(pessoa)
    if (!self.buscandoPessoas)
        $mdClassSchedulerToast.show('Nova pessoa adicionada');
  }

  function pessoaModificada(pessoa) {
    const index = indexOfId(pessoa.id, self.pessoas)
    self.pessoas[index] = pessoa;
    self._verificarPapel(pessoa, 'coordenador', self.coordenadores);
    self._verificarPapel(pessoa, 'professor', self.professores);
   $mdClassSchedulerToast.show(`Dados de ${pessoa.nome} atualizados`)
  }

  self._verificarPapel = function(pessoa, papel, array) {
    const NUM_REMOVIDOS = 1;
    const possuiPapel = pessoa.papeis.includes(papel);
    const indice = indexOfId(pessoa.id, array);
    if (indice === -1 && possuiPapel)
        array.push(pessoa);
    else if (indice >= 0 && possuiPapel)
        array[indice] = pessoa;
    else if (indice >= 0 && !possuiPapel)
        array.splice(indice, NUM_REMOVIDOS);
  }

  function pessoaRemovida(pessoa) {
    const NUM_REMOVIDOS = 1;
    const indicePessoa = indexOfId(pessoa.id, self.pessoas);
    self.pessoas.splice(indicePessoa, NUM_REMOVIDOS);
    if (pessoa.papeis.includes('coordenador')) {
        const indiceCoordenador = indexOfId(pessoa.id, self.coordenadores)
        self.coordenadores.splice(indiceCoordenador, NUM_REMOVIDOS);
    }
    if (pessoa.papeis.includes('professor')) {
        const indiceProfessor = indexOfId(pessoa.id, self.professores)
        self.professores.splice(indiceProfessor, NUM_REMOVIDOS);
    }
    $mdClassSchedulerToast.show(`${pessoa.nome} foi removido`);
  }

  function indexOfId(id, list) {
    for (let index = 0; index < list.length; index++) {
      if (list[index].id === id) 
        return index
    }

    return -1;
  }

  self.mostrarAdicionarPessoa = function(ev) {
    $mdDialog.show({
      templateUrl: 'app/components/pessoas/add-pessoa.tmpl.html',
      parent: angular.element(document.body),
      clickOutsideToClose:true,
      fullscreen: true,
      locals: { theme: self.themeSelected },
      controller: ['$scope', 'theme', function($scope, theme) {

        $scope.theme = theme;
        $scope.user = {
            photoUrl: '',
            theme: 'system',
            papeis: []
        }

        $scope.hide = function() {
          if ($scope.isAdmin) {
            $scope.user.papeis.push('administrador');
          }
          if ($scope.isProf) {
            $scope.user.papeis.push('professor');
          }
          if ($scope.isCoord) {
            $scope.user.papeis.push('coordenador');
          }
          
          $mdDialog.hide($scope.user);
        }

        $scope.cancel = function() {
          $mdDialog.cancel();
        }
      }]
    })
    .then(adicionarPessoa, function() {
      console.info('You cancelled the dialog.');
    });
  }

  function adicionarPessoa(pessoa) {
    $pessoaSvc.addPessoa(pessoa)
    .then(() => {
        console.log(`Usuário adicionado: /pessoas/${pessoa.email}`);
        const msg = `${pessoa.nome} foi adicionado`;
        $mdClassSchedulerToast.show(msg)
    }).catch(error => self.returnError(error, 'adicionar pessoa'));
  }

  self.showEditPerson = function(pessoa) {
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
        console.log('pessoa a ser editada...');
        console.log(pessoa);
        $scope.pessoa = {
          nome: pessoa.nome,
          sobrenome: pessoa.sobrenome,
          email: pessoa.email,
          papeis: pessoa.papeis,
          photoUrl: pessoa.photoUrl || ''
        }

        $scope.cancel = function() {
          $mdDialog.cancel();
        }

        $scope.putPapel = function(papel, papeis) {
            const NUM_REMOVIDOS = 1;
            const indice = papeis.indexOf(papel);
            if (indice >= 0)
                papeis.splice(indice, NUM_REMOVIDOS);
            else
                papeis.push(papel);
        }

        $scope.estaSelecionado = function(papel, papeis) {
            return papeis.includes(papel);
        }

        $scope.hide = function() {
          $mdDialog.hide({
            id: pessoa.id,
            pessoa: $scope.pessoa
          })
        }

      }]
    }).then(atualizarPessoa, function() {
      console.log("Dialog cancelado");
    });
  }

  function atualizarPessoa(response) {
    $pessoaSvc.atualizarPessoa(response.id, response.pessoa)
    .then(function () {
        $mdClassSchedulerToast.show("Dados de " + response.pessoa.nome + " atualizados")
    })
    .catch(error => self.retornarErro(error, 'atualizar pessoa'));
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
        $mdClassSchedulerToast.show(`${user.nome} foi excluído(a)`);
      })
      .catch(e => console.error("Erro ao excluir pessoa:", e));
    }, function () {

    })

    self.originatorEv = null;
  }

  self.tornarCoordenador = function(pessoa) {
    if (pessoa.papeis.indexOf('coordenador') !== -1) {
        const mensagem = `${pessoa.nome} já é coordenador`;
        self.alert(mensagem, mensagem);
        return;
    }

    pessoa.papeis.push('coordenador');
    self.atualizarPessoa({
        id: pessoa.id,
        pessoa: {
            nome: pessoa.nome,
            sobrenome: pessoa.sobrenome,
            email: pessoa.email,
            photoUrl: pessoa.photoUrl || '',
            papeis: pessoa.papeis,
        }
    })
  }

  self.excluirCoordenador = function (pessoa) {
    const confirm = $mdDialog.confirm()
        .title('Remover papel de coordenador')
        .textContent(pessoa.nome + ' ' + pessoa.sobrenome) 
        .ok('Remover')
        .cancel('Cancelar')
        .theme(self.themeSelected)
        .targetEvent(self.originatorEv)

    $mdDialog.show(confirm)
        .then(() => self.removerPapelCoordenador(pessoa), () => {})
    self.originatorEv = null;
  }

  self.removerPapelCoordenador = function(pessoa) {
    const NUM_REMOVIDOS = 1;
    const index = pessoa.papeis.indexOf('coordenador')
    if (index === -1) return;
    pessoa.papeis.splice(index, NUM_REMOVIDOS);
    self.atualizarPessoa({
        id: pessoa.id,
        pessoa: {
            nome: pessoa.nome,
            sobrenome: pessoa.sobrenome,
            email: pessoa.email,
            photoUrl: pessoa.photoUrl,
            papeis: pessoa.papeis,
        }
    })
  }

  self.tornarProfessor = function (pessoa) {
    if (pessoa.papeis.indexOf('professor') !== -1) {
        const title = `${pessoa.nome} ${pessoa.sobrenome} já é professor(a)`
        self.alert(title, title);
        return;
    }
    pessoa.papeis.push('professor'); 
    self.atualizarPessoa({
        id: pessoa.id,
        pessoa: {
            nome: pessoa.nome,
            sobrenome: pessoa.sobrenome,
            email: pessoa.email,
            photoUrl: pessoa.photoUrl || '',
            papeis: pessoa.papeis,
        }
    })
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

  self.existsInArrayDisabled = function (personId, array) {
    for (const person of array) {
      if (person.pessoa.id === personId) {
        return true
      }
    }
    return false
  }
  
  self.excluirProfessor = function (pessoa) {
    $mdDialog.show(
        $mdDialog.confirm()
            .title('Remover papel de coordenador')
            .textContent(pessoa.nome + ' ' + pessoa.sobrenome) 
            .ok('Remover')
            .cancel('Cancelar')
            .theme(self.themeSelected)
            .targetEvent(self.originatorEv)
    ).then(() => self.removerPapelProfessor(pessoa), () => {})
    self.originatorEv = null;
  }

  self.removerPapelProfessor = function(pessoa) {
    const NUM_REMOVIDOS = 1;
    const index = pessoa.papeis.indexOf('professor');
    if (index === -1) return;
    pessoa.papeis.splice(index, NUM_REMOVIDOS);
    self.atualizarPessoa({
        id: pessoa.id,
        pessoa: {
            nome: pessoa.nome,
            sobrenome: pessoa.sobrenome,
            email: pessoa.email,
            photoUrl: pessoa.photoUrl,
            papeis: pessoa.papeis,
        }
    })
  }

  self.returnError = function (error, operation='') {
    const errorMessage = `Ocorreu um erro ao ${operation}`;
    console.error(errorMessage, ':', error);
    $alertSvc.showAlert(errorMessage);
  }

  self.init();
}
