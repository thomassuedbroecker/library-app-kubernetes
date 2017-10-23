var express = require('express');
//new
var session = require('express-session');
var log4js = require('log4js');
var passport = require('passport');
var WebAppStrategy = require('bluemix-appid').WebAppStrategy;

var cors = require('cors');
var app = express();
//new
//const logger = log4js.getLogger("testApp");

var request = require('request');
var watson = require('watson-developer-cloud');
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json
app.use(cors());
//new
app.use(passport.initialize());

// Below URLs will be used for App ID OAuth flows
const LANDING_PAGE_URL = "/web-app-sample.html";
const LOGIN_URL = "/ibm/bluemix/appid/login";
const CALLBACK_URL = "/ibm/bluemix/appid/callback";

var conversation_username;
var conversation_password;
var conversation_workspaceid;
var tts_username;
var tts_password;
var TENANT_ID;
var CLIENT_ID;
var SECRET;
var OAUTH_SERVER_URL;
//http://192.168.99.101 minikube kubernetes

var vcapServices;


//if running in docker container
if(process.env.inContainer=="1"){
  console.log("Hello i am in a container.");
  conversation_username=process.env.CONVERSATION_USERNAME;
  conversation_password=process.env.CONVERSATION_PASSWORD;
  conversation_workspaceid=process.env.conv_workspaceid;
  tts_username=process.env.tts_username;
  tts_password=process.env.tts_password;

  TENANT_ID = process.env.TENANT_ID;
  CLIENT_ID = process.env.CLIENT_ID;
  SECRET = process.env.SECRET;
  OAUTH_SERVER_URL=process.env.OAUTH_SERVER_URL;
  //if(!process.env.KUBERNETES_PORT){
    APP_URL=process.env.APP_URL;
  /*} else { //in minikube, kubernetes
    APP_URL='http://192.168.99.101:30832'
    console.log("APP_URL: "+APP_URL);
  }*/
}
//if running locally
else if (!process.env.VCAP_SERVICES) {
  var path = require('path');
  vcapServices = require( path.resolve( __dirname, "./env.json" ) );
  conversation_workspaceid = '4e3c0199-9871-4346-8b30-c2bfba973f8c';
}
//if cloud foundry app
else {
  console.log("Hello i am not in a container.");
  vcapServices = JSON.parse(process.env.VCAP_SERVICES);
  conversation_workspaceid = process.env.WORKSPACE_ID;
}

//resolve vcapServices into several variables
if(vcapServices!=null){
  conversation_username=vcapServices.conversation[0].credentials.username;
  conversation_password=vcapServices.conversation[0].credentials.password;
  tts_username=vcapServices.text_to_speech[0].credentials.username;
  tts_password=vcapServices.text_to_speech[0].credentials.password;
}

// Setup express application to use express-session middleware
// Must be configured with proper session storage for production
// environments. See https://github.com/expressjs/session for
// additional documentation
app.use(session({
	secret: '123456',
	resave: true,
	saveUninitialized: true
}));

app.set('view engine', 'ejs');

// Use static resources from /public directory
app.use(express.static(__dirname + '/views'));

// Configure express application to use passportjs
app.use(passport.initialize());
app.use(passport.session());


//---------------------------------------------------------------------------//
//kubernetes, minikube
if(process.env.KUBERNETES_PORT){
  console.log("trying to initialize WebAppStrategy in Kubernetes");
  passport.use(new WebAppStrategy({
  	tenantId: TENANT_ID,
  	clientId: CLIENT_ID,
  	secret: SECRET,
  	oauthServerUrl: OAUTH_SERVER_URL,
  	redirectUri: APP_URL + CALLBACK_URL
  }));
}
//running in container
else if(process.env.inContainer=="1"){
  console.log("trying to initialize WebAppStrategy...")
  passport.use(new WebAppStrategy({
  	tenantId: TENANT_ID,
  	clientId: CLIENT_ID,
  	secret: SECRET,
  	oauthServerUrl: OAUTH_SERVER_URL,
  	redirectUri: APP_URL + CALLBACK_URL
  }));
} //running locally
else if (!process.env.VCAP_SERVICES) {
  console.log("trying to initialize WebAppStrategy...")
  passport.use(new WebAppStrategy({
    //replace strings with corresponding values
  	tenantId: 'TENANT_ID',
  	clientId: 'CLIENT_ID',
  	secret: 'SECRET',
  	oauthServerUrl: 'OAUTH_SERVER_URL',
  	redirectUri: 'APP_URL + CALLBACK_URL'
  }));
} //running as a cloud foundry app
else {
  console.log("trying to initialize WebAppStrategy without further variables...")
  passport.use(new WebAppStrategy());
}


// Configure passportjs with user serialization/deserialization. This is required
// for authenticated session persistence across HTTP requests. See passportjs docs
// for additional information http://passportjs.org/docs
passport.serializeUser(function(user, cb) {
	cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
	cb(null, obj);
});

// Explicit login endpoint. Will always redirect browser to login widget due to {forceLogin: true}. If forceLogin is set to false the redirect to login widget will not occur if user is already authenticated
app.get(LOGIN_URL, passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
	//successRedirect: LANDING_PAGE_URL,
	forceLogin: true
}));

// Callback to finish the authorization process. Will retrieve access and identity tokens/
// from App ID service and redirect to either (in below order)
// 1. the original URL of the request that triggered authentication, as persisted in HTTP session under WebAppStrategy.ORIGINAL_URL key.
// 2. successRedirect as specified in passport.authenticate(name, {successRedirect: "...."}) invocation
// 3. application root ("/")
app.get(CALLBACK_URL, passport.authenticate(WebAppStrategy.STRATEGY_NAME));


//logout
app.get("/logout", function(req, res){
  WebAppStrategy.logout(req);
  res.sendFile(__dirname + '/views/logout.html');
});

//Generate the main html page
app.get('/',function(req,res){
	res.sendFile(__dirname + '/views/index.html');
});

// Protected area. If current user is not authenticated - redirect to the login widget will be returned.
// In case user is authenticated - a page with current user information will be returned.
app.get("/protected", passport.authenticate(WebAppStrategy.STRATEGY_NAME), function(req, res){
	//return the protected page with user info
	res.render('protected',{name: req.user.name || "guest", picture: req.user.picture || "/images/anonymous.svg", email: req.user.email || "unkown-email"});
});




app.listen(process.env.PORT || 8080);
console.log("Listening on port ", (process.env.PORT || 8080 ));

//kubernetes
if (process.env.LIBRARY_SERVER_SERVICE_HOST!=undefined) {
  var javaHost = process.env.LIBRARY_SERVER_SERVICE_HOST;
  var javaPort = process.env.LIBRARY_SERVER_SERVICE_PORT;
  var libraryURI = 'http://'+javaHost+':'+javaPort+'/library-server-java/api';
  //var libraryURI = 'http://192.168.99.101:30190/library-server-java/api';
  console.log("The Library URI is: "+libraryURI);
}
//docker compose
else if (process.env.JAVA_SERVER_1_PORT_9080_TCP_ADDR!=undefined){
  var libraryURI = 'http://'+process.env.JAVA_SERVER_1_PORT_9080_TCP_ADDR+':9080/library-server-java/api';
  console.log("The Library URI is: " + libraryURI);
} else { //cloud foundry
  var libraryURI = (process.env.LIBRARY_URI || 'http://localhost:9080/library-server-java/api');
  console.log("The Library URI is: " + libraryURI);
}
//send java-server url to frontend

//java server
app.get('/apiuri', function(req, res) {
    res.json({ uri: libraryURI });
});





//authenticate conversation service
var conversation = watson.conversation({
  username: conversation_username,
  password: conversation_password,
  path: { workspace_id: conversation_workspaceid },
  version: 'v1',
  version_date: '2017-02-03'
});

//authorization token text to speech
app.get('/gettoken', function(req, res) {
   // read from VCAP services
   //var tts_username = tts_username;
   //var tts_password = tts_password;

   var buffer = Buffer.from(tts_username + ':' + tts_password);
   var authstring = 'Basic ' + buffer.toString('base64');
   //console.log("authstring: "+authstring);
   auth_url = "https://stream.watsonplatform.net/authorization/api/v1/token";
   tts_url = "https://stream.watsonplatform.net/text-to-speech/api";
   var options = {
                  url: auth_url + '?url=' + tts_url,
                  headers: {
                      'Authorization': authstring
                  }
   };
   request(options,function(err,response,body){
      //console.log(body);
      if(!err){
        res.send(body);
      }
      else {
        res.status(500).send('Something broke!');
      }
   });
});

//conversation
//conversation start
app.get('/startConv', function(req, res) {
  conversation.message({}, function(err, data){
    if(err) {
      console.error(err);
      return;
    }
    //console.log("get try: "+JSON.stringify(data.output));
    res.json(data);
  });

});


app.put('/say', function(req, res) {
  conversation.message({
      input: { text: req.body.user_input},
      // Send back the context to maintain state.
      context : req.body.context,
  }, function(err, data){
    if(err) {
      console.error(err);
      return;
    }
    //get context from conversation.js, no need to save context here
    //change answer text if action and book collection is empty


    if (data.output.hasOwnProperty('action')) {
      if (data.output.action == 'search_title') {
        var title = data.output.action_param;
        //get books request
        request(libraryURI+'/books/title/'+title, function (error, response, body) {
          if (error) {
            console.error(error);
          }
          if (!error && response.statusCode == 200) {
            data.output.books_by_title = JSON.parse(body);
            //console.log('data before sending: '+JSON.stringify(data.output));
            res.json(data);
            return;
          }
        })
      } else if (data.output.action == 'search_author' && data.outpunt.hasOwnProperty('action_param')) {
        var author = data.output.action_param;
        //get books request
        request(libraryURI+'/books/author/'+author, function (error, response, body) {
          if (error) {
            console.error(error);
          }
          if (!error && response.statusCode == 200) {
            data.output.books_by_author = JSON.parse(body);
            //console.log('data before sending: '+JSON.stringify(data.output));
            res.json(data);
            return;
          }
        })

      } else if (data.output.action == 'select_books' && data.output.hasOwnProperty('action_param')) {
        var tag = data.output.action_param;
        request(libraryURI+'/books/tag-search/'+tag, function (error, response, body) {
          if (error) {
            console.error(error);
          }
          if (!error && response.statusCode == 200) {
            data.output.selected_books = JSON.parse(body);
            //console.log('data before sending: '+JSON.stringify(data.output));
            res.json(data);
            return;
          }
        })
      } else {
        res.json(data);
      }
    } else {
      res.json(data);
    }

  });
});






//all of the following: eliminates URL for java-server in frontend
//get books
app.get('/books', function(req, res) {
  request({url: libraryURI+'/books'},function(err,response,body){
     console.log("get books body: "+body);
     console.log('get books error: '+err)
     if(!err){
       res.send(body);
     }
     else {
       res.status(500).send('Something broke!');
     }
  });
});

app.get('/books/:bookuri', function(req, res) {
  request({url: libraryURI+'/books/'+req.params.bookuri},function(err,response,body){
     console.log(body);
     if(!err){
       res.send(body);
     }
     else {
       res.status(500).send('Something broke!');
     }
  });
});

app.get('/rentals/user/:userCustomerId', function(req, res) {
  console.log('customerid in req: '+req.params.userCustomerId);
  thisurl = libraryURI+'/rentals/user/'+req.params.userCustomerId;
  console.log(thisurl);
  request({url: thisurl},function(err,response,body){
     console.log(body);
     if(!err){
       res.send(body);
     }
     else {
       res.status(500).send('Something broke!');
     }
  });
});

app.delete('/rentals/:valueID', function(req, res) {
  console.log('valueID in req: '+req.params.valueID);
  thisurl = libraryURI+'/rentals/'+req.params.valueID;
  console.log(thisurl);
  request(
    { method: 'DELETE',
      uri: thisurl,
    }, function (error, response, body) {
      if(!error){
        console.log('rental '+req.params.valueID+' has been deleted')
        res.send(body);
      } else {
        console.log('error: '+ response.statusCode)
        console.log(body)
        res.status(500).send('Something broke!');
      }
    }
  )
});

app.put('/rentals/:valueID', function(req, res) {
  thisurl = libraryURI+'/rentals/'+req.params.valueID;
  console.log(thisurl);
  request({ url: thisurl, method: 'PUT', json: req.body}, function (error, response, body) {
    if(!error){
      console.log(body);
      res.send(body);
    } else {
      console.log('error: '+ error);
      console.log(body);
      res.status(500).send('Something broke!');
    }
  });
})

app.post('/rentals', function(req, res) {
  request({ url: libraryURI+'/rentals', method: 'POST', json: req.body}, function (error, response, body) {
    if(!error){
      console.log(body);
      res.send(body);
    } else {
      console.log('error: '+ error);
      console.log(body);
      res.status(500).send('Something broke!');
    }
  });
})

app.delete('/rentals/user/:userCustomerId', function(req, res) {
  console.log('customerID in req: '+req.params.userCustomerId);
  thisurl = libraryURI+'/rentals/user/'+req.params.userCustomerId;
  console.log(thisurl);
  request(
    { method: 'DELETE',
      uri: thisurl,
    }, function (error, response, body) {
      if(!error){
        console.log('rentals for '+req.params.userCustomerId+' have been deleted')
        res.send(body);
      } else {
        console.log('error: '+ response.statusCode)
        console.log(body)
        res.status(500).send('Something broke!');
      }
    }
  )
});

app.get('/customers/user/:userEmail', function(req, res) {
  console.log('customer email in req: '+req.params.userEmail);
  thisurl = libraryURI+'/customers/user/'+req.params.userEmail;
  console.log(thisurl);
  request({url: thisurl},function(err,response,body){
     console.log(body);
     if(!err){
       res.send(body);
     }
     else {
       res.status(500).send('Something broke!');
     }
  });
});

app.post('/customers', function(req, res) {
  request({ url: libraryURI+'/customers', method: 'POST', json: req.body}, function (error, response, body) {
    if(!error){
      console.log(body);
      res.send(body);
    } else {
      console.log('error: '+ error);
      console.log(body);
      res.status(500).send('Something broke!');
    }
  });
})

app.post('/rentals', function(req, res) {
  request({ url: libraryURI+'/customers', method: 'POST', json: req.body}, function (error, response, body) {
    if(!error){
      console.log(body);
      res.send(body);
    } else {
      console.log('error: '+ error);
      console.log(body);
      res.status(500).send('Something broke!');
    }
  });
})
