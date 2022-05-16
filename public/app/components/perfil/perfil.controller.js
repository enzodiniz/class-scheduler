// Componente pro usuário modificar suas informações pessoais

angular
  .module("class-scheduler")
  .controller("perfilCtrl", perfilCtrl)

  function perfilCtrl ($mdClassSchedulerToast, $rootScope, authSvc, $pessoaSvc,
  $location, $scope, temaSvc) {

    var self = this;

    function init() {
      updateMenuBar()
      self.loading = true;
      gotUsuario(authSvc.getUsuario());
      authSvc.observarUsuario((usuario) => {
        $scope.$apply(() => {
          gotUsuario(usuario);
        });
      });
      self.themeSelected = temaSvc.getTema();
      temaSvc.observarTema(gotTema);
    }

    function gotTema(tema) {
        $scope.$apply(() => {
            self.themeSelected = tema;
        });
    }

    function gotUsuario(usuario) {
        self.user = usuario;
        if(self.user == null) return;
        self.newUser = {
            nome: self.user.nome,
            sobrenome: self.user.sobrenome,
            photoUrl: self.user.photoUrl,
            email: self.user.email,
            theme: self.user.theme
        }
        self.loading = false;
    }

    function updateMenuBar() {
      $rootScope.$broadcast("tituloPagina", {
        titulo: "Meu Perfil"
      })
    }

    self.salvar = function () {
      $pessoaSvc.atualizarPessoa(self.user.id, self.newUser)
      .then(function() {
        $mdClassSchedulerToast.show(`Dados de ${self.user.nome} foram salvos!`)
      })
      .catch(e => console.error("Ocorreu um erro ao salvar dados da pessoa: ", e))
    }

    self.isModified = function() {
      return (self.newUser.nome !== self.user.nome || 
        self.newUser.sobrenome !== self.user.sobrenome ||
        self.newUser.email !== self.user.email ||
        self.newUser.photoUrl !== self.user.photoUrl ||
        self.newUser.theme !== self.user.theme)
    }

    function retornarErro(error, operacao='') {
        console.error(`Ocorreu um erro ao ${operacao}: `, error);
        $alertSvc.showAlert(`Erro ao ${operacao}`);
    }

    init();
  }
