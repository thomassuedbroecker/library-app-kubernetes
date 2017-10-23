	//var protocol = window.location.protocol;
/*if(protocol=="file:" || protocol=='http:'){
	console.log("You are in the local files.");
	var rootURL1 = 'http://localhost:9080/myOtherTest/api';
	executeCustomer();
} else {*/
	/*var myurl = window.location.host;
	//console.log("location.host: " +myurl);
	var protocol = window.location.protocol;
	//console.log("location.protocol: " +protocol);
	myurlapi = protocol + '//' + myurl + "/apiuri";
	console.log('The rootURLapi is found at: '+myurlapi);
		$.ajax({
			type: 'GET',
			url: myurlapi,
			dataType: 'json', // data type of response
			success: function(data){
				rootURL1 = data.uri;
				console.log('The rootURL1 is: '+rootURL1);
				executeCustomer();
			}
		});*/
//}



function user(){
  //var rootURLuser = rootURL1 + "/customers/user/" + userEmail;
  var userCustomer;
  $(document).ready(function() {
  	checkUser();
  });

  function checkUser(){
    $.ajax({
      //url: rootURL1 + "/customers/user/" + userEmail,
      url: nodejsurl+'/customers/user/'+userEmail,
      type: 'GET',
      success: function(data){
        console.log('email search data: ' + data);
        data = JSON.parse(data);
        if(data.length === 0){
          addUserAsCustomer();
        } else {
          userCustomer = data[0];
          //console.log('data: '+data+ ' data[0]: '+ JSON.parse(data)[0]);
          userCustomerId = userCustomer.id;
          //userCustomerId1 = JSON.parse(data)[0].id;
          //console.log(userCustomerId + ' or '+ userCustomerId1);
          console.log(userCustomerId);
          showUserData(userCustomer);
        }
      },
      error: function(jqXHR, textStatus, errorThrown){
        alert('user/customer error: '+ textStatus);
      }
    });
  }

  function addUserAsCustomer() {
  	console.log('addCustomer');
    var json123 = formToJSONUserCustomer();
    console.log(json123);
  	$.ajax({
  		type: 'POST',
  		contentType: 'application/json',
  		//url: rootURL1 + "/customers",
      url: nodejsurl+'/customers',
  		data: formToJSONUserCustomer(),
  		success: function(data, textStatus, jqXHR){
  			checkUser();
  			/*$('.custInput').val('');*/
  			$.bootstrapGrowl("You have been registered as a customer.", {type:'success', delay: 2000});
  		},
  		error: function(jqXHR, textStatus, errorThrown){
  			alert('addCustomer error: ' + textStatus);
  		}
  	});
  };

    function formToJSONUserCustomer() {
    	return JSON.stringify({
    		"name": userName,
    		"email": userEmail,
    		"password": "default",
    		});
    };


    function showUserData(customer){
      $('#customerTableRows').empty();
      $('#customerTableRows').append(
        "<tr> <td>"+customer.id+"</td> <td>"+customer.name+"</td>"+
        "<td>"+customer.email+"</td>"+'<td>'
        +' </tr>'
      );
    };

}
