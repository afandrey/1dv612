let socket = io.connect()

socket.on('msg', function (data) {
  addMessage('New ' + data.event + ' notification! Action: ' + data.action + ', by User: ' + data.user + ', in Repository: ' + data.repo + ', Organization: ' + data.org)
})

socket.on('pushmsg', function (data) {
  addMessage('New ' + data.event + ' notification! Message: ' + data.message + ', by User: ' + data.user + ', in Repository: ' + data.repo + ', Organization: ' + data.org)
})

function addMessage (message) {
  let text = document.createTextNode(message)
  let li = document.createElement('li')
  let messages = document.getElementById('messages')

  li.appendChild(text)
  messages.appendChild(li)
}
