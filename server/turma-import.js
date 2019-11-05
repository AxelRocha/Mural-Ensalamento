const server = require('./server.js');
const options = JSON.parse(process.argv[2]);
const iconv = require('iconv-lite');
const csv = require('fast-csv');
const fs = require('fs');
const path  = require('path');
const app = require(path.resolve(__dirname, '../server/server'));
const Disciplina = app.models.Disciplina;
const Departamento = app.models.Departamento;
const FileUpload = app.models.FileUpload;
const Curso = app.models.Curso;
const FileUploadError = app.models.FileUploadError;
const Horario = app.models.Horario;
const Turma = app.models.Turma;
const async = require('async');
turma_import(options.container, options.file, options, function (err){
    process.exit(err ? 1 : 0);
});

async function handle_line(line) {
        if (line.COD_DISCIPLINA === "" || line.NOME_DISCIPLINA === "")
            return {"status":true,"msg":"nome ou código de disciplina vazia"};
        var course = line.NOME_DISCIPLINA.replace('\n','');
        var period_list = line.PERIODO.split(' ');

        var row = {
            'ano': period_list[period_list.length -1],
            'duracao': (period_list[0] == "Anual")? "Anual" : "Semestral",
            'disciplina': course.replace(',',''),
            'vagas': line.VAGAS_OFERECIDAS,
            'disciplina_cod': line.COD_DISCIPLINA.toLowerCase(),
            'dia_semana': line.DIA_SEMANA.charAt(0),
            'horario_ini': line.HR_INICIO,
            'departamento': line.NOME_DEPTO,
            'horario_fim': line.HR_FIM,
            'curso_cod': line.COD_CURSO,
            'turma_cod': line.COD_TURMA,
            'periodo': (period_list[0] == "Anual")? 0 : period_list[0].charAt(0)
        };

        // change  value 'sabado' to  a number 7
        if (row.dia_semana == "S")
            row.dia_semana = 7;

        // TODO<Odair M. - odairmario45@gmail.com - 12/10/2019>: popular corretamente o
        // departamento, o nome do departamento no csv é diferente do que está
        // na base de dados
    //return cb(null,row,{"codigo":row.departamento});
        var departamento = {"codigo":row.departamento};
        //Departamento.find({where:{"nome":row.departamento}},function(err,obj) {
        //    if(!obj || obj.length == 0)
        //        cb(true, {"msg":"Departamento "+row.departamento+" não encontrado","row":row});
        //    else {
        //        console.log(obj);
        //        cb(null,row,obj[0]);
        //    }
        //});
        // verifica se o dia da disciplina está vazio, se positivo retorna
        // erro para o callback
        if (row.dia_semana == "")
            return {"status":true,"msg":"dia da semana vazio","row":row};

        var horario = {
            "livre":false,
            "dia": parseInt(row.dia_semana,10),
            "horario_inicial":row.horario_ini,
            "horario_final":row.horario_fim,
            "motivo":"aula"
        }
        // verifica se horario de inicio e fim é vazio
        if ((horario.horario_final === "") || (horario.horario_inicial == ""))
            return {"status":true,"msg":"horario inicial ou final vazio","row":row};

          var horario = await Horario.create(horario);


        var disciplina_query = {
            "codigo":row.disciplina_cod
        };
        var disciplina_disc = {
            "codigo":row.disciplina_cod,
            "nome":row.disciplina,
            "carga_horaria":0,
            "duracao":row.duracao,
            "modalidade":"presencial",
            "departamentoCod": departamento.codigo
        };

        // tenta encontrar uma disciplina no qual possui o codigo de disciplina
        // da linha, se não encontrar então cria
        var disciplina_array = await Disciplina.find({"where":disciplina_query});
        if (disciplina_array.length == 0)
            var disciplina = await Disciplina.create(disciplina_disc);
        else
            var disciplina = disciplina_array[0];
        
        // enconra curso
        var curso = await Curso.findById(row.curso_cod);
        if (!curso) return {"status":true,"msg":"Curso não encontrado","row":row}

        //object turma
        var turma = {
            "disciplinaCod":disciplina.codigo,
            "data_inicio":options.letive_init,
            "data_fim":options.letive_end,
            "codigo": row.turma_cod,
            "semestre":options.semester,
            "vagas":row.vagas,
            "ano":row.ano,
            "periodo": row.periodo,
			"organizador":options.user,
            "departamentoCod":disciplina.departamentoCod,
            "cursoCod":curso.codigo
        };
    var turma = await Turma.findOrCreate({where:turma},turma);
    await turma[0].horarios.add(horario);
    return {"status":false};

}
function convert_enconding(file_path) {
    // convert iso 8859 to utf-8
    var input = fs.readFileSync(file_path, {enconding: "ISO-8859-1"});
    var output = iconv.decode(input, 'ISO-8859-1');
    fs.writeFile(file_path, output); // write csv converted in file_path

}
function get_completed(line,total_line) {
    return (total_line)? Math.round(((100*(line+1)) / total_line)*10) / 10 : 0;
}
async function turma_import(container, file, options, callback) {
    var rows = []; // array of line csv
    var file_path = path.join(options.root, container,file); // get path of uploaded file
    var fileupload = await FileUpload.findById(options.fileUpload);
    // change status of fileuploat to processing
    await fileupload.updateAttribute("status","Processando");
    convert_enconding(file_path);
    // set the caracterer delimiter, if user not setted use ;
    const delimiter = options.delimiter;
    csv.fromPath(file_path,{delimiter:';',headers:true}).on("data",function(data) {
        rows.push(data); }).on("end", async function(){
            // iterate earch row of css, and add course, klass and schedule.
            const total_line = rows.length
            for (const [line_number, row ] of rows.entries()) {
                var result = await handle_line(row);
                // write error msg in fileupload
                if(result.status == true) {
                    await FileUploadError.create({
                        "line":line_number,
                        "message":result.msg,
                        "fileUpload":fileupload.id
                    });
                }

                if (line_number % 10) {
                    var completed = get_completed(line_number,total_line);
                    await fileupload.updateAttribute("completed",completed);
                }
            }
            // change status to finished
            await fileupload.updateAttribute("status","Terminado");
            await fileupload.updateAttribute("completed",100.0);

    });
};
