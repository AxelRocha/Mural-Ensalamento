"use strict";
var async = require('async');
var path = require('path');
var models = require(path.resolve(__dirname,'../common/models/models.js'))

var app = require(path.resolve(__dirname, '../server/server'));
var old_db = require(path.resolve(__dirname, '../bin/load-old-database'));

var ds = app.datasources.ensalamento;

var lbTables = models.models;

var LOG_CREATE = false;

ds.automigrate(lbTables, function(err) {
    if (err) throw err;
    async.waterfall([
    loadModelFromOldDB(old_db.get_salas, app.models.Sala, LOG_CREATE),
    loadModelFromOldDB(old_db.get_blocos, app.models.Bloco, LOG_CREATE),
    criaUsuario,
    criaSecretario,
    criaRoles,
    atribuiRoles,
    criaRecursodesala,
    criaTipodesala,
    criaEnsalamento,
    criaSemestre,
    criaTurmas,
    criaHorarios,
    loadModelFromOldDB(old_db.get_professores, app.models.Professor, LOG_CREATE),
    loadModelFromOldDB(old_db.get_departamentos, app.models.Departamento, LOG_CREATE),
    loadModelFromOldDB(old_db.get_setores, app.models.Setor, LOG_CREATE),
    loadModelFromOldDB(old_db.get_disciplinas, app.models.Disciplina, LOG_CREATE),
    loadModelFromOldDB(old_db.get_equivalenciasDisciplinas, app.models.Equivalenciadisciplina, LOG_CREATE),
    loadModelFromOldDB(old_db.get_cursos, app.models.Curso, LOG_CREATE),

    loadRelationsFromOldDB(old_db.get_cursoDisciplina, app.models.Curso, "disciplinas", LOG_CREATE),
  ],
    function(err) {
    if (err) throw err;
    ds.disconnect();
    })
});


// Returns a function that populate a DB model with data loaded from
// old database (see migrate-old-schema.js and load-old-dabase.js codes)
function loadModelFromOldDB(oldDataAccess, model, create_log){
  return (cb) => {
    oldDataAccess.then(data => {
      async.each(data, (instance, callback) => {
        if(create_log) console.log('Trying to insert:', instance);
        model.upsert(instance, (err, instanceCreated) => {
          callback(err);
          if(create_log) console.log('Created:', instanceCreated);
        });
      }, (err) => {
        if (err) throw err;
        cb(err);
      });
    });
  }
}



function addRelationBetweenModels(model, modelRelationName,
                                      relationInstance, cb, create_log){
  var query = {where: {}};
  query.where[relationInstance.pkey_name] = relationInstance.pkeys[0];

  model.findOne(query, (err,data) => {
    if (err) throw err;
    data[modelRelationName].add(relationInstance.pkeys[1], (err,data) => {
      cb(err,data);
    });
  });
}

// Returns a function that populate a relation DB model with data loaded from
// old database (see migrate-old-schema.js and load-old-dabase.js codes)
function loadRelationsFromOldDB(oldDataAccess, model, modelRelationName, create_log){
  return function(cb){
    oldDataAccess.then(data => {
      async.each(data, (instance, callback) => {

        if(create_log){
          console.log('Trying to insert relation on ',
            modelRelationName,':', instance
          );
        }

        addRelationBetweenModels(
          model,
          modelRelationName,
          instance,
          (err, instanceCreated) => {
            callback(err);
            if(create_log) console.log('Created:', instanceCreated);
        });

      }, (err) => {
        if (err) throw err;
        cb(err);
      });
    });
  }
}

function criaSemestre(cb) {
    app.models.Semestre.create({"semestre":"2017/1"},(err,obj)=>{
        cb(err);
    });
}

function criaTurmas(cb){
  app.models.Turma.create([
  {
    "disciplinaCod":"ci055",
    "data_inicio":"2019-02-26T13:58:50.150Z",
    "data_fim":"2019-02-26T13:58:50.150Z",
    "semestre": "2017/1",
    "codigo": "t1",
    "organizador":"a",
    "departamentoCod":"informatica",
    "vagas":49,
    "ano":2019,
    "periodo": 1
  },
  {
    "disciplinaCod":"ci055",
    "data_inicio":"2019-02-26T13:58:50.150Z",
    "departamentoCod":"informatica",
    "data_fim":"2019-02-26T13:58:50.150Z",
    "semestre": "2018/1",
    "codigo": "t2",
    "organizador":"a",
    "vagas":49,
    "ano":2019,
    "periodo": 1
  },
  {
    "disciplinaCod":"ci055",
    "data_inicio":"2019-02-26T13:58:50.150Z",
    "semestre": "2018/1",
    "data_fim":"2019-02-26T13:58:50.150Z",
    "codigo": "t3",
    "organizador":"a",
    "departamentoCod":"informatica",
    "vagas":49,
    "ano":2019,
    "periodo": 1
  },
  {
    "disciplinaCod":"ci055",
    "data_inicio":"2019-02-26T13:58:50.150Z",
    "data_fim":"2019-02-26T13:58:50.150Z",
    "semestre": "2018/1",
    "codigo": "t4",
    "organizador":"a",
    "vagas":49,
    "ano":2019,
    "departamentoCod":"informatica",
    "periodo": 1
  },
  ], function(err, turmas){
    turmas[0].horarios.add(1);
    turmas[1].horarios.add(2);
    turmas[2].horarios.add(3);
    turmas[3].horarios.add(4);
    cb(err);
  }.bind(this));
}

function criaHorarios(cb){
  app.models.Horario.create([
    {
      livre: false,
      dia:2,
      horario_inicial:"15:30:00",
      horario_final:"17:30:00",
      ensalamentoId:1
    },
    {
      livre: false,
      dia:3,
      horario_inicial:"15:30:00",
      horario_final:"17:30:00",
      ensalamentoId:1
    },
    {
      livre: false,
      dia:4,
      horario_inicial:"15:30:00",
      horario_final:"17:30:00",
      ensalamentoId:1
    },
    {
      livre: false,
      dia:2,
      horario_inicial:"15:30:00",
      horario_final:"17:30:00",
      ensalamentoId:1
    }
  ], function(err, horarios){
    cb(err);
  }.bind(this));
}

function criaEnsalamento(cb){
  app.models.Ensalamento.create({}, function(err){
    cb(err);
  }.bind(this));
}

function criaRecursodesala(cb){
  var recursos = [
    {descricao: 'recurso1'},
    {descricao: 'recurso2'}
  ];
  async.each(recursos, function(recurso, callback) {
    app.models.Recursodesala.upsert(recurso, function(err, model) {
      callback(err);
      if(LOG_CREATE) console.log('Created:', model);
    });
  }, function(err) {
    if (err) throw err;
    cb(err);
  });
}

function criaTipodesala(cb){
  var tipos = [
    {nome: 'tipo1'},
    {nome: 'tipo2'}
  ];
  async.each(tipos, function(tipo, callback) {
    app.models.Tipodesala.upsert(tipo, function(err, model) {
      callback(err);
      if(LOG_CREATE) console.log('Created:', model);
    });
  }, function(err) {
    if (err) throw err;
    cb(err);
  });
}

function criaSecretario(cb){
    var secretarios = [
        {email:'secretario_curso@secretario.com',vinculo: 'curso'},
        {email:'secretario_dpto@secretario.com',vinculo: 'departamento'},
        {email:'secretario_setor@secretario.com',vinculo: 'setor'}
    ]

    async.each(secretarios, function(secretario, callback) {
        app.models.Usuario.findOne({where:{email: secretario.email}}, function(err, user){
            user.secretario.create( {vinculo: secretario.vinculo},function(err,secre) {
                if (err) throw err;
                if(LOG_CREATE) console.log('Created Secretario:', secre);
                callback(err);
            });
        });
    }, function(err) {
      if (err) throw err;
      cb(err);
    });

}

function criaRoles(cb){
    var roles = [
        {name: 'admin'},
        {name: 'comissao'},
        {name: 'secretario_setor'},
        {name: 'secretario_dpto'},
        {name: 'secretario_curso'}
    ];

    async.each(roles, function(role, callback) {
        app.models.Role.create(role, function(err, model) {
            if (err) throw err;
            if(LOG_CREATE) console.log('Created role:', model);
                callback(err);

        });
    }, function(err) {
      if (err) throw err;
      cb(err);
    });

}


function atribuiRoles(cb){
    var atribuicoes = [
        {email:'admin@admin.com',role: 'admin'},
        {email:'comissao@comissao.com',role: 'comissao'},
        {email:'secretario_setor@secretario.com',role: 'secretario_setor'},
        {email:'secretario_dpto@secretario.com',role: 'secretario_dpto'},
        {email:'secretario_curso@secretario.com',role: 'secretario_curso'}
    ]


    async.each(atribuicoes, function(atribuicao, callback) {
        app.models.Usuario.findOne({where:{email: atribuicao.email}}, function(err, user){
            user.setRole(atribuicao.role,function(err,data){
                if (err) throw err;
                if(LOG_CREATE) console.log('Assign '+atribuicao.role+ ' Role to initial User:', user);
                callback(err);
            });
        });
    }, function(err) {
      if (err) throw err;
      cb(err);
    });
}




function criaUsuario(cb){
    var usuarios = [
      {username: 'admin',nome:'Administrador do Sistema', email: 'admin@admin.com', password: '123mudar'},
      {username: 'comissao',nome:'Comissão de Ensalamento', email: 'comissao@comissao.com', password: '123mudar'},
      {username: 'secretario_setor',nome:'Secretário do Setor', email: 'secretario_setor@secretario.com', password: '123mudar'},
      {username: 'secretario_dpto',nome:'Secretário de Departamento,', email: 'secretario_dpto@secretario.com', password: '123mudar'},
      {username: 'secretario_curso',nome:'Secretário de Curso', email: 'secretario_curso@secretario.com', password: '123mudar'}
    ];


    async.each(usuarios, function(usuario, callback) {

      app.models.Usuario.create(usuario, function(err, model) {
        if (err) throw err;
        callback(err);
        if(LOG_CREATE) console.log('Created user:', model);
      });

    }, function(err) {
      if (err) throw err;
      cb(err);
    });

}

function criaEquivalencia(cb){
  app.models.Disciplina.find({where:{id:1}}, function(err, disc){
    disc[0].addEquivalencia(2,function(err,data){
      if (err) throw err;
      if(LOG_CREATE) console.log('Created Equivalenciadisciplina:', disc);
      cb(err);
    });

  });
}

function criaDisciplina(cb){
  var disciplinas = [
    {"codigo": "d1", "nome": "disciplina1", "carga_horaria": 0,"duracao": "semestral","modalidade": "presencial"},
    {"codigo": "d2", "nome": "disciplina2", "carga_horaria": 1,"duracao": "semestral","modalidade": "distância"},
    {"codigo": "d3", "nome": "disciplina3", "carga_horaria": 2,"duracao": "anual","modalidade": "presencial"}
  ];

  async.each(disciplinas, function(disciplina, callback) {
    app.models.Disciplina.upsert(disciplina, function(err, model) {
      if (err) throw err;
      callback(err);
      if(LOG_CREATE) console.log('Created:', model);
    });
  }, function(err) {
    if (err) throw err;
    cb(err);
  });

}
