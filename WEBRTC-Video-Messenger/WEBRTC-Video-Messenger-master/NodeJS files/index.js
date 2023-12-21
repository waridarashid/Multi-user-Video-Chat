document.getElementById('yourId').style.visibility = 'hidden';
document.getElementById('otherId').style.visibility = 'hidden';
//----------------------------------------------------------------------------------

var Peer = require('simple-peer');
var websocket = new WebSocket("ws://localhost:8080/WebRTCServerPeer/");

var chatPeer = {};
var callPeer = {};
var userList = [];
var userName = undefined;
var action = undefined;

//session open
websocket.onopen = function(){
	console.log('connected to the server');

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
	document.getElementById('title').innerHTML = userName;
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
	else if(serverMsg.type == 'hang up') hangUpCall(serverMsg);

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

	var messages = undefined;
	var sendButton = undefined;
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

	setTimeout(function(){
		createChatDiv(initMessage.peer);
		messages = document.getElementById(0+initMessage.peer+'messages');
		sendButton = document.getElementById(0+initMessage.peer+'sendButton');
		sendButton.addEventListener('click', function(){
			var yourMessage = document.getElementById(0+initMessage.peer+'toSend');
			messages.textContent += 'you: '+yourMessage.value+'\n';
			chatPeer[initMessage.peer].send(yourMessage.value);
			yourMessage.value = '';
		});
	}, 1000);

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
					createVideoDiv(initMessage.peer);
					var myVideo = document.getElementById(1+initMessage.peer+'myVideo');
					var peerVideo = document.getElementById(1+initMessage.peer+'peerVideo');
					var hangUpButton = document.getElementById(1+initMessage.peer+'hangUpButton');

					hangUpButton.addEventListener('click', function(){
						myVideo.pause();
						myVideo.src = '';
						callPeer[initMessage.peer].stream.getTracks()[0].stop();
						stream.getTracks()[0].stop();

						 document.getElementById(1+initMessage.peer+'vd').remove();

						delete callPeer[initMessage.peer];
						 action = {
							 type : 'hang up',
							 actor : userName,
							 userName : userName,
							 peer : initMessage.peer
						 };

						 websocket.send(JSON.stringify(action));
					});

					myVideo.src = window.URL.createObjectURL(callPeer[initMessage.peer].stream);
					myVideo.play();
					peerVideo.src = window.URL.createObjectURL(stream);
					peerVideo.play();
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

function createChatDiv(un){
	var chatArea = document.getElementById('chatArea');

	var chatDiv = document.createElement('DIV');
	chatDiv.id = '0'+un+'cd';

	var label = document.createElement('LABEL');
	var messages = document.createElement('PRE');
	var yourMessage = document.createElement('TEXTAREA');
	var sendButton = document.createElement('BUTTON');

	label.innerHTML = '<br/><strong>'+un+'</strong>';
	messages.id = '0'+un+'messages';
	yourMessage.id = '0'+un+'toSend';
	sendButton.id = '0'+un+'sendButton';
	sendButton.innerHTML = 'send';

	chatDiv.appendChild(label);
	chatDiv.appendChild(messages);
	chatDiv.appendChild(yourMessage);
	chatDiv.appendChild(sendButton);

	chatArea.appendChild(chatDiv);
}

function createVideoDiv(un){
	var videoArea = document.getElementById('videoArea');

	 var videoDiv = document.createElement('DIV');
	 videoDiv.id = '1'+un+'vd';

	 var myLabel = document.createElement('LABEL');
	 var peerLabel = document.createElement('LABEL');
	 var myVideo = document.createElement('VIDEO');
	 var peerVideo = document.createElement('VIDEO');
	 var hangUpButton = document.createElement('BUTTON');

	 myLabel.innerHTML = '<br/><strong>you</strong><br/>';
	 peerLabel.innerHTML = '<br/><strong>'+un+'</strong><br/>';
	 myVideo.id = '1'+un+'myVideo';
	 peerVideo.id = '1'+un+'peerVideo';
	 hangUpButton.id = '1'+un+'hangUpButton';
	 hangUpButton.innerHTML = 'hang up';

	 videoDiv.appendChild(hangUpButton);
	 videoDiv.appendChild(myLabel);
	 videoDiv.appendChild(myVideo);
	 videoDiv.appendChild(peerLabel);
	 videoDiv.appendChild(peerVideo);

	 videoArea.appendChild(videoDiv);
}

function hangUpCall(serverMsg){
	callPeer[serverMsg.peer].stream.getTracks()[0].stop();
	delete callPeer[serverMsg.peer];
	document.getElementById(1+serverMsg.peer+'vd').remove();
}
