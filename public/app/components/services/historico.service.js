angular.module('class-scheduler').service('$historicoSvc', historicoSvc);

function historicoSvc() {
  const self = this;

  self.initFirebase = function() {
    self.db = firebase.firestore();
    self.refColecao = self.db.collection("historico");
  }

  self.mudarAtributoData = function (historicoId) {
    const refHistorico = self.refColecao.doc(historicoId)
    return refHistorico.get()
    .then(snapHistorico => {
      const historico = snapHistorico.data()
      const data = historico.data

      console.log("historicoSvc -> data do histórico: ", data);
      console.log("historicoSvc -> Histórico: ", historico);

      // data.setHours(0)
      // data.setMinutes(0)
      // data.setSeconds(0)
      // data.setMilliseconds(0)

      return refHistorico.set({data: data.getTime()}, {merge: true})
    })
    .catch(e => console.error("Erro ao sanitizar data do histórico: ", e))
  }

  self.addHistorico2 = function ({ action, authorId, disciplina, substituicao, turmaRef}) {
    const novoHistorico = {
      action: action,
      authorId: authorId,
      data: firebase.firestore.FieldValue.serverTimestamp(),
      turmaRef: turmaRef,
      motivo: substituicao ? substituicao.motivo : '',
      disciplina: {
        _id: disciplina.id,
        professorId: disciplina.professorId
      },
      substituicao: {
        _id: substituicao ? substituicao.id : null,
        aulaIndice: substituicao ? substituicao.aula.indice : null,
        data: substituicao ? substituicao.data : null
      }
    };

    return self.refColecao.add(novoHistorico);
  }

  self.addHistorico = function (acao, subsId, autorId, disciplina, dataSubs, aulaSubs) {
    const historico = self.getJSONHistorico(acao, subsId, autorId, disciplina, disciplina.turmaRef, dataSubs, aulaSubs)
    console.log("historico: ", historico);

    return self.refColecao.add(historico)

    // const refAutor = self.db.doc("pessoas/" + autorId);
    // const refDisc = self.db.doc("disciplinas/" + aula.id);
    // const refProf = self.db.doc("professores/" + aula.professor.id);
    // const refTurma = self.db.doc("turmas/" + aula.turma.id);
    // let refSubs = null;
    // if (subsId)
    //   refSubs = self.db.doc("substituicoes/" + subsId);
    //
    // return self.refColecao.add({
    //   acao: acao,
    //   refSubstituicao: refSubs,
    //   refAutor: refAutor,
    //   refDisciplina: refDisc,
    //   refProfessor: refProf,
    //   data: firebase.firestore.FieldValue.serverTimestamp().getTime(),
    //   dataSubs: dataSubs,
    //   aulaSubs: aulaSubs,
    //   refTurmaSubs: refTurma
    // })
  }

  self.getJSONHistorico = function (acao, subsId, autorId, disciplina, turmaRef, dataSubs, aulaSubs) {
    // const refAutor = self.db.doc("pessoas/" + autorId);
    // const refDisc = self.db.doc("disciplinas/" + disciplina.id);
    // const refProf = self.db.doc("professores/" + disciplina.professorId);
    // const refTurma = self.db.doc("turmas/" + turmaId);
    // let refSubs = null;
    // if (subsId)
    //   refSubs = self.db.doc("substituicoes/" + subsId);

    return {
      action: acao,
      authorId: autorId,
      data: firebase.firestore.FieldValue.serverTimestamp(),
      turmaRef: turmaRef,
      disciplina: {
        _id: disciplina.id,
        professorId: disciplina.professorId
      },
      substituicao: {
        _id: subsId,
        aulaIndice: aulaSubs,
        data: dataSubs
      }
    }
  }

  self.getHistorico = function (start, end) {
    return self.refColecao
    .where("dataSubs", ">=", start)
    .where("dataSubs", "<=", end)
    .get()
  }

  self.getHistorico2 = function (start, end) {
    return self.refColecao
          .where("substituicao.data", ">=", start)
          .where("substituicao.data", "<=", end).get()
  }

  self.getFaltas = function(profId, start, end) {
    let refProf = self.db.doc("professores/" + profId);
    return self.refColecao
    .where("refProfessor", "==", refProf)
    .where("acao", "==", "NF")
    .where("dataSubs", ">=", start)
    .where("dataSubs", "<=", end)
    .get();
  }

  self.initFirebase();
}
