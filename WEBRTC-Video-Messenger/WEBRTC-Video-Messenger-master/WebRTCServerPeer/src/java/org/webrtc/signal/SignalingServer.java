/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package org.webrtc.signal;

import java.io.IOException;
import java.io.StringReader;
import javax.enterprise.context.ApplicationScoped;
import javax.inject.Inject;
import javax.json.Json;
import javax.json.JsonObject;
import javax.json.JsonReader;
import javax.websocket.CloseReason;
import javax.websocket.EndpointConfig;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;
import org.webrtc.PeerHandler;

/**
 *
 * @author pritom
 */
@ApplicationScoped
@ServerEndpoint("/")
public class SignalingServer {
    
    @Inject
    private PeerHandler sessionHandler;
    
    @OnOpen
    public void onOpen(Session newSession, EndpointConfig epc) throws IOException{
        sessionHandler.addSession(newSession);
    }
    
    @OnMessage
    public void onMessage(String incomingMessage, Session session) throws IOException{
        try (JsonReader reader = Json.createReader(new StringReader(incomingMessage))) {
            JsonObject jsonMessage = reader.readObject();
            String msgType = jsonMessage.getString("type");
            
            if(msgType.equals("addUser"))sessionHandler.addUser(jsonMessage, session);
            else if(msgType.equals("peerInit")) sessionHandler.sendPeerInfo(jsonMessage, session);
            else if(msgType.equals("getUserList")) sessionHandler.getAllUsers(session);
            else if(msgType.equals("signal"))sessionHandler.handleSignalMessage(jsonMessage, session);
            else if(msgType.equals("hang up")) sessionHandler.handleHangUp(jsonMessage, session);
            else sessionHandler.handleMessage(jsonMessage.toString(), session);
            System.out.println(jsonMessage.toString());            
            
        }
    }
    
    @OnClose
    public void onClose(Session session, CloseReason cr) throws IOException{
        sessionHandler.removeSession(session);
    }
    
    @OnError
    public void onError(Throwable t){
       System.err.println(t);
    }
    
}
