angular
  .module("class-scheduler")
  .controller('authController', authCtrl)

function authCtrl ($scope, authSvc, $rootScope, $location, $pessoaSvc) {
  const self = this;

  self.loginComPopup = loginComPopup;
  self.onAuthStateChanged = () => {};
  self.retornarErro = retornarErro;

  function initFirebase() {
    self.auth = firebase.auth();
    // self.auth.onAuthStateChanged(self.onAuthStateChanged.bind(this));
    sendToolbarToMainCtrl();
  }

  function sendToolbarToMainCtrl() {
    $rootScope.$broadcast('tituloPagina', {
      titulo: "Login",
      btVisible: false
    });
  }

  function loginComPopup() {
    console.log('fazendo login...');
    authSvc.loginWithPopup().then(result => {
      console.log(result);
      const usuarioAuth = result.user;
      verificarUrlFoto(usuarioAuth);
      verificarUID(usuarioAuth);
      $location.path('/home');
    }).catch(e => self.retornarErro(e));
  }

  async function verificarUrlFoto(usuarioAuth) {
    try {
        const consulta = await $pessoaSvc.getPessoaByEmail(usuarioAuth.email);
        const pessoa = consulta.docs[0].data()  
        if (pessoa.photoUrl) return;
        const pessoaId = query.docs[0].id;
        $pessoaSvc.setPhotoUrl(pessoaId, usuarioAuth.providerData[0].photoURL);
    } catch(erro) {
        self.retornarErro(erro, 'verificar fotoUrl');
    }
  }

  async function verificarUID(usuarioAuth) {
    try {
        const emailPessoa = usuarioAuth.email;
        const pessoaDados = await $pessoaSvc.getPessoaByEmail(emailPessoa);
        if(pessoaDados.uid) return;
        $pessoaSvc.atualizarPessoa(emailPessoa, {
            uid: usuarioAuth.uid
        });
    } catch(erro) {
        self.retornarErro(erro, 'verificar UID');
    }
  }

  function retornarErro(erro, operacao='') {
    console.error(`Ocoreu um erro ao ${operacao}: `, erro);
  }

  initFirebase();
}
