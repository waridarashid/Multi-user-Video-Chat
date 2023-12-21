/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package org.webrtc;

import java.io.IOException;
import java.io.StringReader;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Set;
import javax.enterprise.context.ApplicationScoped;
import javax.json.Json;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.JsonReader;
import javax.websocket.Session;

/**
 *
 * @author pritom
 */
@ApplicationScoped
public class PeerHandler {
    
    private final Set<Session> sessions = new HashSet<>();
    private final Hashtable<String, Session> userLog = new Hashtable<>();
    private final Hashtable<Session, String> sessionLog = new Hashtable<>();
     
    public void addSession(Session session) throws IOException{
        sessions.add(session);
    }
    
    public void removeSession(Session session) throws IOException{
        sessions.remove(session);
        userLog.remove(sessionLog.get(session));
        sessionLog.remove(session);
        if(!sessions.isEmpty())
            for(Session s : sessions) getAllUsers(s);
        System.out.println(sessions.size()+" client(s) added");
    }
    
    
    public void handleMessage(String msg, Session session) throws IOException{
        System.out.println(msg);
        /*
        for(Session s : sessions){
            if(!session.getId().equals(s.getId()))
                s.getBasicRemote().sendText(msg);
        }*/
    }

    public void addUser(JsonObject jsonMessage, Session session) throws IOException {
        userLog.put(jsonMessage.getString("userName"), session);
        sessionLog.put(session, jsonMessage.getString("userName"));
        for(Session s : sessions) getAllUsers(s);
//        Set<String> s = userLog.keySet();
//        for(String ss : s)System.out.println("from adduser "+ss);
    }

    //sends the received json message to the caller and the receiver of a connection to initiate the peer
    public void sendPeerInfo(JsonObject jsonMessage, Session session) throws IOException {
        Session actor = userLog.get(jsonMessage.getString("actor"));
        Session peer = userLog.get(jsonMessage.getString("peer"));
        JsonObject peerMessage = Json.createObjectBuilder().add("type", "peerInit")
                                                           .add("taskId", jsonMessage.getInt("taskId"))
                                                           .add("actor", jsonMessage.getString("actor"))
                                                           .add("userName", jsonMessage.getString("peer"))
                                                           .add("peer", jsonMessage.getString("userName"))
                                                           .build();
                                                        
        actor.getBasicRemote().sendText(jsonMessage.toString());
        peer.getBasicRemote().sendText(peerMessage.toString());
        System.out.println(peerMessage.toString());
    }

    //sends a json object to the specified session
    public void getAllUsers(Session session) throws IOException {
        JsonObjectBuilder objBuilder = Json.createObjectBuilder().add("type", "userList");
        JsonArrayBuilder arrBuilder = Json.createArrayBuilder();
        Set<Session> keys = sessionLog.keySet();
        int i = 0;
        for(Session key : keys){
            arrBuilder = arrBuilder.add(Json.createObjectBuilder().add(""+i, sessionLog.get(key)));
            i++;
        }
        JsonObject userList = objBuilder.add("list", arrBuilder).build();
        System.out.println(userList.toString());
        session.getBasicRemote().sendText(userList.toString());
    }

    //sends the singaling message to the respective peer
    public void handleSignalMessage(JsonObject jsonMessage, Session session) throws IOException {
        Session actor = userLog.get(jsonMessage.getString("actor"));
        Session peer = userLog.get(jsonMessage.getString("peer"));
        String stringSignalData = jsonMessage.getString("signalData");
        JsonObject peerMessage = Json.createObjectBuilder().add("type", "signal")
                                                           .add("taskId", jsonMessage.getInt("taskId"))
                                                           .add("actor", jsonMessage.getString("actor"))
                                                           .add("userName", jsonMessage.getString("peer"))
                                                           .add("peer", jsonMessage.getString("userName"))
                                                           .add("signalData", stringSignalData)
                                                           .build();
        JsonReader reader = Json.createReader(new StringReader(stringSignalData));
        JsonObject signalData = reader.readObject();
        if(signalData.getString("type").equals("offer")) peer.getBasicRemote().sendText(peerMessage.toString());
        else if(signalData.getString("type").equals("answer")) actor.getBasicRemote().sendText(peerMessage.toString());
    }

    public void handleHangUp(JsonObject jsonMessage, Session session) throws IOException {
        
        Session peer = userLog.get(jsonMessage.getString("peer"));
        JsonObject peerMessage = Json.createObjectBuilder().add("type", "hang up")
                                                           .add("actor", jsonMessage.getString("actor"))
                                                           .add("userName", jsonMessage.getString("peer"))
                                                           .add("peer", jsonMessage.getString("userName"))
                                                           .build();
        peer.getBasicRemote().sendText(peerMessage.toString());
        //System.out.println(peerMessage.toString());
    }

}