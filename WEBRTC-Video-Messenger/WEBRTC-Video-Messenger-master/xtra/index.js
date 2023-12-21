var Peer = require('simple-peer');
var websocket = new WebSocket("ws://localhost:8080/WebRTCServerPeer/");
console.log('connected to the server');

var chatPeer = {};
var callPeer = {};
var userList = [];
var userName = undefined;
var action = undefined;

//session open
websocket.onopen = function(){
	
	//sets the username and send a json of the username to the server
	userName = prompt("enter a username");
	action = {
		type : 'addUser',
		userName : userName
	};
	websocket.send(JSON.stringify(action));
	
	//sends a request to the server to the list of the online users
	action = {
		type : "getUserList"
	};
	websocket.send(JSON.stringify(action));
	
}

//websocket session handle incoming messages from server
websocket.onmessage = function(message){
	
	//parses the server message into JSON
	var serverMsg = JSON.parse(message.data);
	
	if(serverMsg.type == "userList") showUserList(serverMsg.list);
	
	else if(serverMsg.type == "peerInit") assignPeer(serverMsg);
	
	else  if(serverMsg.type == "signal"){
		if(serverMsg.taskId == 1)handleVideoCallSignal(serverMsg);
		else if(serverMsg.taskId == 0)handleChatSignal(serverMsg);
	}
	
}

//shows the userList
function showUserList(List){
	userList = List;
	document.getElementById('userList').innerHTML = 'username : '+userName+'<br/><br/>currently online<br/><br/>';
	for(var i = 0; i < userList.length; i++){
		
		var userNo = userList[i];
		if(userNo[""+i] == userName) continue;
		var newRow = document.createElement('LI');
		newRow.innerHTML = userNo[""+i]+' '+makeChatButton(userNo[""+i])+' '+makeCallButton(userNo[""+i]);
		document.getElementById('userList').appendChild(newRow);
		
		var task = '0'+userNo[""+i]; //0 chat
		document.getElementById(task).addEventListener('click', function(clickEvent){
			sendPeerInfo(clickEvent.target.id);
		})
		
		var task = '1'+userNo[""+i]; //1 call
		document.getElementById(task).addEventListener('click', function(clickEvent){
			sendPeerInfo(clickEvent.target.id);
		})
		
	}
}

//sends a websocket request to the server to send peer initiator information to the caller and the callee
function sendPeerInfo(taskInfo){
	
	var peerUserName = taskInfo.slice(1);
	
	if(taskInfo.charAt(0) == 0){
		//console.log("in assignPeer, request for a chat with-> "+taskInfo.slice(1));
		action = {
			type : "peerInit",
			taskId : 0,
			actor : userName,
			userName : userName,
			peer : peerUserName
		};
		websocket.send(JSON.stringify(action));
	}
	else if(taskInfo.charAt(0) == 1){
		//console.log("in assignPeer, request for a videocall with-> "+taskInfo.slice(1));
		action = {
			type : "peerInit",
			taskId : 1,
			actor : userName,
			userName : userName,
			peer : peerUserName
		};
		websocket.send(JSON.stringify(action));
	}
}

//triggers the action
function assignPeer(initMessage){
	//console.log(JSON.stringify(initMessage));
	
	if(initMessage.taskId == 0) setUpChat(initMessage);
	else if(initMessage.taskId == 1) setUpVideoCall(initMessage);
}

//handles peer signal message from server for chat 
function handleChatSignal(serverMsg){
	document.getElementById('otherId').value = serverMsg.signalData;
	console.log(userName+" "+serverMsg.peer);
	chatPeer[serverMsg.peer].signal(JSON.parse(serverMsg.signalData));
}

//initiate peer and handle chat
function setUpChat(initMessage){
	
	if(initMessage.actor == userName){
			chatPeer[initMessage.peer] = new Peer({
				initiator : true,
				trickle : false
			})
		}
	else{
		chatPeer[initMessage.peer] = new Peer({
			initiator : false,
			trickle : false
		})
	}
	
	chatPeer[initMessage.peer].on('signal', function(data){
		var yourId = document.getElementById('yourId');
		yourId.value = JSON.stringify(data);
		
		var signal = {
			type : 'signal',
			taskId : 0,
			actor : initMessage.actor,
			userName : initMessage.userName,
			peer : initMessage.peer,
			signalData : yourId.value
		};
		websocket.send(JSON.stringify(signal));
	});
	
	var messages = document.getElementById('messeges');
	var sendButton = document.getElementById('send');
	
	sendButton.addEventListener('click', function(){
		var yourMessage = document.getElementById('yourMessage').value;
		messages.textContent += 'you: '+yourMessage+'\n';
		chatPeer[initMessage.peer].send(yourMessage);
	});

	chatPeer[initMessage.peer].on('data', function(data){
		var peerMessage = data;
		var peer;
		if(initMessage.peer == userName) peer = initMessage.actor;
		else peer = initMessage.peer;
		messages.textContent += peer+': '+peerMessage+'\n';
	});
	
}

//handle peer signal for video call from the server
function handleVideoCallSignal(serverMsg){
	
	if(callPeer[serverMsg.peer].initiator){
		document.getElementById('otherId').value = serverMsg.signalData;
		callPeer[serverMsg.peer].signal(JSON.parse(serverMsg.signalData));
	}
	
	else if(!callPeer[serverMsg.peer].initiator && confirm("receive call from "+serverMsg.actor)){
		document.getElementById('otherId').value = serverMsg.signalData;
		callPeer[serverMsg.peer].signal(JSON.parse(serverMsg.signalData));
	}

}
//assign peer and handle webrtc realtime video streaming
function setUpVideoCall(initMessage){
		navigator.getUserMedia({video : true, Audio : false}, function(stream){
			
			if(initMessage.actor == userName){
				callPeer[initMessage.peer] = new Peer({
					initiator : true,
					trickle : false,
					stream : stream
				});
			}
			else{
				callPeer[initMessage.peer] = new Peer({
					initiator : false,
					trickle : false,
					stream : stream
				});
			}
			
			callPeer[initMessage.peer].on('signal', function(data){
				var yourId = document.getElementById('yourId');
				yourId.value = JSON.stringify(data);
			
				var signal = {
					type : 'signal',
					taskId : 1,
					actor : initMessage.actor,
					userName : initMessage.userName,
					peer : initMessage.peer,
					signalData : yourId.value
				};
				websocket.send(JSON.stringify(signal));
			});
			
			callPeer[initMessage.peer].on('stream', function(stream){
				var myVideo = document.getElementById('myVideo')
				myVideo.src = window.URL.createObjectURL(callPeer[initMessage.peer].stream)
				myVideo.play()
				
				var peerVideo = document.getElementById('peerVideo')
				peerVideo.src = window.URL.createObjectURL(stream)
				peerVideo.play()
			});
			
			
		}, function(err){
			console.log(err);
		});
}

function makeChatButton(un){
	un = '0'+un;
	return '<input type="button" id='+un+' value="chat" />';
}

function makeCallButton(un){
	un = '1'+un;
	return '<input type="button" id='+un+' value="call" />';
}
