angular
  .module('class-scheduler')
  .service('$subSvc', subService)

function subService() {
  const self = this;

  function init() {
    // Listeners de substituições.
    self.listeneres = []; 
    // Estado das substituições do listener atual.
    const numAulas = 15;
    self.substituicoes = {
        1: new Array(numAulas).fill(null),
        2: new Array(numAulas).fill(null),
        3: new Array(numAulas).fill(null),
        4: new Array(numAulas).fill(null),
        5: new Array(numAulas).fill(null)
    };
  }

  self.initFirebase = function() {
    self.db = firebase.firestore();
    self.refColecao = self.db.collection("substituicoes");
  }

  // self.definirSubst = function(subsId, refDisciplina) {
  //   const refSubstituicao = self.refColecao.doc(subsId);
  //   return refSubstituicao.set({ substituto: refDisciplina }, { merge: true });
  // }

  // self.definirSubstituto = function (substituicaoId, disciplinaId, professorId) {
  //   const refSubstituicao = self.refColecao.doc(substituicaoId)
  //
  //   return refSubstituicao.set({
  //     substitutoId: professorId,
  //     disciplinaSubstitutoId: disciplinaId
  //   }, {
  //     merge: true
  //   })
  // }

  self.definirSubstituto = function (substituicaoId, disciplinaId, professorId) {
    const refSubstituicao = self.refColecao.doc(substituicaoId);
    const substituto = {
      disciplinaId,
      professorId
    };

    return refSubstituicao.set({ substituto: substituto }, {
      merge: true
    })
  }

  self.justificar = function(id, motivo) {
    const subsRef = self.db.doc("substituicoes/" + id);
    return subsRef.set({ motivo: motivo }, { merge: true });
  }

  // self.addSubs = function(substituicao) {
  //   substituicao.data = self.sanitizeDate(substituicao.data)

  //   substituicao.data = substituicao.data.getTime()
  //   substituicao.substitutoId = null;
  //   substituicao.disciplinaSubstitutoId = null;

  //   return self.refColecao.add(substituicao);
  // }

  self.addSubstituicao = function ({data, eFalta, disciplina, indiceAula, motivo = ''}) {
    const dataEmMilisegundos = self.sanitizeDate(data)

    const substituicao = {
      data: dataEmMilisegundos.getTime(),
      eFalta: eFalta,
      aula: {
        indice: indiceAula,
        professorId: disciplina.professorId,
        disciplinaId: disciplina.id,
        periodoId: disciplina.periodoId,
      },
      substituto: {
        professorId: null,
        disciplinaId: null,
      },
      motivo: motivo,
      turmaRef: disciplina.turmaRef
    }

    console.log('Substituicao: ', substituicao);

    // let batch = self.db.batch()

    // let substituicaoRef =  self.refColecao.doc()
    // batch.set(substituicaoRef, substituicao)

    // if (disciplina.G1EG2) {
    //   substituicao.aula.disciplinaId = disciplina.otherId
    //   substituicao.turmaId = disciplina.otherTurmaId
    // }

    // let substituicao2Ref =  self.refColecao.doc()
    // batch.set(substituicao2Ref, substituicao)
    //
    // return batch.commit()

    return self.refColecao.add(substituicao)
  }

  self.adicionarFalta = function (turmaId, index, date) {
     // TODO: adicionar falta 
  }

  self.adicionarFalta2 = function (turmaId, index, date) {
    const substituicao = self.returnFaltaJSON(turmaId, index, date)

    return self.refColecao.add(substituicao)
  }

  // TODO: Olhar essa estrutura
  // return {
  //   data: date,
  //   eFalta: true,
  //   aula: {
  //     indice: index,
  //     professorId: "",
  //     disciplinaId: "",
  //     periodoId: ""
  //   },
  //   substituto: {
  //     professorId: null,
  //     disciplinaId: null,
  //   },
  //   motivo: "",
  //   turmaId: turmaId
  // }

  // Query do minhas aulas
  // self.db.collection("substituicoes")
  //  .where("aula.professorId", "==", self.loggedUser.professorId)


  // self.returnFaltaJSON = function (turmaId, index, date) {
  //   return {
  //     data: date,
  //     indiceAula: index,
  //     eFalta: true,
  //     substitutoId: null,
  //     disciplinaSubstitutoId: null,
  //     motivo: "",
  //     turmaId: turmaId
  //   }
  // }

  self.sanitizeDate = function (date) {
    const dateSanitized = new Date(date)

    dateSanitized.setHours(0)
    dateSanitized.setMinutes(0)
    dateSanitized.setSeconds(0)
    dateSanitized.setMilliseconds(0)

    return dateSanitized;

    date.setHours(0)
    date.setMinutes(0)
    date.setSeconds(0)
    date.setMilliseconds(0)
  }

  self.deleteSubstituicao = function(id) {
    return self.refColecao.doc(id).delete();
  }

  self.getSubstituicoesByTurmaRef = function (turmaRef) {
    return self.refColecao.where('turmaRef', '==', turmaRef).get()
  }

  function observarSubstituicoes(turmaRef, dataComeco, dataFinal) {
    const unsubscribe = self.db.collection("substituicoes")
        .where("turmaRef", "==", turmaRef)
        .where("data", ">=", dataComeco)
        .where("data", "<=", dataFinal)
        .onSnapshot(query => {
            query.forEach(snapSubstituicao => {
                const substituicao = snapSubstituicao.data();
                substituicao.id = snapSubstituicao.id;
                self.setStatus(substituicao);
                const dia = new Date(substituicao.data).getDay();
                const indice = substituicao.aula.indice;
                self.substituicoes[dia][indice] = substituicao;
            });
            notificar();
        }, error => {})
    
    self.listeners.push(unsubscribe);
  }

  // Notifica os observadores (callbacks) do listener atual
  function notificar() {
    for (let indice = 0; indice < self.observadores.length; indice++) {
        observadores(self.substituicoes);
    }
  }

  self.getSubstituicoesPorTurmaRef = function(turmaRef, dataComeco, dataFinal) {
    return new Promise(async (resolve, reject) => {
        try {
            const numAulas = 15;
            const substituicoes = {
                1: new Array(numAulas).fill(null),
                2: new Array(numAulas).fill(null),
                3: new Array(numAulas).fill(null),
                4: new Array(numAulas).fill(null),
                5: new Array(numAulas).fill(null)
            };
            console.log('making a query with...');
            console.log('turma:', turmaRef);
            console.log('startAt:', dataComeco);
            console.log('endAt:', dataFinal);

            const query = await self.db.collection("substituicoes")
                .where("turmaRef", "==", turmaRef)
                .where("data", ">=", dataComeco)
                .where("data", "<=", dataFinal)
                .get();

            if (query.empty) resolve(substituicoes);
            query.forEach(snapSubstituicao => {
                const substituicao = snapSubstituicao.data();
                substituicao.id = snapSubstituicao.id;
                self.setStatus(substituicao);
                const dia = new Date(substituicao.data).getDay();
                const indice = substituicao.aula.indice;
                substituicoes[dia][indice] = substituicao;
            });
            resolve(substituicoes);
        } catch(erro) {
            reject(erro);
        }
    }); 
          
  }

  self.getSubsPorTurma = function(turmaId) {
    const refTurma = self.db.doc('turmas/' + turmaId);
    return self.db.collection("substituicoes").where("turma", "==", ref).get();
  }

  self.getSubstituicao = function (substituicaoId) {
    return self.refColecao.doc(substituicaoId).get()
  }

  self.setStatus = function(substituicao) {
    if (substituicao.substituto.disciplinaId) {
      substituicao.status = 'substituida'
    } else if (substituicao.eFalta) {
      substituicao.status = 'falta'
    } else {
      substituicao.status = 'livre'
    }
  }

  self.retornarDom = function (date) {
    const data = new Date(date.getTime());

    const diaDaSemana = data.getDay();
    const diaDoMes = data.getDate();

    if (diaDaSemana > 0)
      data.setDate(diaDoMes - diaDaSemana);

    return data;
  }

  self.retornarSab = function(dom) {
    let data = new Date(dom.getTime());
    let diaDoMes = data.getDate();
    data.setDate(diaDoMes+6);
    return data;
  }

  self.initFirebase();
}
