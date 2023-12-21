var userList = ['shakil', 'nasif', 'tanvir', 'warida'];

for(var i = 0; i < userList.length; i++){
	var newRow = document.createElement('LI');
	newRow.innerHTML = userList[i]+' '+makeConnectButton(userList[i]);
	document.getElementById('myList').appendChild(newRow);
}

function makeConnectButton(userName){
	return '<input type="button" id='+userName+' onclick = assignPeer(this.id) value=connect />'
}

function assignPeer(userName){
	console.log("from assignPeer "+userName);
}

var div = document.createElement('div');
div.id = 'new';
var h = document.getElementById('hello');
h.appendChild(div);
document.getElementById('new').innerHTML = "ashjdkshfjksdfh";

console.log(h.innerHTML);