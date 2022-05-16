angular
  .module('class-scheduler')
  .service('authSvc', authSvc);

function authSvc($location, $alertSvc, $pessoaSvc) {
  var self = this;
  
  self.user;
  self.observadores = [];
  self.observarUsuario = observar; 
  self.getUsuario = getUsuario;
  self.estaLogado = estaLogado;

  self.initFirebase = function () {
    self.db = firebase.firestore();
    self.auth = firebase.auth();
    self.auth.onAuthStateChanged(self.onAuthStateChanged2.bind(this));
  }

  self.onAuthStateChanged2 = function(user) {
    if(!user) {
        self.userGoogle = null;
        self.user = null;
        notify(null);
        $location.path('/login');
        return;
    }
    self.userGoogle = user;
    self.db.doc("pessoas/" + user.email)
        .onSnapshot(snapUser => {
            if(!snapUser.exists) {
                notify(null);
                return;
            }
            const usuario = snapUser.data();
            usuario.id = snapUser.id;
            self.user = usuario;
            notify(usuario);
        }, error => {
            console.error("Erro: ", error);
        })
  }

  function notify(user) {
    for (let indice = 0; indice < self.observadores.length; indice++) {
        self.observadores[indice](user);
    }
  }
 
  function observar(observador) {
    self.observadores.push(observador);
  }

  function getUsuario() {
    return self.user || null;
  }

  function estaLogado() {
    return self.userGoogle != null && self.userGoogle != undefined;
  }

  self.onAuthStateChanged = async function(userLogin) {
    try {
        if (!userLogin) {
            console.log("Deveria redirecionar para login");
            this.user = null;
            //localStorage.removeItem("user")
            $location.path('/login');
        } else {
            //this.user = self.getLocalUser();
            this.user = null;
            if (this.user === null || this.user.email !== userLogin.email) {
                this.user = await self._getUserDeFirebase(userLogin.email)
                //self.saveLocalUser(this.user);
            }
            //this._verificarTema(this.user);
            $themeSvc.verificarTema.bind(this)(this.user);
            this._gotUser(this.user);
        }
    } catch (error) {
        self.returnError(error, 'verificar autenticação')
    }
  }

  self.getUsuarioAtual = function() {
    return self.auth.currentUser;
  }

  self._getUserDeFirebase = function(email) {
    return new Promise((resolve, reject) => {
        console.log('contexto de get from firebase:', this);
        $pessoaSvc.getPessoaByEmail(email)
        .then(query => self._gotUserDeFirebase(query, resolve))
        .catch(error => reject(error));
    });
  }

  function AuthorizationException(message) {
    this.message = message;
    this.name = "AuthorizationException";
  }

  self._gotUserDeFirebase = function(query, resolve) {
    if (query.empty) {
        // self.retornarErro(null, 'Usuário não cadastrado')
        throw new AuthorizationException("Usuário não cadastrado");
        // return;
    }

    const snapPessoa = query.docs[0];
    const pessoa = snapPessoa.data();
    pessoa.id = snapPessoa.id;
    resolve(pessoa);
  }

  self.loginWithRedirect = function () {
    var provider = new firebase.auth.GoogleAuthProvider();
    self.auth.signInWithRedirect(provider);
    return self.auth.getRedirectResult();
  }

  self.loginWithPopup = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return self.auth.signInWithPopup(provider);
  }

  // Remove o usuário do local storage e faz logoff
  self.sair = function () {
    localStorage.removeItem("user");
    return self.auth.signOut();
  }

  // Salva o usuário no local storage
  self.saveLocalUser = function(user) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  // Retorna o usuário do local storage
  self.getLocalUser = function() {
    let userString = localStorage.getItem("user");
    if (userString == "undefined")
        userString = null;
    return JSON.parse(userString);
  }

  self.getUser2 = function() {
    var user = self.auth.currentUser;
    return self.db.collection("professores").where("email", "==", user.email).get();
  }

  self.isAuthed = function() {
    let user = self.auth.currentUser;
    return user ? true : false;
  }

  self.returnError = function(error, operation="") {
    $alertSvc.showAlert(`Ocorreu um erro ao ${operation}`);
    console.error(`Ocorreu um erro ao ${operation}:`, error);
  }

  self.initFirebase();
}
