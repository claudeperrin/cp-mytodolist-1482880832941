/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com

var express = require('express');
var session = require('cookie-session'); // Charge le middleware de sessions
var bodyParser = require('body-parser'); // Charge le middleware de gestion des paramètres
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var Cloudant = require('cloudant');

var app = express();
console.log("application migrée en Diego et DevOps - V1.0.2");
console.log("process variables :" , process.env);
// Définition de l'hôte et du port
var host        = '0.0.0.0' || 'localhost';
var port        = process.env.PORT || 8080;
console.log("host : ", host, " port: ", port);
//

if (process.env.VCAP_SERVICES) {
	var env = JSON.parse(process.env.VCAP_SERVICES);
	console.log(env);

	if (env["cloudantNoSQLDB"])
	{
		db_props = env['cloudantNoSQLDB'][0]['credentials'];
		console.log(db_props);
	}
	else {
		console.log('You must bind the Cloudant DB to this application');
	}
}
//

Cloudant({account:db_props.username, password:db_props.password}, function(err, cloudant) {
	console.log('Connected to Cloudant');

	cloudant.db.list(function(err, all_dbs) {
		if (all_dbs.length === 0) {
			// first time -- need to create the todolist database
			cloudant.db.create('todolist', function() {
				todolist = cloudant.use('todolist');
				console.log("created DB todolist");
			});
		} else {
			console.log("found DB todolist");
			todolist = cloudant.use('todolist');
		}
	});
});

    /* On affiche la todolist et le formulaire */
    app.get('/todo', function(req, res) {
		var results = [];
		var params = {include_docs:true};
        todolist.list(params, function(err, data) {
			if (!err) {
				data.rows.forEach(function(docinfo) {
					//console.log("affichage todo : ", JSON.stringify(doc));
					// todolist.get(doc.id, function(err, doccontent)
					var theinfo = '{"id":"' + docinfo.id + '", "todoinfo":"' + docinfo['doc'].todo + '"}';
					console.log("result : ", theinfo);
					results.push(theinfo);
				});
			}
			res.render('todo.ejs', {todolist: results});
			// async.whilst ; while ; params = {include_docs:true} ; javascript get cloudant document in a loop
			/*		if (i===count){
								console.log("list item:");
								var anitem = JSON.parse(results[1]);
								console.log("an item id :", anitem.id);

					}
			*/
		});
	});

    /* On ajoute un élément à la todolist */
    app.post('/todo/ajouter/', urlencodedParser, function(req, res) {
        if (req.body.newtodo !== '') {
            var newdata = {"todo": req.body.newtodo};
			todolist.insert(newdata, function(err, data) {
			console.log("Error:", err);
			console.log("Data:", data);
			res.redirect('/todo');
			});
		}
  });

    /* Supprime un élément de la todolist */
    app.get('/todo/supprimer/:id', function(req, res) {
        if (req.params.id !== '') {
			todolist.get(req.params.id, function(err, data) {
			if(!err) {
				console.log("Doc to destroy", JSON.stringify(data));
				todolist.destroy(data._id, data._rev, function(err, result) {
                     res.redirect('/todo');
				});
			}
        });
    }
	});

    /* On redirige vers la todolist si la page demandée n'est pas trouvée */
    app.use(function(req, res, next){
        res.redirect('/todo');
    });

    app.listen(port, host);
