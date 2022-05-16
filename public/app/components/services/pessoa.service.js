angular
  .module('class-scheduler')
  .service('$pessoaSvc', pessoaSvc)

function pessoaSvc() {
  var self = this;

  self.pessoasObservadas = [];
  self.addPessoaObservada = addPessoaObservada;
  self.getPessoaLogada = getPessoaLogada;

  function addPessoaObservada(email) {
    self.db.collection.doc("pessoas/" + email).onsnapshot();
  }

  function getPessoaLogada() {
    const email = $authSvc.getUsuarioAtual().email;
    return new Promise(async (resolve, reject) => {
        try {
            if (self.pessoaLogada) resolve(self.pessoaLogada);
            const query = self.db.doc("pessoas/" + email).get();
            if (query.empty) {
                resolve(null);
                self.pessoaLogada = null;
            }
            const user = query[0].data();
            user.id = query[0].id;
            self.pessoaLogada = user;
            resolve(self.pessoaLogada);
        } catch (error) {
            reject(error);
        }
    });
  }

  self.initFirebase = function() {
    self.db = firebase.firestore();
    self.refColecao = self.db.collection("pessoas");
  }

  self.deletePessoa = function(id) {
    return self.refColecao.doc(id).delete();
  }

  self.atualizarPessoa = function(id, newData) {
    return self.refColecao.doc(id).set(newData, { merge: true });
  }

  self.addPessoa = function(pessoa) {
    // return self.refColecao.add(pessoa);
    return self.refColecao.doc(pessoa.email).set(pessoa);
  }

  self.getPessoas = function() {
    return self.refColecao.get();
  }

  self.getPessoaByEmail = function (email) {
    return self.refColecao.where("email", "==", email).get();
  }

  self.setPhotoUrl = function(pessoaId, photoUrl) {
    return self.refColecao.doc(pessoaId).set({ photoUrl: photoUrl }, { merge: true });
  }

  self.initFirebase();
}
