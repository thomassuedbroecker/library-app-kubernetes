package com.example.library;

import com.cloudant.client.api.ClientBuilder;
import com.cloudant.client.api.CloudantClient;
import com.cloudant.client.api.Database;
//import com.cloudant.client.org.lightcouch.CouchDbException;

import java.io.IOException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Collection;
import java.util.LinkedList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import com.cloudant.*;


public class DBTEST {

	private static CloudantClient cloudant = null;
	private static Database db = null;

	private static final String FILENAME = "C:\\dev\\src\\demo\\library-server-java\\vcap-env.json";

	private static String user;
	private static String password;
	
	private static String CLOUDANT_DEVELOPER="1";
	
	public static void main(String[] args){
		CloudantClient client = createClient();
		Database booksdb = getDB("books");
		try {
			Collection<Book> allBooks = booksdb.getAllDocsRequestBuilder().includeDocs(true).build()
					.getResponse().getDocsAs(Book.class);
			System.out.println(allBooks);
			LinkedList<Book> removeable = new LinkedList<Book>();
			for(Book temp : allBooks){
				System.out.println("Bookid: "+temp.getId()+" Title: "+temp.getTitle());
				if(temp.getId()==null){
					removeable.add(temp);
				}
			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
	}


	public static void getCred(){
		String VCAP_SERVICES = System.getenv("VCAP_SERVICES");
		String dockeruser = "f1054f74-38f7-4654-b982-1af0b9b1c717-bluemix";
		String dockerpw = "34cd6201661e9bd02a10bc048a51ea68d9e25d1a16fea1a88ba14d5f6ef0183c";
		System.out.println("dockeruser: "+dockeruser);
		System.out.println("dockerpassword: "+dockerpw);
		//System.out.println("cloudant-local: "+System.getenv("CLOUDANT_DEVELOPER"));
		JSONObject vcap = new JSONObject();
		//if cloud foundry app
		if (VCAP_SERVICES != null) {
			vcap = new JSONObject(VCAP_SERVICES);
			JSONArray cloudant = vcap.getJSONArray("cloudantNoSQLDB");
			JSONObject cred = cloudant.getJSONObject(0).getJSONObject("credentials");
			user = cred.getString("username");
			password = cred.getString("password");
		//if running in docker container
		} else if (dockeruser!=null && dockerpw!=null) {
			user = dockeruser;
			password = dockerpw;
		//if running locally
		} else {
			try {
				String content = new String(Files.readAllBytes(Paths.get(FILENAME)));
				System.out.println(content);
				vcap = new JSONObject(content);
				JSONArray cloudant = vcap.getJSONArray("cloudantNoSQLDB");
				JSONObject cred = cloudant.getJSONObject(0).getJSONObject("credentials");
				user = cred.getString("username");
				password = cred.getString("password");
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		System.out.println("db user: "+user);
		System.out.println("db password: "+password);
	}



	public static CloudantClient createClient(){
		getCred();
		try {
			if(!CLOUDANT_DEVELOPER.equals("1")) {
				System.out.println("Cloudant developer: "+CLOUDANT_DEVELOPER);
				System.out.println(CLOUDANT_DEVELOPER.equals("1"));
				System.out.println("Connecting to Cloudant : " + user);
				CloudantClient client = ClientBuilder.account(user)
						.username(user)
						.password(password)
						.build();
				return client;
			} else {
				System.out.println("Connecting to Cloudant : " + "admin");
				CloudantClient client = ClientBuilder.url(new URL("http://localhost:3000"))
					 .username("admin")
					 .password("pass") //default values
					 .build();
				return client;
			}
		//} catch (CouchDbException e) {
		} catch (Exception e){
			throw new RuntimeException("Unable to connect to repository", e);
		}
	}

	public static void initClient() {
		if (cloudant == null) {
			cloudant = createClient();
			return;
		}else{
			return;
		}
	}

	public static Database getDB(String databaseName) {
		if (cloudant == null) {
			initClient();
		}

		try {
			db = cloudant.database(databaseName, false);
		} catch (Exception e) {
			throw new RuntimeException("DB Not found", e);
		}

		return db;
	}

}
